// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@solidjs/testing-library';
import { NodeAdvancedTab } from './NodeAdvancedTab';

// This suite queries by label (`getByLabelText`), which resolves `<label for>` → element id
// against the whole `document.body`. @solidjs/testing-library only auto-registers its own
// `afterEach(cleanup)` when vitest `globals` are on — they are NOT in this repo (every test
// imports `describe`/`it` explicitly), so without this each test would leave its DOM mounted and
// the next render would produce DUPLICATE `node-advanced-*` ids, silently breaking label
// resolution (a duplicate id makes every matching label point at the FIRST copy only).
afterEach(cleanup);

describe('NodeAdvancedTab', () => {
    it('renders Element/Accessibility/Developer sub-headings', () => {
        const { getByText } = render(() => <NodeAdvancedTab advanced={{}} onChange={vi.fn()} />);
        expect(getByText('Phần tử')).toBeTruthy();
        expect(getByText('Khả năng tiếp cận')).toBeTruthy();
        expect(getByText('Nhà phát triển')).toBeTruthy();
    });

    it('typing an HTML ID calls onChange with the merged advanced object', () => {
        const onChange = vi.fn();
        const { getByLabelText } = render(() => <NodeAdvancedTab advanced={{ cssClass: 'existing' }} onChange={onChange} />);
        fireEvent.input(getByLabelText('ID (HTML id)'), { target: { value: 'hero-cta' } });
        expect(onChange).toHaveBeenCalledWith({ cssClass: 'existing', htmlId: 'hero-cta' });
    });

    it('clearing a field writes undefined rather than an empty string', () => {
        const onChange = vi.fn();
        const { getByLabelText } = render(() => <NodeAdvancedTab advanced={{ htmlId: 'hero-cta' }} onChange={onChange} />);
        fireEvent.input(getByLabelText('ID (HTML id)'), { target: { value: '' } });
        expect(onChange).toHaveBeenCalledWith({ htmlId: undefined });
    });

    it('checking "Ẩn khỏi screen reader" sets ariaHidden true', () => {
        const onChange = vi.fn();
        const { getByText } = render(() => <NodeAdvancedTab advanced={{}} onChange={onChange} />);
        fireEvent.click(getByText('Ẩn khỏi screen reader'));
        expect(onChange).toHaveBeenCalledWith({ ariaHidden: true });
    });

    it('typing custom CSS calls onChange with customCss set', () => {
        const onChange = vi.fn();
        const { getByLabelText } = render(() => <NodeAdvancedTab advanced={{}} onChange={onChange} />);
        fireEvent.input(getByLabelText('CSS tuỳ chỉnh'), { target: { value: 'color: red;' } });
        expect(onChange).toHaveBeenCalledWith({ customCss: 'color: red;' });
    });

    it('renders every advanced field, on every node type (no capability gating inside the component)', () => {
        const { getByLabelText, getByText } = render(() => (
            <NodeAdvancedTab
                advanced={{ htmlId: 'a', cssClass: 'b', ariaLabel: 'c', ariaHidden: true, role: 'button', customCss: 'color: red;' }}
                onChange={vi.fn()}
            />
        ));
        expect((getByLabelText('ID (HTML id)') as HTMLInputElement).value).toBe('a');
        expect((getByLabelText('Lớp CSS tuỳ chỉnh') as HTMLInputElement).value).toBe('b');
        expect((getByLabelText('Nhãn cho screen reader (aria-label)') as HTMLInputElement).value).toBe('c');
        expect((getByLabelText('Vai trò (ARIA role)') as HTMLInputElement).value).toBe('button');
        expect((getByLabelText('CSS tuỳ chỉnh') as HTMLTextAreaElement).value).toBe('color: red;');
        expect(getByText('Ẩn khỏi screen reader')).toBeTruthy();
    });

    it('the Accessibility section reset clears only its own three fields', () => {
        const onChange = vi.fn();
        const { getAllByTitle } = render(() => (
            <NodeAdvancedTab advanced={{ htmlId: 'keep', ariaLabel: 'drop', ariaHidden: true, role: 'button' }} onChange={onChange} />
        ));
        // Element + Accessibility are both modified here → two reset buttons; [1] is Accessibility.
        fireEvent.click(getAllByTitle('Đặt lại')[1]);
        expect(onChange).toHaveBeenCalledWith({ htmlId: 'keep', ariaLabel: undefined, ariaHidden: undefined, role: undefined });
    });
});

/** Property Inspector Phase 4, Task 5 — `searchQuery` is threaded into all THREE
 * `InspectorSection`s this file renders (Phần tử / Khả năng tiếp cận / Nhà phát triển).
 * The "only the matching one survives" case is what proves each of the three got its own
 * `searchQuery={props.searchQuery}` forward. */
describe('NodeAdvancedTab — searchQuery threading (Phase 4, Task 5)', () => {
    it('hides all three sections when the query matches no title', () => {
        const { container } = render(() => (
            <NodeAdvancedTab advanced={{}} onChange={vi.fn()} searchQuery="zzz-khong-ton-tai" />
        ));
        expect(container.textContent).toBe('');
    });

    it('keeps only the Element section when the query is its title', () => {
        const { container } = render(() => (
            <NodeAdvancedTab advanced={{}} onChange={vi.fn()} searchQuery="Phần tử" />
        ));
        expect(container.textContent).toContain('Phần tử');
        expect(container.textContent).not.toContain('Khả năng tiếp cận');
        expect(container.textContent).not.toContain('Nhà phát triển');
    });

    it('renders every section again when the query is empty', () => {
        const { container } = render(() => (
            <NodeAdvancedTab advanced={{}} onChange={vi.fn()} searchQuery="" />
        ));
        expect(container.textContent).toContain('Phần tử');
        expect(container.textContent).toContain('Khả năng tiếp cận');
        expect(container.textContent).toContain('Nhà phát triển');
    });
});
