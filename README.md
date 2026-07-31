# Sticky Notes

A single-page sticky-notes board for desktop browsers, built with **React 19 + TypeScript** from
scratch — no UI kits, no drag-and-drop libraries, no state-management libraries. Runtime
dependencies: `react` and `react-dom`, nothing else.

**Live demo:** <https://dmitrykandratsenka.github.io/sticky-notes/> (deployed from `main` by
[GitHub Actions](.github/workflows/deploy.yml); best experienced on a desktop browser).

## Features

All four required features, plus all five bonus features:

| Feature                                                       | How it works                                                                                                                                                                                        |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Create a note of a specified size at a specified position** | Press on empty desk and _draw_ a rectangle — a live ghost previews the exact (min/max-clamped) result; releasing creates that note. A plain click drops a default-size note centered on the cursor. |
| **Move by dragging**                                          | Grab a note anywhere on its body. Notes are clamped to the board.                                                                                                                                   |
| **Resize by dragging**                                        | Grips in all four corners; the opposite corner stays anchored, sizes clamp to limits and board edges without drift.                                                                                 |
| **Remove via trash zone**                                     | Drag a note over the tray in the bottom-right corner — it wakes when a drag starts, heats up when the pointer carries a note over it, and eats the note on drop.                                    |
| _Bonus_ — text                                                | Double-click to edit. Blur or `⌘/Ctrl+Enter` commits, `Escape` discards.                                                                                                                            |
| _Bonus_ — z-order                                             | Pressing a note brings it to the front.                                                                                                                                                             |
| _Bonus_ — colors                                              | Five paper colors; new notes cycle the palette, swatches on each note's strip recolor it.                                                                                                           |
| _Bonus_ — local storage                                       | The board survives reloads; restored notes are re-clamped if the window shrank in the meantime.                                                                                                     |
| _Bonus_ — async API                                           | Persistence goes through an async repository with a simulated-latency decorator (see Architecture); loading gates the UI, saves are debounced and flushed on `pagehide`.                            |

Keyboard: notes are focusable — arrows nudge (`Shift` for larger steps), `Enter` edits,
`Delete` removes. `Escape` cancels an in-flight drag. `prefers-reduced-motion` is respected.

## Getting started

Requires Node.js 20.19+ (tested on Node 24).

```bash
npm install
npm run dev      # start the dev server
npm run build    # type-check and produce a production build in dist/
npm run preview  # serve the production build locally
npm run verify   # typecheck + lint + format check + unit tests
```

## Architecture

State lives in a single pure `notesReducer` behind `useReducer`, holding notes as a
`Readonly<Record<NoteId, Note>>` — object insertion order doubles as a stable DOM order, so
re-stacking never re-orders elements mid-gesture. State and dispatch are exposed through separate
contexts, note components are memoized, and the reducer preserves the object identity of untouched
notes and returns the same state for no-op transitions, so a change re-renders exactly one note.
Static typing is treated as part of the design: note ids are a branded type constructed in exactly
two places, actions form a discriminated union checked for exhaustiveness, domain types are deeply
readonly, and lookup tables use `as const`/`satisfies` so adding a palette color or resize handle
is compiler-enforced everywhere.

All four drag features (move, resize, draw-to-create — and the trash drop, which rides on move)
are built on one gesture primitive, `usePointerDrag`: Pointer Events with best-effort capture, a
travel threshold separating clicks from drags, per-frame batching via `requestAnimationFrame`, and
idempotent teardown across every end path (`pointerup`, `pointercancel`, `lostpointercapture`,
window blur, `Escape`, missed-pointerup detection). For performance, nothing is dispatched while a
gesture is live: the active note is positioned by writing `transform` directly to its DOM node
(state owns `left/top/width/height`; JSX never writes `transform`), geometry is recomputed each
frame as _initial rect + total delta_ by pure, unit-tested functions (anchored resize clamping,
draw-rect normalization, board clamping), and a single action commits the result on release —
trash drop-detection is coordinate math against a cached rect, since pointer capture retargets
events away from anything hoverable.

Persistence sits behind a `NotesRepository` port. The localStorage adapter stores a versioned
envelope and parses everything back from `unknown` with hand-rolled predicates — a broken record
is dropped, a broken envelope means a fresh board, and quota errors degrade to a warning. A
`withSimulatedLatency` decorator turns it into an honest asynchronous "API": the app renders a
loading gate until hydration resolves (which structurally eliminates edit-before-load races,
including StrictMode's double-invoked effects), debounces bursts of changes into one save, chains
saves onto a queue so a slow backend cannot reorder writes, and flushes the latest state on
`pagehide` (the decorator delays only completion, never the underlying write, so that final flush
always lands). Swapping in a real REST client is a one-line change in `App.tsx`.

## Decisions & limitations

- **"Specified size at specified position"** is interpreted as draw-to-create: the drawn
  rectangle _is_ the note's rect, previewed live by a ghost that shows the already-clamped result.
- **Trash detection** uses the pointer position, not note-rect intersection — the pointer is where
  the user's intent is, and a large note grazing the tray with a corner shouldn't delete.
- **Multi-tab** use is last-write-wins by design; cross-tab sync was considered out of scope.
- **Undo/redo** is a natural extension of the reducer model but wasn't part of the brief.
- Note sizes are limited to 140–520 px; the board is the viewport (no panning/zooming).

## Browser support

Latest Chrome (Windows/Mac), Firefox and Edge on desktop, minimum viewport 1024×768, per the
brief. The gesture engine handles the known cross-browser pointer-capture quirks (capture calls
that throw, `lostpointercapture`/`pointerup` ordering differences, drags dying without a
`pointerup`); `touch-action: none` keeps drags alive on touchscreen laptops.

## Project structure

```
src/
├── app/          # composition root: providers, persistence bridge, welcome seed
├── features/
│   ├── board/    # board surface, draw-to-create, trash zone, re-clamp on resize
│   └── note/     # note, move/resize gestures, text editor, color picker
├── model/        # domain types, geometry, reducer — pure and fully unit-tested
├── services/     # repository port, localStorage adapter, latency decorator, DTO parsing
└── shared/       # usePointerDrag gesture engine, small utils, fonts, global styles
```

Tests are colocated with the units they cover (`*.test.ts(x)`); the deepest coverage sits on the
reducer, geometry, gesture engine and persistence parsing. Fonts are self-hosted
(Shantell Sans, SIL OFL 1.1 — see `src/shared/assets/fonts/`).
