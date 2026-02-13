"use client";

import { useMemo, useRef } from "react";
import styles from "./editor.module.css";
import type { BlockRecord } from "@/lib/types/editor";

interface BlockEditorProps {
  block: BlockRecord;
  onCommit: (html: string) => void;
  onCancel: () => void;
}

export function BlockEditor({ block, onCommit, onCancel }: BlockEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  const editorStyle = useMemo(
    () => ({
      top: Math.max(10, block.top - 6),
      left: Math.max(10, block.left - 6),
      width: Math.max(260, block.width + 12)
    }),
    [block]
  );

  return (
    <div className={styles.blockEditor} style={editorStyle}>
      <div
        ref={editorRef}
        className={styles.blockCanvas}
        contentEditable
        suppressContentEditableWarning
        dangerouslySetInnerHTML={{ __html: block.html }}
      />
      <div className={styles.blockActions}>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          onClick={() => {
            onCommit(editorRef.current?.innerHTML ?? block.html);
          }}
        >
          Commit
        </button>
      </div>
    </div>
  );
}
