import type { ListViewConfig, ViewMode, FieldDefinitionDTO } from '@/modules/cms/cms.types';
import { getAvailableViewModes } from './dataWorkspaceConfig';

/** Content type cũ (listViewConfig null) hoặc field ảnh vừa bị xoá sau khi cấu hình Gallery -
 * cả 2 trường hợp phải fallback về Table, không throw, không hiện mode rỗng (mục "Ràng buộc"
 * + mục C design). `modes` luôn có ít nhất 'table'. */
export function resolveActiveViewModes(
    listViewConfig: ListViewConfig | undefined,
    fields: FieldDefinitionDTO[],
): { modes: ViewMode[]; initialMode: ViewMode } {
    const available = getAvailableViewModes(fields);
    const configuredModes = listViewConfig?.enabledModes?.length ? listViewConfig.enabledModes : ['table'];
    let modes = configuredModes.filter((m) => available.includes(m));
    if (!modes.includes('table')) modes = ['table', ...modes];

    const requestedDefault = listViewConfig?.defaultMode;
    const initialMode = requestedDefault && modes.includes(requestedDefault) ? requestedDefault : modes[0];

    return { modes, initialMode };
}
