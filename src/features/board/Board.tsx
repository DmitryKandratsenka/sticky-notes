import { useRef } from 'react';

import { useNotesState } from '../../app/notesContext';
import { Note } from '../note/Note';
import styles from './Board.module.css';
import { TrashApiProvider } from './trashContext';
import { TrashZone } from './TrashZone';
import { useDrawToCreate } from './useDrawToCreate';
import { useReclampOnResize } from './useReclampOnResize';

export function Board() {
  const { notes } = useNotesState();
  const boardRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const draw = useDrawToCreate(boardRef, ghostRef);
  useReclampOnResize(boardRef);

  const isEmpty = Object.keys(notes).length === 0;

  return (
    <TrashApiProvider>
      <div className={styles.board} ref={boardRef} onPointerDown={draw.onPointerDown}>
        {isEmpty && (
          <div className={styles.emptyHint} aria-hidden="true">
            <span className={styles.emptyTitle}>the desk is clear</span>
            <span>draw a rectangle anywhere — or just click — to stick a note</span>
          </div>
        )}
        {Object.values(notes).map((note) => (
          <Note key={note.id} note={note} boardRef={boardRef} />
        ))}
        <TrashZone />
        <div className={styles.ghost} ref={ghostRef} hidden aria-hidden="true" />
      </div>
    </TrashApiProvider>
  );
}
