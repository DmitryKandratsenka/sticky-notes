import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { usePointerDrag, type PointerDragHandlers } from './usePointerDrag';

interface Baseline {
  readonly tag: string;
}

function makeHandlers() {
  return {
    onDragStart: vi.fn((): Baseline => ({ tag: 'baseline' })),
    onDragMove: vi.fn(),
    onDragEnd: vi.fn(),
    onDragCancel: vi.fn(),
    onTap: vi.fn(),
  } satisfies PointerDragHandlers<Baseline>;
}

type Handlers = ReturnType<typeof makeHandlers>;

function Probe({ handlers }: { readonly handlers: Handlers }) {
  const { onPointerDown } = usePointerDrag<Baseline>(handlers);
  return <div data-testid="target" onPointerDown={onPointerDown} />;
}

function press(x: number, y: number, init?: { button?: number }) {
  fireEvent.pointerDown(screen.getByTestId('target'), {
    button: init?.button ?? 0,
    isPrimary: true,
    pointerId: 1,
    clientX: x,
    clientY: y,
  });
}

function windowPointerEvent(
  type: 'pointermove' | 'pointerup' | 'pointercancel',
  x: number,
  y: number,
  buttons: number,
) {
  const event = new MouseEvent(type, { bubbles: true, clientX: x, clientY: y, buttons });
  Object.assign(event, { pointerId: 1, isPrimary: true });
  window.dispatchEvent(event);
}

function move(x: number, y: number) {
  windowPointerEvent('pointermove', x, y, 1);
}

function release(x: number, y: number) {
  windowPointerEvent('pointerup', x, y, 0);
}

// Manual frame queue: tests advance animation frames explicitly, mirroring the
// asynchronous nature of real rAF (a synchronous stub would break scheduling).
const frames = new Map<number, FrameRequestCallback>();
let nextFrameId = 1;

function renderFrame() {
  const pending = [...frames.values()];
  frames.clear();
  for (const callback of pending) callback(0);
}

describe('usePointerDrag', () => {
  beforeEach(() => {
    frames.clear();
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback): number => {
      const id = nextFrameId;
      nextFrameId += 1;
      frames.set(id, callback);
      return id;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => {
      frames.delete(id);
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('treats a sub-threshold press-release as a tap', () => {
    const handlers = makeHandlers();
    render(<Probe handlers={handlers} />);

    press(100, 100);
    move(102, 101);
    release(102, 101);

    expect(handlers.onDragStart).not.toHaveBeenCalled();
    expect(handlers.onDragEnd).not.toHaveBeenCalled();
    expect(handlers.onTap).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ origin: { x: 100, y: 100 } }),
    );
  });

  it('starts after the threshold, coalesces moves per frame and reports totals', () => {
    const handlers = makeHandlers();
    render(<Probe handlers={handlers} />);

    press(100, 100);
    move(110, 100);
    move(130, 140);
    renderFrame();
    release(130, 140);

    expect(handlers.onDragStart).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ origin: { x: 100, y: 100 } }),
    );
    // Two pointermoves, one frame: exactly one flush, carrying the total delta.
    expect(handlers.onDragMove).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ baseline: { tag: 'baseline' }, delta: { x: 30, y: 40 } }),
    );
    expect(handlers.onDragEnd).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ delta: { x: 30, y: 40 }, point: { x: 130, y: 140 } }),
    );
    expect(handlers.onDragCancel).not.toHaveBeenCalled();
    expect(handlers.onTap).not.toHaveBeenCalled();
  });

  it('cancels on Escape and ignores events after teardown', () => {
    const handlers = makeHandlers();
    render(<Probe handlers={handlers} />);

    press(100, 100);
    move(150, 150);
    renderFrame();
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(handlers.onDragCancel).toHaveBeenCalledExactlyOnceWith({
      baseline: { tag: 'baseline' },
    });
    expect(handlers.onDragEnd).not.toHaveBeenCalled();

    const movesBefore = handlers.onDragMove.mock.calls.length;
    move(200, 200);
    renderFrame();
    release(200, 200);
    expect(handlers.onDragMove.mock.calls.length).toBe(movesBefore);
    expect(handlers.onDragEnd).not.toHaveBeenCalled();
  });

  it('never flushes a stale frame scheduled before teardown', () => {
    const handlers = makeHandlers();
    render(<Probe handlers={handlers} />);

    press(100, 100);
    move(150, 150); // crosses threshold and schedules a frame
    release(150, 150); // commit cancels the pending frame
    renderFrame();

    expect(handlers.onDragEnd).toHaveBeenCalledTimes(1);
    expect(handlers.onDragMove).not.toHaveBeenCalled();
  });

  it('cancels on pointercancel', () => {
    const handlers = makeHandlers();
    render(<Probe handlers={handlers} />);

    press(100, 100);
    move(150, 150);
    windowPointerEvent('pointercancel', 150, 150, 0);

    expect(handlers.onDragCancel).toHaveBeenCalledTimes(1);
    expect(handlers.onDragEnd).not.toHaveBeenCalled();
  });

  it('commits when a move arrives with no buttons pressed (missed pointerup)', () => {
    const handlers = makeHandlers();
    render(<Probe handlers={handlers} />);

    press(100, 100);
    move(150, 150);
    windowPointerEvent('pointermove', 160, 160, 0);

    expect(handlers.onDragEnd).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ delta: { x: 60, y: 60 } }),
    );
  });

  it('ignores non-left buttons and secondary pointers', () => {
    const handlers = makeHandlers();
    render(<Probe handlers={handlers} />);

    press(100, 100, { button: 2 });
    move(200, 200);
    release(200, 200);

    expect(handlers.onDragStart).not.toHaveBeenCalled();
    expect(handlers.onTap).not.toHaveBeenCalled();
  });

  it('tracks only the pointer that started the gesture', () => {
    const handlers = makeHandlers();
    render(<Probe handlers={handlers} />);

    press(100, 100);
    const foreign = new MouseEvent('pointermove', { clientX: 500, clientY: 500, buttons: 1 });
    Object.assign(foreign, { pointerId: 99, isPrimary: false });
    window.dispatchEvent(foreign);

    expect(handlers.onDragStart).not.toHaveBeenCalled();

    move(140, 100);
    release(140, 100);
    expect(handlers.onDragEnd).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ delta: { x: 40, y: 0 } }),
    );
  });

  it('cancels a live gesture when the component unmounts', () => {
    const handlers = makeHandlers();
    const { unmount } = render(<Probe handlers={handlers} />);

    press(100, 100);
    move(150, 150);
    unmount();

    expect(handlers.onDragCancel).toHaveBeenCalledTimes(1);
  });
});
