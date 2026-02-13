"use client";

import { useMemo } from "react";
import styles from "./custom.module.css";

interface WordRendererProps {
  htmlSnapshot: string;
  onLoad: (iframe: HTMLIFrameElement) => void;
}

export function WordRenderer({ htmlSnapshot, onLoad }: WordRendererProps) {
  const srcDoc = useMemo(() => htmlSnapshot, [htmlSnapshot]);

  return (
    <iframe
      title="Custom Render-first Fidelity Layer"
      className={styles.renderFrame}
      srcDoc={srcDoc}
      sandbox="allow-same-origin allow-scripts"
      onLoad={(e) => onLoad(e.currentTarget)}
    />
  );
}
