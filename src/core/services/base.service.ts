import { AnyVariables, OperationContext, TypedDocumentNode, CombinedError } from '@urql/core';
import { GraphQL } from '@core/api/graphql';
import { PaginationCursor } from '@core/api/types';

// Gộp Payload vì Query và Mutation có cấu trúc tham số giống nhau
type GqlPayload<Result, Variables> = {
  document: TypedDocumentNode<Result, Variables>;
  variables?: Variables;
};

// Utility để lấy kiểu dữ liệu của một Node trong PaginationCursor ( Relay Spec)
export type PaginationCursorNode<T> = T extends PaginationCursor<infer U> ? U : never;

// Sửa lại kiểu Option nếu bạn dùng thư viện UI (giả định Option có label/value)
export type SearchableFieldOptions = {
  label: string;
  value: string;
  type: 'phone' | 'text'
}[];

export const LOAD_ALL_LIMIT = 1000;

export abstract class BaseService {
  static query = GraphQL.query;
  static mutation = GraphQL.mutation;

  // Thuộc tính để các Service con ghi đè
  static apiName: string;
  static displayName: string;
  static searchableFields: SearchableFieldOptions = [];
  static maxLimit: number = LOAD_ALL_LIMIT;

  // Chính sách cache mặc định
  //
  // FIX (audit Group 0.8/0.9 follow-up, found live during Task 9's verify step): đây TỪNG LÀ
  // 1 plain static property hardcode 'cache-first' — mọi query/mutation đi qua
  // queryApi/mutationApi đều gộp giá trị này vào `context` truyền cho GraphQL.query/mutation,
  // và Util.assign(GraphQL.defaultContext, context) cho `context` (bên phải) THẮNG khi trùng
  // key. Nghĩa là hardcode 'cache-first' Ở ĐÂY âm thầm GHI ĐÈ chính xác cái field
  // GraphQL.defaultContext vừa được sửa để network-only khi SSR (xem core/api/graphql.ts) —
  // cho MỌI service kế thừa BaseService/CrudService (~33 service, gồm cả PageService/NodeService
  // dùng bởi resolveCmsPageProps.ts, tức đường render trang public thật sự). Sửa Task 9 ở
  // graphql.ts một mình KHÔNG đủ để đóng bug staleness — phải sửa cả điểm ghi đè này.
  // Chuyển thành getter, cùng điều kiện với GraphQL.defaultContext, để 2 nơi luôn đồng bộ thay
  // vì hardcode 2 chỗ khác nhau.
  static get defaultContext(): Partial<OperationContext> {
    // Delegate to GraphQL.defaultContext's requestPolicy rather than re-deriving the same
    // SSR ternary here — duplicating the condition in two places is exactly the drift risk
    // that let this bug reappear once already (see the FIX comment above this getter).
    return {
      requestPolicy: GraphQL.defaultContext.requestPolicy,
    };
  }

  /**
   * Xử lý lỗi tập trung từ urql
   */
  private static handleGqlError(error: CombinedError | undefined) {
    if (error) {
      console.error(`[GraphQL Error]:`, error.message);
      // Bạn có thể tích hợp Toast ở đây
      throw error;
    }
  }

  /**
   * Hàm thực thi Query
   */
  protected static queryApi = async <Result, Variables extends AnyVariables>(
    payload: GqlPayload<Result, Variables>,
    context?: Partial<OperationContext>,
  ): Promise<Result> => {
    const res = await this.query(payload.document, payload.variables as Variables, {
      ...this.defaultContext, // Dùng this thay vì BaseService để hỗ trợ override
      ...context,
    });

    this.handleGqlError(res.error);

    if (!res.data) {
      throw new Error(`No data returned from ${payload.document.definitions[0]?.kind || 'Query'}`);
    }

    return res.data;
  };

  /**
   * Hàm thực thi Mutation
   */
  protected static mutationApi = async <Result, Variables extends AnyVariables>(
    payload: GqlPayload<Result, Variables>,
    context?: Partial<OperationContext>,
  ): Promise<Result> => {
    const res = await this.mutation(payload.document, payload.variables as Variables, {
      ...this.defaultContext,
      ...context,
    });

    this.handleGqlError(res.error);

    if (!res.data) {
      throw new Error(`Mutation failed: No data returned`);
    }

    return res.data;
  };
}