import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from 'react';

import { type Note } from '../model/note';
import {
  EMPTY_BOARD_STATE,
  notesReducer,
  type BoardState,
  type NotesAction,
} from '../model/notesReducer';
import { invariant } from '../shared/lib/invariant';

const NotesStateContext = createContext<BoardState | null>(null);
const NotesDispatchContext = createContext<Dispatch<NotesAction> | null>(null);

interface NotesProviderProps {
  readonly initialNotes: readonly Note[];
  readonly children: ReactNode;
}

/**
 * State and dispatch live in separate contexts so components that only
 * dispatch (toolbar-like UI) never re-render on state changes.
 */
export function NotesProvider({ initialNotes, children }: NotesProviderProps) {
  const [state, dispatch] = useReducer(notesReducer, initialNotes, (notes) =>
    notesReducer(EMPTY_BOARD_STATE, { type: 'notes/hydrated', notes }),
  );
  return (
    <NotesDispatchContext.Provider value={dispatch}>
      <NotesStateContext.Provider value={state}>{children}</NotesStateContext.Provider>
    </NotesDispatchContext.Provider>
  );
}

export function useNotesState(): BoardState {
  const state = useContext(NotesStateContext);
  invariant(state !== null, 'useNotesState must be used within a NotesProvider');
  return state;
}

export function useNotesDispatch(): Dispatch<NotesAction> {
  const dispatch = useContext(NotesDispatchContext);
  invariant(dispatch !== null, 'useNotesDispatch must be used within a NotesProvider');
  return dispatch;
}
