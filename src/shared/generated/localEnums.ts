// src/shared/generated/localEnums.ts
//
// Enum tham chiếu CHỈ tồn tại phía FE — không có trong GraphQL schema thật của
// backend hiện tại (bản "kept modules" đã lược bỏ Tenant.businessRoles/multi-role
// tagging). KHÔNG import các enum này từ '@shared/generated/typed-graphql' (sẽ
// vỡ build vì codegen introspect trực tiếp từ backend, không có export đó).
// Nếu sau này backend có lại field/enum tương ứng, xoá file này và trỏ lại import
// vào typed-graphql.ts như cũ.

export enum ETenantBusinessRole {
    PRIMARY = 'PRIMARY',
    PARTNER = 'PARTNER',
    VENDOR = 'VENDOR',
}
