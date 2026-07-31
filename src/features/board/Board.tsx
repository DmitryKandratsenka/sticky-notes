import { useRef } from 'react';

import { useNotesState } from '../../app/notesContext';
import { Note } from '../note/Note';
import styles from './Board.module.css';

export function Board() {
  const { notes } = useNotesState();
  const boardRef = useRef<HTMLDivElement>(null);

  return (
    <div className={styles.board} ref={boardRef}>
      {Object.values(notes).map((note) => (
        <Note key={note.id} note={note} boardRef={boardRef} />
      ))}
    </div>
  );
}
