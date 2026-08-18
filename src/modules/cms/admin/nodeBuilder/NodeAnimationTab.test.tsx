// src/modules/cms/admin/nodeBuilder/NodeAnimationTab.test.tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render } from '@solidjs/testing-library';
import { NodeAnimationTab } from './NodeAnimationTab';
import type { AnimationTimeline } from '@/modules/cms/node/animationTimeline.types';
import { t } from '@/shared/i18n/t';

describe('NodeAnimationTab drag-to-reorder (Node Builder Inspector Polish, Task 4)', () => {
    it('renders one drag handle per keyframe, no Move-up/Move-down buttons', () => {
        const timeline: AnimationTimeline = {
            trigger: 'onLoad',
            keyframes: [
                { id: 'kf-1', property: 'opacity', to: 1, duration: 0.8 },
                { id: 'kf-2', property: 'x', to: 0, duration: 0.8 },
            ],
        };
        const { getAllByRole, queryByText } = render(() => <NodeAnimationTab timeline={timeline} onChange={vi.fn()} />);
        expect(getAllByRole('button', { name: 'drag-handle' })).toHaveLength(2);
        expect(queryByText(t('cms.node.animation.moveUp'))).toBeNull();
        expect(queryByText(t('cms.node.animation.moveDown'))).toBeNull();
    });

    it('the Remove-step button still works per keyframe', () => {
        const timeline: AnimationTimeline = {
            trigger: 'onLoad',
            keyframes: [
                { id: 'kf-1', property: 'opacity', to: 1, duration: 0.8 },
                { id: 'kf-2', property: 'x', to: 0, duration: 0.8 },
            ],
        };
        const onChange = vi.fn();
        const { getAllByText } = render(() => <NodeAnimationTab timeline={timeline} onChange={onChange} />);
        const removeButtons = getAllByText(t('cms.node.animation.removeStep'));
        removeButtons[0].click();
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({ keyframes: [{ id: 'kf-2', property: 'x', to: 0, duration: 0.8 }] }),
        );
    });
});
