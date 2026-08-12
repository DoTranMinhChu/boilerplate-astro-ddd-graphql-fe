// src/modules/cms/node/primitives/FrameNode.tsx
import type { NodeComponentProps } from '../nodeRegistry';
import { applyNodeStyle } from '../applyNodeStyle';
import { applyContainerLayout } from '../applyNodeLayout';
import { NodeChildrenList } from '../NodeRenderer';
import type { ELayoutMode } from '../node.constants';

/** `style`/`layoutMode` là field JSON/enum nullable ở tầng codegen (mọi field NodeDTO
 * đều `T | undefined`, xem comment ở applyNodeLayout.test.ts) — `?? {}`/cast +
 * fallback `'flow'` ở đây theo đúng convention buildNodeTree.ts đã dùng, KHÔNG đổi lại
 * node.types.ts (field không phải JSONB, không thuộc phạm vi override ở đó).
 *
 * Phase 0 M2a: `props.asLink=true` biến Frame thành thẻ <a> tới `context.contextHref`
 * (URL trang Chi tiết của contextEntry hiện tại, do repeat cha có `linkToDetail:true` gắn
 * vào — xem nodeDataBinding.ts/resolveRenderableChildren.ts) — dùng cho "thẻ card" trong
 * lưới CONTENT_GRID/RELATED_ENTRIES/MIXED_FEED/BACKLINK_ENTRIES, thay hẳn <div> nếu không
 * phải context repeat-có-link (contextHref undefined) thì vẫn render <div> như trước, không
 * đổi hành vi cho MỌI Frame khác trong hệ thống. */
export function FrameNode(props: NodeComponentProps) {
    const style = () => ({ ...applyContainerLayout(props.node), ...applyNodeStyle(props.node.style ?? {}) });
    const isLink = () => props.node.props?.asLink === true && !!props.context.contextHref;

    return isLink() ? (
        <a href={props.context.contextHref} style={style()}>
            <NodeChildrenList children={props.node.children} context={props.context} parentLayoutMode={(props.node.layoutMode as ELayoutMode | undefined) ?? 'flow'} />
        </a>
    ) : (
        <div style={style()}>
            <NodeChildrenList children={props.node.children} context={props.context} parentLayoutMode={(props.node.layoutMode as ELayoutMode | undefined) ?? 'flow'} />
        </div>
    );
}
