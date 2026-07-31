import { useRef, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';

import { useNotesDispatch } from '../../app/notesContext';
import {
  resizeRect,
  roundRect,
  type Rect,
  type ResizeDirection,
  type Size,
} from '../../model/geometry';
import { NOTE_SIZE_LIMITS, type Note } from '../../model/note';
import { invariant } from '../../shared/lib/invariant';
import { usePointerDrag } from '../../shared/pointer/usePointerDrag';

export const RESIZE_HANDLES = ['nw', 'ne', 'sw', 'se'] as const;
export type ResizeHandle = (typeof RESIZE_HANDLES)[number];

const HANDLE_DIRECTIONS = {
  nw: { dx: -1, dy: -1 },
  ne: { dx: 1, dy: -1 },
  sw: { dx: -1, dy: 1 },
  se: { dx: 1, dy: 1 },
} satisfies Record<ResizeHandle, ResizeDirection>;

export const HANDLE_CURSORS = {
  nw: 'nwse-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
  se: 'nwse-resize',
} satisfies Record<ResizeHandle, string>;

interface ResizeBaseline {
  readonly rect: Rect;
  readonly bounds: Size;
  readonly node: HTMLElement;
  readonly direction: ResizeDirection;
}

/**
 * Drag-to-resize from any corner. All four handles share one gesture instance;
 * the pressed handle is remembered just before the gesture begins. Geometry is
 * recomputed every frame from the initial rect and the total delta
 * (`resizeRect` keeps the opposite corner anchored and clamps to limits and
 * board bounds), applied directly to the DOM, and dispatched once on release.
 */
export function useNoteResize(
  note: Note,
  noteRef: RefObject<HTMLElement | null>,
  boardRef: RefObject<HTMLElement | null>,
) {
  const dispatch = useNotesDispatch();
  const pendingHandle = useRef<ResizeHandle | null>(null);

  const applyRect = (baseline: ResizeBaseline, next: Rect) => {
    const { node, rect } = baseline;
    node.style.transform = `translate3d(${next.x - rect.x}px, ${next.y - rect.y}px, 0)`;
    node.style.width = `${next.width}px`;
    node.style.height = `${next.height}px`;
  };

  const drag = usePointerDrag<ResizeBaseline>(
    {
      onDragStart: () => {
        const node = noteRef.current;
        const board = boardRef.current;
        const handle = pendingHandle.current;
        invariant(node !== null && board !== null, 'note and board must be mounted during resize');
        invariant(handle !== null, 'resize gesture started without a pressed handle');
        return {
          rect: note.rect,
          bounds: { width: board.clientWidth, height: board.clientHeight },
          node,
          direction: HANDLE_DIRECTIONS[handle],
        };
      },
      onDragMove: ({ baseline, delta }) => {
        applyRect(
          baseline,
          resizeRect(baseline.rect, baseline.direction, delta, NOTE_SIZE_LIMITS, baseline.bounds),
        );
      },
      onDragEnd: ({ baseline, delta }) => {
        // width/height/left/top are corrected by the re-render; only the
        // gesture-owned transform must be cleared by hand.
        baseline.node.style.removeProperty('transform');
        const next = roundRect(
          resizeRect(baseline.rect, baseline.direction, delta, NOTE_SIZE_LIMITS, baseline.bounds),
        );
        dispatch({ type: 'note/resized', id: note.id, rect: next });
      },
      onDragCancel: ({ baseline }) => {
        baseline.node.style.removeProperty('transform');
        baseline.node.style.removeProperty('width');
        baseline.node.style.removeProperty('height');
      },
    },
    {
      dragCursor: () => {
        const handle = pendingHandle.current;
        return handle === null ? 'default' : HANDLE_CURSORS[handle];
      },
    },
  );

  return {
    onHandlePointerDown: (handle: ResizeHandle, event: ReactPointerEvent<HTMLElement>) => {
      // The press must not bubble into the note (a move would start too).
      event.stopPropagation();
      dispatch({ type: 'note/broughtToFront', id: note.id });
      pendingHandle.current = handle;
      drag.onPointerDown(event);
    },
  };
}
