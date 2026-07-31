import { useRef } from 'react';

import { useNotesState } from '../../app/notesContext';
import { Note } from '../note/Note';
import styles from './Board.module.css';
import { useDrawToCreate } from './useDrawToCreate';

export function Board() {
  const { notes } = useNotesState();
  const boardRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const draw = useDrawToCreate(boardRef, ghostRef);

  return (
    <div className={styles.board} ref={boardRef} onPointerDown={draw.onPointerDown}>
      {Object.values(notes).map((note) => (
        <Note key={note.id} note={note} boardRef={boardRef} />
      ))}
      <div className={styles.ghost} ref={ghostRef} hidden aria-hidden="true" />
    </div>
  );
}
