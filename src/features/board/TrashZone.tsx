import { useEffect, useRef } from 'react';

import styles from './TrashZone.module.css';
import { useTrashApiRef } from './trashContext';

function toggle(node: HTMLElement, className: string | undefined, on: boolean): void {
  if (className !== undefined) node.classList.toggle(className, on);
}

/**
 * The waste tray. Sleeps in the bottom corner, wakes while a note is dragged
 * and heats up when the pointer carries a note over it; dropping there deletes
 * the note. All state changes arrive through the imperative TrashZoneApi.
 */
export function TrashZone() {
  const apiRef = useTrashApiRef();
  const zoneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const zone = zoneRef.current;
    if (zone === null) return;
    apiRef.current = {
      getRect: () => {
        const rect = zone.getBoundingClientRect();
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      },
      setAwake: (awake) => {
        toggle(zone, styles.awake, awake);
        if (!awake) toggle(zone, styles.hot, false);
      },
      setHot: (hot) => {
        toggle(zone, styles.hot, hot);
      },
    };
    return () => {
      apiRef.current = null;
    };
  }, [apiRef]);

  return (
    <div className={styles.zone} ref={zoneRef} aria-hidden="true">
      <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path
          className={styles.lid}
          d="M4 6.2 H20 M9.5 6 C9.5 4.4 10.4 3.5 12 3.5 C13.6 3.5 14.5 4.4 14.5 6"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M6 8.5 L7 20.2 C7 20.8 7.5 21.3 8.1 21.3 L15.9 21.3 C16.5 21.3 17 20.8 17 20.2 L18 8.5"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path d="M10 11 L10.4 18.5 M14 11 L13.6 18.5" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <span className={styles.label}>toss</span>
    </div>
  );
}
