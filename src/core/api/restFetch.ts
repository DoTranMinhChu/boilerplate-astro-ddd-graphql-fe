// Utility for calling the NestJS REST backend from the browser.
// Uses the same BACKEND_URL and token resolver as the GraphQL client.

import { GraphQL } from './graphql';

function getBackendBase(): string {
    try {
        const url = GraphQL.backendUrl;
        if (!url) return '';
        // backendUrl might be "http://host:port" or "http://host:port/graphql"
        // Strip any trailing /graphql path to get the base
        const obj = new URL(url);
        obj.pathname = '';
        obj.search = '';
        return obj.toString().replace(/\/$/, '');
    } catch {
        return '';
    }
}

interface RestFetchOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: unknown;
    headers?: Record<string, string>;
}

/**
 * Fetch a REST endpoint on the NestJS backend.
 * Automatically injects Authorization header and constructs the full URL.
 *
 * @param path  — e.g. "/api/v1/media/export"
 */
export async function restFetch(path: string, options: RestFetchOptions = {}): Promise<Response> {
    const base = getBackendBase();
    const url = base ? `${base}${path}` : path;
    const token = GraphQL._tokenResolver?.() ?? null;

    const headers: Record<string, string> = {
        ...(options.body && !(options.body instanceof FormData)
            ? { 'Content-Type': 'application/json' }
            : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers ?? {}),
    };

    return fetch(url, {
        method: options.method ?? 'POST',
        headers,
        credentials: 'include',
        ...(options.body !== undefined
            ? { body: options.body instanceof FormData ? options.body : JSON.stringify(options.body) }
            : {}),
    });
}

/** Download a file from the backend REST API (returns Blob) */
export async function restDownload(
    path: string,
    body: unknown,
    filename: string,
): Promise<void> {
    const resp = await restFetch(path, { body });
    if (!resp.ok) {
        const text = await resp.text().catch(() => `HTTP ${resp.status}`);
        throw new Error(text);
    }
    const blob = await resp.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
}
