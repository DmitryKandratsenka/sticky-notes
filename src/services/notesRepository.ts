import { type Note } from '../model/note';

/**
 * Persistence port. The app only ever talks to this interface; adapters
 * (localStorage today, a REST client tomorrow) plug in behind it.
 */
export interface NotesRepository {
  load: () => Promise<readonly Note[]>;
  save: (notes: readonly Note[]) => Promise<void>;
}
