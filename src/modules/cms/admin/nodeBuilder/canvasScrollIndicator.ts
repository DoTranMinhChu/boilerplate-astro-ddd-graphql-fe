// Canvas Editor v2, Task 19 — pure logic backing the canvas's "where am I" chrome
// (back-to-top button visibility + scroll-position indicator fill), kept separate from
// NodeBuilder.page.tsx's JSX so it's unit-testable without a DOM scroll container.

/** True once scrolled past `threshold` px (default 400) — drives the back-to-top button. */
export function shouldShowBackToTop(scrollTop: number, threshold = 400): boolean {
    return scrollTop >= threshold;
}

/** Fraction (0-1) of how far scrolled through the scrollable range. 0 when there's no
 * scrollable overflow (scrollHeight <= clientHeight) instead of dividing by zero/negative. */
export function scrollProgress(scrollTop: number, scrollHeight: number, clientHeight: number): number {
    const range = scrollHeight - clientHeight;
    if (range <= 0) return 0;
    return Math.max(0, Math.min(1, scrollTop / range));
}

/** Final-review fix (Important #2): CSS `transform: translateY(<percent>)` resolves the
 * percentage against the THUMB's own height, not its containing track's height — at
 * `progress=1` the thumb (fixed `thumbHeightPx` tall) only ever moved `thumbHeightPx` down a
 * full-height track instead of traveling the track's whole length. `top` percentages, by
 * contrast, resolve against the containing block's height, so `calc((100% - thumbHeightPx) *
 * progress)` gives a `top` that ranges from exactly 0 (top of track) at `progress=0` to
 * exactly `track height - thumbHeightPx` at `progress=1` — the thumb's bottom edge lands flush
 * with the track's bottom edge instead of overflowing past it. Returns the raw CSS value
 * (a `calc()` expression) to assign directly to `style.top`; `progress` is expected already
 * clamped to 0-1 (as `scrollProgress` above guarantees). */
export function scrollThumbTopStyle(progress: number, thumbHeightPx: number): string {
    const clamped = Math.max(0, Math.min(1, progress));
    return `calc((100% - ${thumbHeightPx}px) * ${clamped})`;
}
