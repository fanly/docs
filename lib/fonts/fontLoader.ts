export interface FontSourceRegistry {
  [family: string]: string;
}

function normalizeFamily(family: string): string {
  return family.trim().replace(/["']/g, "");
}

function extractFamilies(fontFamilyValue: string): string[] {
  return fontFamilyValue
    .split(",")
    .map(normalizeFamily)
    .filter((v) => v.length > 0);
}

export function detectDocumentFonts(doc: Document): Set<string> {
  const families = new Set<string>();

  const styledElements = Array.from(doc.querySelectorAll("[style*='font-family']"));
  for (const el of styledElements) {
    const value = (el as HTMLElement).style.fontFamily;
    extractFamilies(value).forEach((f) => families.add(f));
  }

  const styleSheets = Array.from(doc.querySelectorAll("style"));
  for (const style of styleSheets) {
    const content = style.textContent ?? "";
    const matches = content.matchAll(/font-family\s*:\s*([^;}{]+)[;}]?/gi);
    for (const match of matches) {
      extractFamilies(match[1]).forEach((f) => families.add(f));
    }
  }

  return families;
}

function isFontAvailable(fontFamily: string): boolean {
  if (!document.fonts?.check) return true;
  return document.fonts.check(`16px \"${fontFamily}\"`);
}

export async function ensureFontsAvailable(doc: Document, registry: FontSourceRegistry): Promise<string[]> {
  const missing: string[] = [];
  const fonts = detectDocumentFonts(doc);

  for (const family of fonts) {
    if (isFontAvailable(family)) continue;

    const src = registry[family];
    if (!src) {
      missing.push(family);
      continue;
    }

    const fontFace = new FontFace(family, `url(${src})`);
    await fontFace.load();
    doc.fonts.add(fontFace);
    document.fonts.add(fontFace);
  }

  return missing;
}
