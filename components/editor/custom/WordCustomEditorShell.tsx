"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { preserveEmbeddedImages, uploadAssetToUpyun } from "@/lib/assets/imagePipeline";
import { buildHtmlSnapshot } from "@/lib/render/htmlSnapshot";
import { createAuditMetrics, type AuditMetric, targetFromProfile } from "@/lib/word/audit";
import { buildCoverageReport } from "@/lib/word/coverage";
import { escapeTextToHtml, firstElementHtml } from "@/lib/word/editorHtml";
import { applyWordRenderModel } from "@/lib/word/renderApply";
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
<h1>离职信</h1>
<p>感谢留总提供这么好的平台，也感谢留总的耐心和宽容，同时也感谢留总的教导。</p>
<p>自己一直没能在工作中找到节奏感，<span style="color:#EE0000">也没能和公司处于相同步调里</span>，让自己一直处于疲劳的状态，这对公司也是不利的。所以考虑再三，决定提出离职。</p>
<p>请留总批准，也祝愿公司越来越好。</p>
<p style="text-align:right;margin-top:120px;">2026 年 2 月 5 日</p>
`);

export function WordCustomEditorShell() {
  const stageRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const editorCanvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const indexer = useMemo(() => new BlockIndexer(), []);

  const [htmlSnapshot, setHtmlSnapshot] = useState(templateHtml);
  const [blocks, setBlocks] = useState<IndexedBlock[]>([]);
  const [pasteHint, setPasteHint] = useState("在下方粘贴区按 Ctrl/Cmd+V，可直接导入 Word HTML 快照。");
  const [editMode, setEditMode] = useState(false);
  const [showDebugBounds, setShowDebugBounds] = useState(false);
  const [showFormattingMarks, setShowFormattingMarks] = useState(false);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [auditMetrics, setAuditMetrics] = useState<AuditMetric[]>([]);
  const [styleProfile, setStyleProfile] = useState<WordStyleProfile | null>(null);

  const activeBlock = blocks.find((block) => block.id === activeBlockId) ?? null;
  const auditPassed = auditMetrics.length > 0 && auditMetrics.every((m) => m.pass);
  const auditTarget = useMemo(() => targetFromProfile(styleProfile), [styleProfile]);
  const coverageReport = useMemo(() => buildCoverageReport(styleProfile), [styleProfile]);

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
  }, [auditTarget, indexer, showFormattingMarks, styleProfile]);

  useEffect(() => {
    refreshIndexAndAudit();
  }, [htmlSnapshot, refreshIndexAndAudit]);

  const applyPastedHtml = (rawHtml: string, plainText?: string) => {
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

    await preserveEmbeddedImages(doc, { uploadAsset: uploadAssetToUpyun }).catch(() => undefined);

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
                    for (const item of items) {
                      if (item.types.includes("text/html")) {
                        const htmlBlob = await item.getType("text/html");
                        applyPastedHtml(await htmlBlob.text());
                        return;
                      }
                      if (item.types.includes("text/plain")) {
                        const textBlob = await item.getType("text/plain");
                        applyPastedHtml("", await textBlob.text());
                        return;
                      }
                    }
                    setPasteHint("剪贴板没有 text/html 或 text/plain。");
                  } catch {
                    setPasteHint("读取系统剪贴板失败，请使用下方粘贴区 Ctrl/Cmd+V。");
                  }
                }}
              >
                从系统剪贴板读取
              </button>

              <button type="button" className={styles.toggleBtn} onClick={() => fileInputRef.current?.click()}>
                上传 DOCX 样式基线
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
                    const profile = await parseDocxStyleProfile(file);
                    setStyleProfile(profile);
                    setPasteHint(`已加载样式基线: ${profile.sourceFileName}`);
                  } catch {
                    setPasteHint("DOCX 样式基线解析失败，请确认文件格式。");
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

            <div
              className={styles.pasteArea}
              contentEditable
              suppressContentEditableWarning
              onPaste={(event) => {
                event.preventDefault();
                const html = event.clipboardData.getData("text/html");
                const text = event.clipboardData.getData("text/plain");
                applyPastedHtml(html, text);
              }}
            >
              在此处粘贴 Word / WPS / Google Docs 内容（Ctrl/Cmd+V）
            </div>
            <span className={styles.pasteHint}>{pasteHint}</span>
          </div>

          <WordRenderer
            htmlSnapshot={htmlSnapshot}
            onLoad={(frame) => {
              frameRef.current = frame;
              const doc = frame.contentDocument;
              if (!doc) return;

              void (async () => {
                await preserveEmbeddedImages(doc, { uploadAsset: uploadAssetToUpyun }).catch(() => undefined);

                const rebuilt = `<!DOCTYPE html>${doc.documentElement.outerHTML}`;
                if (rebuilt !== htmlSnapshot) {
                  setHtmlSnapshot(rebuilt);
                }
                refreshIndexAndAudit();
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
            {styleProfile ? (
              <>
                <div className={styles.profileTag}>基线文件: {styleProfile.sourceFileName}</div>
                <div className={styles.profileTag}>
                  字体基线: {styleProfile.discoveredFonts.length > 0 ? styleProfile.discoveredFonts.join(", ") : "未识别"}
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
