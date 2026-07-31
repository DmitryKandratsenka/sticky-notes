import { describe, expect, it } from 'vitest';

import { parseNoteId, type Note, type NoteId } from '../model/note';
import { deserializeNotes, serializeNotes } from './persistedNotes';

function id(value: string): NoteId {
  const parsed = parseNoteId(value);
  if (parsed === null) throw new Error(`Invalid test id: ${value}`);
  return parsed;
}

const NOTE: Note = {
  id: id('note-1'),
  rect: { x: 10, y: 20, width: 200, height: 180 },
  zIndex: 3,
  color: 'mint',
  text: 'hello\nworld',
};

describe('serialize/deserialize round trip', () => {
  it('preserves every note field', () => {
    expect(deserializeNotes(serializeNotes([NOTE]))).toEqual([NOTE]);
  });
});

describe('deserializeNotes', () => {
  it('rejects corrupt JSON', () => {
    expect(deserializeNotes('{not json')).toBeNull();
  });

  it('rejects unknown versions and foreign shapes', () => {
    expect(deserializeNotes(JSON.stringify({ version: 99, notes: [] }))).toBeNull();
    expect(deserializeNotes(JSON.stringify({ hello: 'world' }))).toBeNull();
    expect(deserializeNotes(JSON.stringify(null))).toBeNull();
  });

  it('drops broken notes but keeps the healthy ones', () => {
    const payload = JSON.parse(serializeNotes([NOTE])) as { version: 1; notes: unknown[] };
    payload.notes.push(
      { id: 'missing-fields' },
      { ...JSON.parse(JSON.stringify(payload.notes[0])), x: 'NaN-ish' },
      { ...JSON.parse(JSON.stringify(payload.notes[0])), id: 'bad-color', color: 'chartreuse' },
      { ...JSON.parse(JSON.stringify(payload.notes[0])), id: '' },
    );
    expect(deserializeNotes(JSON.stringify(payload))).toEqual([NOTE]);
  });

  it('clamps sizes back into the allowed limits', () => {
    const payload = JSON.parse(serializeNotes([NOTE])) as {
      version: 1;
      notes: [{ width: number; height: number }];
    };
    payload.notes[0].width = 5000;
    payload.notes[0].height = 5;
    const restored = deserializeNotes(JSON.stringify(payload));
    expect(restored?.[0]?.rect.width).toBeLessThanOrEqual(520);
    expect(restored?.[0]?.rect.height).toBeGreaterThanOrEqual(140);
  });
});
