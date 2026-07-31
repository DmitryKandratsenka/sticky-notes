import { useNotesDispatch } from '../../app/notesContext';
import { NOTE_COLORS, type NoteColor, type NoteId } from '../../model/note';
import styles from './NoteColorPicker.module.css';
import { NOTE_PAPER_COLORS } from './notePalette';

interface NoteColorPickerProps {
  readonly noteId: NoteId;
  readonly current: NoteColor;
}

/** Swatch dots along the adhesive strip; revealed on hover/keyboard focus. */
export function NoteColorPicker({ noteId, current }: NoteColorPickerProps) {
  const dispatch = useNotesDispatch();

  return (
    <div className={styles.row} role="group" aria-label="Note color">
      {NOTE_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          className={styles.swatch}
          style={{ background: NOTE_PAPER_COLORS[color] }}
          aria-label={`Make the note ${color}`}
          aria-pressed={color === current}
          onPointerDown={(event) => {
            // Recoloring must not start a move gesture.
            event.stopPropagation();
          }}
          onDoubleClick={(event) => {
            event.stopPropagation();
          }}
          onClick={() => {
            dispatch({ type: 'note/recolored', id: noteId, color });
          }}
        />
      ))}
    </div>
  );
}
