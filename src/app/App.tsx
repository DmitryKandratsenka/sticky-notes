import { Board } from '../features/board/Board';
import { createLocalStorageNotesRepository } from '../services/localStorageNotesRepository';
import { withSimulatedLatency } from '../services/withSimulatedLatency';
import styles from './App.module.css';
import { NotesPersistence } from './NotesPersistence';
import { NotesProvider } from './notesContext';
import { WELCOME_NOTES } from './welcomeNotes';

/**
 * localStorage behind a simulated-latency decorator: the app consumes it as a
 * genuinely asynchronous API (loading gate, in-flight saves), and swapping in
 * a real REST client is a one-line change here.
 */
const repository = withSimulatedLatency(createLocalStorageNotesRepository(), 250);

export function App() {
  return (
    <NotesProvider>
      <NotesPersistence repository={repository} seed={WELCOME_NOTES}>
        <main className={styles.app}>
          <Board />
          <header className={styles.header}>
            <h1 className={styles.wordmark}>Sticky Notes</h1>
            <p className={styles.tagline}>drag · draw · toss</p>
          </header>
        </main>
      </NotesPersistence>
    </NotesProvider>
  );
}
