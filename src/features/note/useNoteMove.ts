import { type RefObject } from 'react';

import { useNotesDispatch } from '../../app/notesContext';
import { clampPosition, type Rect, type Size } from '../../model/geometry';
import { type Note } from '../../model/note';
import { usePointerDrag, type DragPoint } from '../../shared/pointer/usePointerDrag';
import { invariant } from '../../shared/lib/invariant';
import styles from './Note.module.css';

interface MoveBaseline {
  readonly rect: Rect;
  readonly bounds: Size;
  readonly node: HTMLElement;
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

function liftNote(node: HTMLElement): void {
  if (styles.lifted !== undefined) node.classList.add(styles.lifted);
}

function settleNote(node: HTMLElement): void {
  node.style.removeProperty('transform');
  if (styles.lifted !== undefined) node.classList.remove(styles.lifted);
}

/**
 * Drag-to-move. While the gesture is live the note follows the pointer via a
 * direct `transform` write (no React involvement per frame); the new position
 * is dispatched once, on release. Cancelling simply drops the transform and
 * the note snaps home.
 */
export function useNoteMove(
  note: Note,
  noteRef: RefObject<HTMLElement | null>,
  boardRef: RefObject<HTMLElement | null>,
) {
  const dispatch = useNotesDispatch();

  return usePointerDrag<MoveBaseline>({
    onDragStart: () => {
      const node = noteRef.current;
      const board = boardRef.current;
      invariant(node !== null && board !== null, 'note and board must be mounted during a drag');
      liftNote(node);
      return {
        rect: note.rect,
        bounds: { width: board.clientWidth, height: board.clientHeight },
        node,
      };
    },
    onDragMove: ({ baseline, delta }) => {
      const d = boardDelta(baseline, delta);
      baseline.node.style.transform = `translate3d(${d.x}px, ${d.y}px, 0)`;
    },
    onDragEnd: ({ baseline, delta }) => {
      settleNote(baseline.node);
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
      settleNote(baseline.node);
    },
  });
}
