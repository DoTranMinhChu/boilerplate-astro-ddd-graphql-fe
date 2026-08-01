// astro.config.mjs
import { defineConfig, envField } from 'astro/config';
import solid from '@astrojs/solid-js';
import vercel from '@astrojs/vercel';
import node from '@astrojs/node';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// version from npm env (safe for ESM)
const version = process.env.npm_package_version || '0.0.0';

// Public site origin used for canonical URLs, sitemap generation, and OG tags.
// Override with SITE_URL in your environment; falls back to a clear placeholder.
const siteUrl = process.env.SITE_URL || 'https://example.com';

// Authenticated portal path prefixes that should never appear in the public
// sitemap or be crawled by search engines (see public/robots.txt).
const AUTHENTICATED_PATH_PREFIXES = ['/admin/', '/agency/', '/tenant/', '/merchant/'];

// Deployment selector:
// - On Vercel builds, process.env.VERCEL is set -> use vercel adapter automatically
// - Or set DEPLOY_TARGET=vercel/node/static locally/CI to force target
const isVercel = !!process.env.VERCEL || process.env.DEPLOY_TARGET === 'vercel';
const isStatic = process.env.DEPLOY_TARGET === 'static';
const useNode = !isVercel && process.env.DEPLOY_TARGET === 'node';

// Choose adapter & output
const adapter = isStatic ? undefined : (isVercel ? vercel() : node({ mode: 'standalone' }));
const output = isStatic ? 'static' : 'server';

export default defineConfig({
    srcDir: 'src',
    output,
    site: siteUrl,
    // only include adapter when not static
    ...(adapter ? { adapter } : {}),

    // integrations (single declaration)
    integrations: [
        solid(),
        sitemap({
            // Keep authenticated dashboard areas out of the public sitemap.
            filter: (page) => !AUTHENTICATED_PATH_PREFIXES.some((prefix) => page.includes(prefix)),
        })
    ],

    server: {
        host: true,
        // port is handled by environment on hosting platforms
    },

    vite: {
        define: {
            'import.meta.env.PUBLIC_APP_VERSION': JSON.stringify(version),
        },
        plugins: [tailwindcss()],
        build: {
            chunkSizeWarningLimit: 1000,
        },
        resolve: {
            alias: {
                '@': '/src',
                '@core': '/src/core',
                '@shared': '/src/shared',
                '@modules': '/src/modules',
                '@layouts': '/src/layouts',
            },
        },
        css: {
            preprocessorOptions: {
                scss: {
                    api: 'modern',
                },
            },
        },
    },

    env: {
        schema: {
            PORT: envField.number({
                context: 'server',
                access: 'secret',
                default: 80,
            }),
            ENVIRONMENT: envField.string({
                context: 'server',
                access: 'secret',
                default: 'local',
                values: ['local', 'dev', 'test', 'stage', 'prod'],
            }),
            APP_NAME: envField.string({ context: 'server', access: 'secret', default: '' }),
            BACKEND_URL: envField.string({ context: 'server', access: 'secret', default: '' }),
            HOSTNAME_DEFAULT: envField.string({ context: 'server', access: 'secret', default: '' }),
            HOSTNAME_ADMIN: envField.string({ context: 'server', access: 'secret', default: '' }),

            PUBLIC_APP_CODE: envField.string({ context: 'server', access: 'secret', default: '' }),
            SEO_PUBLIC_PATH: envField.string({ context: 'server', access: 'secret', default: '' }),


        },
    },
});