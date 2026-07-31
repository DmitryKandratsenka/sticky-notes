import { type Rect, type Size } from './geometry';

declare const noteIdBrand: unique symbol;

/** Branded id: plain strings cannot be passed where a NoteId is expected. */
export type NoteId = string & { readonly [noteIdBrand]: 'NoteId' };

export const NOTE_COLORS = ['butter', 'coral', 'mint', 'sky', 'lilac'] as const;
export type NoteColor = (typeof NOTE_COLORS)[number];

export interface Note {
  readonly id: NoteId;
  /** Board-local coordinates; the board's origin is its top-left corner. */
  readonly rect: Rect;
  readonly zIndex: number;
  readonly color: NoteColor;
  readonly text: string;
}

/** A note before the reducer assigns its stacking order. */
export type NoteDraft = Omit<Note, 'zIndex'>;

export const NOTE_SIZE_LIMITS = {
  min: { width: 140, height: 140 },
  max: { width: 520, height: 520 },
} as const;

export const NOTE_DEFAULT_SIZE: Size = { width: 200, height: 200 };

export function createNoteId(): NoteId {
  return crypto.randomUUID() as NoteId;
}

/** The only way to turn outside data into a NoteId (used at the persistence boundary). */
export function parseNoteId(value: unknown): NoteId | null {
  return typeof value === 'string' && value.length > 0 ? (value as NoteId) : null;
}

export function createNoteDraft(args: { rect: Rect; color: NoteColor; text?: string }): NoteDraft {
  return {
    id: createNoteId(),
    rect: args.rect,
    color: args.color,
    text: args.text ?? '',
  };
}
