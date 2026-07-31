import { describe, expect, it } from 'vitest';

import {
  clamp,
  clampPosition,
  clampSize,
  drawnNoteRect,
  isPointInRect,
  rectFromCorners,
  rectsEqual,
  resizeRect,
  roundRect,
  type Rect,
  type SizeLimits,
} from './geometry';

const LIMITS: SizeLimits = {
  min: { width: 100, height: 100 },
  max: { width: 500, height: 500 },
};
const BOUNDS = { width: 1000, height: 800 };

describe('clamp', () => {
  it('keeps values inside the range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });
});

describe('rectFromCorners', () => {
  it('spans two points', () => {
    expect(rectFromCorners({ x: 10, y: 20 }, { x: 110, y: 220 })).toEqual({
      x: 10,
      y: 20,
      width: 100,
      height: 200,
    });
  });

  it('normalizes a backwards (up-left) drag', () => {
    expect(rectFromCorners({ x: 110, y: 220 }, { x: 10, y: 20 })).toEqual({
      x: 10,
      y: 20,
      width: 100,
      height: 200,
    });
  });
});

describe('clampSize', () => {
  it('applies both limits', () => {
    expect(clampSize({ width: 50, height: 900 }, LIMITS)).toEqual({ width: 100, height: 500 });
  });
});

describe('clampPosition', () => {
  it('keeps the box fully inside the bounds', () => {
    const size = { width: 200, height: 200 };
    expect(clampPosition({ x: -50, y: 700 }, size, BOUNDS)).toEqual({ x: 0, y: 600 });
  });

  it('falls back to the origin when the box is larger than the bounds', () => {
    const size = { width: 1200, height: 900 };
    expect(clampPosition({ x: 100, y: 100 }, size, BOUNDS)).toEqual({ x: 0, y: 0 });
  });
});

describe('isPointInRect', () => {
  const rect: Rect = { x: 10, y: 10, width: 100, height: 100 };

  it('includes edges', () => {
    expect(isPointInRect({ x: 10, y: 10 }, rect)).toBe(true);
    expect(isPointInRect({ x: 110, y: 110 }, rect)).toBe(true);
    expect(isPointInRect({ x: 110.5, y: 50 }, rect)).toBe(false);
  });
});

describe('roundRect / rectsEqual', () => {
  it('rounds every channel', () => {
    expect(roundRect({ x: 1.4, y: 1.6, width: 10.5, height: 9.4 })).toEqual({
      x: 1,
      y: 2,
      width: 11,
      height: 9,
    });
  });

  it('compares by value', () => {
    const a: Rect = { x: 1, y: 2, width: 3, height: 4 };
    expect(rectsEqual(a, { ...a })).toBe(true);
    expect(rectsEqual(a, { ...a, width: 5 })).toBe(false);
  });
});

describe('drawnNoteRect', () => {
  const origin = { x: 400, y: 300 };

  it('spans from the origin toward the pointer', () => {
    expect(drawnNoteRect(origin, { x: 600, y: 480 }, LIMITS, BOUNDS)).toEqual({
      x: 400,
      y: 300,
      width: 200,
      height: 180,
    });
  });

  it('enforces the minimum size while drawing up-left, anchored at the pointer side', () => {
    const rect = drawnNoteRect(origin, { x: 380, y: 260 }, LIMITS, BOUNDS);
    expect(rect).toEqual({ x: 300, y: 200, width: 100, height: 100 });
  });

  it('caps at the maximum size, growing away from the origin corner', () => {
    const rect = drawnNoteRect(origin, { x: 999, y: 999 }, LIMITS, BOUNDS);
    expect(rect).toEqual({ x: 400, y: 300, width: 500, height: 500 });
  });

  it('ignores pointer travel outside the board', () => {
    const rect = drawnNoteRect({ x: 100, y: 100 }, { x: -500, y: 50 }, LIMITS, BOUNDS);
    expect(rect.x).toBe(0);
    expect(rect.width).toBe(100);
  });

  it('keeps the min-size note inside the board when drawn in a corner', () => {
    const rect = drawnNoteRect({ x: 990, y: 790 }, { x: 998, y: 798 }, LIMITS, BOUNDS);
    expect(rect.x + rect.width).toBeLessThanOrEqual(BOUNDS.width);
    expect(rect.y + rect.height).toBeLessThanOrEqual(BOUNDS.height);
  });
});

describe('resizeRect', () => {
  const initial: Rect = { x: 300, y: 300, width: 200, height: 200 };

  it('grows from the south-east handle with the top-left corner anchored', () => {
    const result = resizeRect(initial, { dx: 1, dy: 1 }, { x: 50, y: 80 }, LIMITS, BOUNDS);
    expect(result).toEqual({ x: 300, y: 300, width: 250, height: 280 });
  });

  it('clamps to the minimum size without moving the anchor', () => {
    const result = resizeRect(initial, { dx: 1, dy: 1 }, { x: -500, y: -500 }, LIMITS, BOUNDS);
    expect(result).toEqual({ x: 300, y: 300, width: 100, height: 100 });
  });

  it('stops at the board edge before the size limit', () => {
    const nearEdge: Rect = { ...initial, x: 700 };
    const result = resizeRect(nearEdge, { dx: 1, dy: 0 }, { x: 400, y: 0 }, LIMITS, BOUNDS);
    expect(result.width).toBe(300); // 1000 - 700, not max 500
    expect(result.x).toBe(700);
  });

  it('grows from the north-west handle with the bottom-right corner anchored', () => {
    const result = resizeRect(initial, { dx: -1, dy: -1 }, { x: -60, y: -40 }, LIMITS, BOUNDS);
    expect(result).toEqual({ x: 240, y: 260, width: 260, height: 240 });
    expect(result.x + result.width).toBe(initial.x + initial.width);
    expect(result.y + result.height).toBe(initial.y + initial.height);
  });

  it('keeps the anchored corner fixed when dragging far past the minimum', () => {
    const result = resizeRect(initial, { dx: -1, dy: -1 }, { x: 900, y: 900 }, LIMITS, BOUNDS);
    expect(result).toEqual({ x: 400, y: 400, width: 100, height: 100 });
  });

  it('cannot push the west edge outside the board', () => {
    const nearOrigin: Rect = { ...initial, x: 50 };
    const result = resizeRect(nearOrigin, { dx: -1, dy: 0 }, { x: -400, y: 0 }, LIMITS, BOUNDS);
    expect(result.x).toBe(0);
    expect(result.width).toBe(250); // anchor at 250 caps the growth
  });

  it('leaves the untouched axis alone', () => {
    const result = resizeRect(initial, { dx: 1, dy: 0 }, { x: 30, y: 999 }, LIMITS, BOUNDS);
    expect(result.y).toBe(initial.y);
    expect(result.height).toBe(initial.height);
  });

  it('is a pure function of the initial rect and the total delta (no drift)', () => {
    // Simulates a wiggle: however many intermediate deltas were applied to the
    // live preview, the commit for a given total delta is always identical.
    const afterOvershoot = resizeRect(
      initial,
      { dx: 1, dy: 1 },
      { x: -999, y: -999 },
      LIMITS,
      BOUNDS,
    );
    expect(afterOvershoot).toEqual(
      resizeRect(initial, { dx: 1, dy: 1 }, { x: -999, y: -999 }, LIMITS, BOUNDS),
    );
    const back = resizeRect(initial, { dx: 1, dy: 1 }, { x: 20, y: 20 }, LIMITS, BOUNDS);
    expect(back).toEqual({ x: 300, y: 300, width: 220, height: 220 });
  });
});
