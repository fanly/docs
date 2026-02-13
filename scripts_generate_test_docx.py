from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import base64

out_dir = Path('assets/test-docs')
out_dir.mkdir(parents=True, exist_ok=True)
out_file = out_dir / 'word-fidelity-full-coverage-test.docx'

# 1x1 PNGs (red/green/blue)
PNG_RED = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z6wAAAABJRU5ErkJggg==')
PNG_GREEN = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8AARQMBgAq8rVQAAAAASUVORK5CYII=')
PNG_BLUE = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8zwAAAgMBgN5n0WkAAAAASUVORK5CYII=')

content_types = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
</Types>
'''

rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>
'''

doc_rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image-small.png"/>
  <Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image-medium.png"/>
  <Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image-large.png"/>
</Relationships>
'''

styles = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="等线"/>
        <w:sz w:val="28"/>
        <w:szCs w:val="28"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:line="360" w:lineRule="auto" w:after="120"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>

  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
  </w:style>

  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:pPr><w:spacing w:before="120" w:after="120"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="40"/><w:color w:val="0F4761"/></w:rPr>
  </w:style>

  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:pPr><w:spacing w:before="80" w:after="80"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="34"/><w:color w:val="1F4E79"/></w:rPr>
  </w:style>

  <w:style w:type="paragraph" w:styleId="Heading3">
    <w:name w:val="heading 3"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:pPr><w:spacing w:before="60" w:after="60"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="30"/><w:color w:val="2F6D9B"/></w:rPr>
  </w:style>
</w:styles>
'''

numbering = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="0">
    <w:multiLevelType w:val="hybridMultilevel"/>
    <w:lvl w:ilvl="0">
      <w:start w:val="1"/>
      <w:numFmt w:val="decimal"/>
      <w:lvlText w:val="%1."/>
      <w:lvlJc w:val="left"/>
      <w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr>
    </w:lvl>
    <w:lvl w:ilvl="1">
      <w:start w:val="1"/>
      <w:numFmt w:val="lowerLetter"/>
      <w:lvlText w:val="%1.%2."/>
      <w:lvlJc w:val="left"/>
      <w:pPr><w:ind w:left="1440" w:hanging="360"/></w:pPr>
    </w:lvl>
  </w:abstractNum>

  <w:abstractNum w:abstractNumId="1">
    <w:multiLevelType w:val="multilevel"/>
    <w:lvl w:ilvl="0">
      <w:start w:val="1"/>
      <w:numFmt w:val="bullet"/>
      <w:lvlText w:val="•"/>
      <w:lvlJc w:val="left"/>
      <w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr>
    </w:lvl>
    <w:lvl w:ilvl="1">
      <w:start w:val="1"/>
      <w:numFmt w:val="bullet"/>
      <w:lvlText w:val="◦"/>
      <w:lvlJc w:val="left"/>
      <w:pPr><w:ind w:left="1440" w:hanging="360"/></w:pPr>
    </w:lvl>
  </w:abstractNum>

  <w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
  <w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num>
</w:numbering>
'''

def p_text(text: str) -> str:
    return f'<w:p><w:r><w:t xml:space="preserve">{text}</w:t></w:r></w:p>'

def p_heading(level: int, text: str) -> str:
    return f'<w:p><w:pPr><w:pStyle w:val="Heading{level}"/></w:pPr><w:r><w:t>{text}</w:t></w:r></w:p>'

def p_list(num_id: int, ilvl: int, text: str) -> str:
    return f'''<w:p>
      <w:pPr>
        <w:numPr><w:ilvl w:val="{ilvl}"/><w:numId w:val="{num_id}"/></w:numPr>
      </w:pPr>
      <w:r><w:t xml:space="preserve">{text}</w:t></w:r>
    </w:p>'''

def p_colored_runs() -> str:
    return '''<w:p>
      <w:r><w:t>本段用于测试段内混合样式：</w:t></w:r>
      <w:r><w:rPr><w:color w:val="EE0000"/><w:b/></w:rPr><w:t>红色加粗</w:t></w:r>
      <w:r><w:t>、</w:t></w:r>
      <w:r><w:rPr><w:color w:val="0070C0"/><w:i/></w:rPr><w:t>蓝色斜体</w:t></w:r>
      <w:r><w:t>、</w:t></w:r>
      <w:r><w:rPr><w:u w:val="single"/><w:color w:val="00B050"/></w:rPr><w:t>绿色下划线</w:t></w:r>
      <w:r><w:t>、</w:t></w:r>
      <w:r><w:rPr><w:highlight w:val="yellow"/></w:rPr><w:t>黄色高亮</w:t></w:r>
      <w:r><w:t>、</w:t></w:r>
      <w:r><w:rPr><w:strike/></w:rPr><w:t>删除线</w:t></w:r>
      <w:r><w:t>。</w:t></w:r>
    </w:p>'''

def p_image(rid: str, docpr_id: int, name: str, cx: int, cy: int) -> str:
    return f'''<w:p>
      <w:r>
        <w:drawing>
          <wp:inline distT="0" distB="0" distL="0" distR="0"
            xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
            xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
            xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
            <wp:extent cx="{cx}" cy="{cy}"/>
            <wp:docPr id="{docpr_id}" name="{name}"/>
            <wp:cNvGraphicFramePr>
              <a:graphicFrameLocks noChangeAspect="1"/>
            </wp:cNvGraphicFramePr>
            <a:graphic>
              <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                <pic:pic>
                  <pic:nvPicPr>
                    <pic:cNvPr id="{docpr_id}" name="{name}"/>
                    <pic:cNvPicPr/>
                  </pic:nvPicPr>
                  <pic:blipFill>
                    <a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="{rid}"/>
                    <a:stretch><a:fillRect/></a:stretch>
                  </pic:blipFill>
                  <pic:spPr>
                    <a:xfrm><a:off x="0" y="0"/><a:ext cx="{cx}" cy="{cy}"/></a:xfrm>
                    <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                  </pic:spPr>
                </pic:pic>
              </a:graphicData>
            </a:graphic>
          </wp:inline>
        </w:drawing>
      </w:r>
    </w:p>'''

body_parts = [
    p_heading(1, '一级标题：Word 高保真渲染综合测试'),
    p_text('这是一段普通正文，用于测试默认字体、字号、行距、段后间距和换行表现。'),
    p_text('第二段正文：系统需要兼容中文、English words、1234567890、全角标点（，。；：）与半角标点 (,.;:)。'),

    p_heading(2, '二级标题：列表能力验证'),
    p_list(1, 0, '编号列表一级：需求分析与范围确认'),
    p_list(1, 1, '编号列表二级：页面布局、文本渲染、交互编辑'),
    p_list(1, 1, '编号列表二级：图片管线、字体回退、分页规则'),
    p_list(1, 0, '编号列表一级：测试覆盖与回归门禁'),

    p_list(2, 0, '项目要点（项目符号一级）'),
    p_list(2, 1, '项目符号二级：支持粘贴 Word / WPS / Google Docs'),
    p_list(2, 1, '项目符号二级：支持 run 级样式与段落级样式'),

    p_heading(3, '三级标题：段内样式验证'),
    p_colored_runs(),
    p_text('同一段中继续测试上标x²、下标H₂O、以及不同字重与颜色组合。'),

    p_heading(2, '二级标题：图片尺寸验证（小/中/大）'),
    p_text('以下三张图片分别设置为小图、中图和大图，用于验证图片尺寸映射、缩放和版心约束。'),
    p_image('rId3', 1001, 'small-image', 914400, 685800),
    p_image('rId4', 1002, 'medium-image', 2743200, 2057400),
    p_image('rId5', 1003, 'large-image', 4572000, 3429000),

    p_heading(2, '二级标题：结尾段落'),
    p_text('最后一段用于验证尾部留白、日期段对齐和分页边界行为。'),
    '<w:p><w:pPr><w:jc w:val="right"/></w:pPr><w:r><w:t>2026 年 2 月 13 日</w:t></w:r></w:p>'
]

body_xml = '\n'.join(body_parts)

document = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
  <w:body>
    {body_xml}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1800" w:bottom="1440" w:left="1800" w:header="851" w:footer="992" w:gutter="0"/>
      <w:cols w:space="425"/>
      <w:docGrid w:type="lines" w:linePitch="312"/>
    </w:sectPr>
  </w:body>
</w:document>
'''

with ZipFile(out_file, 'w', ZIP_DEFLATED) as z:
    z.writestr('[Content_Types].xml', content_types)
    z.writestr('_rels/.rels', rels)
    z.writestr('word/document.xml', document)
    z.writestr('word/styles.xml', styles)
    z.writestr('word/numbering.xml', numbering)
    z.writestr('word/_rels/document.xml.rels', doc_rels)
    z.writestr('word/media/image-small.png', PNG_RED)
    z.writestr('word/media/image-medium.png', PNG_GREEN)
    z.writestr('word/media/image-large.png', PNG_BLUE)

print(str(out_file))
