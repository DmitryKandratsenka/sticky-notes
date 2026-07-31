import { type NotesRepository } from './notesRepository';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Decorates a repository with an artificial network round-trip, turning the
 * synchronous localStorage adapter into an honest asynchronous "API" (bonus V):
 * the app has to cope with load latency and in-flight saves.
 *
 * Saves start the underlying write immediately and only delay completion —
 * so the pagehide flush still lands even when the tab dies before the
 * simulated round-trip finishes.
 */
export function withSimulatedLatency(inner: NotesRepository, latencyMs: number): NotesRepository {
  return {
    load: async (...args) => {
      const [notes] = await Promise.all([inner.load(...args), delay(latencyMs)]);
      return notes;
    },
    save: async (notes) => {
      await Promise.all([inner.save(notes), delay(latencyMs)]);
    },
  };
}
