import { describe, it, expect } from 'vitest';
import { NodeService } from '@shared/services/node/node.service';

describe('NodeService.fragment', () => {
    it('includes advanced so NodeDTO.advanced round-trips through every Node read', () => {
        // Gap fixed here: NodeAdvancedConfig (node.types.ts) and the BE `advanced` jsonb column
        // (ddd-graphql-be d15787b) existed, but this fragment omitted `advanced`, so
        // getNodesByPage/createNode/updateNode/moveNode/duplicateNode never returned it and
        // props.node.advanced was undefined at runtime no matter what was saved.
        const fieldNames = NodeService.fragment.map((f) => f.name);
        expect(fieldNames).toContain('advanced');
    });
});
