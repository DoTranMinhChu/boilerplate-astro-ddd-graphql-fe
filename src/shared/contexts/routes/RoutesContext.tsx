

//
// createRoutes dùng JS getter:
//   get pathname() { return useLocation().pathname; }
//
// Khi truy cập routes.pathname → getter chạy ngay lập tức, trả về string.
// TypeScript thấy kiểu của getter là string, không phải () => string.
//
// IRoutesContext cũ khai báo pathname: string → đúng, nhưng RoutesOptions<T>
// từ Routes.tsx khai báo pathname: () => string → conflict.
//
// Fix: Đồng bộ IRoutesContext với RoutesOptions — pathname: () => string,
// vì đó là kiểu thực tế mà RoutesOptions<T> export (type-level là function).
// Tuy nhiên runtime vẫn là getter (tự động unwrap khi access).
//
// Giải pháp đơn giản nhất: IRoutesContext dùng `string` và cast trong Provider.

import { createContext, useContext } from 'solid-js';
import { Params, Navigator, SetParams, NavigateOptions } from '@solidjs/router';

export interface IRoutesContext {
    // pathname là string — createRoutes dùng getter nên luôn trả về string khi access
    pathname: string;
    params: Params;
    searchParams: Partial<Params>;
    setSearchParams: (params: SetParams, options?: Partial<NavigateOptions>) => void;
    navigate: Navigator;
    navigateToPage: (routeKey: any, ...params: any[]) => void;
}

const RoutesContext = createContext<IRoutesContext>();

export const useRoutes = (): IRoutesContext => {
    const context = useContext(RoutesContext);
    if (!context) {
        return {
            navigateToPage: (path: string) => console.warn('Router Context chưa sẵn sàng', path),
            pathname: '/',
            params: {},
            searchParams: {},
            setSearchParams: () => { },
            navigate: (() => { }) as any,
        };
    }
    return context;
};

export { RoutesContext };