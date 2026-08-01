// src/shared/common/app/HomePage.tsx
//
// Minimal placeholder public homepage for this source base. The original
// agribase-fe had a full marketing "landing" module (src/modules/landing) —
// that's domain-specific product content and was intentionally not carried
// over into this generic source base. Replace this with a real landing page
// (or a redirect straight to a login route) for your concrete product.

import { useRoutes } from '@/shared/contexts/routes/RoutesContext';

export function HomePage() {
    const { navigateToPage } = useRoutes();

    return (
        <div class="min-h-screen flex items-center justify-center bg-slate-50 p-6">
            <div class="max-w-lg text-center space-y-4">
                <h1 class="text-2xl font-bold text-gray-900">ddd-graphql-fe</h1>
                <p class="text-gray-500">
                    Generic Astro + SolidJS + GraphQL source base. Replace this page with a real
                    landing page, or redirect straight to a portal login.
                </p>
                <div class="flex items-center justify-center gap-3 pt-2">
                    <button
                        class="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                        onClick={() => navigateToPage('tenantAuth.login')}
                    >
                        Tenant login
                    </button>
                    <button
                        class="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700"
                        onClick={() => navigateToPage('merchantAuth.login')}
                    >
                        Merchant login
                    </button>
                    <button
                        class="px-4 py-2 rounded-lg bg-gray-800 text-white text-sm font-medium hover:bg-gray-900"
                        onClick={() => navigateToPage('adminAuth.login')}
                    >
                        Admin login
                    </button>
                </div>
            </div>
        </div>
    );
}
