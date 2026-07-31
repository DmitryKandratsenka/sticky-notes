import { memo, useRef, type CSSProperties, type PointerEvent, type RefObject } from 'react';

import { useNotesDispatch } from '../../app/notesContext';
import { type Note as NoteData } from '../../model/note';
import { hashString } from '../../shared/lib/hash';
import styles from './Note.module.css';
import { NOTE_PAPER_COLORS } from './notePalette';
import { ResizeHandles } from './ResizeHandles';
import { useNoteMove } from './useNoteMove';
import { useNoteResize } from './useNoteResize';

interface NoteProps {
  readonly note: NoteData;
  readonly boardRef: RefObject<HTMLElement | null>;
}

interface NoteStyle extends CSSProperties {
  '--note-paper': string;
  '--note-tilt': string;
  '--note-z': number;
}

/** Resting tilt in one of a few deterministic steps, so the desk looks hand-made. */
function restingTiltDeg(id: string): number {
  return ((hashString(id) % 5) - 2) * 0.55;
}

/**
 * Memoized: the reducer preserves object identity of untouched notes, so only
 * the note that changed re-renders. The outer element owns layout (left/top/
 * size/z) and its `transform` is reserved for in-flight gestures — it is never
 * written from JSX. The inner paper owns all the visuals, including tilt.
 */
export const Note = memo(function Note({ note, boardRef }: NoteProps) {
  const noteRef = useRef<HTMLElement>(null);
  const dispatch = useNotesDispatch();
  const move = useNoteMove(note, noteRef, boardRef);
  const resize = useNoteResize(note, noteRef, boardRef);

  const handlePointerDown = (event: PointerEvent<HTMLElement>) => {
    // A press anywhere on the note raises it and must not reach the board,
    // where it would start drawing a new note.
    event.stopPropagation();
    dispatch({ type: 'note/broughtToFront', id: note.id });
    move.onPointerDown(event);
  };

  // Stacking goes through --note-z (not an inline z-index) so gesture CSS
  // classes can override it by specificity without fighting inline styles.
  const style: NoteStyle = {
    left: note.rect.x,
    top: note.rect.y,
    width: note.rect.width,
    height: note.rect.height,
    '--note-paper': NOTE_PAPER_COLORS[note.color],
    '--note-tilt': `${restingTiltDeg(note.id)}deg`,
    '--note-z': note.zIndex,
  };

  return (
    <article
      ref={noteRef}
      className={styles.note}
      style={style}
      aria-label="Sticky note"
      onPointerDown={handlePointerDown}
    >
      <div className={styles.paper}>
        <div className={styles.text}>{note.text}</div>
        <ResizeHandles onHandlePointerDown={resize.onHandlePointerDown} />
      </div>
    </article>
  );
});
