import { type RefObject } from 'react';

import { useNotesDispatch } from '../../app/notesContext';
import { clampPosition, isPointInRect, type Rect, type Size } from '../../model/geometry';
import { type Note } from '../../model/note';
import { useTrashApiRef } from '../board/trashContext';
import { invariant } from '../../shared/lib/invariant';
import { usePointerDrag, type DragPoint } from '../../shared/pointer/usePointerDrag';
import styles from './Note.module.css';

interface MoveBaseline {
  readonly rect: Rect;
  readonly bounds: Size;
  readonly node: HTMLElement;
  /** Client-space trash rect, cached once per gesture. */
  readonly trashRect: Rect | null;
  hot: boolean;
}

/** The pointer delta that keeps the note fully on the board. */
function boardDelta(baseline: MoveBaseline, delta: DragPoint): DragPoint {
  const position = clampPosition(
    { x: baseline.rect.x + delta.x, y: baseline.rect.y + delta.y },
    baseline.rect,
    baseline.bounds,
  );
  return { x: position.x - baseline.rect.x, y: position.y - baseline.rect.y };
}

function addClass(node: HTMLElement, className: string | undefined): void {
  if (className !== undefined) node.classList.add(className);
}

function toggleClass(node: HTMLElement, className: string | undefined, on: boolean): void {
  if (className !== undefined) node.classList.toggle(className, on);
}

/**
 * Drag-to-move, including drop-on-trash. While the gesture is live the note
 * follows the pointer via a direct `transform` write (no React work per
 * frame) and the pointer position is hit-tested against the cached trash
 * rect. Release either commits the new position or, over the trash, removes
 * the note; both are a single dispatch.
 */
export function useNoteMove(
  note: Note,
  noteRef: RefObject<HTMLElement | null>,
  boardRef: RefObject<HTMLElement | null>,
  options?: {
    /** Fires whenever a *started* drag finishes, committed or not. */
    readonly onGestureSettled?: () => void;
  },
) {
  const dispatch = useNotesDispatch();
  const trashApiRef = useTrashApiRef();
  const onGestureSettled = options?.onGestureSettled;

  const settle = (baseline: MoveBaseline) => {
    const { node } = baseline;
    node.style.removeProperty('transform');
    toggleClass(node, styles.lifted, false);
    toggleClass(node, styles.doomed, false);
    trashApiRef.current?.setAwake(false);
    onGestureSettled?.();
  };

  return usePointerDrag<MoveBaseline>({
    onDragStart: () => {
      const node = noteRef.current;
      const board = boardRef.current;
      invariant(node !== null && board !== null, 'note and board must be mounted during a drag');
      addClass(node, styles.lifted);
      trashApiRef.current?.setAwake(true);
      return {
        rect: note.rect,
        bounds: { width: board.clientWidth, height: board.clientHeight },
        node,
        trashRect: trashApiRef.current?.getRect() ?? null,
        hot: false,
      };
    },
    onDragMove: ({ baseline, delta, point }) => {
      const d = boardDelta(baseline, delta);
      baseline.node.style.transform = `translate3d(${d.x}px, ${d.y}px, 0)`;

      const hot = baseline.trashRect !== null && isPointInRect(point, baseline.trashRect);
      if (hot !== baseline.hot) {
        baseline.hot = hot;
        trashApiRef.current?.setHot(hot);
        toggleClass(baseline.node, styles.doomed, hot);
      }
    },
    onDragEnd: ({ baseline, delta }) => {
      settle(baseline);
      if (baseline.hot) {
        dispatch({ type: 'note/removed', id: note.id });
        return;
      }
      const d = boardDelta(baseline, delta);
      dispatch({
        type: 'note/moved',
        id: note.id,
        position: {
          x: Math.round(baseline.rect.x + d.x),
          y: Math.round(baseline.rect.y + d.y),
        },
      });
    },
    onDragCancel: ({ baseline }) => {
      settle(baseline);
    },
  });
}
