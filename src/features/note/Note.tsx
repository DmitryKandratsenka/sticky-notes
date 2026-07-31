import {
  memo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
} from 'react';

import { useNotesDispatch } from '../../app/notesContext';
import { clampPosition, type Point } from '../../model/geometry';
import { type Note as NoteData } from '../../model/note';
import { hashString } from '../../shared/lib/hash';
import styles from './Note.module.css';
import { NoteColorPicker } from './NoteColorPicker';
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

const NUDGE_PX = 8;
const NUDGE_LARGE_PX = 24;

const ARROW_DIRECTIONS: Readonly<Record<string, Point>> = {
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
};

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
    noteRef.current?.focus();
    if (text !== null && text !== note.text) {
      dispatch({ type: 'note/textEdited', id: note.id, text });
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (editing || event.target !== event.currentTarget) return;

    if (event.key === 'Enter') {
      event.preventDefault();
      setEditing(true);
      return;
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      dispatch({ type: 'note/removed', id: note.id });
      return;
    }
    const direction = ARROW_DIRECTIONS[event.key];
    const board = boardRef.current;
    if (direction === undefined || board === null) return;
    event.preventDefault();
    const step = event.shiftKey ? NUDGE_LARGE_PX : NUDGE_PX;
    const position = clampPosition(
      { x: note.rect.x + direction.x * step, y: note.rect.y + direction.y * step },
      note.rect,
      { width: board.clientWidth, height: board.clientHeight },
    );
    dispatch({ type: 'note/moved', id: note.id, position });
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
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
    >
      <div className={styles.paper}>
        {editing ? (
          <NoteTextEditor initialText={note.text} onClose={handleEditorClose} />
        ) : (
          <div className={styles.text}>{note.text}</div>
        )}
        <NoteColorPicker noteId={note.id} current={note.color} />
        {!editing && <ResizeHandles onHandlePointerDown={resize.onHandlePointerDown} />}
      </div>
    </article>
  );
});
