"use client";

import type { IndexedBlock } from "./BlockIndexer";
import styles from "./custom.module.css";

interface OverlayEditorProps {
  blocks: IndexedBlock[];
  enabled: boolean;
  showDebugBounds: boolean;
  activeBlockId: string | null;
  onSelectBlock: (blockId: string) => void;
}

export function OverlayEditor({ blocks, enabled, showDebugBounds, activeBlockId, onSelectBlock }: OverlayEditorProps) {
  if (!enabled && !showDebugBounds) {
    return null;
  }

  return (
    <div className={styles.overlayLayer} aria-label="Overlay Editing Layer">
      {blocks.map((block) => {
        const isActive = activeBlockId === block.id;
        return (
          <button
            type="button"
            key={block.id}
            className={`${styles.overlayBlock} ${showDebugBounds ? styles.overlayDebug : ""} ${isActive ? styles.overlayActive : ""}`}
            style={{ top: block.top, left: block.left, width: block.width, height: block.height }}
            onClick={() => enabled && onSelectBlock(block.id)}
            title={`${block.type}: ${block.path}`}
          />
        );
      })}
    </div>
  );
}
