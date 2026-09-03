import { describe, it, expect } from 'vitest';
import { snapToGrid, computeSiblingSnap, Rect } from '@modules/cms/node/commands/snapMath';

describe('snapToGrid', () => {
    it('rounds to the nearest multiple of gridSize', () => {
        expect(snapToGrid(13, 8)).toBe(16);
        expect(snapToGrid(11, 8)).toBe(8);
        expect(snapToGrid(0, 8)).toBe(0);
        expect(snapToGrid(-13, 8)).toBe(-16);
    });
});

function rect(left: number, top: number, right: number, bottom: number): Rect {
    return { left, top, right, bottom, centerX: (left + right) / 2, centerY: (top + bottom) / 2 };
}

describe('computeSiblingSnap', () => {
    it('snaps left edge to a sibling left edge within threshold', () => {
        const drag = rect(102, 50, 202, 150);
        const sibling = rect(100, 300, 200, 400);
        const result = computeSiblingSnap(drag, [sibling], 4);
        expect(result.x).toBe(100);
        expect(result.guideX).toBe(100);
    });
    it('does not snap when outside threshold', () => {
        const drag = rect(110, 50, 210, 150);
        const sibling = rect(100, 300, 200, 400);
        const result = computeSiblingSnap(drag, [sibling], 4);
        expect(result.x).toBeUndefined();
    });
    it('snaps center to sibling center', () => {
        const drag = rect(148, 50, 252, 150); // centerX = 200
        const sibling = rect(150, 300, 250, 400); // centerX = 200
        const result = computeSiblingSnap(drag, [sibling], 4);
        expect(result.x).toBeDefined();
    });
    it('snaps y axis independently of x axis', () => {
        const drag = rect(500, 102, 600, 202);
        const sibling = rect(100, 100, 200, 200);
        const result = computeSiblingSnap(drag, [sibling], 4);
        expect(result.y).toBe(100);
        expect(result.x).toBeUndefined();
    });
    it('picks the closest sibling when multiple are within threshold', () => {
        const drag = rect(101, 50, 201, 150);
        const siblingFar = rect(105, 300, 205, 400);
        const siblingClose = rect(100, 500, 200, 600);
        const result = computeSiblingSnap(drag, [siblingFar, siblingClose], 4);
        expect(result.x).toBe(100);
    });
});
