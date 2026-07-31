import { Board } from '../features/board/Board';
import styles from './App.module.css';
import { NotesProvider } from './notesContext';
import { WELCOME_NOTES } from './welcomeNotes';

export function App() {
  return (
    <NotesProvider initialNotes={WELCOME_NOTES}>
      <main className={styles.app}>
        <Board />
        <header className={styles.header}>
          <h1 className={styles.wordmark}>Sticky Notes</h1>
        </header>
      </main>
    </NotesProvider>
  );
}
