import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from 'react';

import {
  EMPTY_BOARD_STATE,
  notesReducer,
  type BoardState,
  type NotesAction,
} from '../model/notesReducer';
import { invariant } from '../shared/lib/invariant';

const NotesStateContext = createContext<BoardState | null>(null);
const NotesDispatchContext = createContext<Dispatch<NotesAction> | null>(null);

/**
 * State and dispatch live in separate contexts so components that only
 * dispatch (toolbar-like UI) never re-render on state changes. The board
 * starts empty; NotesPersistence hydrates it from the repository.
 */
export function NotesProvider({ children }: { readonly children: ReactNode }) {
  const [state, dispatch] = useReducer(notesReducer, EMPTY_BOARD_STATE);
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
