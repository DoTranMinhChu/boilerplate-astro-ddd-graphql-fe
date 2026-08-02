import {
  AnyVariables,
  cacheExchange,
  Client,
  CombinedError,
  DocumentInput,
  fetchExchange,
  OperationContext,
} from '@urql/core';
import { requestPolicyExchange } from '@urql/exchange-request-policy';
import { baseConfig } from '@core/components/config/BaseConfig';
import { getClientConfig } from '@core/helpers/config.client';
import { getServerConfig } from '@core/helpers/config.server';
import { Util } from '@core/helpers/util';
import { OauthError } from '@core/types/oauthError';
import { createSignal } from 'solid-js';
import { getLocale } from '@/shared/i18n/locale';
import { getErrorAction } from '@/shared/errors/errorActions';

export type GraphQLOptions = {
  skipThrowError?: boolean;
  throwAllErrors?: boolean;
};

export const [graphQLHeaders, setGraphQLHeaders] = createSignal<Headers>();

export class GraphQL {
  // Resolver trả về JWT hiện tại — được AuthProvider wire về TokenManager.getActiveToken().
  // Thay vì lưu headers tĩnh (gây race khi mutate global), chúng ta tính lại
  // Authorization header mỗi khi có request đi ra.
  static _tokenResolver: () => string | null = () => null;
  // Parase 2: tenant đích khi tài khoản AGENCY tạo dữ liệu (header x-acting-tenant-id).
  static _actingTenantResolver: () => string | null = () => null;
  static _backendUrl: string;

  static setTokenResolver(fn: () => string | null) {
    GraphQL._tokenResolver = fn;
  }

  static setActingTenantResolver(fn: () => string | null) {
    GraphQL._actingTenantResolver = fn;
  }

  static get defaultHeaders(): Record<string, string> {
    const token = GraphQL._tokenResolver();
    return {
      'Content-Type': 'application/json',
      // Tells the BE which language to localize error/response messages into — see
      // ddd-graphql-be's core/shared/i18n/i18n.service.ts resolveLocale(). Single
      // source of truth: shared/i18n/locale.ts's persisted signal.
      'x-locale': getLocale(),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  // Parase 2: context kèm header acting-tenant. Mặc định CHỈ dùng cho MUTATION
  // (ghi dữ liệu). Một số query "của tôi" theo tenant (vd getMyCodeConfigs) cũng
  // cần → truyền context này thủ công vào queryApi.
  static get actingTenantContext(): Partial<OperationContext> {
    const actingTenant = GraphQL._actingTenantResolver();
    if (!actingTenant) return {};
    // Kèm đầy đủ fetchOptions (Authorization + method) để an toàn dù bị merge nông hay sâu.
    return {
      fetchOptions: {
        method: 'POST',
        credentials: 'include',
        headers: { ...GraphQL.defaultHeaders, 'x-acting-tenant-id': actingTenant },
      },
    } as Partial<OperationContext>;
  }

  static get mutationContext(): Partial<OperationContext> {
    return GraphQL.actingTenantContext;
  }

  static set backendUrl(url: string) {
    GraphQL._backendUrl = url;
  }

  static get backendUrl() {
    if (!GraphQL._backendUrl) {
      GraphQL._backendUrl = import.meta.env.SSR
        ? getServerConfig('BACKEND_URL' as never)
        : getClientConfig('BACKEND_URL' as never);
    }
    return GraphQL._backendUrl;
  }

  // ✅ FIX: Chuyển url thành getter để luôn tự động tính toán từ backendUrl
  static get url() {
    try {
      const base = GraphQL.backendUrl;
      if (!base) return '';
      const urlObj = new URL(base);
      urlObj.pathname = 'graphql';
      return urlObj.toString();
    } catch (e) {
      return '';
    }
  }

  static get defaultContext() {
    return {
      requestPolicy: 'cache-first',
      fetchOptions: {
        method: 'POST', 
        credentials: 'include',
        headers: GraphQL.defaultHeaders,
      },
    } as Partial<OperationContext>;
  }

  // ✅ Tạo client mới với URL và Headers mới nhất
  // core/api/graphql.ts

  static makeClient = () => {
    const targetUrl = GraphQL.url;
    if (!targetUrl) {
      throw new Error("Hệ thống chưa cấu hình BACKEND_URL");
    }

    return new Client({
      url: targetUrl,
      // THÊM DÒNG NÀY: Ép buộc urql không sử dụng GET cho Query
      preferGetMethod: false,
      exchanges: [requestPolicyExchange({}), cacheExchange, fetchExchange],
      fetch: (...args) =>
        fetch(...args).then((response) => {
          setGraphQLHeaders(response.headers);
          return response;
        }),
      // Đảm bảo fetchOptions luôn chỉ định phương thức nếu cần
      fetchOptions: () => ({
        method: 'POST', // Ép buộc method POST ở cấp độ fetch
        headers: GraphQL.defaultHeaders,
      }),
    });
  };

  static _client: Client;

  static async getClient() {
    if (!GraphQL._client) {
      GraphQL._client = GraphQL.makeClient();
    }
    return GraphQL._client;
  }

  // ✅ Reset client khi chuyển đổi Role/Token
  static resetClient = () => {
    GraphQL._client = GraphQL.makeClient();
  };

  static setDefaultHeaders = (_headers: HeadersInit) => {
    // Deprecated no-op: headers được resolve động qua _tokenResolver.
    // Giữ lại signature để các caller cũ không vỡ build.
  };

  static query = async <T>(
    query: DocumentInput<T, AnyVariables>,
    variables: AnyVariables = {},
    context?: Partial<OperationContext>,
    options?: GraphQLOptions,
  ) => {
    const client = await GraphQL.getClient();
    const res = await client.query(
      query,
      variables,
      Util.assign(GraphQL.defaultContext, context || {}),
    );

    if (res.error && !options?.skipThrowError) {
      const errors = GraphQL.handleError(res.error);
      throw options?.throwAllErrors ? errors : errors[0];
    }

    if (!res.data) throw new Error("No data returned");
    return res;
  };

  static mutation = async <T>(
    mutation: DocumentInput<T, AnyVariables>,
    variables: AnyVariables = {},
    context?: Partial<OperationContext>,
    options?: GraphQLOptions,
  ) => {
    const client = await GraphQL.getClient();
    const res = await client.mutation(
      mutation,
      variables,
      Util.assign(GraphQL.defaultContext, Util.assign(GraphQL.mutationContext, context || {})),
    );

    if (res.error && !options?.skipThrowError) {
      const errors = GraphQL.handleError(res.error);
      throw options?.throwAllErrors ? errors : errors[0];
    }

    if (!res.data) throw new Error("Mutation failed");

    // Sau khi mutation thành công, thường data thay đổi -> Reset client để clear cache
    GraphQL.resetClient();
    return res;
  };

  static handleError = (error: CombinedError) => {
    const errors: Error[] = error.graphQLErrors.map((graphQLError: any) => ({
      ...graphQLError,
      message: graphQLError.extensions?.['code'] ? graphQLError.message : (graphQLError.message || 'Lỗi không xác định'),
      name: (graphQLError.extensions?.['code'] as string) || 'UNKNOWN_ERROR',
    }));

    if (error.networkError) {
      errors.push({
        name: 'NETWORK_ERROR',
        message: baseConfig().errorFailedToFetch || 'Lỗi kết nối máy chủ',
      } as any);
    }

    errors.forEach((err) => {
      if (err.name === OauthError.REFRESH_TOKEN_EXPIRED) baseConfig().setTokenExpired(true);
      if (err.name === OauthError.OUT_OF_SCOPE) baseConfig().setOutOfScope(true);

      // `err.name` is the backend EErrorCode (see extensions.code mapping above) —
      // route session-expiry/out-of-scope codes through the same signals the legacy
      // OauthError codes above already drive, so both error taxonomies converge on one
      // mechanism instead of the FE needing two parallel checks at every call site.
      const action = getErrorAction(err.name);
      if (action.sessionExpired) baseConfig().setTokenExpired(true);
      if (action.outOfScope) baseConfig().setOutOfScope(true);
    });
    return errors;
  };
}