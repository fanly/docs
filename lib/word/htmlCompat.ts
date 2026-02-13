export interface WordHtmlCompatOptions {
  forceBodyFontFamily?: string;
  forceHeadingFontFamily?: string;
}

function parseStyle(styleText: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const seg of styleText.split(";")) {
    const [rawKey, ...rawValue] = seg.split(":");
    const key = rawKey?.trim().toLowerCase();
    const value = rawValue.join(":").trim();
    if (!key || !value) continue;
    map.set(key, value);
  }
  return map;
}

function serializeStyle(styleMap: Map<string, string>): string {
  return Array.from(styleMap.entries())
    .map(([k, v]) => `${k}: ${v}`)
    .join("; ");
}

function applyMsoMappings(styleMap: Map<string, string>): void {
  const mappingPairs: Array<[string, string]> = [
    ["mso-ansi-font-size", "font-size"],
    ["mso-bidi-font-size", "font-size"],
    ["mso-hansi-font-size", "font-size"],
    ["mso-margin-top-alt", "margin-top"],
    ["mso-margin-bottom-alt", "margin-bottom"],
    ["mso-margin-left-alt", "margin-left"],
    ["mso-margin-right-alt", "margin-right"],
    ["mso-line-height-alt", "line-height"]
  ];

  for (const [msoKey, cssKey] of mappingPairs) {
    const value = styleMap.get(msoKey);
    if (!value) continue;
    if (!styleMap.has(cssKey)) {
      styleMap.set(cssKey, value);
    }
  }

  const msoFore = styleMap.get("mso-foreground");
  if (msoFore && !styleMap.has("color")) {
    styleMap.set("color", msoFore);
  }

  if (styleMap.get("mso-table-lspace") && !styleMap.has("margin-left")) {
    styleMap.set("margin-left", "0");
  }
  if (styleMap.get("mso-table-rspace") && !styleMap.has("margin-right")) {
    styleMap.set("margin-right", "0");
  }
}

function applyListFallback(el: HTMLElement, styleMap: Map<string, string>): void {
  const className = (el.getAttribute("class") ?? "").toLowerCase();
  const msoList = styleMap.get("mso-list") ?? "";
  const maybeList = className.includes("msolist") || msoList.length > 0;
  if (!maybeList) return;

  if (!styleMap.has("text-indent")) {
    styleMap.set("text-indent", "0");
  }

  const marginLeft = styleMap.get("margin-left");
  if (marginLeft && !styleMap.has("padding-left")) {
    styleMap.set("padding-left", marginLeft);
  }
}

function applyTagSpecificFallback(el: HTMLElement, styleMap: Map<string, string>): void {
  const tag = el.tagName.toLowerCase();

  if (tag === "table") {
    if (!styleMap.has("border-collapse")) {
      styleMap.set("border-collapse", "collapse");
    }
    if (!styleMap.has("border-spacing")) {
      styleMap.set("border-spacing", "0");
    }
  }

  if ((tag === "td" || tag === "th") && !styleMap.has("vertical-align")) {
    styleMap.set("vertical-align", "top");
  }

  if (tag === "p" && !styleMap.has("min-height")) {
    styleMap.set("min-height", "1em");
  }
}

function normalizeWordEmptyParagraphs(doc: Document): void {
  const paragraphs = Array.from(doc.querySelectorAll("p"));
  for (const p of paragraphs) {
    const text = (p.textContent ?? "").replace(/\u00a0/g, " ").trim();
    const hasVisibleChildren = p.querySelector("img,table,svg,canvas,br") !== null;
    if (!hasVisibleChildren && text.length === 0) {
      p.innerHTML = "<br/>";
    }
  }
}

function applyGlobalDocFixes(doc: Document, options?: WordHtmlCompatOptions): void {
  const body = doc.body;
  if (!body) return;

  if (options?.forceBodyFontFamily) {
    body.style.fontFamily = options.forceBodyFontFamily;
  }

  if (options?.forceHeadingFontFamily) {
    const headings = Array.from(doc.querySelectorAll("h1,h2,h3,h4,h5,h6"));
    for (const heading of headings) {
      (heading as HTMLElement).style.fontFamily = options.forceHeadingFontFamily;
    }
  }
}

export function applyWordHtmlCompatibility(doc: Document, options?: WordHtmlCompatOptions): void {
  const elements = Array.from(doc.querySelectorAll("[style], p, table, td, th, li, div, span"));

  for (const el of elements) {
    const htmlEl = el as HTMLElement;
    const rawStyle = htmlEl.getAttribute("style") ?? "";
    const styleMap = parseStyle(rawStyle);

    applyMsoMappings(styleMap);
    applyListFallback(htmlEl, styleMap);
    applyTagSpecificFallback(htmlEl, styleMap);

    if (styleMap.size > 0) {
      htmlEl.setAttribute("style", serializeStyle(styleMap));
    }
  }

  normalizeWordEmptyParagraphs(doc);
  applyGlobalDocFixes(doc, options);
}
