import { act, fireEvent, render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createNoteDraft, type Note } from '../model/note';
import { type NotesRepository } from '../services/notesRepository';
import { NotesPersistence } from './NotesPersistence';
import { NotesProvider, useNotesDispatch, useNotesState } from './notesContext';
import { WELCOME_NOTES } from './welcomeNotes';

function makeRepository(initial: readonly Note[] = []) {
  const save = vi.fn<(notes: readonly Note[]) => Promise<void>>(() => Promise.resolve());
  const repository: NotesRepository = {
    load: vi.fn(() => Promise.resolve(initial)),
    save,
  };
  return { repository, save };
}

/** Renders the note count and can create a note, to poke the state from tests. */
function Probe() {
  const { notes } = useNotesState();
  const dispatch = useNotesDispatch();
  return (
    <button
      data-testid="probe"
      onClick={() => {
        dispatch({
          type: 'note/created',
          draft: createNoteDraft({
            rect: { x: 0, y: 0, width: 150, height: 150 },
            color: 'butter',
          }),
        });
      }}
    >
      {Object.keys(notes).length}
    </button>
  );
}

function renderPersistence(repository: NotesRepository) {
  return render(
    <StrictMode>
      <NotesProvider>
        <NotesPersistence repository={repository} seed={WELCOME_NOTES}>
          <Probe />
        </NotesPersistence>
      </NotesProvider>
    </StrictMode>,
  );
}

afterEach(() => {
  vi.useRealTimers();
});

describe('NotesPersistence', () => {
  it('gates children until hydration resolves, then seeds an empty board', async () => {
    const { repository } = makeRepository([]);
    renderPersistence(repository);
    expect(screen.queryByTestId('probe')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(await screen.findByTestId('probe')).toHaveTextContent(String(WELCOME_NOTES.length));
  });

  it('hydrates from stored notes without seeding', async () => {
    const stored = WELCOME_NOTES.slice(0, 1);
    const { repository } = makeRepository(stored);
    renderPersistence(repository);
    expect(await screen.findByTestId('probe')).toHaveTextContent('1');
  });

  it('debounces bursts of changes into a single save of the latest state', async () => {
    vi.useFakeTimers();
    const { repository, save } = makeRepository([]);
    renderPersistence(repository);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0); // let hydration resolve
    });

    const probe = screen.getByTestId('probe');
    fireEvent.click(probe); // +1 note
    fireEvent.click(probe); // +1 note, reschedules the debounce
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(save).toHaveBeenCalledTimes(1);
    const savedNotes = save.mock.calls[0]?.[0];
    expect(savedNotes).toHaveLength(WELCOME_NOTES.length + 2);
  });

  it('flushes the latest state on pagehide', async () => {
    const { repository, save } = makeRepository([]);
    renderPersistence(repository);
    await screen.findByTestId('probe');
    fireEvent.click(screen.getByTestId('probe'));
    window.dispatchEvent(new Event('pagehide'));
    expect(save).toHaveBeenCalled();
    const lastCall = save.mock.calls.at(-1)?.[0];
    expect(lastCall).toHaveLength(WELCOME_NOTES.length + 1);
  });
});
