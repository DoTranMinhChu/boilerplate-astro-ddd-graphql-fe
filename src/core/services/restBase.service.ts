// @core/services/restBase.service.ts
// ─────────────────────────────────────────────────────────────────────────────
// Base class cho tất cả REST API service.
// Tự động resolve BACKEND_URL giống GraphQL.backendUrl,
// hỗ trợ CRUD chuẩn + custom sub-routes.
//
// AUTH FLOW:
//   AuthProvider gọi RestBaseService.setDefaultHeaders(headers) sau khi login
//   — giống hệt GraphQL.setDefaultHeaders — để sync token cho cả GraphQL lẫn REST.
//   Hoặc gọi RestBaseService.setToken(token) riêng nếu muốn tách biệt.
//
// Cách dùng:
//   class DocumentExportService extends RestBaseService {
//     static basePath = 'v1/documentExport';
//
//     static export = (body: ExportOptions) =>
//       this.post<DownloadResult>('', body, { download: true });
//
//     static previewVariables = (templateId: string) =>
//       this.get<VariableDTO[]>(`variables/${templateId}`);
//   }
// ─────────────────────────────────────────────────────────────────────────────

import { getClientConfig } from '@core/helpers/config.client';
import { getServerConfig } from '@core/helpers/config.server';
import { baseConfig } from '@core/components/config/BaseConfig';

// ── File type registry ────────────────────────────────────────────────────────
//
// Map extension → MIME type.
// Dùng để:
//   1. Gợi ý đúng MIME khi tải file (browser hiển thị đúng icon/open-with)
//   2. Override Content-Type khi server trả sai MIME
//   3. Tự động bổ sung extension vào fileName nếu thiếu

export type FileExtension =
    | 'zip' | 'rar' | '7z'
    | 'docx' | 'doc' | 'odt'
    | 'xlsx' | 'xls' | 'ods' | 'csv'
    | 'pptx' | 'ppt'
    | 'pdf'
    | 'png' | 'jpg' | 'jpeg' | 'gif' | 'webp' | 'svg' | 'bmp'
    | 'mp4' | 'avi' | 'mov' | 'mkv'
    | 'mp3' | 'wav' | 'ogg'
    | 'txt' | 'md' | 'html' | 'json' | 'xml'
    | 'bin';

export const MIME_MAP: Record<FileExtension, string> = {
    // Archives
    zip: 'application/zip',
    rar: 'application/vnd.rar',
    '7z': 'application/x-7z-compressed',

    // Word
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    doc: 'application/msword',
    odt: 'application/vnd.oasis.opendocument.text',

    // Excel
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    xls: 'application/vnd.ms-excel',
    ods: 'application/vnd.oasis.opendocument.spreadsheet',
    csv: 'text/csv',

    // PowerPoint
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ppt: 'application/vnd.ms-powerpoint',

    // PDF
    pdf: 'application/pdf',

    // Images
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    bmp: 'image/bmp',

    // Video
    mp4: 'video/mp4',
    avi: 'video/x-msvideo',
    mov: 'video/quicktime',
    mkv: 'video/x-matroska',

    // Audio
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',

    // Text / Data
    txt: 'text/plain',
    md: 'text/markdown',
    html: 'text/html',
    json: 'application/json',
    xml: 'application/xml',

    // Fallback
    bin: 'application/octet-stream',
};

/**
 * Lấy MIME từ tên file (dựa vào extension).
 * Fallback về 'application/octet-stream' nếu không nhận ra.
 */
export function getMimeFromFileName(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase() as FileExtension | undefined;
    return ext ? (MIME_MAP[ext] ?? 'application/octet-stream') : 'application/octet-stream';
}

/**
 * Đảm bảo fileName có extension.
 * Nếu đã có extension thì giữ nguyên.
 * Nếu chưa có, bổ sung extension từ MIME của response (hoặc từ fileType chỉ định).
 */
export function ensureExtension(fileName: string, mimeOrExt?: string): string {
    if (!fileName) return fileName;

    // Nếu đã có dấu chấm + extension thì không làm gì
    const dotIndex = fileName.lastIndexOf('.');
    if (dotIndex > 0 && dotIndex < fileName.length - 1) return fileName;

    if (!mimeOrExt) return fileName;

    // Nếu mimeOrExt là extension thẳng (vd 'xlsx')
    if (!mimeOrExt.includes('/')) {
        return `${fileName}.${mimeOrExt.toLowerCase().replace(/^\./, '')}`;
    }

    // Nếu là MIME type, tìm extension tương ứng
    const entry = Object.entries(MIME_MAP).find(([, mime]) => mime === mimeOrExt);
    if (entry) return `${fileName}.${entry[0]}`;

    return fileName;
}

// ── Download options ──────────────────────────────────────────────────────────

export interface DownloadOptions {
    /**
     * Tên file muốn đặt khi download.
     * Nếu không truyền → dùng Content-Disposition từ server, fallback timestamp.
     *
     * @example 'bao-cao-2024.xlsx'
     * @example `export_${Date.now()}`  // extension sẽ tự bổ sung từ fileType
     */
    fileName?: string;

    /**
     * Loại file / extension muốn ép buộc.
     * Chấp nhận extension string ('xlsx', 'pdf') hoặc MIME type đầy đủ.
     * Dùng để:
     *   - Ghi đúng Content-Type lên Blob trước khi download
     *   - Tự động bổ sung extension vào fileName nếu thiếu
     *
     * @example 'xlsx'
     * @example 'application/pdf'
     */
    fileType?: FileExtension | string;

    /**
     * Nếu true, mở file trong tab mới thay vì download.
     * Hữu ích cho PDF, ảnh.
     */
    openInTab?: boolean;
}

// ── Option types ─────────────────────────────────────────────────────────────

export interface RestRequestOptions {
    /** Nếu true, response sẽ được trigger download thay vì trả về JSON */
    download?: boolean | DownloadOptions;
    /** Override headers cho request cụ thể */
    headers?: HeadersInit;
    /** Query string params */
    params?: Record<string, string | number | boolean | undefined | null>;
    /**
     * Nếu true, lỗi 401/403 sẽ không trigger setTokenExpired / setOutOfScope
     * (dùng cho login endpoint)
     */
    skipAuthError?: boolean;
}

export interface DownloadWarning {
    templateName: string;
    message: string;
}

export interface DownloadResult {
    success: boolean;
    /** Tên file thực tế đã được download (đã xử lý extension) */
    fileName: string;
    /** MIME type thực tế của file */
    mimeType: string;
    /** Kích thước blob (bytes) */
    fileSize: number;
    /**
     * Cảnh báo lỗi cục bộ (VD: 1 số template trong bộ mẫu lỗi nhưng các template
     * khác vẫn xuất thành công) — đọc từ header `X-Document-Export-Warnings`.
     * File vẫn tải về bình thường, nhưng UI nên hiện rõ các cảnh báo này cho user.
     */
    warnings?: DownloadWarning[];
}

// ── Internal helpers ──────────────────────────────────────────────────────────


// ── Service Class ─────────────────────────────────────────────────────────────

export abstract class RestBaseService {
    /** Override property này ở class con. VD: 'api/v1/users' */
    protected static basePath: string;

    // Resolver trả về JWT hiện tại — được AuthProvider wire về TokenManager.getActiveToken().
    // Authorization header được tính động theo activeType của tab, tránh race do mutate global.
    static _tokenResolver: () => string | null = () => null;
    // Parase 2: tenant đích khi tài khoản AGENCY tạo dữ liệu (header x-acting-tenant-id).
    static _actingTenantResolver: () => string | null = () => null;

    static setTokenResolver(fn: () => string | null): void {
        RestBaseService._tokenResolver = fn;
    }

    static setActingTenantResolver(fn: () => string | null): void {
        RestBaseService._actingTenantResolver = fn;
    }

    static get defaultHeaders(): Record<string, string> {
        const token = RestBaseService._tokenResolver();
        return {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };
    }

    /** Deprecated no-op: headers được resolve động qua _tokenResolver. */
    static setDefaultHeaders(_headers: HeadersInit): void {
        /* no-op */
    }

    /** Deprecated no-op: token được resolve động qua _tokenResolver. */
    static setToken(_token: string | null): void {
        /* no-op */
    }

    // ── Internal Core ─────────────────────────────────────────────────────────

    private static get baseUrl(): string {
        const origin = (typeof window === 'undefined')
            ? getServerConfig('BACKEND_URL')
            : getClientConfig('BACKEND_URL');

        if (!origin) console.warn('[RestBaseService] BACKEND_URL not found');
        if (!this.basePath) throw new Error(`[RestBaseService] ${this.name} missing static basePath`);

        return `${origin?.replace(/\/+$/, '')}/${this.basePath.replace(/^\/+/, '')}`;
    }

    /**
     * Xử lý Headers:
     * Quan trọng nhất: Nếu body là FormData -> XÓA Content-Type
     * để trình duyệt tự động set 'multipart/form-data; boundary=...'
     */
    private static _buildHeaders(body: unknown, overrides?: HeadersInit): Record<string, string> {
        const headers: Record<string, string> = {
            ...RestBaseService.defaultHeaders,
            ...(overrides as Record<string, string> ?? {}),
        };

        if (body instanceof FormData) {
            delete headers['Content-Type'];
        }

        return headers;
    }

    private static async _fetch<T>(
        method: string,
        path: string,
        body?: unknown,
        options?: RestRequestOptions
    ): Promise<T> {
        // 1. Build URL
        const cleanPath = path.replace(/^\/+/, '');
        let url = cleanPath ? `${this.baseUrl}/${cleanPath}` : this.baseUrl;

        if (options?.params) {
            const qs = new URLSearchParams();
            Object.entries(options.params).forEach(([k, v]) => {
                if (v !== undefined && v !== null) qs.append(k, String(v));
            });
            url += `?${qs.toString()}`;
        }

        // 2. Prepare Body & Headers
        const headers = this._buildHeaders(body, options?.headers);
        // Parase 2: acting-tenant CHỈ gắn cho thao tác GHI (non-GET) — đọc của agency
        // vẫn theo agencyId (oversight). Không đè nếu caller đã tự set.
        if (method.toUpperCase() !== 'GET' && !headers['x-acting-tenant-id']) {
            const actingTenant = RestBaseService._actingTenantResolver();
            if (actingTenant) headers['x-acting-tenant-id'] = actingTenant;
        }
        const finalBody = (body instanceof FormData)
            ? body
            : (body !== undefined ? JSON.stringify(body) : undefined);

        // 3. Execute Fetch
        const response = await fetch(url, {
            method,
            headers,
            body: finalBody as BodyInit,
        });

        // 4. Handle HTTP Errors
        if (!response.ok) {
            if (!options?.skipAuthError) {
                if (response.status === 401) baseConfig().setTokenExpired(true);
                if (response.status === 403) baseConfig().setOutOfScope(true);
            }

            let errorMessage = `HTTP ${response.status} ${response.statusText}`;
            try {
                const errorBody = await response.json();
                errorMessage = errorBody.message || errorBody.error || errorMessage;
            } catch { /* ignore non-json error */ }

            throw new Error(errorMessage);
        }

        // 5. Handle Download
        if (options?.download) {
            return this._handleDownload(response, options.download) as unknown as T;
        }

        // 6. Handle JSON / No Content
        if (response.status === 204) return undefined as unknown as T;
        const json = await response.json();
        // Auto-unwrap { success, data } envelope produced by RestRouterLoader
        if (json !== null && typeof json === 'object' && !Array.isArray(json)
            && Object.prototype.hasOwnProperty.call(json, 'success')
            && Object.prototype.hasOwnProperty.call(json, 'data')) {
            return json.data as T;
        }
        return json;
    }

    /** Helper xử lý download file từ response blob */
    private static async _handleDownload(response: Response, opts: boolean | { fileName?: string; fileType?: string; openInTab?: boolean }) {
        const downloadOpts = typeof opts === 'object' ? opts : {};

        // Đọc cảnh báo partial-fail (nếu server đính kèm) trước khi blob() —
        // header vẫn đọc được bình thường dù response đã/chưa consume body.
        let warnings: DownloadWarning[] | undefined;
        const warningsHeader = response.headers.get('X-Document-Export-Warnings');
        if (warningsHeader) {
            try {
                warnings = JSON.parse(decodeURIComponent(warningsHeader));
            } catch { /* header hỏng thì bỏ qua, không chặn download */ }
        }

        const blob = await response.blob();

        // Xác định filename từ Header hoặc Option
        let fileName = downloadOpts.fileName;
        if (!fileName) {
            const disposition = response.headers.get('Content-Disposition') || '';
            const match = disposition.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/);
            fileName = match ? decodeURIComponent(match[1] || match[2]) : `download_${Date.now()}`;
        }

        // Tạo thẻ A để click download
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;

        if (downloadOpts.openInTab) {
            a.target = '_blank';
        } else {
            a.download = fileName;
        }

        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        const result: DownloadResult = {
            success: true,
            fileName,
            mimeType: blob.type,
            fileSize: blob.size,
        };
        if (warnings?.length) result.warnings = warnings;
        return result;
    }

    // ── Public API Methods ────────────────────────────────────────────────────

    protected static get<T>(path = '', options?: RestRequestOptions): Promise<T> {
        return this._fetch<T>('GET', path, undefined, options);
    }

    protected static post<T>(path = '', body?: unknown, options?: RestRequestOptions): Promise<T> {
        return this._fetch<T>('POST', path, body, options);
    }

    protected static put<T>(path = '', body?: unknown, options?: RestRequestOptions): Promise<T> {
        return this._fetch<T>('PUT', path, body, options);
    }

    protected static patch<T>(path = '', body?: unknown, options?: RestRequestOptions): Promise<T> {
        return this._fetch<T>('PATCH', path, body, options);
    }

    protected static delete<T>(path = '', options?: RestRequestOptions): Promise<T> {
        return this._fetch<T>('DELETE', path, undefined, options);
    }

    /**
     * Helper upload nhanh: Tự tạo FormData.
     * @param fileKey Tên field trong form (vd: 'file', 'image')
     */
    protected static upload<T>(
        path: string,
        fileKey: string,
        files: File | File[],
        extraData?: Record<string, string | number>,
        options?: RestRequestOptions
    ): Promise<T> {
        const form = new FormData();
        const fileList = Array.isArray(files) ? files : [files];

        fileList.forEach(f => form.append(fileKey, f));

        if (extraData) {
            Object.entries(extraData).forEach(([k, v]) => form.append(k, String(v)));
        }

        return this.post<T>(path, form, options);
    }
}