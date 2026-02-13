"use client";

import { useEffect, useMemo, useRef } from "react";
import styles from "./editor.module.css";
import { buildBlockIndex } from "@/lib/render/blockIndexer";
import { A4_PAGE_METRICS, paginateBlocks, type PaginationResult } from "@/lib/render/paginationEngine";
import type { BlockRecord } from "@/lib/types/editor";

interface WordRendererProps {
  htmlSnapshot: string;
  hostRect: DOMRect | null;
  indexSignal: number;
  onIndexed: (blocks: BlockRecord[], pagination: PaginationResult) => void;
  onFrameReady: (iframe: HTMLIFrameElement) => void;
}

export function WordRenderer({
  htmlSnapshot,
  hostRect,
  indexSignal,
  onIndexed,
  onFrameReady
}: WordRendererProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const srcDoc = useMemo(() => htmlSnapshot, [htmlSnapshot]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const indexNow = () => {
      const doc = iframe.contentDocument;
      if (!doc || !hostRect) return;

      const frameRect = iframe.getBoundingClientRect();
      const indexed = buildBlockIndex(doc, frameRect).map((block) => ({
        ...block,
        top: block.top - hostRect.top,
        left: block.left - hostRect.left
      }));

      const pagination = paginateBlocks(indexed, A4_PAGE_METRICS);
      const withPages = indexed.map((block) => ({
        ...block,
        pageIndex: pagination.blockToPage.get(block.id) ?? 0
      }));

      iframe.style.height = `${Math.max(900, pagination.totalHeight)}px`;
      onIndexed(withPages, pagination);
    };

    const onLoad = () => {
      onFrameReady(iframe);
      indexNow();
    };

    iframe.addEventListener("load", onLoad);
    const resizeObserver = new ResizeObserver(indexNow);
    resizeObserver.observe(iframe);
    window.addEventListener("scroll", indexNow, { passive: true });
    window.addEventListener("resize", indexNow);

    return () => {
      iframe.removeEventListener("load", onLoad);
      resizeObserver.disconnect();
      window.removeEventListener("scroll", indexNow);
      window.removeEventListener("resize", indexNow);
    };
  }, [hostRect, onIndexed, onFrameReady]);

  useEffect(() => {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    if (!iframe || !doc || !hostRect) return;
    const frameRect = iframe.getBoundingClientRect();

    const indexed = buildBlockIndex(doc, frameRect).map((block) => ({
      ...block,
      top: block.top - hostRect.top,
      left: block.left - hostRect.left
    }));
    const pagination = paginateBlocks(indexed, A4_PAGE_METRICS);
    const withPages = indexed.map((block) => ({
      ...block,
      pageIndex: pagination.blockToPage.get(block.id) ?? 0
    }));
    onIndexed(withPages, pagination);
  }, [indexSignal, hostRect, onIndexed]);

  return (
    <iframe
      ref={iframeRef}
      title="Fidelity document renderer"
      className={styles.frame}
      srcDoc={srcDoc}
      sandbox="allow-same-origin allow-scripts"
    />
  );
}
