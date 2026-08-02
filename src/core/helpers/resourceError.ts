import { Resource, createEffect } from 'solid-js';
import { toast } from '@core/components/toast/ToastProvider';

/**
 * Surfaces a createResource() load failure as a toast instead of silently falling
 * through to whatever "empty" UI the page renders when the resource has no data.
 * Without this, a failed fetch (auth expiry, network blip, server error) looks
 * IDENTICAL to "there's genuinely nothing here" — the exact bug class that makes
 * production issues invisible until a user reports "my data disappeared".
 *
 * Usage: right after a createResource() call —
 *   const [tenant] = createResource(() => id(), TenantService.getOneTenant);
 *   notifyResourceError(tenant, 'Không tải được thông tin đơn vị.');
 */
export function notifyResourceError(resource: Resource<unknown>, message: string): void {
    createEffect(() => {
        if (resource.error) {
            toast().danger(message);
        }
    });
}
