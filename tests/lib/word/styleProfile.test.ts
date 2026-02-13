import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { parseDocxStyleProfile } from "@/lib/word/styleProfile";

async function buildDocxWithRenderedPageBreak(): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>第一页文本</w:t></w:r></w:p>
    <w:p><w:r><w:lastRenderedPageBreak/><w:t>第二页开头</w:t></w:r></w:p>
    <w:sectPr><w:pgSz w:w="11906" w:h="16838"/></w:sectPr>
  </w:body>
</w:document>`
  );
  zip.file(
    "word/styles.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault><w:rPr><w:sz w:val="22"/></w:rPr></w:rPrDefault>
    <w:pPrDefault><w:pPr><w:spacing w:line="276" w:lineRule="auto" w:after="160"/></w:pPr></w:pPrDefault>
  </w:docDefaults>
</w:styles>`
  );
  return zip.generateAsync({ type: "arraybuffer" });
}

describe("parseDocxStyleProfile", () => {
  it("treats lastRenderedPageBreak as page break before paragraph", async () => {
    const buffer = await buildDocxWithRenderedPageBreak();
    const file = {
      name: "break.docx",
      arrayBuffer: async () => buffer
    } as unknown as File;

    const profile = await parseDocxStyleProfile(file);

    expect(profile.paragraphProfiles).toHaveLength(2);
    expect(profile.paragraphProfiles[0]?.pageBreakBefore).toBe(false);
    expect(profile.paragraphProfiles[1]?.pageBreakBefore).toBe(true);
  });
});
