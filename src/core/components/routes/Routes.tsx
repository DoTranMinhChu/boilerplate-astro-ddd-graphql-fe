// src/core/components/routes/Routes.tsx
//
// FIX: RoutesOptions.pathname: string (không phải () => string)
//
// createRoutes dùng JS getter:
//   get pathname() { return useLocation().pathname; }
//
// TypeScript inferr kiểu của { get pathname(): string } là { pathname: string }.
// Nếu RoutesOptions khai báo pathname: () => string thì sẽ conflict.
//
// Fix: đổi thành pathname: string trong RoutesOptions.

import {
  NavigateOptions,
  Navigator,
  Params,
  SetParams,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from '@solidjs/router';

export type Routes = {
  [key in string]: {
    layout: (props: BaseProps) => JSX.Element;
    path: string;
    guard?: string | null;
    routes: {
      [key in string]: {
        path: string;
        page: (props: BaseProps) => JSX.Element;
      };
    };
  };
};

// Extract param names from path like '/config/:token/:id' -> 'token' | 'id'
type ExtractParams<S extends string> =
  S extends `${string}:${infer Param}/${infer Rest}`
  ? Param | ExtractParams<`/${Rest}`>
  : S extends `${string}:${infer Param}`
  ? Param
  : never;

// Convert param names to object type: 'token' | 'id' -> { token: string; id: string }
type ParamsToObject<T extends string> = [T] extends [never]
  ? void
  : { [K in T]: string };

// Get full path (layout + route) for a route
type FullPath<
  T extends Routes,
  L extends keyof T,
  R extends keyof T[L]['routes'],
> = `${T[L]['path']}${T[L]['routes'][R]['path']}`;

// Get build params for a specific route
type BuildParamsFor<
  T extends Routes,
  L extends keyof T,
  R extends keyof T[L]['routes'],
> = ParamsToObject<ExtractParams<FullPath<T, L, R>>>;

// Helper type to create dot notation keys, but omit '.default'
export type DotNotationKeys<T extends Routes> = {
  [L in keyof T & string]: keyof T[L]['routes'] extends infer R
  ? R extends string
  ? R extends 'default'
  ? L
  : `${L}.${R}`
  : never
  : never;
}[keyof T & string];

// Helper type to parse dot notation back to layout and route
type ParseDotNotation<
  T extends Routes,
  S extends string,
> = S extends `${infer L}.${infer R}`
  ? { layout: L; route: R }
  : S extends keyof T
  ? { layout: S; route: 'default' }
  : never;

// Helper type to get build parameters from dot notation key
type BuildParamsFromDot<T extends Routes, S extends DotNotationKeys<T>> =
  ParseDotNotation<T, S> extends { layout: infer L; route: infer R }
  ? L extends keyof T
  ? R extends keyof T[L]['routes']
  ? BuildParamsFor<T, L, R>
  : never
  : never
  : never;

export type RoutesOptions<T extends Routes> = {
  // ✅ FIX: pathname là string (getter), không phải () => string
  pathname: string;
  params: Params;
  searchParams: Partial<Params>;
  setSearchParams: (
    params: SetParams,
    options?: Partial<NavigateOptions>,
  ) => void;
  navigate: Navigator;
  navigateToPage: <K extends DotNotationKeys<T>>(
    routeKey:
      | K
      | {
        route: K;
        context: Partial<
          NavigateOptions & { searchParams?: Partial<Params> }
        >;
      },
    ...params: BuildParamsFromDot<T, K> extends void
      ? []
      : [BuildParamsFromDot<T, K>]
  ) => void;
};

function buildPath(
  layoutPath: string | undefined,
  routePath: string,
  params?: Record<string, string>,
): string {
  let fullPath = (layoutPath || '') + routePath;
  fullPath = fullPath.replace(/(?<!:)\/\/+/g, '/');
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      fullPath = fullPath.replace(`:${key}`, value);
    });
  }
  return fullPath;
}

export const createRoutes = <T extends Routes>(routes: T) => {
  // Capture once during component initialization — cannot be called inside event handlers
  const navigate = useNavigate();
  const [, setSearchParamsFn] = useSearchParams();
  const navFn = createNavigateToPage(navigate, routes);

  return {
    // JS getter — TypeScript thấy đây là `string`, không phải `() => string`
    get pathname() {
      try { return useLocation().pathname; } catch (e) { return '/'; }
    },
    get params() {
      try { return useParams(); } catch (e) { return {}; }
    },
    get searchParams() {
      try { const [s] = useSearchParams(); return s; } catch (e) { return {}; }
    },

    navigate,

    navigateToPage: (routeKey: any, ...params: any[]) => {
      return navFn(routeKey, ...params);
    },

    setSearchParams: (p: any, o: any) => {
      try {
        setSearchParamsFn(p, o);
      } catch (e) { }
    },
  } as unknown as RoutesOptions<T>;
};

export function createNavigateToPage<T extends Routes>(
  navigate: Navigator,
  routes: T,
) {
  return function navigateToPage<K extends DotNotationKeys<T>>(
    routeKey: K | { route: K; context: any },
    ...params: any[]
  ) {
    const key = typeof routeKey === 'object' ? routeKey.route : routeKey;
    const keyStr = key as string;

    const [layoutKey, routeName] = keyStr.includes('.')
      ? (keyStr.split('.') as [keyof T, string])
      : [keyStr as keyof T, 'default'];

    const layout = routes[layoutKey];
    const route = layout?.routes?.[routeName];

    if (!layout || !route) {
      console.error(`Route not found: ${keyStr}`);
      return;
    }

    let path = buildPath(
      layout.path,
      route.path,
      params[0] as Record<string, string> | undefined,
    );

    if (typeof routeKey === 'object' && routeKey.context?.searchParams) {
      const searchString = new URLSearchParams(routeKey.context.searchParams).toString();
      if (searchString) path += `?${searchString}`;
    }

    if (typeof routeKey === 'object' && 'context' in routeKey) {
      const { searchParams, ...navigateOptions } = routeKey.context;
      navigate(path, navigateOptions);
    } else {
      navigate(path);
    }
  };
}

export type RoutePathsOf<T extends Routes, L extends keyof T = keyof T> = {
  [Layout in L]: {
    [R in keyof T[Layout]['routes']]: T[Layout]['routes'][R] extends {
      path: infer P extends string;
    }
    ? P extends '*' | '/'
    ? never
    : T[Layout] extends { path: infer LP extends string }
    ? LP extends '/'
    ? P
    : `${LP}${P}`
    : P
    : never;
  }[keyof T[Layout]['routes']];
}[L];