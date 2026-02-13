const SNAPSHOT_SHELL_START = "<!DOCTYPE html><html><head><meta charset=\"utf-8\"/>";
const SNAPSHOT_SHELL_END = "</head><body></body></html>";

export function buildHtmlSnapshot(rawHtml: string): string {
  if (!rawHtml.trim()) {
    return `${SNAPSHOT_SHELL_START}${SNAPSHOT_SHELL_END}`;
  }

  const hasHtmlTag = /<html[\s>]/i.test(rawHtml);
  if (hasHtmlTag) {
    return rawHtml;
  }

  return `${SNAPSHOT_SHELL_START}${SNAPSHOT_SHELL_END}`.replace(
    "<body></body>",
    `<body>${rawHtml}</body>`
  );
}

export async function readClipboardHtml(): Promise<string | null> {
  if (!navigator.clipboard?.read) {
    return null;
  }

  const items = await navigator.clipboard.read();
  for (const item of items) {
    if (item.types.includes("text/html")) {
      const blob = await item.getType("text/html");
      return blob.text();
    }
  }

  return null;
}
