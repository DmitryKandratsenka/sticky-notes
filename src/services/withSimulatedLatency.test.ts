import { afterEach, describe, expect, it, vi } from 'vitest';

import { type NotesRepository } from './notesRepository';
import { withSimulatedLatency } from './withSimulatedLatency';

afterEach(() => {
  vi.useRealTimers();
});

describe('withSimulatedLatency', () => {
  it('delays load completion by the configured latency', async () => {
    vi.useFakeTimers();
    const inner: NotesRepository = {
      load: vi.fn(() => Promise.resolve([])),
      save: vi.fn(() => Promise.resolve()),
    };
    const repo = withSimulatedLatency(inner, 200);

    const resolved = vi.fn();
    void repo.load().then(resolved);

    await vi.advanceTimersByTimeAsync(150);
    expect(resolved).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(60);
    expect(resolved).toHaveBeenCalledWith([]);
  });

  it('starts the underlying save immediately, delaying only completion', async () => {
    vi.useFakeTimers();
    const inner: NotesRepository = {
      load: vi.fn(() => Promise.resolve([])),
      save: vi.fn(() => Promise.resolve()),
    };
    const repo = withSimulatedLatency(inner, 200);

    const resolved = vi.fn();
    void repo.save([]).then(resolved);

    // The write-through happened synchronously: a pagehide flush is safe.
    expect(inner.save).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(150);
    expect(resolved).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(60);
    expect(resolved).toHaveBeenCalled();
  });
});
