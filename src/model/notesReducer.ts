import { assertNever } from '../shared/lib/assert';
import { clampPosition, rectsEqual, type Point, type Rect, type Size } from './geometry';
import { type Note, type NoteColor, type NoteDraft, type NoteId } from './note';

export interface BoardState {
  /** Keyed by id; object insertion order doubles as a stable DOM render order. */
  readonly notes: Readonly<Record<NoteId, Note>>;
}

export const EMPTY_BOARD_STATE: BoardState = { notes: {} };

export type NotesAction =
  | { readonly type: 'note/created'; readonly draft: NoteDraft }
  | { readonly type: 'note/moved'; readonly id: NoteId; readonly position: Point }
  | { readonly type: 'note/resized'; readonly id: NoteId; readonly rect: Rect }
  | { readonly type: 'note/removed'; readonly id: NoteId }
  | { readonly type: 'note/broughtToFront'; readonly id: NoteId }
  | { readonly type: 'note/textEdited'; readonly id: NoteId; readonly text: string }
  | { readonly type: 'note/recolored'; readonly id: NoteId; readonly color: NoteColor }
  | { readonly type: 'notes/hydrated'; readonly notes: readonly Note[] }
  | { readonly type: 'board/resized'; readonly bounds: Size };

const FIRST_Z_INDEX = 1;

function maxZIndex(notes: Readonly<Record<NoteId, Note>>): number {
  let max = FIRST_Z_INDEX - 1;
  for (const note of Object.values(notes)) {
    max = Math.max(max, note.zIndex);
  }
  return max;
}

function replaceNote(state: BoardState, note: Note): BoardState {
  return { notes: { ...state.notes, [note.id]: note } };
}

/**
 * Pure state transitions for the board. Untouched notes keep their object
 * identity so memoized note components skip re-rendering, and every no-op
 * transition returns the same state object.
 */
export function notesReducer(state: BoardState, action: NotesAction): BoardState {
  switch (action.type) {
    case 'note/created': {
      const note: Note = { ...action.draft, zIndex: maxZIndex(state.notes) + 1 };
      return replaceNote(state, note);
    }

    case 'note/moved': {
      const note = state.notes[action.id];
      if (note === undefined) return state;
      if (note.rect.x === action.position.x && note.rect.y === action.position.y) return state;
      return replaceNote(state, { ...note, rect: { ...note.rect, ...action.position } });
    }

    case 'note/resized': {
      const note = state.notes[action.id];
      if (note === undefined || rectsEqual(note.rect, action.rect)) return state;
      return replaceNote(state, { ...note, rect: action.rect });
    }

    case 'note/removed': {
      if (state.notes[action.id] === undefined) return state;
      const { [action.id]: _removed, ...rest } = state.notes;
      return { notes: rest };
    }

    case 'note/broughtToFront': {
      const note = state.notes[action.id];
      if (note === undefined) return state;
      const top = maxZIndex(state.notes);
      if (note.zIndex === top) return state;
      return replaceNote(state, { ...note, zIndex: top + 1 });
    }

    case 'note/textEdited': {
      const note = state.notes[action.id];
      if (note === undefined || note.text === action.text) return state;
      return replaceNote(state, { ...note, text: action.text });
    }

    case 'note/recolored': {
      const note = state.notes[action.id];
      if (note === undefined || note.color === action.color) return state;
      return replaceNote(state, { ...note, color: action.color });
    }

    case 'notes/hydrated': {
      // Restore in stacking order and renumber compactly: insertion order then
      // matches z-order, and persisted zIndex values never grow unbounded.
      const notes: Record<NoteId, Note> = {};
      const sorted = [...action.notes].sort((a, b) => a.zIndex - b.zIndex);
      sorted.forEach((note, index) => {
        notes[note.id] = { ...note, zIndex: FIRST_Z_INDEX + index };
      });
      return { notes };
    }

    case 'board/resized': {
      let changed = false;
      const notes: Record<NoteId, Note> = {};
      for (const note of Object.values(state.notes)) {
        const position = clampPosition(note.rect, note.rect, action.bounds);
        if (position.x === note.rect.x && position.y === note.rect.y) {
          notes[note.id] = note;
        } else {
          notes[note.id] = { ...note, rect: { ...note.rect, ...position } };
          changed = true;
        }
      }
      return changed ? { notes } : state;
    }

    default:
      return assertNever(action);
  }
}
