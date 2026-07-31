import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

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
type SaveStatus = 'idle' | 'saving' | 'saved';

export function NotesPersistence({ repository, seed, children }: NotesPersistenceProps) {
  const state = useNotesState();
  const dispatch = useNotesDispatch();
  const [ready, setReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  // Layout effect for the same reason as the gesture engine's handlers ref:
  // the pagehide flush must never read a state snapshot older than the commit.
  const notesRef = useRef(state.notes);
  useLayoutEffect(() => {
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
      setSaveStatus('saving');
      saveChainRef.current = saveChainRef.current
        .then(() => repository.save(Object.values(state.notes)))
        .then(() => {
          setSaveStatus('saved');
        })
        .catch((error: unknown) => {
          console.warn('Sticky Notes: saving failed.', error);
          setSaveStatus('idle');
        });
    }, SAVE_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [state.notes, ready, repository]);

  // "Saved" lingers briefly, then the chip fades away.
  useEffect(() => {
    if (saveStatus !== 'saved') return;
    const timer = setTimeout(() => {
      setSaveStatus('idle');
    }, 1600);
    return () => {
      clearTimeout(timer);
    };
  }, [saveStatus]);

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
  return (
    <>
      {children}
      <div
        className={styles.saveChip}
        data-visible={saveStatus !== 'idle'}
        role="status"
        aria-live="polite"
      >
        {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved ✓' : ''}
      </div>
    </>
  );
}
