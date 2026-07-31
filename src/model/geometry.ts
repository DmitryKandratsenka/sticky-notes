export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface Rect extends Point, Size {}

/** Which edges a resize handle controls: -1 = west/north, 1 = east/south, 0 = untouched. */
export interface ResizeDirection {
  readonly dx: -1 | 0 | 1;
  readonly dy: -1 | 0 | 1;
}

export interface SizeLimits {
  readonly min: Size;
  readonly max: Size;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Rect spanning two arbitrary corner points; normalizes "backwards" drags. */
export function rectFromCorners(a: Point, b: Point): Rect {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(a.x - b.x),
    height: Math.abs(a.y - b.y),
  };
}

export function clampSize(size: Size, limits: SizeLimits): Size {
  return {
    width: clamp(size.width, limits.min.width, limits.max.width),
    height: clamp(size.height, limits.min.height, limits.max.height),
  };
}

/** Position keeping a box of `size` fully inside `bounds` (whose origin is 0,0). */
export function clampPosition(position: Point, size: Size, bounds: Size): Point {
  return {
    x: clamp(position.x, 0, Math.max(0, bounds.width - size.width)),
    y: clamp(position.y, 0, Math.max(0, bounds.height - size.height)),
  };
}

export function isPointInRect(point: Point, rect: Rect): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

export function roundRect(rect: Rect): Rect {
  return {
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  };
}

export function rectsEqual(a: Rect, b: Rect): boolean {
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}

interface AxisSpan {
  readonly start: number;
  readonly length: number;
}

/**
 * One axis of an anchored resize. The length is clamped first (to the limits
 * and to the board edge) and the start derived from the fixed anchor, so the
 * anchored edge never drifts no matter how far the pointer overshoots.
 */
function resizeAxis(
  start: number,
  length: number,
  direction: -1 | 0 | 1,
  delta: number,
  minLength: number,
  maxLength: number,
  boundsLength: number,
): AxisSpan {
  switch (direction) {
    case 0:
      return { start, length };
    case 1: {
      // Anchor = leading edge; the box may grow until the board's far edge.
      const limit = Math.min(maxLength, boundsLength - start);
      return { start, length: clamp(length + delta, minLength, limit) };
    }
    case -1: {
      // Anchor = trailing edge; the box may grow until the board's near edge.
      const anchor = start + length;
      const limit = Math.min(maxLength, anchor);
      const nextLength = clamp(length - delta, minLength, limit);
      return { start: anchor - nextLength, length: nextLength };
    }
  }
}

/**
 * Resize `initial` by dragging the handle described by `direction` by `delta`,
 * keeping the opposite corner/edge anchored and the rect inside `bounds`.
 */
export function resizeRect(
  initial: Rect,
  direction: ResizeDirection,
  delta: Point,
  limits: SizeLimits,
  bounds: Size,
): Rect {
  const x = resizeAxis(
    initial.x,
    initial.width,
    direction.dx,
    delta.x,
    limits.min.width,
    limits.max.width,
    bounds.width,
  );
  const y = resizeAxis(
    initial.y,
    initial.height,
    direction.dy,
    delta.y,
    limits.min.height,
    limits.max.height,
    bounds.height,
  );
  return { x: x.start, y: y.start, width: x.length, height: y.length };
}
