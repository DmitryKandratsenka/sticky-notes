import { useRef, type KeyboardEvent } from 'react';

import { cx } from '../../shared/lib/cx';
import styles from './Note.module.css';

interface NoteTextEditorProps {
  readonly initialText: string;
  /** Called exactly once, when editing finishes. Escape discards (text = null). */
  readonly onClose: (text: string | null) => void;
}

/**
 * Uncontrolled textarea overlay sharing the display element's exact font
 * metrics (same .text class), so entering edit mode never shifts a glyph.
 * Commit happens on blur — which the browser also fires when the user
 * pointer-downs anywhere else — keeping "click away to save" free.
 */
export function NoteTextEditor({ initialText, onClose }: NoteTextEditorProps) {
  const closedRef = useRef(false);

  const close = (text: string | null) => {
    if (closedRef.current) return;
    closedRef.current = true;
    onClose(text);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      close(null);
    } else if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      close(event.currentTarget.value);
    }
  };

  return (
    <textarea
      className={cx(styles.text, styles.editor)}
      defaultValue={initialText}
      aria-label="Note text"
      placeholder="Write something…"
      autoFocus
      onFocus={(event) => {
        const end = event.currentTarget.value.length;
        event.currentTarget.setSelectionRange(end, end);
      }}
      onBlur={(event) => {
        close(event.currentTarget.value);
      }}
      onKeyDown={handleKeyDown}
      onPointerDown={(event) => {
        // The textarea needs native text selection: never start a note drag.
        event.stopPropagation();
      }}
      onDoubleClick={(event) => {
        event.stopPropagation();
      }}
    />
  );
}
