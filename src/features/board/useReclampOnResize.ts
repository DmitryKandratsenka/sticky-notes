import { useEffect, type RefObject } from 'react';

import { useNotesDispatch } from '../../app/notesContext';

const RESIZE_DEBOUNCE_MS = 150;

/**
 * Keeps every note inside the board: once on mount (notes may have been
 * restored from a session on a larger screen) and, debounced, whenever the
 * window shrinks. The reducer no-ops when nothing is out of bounds.
 */
export function useReclampOnResize(boardRef: RefObject<HTMLElement | null>): void {
  const dispatch = useNotesDispatch();

  useEffect(() => {
    const board = boardRef.current;
    if (board === null) return;

    const clampNow = () => {
      dispatch({
        type: 'board/resized',
        bounds: { width: board.clientWidth, height: board.clientHeight },
      });
    };

    clampNow();

    let timer: number | undefined;
    const handleResize = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(clampNow, RESIZE_DEBOUNCE_MS);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [boardRef, dispatch]);
}
