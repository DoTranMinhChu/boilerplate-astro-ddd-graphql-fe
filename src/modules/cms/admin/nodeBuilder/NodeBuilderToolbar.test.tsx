// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@solidjs/testing-library';
import { NodeBuilderToolbar } from './NodeBuilderToolbar';
import { t } from '@/shared/i18n/t';

const baseProps = {
    canUndo: true,
    canRedo: false,
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    gridSnapEnabled: true,
    onToggleGridSnap: vi.fn(),
    onOpenHistory: vi.fn(),
    breakpoint: 'desktop' as const,
    onBreakpointChange: vi.fn(),
    effectsRevealed: false,
    onToggleEffects: vi.fn(),
    canSaveAsComponent: true,
    onSaveAsComponent: vi.fn(),
};

// Component System, Task 14 — "Save as Component" toolbar button. Its title comes from
// `tOrLiteral('cms.component.saveAsComponentButton')` (NOT `t()` — that namespace's keys
// don't exist yet, same established convention as NodeContentTab.test.tsx's
// `TOGGLE_TEXT`/Task 13). Per `src/shared/i18n/t.ts`'s `resolve()`, a missing key falls
// back to the literal key string itself, so assert against that literal.
const SAVE_AS_COMPONENT_BUTTON_TITLE = 'cms.component.saveAsComponentButton';

describe('NodeBuilderToolbar', () => {
    it('disables Redo when canRedo=false and enables Undo when canUndo=true', () => {
        const { getAllByRole } = render(() => <NodeBuilderToolbar {...baseProps} />);
        const buttons = getAllByRole('button');
        const undoBtn = buttons.find((b) => b.title === t('cms.nodeBuilder.undoButtonTooltip'));
        const redoBtn = buttons.find((b) => b.title === t('cms.nodeBuilder.redoButtonTooltip'));
        expect(undoBtn).toBeTruthy();
        expect(redoBtn).toBeTruthy();
        expect((undoBtn as HTMLButtonElement).disabled).toBe(false);
        expect((redoBtn as HTMLButtonElement).disabled).toBe(true);
    });

    // Fixed from the brief's version: the original test clicked a
    // position-guessed button (`buttons[buttons.length - 4]`, commented
    // "stable-ish") and never asserted anything about onUndo/onRedo being
    // called — it would pass even if undo/redo were completely broken. This
    // version locates the real Undo/Redo buttons by their accessible name
    // (the `title` NodeBuilderToolbar actually sets) and asserts each
    // handler fires exactly once on click.
    it('calls onUndo when the Undo button is clicked and onRedo when the Redo button is clicked', async () => {
        const onUndo = vi.fn();
        const onRedo = vi.fn();
        const { getAllByRole } = render(() => <NodeBuilderToolbar {...baseProps} onUndo={onUndo} onRedo={onRedo} canRedo />);
        const buttons = getAllByRole('button');
        const undoBtn = buttons.find((b) => b.title === t('cms.nodeBuilder.undoButtonTooltip'))!;
        const redoBtn = buttons.find((b) => b.title === t('cms.nodeBuilder.redoButtonTooltip'))!;
        expect(undoBtn).toBeTruthy();
        expect(redoBtn).toBeTruthy();

        await fireEvent.click(undoBtn);
        expect(onUndo).toHaveBeenCalledTimes(1);
        expect(onRedo).not.toHaveBeenCalled();

        await fireEvent.click(redoBtn);
        expect(onRedo).toHaveBeenCalledTimes(1);
        expect(onUndo).toHaveBeenCalledTimes(1);
    });

    it('shows the historyLabel text when provided', () => {
        const { getByText } = render(() => <NodeBuilderToolbar {...baseProps} historyLabel="Move node" />);
        expect(getByText('Move node')).toBeTruthy();
    });

    it('does not render the history label span when historyLabel is omitted', () => {
        const { queryByText } = render(() => <NodeBuilderToolbar {...baseProps} historyLabel={undefined} />);
        expect(queryByText('Move node')).toBeNull();
    });

    // Fixed from the brief's version: the original test used a brittle
    // `getByText((c) => c.length > 0 && c === 'Di động' || c === 'Mobile')`
    // predicate that guessed at two possible label strings, neither of which
    // is actually correct. The real Vietnamese label — confirmed against the
    // existing switcher's dictionary entry at
    // `cms.node.responsive.mobile` in src/modules/cms/cms.i18n.ts — is
    // "Điện thoại". Asserting the real, known string via `t()` instead of
    // guessing makes this test both correct and immune to translation drift.
    it('calls onBreakpointChange with the clicked breakpoint via the segmented control', async () => {
        const onBreakpointChange = vi.fn();
        const { getByText } = render(() => <NodeBuilderToolbar {...baseProps} onBreakpointChange={onBreakpointChange} />);
        await fireEvent.click(getByText(t('cms.node.responsive.mobile')));
        expect(onBreakpointChange).toHaveBeenCalledWith('mobile');
    });

    it('calls onToggleGridSnap when the grid-snap button is clicked', async () => {
        const onToggleGridSnap = vi.fn();
        const { getAllByRole } = render(() => <NodeBuilderToolbar {...baseProps} onToggleGridSnap={onToggleGridSnap} />);
        const gridSnapBtn = getAllByRole('button').find((b) => b.getAttribute('aria-pressed') === 'true' && b.title.length > 0);
        expect(gridSnapBtn).toBeTruthy();
        await fireEvent.click(gridSnapBtn!);
        expect(onToggleGridSnap).toHaveBeenCalledTimes(1);
    });

    it('shows the "reveal" tooltip and calls onToggleEffects when effectsRevealed is false', async () => {
        const onToggleEffects = vi.fn();
        const { getAllByRole } = render(() => <NodeBuilderToolbar {...baseProps} effectsRevealed={false} onToggleEffects={onToggleEffects} />);
        const btn = getAllByRole('button').find((b) => b.title === t('cms.nodeBuilder.effectsRevealTooltip'))!;
        expect(btn).toBeTruthy();
        expect(btn.getAttribute('aria-pressed')).toBe('false');
        await fireEvent.click(btn);
        expect(onToggleEffects).toHaveBeenCalledTimes(1);
    });

    it('shows the "hide" tooltip and marks the button pressed when effectsRevealed is true', () => {
        const { getAllByRole } = render(() => <NodeBuilderToolbar {...baseProps} effectsRevealed={true} />);
        const btn = getAllByRole('button').find((b) => b.title === t('cms.nodeBuilder.effectsHideTooltip'))!;
        expect(btn).toBeTruthy();
        expect(btn.getAttribute('aria-pressed')).toBe('true');
    });
});

describe('NodeBuilderToolbar — Save as Component button (Component System)', () => {
    it('disables the Save-as-Component button when canSaveAsComponent is false', () => {
        const { getAllByRole } = render(() => <NodeBuilderToolbar {...baseProps} canSaveAsComponent={false} />);
        const btn = getAllByRole('button').find((b) => b.title === SAVE_AS_COMPONENT_BUTTON_TITLE)!;
        expect(btn).toBeTruthy();
        expect((btn as HTMLButtonElement).disabled).toBe(true);
    });

    it('enables the button and calls onSaveAsComponent on click when canSaveAsComponent is true', async () => {
        const onSaveAsComponent = vi.fn();
        const { getAllByRole } = render(() => <NodeBuilderToolbar {...baseProps} canSaveAsComponent={true} onSaveAsComponent={onSaveAsComponent} />);
        const btn = getAllByRole('button').find((b) => b.title === SAVE_AS_COMPONENT_BUTTON_TITLE)!;
        expect((btn as HTMLButtonElement).disabled).toBe(false);
        await fireEvent.click(btn);
        expect(onSaveAsComponent).toHaveBeenCalledTimes(1);
    });
});
