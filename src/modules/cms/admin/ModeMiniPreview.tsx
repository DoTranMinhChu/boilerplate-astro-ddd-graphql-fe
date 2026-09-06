// Fix round mục C — small static diagram shown inside each mode-picker option (view mode / form
// mode), replacing a plain checkbox+text row. Plain absolutely-positioned <div>s, no image
// assets, no animation library — this codebase's own "hand-rolled UI kit, no external
// dependency" convention. NOT EffectCard.tsx's GSAP hover-preview mechanism: that previews a
// literal ANIMATION on a real demo node, which has no equivalent for "what does a layout look
// like" — a pattern mismatch, not a reuse opportunity.
import type { ViewMode, FormMode } from '@/modules/cms/cms.types';

export type ModeMiniPreviewKind = ViewMode | FormMode;

export interface ModeMiniPreviewProps {
    kind: ModeMiniPreviewKind;
}

const bar = (top: number, width: number = 100) => (
    <div class="absolute left-0 h-1.5 rounded-full bg-neutral-300" style={{ top: `${top}px`, width: `${width}%` }} />
);
const square = (left: number, top: number, size: number, bg = 'bg-neutral-300') => (
    <div class={`absolute rounded-sm ${bg}`} style={{ left: `${left}px`, top: `${top}px`, width: `${size}px`, height: `${size}px` }} />
);

function TablePreview() {
    return <>{bar(4)}{bar(16)}{bar(28)}</>;
}
function CardPreview() {
    return <>{square(20, 2, 24, 'bg-neutral-300')}<div class="absolute left-4 top-[30px] h-1 w-14 rounded-full bg-neutral-300" /><div class="absolute left-4 top-[36px] h-1 w-10 rounded-full bg-neutral-200" /></>;
}
function ListPreview() {
    return (
        <>
            {[3, 16, 29].map((top) => (
                <>
                    {square(2, top, 8)}
                    <div class="absolute left-[14px] h-1 w-12 rounded-full bg-neutral-300" style={{ top: `${top + 3}px` }} />
                </>
            ))}
        </>
    );
}
function GridPreview() {
    const cells = [0, 1, 2, 3, 4, 5];
    return <>{cells.map((i) => square(2 + (i % 3) * 22, 2 + Math.floor(i / 3) * 20, 16))}</>;
}
function GalleryPreview() {
    const cells = [0, 1, 2, 3];
    return <>{cells.map((i) => square(2 + (i % 2) * 34, 2 + Math.floor(i / 2) * 20, 30))}</>;
}
function KanbanPreview() {
    return <>{[2, 26, 50].map((left) => <div class="absolute top-0 h-full w-5 rounded-sm bg-neutral-200" style={{ left: `${left}px` }} />)}</>;
}
function DialogPreview() {
    return <div class="absolute inset-0 flex items-center justify-center"><div class="h-6 w-10 rounded-sm border-2 border-neutral-300 bg-neutral-50" /></div>;
}
function DrawerPreview() {
    return <div class="absolute inset-y-0 right-0 w-6 rounded-sm border-2 border-neutral-300 bg-neutral-50" />;
}
function FullPagePreview() {
    return <div class="absolute inset-0 rounded-sm border-2 border-neutral-300 bg-neutral-50" />;
}

const PREVIEWS: Record<ModeMiniPreviewKind, () => any> = {
    table: TablePreview, card: CardPreview, list: ListPreview, grid: GridPreview, gallery: GalleryPreview, kanban: KanbanPreview,
    dialog: DialogPreview, drawer: DrawerPreview, fullPage: FullPagePreview,
};

export function ModeMiniPreview(props: ModeMiniPreviewProps) {
    const Shape = () => PREVIEWS[props.kind]();
    return (
        <div data-mode-preview class="relative h-10 w-16 shrink-0 overflow-hidden rounded-md border border-neutral-200 bg-white">
            <Shape />
        </div>
    );
}
