import { useEffect, useRef, useState, type ReactNode } from 'react';

import { type Note } from '../model/note';
import { type NotesRepository } from '../services/notesRepository';
import styles from './NotesPersistence.module.css';
import { useNotesDispatch, useNotesState } from './notesContext';

const SAVE_DEBOUNCE_MS = 400;

interface NotesPersistenceProps {
  readonly repository: NotesRepository;
  /** Board content for a first visit (or when storage came back empty). */
  readonly seed: readonly Note[];
  readonly children: ReactNode;
}

/**
 * Bridges the notes state to a NotesRepository.
 *
 * - Children render only after hydration resolves, which structurally rules
 *   out edit-before-load races and merge logic (StrictMode's double-invoked
 *   effect is handled with a cancellation flag; hydration is a full replace).
 * - Saves are debounced per burst of changes and chained onto one promise
 *   queue, so a slow async backend can never apply writes out of order.
 * - pagehide flushes the latest state through the same save path, covering
 *   the tab being closed inside the debounce window.
 */
export function NotesPersistence({ repository, seed, children }: NotesPersistenceProps) {
  const state = useNotesState();
  const dispatch = useNotesDispatch();
  const [ready, setReady] = useState(false);

  const notesRef = useRef(state.notes);
  useEffect(() => {
    notesRef.current = state.notes;
  });

  const saveChainRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let cancelled = false;
    repository
      .load()
      .then((notes) => {
        if (cancelled) return;
        dispatch({ type: 'notes/hydrated', notes: notes.length > 0 ? notes : seed });
        setReady(true);
      })
      .catch((error: unknown) => {
        console.error('Sticky Notes: loading failed, starting with a fresh desk.', error);
        if (cancelled) return;
        dispatch({ type: 'notes/hydrated', notes: seed });
        setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [repository, dispatch, seed]);

  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => {
      saveChainRef.current = saveChainRef.current
        .then(() => repository.save(Object.values(state.notes)))
        .catch((error: unknown) => {
          console.warn('Sticky Notes: saving failed.', error);
        });
    }, SAVE_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [state.notes, ready, repository]);

  useEffect(() => {
    if (!ready) return;
    const flush = () => {
      void repository.save(Object.values(notesRef.current));
    };
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
    };
  }, [ready, repository]);

  if (!ready) {
    return (
      <div className={styles.loading} role="status">
        Setting up your desk…
      </div>
    );
  }
  return <>{children}</>;
}
