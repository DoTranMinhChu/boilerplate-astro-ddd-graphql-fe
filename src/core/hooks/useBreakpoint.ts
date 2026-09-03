// @core/hooks/useBreakpoint.ts
//
// Primitive hook — toàn bộ hệ thống responsive xây trên đây.
// Không phụ thuộc bất kỳ component nào khác.
//
// Usage:
//   const { isMobile, isTablet, isDesktop, width } = useBreakpoint();

import { createSignal, onCleanup, onMount } from 'solid-js';

export const Breakpoint = { MOBILE: 'mobile', TABLET: 'tablet', DESKTOP: 'desktop' } as const;
export type Breakpoint = (typeof Breakpoint)[keyof typeof Breakpoint];

export function isBreakpoint(value: unknown): value is Breakpoint {
  return typeof value === 'string' && (Object.values(Breakpoint) as string[]).includes(value);
}

export interface BreakpointConfig {
  /** Dưới giá trị này = mobile. Default: 768 */
  mobileMax?: number;
  /** Dưới giá trị này = tablet. Default: 1024 */
  tabletMax?: number;
}

const DEFAULT_CONFIG: Required<BreakpointConfig> = {
  mobileMax: 768,
  tabletMax: 1024,
};

/** Canvas Editor v2, Task 20 — the SAME thresholds DEFAULT_CONFIG uses, exported as a plain
 * object so the admin canvas's fixed-width preview container (NodeBuilder.page.tsx) can size
 * itself to EXACTLY the widths a real device at each breakpoint would report, instead of an
 * independently-hardcoded 375/768 pair that could silently drift out of sync with this file. */
export const BREAKPOINT_WIDTHS = { mobile: DEFAULT_CONFIG.mobileMax, tablet: DEFAULT_CONFIG.tabletMax } as const;

export function useBreakpoint(config: BreakpointConfig = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // SSR-safe: fallback về desktop nếu không có window
  const getWidth = () =>
    typeof window !== 'undefined' ? window.innerWidth : cfg.tabletMax + 1;

  const [width, setWidth] = createSignal(getWidth());

  onMount(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler, { passive: true });
    onCleanup(() => window.removeEventListener('resize', handler));
  });

  const breakpoint = (): Breakpoint => {
    const w = width();
    if (w < cfg.mobileMax) return Breakpoint.MOBILE;
    if (w < cfg.tabletMax) return Breakpoint.TABLET;
    return Breakpoint.DESKTOP;
  };

  return {
    width,
    breakpoint,
    /** < mobileMax (default 768px) */
    isMobile: () => width() < cfg.mobileMax,
    /** >= mobileMax && < tabletMax */
    isTablet: () => width() >= cfg.mobileMax && width() < cfg.tabletMax,
    /** >= tabletMax (default 1024px) */
    isDesktop: () => width() >= cfg.tabletMax,
    /** Mobile hoặc tablet — dùng compact layout */
    isCompact: () => width() < cfg.tabletMax,
  };
}