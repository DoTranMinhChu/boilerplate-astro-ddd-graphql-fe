import { createSignal, onMount } from 'solid-js';
import {
    BrandContext,
    BRAND_CACHE_KEY_PREFIX,
    BRAND_CACHE_TTL_MS,
    DEFAULT_BRAND,
    firstBrandValue,
    getBrandFaviconUrl,
    getBrandSeoImageUrl,
} from './BrandContext';
import { BrandDTO, BrandService } from '@/shared/services/brand/brand.service';

function getHostname(): string {
    try {
        return window.location.hostname;
    } catch {
        return '';
    }
}

function readCache(domain: string): BrandDTO | null {
    try {
        const raw = localStorage.getItem(`${BRAND_CACHE_KEY_PREFIX}${domain}`);
        if (!raw) return null;
        const { data, cachedAt } = JSON.parse(raw) as { data: BrandDTO; cachedAt: number };
        if (Date.now() - cachedAt < BRAND_CACHE_TTL_MS) return data;
    } catch { /* SSR / parse error */ }
    return null;
}

function writeCache(domain: string, data: BrandDTO): void {
    try {
        localStorage.setItem(
            `${BRAND_CACHE_KEY_PREFIX}${domain}`,
            JSON.stringify({ data, cachedAt: Date.now() }),
        );
    } catch { /* quota exceeded */ }
}

function upsertMeta(selector: string, attrs: Record<string, string>, content?: string): void {
    if (!content) return;
    let element = document.head.querySelector<HTMLMetaElement>(selector);
    if (!element) {
        element = document.createElement('meta');
        Object.entries(attrs).forEach(([key, value]) => element!.setAttribute(key, value));
        document.head.appendChild(element);
    }
    element.setAttribute('content', content);
}

function upsertLink(selector: string, attrs: Record<string, string>, href?: string): void {
    if (!href) return;
    let element = document.head.querySelector<HTMLLinkElement>(selector);
    if (!element) {
        element = document.createElement('link');
        Object.entries(attrs).forEach(([key, value]) => element!.setAttribute(key, value));
        document.head.appendChild(element);
    }
    element.setAttribute('href', href);
}

function replaceIconLinks(href?: string): void {
    if (!href) return;
    document.head
        .querySelectorAll<HTMLLinkElement>('link[rel~="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]')
        .forEach((element) => element.remove());
    upsertLink('link[data-brand-icon="icon"]', { rel: 'icon', 'data-brand-icon': 'icon' }, href);
    upsertLink('link[data-brand-icon="shortcut"]', { rel: 'shortcut icon', 'data-brand-icon': 'shortcut' }, href);
    upsertLink('link[data-brand-icon="apple"]', { rel: 'apple-touch-icon', 'data-brand-icon': 'apple' }, href);
}

function applyBrandToDOM(brand: BrandDTO): void {
    try {
        const title = firstBrandValue(brand.seoTitle, brand.name);
        const description = firstBrandValue(brand.seoDescription, brand.landingContent?.heroSubtitle);
        const faviconUrl = getBrandFaviconUrl(brand);
        const seoImageUrl = getBrandSeoImageUrl(brand);
        const themeColor = firstBrandValue(brand.primaryColor, '#10b981')!;
        const pageUrl = window.location.href;

        document.documentElement.style.setProperty('--brand-primary', themeColor);
        if (title) document.title = title;

        replaceIconLinks(faviconUrl);

        upsertMeta('meta[name="theme-color"]', { name: 'theme-color' }, themeColor);
        upsertMeta('meta[name="description"]', { name: 'description' }, description);
        upsertMeta('meta[name="keywords"]', { name: 'keywords' }, brand.seoKeywords);

        upsertMeta('meta[property="og:title"]', { property: 'og:title' }, title);
        upsertMeta('meta[property="og:description"]', { property: 'og:description' }, description);
        upsertMeta('meta[property="og:image"]', { property: 'og:image' }, seoImageUrl);
        upsertMeta('meta[property="og:url"]', { property: 'og:url' }, pageUrl);
        upsertMeta('meta[property="og:site_name"]', { property: 'og:site_name' }, brand.name);

        upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title' }, title);
        upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description' }, description);
        upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image' }, seoImageUrl);
        upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card' }, seoImageUrl ? 'summary_large_image' : 'summary');
    } catch { /* SSR */ }
}

export function BrandProvider(props: BaseProps) {
    const [brand, setBrand] = createSignal<BrandDTO | null>(null);
    const hostname = getHostname();

    const fetchAndUpdate = async () => {
        try {
            const data = await BrandService.getBrandConfig(hostname);
            if (data) {
                setBrand(data);
                writeCache(hostname, data);
                applyBrandToDOM(data);
            }
        } catch {
            if (!brand()) {
                setBrand(DEFAULT_BRAND);
                applyBrandToDOM(DEFAULT_BRAND);
            }
        }
    };

    const reload = async (forceRefresh = false) => {
        if (!forceRefresh) {
            const cached = readCache(hostname);
            if (cached) {
                setBrand(cached);
                applyBrandToDOM(cached);
                fetchAndUpdate();
                return;
            }
        }

        await fetchAndUpdate();
    };

    onMount(() => { reload(); });

    return (
        <BrandContext.Provider value={{ brand, reload }}>
            {props.children}
        </BrandContext.Provider>
    );
}
