// src/modules/cms/node/commands/snapMath.ts
/** Pure geometry helpers for M1c's grid-snap and sibling-snap during
 * canvas drag/resize. No DOM access — callers pass plain Rects computed
 * from the dragged node's live x/y/width/height and its siblings' current
 * layout values (NOT getBoundingClientRect — see NodeCanvasOverlay.tsx's
 * design note on why layout-space, not screen-space, math is used here). */

export interface Rect {
    left: number;
    top: number;
    right: number;
    bottom: number;
    centerX: number;
    centerY: number;
}

export function snapToGrid(value: number, gridSize: number): number {
    return Math.round(value / gridSize) * gridSize;
}

export interface SnapResult {
    x?: number;
    y?: number;
    guideX?: number;
    guideY?: number;
}

interface AxisCandidate {
    dragValue: number;
    siblingValue: number;
}

// Returns the candidate whose dragValue/siblingValue delta is smallest and
// <= threshold, or undefined if no candidate qualifies. Ties keep the first
// candidate encountered (siblings/anchors are scanned in a fixed order, so
// this is deterministic).
function closestWithinThreshold(candidates: AxisCandidate[], threshold: number): AxisCandidate | undefined {
    let best: AxisCandidate | undefined;
    let bestDelta = Infinity;
    for (const c of candidates) {
        const delta = Math.abs(c.dragValue - c.siblingValue);
        if (delta <= threshold && delta < bestDelta) {
            best = c;
            bestDelta = delta;
        }
    }
    return best;
}

export function computeSiblingSnap(dragRect: Rect, siblingRects: Rect[], threshold: number): SnapResult {
    const xCandidates: AxisCandidate[] = [];
    const yCandidates: AxisCandidate[] = [];
    for (const s of siblingRects) {
        xCandidates.push(
            { dragValue: dragRect.left, siblingValue: s.left },
            { dragValue: dragRect.right, siblingValue: s.right },
            { dragValue: dragRect.centerX, siblingValue: s.centerX },
        );
        yCandidates.push(
            { dragValue: dragRect.top, siblingValue: s.top },
            { dragValue: dragRect.bottom, siblingValue: s.bottom },
            { dragValue: dragRect.centerY, siblingValue: s.centerY },
        );
    }

    const matchedX = closestWithinThreshold(xCandidates, threshold);
    const matchedY = closestWithinThreshold(yCandidates, threshold);

    const result: SnapResult = {};
    if (matchedX) {
        // Whichever anchor matched (left/right/centerX), the whole rect is a
        // rigid body: translate dragRect.left by the same delta that would
        // move the matched anchor onto the sibling's value.
        result.x = dragRect.left + (matchedX.siblingValue - matchedX.dragValue);
        result.guideX = matchedX.siblingValue;
    }
    if (matchedY) {
        result.y = dragRect.top + (matchedY.siblingValue - matchedY.dragValue);
        result.guideY = matchedY.siblingValue;
    }
    return result;
}
