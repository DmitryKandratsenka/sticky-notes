import { describe, expect, it } from 'vitest';

import { parseNoteId, type Note, type NoteId } from './note';
import { EMPTY_BOARD_STATE, notesReducer, type BoardState, type NotesAction } from './notesReducer';

function id(value: string): NoteId {
  const parsed = parseNoteId(value);
  if (parsed === null) throw new Error(`Invalid test id: ${value}`);
  return parsed;
}

function makeNote(overrides: Partial<Note> & { id: NoteId }): Note {
  return {
    rect: { x: 10, y: 10, width: 200, height: 200 },
    zIndex: 1,
    color: 'butter',
    text: '',
    ...overrides,
  };
}

function boardWith(...notes: readonly Note[]): BoardState {
  return notesReducer(EMPTY_BOARD_STATE, { type: 'notes/hydrated', notes });
}

const A = id('note-a');
const B = id('note-b');

describe('note/created', () => {
  it('assigns the next z-index on top of existing notes', () => {
    const state = boardWith(makeNote({ id: A, zIndex: 4 }));
    const next = notesReducer(state, {
      type: 'note/created',
      draft: { id: B, rect: { x: 0, y: 0, width: 150, height: 150 }, color: 'mint', text: 'hi' },
    });
    expect(next.notes[B]).toEqual({
      id: B,
      rect: { x: 0, y: 0, width: 150, height: 150 },
      color: 'mint',
      text: 'hi',
      zIndex: 2, // hydration renumbered A to 1
    });
  });

  it('starts at z-index 1 on an empty board', () => {
    const next = notesReducer(EMPTY_BOARD_STATE, {
      type: 'note/created',
      draft: { id: A, rect: { x: 0, y: 0, width: 150, height: 150 }, color: 'sky', text: '' },
    });
    expect(next.notes[A]?.zIndex).toBe(1);
  });
});

describe('note/moved', () => {
  it('updates only the position and keeps other notes untouched by identity', () => {
    const state = boardWith(makeNote({ id: A }), makeNote({ id: B }));
    const next = notesReducer(state, { type: 'note/moved', id: A, position: { x: 99, y: 88 } });
    expect(next.notes[A]?.rect).toEqual({ x: 99, y: 88, width: 200, height: 200 });
    expect(next.notes[B]).toBe(state.notes[B]);
  });

  it('is a no-op for an unknown id and for an unchanged position', () => {
    const state = boardWith(makeNote({ id: A }));
    expect(notesReducer(state, { type: 'note/moved', id: B, position: { x: 1, y: 1 } })).toBe(
      state,
    );
    expect(notesReducer(state, { type: 'note/moved', id: A, position: { x: 10, y: 10 } })).toBe(
      state,
    );
  });
});

describe('note/resized', () => {
  it('replaces the rect', () => {
    const state = boardWith(makeNote({ id: A }));
    const rect = { x: 5, y: 6, width: 300, height: 250 };
    expect(notesReducer(state, { type: 'note/resized', id: A, rect }).notes[A]?.rect).toEqual(rect);
  });

  it('is a no-op when the rect is unchanged', () => {
    const state = boardWith(makeNote({ id: A }));
    const action: NotesAction = {
      type: 'note/resized',
      id: A,
      rect: { x: 10, y: 10, width: 200, height: 200 },
    };
    expect(notesReducer(state, action)).toBe(state);
  });
});

describe('note/removed', () => {
  it('removes the note and keeps the rest', () => {
    const state = boardWith(makeNote({ id: A }), makeNote({ id: B }));
    const next = notesReducer(state, { type: 'note/removed', id: A });
    expect(next.notes[A]).toBeUndefined();
    expect(next.notes[B]).toBe(state.notes[B]);
  });

  it('is a no-op for an unknown id', () => {
    const state = boardWith(makeNote({ id: A }));
    expect(notesReducer(state, { type: 'note/removed', id: B })).toBe(state);
  });
});

describe('note/broughtToFront', () => {
  it('moves the note above the current maximum', () => {
    const state = boardWith(makeNote({ id: A, zIndex: 1 }), makeNote({ id: B, zIndex: 2 }));
    const next = notesReducer(state, { type: 'note/broughtToFront', id: A });
    expect(next.notes[A]?.zIndex).toBe(3);
    expect(next.notes[B]?.zIndex).toBe(2);
  });

  it('is a no-op when the note is already on top', () => {
    const state = boardWith(makeNote({ id: A, zIndex: 1 }), makeNote({ id: B, zIndex: 2 }));
    expect(notesReducer(state, { type: 'note/broughtToFront', id: B })).toBe(state);
  });
});

describe('note/textEdited and note/recolored', () => {
  it('updates the changed field and no-ops on identical values', () => {
    const state = boardWith(makeNote({ id: A, text: 'old', color: 'butter' }));
    expect(
      notesReducer(state, { type: 'note/textEdited', id: A, text: 'new' }).notes[A]?.text,
    ).toBe('new');
    expect(notesReducer(state, { type: 'note/textEdited', id: A, text: 'old' })).toBe(state);
    expect(
      notesReducer(state, { type: 'note/recolored', id: A, color: 'lilac' }).notes[A]?.color,
    ).toBe('lilac');
    expect(notesReducer(state, { type: 'note/recolored', id: A, color: 'butter' })).toBe(state);
  });
});

describe('notes/hydrated', () => {
  it('renumbers z-indexes compactly, preserving stacking order', () => {
    const state = notesReducer(EMPTY_BOARD_STATE, {
      type: 'notes/hydrated',
      notes: [makeNote({ id: A, zIndex: 900 }), makeNote({ id: B, zIndex: 7 })],
    });
    expect(state.notes[B]?.zIndex).toBe(1);
    expect(state.notes[A]?.zIndex).toBe(2);
    // Insertion order follows stacking order after hydration.
    expect(Object.keys(state.notes)).toEqual([B, A]);
  });
});

describe('board/resized', () => {
  it('pulls stranded notes back inside the new bounds', () => {
    const inside = makeNote({ id: A });
    const stranded = makeNote({ id: B, rect: { x: 900, y: 700, width: 200, height: 200 } });
    const state = boardWith(inside, stranded);
    const next = notesReducer(state, {
      type: 'board/resized',
      bounds: { width: 800, height: 600 },
    });
    expect(next.notes[B]?.rect).toEqual({ x: 600, y: 400, width: 200, height: 200 });
    expect(next.notes[A]).toBe(state.notes[A]);
  });

  it('is a no-op when every note already fits', () => {
    const state = boardWith(makeNote({ id: A }));
    expect(
      notesReducer(state, { type: 'board/resized', bounds: { width: 1024, height: 768 } }),
    ).toBe(state);
  });
});
