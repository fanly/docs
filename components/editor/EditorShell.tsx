"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BlockEditor } from "@/components/editor/BlockEditor";
import { OverlayEditor } from "@/components/editor/OverlayEditor";
import { WordRenderer } from "@/components/editor/WordRenderer";
import { preserveEmbeddedImages, uploadAssetToUpyun } from "@/lib/assets/imagePipeline";
import { YjsOperationChannel } from "@/lib/collab/yjsProvider";
import { ensureFontsAvailable } from "@/lib/fonts/fontLoader";
import { OperationTimeline } from "@/lib/history/timeline";
import { resolveBlockNode } from "@/lib/render/blockIndexer";
import { buildHtmlSnapshot, readClipboardHtml } from "@/lib/render/htmlSnapshot";
import type { PaginationResult } from "@/lib/render/paginationEngine";
import type { BlockRecord, EditorMode, EditorOperation } from "@/lib/types/editor";
import styles from "./editor.module.css";

const defaultSeedHtml = `
<style>
  @page { size: A4; margin: 1in; }
  body { margin: 0; padding: 1in; background: #fff; color: #111; font-family: Cambria, "Times New Roman", serif; }
  h1 { margin: 0 0 12pt; font-size: 24pt; font-family: "Calibri", sans-serif; }
  p { margin: 0 0 10pt; font-size: 12pt; line-height: 1.5; }
  table { border-collapse: collapse; width: 100%; margin: 12pt 0; }
  td, th { border: 1px solid #333; padding: 6pt; }
  .accent { color: #2b579a; font-weight: 700; }
</style>
<h1>Word Fidelity Render-First Editor</h1>
<p>Paste from Microsoft Word, WPS, or Google Docs. The iframe layer preserves original DOM/styles without sanitize or semantic rebuild.</p>
<p class="accent">Editing uses overlay incremental replacement: scan, freeze block, sandbox edit, replace block only.</p>
<table>
  <tr><th>Capability</th><th>Status</th></tr>
  <tr><td>Dual-Layer Rendering</td><td>Enabled</td></tr>
  <tr><td>Virtual Pagination</td><td>Enabled</td></tr>
  <tr><td>Asset Preservation</td><td>Enabled</td></tr>
</table>
`;

const fontRegistry = {
  Calibri: "https://fonts.gstatic.com/s/carlito/v3/-n4k3gQ2h7nGbP6oM4NQ.ttf",
  Cambria: "https://fonts.gstatic.com/s/notoserif/v25/ga6Iaw1J5X9T9RW6j9bNfFIMZfA.ttf"
};

function classifyOperation(blockId: string, beforeHtml: string, afterHtml: string): EditorOperation {
  const timestamp = Date.now();
  const beforeText = beforeHtml.replace(/<[^>]*>/g, "").trim();
  const afterText = afterHtml.replace(/<[^>]*>/g, "").trim();

  if (!afterText && beforeText) {
    return {
      type: "delete_block",
      blockId,
      removedHtml: beforeHtml,
      timestamp
    };
  }

  if (afterText.length > beforeText.length && afterHtml.startsWith(beforeHtml.slice(0, Math.min(16, beforeHtml.length)))) {
    return {
      type: "insert_text",
      blockId,
      text: afterText,
      offset: Math.max(beforeText.length, 0),
      timestamp
    };
  }

  return {
    type: "replace_block",
    blockId,
    beforeHtml,
    afterHtml,
    timestamp
  };
}

export function EditorShell() {
  const stageRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const timelineRef = useRef(new OperationTimeline());
  const collabRef = useRef<YjsOperationChannel | null>(null);
  const isApplyingRemoteRef = useRef(false);

  const [hostRect, setHostRect] = useState<DOMRect | null>(null);
  const [mode, setMode] = useState<EditorMode>("fidelity");
  const [indexSignal, setIndexSignal] = useState(0);
  const [snapshotHtml, setSnapshotHtml] = useState(buildHtmlSnapshot(defaultSeedHtml));
  const [blocks, setBlocks] = useState<BlockRecord[]>([]);
  const [pagination, setPagination] = useState<PaginationResult | null>(null);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [missingFonts, setMissingFonts] = useState<string[]>([]);

  const activeBlock = useMemo(
    () => blocks.find((block) => block.id === activeBlockId) ?? null,
    [activeBlockId, blocks]
  );

  const syncHostRect = useCallback(() => {
    if (stageRef.current) {
      setHostRect(stageRef.current.getBoundingClientRect());
    }
  }, []);

  useEffect(() => {
    syncHostRect();
    window.addEventListener("resize", syncHostRect);
    window.addEventListener("scroll", syncHostRect, { passive: true });
    return () => {
      window.removeEventListener("resize", syncHostRect);
      window.removeEventListener("scroll", syncHostRect);
    };
  }, [syncHostRect]);

  const rebuildSnapshotFromFrame = useCallback(() => {
    const doc = frameRef.current?.contentDocument;
    if (!doc) return null;
    return `<!DOCTYPE html>${doc.documentElement.outerHTML}`;
  }, []);

  const applyBlockMutation = useCallback(
    (blockId: string, editedInnerHtml: string, publish = true) => {
      const doc = frameRef.current?.contentDocument;
      if (!doc) return;

      const node = resolveBlockNode(doc, blockId);
      if (!node) return;

      const beforeHtml = node.outerHTML;
      const trimmed = editedInnerHtml.trim();

      if (!trimmed) {
        node.remove();
      } else {
        const wrapper = doc.createElement("div");
        wrapper.innerHTML = trimmed;
        const replacement = wrapper.firstElementChild;
        if (!replacement) return;
        replacement.setAttribute("data-overlay-block-id", blockId);
        node.replaceWith(replacement);
      }

      const afterNode = resolveBlockNode(doc, blockId);
      const afterHtml = afterNode?.outerHTML ?? "";
      const operation = classifyOperation(blockId, beforeHtml, afterHtml);

      const rebuilt = rebuildSnapshotFromFrame();
      if (rebuilt) {
        setSnapshotHtml(rebuilt);
        timelineRef.current.push(operation, rebuilt);
      }

      if (publish) {
        collabRef.current?.publishOperation(operation);
      }

      setActiveBlockId(null);
      setIndexSignal((n) => n + 1);
    },
    [rebuildSnapshotFromFrame]
  );

  useEffect(() => {
    const channel = new YjsOperationChannel({
      endpoint: "ws://localhost:1234",
      room: "word-fidelity-room"
    });
    collabRef.current = channel;

    const off = channel.onOperation((op) => {
      if (isApplyingRemoteRef.current) return;
      isApplyingRemoteRef.current = true;
      try {
        if (op.type === "replace_block") {
          applyBlockMutation(op.blockId, op.afterHtml, false);
        }
        if (op.type === "delete_block") {
          applyBlockMutation(op.blockId, "", false);
        }
      } finally {
        isApplyingRemoteRef.current = false;
      }
    });

    return () => {
      off();
      channel.destroy();
    };
  }, [applyBlockMutation]);

  const handleFrameReady = useCallback(async (iframe: HTMLIFrameElement) => {
    frameRef.current = iframe;
    const doc = iframe.contentDocument;
    if (!doc) return;

    const missing = await ensureFontsAvailable(doc, fontRegistry).catch(() => []);
    setMissingFonts(missing);

    await preserveEmbeddedImages(doc, {
      uploadAsset: uploadAssetToUpyun
    }).catch(() => undefined);

    const rebuilt = rebuildSnapshotFromFrame();
    if (rebuilt) {
      setSnapshotHtml(rebuilt);
    }

    setIndexSignal((n) => n + 1);
  }, [rebuildSnapshotFromFrame]);

  const semanticView = useMemo(() => {
    const schema = {
      mode,
      blocks: blocks.map((block) => ({
        id: block.id,
        type: block.type,
        tagName: block.tagName,
        page: block.pageIndex,
        textPreview: block.html.replace(/<[^>]*>/g, "").slice(0, 120)
      }))
    };
    return JSON.stringify(schema, null, 2);
  }, [blocks, mode]);

  return (
    <div className={styles.shell}>
      <div className={styles.toolbar}>
        <label>
          Mode:{" "}
          <select value={mode} onChange={(e) => setMode(e.target.value as EditorMode)}>
            <option value="fidelity">Fidelity Mode</option>
            <option value="editing">Editing Mode</option>
            <option value="semantic">Semantic Mode</option>
          </select>
        </label>
        <button
          type="button"
          onClick={async () => {
            const html = await readClipboardHtml();
            if (!html) return;
            setSnapshotHtml(buildHtmlSnapshot(html));
            setActiveBlockId(null);
            setIndexSignal((n) => n + 1);
          }}
        >
          Paste HTML Snapshot
        </button>
        <button
          type="button"
          onClick={() => {
            const items = timelineRef.current.list();
            const latest = items[items.length - 1];
            if (!latest) return;
            const restored = timelineRef.current.restoreAt(latest.id);
            if (!restored) return;
            setSnapshotHtml(restored);
            setIndexSignal((n) => n + 1);
          }}
        >
          Restore Timeline Point
        </button>
        <span className={styles.meta}>
          blocks={blocks.length} pages={pagination?.pages.length ?? 0}
          {missingFonts.length > 0 ? ` missingFonts=${missingFonts.join(",")}` : ""}
        </span>
      </div>

      <div ref={stageRef} className={styles.stage}>
        <WordRenderer
          htmlSnapshot={snapshotHtml}
          hostRect={hostRect}
          indexSignal={indexSignal}
          onIndexed={(indexedBlocks, nextPagination) => {
            setBlocks(indexedBlocks);
            setPagination(nextPagination);
          }}
          onFrameReady={handleFrameReady}
        />

        {pagination?.pages.map((page) => (
          <div key={page.index} className={styles.pageGuide} style={{ top: page.endY }} />
        ))}

        <OverlayEditor
          blocks={blocks}
          activeBlockId={activeBlockId}
          enabled={mode === "editing"}
          onSelectBlock={setActiveBlockId}
        />

        {mode === "editing" && activeBlock ? (
          <BlockEditor
            block={activeBlock}
            onCancel={() => setActiveBlockId(null)}
            onCommit={(html) => applyBlockMutation(activeBlock.id, html, true)}
          />
        ) : null}
      </div>

      {mode === "semantic" ? (
        <div className={styles.panel}>
          <div className={styles.semanticOutput}>{semanticView}</div>
        </div>
      ) : null}
    </div>
  );
}
