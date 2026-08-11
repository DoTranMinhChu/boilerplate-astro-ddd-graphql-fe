// src/modules/cms/node/nodeTreeFlag.ts
// Feature flag gating whether the new Node-Tree renders on the public site.
// Default off (see CMS_NODE_TREE_ENABLED=false in .env / .env.example) so Task 23
// can wire in the renderer without changing today's behavior until this flips on.

import { getClientConfig } from '@core/helpers/config.client';
import { getServerConfig } from '@core/helpers/config.server';

export function isNodeTreeEnabled(): boolean {
    const raw = import.meta.env.SSR
        ? getServerConfig('CMS_NODE_TREE_ENABLED')
        : getClientConfig('CMS_NODE_TREE_ENABLED');
    return raw === 'true';
}
