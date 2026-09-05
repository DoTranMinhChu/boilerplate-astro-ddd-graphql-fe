// @vitest-environment jsdom
//
// Regression coverage for Bug A (Task 14 follow-up, commit 24350cf — "fix(cms): fix
// enabledModes double-toggle + array corruption"). Toggle's outer div's `onClick` handler
// never called `event.preventDefault()`, so every `<label><Toggle/></label>` usage (view-
// mode/form-mode/searchable checkboxes in manageContentTypes.page.tsx) fired `toggle()`
// twice per click: once for the user's real click, and once more for the SECOND, synthetic
// click event the browser dispatches on the label's associated control (the hidden
// `<input type="checkbox">`) as part of native label->control click-forwarding — which also
// bubbles back through the same outer div. The two toggles cancel out. Fixed by calling
// `event.preventDefault()` before `toggle()`, which suppresses that forwarding at the source.
//
// ----------------------------------------------------------------------------------------
// FEASIBILITY FINDING (per review request) — a realistic "<label><Toggle/></label>, one
// simulated click, assert onChange fired exactly once" behavioral test is NOT reliable in
// jsdom for this specific component, and was deliberately NOT written here. Investigated and
// confirmed via a systematic bisection of throwaway probe scripts (9 variants) before writing
// this file:
//
//   - jsdom's `HTMLLabelElementImpl._activationBehavior`
//     (node_modules/jsdom/lib/jsdom/living/nodes/HTMLLabelElement-impl.js) walks the
//     ancestors of the click event's target, up to (not including) the `<label>`, and does
//     NOTHING (no forwarded click at all) if ANY of those ancestors satisfies
//     `isInteractiveContent(ancestor)`.
//   - `isInteractiveContent` (node_modules/jsdom/lib/jsdom/living/helpers/form-controls.js)
//     returns `true` for ANY element that simply HAS a `tabindex` ATTRIBUTE present — value
//     irrelevant, "0" and "-1" both count.
//   - Toggle's outer div ALWAYS carries a `tabindex` attribute by design, for Enter-key
//     accessibility: `tabIndex={props.skipTabIndex || readOnly() ? -1 : 0}` — there is no
//     prop combination that removes it. That means in jsdom, ANY click whose path from
//     target up to a wrapping `<label>` passes through (or lands on) this div NEVER reaches
//     jsdom's native forwarding step, regardless of whether `preventDefault()` is called —
//     confirmed empirically: a first draft of this file wrapping `<Toggle text="...">` in a
//     real `<label>` and clicking the text (rendered inside Toggle's own div) passed
//     (`onChange` called exactly once) with the fix applied AND, unchanged, after locally
//     reverting the `preventDefault()` line — a fake-green test that cannot detect this
//     regression, exactly what the review asked NOT to ship. It was discarded rather than
//     committed.
//   - This is a jsdom-specific implementation detail of the label activation-behavior spec,
//     not a statement about real browsers: the bug was live-verified as real in an actual
//     Chromium session via Playwright MCP (see the commit message), so real browsers do
//     forward the click here despite the tabindex — jsdom's `isInteractiveContent` heuristic
//     is simply broader than that. `@testing-library/user-event` is not installed in this
//     project, but would not help either way: any click delivery mechanism (`.click()`,
//     dispatchEvent, or user-event) runs through the same jsdom dispatch algorithm and the
//     same `_activationBehavior` gate — there is no path around it.
//
// What IS verified below instead: the actual code-level effect of the fix — that Toggle's
// outer div's click handler calls `event.preventDefault()` before toggling. This is real
// (not mocked) behavior verification of the exact line the fix added: reverting it flips
// `event.defaultPrevented` back to `false` and this test fails (see
// task14-fix-tests-report.md for the red/green confirmation). It does not re-prove the
// native forwarding mechanics themselves (jsdom cannot exercise those here, as shown above;
// that mechanism was already live-verified once, per the commit message), but it does lock
// in the one line a future refactor is most likely to accidentally drop.
import { describe, it, expect, vi } from 'vitest';
import { render } from '@solidjs/testing-library';
import { Toggle } from '@core/components/control/Toggle';

describe('Toggle — outer div calls preventDefault() on click (Bug A fix lock-in)', () => {
    it('marks the click event defaultPrevented — the exact mechanism the fix relies on to suppress native label click-forwarding at the source', () => {
        const { container } = render(() => <Toggle value={false} onChange={vi.fn()} fieldless />);
        const outerDiv = container.querySelector('div')!;
        const event = new MouseEvent('click', { bubbles: true, cancelable: true });
        outerDiv.dispatchEvent(event);
        expect(event.defaultPrevented).toBe(true);
    });

    it('still calls onChange normally (the fix does not block the toggle itself, only the label default action)', () => {
        const onChange = vi.fn();
        const { container } = render(() => <Toggle value={false} onChange={onChange} fieldless />);
        const outerDiv = container.querySelector('div')!;
        outerDiv.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenCalledWith(true);
    });
});
