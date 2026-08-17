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
