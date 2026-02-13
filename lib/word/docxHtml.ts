import JSZip from "jszip";
import { buildHtmlSnapshot } from "@/lib/render/htmlSnapshot";

interface RelMap {
  [rid: string]: string;
}

interface DrawingSizePx {
  widthPx: number | null;
  heightPx: number | null;
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function parseXml(xmlText: string): Document {
  const parser = new DOMParser();
  return parser.parseFromString(xmlText, "application/xml");
}

function queryAllByLocalName(root: ParentNode, localName: string): Element[] {
  return Array.from(root.querySelectorAll("*")).filter((el) => el.localName === localName);
}

function queryByLocalName(root: ParentNode, localName: string): Element | null {
  return queryAllByLocalName(root, localName)[0] ?? null;
}

function getAttr(node: Element | null, name: string): string | null {
  if (!node) return null;
  return node.getAttribute(name);
}

function emuToPx(emu: number): number {
  return (emu * 96) / 914400;
}

function parseDrawingSizePx(drawing: Element): DrawingSizePx {
  const extentNode =
    queryAllByLocalName(drawing, "extent").find((node) => {
      const parent = node.parentElement;
      return parent?.localName === "inline" || parent?.localName === "anchor";
    }) ?? null;
  if (!extentNode) {
    return { widthPx: null, heightPx: null };
  }

  const rawCx = getAttr(extentNode, "cx");
  const rawCy = getAttr(extentNode, "cy");
  const cx = rawCx ? Number.parseInt(rawCx, 10) : Number.NaN;
  const cy = rawCy ? Number.parseInt(rawCy, 10) : Number.NaN;

  const widthPx = Number.isFinite(cx) && cx > 0 ? emuToPx(cx) : null;
  const heightPx = Number.isFinite(cy) && cy > 0 ? emuToPx(cy) : null;
  return { widthPx, heightPx };
}

function imageDimensionAttributes(sizePx: DrawingSizePx): string {
  const attrs: string[] = [];
  if (sizePx.widthPx !== null) attrs.push(`width=\"${Math.round(sizePx.widthPx)}\"`);
  if (sizePx.heightPx !== null) attrs.push(`height=\"${Math.round(sizePx.heightPx)}\"`);
  if (sizePx.widthPx !== null || sizePx.heightPx !== null) {
    const style: string[] = ["max-width:100%"];
    if (sizePx.widthPx !== null) style.push(`width:${sizePx.widthPx.toFixed(2)}px`);
    if (sizePx.heightPx !== null) style.push(`height:${sizePx.heightPx.toFixed(2)}px`);
    attrs.push(`style=\"${style.join(";")}\"`);
  }
  return attrs.length > 0 ? ` ${attrs.join(" ")}` : "";
}

function parseDocRelsMap(relsXmlText: string | null): RelMap {
  if (!relsXmlText) return {};
  const rels = parseXml(relsXmlText);
  const relationNodes = queryAllByLocalName(rels, "Relationship");
  const map: RelMap = {};
  for (const rel of relationNodes) {
    const id = getAttr(rel, "Id");
    const target = getAttr(rel, "Target");
    if (!id || !target) continue;
    map[id] = target;
  }
  return map;
}

function extToMime(ext: string): string {
  const lower = ext.toLowerCase();
  if (lower === "png") return "image/png";
  if (lower === "jpg" || lower === "jpeg") return "image/jpeg";
  if (lower === "gif") return "image/gif";
  if (lower === "webp") return "image/webp";
  if (lower === "bmp") return "image/bmp";
  if (lower === "svg") return "image/svg+xml";
  return "application/octet-stream";
}

async function imageRidToDataUrl(zip: JSZip, relMap: RelMap, rid: string): Promise<string | null> {
  const relTarget = relMap[rid];
  if (!relTarget) return null;
  const normalized = relTarget.replace(/^\/+/, "");
  const path = normalized.startsWith("word/") ? normalized : `word/${normalized}`;
  const file = zip.file(path);
  if (!file) return null;
  const base64 = await file.async("base64");
  const ext = path.split(".").pop() ?? "bin";
  const mime = extToMime(ext);
  return `data:${mime};base64,${base64}`;
}

function runStyleToCss(rPr: Element | null): string {
  if (!rPr) return "";
  const declarations: string[] = [];

  if (queryByLocalName(rPr, "b")) declarations.push("font-weight:700");
  if (queryByLocalName(rPr, "i")) declarations.push("font-style:italic");
  if (queryByLocalName(rPr, "u")) declarations.push("text-decoration:underline");
  if (queryByLocalName(rPr, "strike")) declarations.push("text-decoration:line-through");

  const color = queryByLocalName(rPr, "color");
  const colorVal = getAttr(color, "w:val") ?? getAttr(color, "val");
  if (colorVal && colorVal.toLowerCase() !== "auto") declarations.push(`color:#${colorVal}`);

  const highlight = queryByLocalName(rPr, "highlight");
  const highlightVal = (getAttr(highlight, "w:val") ?? getAttr(highlight, "val") ?? "").toLowerCase();
  if (highlightVal === "yellow") declarations.push("background-color:#fff200");

  const vertAlign = queryByLocalName(rPr, "vertAlign");
  const vertVal = (getAttr(vertAlign, "w:val") ?? getAttr(vertAlign, "val") ?? "").toLowerCase();
  if (vertVal === "superscript") declarations.push("vertical-align:super;font-size:0.83em");
  if (vertVal === "subscript") declarations.push("vertical-align:sub;font-size:0.83em");

  return declarations.join(";");
}

function paragraphTag(paragraph: Element): "p" | "h1" | "h2" | "h3" {
  const pPr = queryByLocalName(paragraph, "pPr");
  const pStyle = pPr ? queryByLocalName(pPr, "pStyle") : null;
  const val = (getAttr(pStyle, "w:val") ?? getAttr(pStyle, "val") ?? "").toLowerCase();
  if (val.includes("heading1") || val === "1" || val === "heading 1") return "h1";
  if (val.includes("heading2") || val === "2" || val === "heading 2") return "h2";
  if (val.includes("heading3") || val === "3" || val === "heading 3") return "h3";
  return "p";
}

function paragraphAlignStyle(paragraph: Element): string {
  const pPr = queryByLocalName(paragraph, "pPr");
  const jc = pPr ? queryByLocalName(pPr, "jc") : null;
  const align = (getAttr(jc, "w:val") ?? getAttr(jc, "val") ?? "").toLowerCase();
  if (align === "center" || align === "right" || align === "left") {
    return `text-align:${align};`;
  }
  return "";
}

function paragraphDataAttr(paragraphIndex: number | null): string {
  return paragraphIndex === null ? "" : ` data-word-p-index=\"${paragraphIndex}\"`;
}

async function paragraphToHtml(
  zip: JSZip,
  relMap: RelMap,
  paragraph: Element,
  paragraphIndex: number | null
): Promise<string> {
  const tag = paragraphTag(paragraph);
  const alignStyle = paragraphAlignStyle(paragraph);
  const dataAttr = paragraphDataAttr(paragraphIndex);
  const runs = queryAllByLocalName(paragraph, "r");
  if (runs.length === 0) {
    return `<${tag}${dataAttr}${alignStyle ? ` style=\"${alignStyle}\"` : ""}><br/></${tag}>`;
  }

  const parts: string[] = [];
  for (const run of runs) {
    const rPr = queryByLocalName(run, "rPr");
    const css = runStyleToCss(rPr);

    const drawing = queryByLocalName(run, "drawing");
    if (drawing) {
      const blip = queryByLocalName(drawing, "blip");
      const rid = getAttr(blip, "r:embed") ?? getAttr(blip, "embed");
      if (rid) {
        const src = await imageRidToDataUrl(zip, relMap, rid);
        if (src) {
          const imageSize = parseDrawingSizePx(drawing);
          const dimensionAttrs = imageDimensionAttributes(imageSize);
          parts.push(`<img src=\"${src}\" alt=\"word-image\"${dimensionAttrs}/>`);
          continue;
        }
      }
    }

    const texts = queryAllByLocalName(run, "t").map((t) => t.textContent ?? "").join("");
    const brs = queryAllByLocalName(run, "br").length;
    const runText = `${escapeHtml(texts)}${"<br/>".repeat(brs)}`;
    if (!runText) continue;
    if (css) {
      parts.push(`<span style=\"${css}\">${runText}</span>`);
    } else {
      parts.push(runText);
    }
  }

  const content = parts.join("") || "<br/>";
  return `<${tag}${dataAttr}${alignStyle ? ` style=\"${alignStyle}\"` : ""}>${content}</${tag}>`;
}

function runText(run: Element): string {
  const text = queryAllByLocalName(run, "t").map((t) => t.textContent ?? "").join("");
  const brCount = queryAllByLocalName(run, "br").length;
  return `${escapeHtml(text)}${"<br/>".repeat(brCount)}`;
}

function paragraphText(paragraph: Element): string {
  const runs = queryAllByLocalName(paragraph, "r");
  const content = runs.map((run) => runText(run)).join("");
  return content || "<br/>";
}

function tableCellHtml(cell: Element, paragraphIndexMap: Map<Element, number>): string {
  const paragraphs = queryAllByLocalName(cell, "p");
  if (paragraphs.length === 0) {
    const text = queryAllByLocalName(cell, "t").map((t) => t.textContent ?? "").join("").trim();
    return escapeHtml(text) || "<br/>";
  }
  return paragraphs
    .map((p) => {
      const paragraphIndex = paragraphIndexMap.get(p) ?? null;
      return `<p${paragraphDataAttr(paragraphIndex)}>${paragraphText(p)}</p>`;
    })
    .join("");
}

function tableToHtml(table: Element, paragraphIndexMap: Map<Element, number>): string {
  const rows = queryAllByLocalName(table, "tr");
  const htmlRows = rows.map((row) => {
    const cells = queryAllByLocalName(row, "tc");
    const htmlCells = cells
      .map((cell) => `<td style="border:1px solid #222;vertical-align:top;">${tableCellHtml(cell, paragraphIndexMap)}</td>`)
      .join("");
    return `<tr>${htmlCells}</tr>`;
  });
  return `<table style="border-collapse:collapse;table-layout:fixed;width:100%;border:1px solid #222;">${htmlRows.join("")}</table>`;
}

export async function parseDocxToHtmlSnapshot(file: File): Promise<string> {
  const maybeArrayBuffer = (file as unknown as { arrayBuffer?: () => Promise<ArrayBuffer> }).arrayBuffer;
  const buffer = maybeArrayBuffer ? await maybeArrayBuffer.call(file) : await new Response(file).arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);

  const documentXmlText = await zip.file("word/document.xml")?.async("string");
  if (!documentXmlText) {
    throw new Error("DOCX missing document.xml");
  }
  const relsText = await zip.file("word/_rels/document.xml.rels")?.async("string");
  const relMap = parseDocRelsMap(relsText ?? null);
  const documentXml = parseXml(documentXmlText);
  const body = queryByLocalName(documentXml, "body");
  if (!body) {
    throw new Error("DOCX missing body");
  }

  const paragraphIndexMap = new Map<Element, number>();
  queryAllByLocalName(documentXml, "p").forEach((paragraph, index) => {
    paragraphIndexMap.set(paragraph, index);
  });

  const blockHtml: string[] = [];
  for (const child of Array.from(body.children)) {
    if (child.localName === "sectPr") continue;
    if (child.localName === "p") {
      const paragraphIndex = paragraphIndexMap.get(child) ?? null;
      blockHtml.push(await paragraphToHtml(zip, relMap, child, paragraphIndex));
      continue;
    }
    if (child.localName === "tbl") {
      blockHtml.push(tableToHtml(child, paragraphIndexMap));
      continue;
    }
  }

  return buildHtmlSnapshot(blockHtml.join("\n"));
}
