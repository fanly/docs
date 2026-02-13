"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { preserveEmbeddedImages, uploadAssetToUpyun } from "@/lib/assets/imagePipeline";
import { buildHtmlSnapshot } from "@/lib/render/htmlSnapshot";
import { createAuditMetrics, type AuditMetric, targetFromProfile } from "@/lib/word/audit";
import { buildCoverageReport } from "@/lib/word/coverage";
import { parseDocxToHtmlSnapshot } from "@/lib/word/docxHtml";
import { escapeTextToHtml, firstElementHtml } from "@/lib/word/editorHtml";
import { extractFromClipboardDataTransfer, extractFromClipboardItems } from "@/lib/word/pastePipeline";
import { applyWordRenderModel } from "@/lib/word/renderApply";
import { buildStructureReport, type StructureReport } from "@/lib/word/structureCompare";
import { parseDocxStyleProfile, type WordStyleProfile } from "@/lib/word/styleProfile";
import { BlockIndexer, type IndexedBlock } from "./BlockIndexer";
import { OverlayEditor } from "./OverlayEditor";
import { WordRenderer } from "./WordRenderer";
import styles from "./custom.module.css";

const templateHtml = buildHtmlSnapshot(`
<style>
  body { font-family: Cambria, "Times New Roman", serif; margin: 0; padding: 1in 1.25in; color: #111; }
  h1 { font-family: Calibri, sans-serif; margin: 0 0 10.67px; color: #0F4761; text-align: center; font-size: 32px; }
  p { margin: 0 0 10.67px; line-height: 1.158333; font-size: 14.6667px; }
</style>
<p><br/></p>
`);

export function WordCustomEditorShell() {
  const stageRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const editorCanvasRef = useRef<HTMLDivElement>(null);
  const pasteAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const detachFrameListenersRef = useRef<(() => void) | null>(null);
  const frameHeightRef = useRef<number>(0);
  const refreshTimerRef = useRef<number[]>([]);
  const indexer = useMemo(() => new BlockIndexer(), []);

  const [htmlSnapshot, setHtmlSnapshot] = useState(templateHtml);
  const [blocks, setBlocks] = useState<IndexedBlock[]>([]);
  const [pasteHint, setPasteHint] = useState("在下方粘贴区按 Ctrl/Cmd+V，可直接导入 Word HTML 快照。上传 Word 文件效果更佳。");
  const [editMode, setEditMode] = useState(false);
  const [showDebugBounds, setShowDebugBounds] = useState(false);
  const [showFormattingMarks, setShowFormattingMarks] = useState(false);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [auditMetrics, setAuditMetrics] = useState<AuditMetric[]>([]);
  const [styleProfile, setStyleProfile] = useState<WordStyleProfile | null>(null);
  const [structureReport, setStructureReport] = useState<StructureReport>({ rows: [], pass: true });

  const activeBlock = blocks.find((block) => block.id === activeBlockId) ?? null;
  const auditPassed = auditMetrics.length > 0 && auditMetrics.every((m) => m.pass);
  const auditTarget = useMemo(() => targetFromProfile(styleProfile), [styleProfile]);
  const coverageReport = useMemo(() => buildCoverageReport(styleProfile), [styleProfile]);

  const syncFrameHeight = useCallback((frame: HTMLIFrameElement, doc: Document) => {
    const body = doc.body;
    const root = doc.documentElement;
    const measured = Math.max(
      760,
      body.scrollHeight,
      body.offsetHeight,
      root.scrollHeight,
      root.offsetHeight
    );
    const nextHeight = measured + 24;
    if (Math.abs(nextHeight - frameHeightRef.current) < 2) {
      return;
    }
    frameHeightRef.current = nextHeight;
    frame.style.height = `${nextHeight}px`;
  }, []);

  const refreshIndexAndAudit = useCallback(() => {
    const frame = frameRef.current;
    const stage = stageRef.current;
    const doc = frame?.contentDocument;
    if (!frame || !stage || !doc) return;

    applyWordRenderModel({
      doc,
      styleProfile,
      showFormattingMarks
    });
    syncFrameHeight(frame, doc);

    const stageRect = stage.getBoundingClientRect();
    const frameRect = frame.getBoundingClientRect();
    const rawBlocks = indexer.index(doc);

    setBlocks(
      rawBlocks.map((block) => ({
        ...block,
        top: block.top + (frameRect.top - stageRect.top),
        left: block.left + (frameRect.left - stageRect.left)
      }))
    );

    setAuditMetrics(createAuditMetrics(doc, auditTarget));
    setStructureReport(buildStructureReport(doc, styleProfile));
  }, [auditTarget, indexer, showFormattingMarks, styleProfile, syncFrameHeight]);

  const schedulePostLoadRefresh = useCallback(() => {
    for (const timer of refreshTimerRef.current) {
      window.clearTimeout(timer);
    }
    refreshTimerRef.current = [0, 240].map((delay) =>
      window.setTimeout(() => {
        refreshIndexAndAudit();
      }, delay)
    );
  }, [refreshIndexAndAudit]);

  useEffect(() => {
    refreshIndexAndAudit();
  }, [htmlSnapshot, refreshIndexAndAudit]);

  const applyPastedHtml = (rawHtml: string, plainText?: string) => {
    setStyleProfile(null);
    if (rawHtml.trim()) {
      setHtmlSnapshot(buildHtmlSnapshot(rawHtml));
      setPasteHint("已加载 HTML 快照（保真渲染）。");
      return;
    }

    if (plainText && plainText.trim()) {
      setHtmlSnapshot(buildHtmlSnapshot(`<p>${escapeTextToHtml(plainText)}</p>`));
      setPasteHint("剪贴板无 HTML，已按纯文本导入。");
      return;
    }

    setPasteHint("未检测到可导入内容，请在 Word/Docs 中重新复制后再试。");
  };

  const handlePasteDataTransfer = useCallback(async (dataTransfer: DataTransfer) => {
    const payload = await extractFromClipboardDataTransfer(dataTransfer);
    applyPastedHtml(payload.html, payload.text);
  }, []);

  const attachFrameClipboardBridge = useCallback((frame: HTMLIFrameElement) => {
    detachFrameListenersRef.current?.();
    const frameDoc = frame.contentDocument;
    if (!frameDoc) return;

    const onFramePaste = (event: ClipboardEvent) => {
      if (!event.clipboardData) return;
      event.preventDefault();
      void handlePasteDataTransfer(event.clipboardData);
    };

    frameDoc.addEventListener("paste", onFramePaste);
    detachFrameListenersRef.current = () => {
      frameDoc.removeEventListener("paste", onFramePaste);
    };
  }, [handlePasteDataTransfer]);

  const commitActiveBlock = async () => {
    const blockId = activeBlockId;
    const frame = frameRef.current;
    const doc = frame?.contentDocument;
    const canvas = editorCanvasRef.current;
    if (!blockId || !doc || !canvas) return;

    const node = doc.querySelector(`[data-custom-block-id=\"${blockId}\"]`) as HTMLElement | null;
    if (!node) return;

    const candidateHtml = firstElementHtml(canvas.innerHTML);
    if (!candidateHtml) return;

    const wrapper = doc.createElement("div");
    wrapper.innerHTML = candidateHtml;
    const replacement = wrapper.firstElementChild;
    if (!replacement) return;

    replacement.setAttribute("data-custom-block-id", blockId);
    node.replaceWith(replacement);

    await preserveEmbeddedImages(doc, { uploadAsset: uploadAssetToUpyun }).catch((error) => {
      const message = error instanceof Error ? error.message : "未知错误";
      setPasteHint(`图片上传失败: ${message}`);
      return undefined;
    });

    const rebuilt = `<!DOCTYPE html>${doc.documentElement.outerHTML}`;
    setHtmlSnapshot(rebuilt);
    setActiveBlockId(null);
    refreshIndexAndAudit();
  };

  const runRichCommand = (command: "bold" | "italic" | "underline") => {
    editorCanvasRef.current?.focus();
    document.execCommand(command, false);
  };

  const applyTextColor = (color: string) => {
    editorCanvasRef.current?.focus();
    document.execCommand("foreColor", false, color);
  };

  useEffect(() => {
    const onWindowPaste = (event: ClipboardEvent) => {
      if (event.defaultPrevented) return;
      if (editMode && activeBlockId) return;
      const stage = stageRef.current;
      if (!stage) return;
      const target = event.target as Node | null;
      if (target && !stage.contains(target)) return;
      if (!event.clipboardData) return;

      event.preventDefault();
      void handlePasteDataTransfer(event.clipboardData);
    };

    window.addEventListener("paste", onWindowPaste);
    return () => window.removeEventListener("paste", onWindowPaste);
  }, [activeBlockId, editMode, handlePasteDataTransfer]);

  useEffect(() => {
    const onWindowKeyDown = (event: KeyboardEvent) => {
      const isPasteCombo = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "v";
      if (!isPasteCombo) return;
      if (editMode && activeBlockId) return;
      const stage = stageRef.current;
      if (!stage) return;

      const target = event.target as Node | null;
      if (target && !stage.contains(target)) return;

      // Move focus to the paste area so browser paste events land on our controlled surface.
      pasteAreaRef.current?.focus();
      setPasteHint("检测到 Ctrl/Cmd+V，正在读取粘贴内容...");
    };

    window.addEventListener("keydown", onWindowKeyDown, true);
    return () => window.removeEventListener("keydown", onWindowKeyDown, true);
  }, [activeBlockId, editMode]);

  useEffect(() => {
    return () => {
      for (const timer of refreshTimerRef.current) {
        window.clearTimeout(timer);
      }
      refreshTimerRef.current = [];
      detachFrameListenersRef.current?.();
      detachFrameListenersRef.current = null;
    };
  }, []);

  return (
    <div className="page-card">
      <div className={styles.header}>
        <div>
          <h1 className="page-title">自研高保真编辑器容器</h1>
          <p className="page-subtitle">Render-first 架构，面向企业级文档引擎可扩展能力。</p>
        </div>
        <div className={styles.engineBadge}>Engine: Render-first</div>
      </div>

      <section className={styles.layout}>
        <div ref={stageRef} className={styles.stage}>
          <div className={styles.pasteToolbar}>
            <div className={styles.toolbarRow}>
              <button
                type="button"
                className={styles.pasteBtn}
                onClick={async () => {
                  if (!navigator.clipboard?.read) {
                    setPasteHint("当前浏览器不支持 navigator.clipboard.read，请使用下方粘贴区 Ctrl/Cmd+V。");
                    return;
                  }
                  try {
                    const items = await navigator.clipboard.read();
                    const payload = await extractFromClipboardItems(items);
                    applyPastedHtml(payload.html, payload.text);
                  } catch {
                    setPasteHint("读取系统剪贴板失败，请使用下方粘贴区 Ctrl/Cmd+V。");
                  }
                }}
              >
                从系统剪贴板读取
              </button>

              <button type="button" className={styles.toggleBtn} onClick={() => fileInputRef.current?.click()}>
                上传 Word 文件效果更佳
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".docx"
                className={styles.hiddenInput}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    const snapshot = await parseDocxToHtmlSnapshot(file);
                    const profile = await parseDocxStyleProfile(file);
                    setHtmlSnapshot(snapshot);
                    setStyleProfile(profile);
                    setPasteHint(`已加载 Word 文件并覆盖当前内容: ${profile.sourceFileName}。`);
                  } catch {
                    setPasteHint("Word 文件解析失败，请确认文件格式。");
                  }
                  e.target.value = "";
                }}
              />

              <button type="button" className={styles.toggleBtn} onClick={() => setEditMode((v) => !v)}>
                {editMode ? "退出编辑模式" : "进入编辑模式"}
              </button>

              <label className={styles.debugSwitch}>
                <input type="checkbox" checked={showDebugBounds} onChange={(e) => setShowDebugBounds(e.target.checked)} />
                显示块边界
              </label>

              <label className={styles.debugSwitch}>
                <input
                  type="checkbox"
                  checked={showFormattingMarks}
                  onChange={(e) => setShowFormattingMarks(e.target.checked)}
                />
                显示格式标记
              </label>
            </div>

            <textarea
              ref={pasteAreaRef}
              className={styles.pasteTextarea}
              placeholder="在此处粘贴 Word / WPS / Google Docs 内容（Ctrl/Cmd+V）"
              onPaste={(event) => {
                event.preventDefault();
                void handlePasteDataTransfer(event.clipboardData);
              }}
              onFocus={() => {
                setPasteHint("已聚焦粘贴框，按 Ctrl/Cmd+V 进行导入。");
              }}
            />
            <span className={styles.pasteHint}>{pasteHint}</span>
          </div>

          <WordRenderer
            htmlSnapshot={htmlSnapshot}
            onLoad={(frame) => {
              frameRef.current = frame;
              attachFrameClipboardBridge(frame);
              const doc = frame.contentDocument;
              if (!doc) return;

              void (async () => {
                await preserveEmbeddedImages(doc, { uploadAsset: uploadAssetToUpyun }).catch((error) => {
                  const message = error instanceof Error ? error.message : "未知错误";
                  setPasteHint(`图片上传失败: ${message}`);
                  return undefined;
                });

                refreshIndexAndAudit();
                schedulePostLoadRefresh();
              })();
            }}
          />

          <OverlayEditor
            blocks={blocks}
            enabled={editMode}
            showDebugBounds={showDebugBounds}
            activeBlockId={activeBlockId}
            onSelectBlock={setActiveBlockId}
          />

          {editMode && activeBlock ? (
            <div
              className={styles.richEditor}
              style={{
                top: Math.max(8, activeBlock.top - 6),
                left: Math.max(8, activeBlock.left - 6),
                width: Math.max(320, activeBlock.width + 12)
              }}
            >
              <div className={styles.richToolbar}>
                <button type="button" onClick={() => runRichCommand("bold")}>B</button>
                <button type="button" onClick={() => runRichCommand("italic")}>I</button>
                <button type="button" onClick={() => runRichCommand("underline")}>U</button>
                <input type="color" defaultValue="#111111" onChange={(e) => applyTextColor(e.target.value)} />
              </div>
              <div
                ref={editorCanvasRef}
                className={styles.richCanvas}
                contentEditable
                suppressContentEditableWarning
                dangerouslySetInnerHTML={{ __html: activeBlock.html }}
              />
              <div className={styles.richActions}>
                <button type="button" onClick={() => setActiveBlockId(null)}>取消</button>
                <button type="button" onClick={() => void commitActiveBlock()}>应用修改</button>
              </div>
            </div>
          ) : null}
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          <article className={styles.panel}>
            <h3>样式一致性诊断</h3>
            <div className={styles.auditStatus} data-pass={auditPassed}>
              {auditMetrics.length === 0 ? "等待文档加载" : auditPassed ? "通过" : "未通过"}
            </div>
            {!styleProfile ? <div className={styles.profileTag}>当前模式: 快照渲染（上传 Word 文件效果更佳）</div> : null}
            {styleProfile ? (
              <>
                <div className={styles.profileTag}>Word 文件: {styleProfile.sourceFileName}</div>
                <div className={styles.profileTag}>
                  字体映射: {styleProfile.discoveredFonts.length > 0 ? styleProfile.discoveredFonts.join(", ") : "未识别"}
                </div>
              </>
            ) : null}
            <table className={styles.auditTable}>
              <thead>
                <tr><th>指标</th><th>实际</th><th>目标</th><th>偏差</th><th>判定</th></tr>
              </thead>
              <tbody>
                {auditMetrics.map((metric) => (
                  <tr key={metric.label}>
                    <td>{metric.label}</td>
                    <td>{metric.actual.toFixed(2)} {metric.unit}</td>
                    <td>{metric.expected.toFixed(2)} {metric.unit}</td>
                    <td>{metric.delta >= 0 ? "+" : ""}{metric.delta.toFixed(2)} {metric.unit}</td>
                    <td>{metric.pass ? "OK" : "偏差"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>

          <article className={styles.panel}>
            <h3>架构说明</h3>
            <ul>
              <li>Render-first: 原始 HTML Snapshot 直接渲染，最大化 Word 外观保真。</li>
              <li>Incremental Editing: 只替换目标 Block，避免整文档重渲染。</li>
              <li>可扩展：分页、协同、字体和图片管线可独立演进。</li>
            </ul>
          </article>

          <article className={styles.panel}>
            <h3>兼容覆盖率</h3>
            <div className={styles.profileTag}>
              覆盖率 {coverageReport.score}% ({coverageReport.supportedCount}/{coverageReport.total})
            </div>
            <table className={styles.auditTable}>
              <thead>
                <tr><th>能力</th><th>状态</th><th>说明</th></tr>
              </thead>
              <tbody>
                {coverageReport.items.map((item) => (
                  <tr key={item.name}>
                    <td>{item.name}</td>
                    <td>{item.supported ? "支持" : "待完善"}</td>
                    <td>{item.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>

          <article className={styles.panel}>
            <h3>结构对比</h3>
            <div className={styles.profileTag}>{structureReport.pass ? "结构稳定" : "结构存在偏差"}</div>
            <table className={styles.auditTable}>
              <thead>
                <tr><th>项</th><th>实际</th><th>Word文件参考</th><th>差值</th><th>判定</th></tr>
              </thead>
              <tbody>
                {structureReport.rows.map((row) => (
                  <tr key={row.name}>
                    <td>{row.name}</td>
                    <td>{row.actual}</td>
                    <td>{row.expected === null ? "-" : row.expected}</td>
                    <td>{row.delta === null ? "-" : row.delta >= 0 ? `+${row.delta}` : row.delta}</td>
                    <td>{row.pass ? "OK" : "偏差"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>

          <article className={styles.panel}>
            <h3>技术优势</h3>
            <ul>
              <li>数据主权高：DOM、操作流、语义层均可控。</li>
              <li>AI 友好：便于集成结构化提取、审校、改写链路。</li>
              <li>长期成本可控：减少核心文档能力对外部 SDK 的绑定。</li>
            </ul>
          </article>
        </div>
      </section>
    </div>
  );
}
