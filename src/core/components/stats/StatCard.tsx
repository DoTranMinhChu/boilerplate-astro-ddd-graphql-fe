import { Show } from 'solid-js';
import { mergeClass } from '@core/helpers/class';
import { Icon } from '@shared/components/icons/Icon';

export interface StatCardProps {
  icon: string;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string | number;
  sub?: string;
  highlight?: boolean;
  class?: string;
  onClick?: () => void;
}

export function StatCard(props: StatCardProps) {
  return (
    <div
      class={mergeClass(
        'bg-white rounded-2xl border border-slate-100 shadow-sm p-4',
        'flex items-start gap-3.5 transition-shadow',
        props.onClick ? 'cursor-pointer hover:shadow-md' : '',
        props.highlight ? 'ring-2 ring-emerald-400/40' : '',
        props.class,
      )}
      onClick={props.onClick}
    >
      <div class={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${props.iconBg}`}>
        <Icon name={props.icon} class={`w-5 h-5 ${props.iconColor}`} />
      </div>
      <div class="min-w-0 flex-1">
        <div class="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">{props.label}</div>
        <div class="text-2xl font-bold text-slate-800 leading-none">{props.value}</div>
        <Show when={props.sub}>
          <div class="text-xs text-slate-400 mt-1 leading-snug">{props.sub}</div>
        </Show>
      </div>
    </div>
  );
}
