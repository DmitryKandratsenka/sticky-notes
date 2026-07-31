import { type RefObject } from 'react';

import { useNotesDispatch, useNotesState } from '../../app/notesContext';
import {
  clampPosition,
  drawnNoteRect,
  roundRect,
  type Point,
  type Size,
} from '../../model/geometry';
import {
  createNoteDraft,
  NOTE_COLORS,
  NOTE_DEFAULT_SIZE,
  NOTE_SIZE_LIMITS,
  type NoteColor,
} from '../../model/note';
import { invariant } from '../../shared/lib/invariant';
import { usePointerDrag, type DragPoint } from '../../shared/pointer/usePointerDrag';

interface DrawBaseline {
  /** Gesture origin in board-local coordinates. */
  readonly origin: Point;
  /** Board's client-space origin, cached at gesture start. */
  readonly boardOrigin: Point;
  readonly bounds: Size;
  readonly ghost: HTMLElement;
}

/**
 * Draw-to-create: dragging on empty desk stretches a ghost rectangle and
 * releases into a note of exactly that size and position (the ghost previews
 * the min/max-clamped result, so the preview never lies). A plain click drops
 * a default-size note centered on the pointer.
 */
export function useDrawToCreate(
  boardRef: RefObject<HTMLElement | null>,
  ghostRef: RefObject<HTMLElement | null>,
) {
  const dispatch = useNotesDispatch();
  const { notes } = useNotesState();

  // New notes walk the palette in order; an explicit per-note picker exists too.
  const nextColor: NoteColor =
    NOTE_COLORS[Object.keys(notes).length % NOTE_COLORS.length] ?? 'butter';

  const boardGeometry = () => {
    const board = boardRef.current;
    invariant(board !== null, 'board must be mounted');
    const rect = board.getBoundingClientRect();
    return {
      boardOrigin: { x: rect.x, y: rect.y },
      bounds: { width: board.clientWidth, height: board.clientHeight },
    };
  };

  const toLocal = (point: DragPoint, boardOrigin: Point): Point => ({
    x: point.x - boardOrigin.x,
    y: point.y - boardOrigin.y,
  });

  return usePointerDrag<DrawBaseline>(
    {
      onDragStart: ({ origin }) => {
        const ghost = ghostRef.current;
        invariant(ghost !== null, 'ghost element must be mounted');
        const { boardOrigin, bounds } = boardGeometry();
        ghost.hidden = false;
        return { origin: toLocal(origin, boardOrigin), boardOrigin, bounds, ghost };
      },
      onDragMove: ({ baseline, point }) => {
        const rect = roundRect(
          drawnNoteRect(
            baseline.origin,
            toLocal(point, baseline.boardOrigin),
            NOTE_SIZE_LIMITS,
            baseline.bounds,
          ),
        );
        const { ghost } = baseline;
        ghost.style.left = `${rect.x}px`;
        ghost.style.top = `${rect.y}px`;
        ghost.style.width = `${rect.width}px`;
        ghost.style.height = `${rect.height}px`;
      },
      onDragEnd: ({ baseline, point }) => {
        baseline.ghost.hidden = true;
        const rect = roundRect(
          drawnNoteRect(
            baseline.origin,
            toLocal(point, baseline.boardOrigin),
            NOTE_SIZE_LIMITS,
            baseline.bounds,
          ),
        );
        dispatch({ type: 'note/created', draft: createNoteDraft({ rect, color: nextColor }) });
      },
      onDragCancel: ({ baseline }) => {
        baseline.ghost.hidden = true;
      },
      onTap: ({ origin }) => {
        const { boardOrigin, bounds } = boardGeometry();
        const local = toLocal(origin, boardOrigin);
        const position = clampPosition(
          {
            x: Math.round(local.x - NOTE_DEFAULT_SIZE.width / 2),
            y: Math.round(local.y - NOTE_DEFAULT_SIZE.height / 2),
          },
          NOTE_DEFAULT_SIZE,
          bounds,
        );
        dispatch({
          type: 'note/created',
          draft: createNoteDraft({ rect: { ...position, ...NOTE_DEFAULT_SIZE }, color: nextColor }),
        });
      },
    },
    { dragCursor: 'crosshair' },
  );
}
