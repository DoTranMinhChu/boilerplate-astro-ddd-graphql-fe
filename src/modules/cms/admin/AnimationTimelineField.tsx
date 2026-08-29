// src/modules/cms/admin/AnimationTimelineField.tsx
//
// Motion System Unification (Task 10) — replaces `AnimationLayerArrayInput` (bespoke UI
// tied to the now-fully-deleted legacy `AnimationLayer` system) with the Node Builder
// Inspector's `NodeAnimationTab`, confirmed general-purpose/reusable verbatim.
//
// `NodeAnimationTab` is a plain controlled component (`{timeline?, onChange}`), NOT built
// on `createControl`/`FieldContext` the way this codebase's other custom `Datatable.Field`
// children are (see `AnimationLayerArrayInput`'s/`TwoFieldListInput`'s own
// `createControl(type, {})` call). `Field.tsx` only renders `props.children` as plain JSX
// (no render-prop) and only includes a field's value in the submitted payload once
// something calls `field.registerControl(...)` (see `generateForm.tsx`'s `submitValues()`,
// which iterates registered `fields()` only) — so this thin adapter is required to bridge
// the two contracts, same convention as every other non-`createControl`-native custom
// control in this codebase.
import { createControl } from '@core/components/control/createControl';
import { NodeAnimationTab } from '@/modules/cms/admin/nodeBuilder/NodeAnimationTab';
import type { AnimationTimeline } from '@/modules/cms/node/animationTimeline.types';

export function AnimationTimelineField() {
    const { value, onChange } = createControl<AnimationTimeline>('object', {});
    return <NodeAnimationTab timeline={value() ?? undefined} onChange={onChange} />;
}
