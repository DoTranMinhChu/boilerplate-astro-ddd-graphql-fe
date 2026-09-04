import { Show } from 'solid-js';
import { BaseIcon } from '@core/components/icon/BaseIcon';
import { mergeClass } from '@core/helpers/class';

/**
 * Hình dạng cấu hình hiển thị cho một giá trị enum.
 * Mọi module nên khai báo `Record<EEnum, EnumBadgeDisplay>` trong `<module>.constants.ts`
 * rồi render qua <EnumBadge> — sửa nhãn/màu một chỗ áp dụng toàn app.
 */
export interface EnumBadgeDisplay {
  label: string;
  bg: string;
  text: string;
  dot?: string;
  icon?: string;
  border?: string;
}

export interface EnumBadgeProps<T extends string> {
  /** Map enum-keyed: Record<EEnum, EnumBadgeDisplay> (constants.ts của module). */
  config: Record<T, EnumBadgeDisplay>;
  value?: T | null;
  /** Cấu hình fallback khi value rỗng/không khớp. */
  fallback?: EnumBadgeDisplay;
  size?: 'sm' | 'md';
  /** Ưu tiên hiển thị icon thay cho dot (nếu config có icon). */
  withIcon?: boolean;
  class?: string;
}

/**
 * Badge hiển thị giá trị enum theo cấu hình tập trung — KHÔNG hardcode chuỗi.
 * Dùng cho table column, card view, detail... thống nhất một nguồn từ core.
 */
export function EnumBadge<T extends string>(props: EnumBadgeProps<T>) {
  const cfg = (): EnumBadgeDisplay | undefined =>
    (props.value != null ? props.config[props.value] : undefined) ?? props.fallback;

  return (
    <Show when={cfg()}>
      {(c) => (
        <span
          class={mergeClass(
            'inline-flex items-center gap-1.5 font-bold rounded-full whitespace-nowrap',
            props.size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-[11px] px-2.5 py-1',
            c().bg,
            c().text,
            c().border ? `border ${c().border}` : '',
            props.class,
          )}
        >
          <Show
            when={props.withIcon && c().icon}
            fallback={
              <Show when={c().dot}>
                <span class={mergeClass('w-1.5 h-1.5 rounded-full shrink-0', c().dot)} />
              </Show>
            }
          >
            <BaseIcon name={c().icon!} class="w-3.5 h-3.5 shrink-0" />
          </Show>
          {c().label}
        </span>
      )}
    </Show>
  );
}
