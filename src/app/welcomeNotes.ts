import { parseNoteId, type Note, type NoteId } from '../model/note';
import { invariant } from '../shared/lib/invariant';

function seedId(value: string): NoteId {
  const id = parseNoteId(value);
  invariant(id !== null, `Invalid seed note id: ${value}`);
  return id;
}

/**
 * First-run content. Ids are fixed so the seed is deterministic and safe to
 * build in React StrictMode's double-invoked initializers.
 */
export const WELCOME_NOTES: readonly Note[] = [
  {
    id: seedId('welcome-drag'),
    rect: { x: 110, y: 150, width: 230, height: 215 },
    zIndex: 1,
    color: 'butter',
    text: 'Welcome to your desk!\n\nGrab me and drag me anywhere.',
  },
  {
    id: seedId('welcome-draw'),
    rect: { x: 395, y: 235, width: 250, height: 230 },
    zIndex: 2,
    color: 'mint',
    text: 'Draw on any empty patch of desk to cut a fresh note exactly that size.',
  },
  {
    id: seedId('welcome-edit'),
    rect: { x: 700, y: 140, width: 240, height: 225 },
    zIndex: 3,
    color: 'coral',
    text: 'Double-click me to write.\n\nDrop me on the tray to toss me out.',
  },
];
