import { createContext, useContext, useRef, type ReactNode, type RefObject } from 'react';

import { type Rect } from '../../model/geometry';
import { invariant } from '../../shared/lib/invariant';

/**
 * Imperative surface the trash zone exposes to drag gestures. Pointer capture
 * retargets every event to the dragged note, so drop detection has to be
 * coordinate math against this rect — `:hover` and event targets can't work.
 * State flips are direct class toggles: they happen on every drag frame and
 * must not run through React.
 */
export interface TrashZoneApi {
  /** Trash rect in client coordinates, for caching at gesture start. */
  getRect: () => Rect;
  /** A note drag is in flight: the tray wakes up and starts watching. */
  setAwake: (awake: boolean) => void;
  /** The dragged pointer is currently over the tray. */
  setHot: (hot: boolean) => void;
}

const TrashApiContext = createContext<RefObject<TrashZoneApi | null> | null>(null);

export function TrashApiProvider({ children }: { readonly children: ReactNode }) {
  const apiRef = useRef<TrashZoneApi | null>(null);
  return <TrashApiContext.Provider value={apiRef}>{children}</TrashApiContext.Provider>;
}

/** The ref is filled by TrashZone on mount; consumers read it lazily per gesture. */
export function useTrashApiRef(): RefObject<TrashZoneApi | null> {
  const apiRef = useContext(TrashApiContext);
  invariant(apiRef !== null, 'useTrashApiRef must be used within a TrashApiProvider');
  return apiRef;
}
