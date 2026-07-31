import { type NoteColor } from '../../model/note';

/**
 * Paper colors per palette id. Kept in TypeScript (not CSS classes) so the
 * mapping is exhaustiveness-checked; shading is derived in CSS via color-mix.
 */
export const NOTE_PAPER_COLORS = {
  butter: '#ffd95e',
  coral: '#ff9d8a',
  mint: '#a7e0b8',
  sky: '#9cd2ee',
  lilac: '#cdb5ec',
} satisfies Record<NoteColor, string>;
