import { describe, expect, it, vi } from 'vitest';

import { parseNoteId, type Note, type NoteId } from '../model/note';
import { createLocalStorageNotesRepository } from './localStorageNotesRepository';

function id(value: string): NoteId {
  const parsed = parseNoteId(value);
  if (parsed === null) throw new Error(`Invalid test id: ${value}`);
  return parsed;
}

const NOTE: Note = {
  id: id('note-1'),
  rect: { x: 1, y: 2, width: 200, height: 200 },
  zIndex: 1,
  color: 'sky',
  text: '',
};

function makeStorage(initial?: Record<string, string>) {
  const map = new Map(Object.entries(initial ?? {}));
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    dump: () => Object.fromEntries(map),
  };
}

describe('createLocalStorageNotesRepository', () => {
  it('loads an empty board when nothing is stored', async () => {
    const repo = createLocalStorageNotesRepository(makeStorage());
    await expect(repo.load()).resolves.toEqual([]);
  });

  it('round-trips notes through storage', async () => {
    const storage = makeStorage();
    const repo = createLocalStorageNotesRepository(storage);
    await repo.save([NOTE]);
    await expect(repo.load()).resolves.toEqual([NOTE]);
  });

  it('treats unreadable payloads as an empty board without throwing', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const repo = createLocalStorageNotesRepository(makeStorage({ 'sticky-notes:v1': '{broken' }));
    await expect(repo.load()).resolves.toEqual([]);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('swallows quota errors on save', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const repo = createLocalStorageNotesRepository({
      getItem: () => null,
      setItem: () => {
        throw new DOMException('quota', 'QuotaExceededError');
      },
    });
    await expect(repo.save([NOTE])).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
