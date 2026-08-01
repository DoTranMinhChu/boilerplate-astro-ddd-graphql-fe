import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import pkg from 'graphql';

const {
    buildClientSchema,
    introspectionQuery,
    getIntrospectionQuery,
    isScalarType,
    isEnumType,
    getNamedType,
    isObjectType,
} = pkg;

dotenv.config();

const toCamelCase = (str) => str.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => index === 0 ? word.toLowerCase() : word.toUpperCase()).replace(/\s+/g, '').replace(/-/g, '');

const mapGraphQLToTS = (gqlType) => {
    const namedType = getNamedType(gqlType).name;
    const isList = gqlType.toString().includes('[');

    let tsType;
    switch (namedType) {
        case 'String': case 'ID': case 'DateTime': case 'Date':
            tsType = 'string'; break;
        case 'Int': case 'Float':
            tsType = 'number'; break;
        case 'Boolean':
            tsType = 'boolean'; break;
        case 'Mixed': case 'Any':
            tsType = 'any'; break;
        default:
            tsType = namedType;
    }

    if (isList) return `Array<${tsType}>`;
    return tsType;
};

const entityName = process.argv[2];
if (!entityName) {
    console.error("❌ Thiếu tên Entity! Ví dụ: npm run genservicegraph Admin");
    process.exit(1);
}

const BACKEND_URL = process.env.BACKEND_URL + '/graphql';
const BASE_OUTPUT_DIR = path.resolve(process.cwd(), 'src/shared/services');
console.log("BACKEND_URL ==> ",BACKEND_URL)
async function generate() {
    const camelEntity = toCamelCase(entityName);
    console.log(`🔍 Đang quét chuyên sâu Schema cho Entity: ${entityName}...`);

    try {
        const queryStr = getIntrospectionQuery ? getIntrospectionQuery() : introspectionQuery;
        const response = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'apollo-require-preflight': 'true' },
            body: JSON.stringify({ operationName: 'IntrospectionQuery', query: queryStr, variables: {} }),
        });

        const json = await response.json();
        const schema = buildClientSchema(json.data);
        const type = schema.getType(entityName);

        if (!type) {
            console.error(`❌ Entity "${entityName}" không tồn tại trên Backend.`);
            process.exit(1);
        }

        // Lấy các field nguyên tử cho Fragment
        const primitiveFields = Object.values(type.getFields())
            .filter(f => isScalarType(getNamedType(f.type)) || isEnumType(getNamedType(f.type)))
            .map(f => `    i.${f.name},`);

        const entityRegex = new RegExp(`^(Paginated)?${entityName}(Edge|PaginationCursor|Response|Login)?$`);
        const relatedMethods = [];
        const searchIn = [
            { ops: schema.getQueryType().getFields(), kind: 'query' },
            { ops: schema.getMutationType()?.getFields() || {}, kind: 'mutation' }
        ];

        searchIn.forEach(({ ops, kind }) => {
            Object.values(ops).forEach(field => {
                const namedReturnType = getNamedType(field.type).name;
                const isExactMatch = entityRegex.test(namedReturnType);
                const methodMatch = field.name.match(new RegExp(`^.*${entityName}$|^${toCamelCase(entityName)}.*$`, 'i'));

                if (isExactMatch || (methodMatch && namedReturnType !== 'Boolean' && namedReturnType !== 'String')) {
                    if (namedReturnType.includes(entityName) && namedReturnType !== entityName) {
                        const isDifferentEntity = namedReturnType.replace('Paginated', '').replace('Edge', '').replace('Response', '') !== entityName;
                        if (isDifferentEntity) return;
                    }
                    relatedMethods.push({ field, kind });
                }
            });
        });

        const customTypesToImport = new Set();
        relatedMethods.forEach(({ field }) => {
            field.args.forEach(arg => {
                const namedType = getNamedType(arg.type);
                if (!isScalarType(namedType)) customTypesToImport.add(namedType.name);
            });
        });

        const content = `
import { 
  $, fragment, query, mutation, GetOutput,
  ${entityName},
  ${Array.from(customTypesToImport).join(',\n  ')}
} from '@shared/generated/typed-graphql';
import { CrudService } from '../crud.service';
import { PaginationCursor } from '@/core/api/types';

export type ${entityName}DTO = GetOutput<typeof ${entityName}Service.fragment>;
export type ${entityName}PaginationCursor = PaginationCursor<${entityName}DTO>;

export class ${entityName}Service extends CrudService {
  static apiName = '${camelEntity}' as const;
  static displayName = '${entityName}';

  static fragment = fragment(${entityName}, (i) => [
${primitiveFields.join('\n')}
  ]);

  ${relatedMethods.map(({ field, kind }) => {
            const hasArgs = field.args.length > 0;
            const namedReturnTypeName = getNamedType(field.type).name;
            const isPaginated = namedReturnTypeName.startsWith('Paginated');
            const returnIsObject = isObjectType(getNamedType(field.type));

            // Xác định kiểu dữ liệu trả về cho TypeScript cast
            let tsCastType = '';
            if (isPaginated) {
                tsCastType = ` as ${entityName}PaginationCursor`;
            } else if (namedReturnTypeName === entityName || returnIsObject) {
                // Nếu tên kiểu trả về khớp với Entity hoặc là Object liên quan
                tsCastType = ` as ${entityName}DTO`;
            }

            let argsTypeDefinition = '';
            if (hasArgs) {
                const fields = field.args.map(arg => {
                    const isRequired = arg.type.toString().includes('!');
                    return `${arg.name}${isRequired ? '' : '?'}: ${mapGraphQLToTS(arg.type)}`;
                });
                argsTypeDefinition = `args: { ${fields.join(', ')} }`;
            }

            // Logic build args object cho Builder
            const argsObject = hasArgs ? `{ ${field.args.map(a => {
                const isRequired = a.type.toString().includes('!');
                const sign = isRequired ? '$' : '$';
                return `${a.name}: ${sign}('${a.name}')`;
            }).join(', ')} }` : '';

            let selection = '';
            if (isPaginated) {
                selection = `(n) => [
          n.edges((e) => [e.node(() => this.fragment), e.cursor]),
          n.pageInfo((p) => [p.endCursor, p.hasNextPage, p.hasPreviousPage, p.limit, p.startCursor, p.totalCount, p.totalPage])
        ]`;
            } else if (returnIsObject) {
                // Nếu Mutation trả về LoginResponse hoặc tương tự, cần logic xử lý sâu hơn
                // Ở đây mặc định lấy fragment nếu trả về chính Entity
                selection = namedReturnTypeName === entityName ? `() => this.fragment` : `(n) => [n.admin(() => this.fragment), n.token]`;
                // Note: Logic trên có thể tùy biến thêm cho Login
            }

            const apiMethod = kind === 'query' ? 'queryApi' : 'mutationApi';

            return `
  static ${field.name} = async (${argsTypeDefinition}) => {
    const res = await this.${apiMethod}({
      document: ${kind}("${field.name}", (root) => [
        root.${field.name}(${argsObject}${hasArgs && selection ? ', ' : ''}${selection}),
      ]),
      ${hasArgs ? 'variables: args,' : ''}
    });
    return res.${field.name}${tsCastType};
  };`;
        }).join('\n')}
}
`.trim();

        const entityFolder = path.join(BASE_OUTPUT_DIR, camelEntity);
        const fullPath = path.join(entityFolder, `${camelEntity}.service.ts`);

        if (!fs.existsSync(entityFolder)) fs.mkdirSync(entityFolder, { recursive: true });
        fs.writeFileSync(fullPath, content);

        console.log(`\n✅ THÀNH CÔNG!`);
        console.log(`📂 Đường dẫn: ${fullPath}`);
    } catch (err) {
        console.error("❌ Lỗi:", err.message);
    }
}

generate();