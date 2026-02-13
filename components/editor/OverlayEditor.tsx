"use client";

import styles from "./editor.module.css";
import type { BlockRecord } from "@/lib/types/editor";

interface OverlayEditorProps {
  blocks: BlockRecord[];
  activeBlockId: string | null;
  enabled: boolean;
  onSelectBlock: (blockId: string) => void;
}

export function OverlayEditor({ blocks, activeBlockId, enabled, onSelectBlock }: OverlayEditorProps) {
  if (!enabled) {
    return null;
  }

  return (
    <div className={styles.overlay}>
      {blocks.map((block) => (
        <button
          type="button"
          key={block.id}
          className={`${styles.blockHotspot} ${activeBlockId === block.id ? styles.blockHotspotActive : ""}`}
          style={{
            top: block.top,
            left: block.left,
            width: block.width,
            height: block.height
          }}
          onClick={() => onSelectBlock(block.id)}
          aria-label={`Edit ${block.type}`}
        />
      ))}
    </div>
  );
}
