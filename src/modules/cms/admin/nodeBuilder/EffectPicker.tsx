// src/modules/cms/admin/nodeBuilder/EffectPicker.tsx
//
// Property Inspector redesign, Phase 2 — the visual card grid that replaces
// NodeAnimationTab.tsx's old flat row of chip buttons. Purely presentational: it owns no
// state, reads its entries from EFFECT_REGISTRY (the single source of truth added in Task 1)
// and hands the picked effect's `defaults` keyframe straight back to its caller.
import { For } from 'solid-js';
import { EffectCard } from './EffectCard';
import { EFFECT_REGISTRY } from '@/modules/cms/node/effectRegistry';
import type { AnimationKeyframe } from '@/modules/cms/node/animationTimeline.types';

export interface EffectPickerProps {
    onSelect: (defaults: Omit<AnimationKeyframe, 'id'>) => void;
}

export function EffectPicker(props: EffectPickerProps) {
    return (
        <div class="grid grid-cols-2 gap-2">
            <For each={EFFECT_REGISTRY}>
                {(effect) => <EffectCard effect={effect} onSelect={() => props.onSelect(effect.defaults)} />}
            </For>
        </div>
    );
}
