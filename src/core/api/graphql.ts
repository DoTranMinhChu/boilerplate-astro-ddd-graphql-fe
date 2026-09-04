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

// Shape returned by the injected error-action resolver — hand-written here (rather than
// imported from shared/errors/errorActions.ts's IErrorAction) so core/ doesn't depend on
// shared/, same reasoning as core/api/types.ts's own local PageInfo. Kept structurally
// identical to IErrorAction; only the fields this file actually reads (sessionExpired/
// outOfScope) are load-bearing, `severity`/`retryable` just round out the shape for callers.
export type ErrorAction = {
  severity: 'danger' | 'warning';
  sessionExpired?: boolean;
  outOfScope?: boolean;
  retryable?: boolean;
};

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
  // Resolver trả về locale hiện tại — được AuthProvider wire về shared/i18n/locale's
  // getLocale(). Mặc định 'vi' (khớp với DEFAULT_LOCALE bên getLocale()) chứ không phải
  // null/undefined như 2 resolver trên: header 'x-locale' luôn cần một string hợp lệ, không
  // như Authorization/x-acting-tenant-id vốn có thể vắng mặt an toàn.
  static _localeResolver: () => string = () => 'vi';
  // Resolver trả về hành động ứng với 1 error code — được AuthProvider wire về
  // shared/errors/errorActions.ts's getErrorAction(). Mặc định "an toàn": không kích hoạt
  // sessionExpired/outOfScope nào (giống tinh thần 2 resolver token/actingTenant ở trên mặc
  // định "không có gì"), tránh false-positive logout/out-of-scope nếu resolver chưa được set.
  static _errorActionResolver: (code: string) => ErrorAction = () => ({ severity: 'danger' });
  static _backendUrl: string;

  static setTokenResolver(fn: () => string | null) {
    GraphQL._tokenResolver = fn;
  }

  static setActingTenantResolver(fn: () => string | null) {
    GraphQL._actingTenantResolver = fn;
  }

  static setLocaleResolver(fn: () => string) {
    GraphQL._localeResolver = fn;
  }

  static setErrorActionResolver(fn: (code: string) => ErrorAction) {
    GraphQL._errorActionResolver = fn;
  }

  static get defaultHeaders(): Record<string, string> {
    const token = GraphQL._tokenResolver();
    return {
      'Content-Type': 'application/json',
      // Tells the BE which language to localize error/response messages into — see
      // ddd-graphql-be's core/shared/i18n/i18n.service.ts resolveLocale(). Single
      // source of truth: shared/i18n/locale.ts's persisted signal.
      'x-locale': GraphQL._localeResolver(),
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
      // FIX (audit Group 0.8): this app's @astrojs/node adapter runs a real, LONG-LIVED server
      // process (not a per-request runtime) — 'cache-first' there meant a page's GraphQL results,
      // once cached, stayed cached for the process's entire lifetime, with NO invalidation path
      // reachable from the server: resetClient() only ever runs client-side (see its 3 call sites —
      // AuthProvider's login/logout, createData.tsx's refresh(), Select.tsx — all browser-only
      // code). A content edit published through the admin SPA never touches this server-side
      // cache, so the public site could keep serving pre-edit content indefinitely until the
      // process restarts. SSR requests now always go network-only; the in-browser client cache
      // (still 'cache-first', still invalidated by resetClient() on every mutation) is unaffected.
      requestPolicy: import.meta.env.SSR ? 'network-only' : 'cache-first',
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
      const action = GraphQL._errorActionResolver(err.name);
      if (action.sessionExpired) baseConfig().setTokenExpired(true);
      if (action.outOfScope) baseConfig().setOutOfScope(true);
    });
    return errors;
  };
}