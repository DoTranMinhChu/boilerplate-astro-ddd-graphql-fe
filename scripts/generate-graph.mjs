// scripts/generate-graph.mjs
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { buildClientSchema, getIntrospectionQuery, printSchema } from 'graphql';

// Nạp biến môi trường từ .env
dotenv.config();

const backendUrl = process.env.BACKEND_URL;
const scalarsPath = path.join(process.cwd(), 'src/core/config/scalars.txt');
const schemaFilePath = path.join(process.cwd(), 'src/shared/generated/schema.graphql');

if (!backendUrl) {
    console.error("Lỗi: BACKEND_URL không tìm thấy trong file .env");
    process.exit(1);
}

// Fetch schema via introspection POST (Apollo server rejects GET requests)
console.log("Đang tải schema từ server...");
const introspectionResponse = await fetch(`${backendUrl}/graphql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: getIntrospectionQuery() }),
});
const responseText = await introspectionResponse.text();
let parsed;
try {
    parsed = JSON.parse(responseText);
} catch {
    console.error(`Lỗi: Server trả về phản hồi không hợp lệ (HTTP ${introspectionResponse.status}):\n${responseText}`);
    process.exit(1);
}
const { data, errors } = parsed;
if (errors?.length) {
    console.error("Lỗi introspection:", errors[0].message);
    process.exit(1);
}
// Thu thập tên root types từ introspection
const queryTypeName = data.__schema.queryType?.name;
const mutationTypeName = data.__schema.mutationType?.name;
const subscriptionTypeName = data.__schema.subscriptionType?.name;

// typed-graphql-builder cần explicit `schema {}` block để nhận ra mutation/subscription.
// printSchema bỏ block này khi dùng tên mặc định (Query/Mutation/Subscription).
let sdl = printSchema(buildClientSchema(data));
const schemaParts = [];
if (queryTypeName) schemaParts.push(`  query: ${queryTypeName}`);
if (mutationTypeName) schemaParts.push(`  mutation: ${mutationTypeName}`);
if (subscriptionTypeName) schemaParts.push(`  subscription: ${subscriptionTypeName}`);
if (schemaParts.length > 0) {
    sdl += `\n\nschema {\n${schemaParts.join('\n')}\n}\n`;
}

fs.mkdirSync(path.dirname(schemaFilePath), { recursive: true });
fs.writeFileSync(schemaFilePath, sdl, 'utf-8');
console.log("Schema đã được lưu vào", schemaFilePath);

// Đọc file scalars.txt và tạo mảng các tham số --scalar
let scalarArgs = "";
if (fs.existsSync(scalarsPath)) {
    const content = fs.readFileSync(scalarsPath, 'utf-8');
    scalarArgs = content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line !== "")
        .map(line => `--scalar ${line}`)
        .join(' ');
}

// Xây dựng câu lệnh hoàn chỉnh
const command = `typed-graphql-builder --schema ${schemaFilePath} --output src/shared/generated/typed-graphql.ts ${scalarArgs}`;

console.log("Đang chạy lệnh tạo GraphQL...");
try {
    execSync(command, { stdio: 'inherit' });
} catch (error) {
    console.error("Lỗi khi thực thi lệnh:", error.message);
    process.exit(1);
}

// ── Patch: thêm overload hỗ trợ fn("name", selectFn) ─────────────────────────
// typed-graphql-builder chỉ generate fn(selectFn), nhưng các service gọi fn("name", selectFn).
const outputFullPath = path.join(process.cwd(), 'src/shared/generated/typed-graphql.ts');
const operations = [
    queryTypeName && 'query',
    mutationTypeName && 'mutation',
    subscriptionTypeName && 'subscription',
].filter(Boolean);

let fileContent = fs.readFileSync(outputFullPath, 'utf-8');

// typed-graphql-builder emits intentionally-unused phantom fields/classes for type inference.
// Keep generated code out of TS unused-symbol diagnostics, and normalize loose backend scalars.
if (!fileContent.startsWith('// @ts-nocheck')) {
    fileContent = `// @ts-nocheck\n${fileContent.replace(/^\uFEFF/, '')}`;
}

const scalarOverrides = {
    Mixed: 'any',
    Any: 'any',
    JSON: 'any',
    JSONObject: 'any',
};

for (const [scalarName, tsType] of Object.entries(scalarOverrides)) {
    fileContent = fileContent.replace(
        new RegExp(`export type ${scalarName} = unknown\\b`, 'g'),
        `export type ${scalarName} = ${tsType}`
    );
}

for (const op of operations) {
    const original = `export function ${op}<Sel extends Selection<$RootTypes.${op}>>(
  selectFn: (q: $RootTypes.${op}) => [...Sel]
) {
  let field = new $Field<'${op}', GetOutput<Sel>, GetVariables<Sel>>('${op}', {
    selection: selectFn(new $Root.${op}()),
  })
  const str = fieldToQuery('${op}', field)

  return gql(str) as any as TypedDocumentNode<GetOutput<Sel>, GetVariables<Sel>>
}`;

    const patched = `export function ${op}<Sel extends Selection<$RootTypes.${op}>>(name: string, selectFn: (q: $RootTypes.${op}) => [...Sel]): TypedDocumentNode<GetOutput<Sel>, GetVariables<Sel>>
export function ${op}<Sel extends Selection<$RootTypes.${op}>>(selectFn: (q: $RootTypes.${op}) => [...Sel]): TypedDocumentNode<GetOutput<Sel>, GetVariables<Sel>>
export function ${op}<Sel extends Selection<$RootTypes.${op}>>(nameOrFn: any, maybeSelectFn?: any) {
  const selectFn = typeof nameOrFn === 'function' ? nameOrFn : maybeSelectFn;
  const opName = typeof nameOrFn === 'string' ? nameOrFn : '${op}';
  let field = new $Field<'${op}', GetOutput<Sel>, GetVariables<Sel>>(opName as '${op}', {
    selection: selectFn(new $Root.${op}()),
  })
  const str = fieldToQuery(typeof nameOrFn === 'string' ? '${op} ' + opName : '${op}', field)

  return gql(str) as any as TypedDocumentNode<GetOutput<Sel>, GetVariables<Sel>>
}`;

    if (fileContent.includes(original)) {
        fileContent = fileContent.replace(original, patched);
        console.log(`  ✓ Patched ${op}() — hỗ trợ fn(selectFn) và fn("name", selectFn)`);
    } else {
        console.warn(`  ⚠ Không tìm thấy pattern để patch ${op}()`);
    }
}

fs.writeFileSync(outputFullPath, fileContent, 'utf-8');
console.log("Thành công!");
