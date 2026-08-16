// src/modules/cms/node/commands/rotationMath.ts
/** Normalizes a rotation angle in degrees to the [-180, 180] range via modulo.
 * Shared between NodeTransformTab.tsx (Phase 1b numeric field) and the M1c
 * canvas rotate handle — do not duplicate this logic in either consumer. */
export function normalizeRotation(deg: number): number {
    let normalized = deg % 360;
    if (normalized > 180) normalized -= 360;
    if (normalized < -180) normalized += 360;
    // deg % 360 can yield -0 for negative multiples of 360 (e.g. -360 % 360 === -0
    // in JS); coerce to +0 so callers/tests comparing with Object.is (toBe) don't
    // see a spurious -0 vs 0 mismatch.
    return normalized === 0 ? 0 : normalized;
}
