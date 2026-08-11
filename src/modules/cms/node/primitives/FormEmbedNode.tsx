// src/modules/cms/node/primitives/FormEmbedNode.tsx
import type { NodeComponentProps } from '../nodeRegistry';
import { FormSection } from '@/modules/cms/sections/FormSection';

/** `props.node.props.formId` giống hệt cách ESectionType.FORM section hiện tại lưu
 * `dataSource.formId` — đã đọc lại FormSection.tsx thật: nó đọc `section.dataSource?.formId`
 * (KHÔNG phải `content.formId` — sửa lại so với draft brief ban đầu để shim này chạy đúng).
 * Tái dùng nguyên FormSection cho logic load/submit, chỉ đổi lớp bọc từ Section sang Node.
 * Style/layout của khung bọc do NodeRenderer's applyChildLayout xử lý, FormEmbedNode
 * không tự bọc thêm div để tránh double-wrap. */
export function FormEmbedNode(props: NodeComponentProps) {
    return <FormSection section={{ id: props.node.id, type: 'form', order: props.node.order, enabled: true, dataSource: { formId: props.node.props?.formId } } as any} />;
}
