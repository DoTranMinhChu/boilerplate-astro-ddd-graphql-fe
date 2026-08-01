// @core/hooks/useBreakpoint.ts
//
// Primitive hook — toàn bộ hệ thống responsive xây trên đây.
// Không phụ thuộc bất kỳ component nào khác.
//
// Usage:
//   const { isMobile, isTablet, isDesktop, width } = useBreakpoint();

import { createSignal, onCleanup, onMount } from 'solid-js';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

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
    if (w < cfg.mobileMax) return 'mobile';
    if (w < cfg.tabletMax) return 'tablet';
    return 'desktop';
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