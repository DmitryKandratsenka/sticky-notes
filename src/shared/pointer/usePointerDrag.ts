import { useCallback, useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react';

export interface DragPoint {
  readonly x: number;
  readonly y: number;
}

export interface DragStartArgs {
  /** Pointer position at press time, in client coordinates. */
  readonly origin: DragPoint;
  readonly event: PointerEvent;
}

export interface DragMoveArgs<TBaseline> {
  readonly baseline: TBaseline;
  /** Total pointer travel since the origin — never an accumulated per-event delta. */
  readonly delta: DragPoint;
  readonly point: DragPoint;
}

export interface PointerDragHandlers<TBaseline> {
  /**
   * Called once, when pointer travel crosses the threshold. Returns the
   * gesture baseline (snapshotted rects, bounds, …) that every subsequent
   * callback receives, so all math is `baseline + total delta`.
   */
  readonly onDragStart: (args: DragStartArgs) => TBaseline;
  /** Batched to animation frames while the gesture is active. */
  readonly onDragMove: (args: DragMoveArgs<TBaseline>) => void;
  /** Exactly one of onDragEnd / onDragCancel fires per started gesture. */
  readonly onDragEnd: (args: DragMoveArgs<TBaseline>) => void;
  readonly onDragCancel: (args: { readonly baseline: TBaseline }) => void;
  /** Press released before crossing the threshold. */
  readonly onTap?: (args: DragStartArgs) => void;
}

export interface PointerDragOptions {
  /** Pointer travel (px) that turns a press into a drag. */
  readonly thresholdPx?: number;
  /** Cursor forced on the whole page while the gesture is active. */
  readonly dragCursor?: string;
}

interface GestureSession<TBaseline> {
  readonly pointerId: number;
  readonly origin: DragPoint;
  readonly target: HTMLElement;
  readonly controller: AbortController;
  baseline: TBaseline | null; // null while still below the threshold
  lastPoint: DragPoint;
  rafId: number | null;
}

const DEFAULT_THRESHOLD_PX = 4;

/** Set while any gesture is active; disables text selection globally (see global.css). */
const BODY_GESTURE_CLASS = 'gesture-active';

/**
 * Low-level press-drag-release gesture primitive on Pointer Events. One
 * instance tracks at most one pointer at a time. The returned handler is the
 * only thing wired through JSX; move/up/cancel listeners exist only while a
 * gesture is in flight and are torn down through a single AbortController.
 *
 * Design notes, hard-won from browser quirks:
 * - `setPointerCapture` is best-effort (Firefox throws if the pointer already
 *   ended); listeners live on `window`, so capture is an optimization, not a
 *   correctness requirement.
 * - `pointercancel`, `lostpointercapture`, window `blur` and Escape all cancel;
 *   a `pointermove` with `buttons === 0` commits (missed `pointerup` after a
 *   context menu or OS interrupt). Teardown is idempotent.
 * - Move work is coalesced into animation frames; the pending frame is
 *   cancelled on teardown so a stale frame can never fire after the commit.
 */
export function usePointerDrag<TBaseline>(
  handlers: PointerDragHandlers<TBaseline>,
  options?: PointerDragOptions,
): { readonly onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void } {
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });

  const thresholdPx = options?.thresholdPx ?? DEFAULT_THRESHOLD_PX;
  const dragCursor = options?.dragCursor ?? 'grabbing';

  const sessionRef = useRef<GestureSession<TBaseline> | null>(null);

  // Shared teardown: releases capture, aborts listeners, restores the page.
  const finishRef = useRef<(commit: boolean) => void>(() => undefined);

  const onPointerDown = useCallback(
    (reactEvent: ReactPointerEvent<HTMLElement>) => {
      const event = reactEvent.nativeEvent;
      if (sessionRef.current !== null) return; // one pointer at a time
      if (event.button !== 0 || !event.isPrimary) return;

      const target = reactEvent.currentTarget;
      const controller = new AbortController();
      const session: GestureSession<TBaseline> = {
        pointerId: event.pointerId,
        origin: { x: event.clientX, y: event.clientY },
        target,
        controller,
        baseline: null,
        lastPoint: { x: event.clientX, y: event.clientY },
        rafId: null,
      };
      sessionRef.current = session;

      try {
        target.setPointerCapture(event.pointerId);
      } catch {
        // The pointer may already be gone; window listeners still track it.
      }

      const finish = (commit: boolean) => {
        if (sessionRef.current !== session) return;
        sessionRef.current = null;

        if (session.rafId !== null) cancelAnimationFrame(session.rafId);
        controller.abort();
        document.body.classList.remove(BODY_GESTURE_CLASS);
        document.body.style.removeProperty('cursor');
        try {
          session.target.releasePointerCapture(session.pointerId);
        } catch {
          // Capture may have been lost already; nothing to release.
        }

        const { baseline } = session;
        if (baseline === null) return; // never crossed the threshold
        if (commit) {
          const delta = totalDelta(session);
          handlersRef.current.onDragEnd({ baseline, delta, point: session.lastPoint });
        } else {
          handlersRef.current.onDragCancel({ baseline });
        }
      };
      finishRef.current = finish;

      const flushMove = () => {
        session.rafId = null;
        if (sessionRef.current !== session || session.baseline === null) return;
        handlersRef.current.onDragMove({
          baseline: session.baseline,
          delta: totalDelta(session),
          point: session.lastPoint,
        });
      };

      const { signal } = controller;

      window.addEventListener(
        'pointermove',
        (moveEvent: PointerEvent) => {
          if (moveEvent.pointerId !== session.pointerId) return;
          session.lastPoint = { x: moveEvent.clientX, y: moveEvent.clientY };

          // Missed pointerup (context menu, alt-tab, …): commit what we have.
          if (moveEvent.buttons === 0) {
            finish(true);
            return;
          }

          if (session.baseline === null) {
            const travel = totalDelta(session);
            if (Math.hypot(travel.x, travel.y) < thresholdPx) return;
            document.body.classList.add(BODY_GESTURE_CLASS);
            document.body.style.setProperty('cursor', dragCursor, 'important');
            session.baseline = handlersRef.current.onDragStart({
              origin: session.origin,
              event: moveEvent,
            });
          }
          session.rafId ??= requestAnimationFrame(flushMove);
        },
        { signal },
      );

      window.addEventListener(
        'pointerup',
        (upEvent: PointerEvent) => {
          if (upEvent.pointerId !== session.pointerId) return;
          session.lastPoint = { x: upEvent.clientX, y: upEvent.clientY };
          const started = session.baseline !== null;
          finish(true);
          if (!started) handlersRef.current.onTap?.({ origin: session.origin, event: upEvent });
        },
        { signal },
      );

      window.addEventListener(
        'pointercancel',
        (cancelEvent: PointerEvent) => {
          if (cancelEvent.pointerId === session.pointerId) finish(false);
        },
        { signal },
      );

      target.addEventListener(
        'lostpointercapture',
        () => {
          finish(false);
        },
        { signal },
      );

      window.addEventListener(
        'keydown',
        (keyEvent: KeyboardEvent) => {
          if (keyEvent.key === 'Escape') {
            keyEvent.stopPropagation();
            finish(false);
          }
        },
        { signal, capture: true },
      );

      window.addEventListener(
        'blur',
        () => {
          finish(false);
        },
        { signal },
      );
    },
    [dragCursor, thresholdPx],
  );

  // Unmount mid-gesture: cancel rather than leak window listeners.
  useEffect(() => {
    return () => {
      finishRef.current(false);
    };
  }, []);

  return { onPointerDown };
}

function totalDelta(session: GestureSession<unknown>): DragPoint {
  return {
    x: session.lastPoint.x - session.origin.x,
    y: session.lastPoint.y - session.origin.y,
  };
}
