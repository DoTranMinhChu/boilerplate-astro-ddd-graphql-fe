import type { JSX } from 'solid-js';
import { mergeClass } from '@core/helpers/class';

export interface IconButtonProps {
    icon: JSX.Element;
    onClick?: (e: MouseEvent) => void;
    title?: string;
    active?: boolean;
    disabled?: boolean;
    size?: 'sm' | 'md';
    class?: string;
    'aria-label'?: string;
}

/** Square icon-only button (toolbar/segmented/inline use) — 36px default, 32px
 * `size="sm"`. `active` gives a persistent pressed look (grid-snap toggle,
 * spacing link/unlink) independent of hover/focus. */
export function IconButton(props: IconButtonProps) {
    return (
        <button
            type="button"
            title={props.title}
            aria-label={props['aria-label'] ?? props.title}
            aria-pressed={props.active}
            disabled={props.disabled}
            onClick={(e) => props.onClick?.(e)}
            class={mergeClass(
                'flex shrink-0 items-center justify-center rounded-nb-sm border border-transparent transition-colors',
                (props.size ?? 'md') === 'sm' && 'w-8 h-8',
                (props.size ?? 'md') === 'md' && 'w-9 h-9',
                props.active && 'bg-nb-accent/10 text-nb-accent border-nb-accent/30',
                !props.active && !props.disabled && 'text-nb-text-muted hover:bg-nb-bg-subtle hover:text-nb-text',
                props.disabled && 'opacity-40 pointer-events-none',
                props.class
            )}
        >
            {props.icon}
        </button>
    );
}
