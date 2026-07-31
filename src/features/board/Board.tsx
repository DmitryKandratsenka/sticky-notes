import { useNotesState } from '../../app/notesContext';
import { Note } from '../note/Note';
import styles from './Board.module.css';

export function Board() {
  const { notes } = useNotesState();

  return (
    <div className={styles.board}>
      {Object.values(notes).map((note) => (
        <Note key={note.id} note={note} />
      ))}
    </div>
  );
}
