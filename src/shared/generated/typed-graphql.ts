// @ts-nocheck

import { TypedDocumentNode } from '@graphql-typed-document-node/core'
import gql from 'graphql-tag'

/* tslint:disable */
/* eslint-disable */

const VariableName = ' $1fcbcbff-3e78-462f-b45c-668a3e09bfd8'
const VariableType = ' $1fcbcbff-3e78-462f-b45c-668a3e09bfd9'

class Variable<T, Name extends string> {
  private [VariableName]: Name
  private [VariableType]?: T

  constructor(name: Name) {
    this[VariableName] = name
  }
}

type VariabledInput<T> = T extends $Atomic | undefined
  ? Variable<NonNullable<T>, any> | T
  : T extends ReadonlyArray<infer R> | undefined
  ? Variable<NonNullable<T>, any> | ReadonlyArray<VariabledInput<NonNullable<R>>> | T
  : T extends Array<infer R> | undefined
  ? Variable<NonNullable<T>, any> | Array<VariabledInput<NonNullable<R>>> | T
  : Variable<NonNullable<T>, any> | { [K in keyof T]: VariabledInput<T[K]> } | T

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void
  ? I
  : never

export const $ = <Type, Name extends string>(name: Name) => {
  return new Variable(name) as Variable<Type, Name>
}

type SelectOptions = {
  argTypes?: { [key: string]: string }
  args?: { [key: string]: any }
  selection?: Selection<any>
}

class $Field<Name extends string, Type, Vars = {}> {
  public kind: 'field' = 'field'
  public type!: Type

  public vars!: Vars
  public alias: string | null = null

  constructor(public name: Name, public options: SelectOptions) {}

  as<Rename extends string>(alias: Rename): $Field<Rename, Type, Vars> {
    const f = new $Field(this.name, this.options)
    f.alias = alias
    return f as any
  }
}

class $Base<Name extends string> {
  constructor(private $$name: Name) {}

  protected $_select<Key extends string>(
    name: Key,
    options: SelectOptions = {}
  ): $Field<Key, any, any> {
    return new $Field(name, options)
  }
}

class $Union<T, Name extends String> {
  private type!: T
  private name!: Name

  constructor(private selectorClasses: { [K in keyof T]: { new (): T[K] } }) {}
  $on<Type extends keyof T, Sel extends Selection<T[Type]>>(
    alternative: Type,
    selectorFn: (selector: T[Type]) => [...Sel]
  ): $UnionSelection<GetOutput<Sel>, GetVariables<Sel>> {
    const selection = selectorFn(new this.selectorClasses[alternative]())

    return new $UnionSelection(alternative as string, selection)
  }
}

class $UnionSelection<T, Vars> {
  public kind: 'union' = 'union'
  private vars!: Vars
  constructor(public alternativeName: string, public alternativeSelection: Selection<T>) {}
}

type Selection<_any> = ReadonlyArray<$Field<any, any, any> | $UnionSelection<any, any>>

type NeverNever<T> = [T] extends [never] ? {} : T

export type GetOutput<X extends Selection<any>> = UnionToIntersection<
  {
    [I in keyof X]: X[I] extends $Field<infer Name, infer Type, any> ? { [K in Name]: Type } : never
  }[keyof X & number]
> &
  NeverNever<
    {
      [I in keyof X]: X[I] extends $UnionSelection<infer Type, any> ? Type : never
    }[keyof X & number]
  >

type ExtractInputVariables<Inputs> = Inputs extends Variable<infer VType, infer VName>
  ? { [key in VName]: VType }
  : Inputs extends $Atomic
  ? {}
  : Inputs extends any[] | readonly any[]
  ? UnionToIntersection<
      { [K in keyof Inputs]: ExtractInputVariables<Inputs[K]> }[keyof Inputs & number]
    >
  : UnionToIntersection<{ [K in keyof Inputs]: ExtractInputVariables<Inputs[K]> }[keyof Inputs]>

export type GetVariables<Sel extends Selection<any>, ExtraVars = {}> = UnionToIntersection<
  {
    [I in keyof Sel]: Sel[I] extends $Field<any, any, infer Vars>
      ? Vars
      : Sel[I] extends $UnionSelection<any, infer Vars>
      ? Vars
      : never
  }[keyof Sel & number]
> &
  ExtractInputVariables<ExtraVars>

function fieldToQuery(prefix: string, field: $Field<any, any, any>) {
  const variables = new Map<string, string>()

  function stringifyArgs(
    args: any,
    argTypes: { [key: string]: string },
    argVarType?: string
  ): string {
    switch (typeof args) {
      case 'string':
      case 'number':
      case 'boolean':
        return JSON.stringify(args)
      default:
        if (VariableName in (args as any)) {
          if (!argVarType) throw new Error('Cannot use variabe as sole unnamed field argument')
          const argVarName = (args as any)[VariableName]
          variables.set(argVarName, argVarType)
          return '$' + argVarName
        }
        if (Array.isArray(args))
          return '[' + args.map(arg => stringifyArgs(arg, argTypes, argVarType)).join(',') + ']'
        if (args == null) return 'null'
        const wrapped = (content: string) => (argVarType ? '{' + content + '}' : content)
        return wrapped(
          Array.from(Object.entries(args))
            .map(([key, val]) => {
              if (!argTypes[key]) {
                throw new Error(`Argument type for ${key} not found`)
              }
              const cleanType = argTypes[key].replace('[', '').replace(']', '').replace('!', '')
              return key + ':' + stringifyArgs(val, $InputTypes[cleanType], cleanType)
            })
            .join(',')
        )
    }
  }

  function extractTextAndVars(field: $Field<any, any, any> | $UnionSelection<any, any>) {
    if (field.kind === 'field') {
      let retVal = field.name
      if (field.alias) retVal = field.alias + ':' + retVal
      const args = field.options.args,
        argTypes = field.options.argTypes
      if (args && Object.keys(args).length > 0) {
        retVal += '(' + stringifyArgs(args, argTypes!) + ')'
      }
      let sel = field.options.selection
      if (sel) {
        retVal += '{'
        for (let subField of sel) {
          retVal += extractTextAndVars(subField)
        }
        retVal += '}'
      }
      return retVal + ' '
    } else if (field.kind === 'union') {
      let retVal = '... on ' + field.alternativeName + ' {'
      for (let subField of field.alternativeSelection) {
        retVal += extractTextAndVars(subField)
      }
      retVal += '}'

      return retVal + ' '
    }
  }

  const queryRaw = extractTextAndVars(field)!

  const queryBody = queryRaw.substring(queryRaw.indexOf('{'))

  const varList = Array.from(variables.entries())
  let ret = prefix
  if (varList.length) {
    ret += '(' + varList.map(([name, kind]) => '$' + name + ':' + kind).join(',') + ')'
  }
  ret += queryBody

  return ret
}

export function fragment<T, Sel extends Selection<T>>(
  GQLType: { new (): T },
  selectFn: (selector: T) => [...Sel]
) {
  return selectFn(new GQLType())
}


type $Atomic = EUnitGroup | EMediaType | string | EFeature | ERole | EAccountSource | ERedirectStatusCode | EPageType | EPageStatus | EFieldType | ECodeEntityType | EActivityActorType | EPermission | EScopeRuleType | EAccountPermissionScope | number | boolean



export class Query extends $Base<"Query"> {
  constructor() {
    super("Query")
  }

  
      
      getOneUnit<Args extends VariabledInput<{
        id?: string | undefined,
      }>,Sel extends Selection<Unit>>(args: Args, selectorFn: (s: Unit) => [...Sel]):$Field<"getOneUnit", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              id: "String"
            },
        args,

        selection: selectorFn(new Unit)
      };
      return this.$_select("getOneUnit", options) as any
    }
  

      
      getAllUnit<Args extends VariabledInput<{
        input?: PaginationArgsInput | undefined,
      }>,Sel extends Selection<PaginatedUnit>>(args: Args, selectorFn: (s: PaginatedUnit) => [...Sel]):$Field<"getAllUnit", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              input: "PaginationArgsInput"
            },
        args,

        selection: selectorFn(new PaginatedUnit)
      };
      return this.$_select("getAllUnit", options) as any
    }
  

      
      getSectionsByPage<Args extends VariabledInput<{
        pageId?: string | undefined,
      }>,Sel extends Selection<Section>>(args: Args, selectorFn: (s: Section) => [...Sel]):$Field<"getSectionsByPage", Array<GetOutput<Sel> | undefined> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              pageId: "String"
            },
        args,

        selection: selectorFn(new Section)
      };
      return this.$_select("getSectionsByPage", options) as any
    }
  

      
      getMyTenantAccount<Sel extends Selection<TenantAccount>>(selectorFn: (s: TenantAccount) => [...Sel]):$Field<"getMyTenantAccount", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new TenantAccount)
      };
      return this.$_select("getMyTenantAccount", options) as any
    }
  

      
      getOneTenantAccount<Args extends VariabledInput<{
        id?: string | undefined,
      }>,Sel extends Selection<TenantAccount>>(args: Args, selectorFn: (s: TenantAccount) => [...Sel]):$Field<"getOneTenantAccount", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              id: "String"
            },
        args,

        selection: selectorFn(new TenantAccount)
      };
      return this.$_select("getOneTenantAccount", options) as any
    }
  

      
      getAllTenantAccount<Args extends VariabledInput<{
        input?: PaginationArgsInput | undefined,
      }>,Sel extends Selection<PaginatedTenantAccount>>(args: Args, selectorFn: (s: PaginatedTenantAccount) => [...Sel]):$Field<"getAllTenantAccount", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              input: "PaginationArgsInput"
            },
        args,

        selection: selectorFn(new PaginatedTenantAccount)
      };
      return this.$_select("getAllTenantAccount", options) as any
    }
  

      
      generateTokenTenantAccount<Args extends VariabledInput<{
        tenantAccountId?: string | undefined,
      }>,Sel extends Selection<TenantAccountLogin>>(args: Args, selectorFn: (s: TenantAccountLogin) => [...Sel]):$Field<"generateTokenTenantAccount", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              tenantAccountId: "String"
            },
        args,

        selection: selectorFn(new TenantAccountLogin)
      };
      return this.$_select("generateTokenTenantAccount", options) as any
    }
  

      
      tenantAccountGetMe<Sel extends Selection<TenantAccount>>(selectorFn: (s: TenantAccount) => [...Sel]):$Field<"tenantAccountGetMe", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new TenantAccount)
      };
      return this.$_select("tenantAccountGetMe", options) as any
    }
  

      
      getTenantByCode<Args extends VariabledInput<{
        code?: string | undefined,
      }>,Sel extends Selection<Tenant>>(args: Args, selectorFn: (s: Tenant) => [...Sel]):$Field<"getTenantByCode", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              code: "String"
            },
        args,

        selection: selectorFn(new Tenant)
      };
      return this.$_select("getTenantByCode", options) as any
    }
  

      
      getMyTenant<Sel extends Selection<Tenant>>(selectorFn: (s: Tenant) => [...Sel]):$Field<"getMyTenant", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new Tenant)
      };
      return this.$_select("getMyTenant", options) as any
    }
  

      
      getOneTenant<Args extends VariabledInput<{
        id?: string | undefined,
      }>,Sel extends Selection<Tenant>>(args: Args, selectorFn: (s: Tenant) => [...Sel]):$Field<"getOneTenant", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              id: "String"
            },
        args,

        selection: selectorFn(new Tenant)
      };
      return this.$_select("getOneTenant", options) as any
    }
  

      
      getAllTenant<Args extends VariabledInput<{
        input?: PaginationArgsInput | undefined,
      }>,Sel extends Selection<PaginatedTenant>>(args: Args, selectorFn: (s: PaginatedTenant) => [...Sel]):$Field<"getAllTenant", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              input: "PaginationArgsInput"
            },
        args,

        selection: selectorFn(new PaginatedTenant)
      };
      return this.$_select("getAllTenant", options) as any
    }
  

      
      getOneMerchant<Args extends VariabledInput<{
        id?: string | undefined,
      }>,Sel extends Selection<Merchant>>(args: Args, selectorFn: (s: Merchant) => [...Sel]):$Field<"getOneMerchant", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              id: "String"
            },
        args,

        selection: selectorFn(new Merchant)
      };
      return this.$_select("getOneMerchant", options) as any
    }
  

      
      getAllMerchant<Args extends VariabledInput<{
        input?: PaginationArgsInput | undefined,
      }>,Sel extends Selection<PaginatedMerchant>>(args: Args, selectorFn: (s: PaginatedMerchant) => [...Sel]):$Field<"getAllMerchant", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              input: "PaginationArgsInput"
            },
        args,

        selection: selectorFn(new PaginatedMerchant)
      };
      return this.$_select("getAllMerchant", options) as any
    }
  

      
      merchantGetMe<Sel extends Selection<Merchant>>(selectorFn: (s: Merchant) => [...Sel]):$Field<"merchantGetMe", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new Merchant)
      };
      return this.$_select("merchantGetMe", options) as any
    }
  

      
      myAssignments<Sel extends Selection<MerchantAssignments>>(selectorFn: (s: MerchantAssignments) => [...Sel]):$Field<"myAssignments", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new MerchantAssignments)
      };
      return this.$_select("myAssignments", options) as any
    }
  

      
      getPublicRedirect<Args extends VariabledInput<{
        fromPath?: string | undefined,
      }>,Sel extends Selection<Redirect>>(args: Args, selectorFn: (s: Redirect) => [...Sel]):$Field<"getPublicRedirect", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              fromPath: "String"
            },
        args,

        selection: selectorFn(new Redirect)
      };
      return this.$_select("getPublicRedirect", options) as any
    }
  

      
      getOneRedirect<Args extends VariabledInput<{
        id?: string | undefined,
      }>,Sel extends Selection<Redirect>>(args: Args, selectorFn: (s: Redirect) => [...Sel]):$Field<"getOneRedirect", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              id: "String"
            },
        args,

        selection: selectorFn(new Redirect)
      };
      return this.$_select("getOneRedirect", options) as any
    }
  

      
      getAllRedirect<Args extends VariabledInput<{
        input?: PaginationArgsInput | undefined,
      }>,Sel extends Selection<PaginatedRedirect>>(args: Args, selectorFn: (s: PaginatedRedirect) => [...Sel]):$Field<"getAllRedirect", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              input: "PaginationArgsInput"
            },
        args,

        selection: selectorFn(new PaginatedRedirect)
      };
      return this.$_select("getAllRedirect", options) as any
    }
  

      
      pageResolver<Args extends VariabledInput<{
        path?: string | undefined,
      }>,Sel extends Selection<PageResolverResult>>(args: Args, selectorFn: (s: PageResolverResult) => [...Sel]):$Field<"pageResolver", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              path: "String"
            },
        args,

        selection: selectorFn(new PageResolverResult)
      };
      return this.$_select("pageResolver", options) as any
    }
  

      
      previewPageResolver<Args extends VariabledInput<{
        path?: string | undefined,
      }>,Sel extends Selection<PageResolverResult>>(args: Args, selectorFn: (s: PageResolverResult) => [...Sel]):$Field<"previewPageResolver", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              path: "String"
            },
        args,

        selection: selectorFn(new PageResolverResult)
      };
      return this.$_select("previewPageResolver", options) as any
    }
  

      
      getOnePage<Args extends VariabledInput<{
        id?: string | undefined,
      }>,Sel extends Selection<Page>>(args: Args, selectorFn: (s: Page) => [...Sel]):$Field<"getOnePage", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              id: "String"
            },
        args,

        selection: selectorFn(new Page)
      };
      return this.$_select("getOnePage", options) as any
    }
  

      
      getAllPage<Args extends VariabledInput<{
        input?: PaginationArgsInput | undefined,
      }>,Sel extends Selection<PaginatedPage>>(args: Args, selectorFn: (s: PaginatedPage) => [...Sel]):$Field<"getAllPage", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              input: "PaginationArgsInput"
            },
        args,

        selection: selectorFn(new PaginatedPage)
      };
      return this.$_select("getAllPage", options) as any
    }
  

      
      getPublicDetailPathByContentType<Args extends VariabledInput<{
        contentTypeId?: string | undefined,
      }>>(args: Args):$Field<"getPublicDetailPathByContentType", string | undefined , GetVariables<[], Args>> {
      const options = {
        argTypes: {
              contentTypeId: "String"
            },
        args,

        
      };
      return this.$_select("getPublicDetailPathByContentType", options) as any
    }
  

      
      getOneMediaSet<Args extends VariabledInput<{
        id?: string | undefined,
      }>,Sel extends Selection<MediaSet>>(args: Args, selectorFn: (s: MediaSet) => [...Sel]):$Field<"getOneMediaSet", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              id: "String"
            },
        args,

        selection: selectorFn(new MediaSet)
      };
      return this.$_select("getOneMediaSet", options) as any
    }
  

      
      getAllMediaSet<Args extends VariabledInput<{
        input?: PaginationArgsInput | undefined,
      }>,Sel extends Selection<PaginatedMediaSet>>(args: Args, selectorFn: (s: PaginatedMediaSet) => [...Sel]):$Field<"getAllMediaSet", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              input: "PaginationArgsInput"
            },
        args,

        selection: selectorFn(new PaginatedMediaSet)
      };
      return this.$_select("getAllMediaSet", options) as any
    }
  

      
      getAllHeaderPresets<Sel extends Selection<HeaderPreset>>(selectorFn: (s: HeaderPreset) => [...Sel]):$Field<"getAllHeaderPresets", Array<GetOutput<Sel> | undefined> | undefined > {
      const options = {
        
        

        selection: selectorFn(new HeaderPreset)
      };
      return this.$_select("getAllHeaderPresets", options) as any
    }
  

      
      getOneHeaderPreset<Args extends VariabledInput<{
        id?: string | undefined,
      }>,Sel extends Selection<HeaderPreset>>(args: Args, selectorFn: (s: HeaderPreset) => [...Sel]):$Field<"getOneHeaderPreset", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              id: "String"
            },
        args,

        selection: selectorFn(new HeaderPreset)
      };
      return this.$_select("getOneHeaderPreset", options) as any
    }
  

      
      getOneEmailConfig<Args extends VariabledInput<{
        id?: string | undefined,
      }>,Sel extends Selection<EmailConfig>>(args: Args, selectorFn: (s: EmailConfig) => [...Sel]):$Field<"getOneEmailConfig", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              id: "String"
            },
        args,

        selection: selectorFn(new EmailConfig)
      };
      return this.$_select("getOneEmailConfig", options) as any
    }
  

      
      getAllEmailConfig<Args extends VariabledInput<{
        input?: PaginationArgsInput | undefined,
      }>,Sel extends Selection<PaginatedEmailConfig>>(args: Args, selectorFn: (s: PaginatedEmailConfig) => [...Sel]):$Field<"getAllEmailConfig", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              input: "PaginationArgsInput"
            },
        args,

        selection: selectorFn(new PaginatedEmailConfig)
      };
      return this.$_select("getAllEmailConfig", options) as any
    }
  

      
      getOneContentType<Args extends VariabledInput<{
        id?: string | undefined,
      }>,Sel extends Selection<ContentType>>(args: Args, selectorFn: (s: ContentType) => [...Sel]):$Field<"getOneContentType", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              id: "String"
            },
        args,

        selection: selectorFn(new ContentType)
      };
      return this.$_select("getOneContentType", options) as any
    }
  

      
      getAllContentType<Args extends VariabledInput<{
        input?: PaginationArgsInput | undefined,
      }>,Sel extends Selection<PaginatedContentType>>(args: Args, selectorFn: (s: PaginatedContentType) => [...Sel]):$Field<"getAllContentType", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              input: "PaginationArgsInput"
            },
        args,

        selection: selectorFn(new PaginatedContentType)
      };
      return this.$_select("getAllContentType", options) as any
    }
  

      
      getOneCustomer<Args extends VariabledInput<{
        id?: string | undefined,
      }>,Sel extends Selection<Customer>>(args: Args, selectorFn: (s: Customer) => [...Sel]):$Field<"getOneCustomer", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              id: "String"
            },
        args,

        selection: selectorFn(new Customer)
      };
      return this.$_select("getOneCustomer", options) as any
    }
  

      
      getAllCustomer<Args extends VariabledInput<{
        input?: PaginationArgsInput | undefined,
      }>,Sel extends Selection<PaginatedCustomer>>(args: Args, selectorFn: (s: PaginatedCustomer) => [...Sel]):$Field<"getAllCustomer", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              input: "PaginationArgsInput"
            },
        args,

        selection: selectorFn(new PaginatedCustomer)
      };
      return this.$_select("getAllCustomer", options) as any
    }
  

      
      getAllFooterPresets<Sel extends Selection<FooterPreset>>(selectorFn: (s: FooterPreset) => [...Sel]):$Field<"getAllFooterPresets", Array<GetOutput<Sel> | undefined> | undefined > {
      const options = {
        
        

        selection: selectorFn(new FooterPreset)
      };
      return this.$_select("getAllFooterPresets", options) as any
    }
  

      
      getOneFooterPreset<Args extends VariabledInput<{
        id?: string | undefined,
      }>,Sel extends Selection<FooterPreset>>(args: Args, selectorFn: (s: FooterPreset) => [...Sel]):$Field<"getOneFooterPreset", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              id: "String"
            },
        args,

        selection: selectorFn(new FooterPreset)
      };
      return this.$_select("getOneFooterPreset", options) as any
    }
  

      
      getOneContentEntry<Args extends VariabledInput<{
        id?: string | undefined,
      }>,Sel extends Selection<ContentEntry>>(args: Args, selectorFn: (s: ContentEntry) => [...Sel]):$Field<"getOneContentEntry", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              id: "String"
            },
        args,

        selection: selectorFn(new ContentEntry)
      };
      return this.$_select("getOneContentEntry", options) as any
    }
  

      
      getPublicContentEntries<Args extends VariabledInput<{
        contentTypeId?: string | undefined
ids?: Array<string | undefined> | undefined
limit?: number | undefined
sortField?: string | undefined
sortDirection?: string | undefined,
      }>,Sel extends Selection<ContentEntry>>(args: Args, selectorFn: (s: ContentEntry) => [...Sel]):$Field<"getPublicContentEntries", Array<GetOutput<Sel> | undefined> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              contentTypeId: "String",
ids: "[String]",
limit: "Float",
sortField: "String",
sortDirection: "String"
            },
        args,

        selection: selectorFn(new ContentEntry)
      };
      return this.$_select("getPublicContentEntries", options) as any
    }
  

      
      getAllContentEntry<Args extends VariabledInput<{
        input?: PaginationArgsInput | undefined,
      }>,Sel extends Selection<PaginatedContentEntry>>(args: Args, selectorFn: (s: PaginatedContentEntry) => [...Sel]):$Field<"getAllContentEntry", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              input: "PaginationArgsInput"
            },
        args,

        selection: selectorFn(new PaginatedContentEntry)
      };
      return this.$_select("getAllContentEntry", options) as any
    }
  

      
      getOneAgency<Args extends VariabledInput<{
        id?: string | undefined,
      }>,Sel extends Selection<Agency>>(args: Args, selectorFn: (s: Agency) => [...Sel]):$Field<"getOneAgency", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              id: "String"
            },
        args,

        selection: selectorFn(new Agency)
      };
      return this.$_select("getOneAgency", options) as any
    }
  

      
      getAllAgency<Args extends VariabledInput<{
        input?: PaginationArgsInput | undefined,
      }>,Sel extends Selection<PaginatedAgency>>(args: Args, selectorFn: (s: PaginatedAgency) => [...Sel]):$Field<"getAllAgency", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              input: "PaginationArgsInput"
            },
        args,

        selection: selectorFn(new PaginatedAgency)
      };
      return this.$_select("getAllAgency", options) as any
    }
  

      
      getOneAdmin<Args extends VariabledInput<{
        id?: string | undefined,
      }>,Sel extends Selection<Admin>>(args: Args, selectorFn: (s: Admin) => [...Sel]):$Field<"getOneAdmin", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              id: "String"
            },
        args,

        selection: selectorFn(new Admin)
      };
      return this.$_select("getOneAdmin", options) as any
    }
  

      
      getAllAdmin<Args extends VariabledInput<{
        input?: PaginationArgsInput | undefined,
      }>,Sel extends Selection<PaginatedAdmin>>(args: Args, selectorFn: (s: PaginatedAdmin) => [...Sel]):$Field<"getAllAdmin", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              input: "PaginationArgsInput"
            },
        args,

        selection: selectorFn(new PaginatedAdmin)
      };
      return this.$_select("getAllAdmin", options) as any
    }
  

      
      adminGetMe<Sel extends Selection<Admin>>(selectorFn: (s: Admin) => [...Sel]):$Field<"adminGetMe", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new Admin)
      };
      return this.$_select("adminGetMe", options) as any
    }
  

      
      getOneCodeConfig<Args extends VariabledInput<{
        id?: string | undefined,
      }>,Sel extends Selection<CodeConfig>>(args: Args, selectorFn: (s: CodeConfig) => [...Sel]):$Field<"getOneCodeConfig", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              id: "String"
            },
        args,

        selection: selectorFn(new CodeConfig)
      };
      return this.$_select("getOneCodeConfig", options) as any
    }
  

      
      getAllCodeConfig<Args extends VariabledInput<{
        input?: PaginationArgsInput | undefined,
      }>,Sel extends Selection<PaginatedCodeConfig>>(args: Args, selectorFn: (s: PaginatedCodeConfig) => [...Sel]):$Field<"getAllCodeConfig", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              input: "PaginationArgsInput"
            },
        args,

        selection: selectorFn(new PaginatedCodeConfig)
      };
      return this.$_select("getAllCodeConfig", options) as any
    }
  

      
      getMyCodeConfigs<Sel extends Selection<CodeConfig>>(selectorFn: (s: CodeConfig) => [...Sel]):$Field<"getMyCodeConfigs", Array<GetOutput<Sel> | undefined> | undefined > {
      const options = {
        
        

        selection: selectorFn(new CodeConfig)
      };
      return this.$_select("getMyCodeConfigs", options) as any
    }
  

      
      getOneAgencyAccount<Args extends VariabledInput<{
        id?: string | undefined,
      }>,Sel extends Selection<AgencyAccount>>(args: Args, selectorFn: (s: AgencyAccount) => [...Sel]):$Field<"getOneAgencyAccount", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              id: "String"
            },
        args,

        selection: selectorFn(new AgencyAccount)
      };
      return this.$_select("getOneAgencyAccount", options) as any
    }
  

      
      getAllAgencyAccount<Args extends VariabledInput<{
        input?: PaginationArgsInput | undefined,
      }>,Sel extends Selection<PaginatedAgencyAccount>>(args: Args, selectorFn: (s: PaginatedAgencyAccount) => [...Sel]):$Field<"getAllAgencyAccount", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              input: "PaginationArgsInput"
            },
        args,

        selection: selectorFn(new PaginatedAgencyAccount)
      };
      return this.$_select("getAllAgencyAccount", options) as any
    }
  

      
      generateTokenAgencyAccount<Args extends VariabledInput<{
        agencyAccountId?: string | undefined,
      }>,Sel extends Selection<AgencyAccountLoginData>>(args: Args, selectorFn: (s: AgencyAccountLoginData) => [...Sel]):$Field<"generateTokenAgencyAccount", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              agencyAccountId: "String"
            },
        args,

        selection: selectorFn(new AgencyAccountLoginData)
      };
      return this.$_select("generateTokenAgencyAccount", options) as any
    }
  

      
      agencyAccountGetMe<Sel extends Selection<AgencyAccount>>(selectorFn: (s: AgencyAccount) => [...Sel]):$Field<"agencyAccountGetMe", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new AgencyAccount)
      };
      return this.$_select("agencyAccountGetMe", options) as any
    }
  

      
      getAllActivityLog<Args extends VariabledInput<{
        input?: PaginationArgsInput | undefined,
      }>,Sel extends Selection<PaginatedActivityLog>>(args: Args, selectorFn: (s: PaginatedActivityLog) => [...Sel]):$Field<"getAllActivityLog", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              input: "PaginationArgsInput"
            },
        args,

        selection: selectorFn(new PaginatedActivityLog)
      };
      return this.$_select("getAllActivityLog", options) as any
    }
  

      
      getEntityActivityTimeline<Args extends VariabledInput<{
        entityType?: string | undefined
entityId?: string | undefined,
      }>,Sel extends Selection<ActivityLog>>(args: Args, selectorFn: (s: ActivityLog) => [...Sel]):$Field<"getEntityActivityTimeline", Array<GetOutput<Sel> | undefined> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              entityType: "String",
entityId: "String"
            },
        args,

        selection: selectorFn(new ActivityLog)
      };
      return this.$_select("getEntityActivityTimeline", options) as any
    }
  

      
      getMyPermissions<Sel extends Selection<AccountPermissionSummary>>(selectorFn: (s: AccountPermissionSummary) => [...Sel]):$Field<"getMyPermissions", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new AccountPermissionSummary)
      };
      return this.$_select("getMyPermissions", options) as any
    }
  

      
      getAccountPermissions<Args extends VariabledInput<{
        tenantAccountId?: string | undefined,
      }>,Sel extends Selection<AccountPermissionSummary>>(args: Args, selectorFn: (s: AccountPermissionSummary) => [...Sel]):$Field<"getAccountPermissions", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              tenantAccountId: "String"
            },
        args,

        selection: selectorFn(new AccountPermissionSummary)
      };
      return this.$_select("getAccountPermissions", options) as any
    }
  

      
      getPermissionGroups<Sel extends Selection<PermissionGroup>>(selectorFn: (s: PermissionGroup) => [...Sel]):$Field<"getPermissionGroups", Array<GetOutput<Sel> | undefined> | undefined > {
      const options = {
        
        

        selection: selectorFn(new PermissionGroup)
      };
      return this.$_select("getPermissionGroups", options) as any
    }
  

      
      getGrantableResources<Args extends VariabledInput<{
        input?: GrantableResourceInput | undefined,
      }>,Sel extends Selection<GrantableResourceResult>>(args: Args, selectorFn: (s: GrantableResourceResult) => [...Sel]):$Field<"getGrantableResources", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              input: "GrantableResourceInput"
            },
        args,

        selection: selectorFn(new GrantableResourceResult)
      };
      return this.$_select("getGrantableResources", options) as any
    }
  
}


export class Unit extends $Base<"Unit"> {
  constructor() {
    super("Unit")
  }

  
      
      get name(): $Field<"name", string | undefined>  {
       return this.$_select("name") as any
      }

      
      get code(): $Field<"code", string | undefined>  {
       return this.$_select("code") as any
      }

      
      get group(): $Field<"group", EUnitGroup | undefined>  {
       return this.$_select("group") as any
      }

      
      get description(): $Field<"description", string | undefined>  {
       return this.$_select("description") as any
      }

      
      get isActivated(): $Field<"isActivated", boolean | undefined>  {
       return this.$_select("isActivated") as any
      }

      
      get tenantId(): $Field<"tenantId", string | undefined>  {
       return this.$_select("tenantId") as any
      }

      
      tenant<Sel extends Selection<Tenant>>(selectorFn: (s: Tenant) => [...Sel]):$Field<"tenant", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new Tenant)
      };
      return this.$_select("tenant", options) as any
    }
  

      
      get createdByTenantAccountId(): $Field<"createdByTenantAccountId", string | undefined>  {
       return this.$_select("createdByTenantAccountId") as any
      }

      
      createdByTenantAccount<Sel extends Selection<TenantAccount>>(selectorFn: (s: TenantAccount) => [...Sel]):$Field<"createdByTenantAccount", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new TenantAccount)
      };
      return this.$_select("createdByTenantAccount", options) as any
    }
  

      
      get agencyId(): $Field<"agencyId", string | undefined>  {
       return this.$_select("agencyId") as any
      }

      
      agency<Sel extends Selection<Agency>>(selectorFn: (s: Agency) => [...Sel]):$Field<"agency", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new Agency)
      };
      return this.$_select("agency", options) as any
    }
  

      
      get id(): $Field<"id", string | undefined>  {
       return this.$_select("id") as any
      }

      
      get createdAt(): $Field<"createdAt", string | undefined>  {
       return this.$_select("createdAt") as any
      }

      
      get updatedAt(): $Field<"updatedAt", string | undefined>  {
       return this.$_select("updatedAt") as any
      }

      
      get deletedAt(): $Field<"deletedAt", string | undefined>  {
       return this.$_select("deletedAt") as any
      }
}

  
export enum EUnitGroup {
  
  WEIGHT = "WEIGHT",

  VOLUME = "VOLUME",

  COUNT = "COUNT",

  LENGTH = "LENGTH",

  AREA = "AREA",

  OTHER = "OTHER"
}
  


export class Tenant extends $Base<"Tenant"> {
  constructor() {
    super("Tenant")
  }

  
      
      get name(): $Field<"name", string | undefined>  {
       return this.$_select("name") as any
      }

      
      get code(): $Field<"code", string | undefined>  {
       return this.$_select("code") as any
      }

      
      get agencyId(): $Field<"agencyId", string | undefined>  {
       return this.$_select("agencyId") as any
      }

      
      agency<Sel extends Selection<Agency>>(selectorFn: (s: Agency) => [...Sel]):$Field<"agency", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new Agency)
      };
      return this.$_select("agency", options) as any
    }
  

      
      get logoMediaId(): $Field<"logoMediaId", string | undefined>  {
       return this.$_select("logoMediaId") as any
      }

      
      logoMedia<Sel extends Selection<Media>>(selectorFn: (s: Media) => [...Sel]):$Field<"logoMedia", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new Media)
      };
      return this.$_select("logoMedia", options) as any
    }
  

      
      get website(): $Field<"website", string | undefined>  {
       return this.$_select("website") as any
      }

      
      get contactEmail(): $Field<"contactEmail", string | undefined>  {
       return this.$_select("contactEmail") as any
      }

      
      get taxCode(): $Field<"taxCode", string | undefined>  {
       return this.$_select("taxCode") as any
      }

      
      get isActivated(): $Field<"isActivated", boolean | undefined>  {
       return this.$_select("isActivated") as any
      }

      
      get subscribedFeatures(): $Field<"subscribedFeatures", Array<EFeature | undefined> | undefined>  {
       return this.$_select("subscribedFeatures") as any
      }

      
      get id(): $Field<"id", string | undefined>  {
       return this.$_select("id") as any
      }

      
      get createdAt(): $Field<"createdAt", string | undefined>  {
       return this.$_select("createdAt") as any
      }

      
      get updatedAt(): $Field<"updatedAt", string | undefined>  {
       return this.$_select("updatedAt") as any
      }

      
      get deletedAt(): $Field<"deletedAt", string | undefined>  {
       return this.$_select("deletedAt") as any
      }
}


export class Agency extends $Base<"Agency"> {
  constructor() {
    super("Agency")
  }

  
      
      get name(): $Field<"name", string | undefined>  {
       return this.$_select("name") as any
      }

      
      get code(): $Field<"code", string | undefined>  {
       return this.$_select("code") as any
      }

      
      get logoMediaId(): $Field<"logoMediaId", string | undefined>  {
       return this.$_select("logoMediaId") as any
      }

      
      logoMedia<Sel extends Selection<Media>>(selectorFn: (s: Media) => [...Sel]):$Field<"logoMedia", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new Media)
      };
      return this.$_select("logoMedia", options) as any
    }
  

      
      get website(): $Field<"website", string | undefined>  {
       return this.$_select("website") as any
      }

      
      get contactEmail(): $Field<"contactEmail", string | undefined>  {
       return this.$_select("contactEmail") as any
      }

      
      get taxCode(): $Field<"taxCode", string | undefined>  {
       return this.$_select("taxCode") as any
      }

      
      get isActivated(): $Field<"isActivated", boolean | undefined>  {
       return this.$_select("isActivated") as any
      }

      
      get deploymentMode(): $Field<"deploymentMode", string | undefined>  {
       return this.$_select("deploymentMode") as any
      }

      
      get id(): $Field<"id", string | undefined>  {
       return this.$_select("id") as any
      }

      
      get createdAt(): $Field<"createdAt", string | undefined>  {
       return this.$_select("createdAt") as any
      }

      
      get updatedAt(): $Field<"updatedAt", string | undefined>  {
       return this.$_select("updatedAt") as any
      }

      
      get deletedAt(): $Field<"deletedAt", string | undefined>  {
       return this.$_select("deletedAt") as any
      }
}


export class Media extends $Base<"Media"> {
  constructor() {
    super("Media")
  }

  
      
      get url(): $Field<"url", string | undefined>  {
       return this.$_select("url") as any
      }

      
      get fileSize(): $Field<"fileSize", number | undefined>  {
       return this.$_select("fileSize") as any
      }

      
      get fileName(): $Field<"fileName", string | undefined>  {
       return this.$_select("fileName") as any
      }

      
      get fileId(): $Field<"fileId", string | undefined>  {
       return this.$_select("fileId") as any
      }

      
      get type(): $Field<"type", EMediaType | undefined>  {
       return this.$_select("type") as any
      }

      
      get ownerId(): $Field<"ownerId", string | undefined>  {
       return this.$_select("ownerId") as any
      }

      
      get ownerType(): $Field<"ownerType", string | undefined>  {
       return this.$_select("ownerType") as any
      }

      
      get index(): $Field<"index", number | undefined>  {
       return this.$_select("index") as any
      }

      
      get setId(): $Field<"setId", string | undefined>  {
       return this.$_select("setId") as any
      }

      
      get fullUrl(): $Field<"fullUrl", string | undefined>  {
       return this.$_select("fullUrl") as any
      }

      
      get id(): $Field<"id", string | undefined>  {
       return this.$_select("id") as any
      }

      
      get createdAt(): $Field<"createdAt", string | undefined>  {
       return this.$_select("createdAt") as any
      }

      
      get updatedAt(): $Field<"updatedAt", string | undefined>  {
       return this.$_select("updatedAt") as any
      }

      
      get deletedAt(): $Field<"deletedAt", string | undefined>  {
       return this.$_select("deletedAt") as any
      }
}

  
export enum EMediaType {
  
  IMAGE = "IMAGE",

  VIDEO = "VIDEO",

  FILE = "FILE",

  AUDIO = "AUDIO"
}
  


/**
 * Date scalar — serialize as "yyyy-MM-dd HH:mm:ss.SSS +0700"
 */
export type DateTime = unknown


  
export enum EFeature {
  
  CORE = "CORE",

  USER_MANAGEMENT = "USER_MANAGEMENT",

  MEDIA = "MEDIA",

  REPORTING = "REPORTING",

  INTEGRATIONS = "INTEGRATIONS",

  DOCUMENT = "DOCUMENT"
}
  


export class TenantAccount extends $Base<"TenantAccount"> {
  constructor() {
    super("TenantAccount")
  }

  
      
      get tenantId(): $Field<"tenantId", string | undefined>  {
       return this.$_select("tenantId") as any
      }

      
      tenant<Sel extends Selection<Tenant>>(selectorFn: (s: Tenant) => [...Sel]):$Field<"tenant", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new Tenant)
      };
      return this.$_select("tenant", options) as any
    }
  

      
      get merchantId(): $Field<"merchantId", string | undefined>  {
       return this.$_select("merchantId") as any
      }

      
      merchant<Sel extends Selection<Merchant>>(selectorFn: (s: Merchant) => [...Sel]):$Field<"merchant", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new Merchant)
      };
      return this.$_select("merchant", options) as any
    }
  

      
      get source(): $Field<"source", string | undefined>  {
       return this.$_select("source") as any
      }

      
      get fullname(): $Field<"fullname", string | undefined>  {
       return this.$_select("fullname") as any
      }

      
      get username(): $Field<"username", string | undefined>  {
       return this.$_select("username") as any
      }

      
      get email(): $Field<"email", string | undefined>  {
       return this.$_select("email") as any
      }

      
      get phone(): $Field<"phone", string | undefined>  {
       return this.$_select("phone") as any
      }

      
      get roles(): $Field<"roles", Array<ERole | undefined> | undefined>  {
       return this.$_select("roles") as any
      }

      
      get isActivated(): $Field<"isActivated", boolean | undefined>  {
       return this.$_select("isActivated") as any
      }

      
      get lastLoginAt(): $Field<"lastLoginAt", string | undefined>  {
       return this.$_select("lastLoginAt") as any
      }

      
      get avatarMediaId(): $Field<"avatarMediaId", string | undefined>  {
       return this.$_select("avatarMediaId") as any
      }

      
      avatarMedia<Sel extends Selection<Media>>(selectorFn: (s: Media) => [...Sel]):$Field<"avatarMedia", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new Media)
      };
      return this.$_select("avatarMedia", options) as any
    }
  

      
      get agencyId(): $Field<"agencyId", string | undefined>  {
       return this.$_select("agencyId") as any
      }

      
      agency<Sel extends Selection<Agency>>(selectorFn: (s: Agency) => [...Sel]):$Field<"agency", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new Agency)
      };
      return this.$_select("agency", options) as any
    }
  

      
      get id(): $Field<"id", string | undefined>  {
       return this.$_select("id") as any
      }

      
      get createdAt(): $Field<"createdAt", string | undefined>  {
       return this.$_select("createdAt") as any
      }

      
      get updatedAt(): $Field<"updatedAt", string | undefined>  {
       return this.$_select("updatedAt") as any
      }

      
      get deletedAt(): $Field<"deletedAt", string | undefined>  {
       return this.$_select("deletedAt") as any
      }
}


export class Merchant extends $Base<"Merchant"> {
  constructor() {
    super("Merchant")
  }

  
      
      get fullname(): $Field<"fullname", string | undefined>  {
       return this.$_select("fullname") as any
      }

      
      get username(): $Field<"username", string | undefined>  {
       return this.$_select("username") as any
      }

      
      get email(): $Field<"email", string | undefined>  {
       return this.$_select("email") as any
      }

      
      get phone(): $Field<"phone", string | undefined>  {
       return this.$_select("phone") as any
      }

      
      get isActivated(): $Field<"isActivated", boolean | undefined>  {
       return this.$_select("isActivated") as any
      }

      
      get lastLoginAt(): $Field<"lastLoginAt", string | undefined>  {
       return this.$_select("lastLoginAt") as any
      }

      
      get id(): $Field<"id", string | undefined>  {
       return this.$_select("id") as any
      }

      
      get createdAt(): $Field<"createdAt", string | undefined>  {
       return this.$_select("createdAt") as any
      }

      
      get updatedAt(): $Field<"updatedAt", string | undefined>  {
       return this.$_select("updatedAt") as any
      }

      
      get deletedAt(): $Field<"deletedAt", string | undefined>  {
       return this.$_select("deletedAt") as any
      }
}

  
export enum ERole {
  
  SUPER_ADMIN = "SUPER_ADMIN",

  ADMIN = "ADMIN",

  AGENCY_OWNER = "AGENCY_OWNER",

  AGENCY_MANAGER = "AGENCY_MANAGER",

  AGENCY_STAFF = "AGENCY_STAFF",

  TENANT_OWNER = "TENANT_OWNER",

  TENANT_MANAGER = "TENANT_MANAGER",

  TENANT_STAFF = "TENANT_STAFF"
}
  


export class PaginatedUnit extends $Base<"PaginatedUnit"> {
  constructor() {
    super("PaginatedUnit")
  }

  
      
      edges<Sel extends Selection<UnitEdge>>(selectorFn: (s: UnitEdge) => [...Sel]):$Field<"edges", Array<GetOutput<Sel> | undefined> | undefined > {
      const options = {
        
        

        selection: selectorFn(new UnitEdge)
      };
      return this.$_select("edges", options) as any
    }
  

      
      pageInfo<Sel extends Selection<PageInfo>>(selectorFn: (s: PageInfo) => [...Sel]):$Field<"pageInfo", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new PageInfo)
      };
      return this.$_select("pageInfo", options) as any
    }
  
}


export class UnitEdge extends $Base<"UnitEdge"> {
  constructor() {
    super("UnitEdge")
  }

  
      
      node<Sel extends Selection<Unit>>(selectorFn: (s: Unit) => [...Sel]):$Field<"node", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new Unit)
      };
      return this.$_select("node", options) as any
    }
  

      
      get cursor(): $Field<"cursor", string | undefined>  {
       return this.$_select("cursor") as any
      }
}


export class PageInfo extends $Base<"PageInfo"> {
  constructor() {
    super("PageInfo")
  }

  
      
      get startCursor(): $Field<"startCursor", string | undefined>  {
       return this.$_select("startCursor") as any
      }

      
      get endCursor(): $Field<"endCursor", string | undefined>  {
       return this.$_select("endCursor") as any
      }

      
      get hasNextPage(): $Field<"hasNextPage", boolean | undefined>  {
       return this.$_select("hasNextPage") as any
      }

      
      get hasPreviousPage(): $Field<"hasPreviousPage", boolean | undefined>  {
       return this.$_select("hasPreviousPage") as any
      }

      
      get totalCount(): $Field<"totalCount", number | undefined>  {
       return this.$_select("totalCount") as any
      }

      
      get totalPage(): $Field<"totalPage", number | undefined>  {
       return this.$_select("totalPage") as any
      }

      
      get limit(): $Field<"limit", number | undefined>  {
       return this.$_select("limit") as any
      }
}


export type PaginationArgsInput = {
  filter?: string | undefined,
search?: string | undefined,
searchFields?: Array<string | undefined> | undefined,
after?: string | undefined,
before?: string | undefined,
limit?: number | undefined,
sort?: string | undefined,
page?: number | undefined
}
    


/**
 * Kiểu dữ liệu linh hoạt (JSON/Any)
 */
export type Mixed = any



export class Section extends $Base<"Section"> {
  constructor() {
    super("Section")
  }

  
      
      get pageId(): $Field<"pageId", string | undefined>  {
       return this.$_select("pageId") as any
      }

      
      get type(): $Field<"type", string | undefined>  {
       return this.$_select("type") as any
      }

      
      get order(): $Field<"order", number | undefined>  {
       return this.$_select("order") as any
      }

      
      get enabled(): $Field<"enabled", boolean | undefined>  {
       return this.$_select("enabled") as any
      }

      
      get layoutPreset(): $Field<"layoutPreset", string | undefined>  {
       return this.$_select("layoutPreset") as any
      }

      
      get theme(): $Field<"theme", string | undefined>  {
       return this.$_select("theme") as any
      }

      
      get content(): $Field<"content", string | undefined>  {
       return this.$_select("content") as any
      }

      
      get dataSource(): $Field<"dataSource", string | undefined>  {
       return this.$_select("dataSource") as any
      }

      
      get fieldMapping(): $Field<"fieldMapping", string | undefined>  {
       return this.$_select("fieldMapping") as any
      }

      
      get visibilityRules(): $Field<"visibilityRules", string | undefined>  {
       return this.$_select("visibilityRules") as any
      }

      
      get responsiveSettings(): $Field<"responsiveSettings", string | undefined>  {
       return this.$_select("responsiveSettings") as any
      }

      
      get animation(): $Field<"animation", string | undefined>  {
       return this.$_select("animation") as any
      }

      
      get style(): $Field<"style", string | undefined>  {
       return this.$_select("style") as any
      }

      
      get id(): $Field<"id", string | undefined>  {
       return this.$_select("id") as any
      }

      
      get createdAt(): $Field<"createdAt", string | undefined>  {
       return this.$_select("createdAt") as any
      }

      
      get updatedAt(): $Field<"updatedAt", string | undefined>  {
       return this.$_select("updatedAt") as any
      }

      
      get deletedAt(): $Field<"deletedAt", string | undefined>  {
       return this.$_select("deletedAt") as any
      }
}


export class PaginatedTenantAccount extends $Base<"PaginatedTenantAccount"> {
  constructor() {
    super("PaginatedTenantAccount")
  }

  
      
      edges<Sel extends Selection<TenantAccountEdge>>(selectorFn: (s: TenantAccountEdge) => [...Sel]):$Field<"edges", Array<GetOutput<Sel> | undefined> | undefined > {
      const options = {
        
        

        selection: selectorFn(new TenantAccountEdge)
      };
      return this.$_select("edges", options) as any
    }
  

      
      pageInfo<Sel extends Selection<PageInfo>>(selectorFn: (s: PageInfo) => [...Sel]):$Field<"pageInfo", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new PageInfo)
      };
      return this.$_select("pageInfo", options) as any
    }
  
}


export class TenantAccountEdge extends $Base<"TenantAccountEdge"> {
  constructor() {
    super("TenantAccountEdge")
  }

  
      
      node<Sel extends Selection<TenantAccount>>(selectorFn: (s: TenantAccount) => [...Sel]):$Field<"node", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new TenantAccount)
      };
      return this.$_select("node", options) as any
    }
  

      
      get cursor(): $Field<"cursor", string | undefined>  {
       return this.$_select("cursor") as any
      }
}


export class TenantAccountLogin extends $Base<"TenantAccountLogin"> {
  constructor() {
    super("TenantAccountLogin")
  }

  
      
      tenantAccount<Sel extends Selection<TenantAccount>>(selectorFn: (s: TenantAccount) => [...Sel]):$Field<"tenantAccount", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new TenantAccount)
      };
      return this.$_select("tenantAccount", options) as any
    }
  

      
      get token(): $Field<"token", string | undefined>  {
       return this.$_select("token") as any
      }

      
      tenant<Sel extends Selection<Tenant>>(selectorFn: (s: Tenant) => [...Sel]):$Field<"tenant", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new Tenant)
      };
      return this.$_select("tenant", options) as any
    }
  

      
      agency<Sel extends Selection<Agency>>(selectorFn: (s: Agency) => [...Sel]):$Field<"agency", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new Agency)
      };
      return this.$_select("agency", options) as any
    }
  

      
      get source(): $Field<"source", EAccountSource | undefined>  {
       return this.$_select("source") as any
      }

      
      get roles(): $Field<"roles", Array<ERole | undefined> | undefined>  {
       return this.$_select("roles") as any
      }
}

  
export enum EAccountSource {
  
  AGENCY = "AGENCY",

  TENANT = "TENANT"
}
  


export class PaginatedTenant extends $Base<"PaginatedTenant"> {
  constructor() {
    super("PaginatedTenant")
  }

  
      
      edges<Sel extends Selection<TenantEdge>>(selectorFn: (s: TenantEdge) => [...Sel]):$Field<"edges", Array<GetOutput<Sel> | undefined> | undefined > {
      const options = {
        
        

        selection: selectorFn(new TenantEdge)
      };
      return this.$_select("edges", options) as any
    }
  

      
      pageInfo<Sel extends Selection<PageInfo>>(selectorFn: (s: PageInfo) => [...Sel]):$Field<"pageInfo", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new PageInfo)
      };
      return this.$_select("pageInfo", options) as any
    }
  
}


export class TenantEdge extends $Base<"TenantEdge"> {
  constructor() {
    super("TenantEdge")
  }

  
      
      node<Sel extends Selection<Tenant>>(selectorFn: (s: Tenant) => [...Sel]):$Field<"node", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new Tenant)
      };
      return this.$_select("node", options) as any
    }
  

      
      get cursor(): $Field<"cursor", string | undefined>  {
       return this.$_select("cursor") as any
      }
}


export class PaginatedMerchant extends $Base<"PaginatedMerchant"> {
  constructor() {
    super("PaginatedMerchant")
  }

  
      
      edges<Sel extends Selection<MerchantEdge>>(selectorFn: (s: MerchantEdge) => [...Sel]):$Field<"edges", Array<GetOutput<Sel> | undefined> | undefined > {
      const options = {
        
        

        selection: selectorFn(new MerchantEdge)
      };
      return this.$_select("edges", options) as any
    }
  

      
      pageInfo<Sel extends Selection<PageInfo>>(selectorFn: (s: PageInfo) => [...Sel]):$Field<"pageInfo", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new PageInfo)
      };
      return this.$_select("pageInfo", options) as any
    }
  
}


export class MerchantEdge extends $Base<"MerchantEdge"> {
  constructor() {
    super("MerchantEdge")
  }

  
      
      node<Sel extends Selection<Merchant>>(selectorFn: (s: Merchant) => [...Sel]):$Field<"node", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new Merchant)
      };
      return this.$_select("node", options) as any
    }
  

      
      get cursor(): $Field<"cursor", string | undefined>  {
       return this.$_select("cursor") as any
      }
}


export class MerchantAssignments extends $Base<"MerchantAssignments"> {
  constructor() {
    super("MerchantAssignments")
  }

  
      
      agencies<Sel extends Selection<AgencyAccount>>(selectorFn: (s: AgencyAccount) => [...Sel]):$Field<"agencies", Array<GetOutput<Sel> | undefined> | undefined > {
      const options = {
        
        

        selection: selectorFn(new AgencyAccount)
      };
      return this.$_select("agencies", options) as any
    }
  

      
      tenants<Sel extends Selection<TenantAccount>>(selectorFn: (s: TenantAccount) => [...Sel]):$Field<"tenants", Array<GetOutput<Sel> | undefined> | undefined > {
      const options = {
        
        

        selection: selectorFn(new TenantAccount)
      };
      return this.$_select("tenants", options) as any
    }
  
}


export class AgencyAccount extends $Base<"AgencyAccount"> {
  constructor() {
    super("AgencyAccount")
  }

  
      
      get merchantId(): $Field<"merchantId", string | undefined>  {
       return this.$_select("merchantId") as any
      }

      
      merchant<Sel extends Selection<Merchant>>(selectorFn: (s: Merchant) => [...Sel]):$Field<"merchant", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new Merchant)
      };
      return this.$_select("merchant", options) as any
    }
  

      
      get fullname(): $Field<"fullname", string | undefined>  {
       return this.$_select("fullname") as any
      }

      
      get username(): $Field<"username", string | undefined>  {
       return this.$_select("username") as any
      }

      
      get email(): $Field<"email", string | undefined>  {
       return this.$_select("email") as any
      }

      
      get phone(): $Field<"phone", string | undefined>  {
       return this.$_select("phone") as any
      }

      
      get roles(): $Field<"roles", Array<ERole | undefined> | undefined>  {
       return this.$_select("roles") as any
      }

      
      get isActivated(): $Field<"isActivated", boolean | undefined>  {
       return this.$_select("isActivated") as any
      }

      
      get lastLoginAt(): $Field<"lastLoginAt", string | undefined>  {
       return this.$_select("lastLoginAt") as any
      }

      
      get avatarMediaId(): $Field<"avatarMediaId", string | undefined>  {
       return this.$_select("avatarMediaId") as any
      }

      
      avatarMedia<Sel extends Selection<Media>>(selectorFn: (s: Media) => [...Sel]):$Field<"avatarMedia", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new Media)
      };
      return this.$_select("avatarMedia", options) as any
    }
  

      
      get agencyId(): $Field<"agencyId", string | undefined>  {
       return this.$_select("agencyId") as any
      }

      
      agency<Sel extends Selection<Agency>>(selectorFn: (s: Agency) => [...Sel]):$Field<"agency", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new Agency)
      };
      return this.$_select("agency", options) as any
    }
  

      
      get id(): $Field<"id", string | undefined>  {
       return this.$_select("id") as any
      }

      
      get createdAt(): $Field<"createdAt", string | undefined>  {
       return this.$_select("createdAt") as any
      }

      
      get updatedAt(): $Field<"updatedAt", string | undefined>  {
       return this.$_select("updatedAt") as any
      }

      
      get deletedAt(): $Field<"deletedAt", string | undefined>  {
       return this.$_select("deletedAt") as any
      }
}


export class Redirect extends $Base<"Redirect"> {
  constructor() {
    super("Redirect")
  }

  
      
      get fromPath(): $Field<"fromPath", string | undefined>  {
       return this.$_select("fromPath") as any
      }

      
      get toPath(): $Field<"toPath", string | undefined>  {
       return this.$_select("toPath") as any
      }

      
      get statusCode(): $Field<"statusCode", ERedirectStatusCode | undefined>  {
       return this.$_select("statusCode") as any
      }

      
      get id(): $Field<"id", string | undefined>  {
       return this.$_select("id") as any
      }

      
      get createdAt(): $Field<"createdAt", string | undefined>  {
       return this.$_select("createdAt") as any
      }

      
      get updatedAt(): $Field<"updatedAt", string | undefined>  {
       return this.$_select("updatedAt") as any
      }

      
      get deletedAt(): $Field<"deletedAt", string | undefined>  {
       return this.$_select("deletedAt") as any
      }
}

  
export enum ERedirectStatusCode {
  
  PERMANENT_301 = "PERMANENT_301",

  TEMPORARY_302 = "TEMPORARY_302"
}
  


export class PaginatedRedirect extends $Base<"PaginatedRedirect"> {
  constructor() {
    super("PaginatedRedirect")
  }

  
      
      edges<Sel extends Selection<RedirectEdge>>(selectorFn: (s: RedirectEdge) => [...Sel]):$Field<"edges", Array<GetOutput<Sel> | undefined> | undefined > {
      const options = {
        
        

        selection: selectorFn(new RedirectEdge)
      };
      return this.$_select("edges", options) as any
    }
  

      
      pageInfo<Sel extends Selection<PageInfo>>(selectorFn: (s: PageInfo) => [...Sel]):$Field<"pageInfo", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new PageInfo)
      };
      return this.$_select("pageInfo", options) as any
    }
  
}


export class RedirectEdge extends $Base<"RedirectEdge"> {
  constructor() {
    super("RedirectEdge")
  }

  
      
      node<Sel extends Selection<Redirect>>(selectorFn: (s: Redirect) => [...Sel]):$Field<"node", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new Redirect)
      };
      return this.$_select("node", options) as any
    }
  

      
      get cursor(): $Field<"cursor", string | undefined>  {
       return this.$_select("cursor") as any
      }
}


export class PageResolverResult extends $Base<"PageResolverResult"> {
  constructor() {
    super("PageResolverResult")
  }

  
      
      page<Sel extends Selection<Page>>(selectorFn: (s: Page) => [...Sel]):$Field<"page", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new Page)
      };
      return this.$_select("page", options) as any
    }
  

      
      sections<Sel extends Selection<Section>>(selectorFn: (s: Section) => [...Sel]):$Field<"sections", Array<GetOutput<Sel> | undefined> | undefined > {
      const options = {
        
        

        selection: selectorFn(new Section)
      };
      return this.$_select("sections", options) as any
    }
  

      
      seo<Sel extends Selection<Seo>>(selectorFn: (s: Seo) => [...Sel]):$Field<"seo", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new Seo)
      };
      return this.$_select("seo", options) as any
    }
  

      
      entry<Sel extends Selection<ContentEntry>>(selectorFn: (s: ContentEntry) => [...Sel]):$Field<"entry", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new ContentEntry)
      };
      return this.$_select("entry", options) as any
    }
  

      
      get params(): $Field<"params", string | undefined>  {
       return this.$_select("params") as any
      }

      
      header<Sel extends Selection<HeaderPreset>>(selectorFn: (s: HeaderPreset) => [...Sel]):$Field<"header", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new HeaderPreset)
      };
      return this.$_select("header", options) as any
    }
  

      
      footer<Sel extends Selection<FooterPreset>>(selectorFn: (s: FooterPreset) => [...Sel]):$Field<"footer", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new FooterPreset)
      };
      return this.$_select("footer", options) as any
    }
  
}


export class Page extends $Base<"Page"> {
  constructor() {
    super("Page")
  }

  
      
      get internalName(): $Field<"internalName", string | undefined>  {
       return this.$_select("internalName") as any
      }

      
      get path(): $Field<"path", string | undefined>  {
       return this.$_select("path") as any
      }

      
      get pageType(): $Field<"pageType", EPageType | undefined>  {
       return this.$_select("pageType") as any
      }

      
      get templateKey(): $Field<"templateKey", string | undefined>  {
       return this.$_select("templateKey") as any
      }

      
      get parentPageId(): $Field<"parentPageId", string | undefined>  {
       return this.$_select("parentPageId") as any
      }

      
      get contentTypeId(): $Field<"contentTypeId", string | undefined>  {
       return this.$_select("contentTypeId") as any
      }

      
      get headerPresetId(): $Field<"headerPresetId", string | undefined>  {
       return this.$_select("headerPresetId") as any
      }

      
      get footerPresetId(): $Field<"footerPresetId", string | undefined>  {
       return this.$_select("footerPresetId") as any
      }

      
      get status(): $Field<"status", EPageStatus | undefined>  {
       return this.$_select("status") as any
      }

      
      get publishedAt(): $Field<"publishedAt", string | undefined>  {
       return this.$_select("publishedAt") as any
      }

      
      get scheduledAt(): $Field<"scheduledAt", string | undefined>  {
       return this.$_select("scheduledAt") as any
      }

      
      get locale(): $Field<"locale", string | undefined>  {
       return this.$_select("locale") as any
      }

      
      seo<Sel extends Selection<Seo>>(selectorFn: (s: Seo) => [...Sel]):$Field<"seo", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new Seo)
      };
      return this.$_select("seo", options) as any
    }
  

      
      get style(): $Field<"style", string | undefined>  {
       return this.$_select("style") as any
      }

      
      get id(): $Field<"id", string | undefined>  {
       return this.$_select("id") as any
      }

      
      get createdAt(): $Field<"createdAt", string | undefined>  {
       return this.$_select("createdAt") as any
      }

      
      get updatedAt(): $Field<"updatedAt", string | undefined>  {
       return this.$_select("updatedAt") as any
      }

      
      get deletedAt(): $Field<"deletedAt", string | undefined>  {
       return this.$_select("deletedAt") as any
      }
}

  
export enum EPageType {
  
  STATIC_MODULAR = "STATIC_MODULAR",

  COLLECTION_LISTING = "COLLECTION_LISTING",

  COLLECTION_DETAIL = "COLLECTION_DETAIL",

  SPECIAL = "SPECIAL"
}
  

  
export enum EPageStatus {
  
  DRAFT = "DRAFT",

  SCHEDULED = "SCHEDULED",

  PUBLISHED = "PUBLISHED",

  UNPUBLISHED = "UNPUBLISHED",

  ARCHIVED = "ARCHIVED"
}
  


export class Seo extends $Base<"Seo"> {
  constructor() {
    super("Seo")
  }

  
      
      get title(): $Field<"title", string | undefined>  {
       return this.$_select("title") as any
      }

      
      get description(): $Field<"description", string | undefined>  {
       return this.$_select("description") as any
      }

      
      get ogTitle(): $Field<"ogTitle", string | undefined>  {
       return this.$_select("ogTitle") as any
      }

      
      get ogDescription(): $Field<"ogDescription", string | undefined>  {
       return this.$_select("ogDescription") as any
      }

      
      get ogImage(): $Field<"ogImage", string | undefined>  {
       return this.$_select("ogImage") as any
      }

      
      get twitterImage(): $Field<"twitterImage", string | undefined>  {
       return this.$_select("twitterImage") as any
      }

      
      get robotsIndex(): $Field<"robotsIndex", boolean | undefined>  {
       return this.$_select("robotsIndex") as any
      }

      
      get robotsFollow(): $Field<"robotsFollow", boolean | undefined>  {
       return this.$_select("robotsFollow") as any
      }

      
      get canonicalUrl(): $Field<"canonicalUrl", string | undefined>  {
       return this.$_select("canonicalUrl") as any
      }

      
      get structuredData(): $Field<"structuredData", string | undefined>  {
       return this.$_select("structuredData") as any
      }

      
      get sitemapPriority(): $Field<"sitemapPriority", number | undefined>  {
       return this.$_select("sitemapPriority") as any
      }

      
      get sitemapChangeFreq(): $Field<"sitemapChangeFreq", string | undefined>  {
       return this.$_select("sitemapChangeFreq") as any
      }
}


export class ContentEntry extends $Base<"ContentEntry"> {
  constructor() {
    super("ContentEntry")
  }

  
      
      get contentTypeId(): $Field<"contentTypeId", string | undefined>  {
       return this.$_select("contentTypeId") as any
      }

      
      get slug(): $Field<"slug", string | undefined>  {
       return this.$_select("slug") as any
      }

      
      get status(): $Field<"status", EPageStatus | undefined>  {
       return this.$_select("status") as any
      }

      
      get publishedAt(): $Field<"publishedAt", string | undefined>  {
       return this.$_select("publishedAt") as any
      }

      
      get locale(): $Field<"locale", string | undefined>  {
       return this.$_select("locale") as any
      }

      
      seo<Sel extends Selection<Seo>>(selectorFn: (s: Seo) => [...Sel]):$Field<"seo", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new Seo)
      };
      return this.$_select("seo", options) as any
    }
  

      
      get data(): $Field<"data", string | undefined>  {
       return this.$_select("data") as any
      }

      
      get id(): $Field<"id", string | undefined>  {
       return this.$_select("id") as any
      }

      
      get createdAt(): $Field<"createdAt", string | undefined>  {
       return this.$_select("createdAt") as any
      }

      
      get updatedAt(): $Field<"updatedAt", string | undefined>  {
       return this.$_select("updatedAt") as any
      }

      
      get deletedAt(): $Field<"deletedAt", string | undefined>  {
       return this.$_select("deletedAt") as any
      }
}


export class HeaderPreset extends $Base<"HeaderPreset"> {
  constructor() {
    super("HeaderPreset")
  }

  
      
      get name(): $Field<"name", string | undefined>  {
       return this.$_select("name") as any
      }

      
      get isDefault(): $Field<"isDefault", boolean | undefined>  {
       return this.$_select("isDefault") as any
      }

      
      get logoText(): $Field<"logoText", string | undefined>  {
       return this.$_select("logoText") as any
      }

      
      get navLinks(): $Field<"navLinks", string | undefined>  {
       return this.$_select("navLinks") as any
      }

      
      get animation(): $Field<"animation", string | undefined>  {
       return this.$_select("animation") as any
      }

      
      get id(): $Field<"id", string | undefined>  {
       return this.$_select("id") as any
      }

      
      get createdAt(): $Field<"createdAt", string | undefined>  {
       return this.$_select("createdAt") as any
      }

      
      get updatedAt(): $Field<"updatedAt", string | undefined>  {
       return this.$_select("updatedAt") as any
      }

      
      get deletedAt(): $Field<"deletedAt", string | undefined>  {
       return this.$_select("deletedAt") as any
      }
}


export class FooterPreset extends $Base<"FooterPreset"> {
  constructor() {
    super("FooterPreset")
  }

  
      
      get name(): $Field<"name", string | undefined>  {
       return this.$_select("name") as any
      }

      
      get isDefault(): $Field<"isDefault", boolean | undefined>  {
       return this.$_select("isDefault") as any
      }

      
      get logoText(): $Field<"logoText", string | undefined>  {
       return this.$_select("logoText") as any
      }

      
      get hotlineLabel(): $Field<"hotlineLabel", string | undefined>  {
       return this.$_select("hotlineLabel") as any
      }

      
      get hotline(): $Field<"hotline", string | undefined>  {
       return this.$_select("hotline") as any
      }

      
      get footerHeading(): $Field<"footerHeading", string | undefined>  {
       return this.$_select("footerHeading") as any
      }

      
      get footerEmail(): $Field<"footerEmail", string | undefined>  {
       return this.$_select("footerEmail") as any
      }

      
      get footerColumns(): $Field<"footerColumns", string | undefined>  {
       return this.$_select("footerColumns") as any
      }

      
      get footerOutlineText(): $Field<"footerOutlineText", string | undefined>  {
       return this.$_select("footerOutlineText") as any
      }

      
      get animation(): $Field<"animation", string | undefined>  {
       return this.$_select("animation") as any
      }

      
      get id(): $Field<"id", string | undefined>  {
       return this.$_select("id") as any
      }

      
      get createdAt(): $Field<"createdAt", string | undefined>  {
       return this.$_select("createdAt") as any
      }

      
      get updatedAt(): $Field<"updatedAt", string | undefined>  {
       return this.$_select("updatedAt") as any
      }

      
      get deletedAt(): $Field<"deletedAt", string | undefined>  {
       return this.$_select("deletedAt") as any
      }
}


export class PaginatedPage extends $Base<"PaginatedPage"> {
  constructor() {
    super("PaginatedPage")
  }

  
      
      edges<Sel extends Selection<PageEdge>>(selectorFn: (s: PageEdge) => [...Sel]):$Field<"edges", Array<GetOutput<Sel> | undefined> | undefined > {
      const options = {
        
        

        selection: selectorFn(new PageEdge)
      };
      return this.$_select("edges", options) as any
    }
  

      
      pageInfo<Sel extends Selection<PageInfo>>(selectorFn: (s: PageInfo) => [...Sel]):$Field<"pageInfo", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new PageInfo)
      };
      return this.$_select("pageInfo", options) as any
    }
  
}


export class PageEdge extends $Base<"PageEdge"> {
  constructor() {
    super("PageEdge")
  }

  
      
      node<Sel extends Selection<Page>>(selectorFn: (s: Page) => [...Sel]):$Field<"node", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new Page)
      };
      return this.$_select("node", options) as any
    }
  

      
      get cursor(): $Field<"cursor", string | undefined>  {
       return this.$_select("cursor") as any
      }
}


export class MediaSet extends $Base<"MediaSet"> {
  constructor() {
    super("MediaSet")
  }

  
      
      get content(): $Field<"content", string | undefined>  {
       return this.$_select("content") as any
      }

      
      medias<Sel extends Selection<Media>>(selectorFn: (s: Media) => [...Sel]):$Field<"medias", Array<GetOutput<Sel> | undefined> | undefined > {
      const options = {
        
        

        selection: selectorFn(new Media)
      };
      return this.$_select("medias", options) as any
    }
  

      
      get id(): $Field<"id", string | undefined>  {
       return this.$_select("id") as any
      }

      
      get createdAt(): $Field<"createdAt", string | undefined>  {
       return this.$_select("createdAt") as any
      }

      
      get updatedAt(): $Field<"updatedAt", string | undefined>  {
       return this.$_select("updatedAt") as any
      }

      
      get deletedAt(): $Field<"deletedAt", string | undefined>  {
       return this.$_select("deletedAt") as any
      }
}


export class PaginatedMediaSet extends $Base<"PaginatedMediaSet"> {
  constructor() {
    super("PaginatedMediaSet")
  }

  
      
      edges<Sel extends Selection<MediaSetEdge>>(selectorFn: (s: MediaSetEdge) => [...Sel]):$Field<"edges", Array<GetOutput<Sel> | undefined> | undefined > {
      const options = {
        
        

        selection: selectorFn(new MediaSetEdge)
      };
      return this.$_select("edges", options) as any
    }
  

      
      pageInfo<Sel extends Selection<PageInfo>>(selectorFn: (s: PageInfo) => [...Sel]):$Field<"pageInfo", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new PageInfo)
      };
      return this.$_select("pageInfo", options) as any
    }
  
}


export class MediaSetEdge extends $Base<"MediaSetEdge"> {
  constructor() {
    super("MediaSetEdge")
  }

  
      
      node<Sel extends Selection<MediaSet>>(selectorFn: (s: MediaSet) => [...Sel]):$Field<"node", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new MediaSet)
      };
      return this.$_select("node", options) as any
    }
  

      
      get cursor(): $Field<"cursor", string | undefined>  {
       return this.$_select("cursor") as any
      }
}


export class EmailConfig extends $Base<"EmailConfig"> {
  constructor() {
    super("EmailConfig")
  }

  
      
      get name(): $Field<"name", string | undefined>  {
       return this.$_select("name") as any
      }

      
      get domain(): $Field<"domain", string | undefined>  {
       return this.$_select("domain") as any
      }

      
      get isDefault(): $Field<"isDefault", boolean | undefined>  {
       return this.$_select("isDefault") as any
      }

      
      get isActive(): $Field<"isActive", boolean | undefined>  {
       return this.$_select("isActive") as any
      }

      
      get smtpHost(): $Field<"smtpHost", string | undefined>  {
       return this.$_select("smtpHost") as any
      }

      
      get smtpPort(): $Field<"smtpPort", number | undefined>  {
       return this.$_select("smtpPort") as any
      }

      
      get smtpSecure(): $Field<"smtpSecure", boolean | undefined>  {
       return this.$_select("smtpSecure") as any
      }

      
      get smtpUser(): $Field<"smtpUser", string | undefined>  {
       return this.$_select("smtpUser") as any
      }

      
      get senderName(): $Field<"senderName", string | undefined>  {
       return this.$_select("senderName") as any
      }

      
      get senderEmail(): $Field<"senderEmail", string | undefined>  {
       return this.$_select("senderEmail") as any
      }

      
      get resetPasswordSubject(): $Field<"resetPasswordSubject", string | undefined>  {
       return this.$_select("resetPasswordSubject") as any
      }

      
      get resetPasswordTemplate(): $Field<"resetPasswordTemplate", string | undefined>  {
       return this.$_select("resetPasswordTemplate") as any
      }

      
      get id(): $Field<"id", string | undefined>  {
       return this.$_select("id") as any
      }

      
      get createdAt(): $Field<"createdAt", string | undefined>  {
       return this.$_select("createdAt") as any
      }

      
      get updatedAt(): $Field<"updatedAt", string | undefined>  {
       return this.$_select("updatedAt") as any
      }

      
      get deletedAt(): $Field<"deletedAt", string | undefined>  {
       return this.$_select("deletedAt") as any
      }
}


export class PaginatedEmailConfig extends $Base<"PaginatedEmailConfig"> {
  constructor() {
    super("PaginatedEmailConfig")
  }

  
      
      edges<Sel extends Selection<EmailConfigEdge>>(selectorFn: (s: EmailConfigEdge) => [...Sel]):$Field<"edges", Array<GetOutput<Sel> | undefined> | undefined > {
      const options = {
        
        

        selection: selectorFn(new EmailConfigEdge)
      };
      return this.$_select("edges", options) as any
    }
  

      
      pageInfo<Sel extends Selection<PageInfo>>(selectorFn: (s: PageInfo) => [...Sel]):$Field<"pageInfo", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new PageInfo)
      };
      return this.$_select("pageInfo", options) as any
    }
  
}


export class EmailConfigEdge extends $Base<"EmailConfigEdge"> {
  constructor() {
    super("EmailConfigEdge")
  }

  
      
      node<Sel extends Selection<EmailConfig>>(selectorFn: (s: EmailConfig) => [...Sel]):$Field<"node", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new EmailConfig)
      };
      return this.$_select("node", options) as any
    }
  

      
      get cursor(): $Field<"cursor", string | undefined>  {
       return this.$_select("cursor") as any
      }
}


export class ContentType extends $Base<"ContentType"> {
  constructor() {
    super("ContentType")
  }

  
      
      get key(): $Field<"key", string | undefined>  {
       return this.$_select("key") as any
      }

      
      get label(): $Field<"label", string | undefined>  {
       return this.$_select("label") as any
      }

      
      get icon(): $Field<"icon", string | undefined>  {
       return this.$_select("icon") as any
      }

      
      fields<Sel extends Selection<FieldDefinition>>(selectorFn: (s: FieldDefinition) => [...Sel]):$Field<"fields", Array<GetOutput<Sel> | undefined> | undefined > {
      const options = {
        
        

        selection: selectorFn(new FieldDefinition)
      };
      return this.$_select("fields", options) as any
    }
  

      
      get id(): $Field<"id", string | undefined>  {
       return this.$_select("id") as any
      }

      
      get createdAt(): $Field<"createdAt", string | undefined>  {
       return this.$_select("createdAt") as any
      }

      
      get updatedAt(): $Field<"updatedAt", string | undefined>  {
       return this.$_select("updatedAt") as any
      }

      
      get deletedAt(): $Field<"deletedAt", string | undefined>  {
       return this.$_select("deletedAt") as any
      }
}


export class FieldDefinition extends $Base<"FieldDefinition"> {
  constructor() {
    super("FieldDefinition")
  }

  
      
      get key(): $Field<"key", string | undefined>  {
       return this.$_select("key") as any
      }

      
      get label(): $Field<"label", string | undefined>  {
       return this.$_select("label") as any
      }

      
      get type(): $Field<"type", EFieldType | undefined>  {
       return this.$_select("type") as any
      }

      
      get required(): $Field<"required", boolean | undefined>  {
       return this.$_select("required") as any
      }

      
      get options(): $Field<"options", Array<string | undefined> | undefined>  {
       return this.$_select("options") as any
      }

      
      get relationTarget(): $Field<"relationTarget", string | undefined>  {
       return this.$_select("relationTarget") as any
      }

      
      get relationMultiple(): $Field<"relationMultiple", boolean | undefined>  {
       return this.$_select("relationMultiple") as any
      }

      
      get isSlugSource(): $Field<"isSlugSource", boolean | undefined>  {
       return this.$_select("isSlugSource") as any
      }

      
      get showInListing(): $Field<"showInListing", boolean | undefined>  {
       return this.$_select("showInListing") as any
      }

      
      get mockValue(): $Field<"mockValue", string | undefined>  {
       return this.$_select("mockValue") as any
      }
}

  
export enum EFieldType {
  
  TEXT = "TEXT",

  RICHTEXT = "RICHTEXT",

  NUMBER = "NUMBER",

  BOOLEAN = "BOOLEAN",

  DATE = "DATE",

  SELECT = "SELECT",

  IMAGE = "IMAGE",

  GALLERY = "GALLERY",

  VIDEO = "VIDEO",

  LINK = "LINK",

  RELATION = "RELATION"
}
  


export class PaginatedContentType extends $Base<"PaginatedContentType"> {
  constructor() {
    super("PaginatedContentType")
  }

  
      
      edges<Sel extends Selection<ContentTypeEdge>>(selectorFn: (s: ContentTypeEdge) => [...Sel]):$Field<"edges", Array<GetOutput<Sel> | undefined> | undefined > {
      const options = {
        
        

        selection: selectorFn(new ContentTypeEdge)
      };
      return this.$_select("edges", options) as any
    }
  

      
      pageInfo<Sel extends Selection<PageInfo>>(selectorFn: (s: PageInfo) => [...Sel]):$Field<"pageInfo", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new PageInfo)
      };
      return this.$_select("pageInfo", options) as any
    }
  
}


export class ContentTypeEdge extends $Base<"ContentTypeEdge"> {
  constructor() {
    super("ContentTypeEdge")
  }

  
      
      node<Sel extends Selection<ContentType>>(selectorFn: (s: ContentType) => [...Sel]):$Field<"node", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new ContentType)
      };
      return this.$_select("node", options) as any
    }
  

      
      get cursor(): $Field<"cursor", string | undefined>  {
       return this.$_select("cursor") as any
      }
}


export class Customer extends $Base<"Customer"> {
  constructor() {
    super("Customer")
  }

  
      
      get tenantId(): $Field<"tenantId", string | undefined>  {
       return this.$_select("tenantId") as any
      }

      
      get id(): $Field<"id", string | undefined>  {
       return this.$_select("id") as any
      }

      
      get createdAt(): $Field<"createdAt", string | undefined>  {
       return this.$_select("createdAt") as any
      }

      
      get updatedAt(): $Field<"updatedAt", string | undefined>  {
       return this.$_select("updatedAt") as any
      }

      
      get deletedAt(): $Field<"deletedAt", string | undefined>  {
       return this.$_select("deletedAt") as any
      }
}


export class PaginatedCustomer extends $Base<"PaginatedCustomer"> {
  constructor() {
    super("PaginatedCustomer")
  }

  
      
      edges<Sel extends Selection<CustomerEdge>>(selectorFn: (s: CustomerEdge) => [...Sel]):$Field<"edges", Array<GetOutput<Sel> | undefined> | undefined > {
      const options = {
        
        

        selection: selectorFn(new CustomerEdge)
      };
      return this.$_select("edges", options) as any
    }
  

      
      pageInfo<Sel extends Selection<PageInfo>>(selectorFn: (s: PageInfo) => [...Sel]):$Field<"pageInfo", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new PageInfo)
      };
      return this.$_select("pageInfo", options) as any
    }
  
}


export class CustomerEdge extends $Base<"CustomerEdge"> {
  constructor() {
    super("CustomerEdge")
  }

  
      
      node<Sel extends Selection<Customer>>(selectorFn: (s: Customer) => [...Sel]):$Field<"node", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new Customer)
      };
      return this.$_select("node", options) as any
    }
  

      
      get cursor(): $Field<"cursor", string | undefined>  {
       return this.$_select("cursor") as any
      }
}


export class PaginatedContentEntry extends $Base<"PaginatedContentEntry"> {
  constructor() {
    super("PaginatedContentEntry")
  }

  
      
      edges<Sel extends Selection<ContentEntryEdge>>(selectorFn: (s: ContentEntryEdge) => [...Sel]):$Field<"edges", Array<GetOutput<Sel> | undefined> | undefined > {
      const options = {
        
        

        selection: selectorFn(new ContentEntryEdge)
      };
      return this.$_select("edges", options) as any
    }
  

      
      pageInfo<Sel extends Selection<PageInfo>>(selectorFn: (s: PageInfo) => [...Sel]):$Field<"pageInfo", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new PageInfo)
      };
      return this.$_select("pageInfo", options) as any
    }
  
}


export class ContentEntryEdge extends $Base<"ContentEntryEdge"> {
  constructor() {
    super("ContentEntryEdge")
  }

  
      
      node<Sel extends Selection<ContentEntry>>(selectorFn: (s: ContentEntry) => [...Sel]):$Field<"node", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new ContentEntry)
      };
      return this.$_select("node", options) as any
    }
  

      
      get cursor(): $Field<"cursor", string | undefined>  {
       return this.$_select("cursor") as any
      }
}


export class PaginatedAgency extends $Base<"PaginatedAgency"> {
  constructor() {
    super("PaginatedAgency")
  }

  
      
      edges<Sel extends Selection<AgencyEdge>>(selectorFn: (s: AgencyEdge) => [...Sel]):$Field<"edges", Array<GetOutput<Sel> | undefined> | undefined > {
      const options = {
        
        

        selection: selectorFn(new AgencyEdge)
      };
      return this.$_select("edges", options) as any
    }
  

      
      pageInfo<Sel extends Selection<PageInfo>>(selectorFn: (s: PageInfo) => [...Sel]):$Field<"pageInfo", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new PageInfo)
      };
      return this.$_select("pageInfo", options) as any
    }
  
}


export class AgencyEdge extends $Base<"AgencyEdge"> {
  constructor() {
    super("AgencyEdge")
  }

  
      
      node<Sel extends Selection<Agency>>(selectorFn: (s: Agency) => [...Sel]):$Field<"node", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new Agency)
      };
      return this.$_select("node", options) as any
    }
  

      
      get cursor(): $Field<"cursor", string | undefined>  {
       return this.$_select("cursor") as any
      }
}


export class Admin extends $Base<"Admin"> {
  constructor() {
    super("Admin")
  }

  
      
      get email(): $Field<"email", string | undefined>  {
       return this.$_select("email") as any
      }

      
      get username(): $Field<"username", string | undefined>  {
       return this.$_select("username") as any
      }

      
      get firstName(): $Field<"firstName", string | undefined>  {
       return this.$_select("firstName") as any
      }

      
      get lastName(): $Field<"lastName", string | undefined>  {
       return this.$_select("lastName") as any
      }

      
      get roles(): $Field<"roles", Array<ERole | undefined> | undefined>  {
       return this.$_select("roles") as any
      }

      
      get isActivated(): $Field<"isActivated", boolean | undefined>  {
       return this.$_select("isActivated") as any
      }

      
      get lastLoginAt(): $Field<"lastLoginAt", string | undefined>  {
       return this.$_select("lastLoginAt") as any
      }

      
      get id(): $Field<"id", string | undefined>  {
       return this.$_select("id") as any
      }

      
      get createdAt(): $Field<"createdAt", string | undefined>  {
       return this.$_select("createdAt") as any
      }

      
      get updatedAt(): $Field<"updatedAt", string | undefined>  {
       return this.$_select("updatedAt") as any
      }

      
      get deletedAt(): $Field<"deletedAt", string | undefined>  {
       return this.$_select("deletedAt") as any
      }
}


export class PaginatedAdmin extends $Base<"PaginatedAdmin"> {
  constructor() {
    super("PaginatedAdmin")
  }

  
      
      edges<Sel extends Selection<AdminEdge>>(selectorFn: (s: AdminEdge) => [...Sel]):$Field<"edges", Array<GetOutput<Sel> | undefined> | undefined > {
      const options = {
        
        

        selection: selectorFn(new AdminEdge)
      };
      return this.$_select("edges", options) as any
    }
  

      
      pageInfo<Sel extends Selection<PageInfo>>(selectorFn: (s: PageInfo) => [...Sel]):$Field<"pageInfo", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new PageInfo)
      };
      return this.$_select("pageInfo", options) as any
    }
  
}


export class AdminEdge extends $Base<"AdminEdge"> {
  constructor() {
    super("AdminEdge")
  }

  
      
      node<Sel extends Selection<Admin>>(selectorFn: (s: Admin) => [...Sel]):$Field<"node", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new Admin)
      };
      return this.$_select("node", options) as any
    }
  

      
      get cursor(): $Field<"cursor", string | undefined>  {
       return this.$_select("cursor") as any
      }
}


export class CodeConfig extends $Base<"CodeConfig"> {
  constructor() {
    super("CodeConfig")
  }

  
      
      get entityType(): $Field<"entityType", ECodeEntityType | undefined>  {
       return this.$_select("entityType") as any
      }

      
      get prefix(): $Field<"prefix", string | undefined>  {
       return this.$_select("prefix") as any
      }

      
      get separator(): $Field<"separator", string | undefined>  {
       return this.$_select("separator") as any
      }

      
      get includeYear(): $Field<"includeYear", boolean | undefined>  {
       return this.$_select("includeYear") as any
      }

      
      get sequenceLength(): $Field<"sequenceLength", number | undefined>  {
       return this.$_select("sequenceLength") as any
      }

      
      get currentSequence(): $Field<"currentSequence", number | undefined>  {
       return this.$_select("currentSequence") as any
      }

      
      get customPattern(): $Field<"customPattern", string | undefined>  {
       return this.$_select("customPattern") as any
      }

      
      get tenantId(): $Field<"tenantId", string | undefined>  {
       return this.$_select("tenantId") as any
      }

      
      tenant<Sel extends Selection<Tenant>>(selectorFn: (s: Tenant) => [...Sel]):$Field<"tenant", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new Tenant)
      };
      return this.$_select("tenant", options) as any
    }
  

      
      get createdByTenantAccountId(): $Field<"createdByTenantAccountId", string | undefined>  {
       return this.$_select("createdByTenantAccountId") as any
      }

      
      createdByTenantAccount<Sel extends Selection<TenantAccount>>(selectorFn: (s: TenantAccount) => [...Sel]):$Field<"createdByTenantAccount", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new TenantAccount)
      };
      return this.$_select("createdByTenantAccount", options) as any
    }
  

      
      get agencyId(): $Field<"agencyId", string | undefined>  {
       return this.$_select("agencyId") as any
      }

      
      agency<Sel extends Selection<Agency>>(selectorFn: (s: Agency) => [...Sel]):$Field<"agency", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new Agency)
      };
      return this.$_select("agency", options) as any
    }
  

      
      get id(): $Field<"id", string | undefined>  {
       return this.$_select("id") as any
      }

      
      get createdAt(): $Field<"createdAt", string | undefined>  {
       return this.$_select("createdAt") as any
      }

      
      get updatedAt(): $Field<"updatedAt", string | undefined>  {
       return this.$_select("updatedAt") as any
      }

      
      get deletedAt(): $Field<"deletedAt", string | undefined>  {
       return this.$_select("deletedAt") as any
      }
}

  
export enum ECodeEntityType {
  
  ORDER = "ORDER",

  INVOICE = "INVOICE",

  DOCUMENT = "DOCUMENT"
}
  


export class PaginatedCodeConfig extends $Base<"PaginatedCodeConfig"> {
  constructor() {
    super("PaginatedCodeConfig")
  }

  
      
      edges<Sel extends Selection<CodeConfigEdge>>(selectorFn: (s: CodeConfigEdge) => [...Sel]):$Field<"edges", Array<GetOutput<Sel> | undefined> | undefined > {
      const options = {
        
        

        selection: selectorFn(new CodeConfigEdge)
      };
      return this.$_select("edges", options) as any
    }
  

      
      pageInfo<Sel extends Selection<PageInfo>>(selectorFn: (s: PageInfo) => [...Sel]):$Field<"pageInfo", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new PageInfo)
      };
      return this.$_select("pageInfo", options) as any
    }
  
}


export class CodeConfigEdge extends $Base<"CodeConfigEdge"> {
  constructor() {
    super("CodeConfigEdge")
  }

  
      
      node<Sel extends Selection<CodeConfig>>(selectorFn: (s: CodeConfig) => [...Sel]):$Field<"node", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new CodeConfig)
      };
      return this.$_select("node", options) as any
    }
  

      
      get cursor(): $Field<"cursor", string | undefined>  {
       return this.$_select("cursor") as any
      }
}


export class PaginatedAgencyAccount extends $Base<"PaginatedAgencyAccount"> {
  constructor() {
    super("PaginatedAgencyAccount")
  }

  
      
      edges<Sel extends Selection<AgencyAccountEdge>>(selectorFn: (s: AgencyAccountEdge) => [...Sel]):$Field<"edges", Array<GetOutput<Sel> | undefined> | undefined > {
      const options = {
        
        

        selection: selectorFn(new AgencyAccountEdge)
      };
      return this.$_select("edges", options) as any
    }
  

      
      pageInfo<Sel extends Selection<PageInfo>>(selectorFn: (s: PageInfo) => [...Sel]):$Field<"pageInfo", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new PageInfo)
      };
      return this.$_select("pageInfo", options) as any
    }
  
}


export class AgencyAccountEdge extends $Base<"AgencyAccountEdge"> {
  constructor() {
    super("AgencyAccountEdge")
  }

  
      
      node<Sel extends Selection<AgencyAccount>>(selectorFn: (s: AgencyAccount) => [...Sel]):$Field<"node", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new AgencyAccount)
      };
      return this.$_select("node", options) as any
    }
  

      
      get cursor(): $Field<"cursor", string | undefined>  {
       return this.$_select("cursor") as any
      }
}


export class AgencyAccountLoginData extends $Base<"AgencyAccountLoginData"> {
  constructor() {
    super("AgencyAccountLoginData")
  }

  
      
      agencyAccount<Sel extends Selection<AgencyAccount>>(selectorFn: (s: AgencyAccount) => [...Sel]):$Field<"agencyAccount", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new AgencyAccount)
      };
      return this.$_select("agencyAccount", options) as any
    }
  

      
      get token(): $Field<"token", string | undefined>  {
       return this.$_select("token") as any
      }

      
      agency<Sel extends Selection<Agency>>(selectorFn: (s: Agency) => [...Sel]):$Field<"agency", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new Agency)
      };
      return this.$_select("agency", options) as any
    }
  

      
      get roles(): $Field<"roles", Array<ERole | undefined> | undefined>  {
       return this.$_select("roles") as any
      }
}


export class PaginatedActivityLog extends $Base<"PaginatedActivityLog"> {
  constructor() {
    super("PaginatedActivityLog")
  }

  
      
      edges<Sel extends Selection<ActivityLogEdge>>(selectorFn: (s: ActivityLogEdge) => [...Sel]):$Field<"edges", Array<GetOutput<Sel> | undefined> | undefined > {
      const options = {
        
        

        selection: selectorFn(new ActivityLogEdge)
      };
      return this.$_select("edges", options) as any
    }
  

      
      pageInfo<Sel extends Selection<PageInfo>>(selectorFn: (s: PageInfo) => [...Sel]):$Field<"pageInfo", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new PageInfo)
      };
      return this.$_select("pageInfo", options) as any
    }
  
}


export class ActivityLogEdge extends $Base<"ActivityLogEdge"> {
  constructor() {
    super("ActivityLogEdge")
  }

  
      
      node<Sel extends Selection<ActivityLog>>(selectorFn: (s: ActivityLog) => [...Sel]):$Field<"node", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new ActivityLog)
      };
      return this.$_select("node", options) as any
    }
  

      
      get cursor(): $Field<"cursor", string | undefined>  {
       return this.$_select("cursor") as any
      }
}


export class ActivityLog extends $Base<"ActivityLog"> {
  constructor() {
    super("ActivityLog")
  }

  
      
      get actorType(): $Field<"actorType", EActivityActorType | undefined>  {
       return this.$_select("actorType") as any
      }

      
      get actorAccountId(): $Field<"actorAccountId", string | undefined>  {
       return this.$_select("actorAccountId") as any
      }

      
      get actorName(): $Field<"actorName", string | undefined>  {
       return this.$_select("actorName") as any
      }

      
      get action(): $Field<"action", string | undefined>  {
       return this.$_select("action") as any
      }

      
      get entityType(): $Field<"entityType", string | undefined>  {
       return this.$_select("entityType") as any
      }

      
      get entityId(): $Field<"entityId", string | undefined>  {
       return this.$_select("entityId") as any
      }

      
      get summary(): $Field<"summary", string | undefined>  {
       return this.$_select("summary") as any
      }

      
      get payload(): $Field<"payload", string | undefined>  {
       return this.$_select("payload") as any
      }

      
      get relatedEntityType(): $Field<"relatedEntityType", string | undefined>  {
       return this.$_select("relatedEntityType") as any
      }

      
      get relatedEntityId(): $Field<"relatedEntityId", string | undefined>  {
       return this.$_select("relatedEntityId") as any
      }

      
      get ipAddress(): $Field<"ipAddress", string | undefined>  {
       return this.$_select("ipAddress") as any
      }

      
      get tenantId(): $Field<"tenantId", string | undefined>  {
       return this.$_select("tenantId") as any
      }

      
      tenant<Sel extends Selection<Tenant>>(selectorFn: (s: Tenant) => [...Sel]):$Field<"tenant", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new Tenant)
      };
      return this.$_select("tenant", options) as any
    }
  

      
      get createdByTenantAccountId(): $Field<"createdByTenantAccountId", string | undefined>  {
       return this.$_select("createdByTenantAccountId") as any
      }

      
      createdByTenantAccount<Sel extends Selection<TenantAccount>>(selectorFn: (s: TenantAccount) => [...Sel]):$Field<"createdByTenantAccount", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new TenantAccount)
      };
      return this.$_select("createdByTenantAccount", options) as any
    }
  

      
      get agencyId(): $Field<"agencyId", string | undefined>  {
       return this.$_select("agencyId") as any
      }

      
      agency<Sel extends Selection<Agency>>(selectorFn: (s: Agency) => [...Sel]):$Field<"agency", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new Agency)
      };
      return this.$_select("agency", options) as any
    }
  

      
      get id(): $Field<"id", string | undefined>  {
       return this.$_select("id") as any
      }

      
      get createdAt(): $Field<"createdAt", string | undefined>  {
       return this.$_select("createdAt") as any
      }

      
      get updatedAt(): $Field<"updatedAt", string | undefined>  {
       return this.$_select("updatedAt") as any
      }

      
      get deletedAt(): $Field<"deletedAt", string | undefined>  {
       return this.$_select("deletedAt") as any
      }
}

  
export enum EActivityActorType {
  
  TENANT_ACCOUNT = "TENANT_ACCOUNT",

  AGENCY_ACCOUNT = "AGENCY_ACCOUNT",

  ADMIN = "ADMIN",

  SYSTEM = "SYSTEM"
}
  


export class AccountPermissionSummary extends $Base<"AccountPermissionSummary"> {
  constructor() {
    super("AccountPermissionSummary")
  }

  
      
      get tenantAccountId(): $Field<"tenantAccountId", string | undefined>  {
       return this.$_select("tenantAccountId") as any
      }

      
      permissions<Sel extends Selection<AccountPermissionEntry>>(selectorFn: (s: AccountPermissionEntry) => [...Sel]):$Field<"permissions", Array<GetOutput<Sel> | undefined> | undefined > {
      const options = {
        
        

        selection: selectorFn(new AccountPermissionEntry)
      };
      return this.$_select("permissions", options) as any
    }
  
}


export class AccountPermissionEntry extends $Base<"AccountPermissionEntry"> {
  constructor() {
    super("AccountPermissionEntry")
  }

  
      
      get permission(): $Field<"permission", EPermission | undefined>  {
       return this.$_select("permission") as any
      }

      
      scopeRule<Sel extends Selection<ScopeRule>>(selectorFn: (s: ScopeRule) => [...Sel]):$Field<"scopeRule", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new ScopeRule)
      };
      return this.$_select("scopeRule", options) as any
    }
  
}

  
export enum EPermission {
  
  DASHBOARD_VIEW = "DASHBOARD_VIEW",

  AGENCY_VIEW = "AGENCY_VIEW",

  AGENCY_CREATE = "AGENCY_CREATE",

  AGENCY_UPDATE = "AGENCY_UPDATE",

  AGENCY_DELETE = "AGENCY_DELETE",

  TENANT_VIEW = "TENANT_VIEW",

  TENANT_CREATE = "TENANT_CREATE",

  TENANT_UPDATE = "TENANT_UPDATE",

  TENANT_DELETE = "TENANT_DELETE",

  TENANT_PROFILE_MANAGE = "TENANT_PROFILE_MANAGE",

  STAFF_VIEW = "STAFF_VIEW",

  STAFF_CREATE = "STAFF_CREATE",

  STAFF_UPDATE = "STAFF_UPDATE",

  STAFF_DELETE = "STAFF_DELETE",

  ACCOUNT_PERMISSION_MANAGE = "ACCOUNT_PERMISSION_MANAGE",

  MEDIA_MANAGE = "MEDIA_MANAGE",

  CODE_CONFIG_VIEW = "CODE_CONFIG_VIEW",

  CODE_CONFIG_MANAGE = "CODE_CONFIG_MANAGE",

  UNIT_MANAGE = "UNIT_MANAGE",

  EMAIL_CONFIG_MANAGE = "EMAIL_CONFIG_MANAGE",

  ACTIVITY_LOG_VIEW = "ACTIVITY_LOG_VIEW",

  PAGE_VIEW = "PAGE_VIEW",

  PAGE_CREATE = "PAGE_CREATE",

  PAGE_UPDATE = "PAGE_UPDATE",

  PAGE_DELETE = "PAGE_DELETE",

  PAGE_PUBLISH = "PAGE_PUBLISH",

  SECTION_MANAGE = "SECTION_MANAGE",

  CONTENT_TYPE_MANAGE = "CONTENT_TYPE_MANAGE",

  CONTENT_ENTRY_VIEW = "CONTENT_ENTRY_VIEW",

  CONTENT_ENTRY_CREATE = "CONTENT_ENTRY_CREATE",

  CONTENT_ENTRY_UPDATE = "CONTENT_ENTRY_UPDATE",

  CONTENT_ENTRY_DELETE = "CONTENT_ENTRY_DELETE",

  REDIRECT_MANAGE = "REDIRECT_MANAGE",

  MENU_MANAGE = "MENU_MANAGE"
}
  


export class ScopeRule extends $Base<"ScopeRule"> {
  constructor() {
    super("ScopeRule")
  }

  
      
      get type(): $Field<"type", EScopeRuleType | undefined>  {
       return this.$_select("type") as any
      }

      
      get field(): $Field<"field", string | undefined>  {
       return this.$_select("field") as any
      }

      
      get ids(): $Field<"ids", Array<string | undefined> | undefined>  {
       return this.$_select("ids") as any
      }

      
      rules<Sel extends Selection<ScopeRule>>(selectorFn: (s: ScopeRule) => [...Sel]):$Field<"rules", Array<GetOutput<Sel> | undefined> | undefined > {
      const options = {
        
        

        selection: selectorFn(new ScopeRule)
      };
      return this.$_select("rules", options) as any
    }
  
}

  
export enum EScopeRuleType {
  
  ALLOW_ALL = "ALLOW_ALL",

  DENY_ALL = "DENY_ALL",

  INCLUDE = "INCLUDE",

  EXCLUDE = "EXCLUDE",

  SELF = "SELF",

  OR = "OR",

  AND = "AND"
}
  


export class PermissionGroup extends $Base<"PermissionGroup"> {
  constructor() {
    super("PermissionGroup")
  }

  
      
      get key(): $Field<"key", string | undefined>  {
       return this.$_select("key") as any
      }

      
      get label(): $Field<"label", string | undefined>  {
       return this.$_select("label") as any
      }

      
      get description(): $Field<"description", string | undefined>  {
       return this.$_select("description") as any
      }

      
      permissions<Sel extends Selection<PermissionItem>>(selectorFn: (s: PermissionItem) => [...Sel]):$Field<"permissions", Array<GetOutput<Sel> | undefined> | undefined > {
      const options = {
        
        

        selection: selectorFn(new PermissionItem)
      };
      return this.$_select("permissions", options) as any
    }
  
}


export class PermissionItem extends $Base<"PermissionItem"> {
  constructor() {
    super("PermissionItem")
  }

  
      
      get value(): $Field<"value", string | undefined>  {
       return this.$_select("value") as any
      }

      
      get label(): $Field<"label", string | undefined>  {
       return this.$_select("label") as any
      }

      
      get resourceGroup(): $Field<"resourceGroup", string | undefined>  {
       return this.$_select("resourceGroup") as any
      }

      
      meta<Sel extends Selection<PermissionItemMeta>>(selectorFn: (s: PermissionItemMeta) => [...Sel]):$Field<"meta", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new PermissionItemMeta)
      };
      return this.$_select("meta", options) as any
    }
  
}


export class PermissionItemMeta extends $Base<"PermissionItemMeta"> {
  constructor() {
    super("PermissionItemMeta")
  }

  
      
      get byId(): $Field<"byId", string | undefined>  {
       return this.$_select("byId") as any
      }

      
      get byParentField(): $Field<"byParentField", string | undefined>  {
       return this.$_select("byParentField") as any
      }

      
      get byParentLabel(): $Field<"byParentLabel", string | undefined>  {
       return this.$_select("byParentLabel") as any
      }

      
      get bySelf(): $Field<"bySelf", string | undefined>  {
       return this.$_select("bySelf") as any
      }
}


export class GrantableResourceResult extends $Base<"GrantableResourceResult"> {
  constructor() {
    super("GrantableResourceResult")
  }

  
      
      items<Sel extends Selection<GrantableResourceItem>>(selectorFn: (s: GrantableResourceItem) => [...Sel]):$Field<"items", Array<GetOutput<Sel> | undefined> | undefined > {
      const options = {
        
        

        selection: selectorFn(new GrantableResourceItem)
      };
      return this.$_select("items", options) as any
    }
  

      
      get total(): $Field<"total", number | undefined>  {
       return this.$_select("total") as any
      }

      
      get bounded(): $Field<"bounded", boolean | undefined>  {
       return this.$_select("bounded") as any
      }
}


export class GrantableResourceItem extends $Base<"GrantableResourceItem"> {
  constructor() {
    super("GrantableResourceItem")
  }

  
      
      get id(): $Field<"id", string | undefined>  {
       return this.$_select("id") as any
      }

      
      get name(): $Field<"name", string | undefined>  {
       return this.$_select("name") as any
      }

      
      get code(): $Field<"code", string | undefined>  {
       return this.$_select("code") as any
      }

      
      get parentId(): $Field<"parentId", string | undefined>  {
       return this.$_select("parentId") as any
      }
}


export type GrantableResourceInput = {
  resourceGroup?: string | undefined,
search?: string | undefined,
ids?: Array<string | undefined> | undefined,
limit?: number | undefined
}
    


export class Mutation extends $Base<"Mutation"> {
  constructor() {
    super("Mutation")
  }

  
      
      createUnit<Args extends VariabledInput<{
        data?: CreateUnitInput | undefined,
      }>,Sel extends Selection<Unit>>(args: Args, selectorFn: (s: Unit) => [...Sel]):$Field<"createUnit", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              data: "CreateUnitInput"
            },
        args,

        selection: selectorFn(new Unit)
      };
      return this.$_select("createUnit", options) as any
    }
  

      
      updateUnit<Args extends VariabledInput<{
        id?: string | undefined
data?: UpdateUnitInput | undefined,
      }>,Sel extends Selection<Unit>>(args: Args, selectorFn: (s: Unit) => [...Sel]):$Field<"updateUnit", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              id: "String",
data: "UpdateUnitInput"
            },
        args,

        selection: selectorFn(new Unit)
      };
      return this.$_select("updateUnit", options) as any
    }
  

      
      deleteUnit<Args extends VariabledInput<{
        id?: string | undefined,
      }>>(args: Args):$Field<"deleteUnit", boolean | undefined , GetVariables<[], Args>> {
      const options = {
        argTypes: {
              id: "String"
            },
        args,

        
      };
      return this.$_select("deleteUnit", options) as any
    }
  

      
      seedDefaultUnits<Sel extends Selection<Unit>>(selectorFn: (s: Unit) => [...Sel]):$Field<"seedDefaultUnits", Array<GetOutput<Sel> | undefined> | undefined > {
      const options = {
        
        

        selection: selectorFn(new Unit)
      };
      return this.$_select("seedDefaultUnits", options) as any
    }
  

      
      createSection<Args extends VariabledInput<{
        data?: CreateSectionInput | undefined,
      }>,Sel extends Selection<Section>>(args: Args, selectorFn: (s: Section) => [...Sel]):$Field<"createSection", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              data: "CreateSectionInput"
            },
        args,

        selection: selectorFn(new Section)
      };
      return this.$_select("createSection", options) as any
    }
  

      
      updateSection<Args extends VariabledInput<{
        id?: string | undefined
data?: UpdateSectionInput | undefined,
      }>,Sel extends Selection<Section>>(args: Args, selectorFn: (s: Section) => [...Sel]):$Field<"updateSection", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              id: "String",
data: "UpdateSectionInput"
            },
        args,

        selection: selectorFn(new Section)
      };
      return this.$_select("updateSection", options) as any
    }
  

      
      deleteSection<Args extends VariabledInput<{
        id?: string | undefined,
      }>>(args: Args):$Field<"deleteSection", boolean | undefined , GetVariables<[], Args>> {
      const options = {
        argTypes: {
              id: "String"
            },
        args,

        
      };
      return this.$_select("deleteSection", options) as any
    }
  

      
      duplicateSection<Args extends VariabledInput<{
        id?: string | undefined,
      }>,Sel extends Selection<Section>>(args: Args, selectorFn: (s: Section) => [...Sel]):$Field<"duplicateSection", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              id: "String"
            },
        args,

        selection: selectorFn(new Section)
      };
      return this.$_select("duplicateSection", options) as any
    }
  

      
      reorderSections<Args extends VariabledInput<{
        items?: Array<ReorderSectionItemInput | undefined> | undefined,
      }>>(args: Args):$Field<"reorderSections", boolean | undefined , GetVariables<[], Args>> {
      const options = {
        argTypes: {
              items: "[ReorderSectionItemInput]"
            },
        args,

        
      };
      return this.$_select("reorderSections", options) as any
    }
  

      
      createTenantAccount<Args extends VariabledInput<{
        data?: CreateTenantAccountInput | undefined,
      }>,Sel extends Selection<TenantAccount>>(args: Args, selectorFn: (s: TenantAccount) => [...Sel]):$Field<"createTenantAccount", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              data: "CreateTenantAccountInput"
            },
        args,

        selection: selectorFn(new TenantAccount)
      };
      return this.$_select("createTenantAccount", options) as any
    }
  

      
      updateTenantAccount<Args extends VariabledInput<{
        id?: string | undefined
data?: UpdateTenantAccountInput | undefined,
      }>,Sel extends Selection<TenantAccount>>(args: Args, selectorFn: (s: TenantAccount) => [...Sel]):$Field<"updateTenantAccount", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              id: "String",
data: "UpdateTenantAccountInput"
            },
        args,

        selection: selectorFn(new TenantAccount)
      };
      return this.$_select("updateTenantAccount", options) as any
    }
  

      
      deleteTenantAccount<Args extends VariabledInput<{
        id?: string | undefined,
      }>>(args: Args):$Field<"deleteTenantAccount", string | undefined , GetVariables<[], Args>> {
      const options = {
        argTypes: {
              id: "String"
            },
        args,

        
      };
      return this.$_select("deleteTenantAccount", options) as any
    }
  

      
      loginTenantAccount<Args extends VariabledInput<{
        data?: LoginInput | undefined,
      }>,Sel extends Selection<TenantAccountLogin>>(args: Args, selectorFn: (s: TenantAccountLogin) => [...Sel]):$Field<"loginTenantAccount", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              data: "LoginInput"
            },
        args,

        selection: selectorFn(new TenantAccountLogin)
      };
      return this.$_select("loginTenantAccount", options) as any
    }
  

      
      tenantAccountChangePassword<Args extends VariabledInput<{
        input?: ChangePasswordInput | undefined,
      }>>(args: Args):$Field<"tenantAccountChangePassword", string | undefined , GetVariables<[], Args>> {
      const options = {
        argTypes: {
              input: "ChangePasswordInput"
            },
        args,

        
      };
      return this.$_select("tenantAccountChangePassword", options) as any
    }
  

      
      createTenant<Args extends VariabledInput<{
        data?: CreateTenantInput | undefined,
      }>,Sel extends Selection<Tenant>>(args: Args, selectorFn: (s: Tenant) => [...Sel]):$Field<"createTenant", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              data: "CreateTenantInput"
            },
        args,

        selection: selectorFn(new Tenant)
      };
      return this.$_select("createTenant", options) as any
    }
  

      
      updateTenant<Args extends VariabledInput<{
        id?: string | undefined
data?: UpdateTenantInput | undefined,
      }>,Sel extends Selection<Tenant>>(args: Args, selectorFn: (s: Tenant) => [...Sel]):$Field<"updateTenant", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              id: "String",
data: "UpdateTenantInput"
            },
        args,

        selection: selectorFn(new Tenant)
      };
      return this.$_select("updateTenant", options) as any
    }
  

      
      deleteTenant<Args extends VariabledInput<{
        id?: string | undefined,
      }>>(args: Args):$Field<"deleteTenant", string | undefined , GetVariables<[], Args>> {
      const options = {
        argTypes: {
              id: "String"
            },
        args,

        
      };
      return this.$_select("deleteTenant", options) as any
    }
  

      
      createMerchant<Args extends VariabledInput<{
        data?: CreateMerchantInput | undefined,
      }>,Sel extends Selection<Merchant>>(args: Args, selectorFn: (s: Merchant) => [...Sel]):$Field<"createMerchant", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              data: "CreateMerchantInput"
            },
        args,

        selection: selectorFn(new Merchant)
      };
      return this.$_select("createMerchant", options) as any
    }
  

      
      updateMerchant<Args extends VariabledInput<{
        id?: string | undefined
data?: UpdateMerchantInput | undefined,
      }>,Sel extends Selection<Merchant>>(args: Args, selectorFn: (s: Merchant) => [...Sel]):$Field<"updateMerchant", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              id: "String",
data: "UpdateMerchantInput"
            },
        args,

        selection: selectorFn(new Merchant)
      };
      return this.$_select("updateMerchant", options) as any
    }
  

      
      registerMerchant<Args extends VariabledInput<{
        input?: RegisterMerchantInput | undefined,
      }>,Sel extends Selection<MerchantLogin>>(args: Args, selectorFn: (s: MerchantLogin) => [...Sel]):$Field<"registerMerchant", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              input: "RegisterMerchantInput"
            },
        args,

        selection: selectorFn(new MerchantLogin)
      };
      return this.$_select("registerMerchant", options) as any
    }
  

      
      merchantLogin<Args extends VariabledInput<{
        input?: MerchantLoginInput | undefined,
      }>,Sel extends Selection<MerchantLogin>>(args: Args, selectorFn: (s: MerchantLogin) => [...Sel]):$Field<"merchantLogin", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              input: "MerchantLoginInput"
            },
        args,

        selection: selectorFn(new MerchantLogin)
      };
      return this.$_select("merchantLogin", options) as any
    }
  

      
      switchToAgency<Args extends VariabledInput<{
        input?: SwitchAgencyInput | undefined,
      }>,Sel extends Selection<AgencyAccountLoginData>>(args: Args, selectorFn: (s: AgencyAccountLoginData) => [...Sel]):$Field<"switchToAgency", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              input: "SwitchAgencyInput"
            },
        args,

        selection: selectorFn(new AgencyAccountLoginData)
      };
      return this.$_select("switchToAgency", options) as any
    }
  

      
      switchToTenant<Args extends VariabledInput<{
        input?: SwitchTenantInput | undefined,
      }>,Sel extends Selection<TenantAccountLogin>>(args: Args, selectorFn: (s: TenantAccountLogin) => [...Sel]):$Field<"switchToTenant", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              input: "SwitchTenantInput"
            },
        args,

        selection: selectorFn(new TenantAccountLogin)
      };
      return this.$_select("switchToTenant", options) as any
    }
  

      
      merchantChangePassword<Args extends VariabledInput<{
        input?: ChangePasswordInput | undefined,
      }>>(args: Args):$Field<"merchantChangePassword", string | undefined , GetVariables<[], Args>> {
      const options = {
        argTypes: {
              input: "ChangePasswordInput"
            },
        args,

        
      };
      return this.$_select("merchantChangePassword", options) as any
    }
  

      
      merchantForgotPassword<Args extends VariabledInput<{
        input?: ForgotPasswordInput | undefined,
      }>>(args: Args):$Field<"merchantForgotPassword", string | undefined , GetVariables<[], Args>> {
      const options = {
        argTypes: {
              input: "ForgotPasswordInput"
            },
        args,

        
      };
      return this.$_select("merchantForgotPassword", options) as any
    }
  

      
      merchantResetPassword<Args extends VariabledInput<{
        input?: ForgotPasswordResetInput | undefined,
      }>>(args: Args):$Field<"merchantResetPassword", string | undefined , GetVariables<[], Args>> {
      const options = {
        argTypes: {
              input: "ForgotPasswordResetInput"
            },
        args,

        
      };
      return this.$_select("merchantResetPassword", options) as any
    }
  

      
      createRedirect<Args extends VariabledInput<{
        data?: CreateRedirectInput | undefined,
      }>,Sel extends Selection<Redirect>>(args: Args, selectorFn: (s: Redirect) => [...Sel]):$Field<"createRedirect", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              data: "CreateRedirectInput"
            },
        args,

        selection: selectorFn(new Redirect)
      };
      return this.$_select("createRedirect", options) as any
    }
  

      
      updateRedirect<Args extends VariabledInput<{
        id?: string | undefined
data?: UpdateRedirectInput | undefined,
      }>,Sel extends Selection<Redirect>>(args: Args, selectorFn: (s: Redirect) => [...Sel]):$Field<"updateRedirect", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              id: "String",
data: "UpdateRedirectInput"
            },
        args,

        selection: selectorFn(new Redirect)
      };
      return this.$_select("updateRedirect", options) as any
    }
  

      
      deleteRedirect<Args extends VariabledInput<{
        id?: string | undefined,
      }>>(args: Args):$Field<"deleteRedirect", boolean | undefined , GetVariables<[], Args>> {
      const options = {
        argTypes: {
              id: "String"
            },
        args,

        
      };
      return this.$_select("deleteRedirect", options) as any
    }
  

      
      createPage<Args extends VariabledInput<{
        data?: CreatePageInput | undefined,
      }>,Sel extends Selection<Page>>(args: Args, selectorFn: (s: Page) => [...Sel]):$Field<"createPage", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              data: "CreatePageInput"
            },
        args,

        selection: selectorFn(new Page)
      };
      return this.$_select("createPage", options) as any
    }
  

      
      updatePage<Args extends VariabledInput<{
        id?: string | undefined
data?: UpdatePageInput | undefined,
      }>,Sel extends Selection<Page>>(args: Args, selectorFn: (s: Page) => [...Sel]):$Field<"updatePage", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              id: "String",
data: "UpdatePageInput"
            },
        args,

        selection: selectorFn(new Page)
      };
      return this.$_select("updatePage", options) as any
    }
  

      
      deletePage<Args extends VariabledInput<{
        id?: string | undefined,
      }>>(args: Args):$Field<"deletePage", boolean | undefined , GetVariables<[], Args>> {
      const options = {
        argTypes: {
              id: "String"
            },
        args,

        
      };
      return this.$_select("deletePage", options) as any
    }
  

      
      publishPage<Args extends VariabledInput<{
        id?: string | undefined
label?: string | undefined,
      }>,Sel extends Selection<Page>>(args: Args, selectorFn: (s: Page) => [...Sel]):$Field<"publishPage", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              id: "String",
label: "String"
            },
        args,

        selection: selectorFn(new Page)
      };
      return this.$_select("publishPage", options) as any
    }
  

      
      unpublishPage<Args extends VariabledInput<{
        id?: string | undefined,
      }>,Sel extends Selection<Page>>(args: Args, selectorFn: (s: Page) => [...Sel]):$Field<"unpublishPage", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              id: "String"
            },
        args,

        selection: selectorFn(new Page)
      };
      return this.$_select("unpublishPage", options) as any
    }
  

      
      createMedia<Args extends VariabledInput<{
        input?: CreateMediaInput | undefined,
      }>,Sel extends Selection<Media>>(args: Args, selectorFn: (s: Media) => [...Sel]):$Field<"createMedia", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              input: "CreateMediaInput"
            },
        args,

        selection: selectorFn(new Media)
      };
      return this.$_select("createMedia", options) as any
    }
  

      
      updateMedia<Args extends VariabledInput<{
        id?: string | undefined
input?: UpdateMediaInput | undefined,
      }>,Sel extends Selection<Media>>(args: Args, selectorFn: (s: Media) => [...Sel]):$Field<"updateMedia", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              id: "String",
input: "UpdateMediaInput"
            },
        args,

        selection: selectorFn(new Media)
      };
      return this.$_select("updateMedia", options) as any
    }
  

      
      generatePresignedUrl<Args extends VariabledInput<{
        input?: GeneratePresignedUrlInput | undefined,
      }>,Sel extends Selection<PresignedUrlResponse>>(args: Args, selectorFn: (s: PresignedUrlResponse) => [...Sel]):$Field<"generatePresignedUrl", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              input: "GeneratePresignedUrlInput"
            },
        args,

        selection: selectorFn(new PresignedUrlResponse)
      };
      return this.$_select("generatePresignedUrl", options) as any
    }
  

      
      createMediaSet<Args extends VariabledInput<{
        data?: CreateMediaSetInput | undefined,
      }>,Sel extends Selection<MediaSet>>(args: Args, selectorFn: (s: MediaSet) => [...Sel]):$Field<"createMediaSet", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              data: "CreateMediaSetInput"
            },
        args,

        selection: selectorFn(new MediaSet)
      };
      return this.$_select("createMediaSet", options) as any
    }
  

      
      updateMediaSet<Args extends VariabledInput<{
        id?: string | undefined
data?: UpdateMediaSetInput | undefined,
      }>,Sel extends Selection<MediaSet>>(args: Args, selectorFn: (s: MediaSet) => [...Sel]):$Field<"updateMediaSet", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              id: "String",
data: "UpdateMediaSetInput"
            },
        args,

        selection: selectorFn(new MediaSet)
      };
      return this.$_select("updateMediaSet", options) as any
    }
  

      
      deleteMediaSet<Args extends VariabledInput<{
        id?: string | undefined,
      }>>(args: Args):$Field<"deleteMediaSet", string | undefined , GetVariables<[], Args>> {
      const options = {
        argTypes: {
              id: "String"
            },
        args,

        
      };
      return this.$_select("deleteMediaSet", options) as any
    }
  

      
      createHeaderPreset<Args extends VariabledInput<{
        data?: CreateHeaderPresetInput | undefined,
      }>,Sel extends Selection<HeaderPreset>>(args: Args, selectorFn: (s: HeaderPreset) => [...Sel]):$Field<"createHeaderPreset", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              data: "CreateHeaderPresetInput"
            },
        args,

        selection: selectorFn(new HeaderPreset)
      };
      return this.$_select("createHeaderPreset", options) as any
    }
  

      
      updateHeaderPreset<Args extends VariabledInput<{
        id?: string | undefined
data?: UpdateHeaderPresetInput | undefined,
      }>,Sel extends Selection<HeaderPreset>>(args: Args, selectorFn: (s: HeaderPreset) => [...Sel]):$Field<"updateHeaderPreset", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              id: "String",
data: "UpdateHeaderPresetInput"
            },
        args,

        selection: selectorFn(new HeaderPreset)
      };
      return this.$_select("updateHeaderPreset", options) as any
    }
  

      
      deleteHeaderPreset<Args extends VariabledInput<{
        id?: string | undefined,
      }>>(args: Args):$Field<"deleteHeaderPreset", boolean | undefined , GetVariables<[], Args>> {
      const options = {
        argTypes: {
              id: "String"
            },
        args,

        
      };
      return this.$_select("deleteHeaderPreset", options) as any
    }
  

      
      setDefaultHeaderPreset<Args extends VariabledInput<{
        id?: string | undefined,
      }>,Sel extends Selection<HeaderPreset>>(args: Args, selectorFn: (s: HeaderPreset) => [...Sel]):$Field<"setDefaultHeaderPreset", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              id: "String"
            },
        args,

        selection: selectorFn(new HeaderPreset)
      };
      return this.$_select("setDefaultHeaderPreset", options) as any
    }
  

      
      createEmailConfig<Args extends VariabledInput<{
        data?: CreateEmailConfigInput | undefined,
      }>,Sel extends Selection<EmailConfig>>(args: Args, selectorFn: (s: EmailConfig) => [...Sel]):$Field<"createEmailConfig", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              data: "CreateEmailConfigInput"
            },
        args,

        selection: selectorFn(new EmailConfig)
      };
      return this.$_select("createEmailConfig", options) as any
    }
  

      
      updateEmailConfig<Args extends VariabledInput<{
        id?: string | undefined
data?: UpdateEmailConfigInput | undefined,
      }>,Sel extends Selection<EmailConfig>>(args: Args, selectorFn: (s: EmailConfig) => [...Sel]):$Field<"updateEmailConfig", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              id: "String",
data: "UpdateEmailConfigInput"
            },
        args,

        selection: selectorFn(new EmailConfig)
      };
      return this.$_select("updateEmailConfig", options) as any
    }
  

      
      deleteEmailConfig<Args extends VariabledInput<{
        id?: string | undefined,
      }>>(args: Args):$Field<"deleteEmailConfig", string | undefined , GetVariables<[], Args>> {
      const options = {
        argTypes: {
              id: "String"
            },
        args,

        
      };
      return this.$_select("deleteEmailConfig", options) as any
    }
  

      
      testEmailConfig<Args extends VariabledInput<{
        id?: string | undefined
to?: string | undefined,
      }>>(args: Args):$Field<"testEmailConfig", string | undefined , GetVariables<[], Args>> {
      const options = {
        argTypes: {
              id: "String",
to: "String"
            },
        args,

        
      };
      return this.$_select("testEmailConfig", options) as any
    }
  

      
      createContentType<Args extends VariabledInput<{
        data?: CreateContentTypeInput | undefined,
      }>,Sel extends Selection<ContentType>>(args: Args, selectorFn: (s: ContentType) => [...Sel]):$Field<"createContentType", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              data: "CreateContentTypeInput"
            },
        args,

        selection: selectorFn(new ContentType)
      };
      return this.$_select("createContentType", options) as any
    }
  

      
      updateContentType<Args extends VariabledInput<{
        id?: string | undefined
data?: UpdateContentTypeInput | undefined,
      }>,Sel extends Selection<ContentType>>(args: Args, selectorFn: (s: ContentType) => [...Sel]):$Field<"updateContentType", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              id: "String",
data: "UpdateContentTypeInput"
            },
        args,

        selection: selectorFn(new ContentType)
      };
      return this.$_select("updateContentType", options) as any
    }
  

      
      deleteContentType<Args extends VariabledInput<{
        id?: string | undefined,
      }>>(args: Args):$Field<"deleteContentType", boolean | undefined , GetVariables<[], Args>> {
      const options = {
        argTypes: {
              id: "String"
            },
        args,

        
      };
      return this.$_select("deleteContentType", options) as any
    }
  

      
      createCustomer<Args extends VariabledInput<{
        data?: CreateCustomerInput | undefined,
      }>,Sel extends Selection<Customer>>(args: Args, selectorFn: (s: Customer) => [...Sel]):$Field<"createCustomer", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              data: "CreateCustomerInput"
            },
        args,

        selection: selectorFn(new Customer)
      };
      return this.$_select("createCustomer", options) as any
    }
  

      
      updateCustomer<Args extends VariabledInput<{
        id?: string | undefined
data?: UpdateCustomerInput | undefined,
      }>,Sel extends Selection<Customer>>(args: Args, selectorFn: (s: Customer) => [...Sel]):$Field<"updateCustomer", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              id: "String",
data: "UpdateCustomerInput"
            },
        args,

        selection: selectorFn(new Customer)
      };
      return this.$_select("updateCustomer", options) as any
    }
  

      
      deleteCustomer<Args extends VariabledInput<{
        id?: string | undefined,
      }>>(args: Args):$Field<"deleteCustomer", string | undefined , GetVariables<[], Args>> {
      const options = {
        argTypes: {
              id: "String"
            },
        args,

        
      };
      return this.$_select("deleteCustomer", options) as any
    }
  

      
      createFooterPreset<Args extends VariabledInput<{
        data?: CreateFooterPresetInput | undefined,
      }>,Sel extends Selection<FooterPreset>>(args: Args, selectorFn: (s: FooterPreset) => [...Sel]):$Field<"createFooterPreset", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              data: "CreateFooterPresetInput"
            },
        args,

        selection: selectorFn(new FooterPreset)
      };
      return this.$_select("createFooterPreset", options) as any
    }
  

      
      updateFooterPreset<Args extends VariabledInput<{
        id?: string | undefined
data?: UpdateFooterPresetInput | undefined,
      }>,Sel extends Selection<FooterPreset>>(args: Args, selectorFn: (s: FooterPreset) => [...Sel]):$Field<"updateFooterPreset", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              id: "String",
data: "UpdateFooterPresetInput"
            },
        args,

        selection: selectorFn(new FooterPreset)
      };
      return this.$_select("updateFooterPreset", options) as any
    }
  

      
      deleteFooterPreset<Args extends VariabledInput<{
        id?: string | undefined,
      }>>(args: Args):$Field<"deleteFooterPreset", boolean | undefined , GetVariables<[], Args>> {
      const options = {
        argTypes: {
              id: "String"
            },
        args,

        
      };
      return this.$_select("deleteFooterPreset", options) as any
    }
  

      
      setDefaultFooterPreset<Args extends VariabledInput<{
        id?: string | undefined,
      }>,Sel extends Selection<FooterPreset>>(args: Args, selectorFn: (s: FooterPreset) => [...Sel]):$Field<"setDefaultFooterPreset", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              id: "String"
            },
        args,

        selection: selectorFn(new FooterPreset)
      };
      return this.$_select("setDefaultFooterPreset", options) as any
    }
  

      
      createContentEntry<Args extends VariabledInput<{
        data?: CreateContentEntryInput | undefined,
      }>,Sel extends Selection<ContentEntry>>(args: Args, selectorFn: (s: ContentEntry) => [...Sel]):$Field<"createContentEntry", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              data: "CreateContentEntryInput"
            },
        args,

        selection: selectorFn(new ContentEntry)
      };
      return this.$_select("createContentEntry", options) as any
    }
  

      
      updateContentEntry<Args extends VariabledInput<{
        id?: string | undefined
data?: UpdateContentEntryInput | undefined,
      }>,Sel extends Selection<ContentEntry>>(args: Args, selectorFn: (s: ContentEntry) => [...Sel]):$Field<"updateContentEntry", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              id: "String",
data: "UpdateContentEntryInput"
            },
        args,

        selection: selectorFn(new ContentEntry)
      };
      return this.$_select("updateContentEntry", options) as any
    }
  

      
      deleteContentEntry<Args extends VariabledInput<{
        id?: string | undefined,
      }>>(args: Args):$Field<"deleteContentEntry", boolean | undefined , GetVariables<[], Args>> {
      const options = {
        argTypes: {
              id: "String"
            },
        args,

        
      };
      return this.$_select("deleteContentEntry", options) as any
    }
  

      
      createAgency<Args extends VariabledInput<{
        data?: CreateAgencyInput | undefined,
      }>,Sel extends Selection<Agency>>(args: Args, selectorFn: (s: Agency) => [...Sel]):$Field<"createAgency", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              data: "CreateAgencyInput"
            },
        args,

        selection: selectorFn(new Agency)
      };
      return this.$_select("createAgency", options) as any
    }
  

      
      updateAgency<Args extends VariabledInput<{
        id?: string | undefined
data?: UpdateAgencyInput | undefined,
      }>,Sel extends Selection<Agency>>(args: Args, selectorFn: (s: Agency) => [...Sel]):$Field<"updateAgency", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              id: "String",
data: "UpdateAgencyInput"
            },
        args,

        selection: selectorFn(new Agency)
      };
      return this.$_select("updateAgency", options) as any
    }
  

      
      deleteAgency<Args extends VariabledInput<{
        id?: string | undefined,
      }>>(args: Args):$Field<"deleteAgency", string | undefined , GetVariables<[], Args>> {
      const options = {
        argTypes: {
              id: "String"
            },
        args,

        
      };
      return this.$_select("deleteAgency", options) as any
    }
  

      
      createAdmin<Args extends VariabledInput<{
        data?: CreateAdminInput | undefined,
      }>,Sel extends Selection<Admin>>(args: Args, selectorFn: (s: Admin) => [...Sel]):$Field<"createAdmin", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              data: "CreateAdminInput"
            },
        args,

        selection: selectorFn(new Admin)
      };
      return this.$_select("createAdmin", options) as any
    }
  

      
      updateAdmin<Args extends VariabledInput<{
        id?: string | undefined
data?: UpdateAdminInput | undefined,
      }>,Sel extends Selection<Admin>>(args: Args, selectorFn: (s: Admin) => [...Sel]):$Field<"updateAdmin", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              id: "String",
data: "UpdateAdminInput"
            },
        args,

        selection: selectorFn(new Admin)
      };
      return this.$_select("updateAdmin", options) as any
    }
  

      
      deleteAdmin<Args extends VariabledInput<{
        id?: string | undefined,
      }>>(args: Args):$Field<"deleteAdmin", string | undefined , GetVariables<[], Args>> {
      const options = {
        argTypes: {
              id: "String"
            },
        args,

        
      };
      return this.$_select("deleteAdmin", options) as any
    }
  

      
      loginAdmin<Args extends VariabledInput<{
        data?: LoginInput | undefined,
      }>,Sel extends Selection<AdminLoginData>>(args: Args, selectorFn: (s: AdminLoginData) => [...Sel]):$Field<"loginAdmin", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              data: "LoginInput"
            },
        args,

        selection: selectorFn(new AdminLoginData)
      };
      return this.$_select("loginAdmin", options) as any
    }
  

      
      adminChangePassword<Args extends VariabledInput<{
        input?: ChangePasswordInput | undefined,
      }>>(args: Args):$Field<"adminChangePassword", string | undefined , GetVariables<[], Args>> {
      const options = {
        argTypes: {
              input: "ChangePasswordInput"
            },
        args,

        
      };
      return this.$_select("adminChangePassword", options) as any
    }
  

      
      adminResetPassword<Args extends VariabledInput<{
        input?: ResetPasswordInput | undefined,
      }>>(args: Args):$Field<"adminResetPassword", string | undefined , GetVariables<[], Args>> {
      const options = {
        argTypes: {
              input: "ResetPasswordInput"
            },
        args,

        
      };
      return this.$_select("adminResetPassword", options) as any
    }
  

      
      adminResetMerchantPassword<Args extends VariabledInput<{
        input?: ResetPasswordInput | undefined,
      }>>(args: Args):$Field<"adminResetMerchantPassword", string | undefined , GetVariables<[], Args>> {
      const options = {
        argTypes: {
              input: "ResetPasswordInput"
            },
        args,

        
      };
      return this.$_select("adminResetMerchantPassword", options) as any
    }
  

      
      adminForgotPassword<Args extends VariabledInput<{
        input?: ForgotPasswordInput | undefined,
      }>>(args: Args):$Field<"adminForgotPassword", string | undefined , GetVariables<[], Args>> {
      const options = {
        argTypes: {
              input: "ForgotPasswordInput"
            },
        args,

        
      };
      return this.$_select("adminForgotPassword", options) as any
    }
  

      
      adminResetPasswordByToken<Args extends VariabledInput<{
        input?: ForgotPasswordResetInput | undefined,
      }>>(args: Args):$Field<"adminResetPasswordByToken", string | undefined , GetVariables<[], Args>> {
      const options = {
        argTypes: {
              input: "ForgotPasswordResetInput"
            },
        args,

        
      };
      return this.$_select("adminResetPasswordByToken", options) as any
    }
  

      
      upsertCodeConfig<Args extends VariabledInput<{
        data?: CreateCodeConfigInput | undefined,
      }>,Sel extends Selection<CodeConfig>>(args: Args, selectorFn: (s: CodeConfig) => [...Sel]):$Field<"upsertCodeConfig", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              data: "CreateCodeConfigInput"
            },
        args,

        selection: selectorFn(new CodeConfig)
      };
      return this.$_select("upsertCodeConfig", options) as any
    }
  

      
      get initAllTenantsCodeConfigs(): $Field<"initAllTenantsCodeConfigs", string | undefined>  {
       return this.$_select("initAllTenantsCodeConfigs") as any
      }

      
      createAgencyAccount<Args extends VariabledInput<{
        data?: CreateAgencyAccountInput | undefined,
      }>,Sel extends Selection<AgencyAccount>>(args: Args, selectorFn: (s: AgencyAccount) => [...Sel]):$Field<"createAgencyAccount", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              data: "CreateAgencyAccountInput"
            },
        args,

        selection: selectorFn(new AgencyAccount)
      };
      return this.$_select("createAgencyAccount", options) as any
    }
  

      
      updateAgencyAccount<Args extends VariabledInput<{
        id?: string | undefined
data?: UpdateAgencyAccountInput | undefined,
      }>,Sel extends Selection<AgencyAccount>>(args: Args, selectorFn: (s: AgencyAccount) => [...Sel]):$Field<"updateAgencyAccount", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              id: "String",
data: "UpdateAgencyAccountInput"
            },
        args,

        selection: selectorFn(new AgencyAccount)
      };
      return this.$_select("updateAgencyAccount", options) as any
    }
  

      
      deleteAgencyAccount<Args extends VariabledInput<{
        id?: string | undefined,
      }>>(args: Args):$Field<"deleteAgencyAccount", string | undefined , GetVariables<[], Args>> {
      const options = {
        argTypes: {
              id: "String"
            },
        args,

        
      };
      return this.$_select("deleteAgencyAccount", options) as any
    }
  

      
      loginAgencyAccount<Args extends VariabledInput<{
        data?: LoginInput | undefined,
      }>,Sel extends Selection<AgencyAccountLoginData>>(args: Args, selectorFn: (s: AgencyAccountLoginData) => [...Sel]):$Field<"loginAgencyAccount", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              data: "LoginInput"
            },
        args,

        selection: selectorFn(new AgencyAccountLoginData)
      };
      return this.$_select("loginAgencyAccount", options) as any
    }
  

      
      agencyAccountChangePassword<Args extends VariabledInput<{
        input?: ChangePasswordInput | undefined,
      }>>(args: Args):$Field<"agencyAccountChangePassword", string | undefined , GetVariables<[], Args>> {
      const options = {
        argTypes: {
              input: "ChangePasswordInput"
            },
        args,

        
      };
      return this.$_select("agencyAccountChangePassword", options) as any
    }
  

      
      setAccountPermissions<Args extends VariabledInput<{
        input?: SetPermissionsInput | undefined,
      }>,Sel extends Selection<AccountPermissionSummary>>(args: Args, selectorFn: (s: AccountPermissionSummary) => [...Sel]):$Field<"setAccountPermissions", GetOutput<Sel> | undefined , GetVariables<Sel, Args>> {
      const options = {
        argTypes: {
              input: "SetPermissionsInput"
            },
        args,

        selection: selectorFn(new AccountPermissionSummary)
      };
      return this.$_select("setAccountPermissions", options) as any
    }
  
}


export type CreateUnitInput = {
  name?: string | undefined,
code?: string | undefined,
group?: EUnitGroup | undefined,
description?: string | undefined,
isActivated?: boolean | undefined
}
    


export type UpdateUnitInput = {
  name?: string | undefined,
code?: string | undefined,
group?: EUnitGroup | undefined,
description?: string | undefined,
isActivated?: boolean | undefined
}
    


export type CreateSectionInput = {
  pageId?: string | undefined,
type?: string | undefined,
order?: number | undefined,
enabled?: boolean | undefined,
layoutPreset?: string | undefined,
theme?: string | undefined,
content?: string | undefined,
dataSource?: string | undefined,
fieldMapping?: string | undefined,
visibilityRules?: string | undefined,
responsiveSettings?: string | undefined,
animation?: string | undefined,
style?: string | undefined
}
    


export type UpdateSectionInput = {
  type?: string | undefined,
order?: number | undefined,
enabled?: boolean | undefined,
layoutPreset?: string | undefined,
theme?: string | undefined,
content?: string | undefined,
dataSource?: string | undefined,
fieldMapping?: string | undefined,
visibilityRules?: string | undefined,
responsiveSettings?: string | undefined,
animation?: string | undefined,
style?: string | undefined
}
    


export type ReorderSectionItemInput = {
  id?: string | undefined,
order?: number | undefined
}
    


export type CreateTenantAccountInput = {
  fullname?: string | undefined,
tenantId?: string | undefined,
username?: string | undefined,
password?: string | undefined,
email?: string | undefined,
phone?: string | undefined,
roles?: Array<ERole | undefined> | undefined,
isActivated?: boolean | undefined
}
    


export type UpdateTenantAccountInput = {
  fullname?: string | undefined,
username?: string | undefined,
password?: string | undefined,
email?: string | undefined,
phone?: string | undefined,
roles?: Array<ERole | undefined> | undefined,
isActivated?: boolean | undefined,
avatarMediaId?: string | undefined
}
    


export type LoginInput = {
  code?: string | undefined,
username?: string | undefined,
password?: string | undefined
}
    


export type ChangePasswordInput = {
  oldPassword?: string | undefined,
newPassword?: string | undefined
}
    


export type CreateTenantInput = {
  name?: string | undefined,
code?: string | undefined,
website?: string | undefined,
contactEmail?: string | undefined,
taxCode?: string | undefined,
agencyId?: string | undefined,
logoMediaId?: string | undefined,
isActivated?: boolean | undefined,
subscribedFeatures?: Array<EFeature | undefined> | undefined
}
    


export type UpdateTenantInput = {
  name?: string | undefined,
logoMediaId?: string | undefined,
website?: string | undefined,
contactEmail?: string | undefined,
taxCode?: string | undefined,
isActivated?: boolean | undefined,
subscribedFeatures?: Array<EFeature | undefined> | undefined
}
    


export type CreateMerchantInput = {
  username?: string | undefined,
password?: string | undefined,
fullname?: string | undefined,
email?: string | undefined,
phone?: string | undefined
}
    


export type UpdateMerchantInput = {
  fullname?: string | undefined,
email?: string | undefined,
phone?: string | undefined,
isActivated?: boolean | undefined
}
    


export class MerchantLogin extends $Base<"MerchantLogin"> {
  constructor() {
    super("MerchantLogin")
  }

  
      
      merchant<Sel extends Selection<Merchant>>(selectorFn: (s: Merchant) => [...Sel]):$Field<"merchant", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new Merchant)
      };
      return this.$_select("merchant", options) as any
    }
  

      
      get token(): $Field<"token", string | undefined>  {
       return this.$_select("token") as any
      }
}


export type RegisterMerchantInput = {
  email?: string | undefined,
username?: string | undefined,
password?: string | undefined,
fullname?: string | undefined,
phone?: string | undefined
}
    


export type MerchantLoginInput = {
  username?: string | undefined,
password?: string | undefined
}
    


export type SwitchAgencyInput = {
  agencyCode?: string | undefined
}
    


export type SwitchTenantInput = {
  tenantCode?: string | undefined
}
    


export type ForgotPasswordInput = {
  login?: string | undefined,
domain?: string | undefined
}
    


export type ForgotPasswordResetInput = {
  token?: string | undefined,
newPassword?: string | undefined
}
    


export type CreateRedirectInput = {
  fromPath?: string | undefined,
toPath?: string | undefined,
statusCode?: number | undefined
}
    


export type UpdateRedirectInput = {
  fromPath?: string | undefined,
toPath?: string | undefined,
statusCode?: number | undefined
}
    


export type CreatePageInput = {
  internalName?: string | undefined,
path?: string | undefined,
pageType?: EPageType | undefined,
templateKey?: string | undefined,
parentPageId?: string | undefined,
contentTypeId?: string | undefined,
headerPresetId?: string | undefined,
footerPresetId?: string | undefined,
locale?: string | undefined,
seo?: SeoInput | undefined,
style?: string | undefined
}
    


export type SeoInput = {
  title?: string | undefined,
description?: string | undefined,
ogTitle?: string | undefined,
ogDescription?: string | undefined,
ogImage?: string | undefined,
twitterImage?: string | undefined,
robotsIndex?: boolean | undefined,
robotsFollow?: boolean | undefined,
canonicalUrl?: string | undefined,
structuredData?: string | undefined,
sitemapPriority?: number | undefined,
sitemapChangeFreq?: string | undefined
}
    


export type UpdatePageInput = {
  internalName?: string | undefined,
path?: string | undefined,
pageType?: EPageType | undefined,
templateKey?: string | undefined,
parentPageId?: string | undefined,
contentTypeId?: string | undefined,
headerPresetId?: string | undefined,
footerPresetId?: string | undefined,
locale?: string | undefined,
seo?: SeoInput | undefined,
style?: string | undefined
}
    


export type CreateMediaInput = {
  url?: string | undefined,
fileSize?: number | undefined,
fileName?: string | undefined,
fileId?: string | undefined,
type?: string | undefined,
setId?: string | undefined
}
    


export type UpdateMediaInput = {
  url?: string | undefined,
fileSize?: number | undefined,
fileName?: string | undefined,
fileId?: string | undefined,
type?: string | undefined,
setId?: string | undefined
}
    


export class PresignedUrlResponse extends $Base<"PresignedUrlResponse"> {
  constructor() {
    super("PresignedUrlResponse")
  }

  
      
      get url(): $Field<"url", string | undefined>  {
       return this.$_select("url") as any
      }

      
      get fileId(): $Field<"fileId", string | undefined>  {
       return this.$_select("fileId") as any
      }
}


export type GeneratePresignedUrlInput = {
  contentType?: string | undefined,
contentLength?: number | undefined
}
    


export type CreateMediaSetInput = {
  content?: string | undefined,
mediaIds?: Array<string | undefined> | undefined
}
    


export type UpdateMediaSetInput = {
  content?: string | undefined,
mediaIds?: Array<string | undefined> | undefined
}
    


export type CreateHeaderPresetInput = {
  name?: string | undefined,
logoText?: string | undefined,
navLinks?: string | undefined,
animation?: string | undefined
}
    


export type UpdateHeaderPresetInput = {
  name?: string | undefined,
logoText?: string | undefined,
navLinks?: string | undefined,
animation?: string | undefined
}
    


export type CreateEmailConfigInput = {
  name?: string | undefined,
domain?: string | undefined,
isDefault?: boolean | undefined,
isActive?: boolean | undefined,
smtpHost?: string | undefined,
smtpPort?: number | undefined,
smtpSecure?: boolean | undefined,
smtpUser?: string | undefined,
smtpPassword?: string | undefined,
senderName?: string | undefined,
senderEmail?: string | undefined,
resetPasswordSubject?: string | undefined,
resetPasswordTemplate?: string | undefined
}
    


export type UpdateEmailConfigInput = {
  name?: string | undefined,
domain?: string | undefined,
isDefault?: boolean | undefined,
isActive?: boolean | undefined,
smtpHost?: string | undefined,
smtpPort?: number | undefined,
smtpSecure?: boolean | undefined,
smtpUser?: string | undefined,
smtpPassword?: string | undefined,
senderName?: string | undefined,
senderEmail?: string | undefined,
resetPasswordSubject?: string | undefined,
resetPasswordTemplate?: string | undefined
}
    


export type CreateContentTypeInput = {
  key?: string | undefined,
label?: string | undefined,
icon?: string | undefined,
fields?: Array<FieldDefinitionInput | undefined> | undefined
}
    


export type FieldDefinitionInput = {
  key?: string | undefined,
label?: string | undefined,
type?: EFieldType | undefined,
required?: boolean | undefined,
options?: Array<string | undefined> | undefined,
relationTarget?: string | undefined,
relationMultiple?: boolean | undefined,
isSlugSource?: boolean | undefined,
showInListing?: boolean | undefined,
mockValue?: string | undefined
}
    


export type UpdateContentTypeInput = {
  label?: string | undefined,
icon?: string | undefined,
fields?: Array<FieldDefinitionInput | undefined> | undefined
}
    


export type CreateCustomerInput = {
  tenantId?: string | undefined,
id?: string | undefined,
createdAt?: string | undefined,
updatedAt?: string | undefined,
deletedAt?: string | undefined
}
    


export type UpdateCustomerInput = {
  tenantId?: string | undefined,
id?: string | undefined,
createdAt?: string | undefined,
updatedAt?: string | undefined,
deletedAt?: string | undefined
}
    


export type CreateFooterPresetInput = {
  name?: string | undefined,
logoText?: string | undefined,
hotlineLabel?: string | undefined,
hotline?: string | undefined,
footerHeading?: string | undefined,
footerEmail?: string | undefined,
footerColumns?: string | undefined,
footerOutlineText?: string | undefined,
animation?: string | undefined
}
    


export type UpdateFooterPresetInput = {
  name?: string | undefined,
logoText?: string | undefined,
hotlineLabel?: string | undefined,
hotline?: string | undefined,
footerHeading?: string | undefined,
footerEmail?: string | undefined,
footerColumns?: string | undefined,
footerOutlineText?: string | undefined,
animation?: string | undefined
}
    


export type CreateContentEntryInput = {
  contentTypeId?: string | undefined,
slug?: string | undefined,
status?: EPageStatus | undefined,
locale?: string | undefined,
seo?: SeoInput | undefined,
data?: string | undefined
}
    


export type UpdateContentEntryInput = {
  slug?: string | undefined,
status?: EPageStatus | undefined,
locale?: string | undefined,
seo?: SeoInput | undefined,
data?: string | undefined
}
    


export type CreateAgencyInput = {
  code?: string | undefined,
name?: string | undefined,
logoMediaId?: string | undefined,
website?: string | undefined,
contactEmail?: string | undefined,
taxCode?: string | undefined,
isActivated?: boolean | undefined,
deploymentMode?: string | undefined
}
    


export type UpdateAgencyInput = {
  name?: string | undefined,
logoMediaId?: string | undefined,
website?: string | undefined,
contactEmail?: string | undefined,
taxCode?: string | undefined,
isActivated?: boolean | undefined,
deploymentMode?: string | undefined
}
    


export type CreateAdminInput = {
  email?: string | undefined,
password?: string | undefined,
username?: string | undefined,
firstName?: string | undefined,
lastName?: string | undefined,
roles?: Array<ERole | undefined> | undefined,
isActivated?: boolean | undefined,
lastLoginAt?: string | undefined,
id?: string | undefined,
createdAt?: string | undefined,
updatedAt?: string | undefined,
deletedAt?: string | undefined
}
    


export type UpdateAdminInput = {
  email?: string | undefined,
password?: string | undefined,
username?: string | undefined,
firstName?: string | undefined,
lastName?: string | undefined,
roles?: Array<ERole | undefined> | undefined,
isActivated?: boolean | undefined,
lastLoginAt?: string | undefined,
id?: string | undefined,
createdAt?: string | undefined,
updatedAt?: string | undefined,
deletedAt?: string | undefined
}
    


export class AdminLoginData extends $Base<"AdminLoginData"> {
  constructor() {
    super("AdminLoginData")
  }

  
      
      admin<Sel extends Selection<Admin>>(selectorFn: (s: Admin) => [...Sel]):$Field<"admin", GetOutput<Sel> | undefined > {
      const options = {
        
        

        selection: selectorFn(new Admin)
      };
      return this.$_select("admin", options) as any
    }
  

      
      get token(): $Field<"token", string | undefined>  {
       return this.$_select("token") as any
      }
}


export type ResetPasswordInput = {
  targetId?: string | undefined,
newPassword?: string | undefined
}
    


export type CreateCodeConfigInput = {
  entityType?: ECodeEntityType | undefined,
prefix?: string | undefined,
separator?: string | undefined,
includeYear?: boolean | undefined,
sequenceLength?: number | undefined,
customPattern?: string | undefined
}
    


export type CreateAgencyAccountInput = {
  fullname?: string | undefined,
agencyId?: string | undefined,
username?: string | undefined,
password?: string | undefined,
email?: string | undefined,
phone?: string | undefined,
roles?: Array<ERole | undefined> | undefined,
isActivated?: boolean | undefined
}
    


export type UpdateAgencyAccountInput = {
  fullname?: string | undefined,
email?: string | undefined,
phone?: string | undefined,
roles?: Array<ERole | undefined> | undefined,
isActivated?: boolean | undefined,
avatarMediaId?: string | undefined
}
    


export type SetPermissionsInput = {
  tenantAccountId?: string | undefined,
accountScope?: EAccountPermissionScope | undefined,
permissions?: Array<SetPermissionEntryInput | undefined> | undefined
}
    

  
export enum EAccountPermissionScope {
  
  TENANT = "TENANT",

  AGENCY = "AGENCY"
}
  


export type SetPermissionEntryInput = {
  permission?: EPermission | undefined,
scopeRule?: ScopeRuleInput | undefined
}
    


export type ScopeRuleInput = {
  type?: EScopeRuleType | undefined,
field?: string | undefined,
ids?: Array<string | undefined> | undefined,
rules?: Array<ScopeRuleInput | undefined> | undefined
}
    

  const $Root = {
    query: Query,
mutation: Mutation
  }

  namespace $RootTypes {
    export type query = Query
export type mutation = Mutation
  }
  

export function query<Sel extends Selection<$RootTypes.query>>(name: string, selectFn: (q: $RootTypes.query) => [...Sel]): TypedDocumentNode<GetOutput<Sel>, GetVariables<Sel>>
export function query<Sel extends Selection<$RootTypes.query>>(selectFn: (q: $RootTypes.query) => [...Sel]): TypedDocumentNode<GetOutput<Sel>, GetVariables<Sel>>
export function query<Sel extends Selection<$RootTypes.query>>(nameOrFn: any, maybeSelectFn?: any) {
  const selectFn = typeof nameOrFn === 'function' ? nameOrFn : maybeSelectFn;
  const opName = typeof nameOrFn === 'string' ? nameOrFn : 'query';
  let field = new $Field<'query', GetOutput<Sel>, GetVariables<Sel>>(opName as 'query', {
    selection: selectFn(new $Root.query()),
  })
  const str = fieldToQuery(typeof nameOrFn === 'string' ? 'query ' + opName : 'query', field)

  return gql(str) as any as TypedDocumentNode<GetOutput<Sel>, GetVariables<Sel>>
}


export function mutation<Sel extends Selection<$RootTypes.mutation>>(name: string, selectFn: (q: $RootTypes.mutation) => [...Sel]): TypedDocumentNode<GetOutput<Sel>, GetVariables<Sel>>
export function mutation<Sel extends Selection<$RootTypes.mutation>>(selectFn: (q: $RootTypes.mutation) => [...Sel]): TypedDocumentNode<GetOutput<Sel>, GetVariables<Sel>>
export function mutation<Sel extends Selection<$RootTypes.mutation>>(nameOrFn: any, maybeSelectFn?: any) {
  const selectFn = typeof nameOrFn === 'function' ? nameOrFn : maybeSelectFn;
  const opName = typeof nameOrFn === 'string' ? nameOrFn : 'mutation';
  let field = new $Field<'mutation', GetOutput<Sel>, GetVariables<Sel>>(opName as 'mutation', {
    selection: selectFn(new $Root.mutation()),
  })
  const str = fieldToQuery(typeof nameOrFn === 'string' ? 'mutation ' + opName : 'mutation', field)

  return gql(str) as any as TypedDocumentNode<GetOutput<Sel>, GetVariables<Sel>>
}


const $InputTypes: {[key: string]: {[key: string]: string}} = {
    PaginationArgsInput: {
    filter: "Mixed",
search: "String",
searchFields: "[String]",
after: "String",
before: "String",
limit: "Float",
sort: "Mixed",
page: "Float"
  },
  GrantableResourceInput: {
    resourceGroup: "String",
search: "String",
ids: "[String]",
limit: "Float"
  },
  CreateUnitInput: {
    name: "String",
code: "String",
group: "EUnitGroup",
description: "String",
isActivated: "Boolean"
  },
  UpdateUnitInput: {
    name: "String",
code: "String",
group: "EUnitGroup",
description: "String",
isActivated: "Boolean"
  },
  CreateSectionInput: {
    pageId: "String",
type: "String",
order: "Float",
enabled: "Boolean",
layoutPreset: "String",
theme: "String",
content: "Mixed",
dataSource: "Mixed",
fieldMapping: "Mixed",
visibilityRules: "Mixed",
responsiveSettings: "Mixed",
animation: "Mixed",
style: "Mixed"
  },
  UpdateSectionInput: {
    type: "String",
order: "Float",
enabled: "Boolean",
layoutPreset: "String",
theme: "String",
content: "Mixed",
dataSource: "Mixed",
fieldMapping: "Mixed",
visibilityRules: "Mixed",
responsiveSettings: "Mixed",
animation: "Mixed",
style: "Mixed"
  },
  ReorderSectionItemInput: {
    id: "String",
order: "Float"
  },
  CreateTenantAccountInput: {
    fullname: "String",
tenantId: "String",
username: "String",
password: "String",
email: "String",
phone: "String",
roles: "[ERole]",
isActivated: "Boolean"
  },
  UpdateTenantAccountInput: {
    fullname: "String",
username: "String",
password: "String",
email: "String",
phone: "String",
roles: "[ERole]",
isActivated: "Boolean",
avatarMediaId: "String"
  },
  LoginInput: {
    code: "String",
username: "String",
password: "String"
  },
  ChangePasswordInput: {
    oldPassword: "String",
newPassword: "String"
  },
  CreateTenantInput: {
    name: "String",
code: "String",
website: "String",
contactEmail: "String",
taxCode: "String",
agencyId: "String",
logoMediaId: "String",
isActivated: "Boolean",
subscribedFeatures: "[EFeature]"
  },
  UpdateTenantInput: {
    name: "String",
logoMediaId: "String",
website: "String",
contactEmail: "String",
taxCode: "String",
isActivated: "Boolean",
subscribedFeatures: "[EFeature]"
  },
  CreateMerchantInput: {
    username: "String",
password: "String",
fullname: "String",
email: "String",
phone: "String"
  },
  UpdateMerchantInput: {
    fullname: "String",
email: "String",
phone: "String",
isActivated: "Boolean"
  },
  RegisterMerchantInput: {
    email: "String",
username: "String",
password: "String",
fullname: "String",
phone: "String"
  },
  MerchantLoginInput: {
    username: "String",
password: "String"
  },
  SwitchAgencyInput: {
    agencyCode: "String"
  },
  SwitchTenantInput: {
    tenantCode: "String"
  },
  ForgotPasswordInput: {
    login: "String",
domain: "String"
  },
  ForgotPasswordResetInput: {
    token: "String",
newPassword: "String"
  },
  CreateRedirectInput: {
    fromPath: "String",
toPath: "String",
statusCode: "Float"
  },
  UpdateRedirectInput: {
    fromPath: "String",
toPath: "String",
statusCode: "Float"
  },
  CreatePageInput: {
    internalName: "String",
path: "String",
pageType: "EPageType",
templateKey: "String",
parentPageId: "String",
contentTypeId: "String",
headerPresetId: "String",
footerPresetId: "String",
locale: "String",
seo: "SeoInput",
style: "Mixed"
  },
  SeoInput: {
    title: "String",
description: "String",
ogTitle: "String",
ogDescription: "String",
ogImage: "String",
twitterImage: "String",
robotsIndex: "Boolean",
robotsFollow: "Boolean",
canonicalUrl: "String",
structuredData: "Mixed",
sitemapPriority: "Float",
sitemapChangeFreq: "String"
  },
  UpdatePageInput: {
    internalName: "String",
path: "String",
pageType: "EPageType",
templateKey: "String",
parentPageId: "String",
contentTypeId: "String",
headerPresetId: "String",
footerPresetId: "String",
locale: "String",
seo: "SeoInput",
style: "Mixed"
  },
  CreateMediaInput: {
    url: "String",
fileSize: "Float",
fileName: "String",
fileId: "String",
type: "String",
setId: "String"
  },
  UpdateMediaInput: {
    url: "String",
fileSize: "Float",
fileName: "String",
fileId: "String",
type: "String",
setId: "String"
  },
  GeneratePresignedUrlInput: {
    contentType: "String",
contentLength: "Float"
  },
  CreateMediaSetInput: {
    content: "String",
mediaIds: "[String]"
  },
  UpdateMediaSetInput: {
    content: "String",
mediaIds: "[String]"
  },
  CreateHeaderPresetInput: {
    name: "String",
logoText: "String",
navLinks: "Mixed",
animation: "Mixed"
  },
  UpdateHeaderPresetInput: {
    name: "String",
logoText: "String",
navLinks: "Mixed",
animation: "Mixed"
  },
  CreateEmailConfigInput: {
    name: "String",
domain: "String",
isDefault: "Boolean",
isActive: "Boolean",
smtpHost: "String",
smtpPort: "Int",
smtpSecure: "Boolean",
smtpUser: "String",
smtpPassword: "String",
senderName: "String",
senderEmail: "String",
resetPasswordSubject: "String",
resetPasswordTemplate: "String"
  },
  UpdateEmailConfigInput: {
    name: "String",
domain: "String",
isDefault: "Boolean",
isActive: "Boolean",
smtpHost: "String",
smtpPort: "Int",
smtpSecure: "Boolean",
smtpUser: "String",
smtpPassword: "String",
senderName: "String",
senderEmail: "String",
resetPasswordSubject: "String",
resetPasswordTemplate: "String"
  },
  CreateContentTypeInput: {
    key: "String",
label: "String",
icon: "String",
fields: "[FieldDefinitionInput]"
  },
  FieldDefinitionInput: {
    key: "String",
label: "String",
type: "EFieldType",
required: "Boolean",
options: "[String]",
relationTarget: "String",
relationMultiple: "Boolean",
isSlugSource: "Boolean",
showInListing: "Boolean",
mockValue: "String"
  },
  UpdateContentTypeInput: {
    label: "String",
icon: "String",
fields: "[FieldDefinitionInput]"
  },
  CreateCustomerInput: {
    tenantId: "String",
id: "String",
createdAt: "DateTime",
updatedAt: "DateTime",
deletedAt: "DateTime"
  },
  UpdateCustomerInput: {
    tenantId: "String",
id: "String",
createdAt: "DateTime",
updatedAt: "DateTime",
deletedAt: "DateTime"
  },
  CreateFooterPresetInput: {
    name: "String",
logoText: "String",
hotlineLabel: "String",
hotline: "String",
footerHeading: "String",
footerEmail: "String",
footerColumns: "Mixed",
footerOutlineText: "String",
animation: "Mixed"
  },
  UpdateFooterPresetInput: {
    name: "String",
logoText: "String",
hotlineLabel: "String",
hotline: "String",
footerHeading: "String",
footerEmail: "String",
footerColumns: "Mixed",
footerOutlineText: "String",
animation: "Mixed"
  },
  CreateContentEntryInput: {
    contentTypeId: "String",
slug: "String",
status: "EPageStatus",
locale: "String",
seo: "SeoInput",
data: "Mixed"
  },
  UpdateContentEntryInput: {
    slug: "String",
status: "EPageStatus",
locale: "String",
seo: "SeoInput",
data: "Mixed"
  },
  CreateAgencyInput: {
    code: "String",
name: "String",
logoMediaId: "String",
website: "String",
contactEmail: "String",
taxCode: "String",
isActivated: "Boolean",
deploymentMode: "String"
  },
  UpdateAgencyInput: {
    name: "String",
logoMediaId: "String",
website: "String",
contactEmail: "String",
taxCode: "String",
isActivated: "Boolean",
deploymentMode: "String"
  },
  CreateAdminInput: {
    email: "String",
password: "String",
username: "String",
firstName: "String",
lastName: "String",
roles: "[ERole]",
isActivated: "Boolean",
lastLoginAt: "DateTime",
id: "String",
createdAt: "DateTime",
updatedAt: "DateTime",
deletedAt: "DateTime"
  },
  UpdateAdminInput: {
    email: "String",
password: "String",
username: "String",
firstName: "String",
lastName: "String",
roles: "[ERole]",
isActivated: "Boolean",
lastLoginAt: "DateTime",
id: "String",
createdAt: "DateTime",
updatedAt: "DateTime",
deletedAt: "DateTime"
  },
  ResetPasswordInput: {
    targetId: "String",
newPassword: "String"
  },
  CreateCodeConfigInput: {
    entityType: "ECodeEntityType",
prefix: "String",
separator: "String",
includeYear: "Boolean",
sequenceLength: "Int",
customPattern: "String"
  },
  CreateAgencyAccountInput: {
    fullname: "String",
agencyId: "String",
username: "String",
password: "String",
email: "String",
phone: "String",
roles: "[ERole]",
isActivated: "Boolean"
  },
  UpdateAgencyAccountInput: {
    fullname: "String",
email: "String",
phone: "String",
roles: "[ERole]",
isActivated: "Boolean",
avatarMediaId: "String"
  },
  SetPermissionsInput: {
    tenantAccountId: "String",
accountScope: "EAccountPermissionScope",
permissions: "[SetPermissionEntryInput]"
  },
  SetPermissionEntryInput: {
    permission: "EPermission",
scopeRule: "ScopeRuleInput"
  },
  ScopeRuleInput: {
    type: "EScopeRuleType",
field: "String",
ids: "[String]",
rules: "[ScopeRuleInput]"
  }
}

