import { type Note } from '../model/note';
import { type NotesRepository } from './notesRepository';
import { deserializeNotes, serializeNotes } from './persistedNotes';

const STORAGE_KEY = 'sticky-notes:v1';

/**
 * localStorage adapter. The write happens synchronously inside save() — the
 * returned promise only models completion — so a flush on pagehide is
 * guaranteed to land even though callers treat the repository as fully async.
 * Storage failures (quota, privacy mode, corrupt payloads) degrade to a
 * warning and an empty board rather than a crash. Multi-tab use is
 * last-write-wins by design.
 */
export function createLocalStorageNotesRepository(
  storage: Pick<Storage, 'getItem' | 'setItem'> = window.localStorage,
): NotesRepository {
  return {
    load: () => {
      let raw: string | null = null;
      try {
        raw = storage.getItem(STORAGE_KEY);
      } catch (error) {
        console.warn('Sticky Notes: storage is not readable, starting fresh.', error);
      }
      if (raw === null) return Promise.resolve([]);
      const notes = deserializeNotes(raw);
      if (notes === null) {
        console.warn('Sticky Notes: stored data was unreadable and has been ignored.');
        return Promise.resolve([]);
      }
      return Promise.resolve(notes);
    },
    save: (notes: readonly Note[]) => {
      try {
        storage.setItem(STORAGE_KEY, serializeNotes(notes));
      } catch (error) {
        console.warn('Sticky Notes: saving failed (storage full or unavailable).', error);
      }
      return Promise.resolve();
    },
  };
}
