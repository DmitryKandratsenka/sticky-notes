import {
  memo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type RefObject,
} from 'react';

import { useNotesDispatch } from '../../app/notesContext';
import { type Note as NoteData } from '../../model/note';
import { hashString } from '../../shared/lib/hash';
import styles from './Note.module.css';
import { NOTE_PAPER_COLORS } from './notePalette';
import { NoteTextEditor } from './NoteTextEditor';
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

/**
 * A drag that ends on the note is often followed by a quick synthesized
 * click; two of those in a row form a dblclick that would pop the editor
 * open. Ignore dblclicks arriving right after a finished gesture.
 */
const DBLCLICK_SUPPRESSION_MS = 350;

/** Resting tilt in one of a few deterministic steps, so the desk looks hand-made. */
function restingTiltDeg(id: string): number {
  return ((hashString(id) % 5) - 2) * 0.55;
}

/**
 * Memoized: the reducer preserves object identity of untouched notes, so only
 * the note that changed re-renders. The outer element owns layout (left/top/
 * size) and its `transform` is reserved for in-flight gestures — it is never
 * written from JSX. The inner paper owns all the visuals, including tilt.
 */
export const Note = memo(function Note({ note, boardRef }: NoteProps) {
  const noteRef = useRef<HTMLElement>(null);
  const dispatch = useNotesDispatch();
  const [editing, setEditing] = useState(false);
  const suppressDblclickUntilRef = useRef(0);

  const move = useNoteMove(note, noteRef, boardRef, {
    onGestureSettled: () => {
      suppressDblclickUntilRef.current = performance.now() + DBLCLICK_SUPPRESSION_MS;
    },
  });
  const resize = useNoteResize(note, noteRef, boardRef);

  const handlePointerDown = (event: PointerEvent<HTMLElement>) => {
    // A press anywhere on the note raises it and must not reach the board,
    // where it would start drawing a new note.
    event.stopPropagation();
    dispatch({ type: 'note/broughtToFront', id: note.id });
    move.onPointerDown(event);
  };

  const handleDoubleClick = () => {
    if (editing || performance.now() < suppressDblclickUntilRef.current) return;
    setEditing(true);
  };

  const handleEditorClose = (text: string | null) => {
    setEditing(false);
    if (text !== null && text !== note.text) {
      dispatch({ type: 'note/textEdited', id: note.id, text });
    }
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
      onDoubleClick={handleDoubleClick}
    >
      <div className={styles.paper}>
        {editing ? (
          <NoteTextEditor initialText={note.text} onClose={handleEditorClose} />
        ) : (
          <div className={styles.text}>{note.text}</div>
        )}
        {!editing && <ResizeHandles onHandlePointerDown={resize.onHandlePointerDown} />}
      </div>
    </article>
  );
});
