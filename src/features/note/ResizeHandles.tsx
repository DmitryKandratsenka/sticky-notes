import { type PointerEvent as ReactPointerEvent } from 'react';

import { cx } from '../../shared/lib/cx';
import styles from './ResizeHandles.module.css';
import { HANDLE_CURSORS, RESIZE_HANDLES, type ResizeHandle } from './useNoteResize';

interface ResizeHandlesProps {
  readonly onHandlePointerDown: (
    handle: ResizeHandle,
    event: ReactPointerEvent<HTMLElement>,
  ) => void;
}

/** Four corner grips; generous hit areas, visible only while the note is hovered. */
export function ResizeHandles({ onHandlePointerDown }: ResizeHandlesProps) {
  return (
    <>
      {RESIZE_HANDLES.map((handle) => (
        <div
          key={handle}
          className={cx(styles.handle, styles[handle])}
          style={{ cursor: HANDLE_CURSORS[handle] }}
          onPointerDown={(event) => {
            onHandlePointerDown(handle, event);
          }}
        />
      ))}
    </>
  );
}
