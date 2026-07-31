import { Board } from '../features/board/Board';
import { createLocalStorageNotesRepository } from '../services/localStorageNotesRepository';
import styles from './App.module.css';
import { NotesPersistence } from './NotesPersistence';
import { NotesProvider } from './notesContext';
import { WELCOME_NOTES } from './welcomeNotes';

const repository = createLocalStorageNotesRepository();

export function App() {
  return (
    <NotesProvider>
      <NotesPersistence repository={repository} seed={WELCOME_NOTES}>
        <main className={styles.app}>
          <Board />
          <header className={styles.header}>
            <h1 className={styles.wordmark}>Sticky Notes</h1>
          </header>
        </main>
      </NotesPersistence>
    </NotesProvider>
  );
}
