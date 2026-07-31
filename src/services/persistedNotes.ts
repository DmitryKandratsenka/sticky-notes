import { clampSize } from '../model/geometry';
import {
  NOTE_COLORS,
  NOTE_SIZE_LIMITS,
  parseNoteId,
  type Note,
  type NoteColor,
} from '../model/note';

/**
 * Storage DTOs, deliberately separate from the domain types: the persisted
 * shape is a public contract that must survive refactors of the in-memory
 * model. Everything read back is treated as `unknown` and validated by hand.
 */
interface PersistedNoteV1 {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly z: number;
  readonly color: string;
  readonly text: string;
}

interface PersistedStateV1 {
  readonly version: 1;
  readonly notes: readonly PersistedNoteV1[];
}

const CURRENT_VERSION = 1;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNoteColor(value: unknown): value is NoteColor {
  return typeof value === 'string' && (NOTE_COLORS as readonly string[]).includes(value);
}

function isPersistedNote(value: unknown): value is PersistedNoteV1 {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    isFiniteNumber(value.x) &&
    isFiniteNumber(value.y) &&
    isFiniteNumber(value.width) &&
    isFiniteNumber(value.height) &&
    isFiniteNumber(value.z) &&
    typeof value.color === 'string' &&
    typeof value.text === 'string'
  );
}

function toPersisted(note: Note): PersistedNoteV1 {
  return {
    id: note.id,
    x: note.rect.x,
    y: note.rect.y,
    width: note.rect.width,
    height: note.rect.height,
    z: note.zIndex,
    color: note.color,
    text: note.text,
  };
}

function toDomain(persisted: PersistedNoteV1): Note | null {
  const id = parseNoteId(persisted.id);
  if (id === null || !isNoteColor(persisted.color)) return null;
  // Guard against tampered or out-of-date size limits.
  const size = clampSize(persisted, NOTE_SIZE_LIMITS);
  return {
    id,
    rect: { x: persisted.x, y: persisted.y, width: size.width, height: size.height },
    zIndex: persisted.z,
    color: persisted.color,
    text: persisted.text,
  };
}

export function serializeNotes(notes: readonly Note[]): string {
  const state: PersistedStateV1 = { version: CURRENT_VERSION, notes: notes.map(toPersisted) };
  return JSON.stringify(state);
}

/**
 * Parses a raw storage payload. Returns null when the envelope is unusable
 * (corrupt JSON, unknown version); individually broken notes are dropped so
 * one bad record never takes the whole board down.
 */
export function deserializeNotes(raw: string): readonly Note[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(parsed) || parsed.version !== CURRENT_VERSION || !Array.isArray(parsed.notes)) {
    return null;
  }
  return parsed.notes
    .filter(isPersistedNote)
    .map(toDomain)
    .filter((note): note is Note => note !== null);
}
