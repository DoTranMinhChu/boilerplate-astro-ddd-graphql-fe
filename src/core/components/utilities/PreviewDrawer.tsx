import { createSignal } from 'solid-js';
import { Button } from '@core/components/button/Button';
import { Dialog } from '@core/components/dialog/Dialog';
import { mergeClass } from '@core/helpers/class';
import { generateId } from '@core/helpers/util';

export interface PreviewDrawerProps {
    title: string;
    triggerLabel: string;
    children: JSX.Element;
    class?: string;
}

/** Thin, named wrapper around the existing `Dialog`/`Modal` (`position="right"`, `mode="sub"` —
 * a secondary panel stacked on top of the `Datatable.Formlog` edit modal each of Theme/Header/
 * Footer already opens) — NOT a new modal primitive. `ModalProvider.openModal` only actually
 * treats a `mode:"sub"` request as a sub-modal when a main modal is already open (see
 * `ModalProvider.tsx`'s `openModal` — otherwise it falls back to `mainModals`), which is exactly
 * this component's only real usage: inside an already-open `Datatable.Formlog` edit modal.
 *
 * Fixes the repeated "preview panel" call pattern in one place so all 3 admin pages
 * (Theme/Header/Footer) open their preview identically, and a future style change to "how
 * previews look" happens in 1 place — same spirit as `ColorControl` centralizing color-picking. */
export function PreviewDrawer(props: PreviewDrawerProps) {
    const [open, setOpen] = createSignal(false);
    // `Modal.tsx` falls back to `generateId()` internally ONLY for the id it uses to match
    // itself against the modal store (`isRendered()`/`modalContentEl()`) — but the STORE ENTRY
    // itself (`modalOptions()`) is built by spreading `props.id` verbatim, not that computed
    // fallback. Omitting `id` therefore pushes `{id: undefined, ...}` into the store while the
    // component keeps comparing against its own real generated id, so `undefined !== id` forever
    // and the dialog's content silently never renders (confirmed via this component's own test —
    // `activeModal()` reached `isOpen:true` with the overlay/transition classes fully animated
    // in, yet `#MainModalContentWrapper` stayed permanently empty). Every real `<Dialog>`/`<Modal>`
    // call site in this codebase already passes an explicit `id` for this reason (e.g.
    // `PageDataBindingModal.tsx`'s `id="PageDataBindingModal"`) — passing one here too, generated
    // once per `PreviewDrawer` instance, is required, not optional.
    const id = generateId();
    return (
        <>
            <Button outline onClick={() => setOpen(true)}>
                {props.triggerLabel}
            </Button>
            <Dialog
                id={id}
                isOpen={open()}
                onClose={() => setOpen(false)}
                mode="sub"
                position="right"
                class={mergeClass('w-full sm:w-[480px]', props.class)}
            >
                <Dialog.Header title={props.title} />
                <Dialog.Body>{props.children}</Dialog.Body>
            </Dialog>
        </>
    );
}
