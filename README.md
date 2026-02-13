# Render-first Word Fidelity Editor

企业级在线文档系统骨架，目标是在 Web 中实现接近像素级的 Word 内容保真显示与可持续演进编辑能力。

当前聚焦自研 Render-first 路线（`/editor/custom`），用于生产化能力建设：高保真渲染、增量编辑、兼容矩阵、可测试与可度量。

## 项目目标

- 保真优先：先渲染后编辑，避免语义重建引发样式漂移
- 交互优先：基于 Block Incremental Editing，实现局部更新
- 兼容优先：DOCX 基线 + Word HTML 兼容层双链路
- 工程优先：模块化、可测试、可诊断、可扩展

## 技术栈

- Framework: Next.js 15 (App Router) + React 19 + TypeScript
- DOCX parsing: JSZip + DOMParser
- Rendering: iframe fidelity layer + overlay editing layer
- Testing: Vitest + jsdom
- Quality: ESLint + TypeScript strict mode
- Asset pipeline: Upyun（通过 API Route 上传）
- Runtime: Node/npm（可选 Docker/Bun）

## 路由

- `/`: 项目入口
- `/editor/custom`: 自研高保真编辑器
- `/editor/sdk`: 已下线（返回 `notFound()`）

## 架构

### Dual-Layer Editor

1. Fidelity Render Layer
- 使用 `iframe` 承载 HTML Snapshot
- 保留原始结构与样式，隔离外部样式污染

2. Editable Overlay Layer
- 扫描渲染 DOM 并构建 Block Index
- 仅编辑目标块，提交后局部替换

### DOCX Baseline Pipeline

上传 `.docx` 后解析并生成 `WordStyleProfile`：

- 页面：页高、页边距、版心宽度
- 字体：默认字体族
- 段落：对齐、段距、行距、缩进、keep/page-break
- run：字号、颜色、粗斜体、下划线、删除线、高亮、底纹、上下标、字距、阴影
- 列表：`numId/ilvl/numFmt/lvlText/start`
- 表格：默认单元格边距

### Render Apply Pipeline

`/Users/yemeishu/Documents/codes/coding01/next/docs/lib/word/renderApply.ts` 统一执行渲染应用流程：

1. Word HTML 兼容适配（`mso-*`）
2. 基线样式注入（字体/版心/表格默认样式）
3. 段落级映射
4. run 级映射
5. 列表 marker 重建（含 `%1.%2.`）
6. 分页与 keep 规则应用
7. 可选格式标记显示（诊断模式）

## 设计模式

- Pipeline Pattern：渲染流程分阶段执行
- Adapter Pattern：`mso-*` 到标准 CSS 的映射
- Strategy Pattern：按 `numFmt/lvlText` 选择编号策略
- Incremental Update：按 block 局部替换
- Single Responsibility：解析、应用、诊断、覆盖率分离
- Defensive Compatibility：主链路 + 回退链路并存

## 兼容能力矩阵

### 已支持

- 来源：Word / WPS / Google Docs HTML 粘贴
- 页面：边距、页高、版心计算
- 段落：对齐、段距、行距、缩进、keepNext/keepLines/pageBreakBefore
- run：字号、颜色、字体、粗斜体、下划线、删除线、高亮、底纹、上下标、字距、阴影
- 列表：多级编号、模板 `%1.%2.`、section break 计数重置
- 表格：默认边框模型、单元格 padding、垂直对齐兜底
- 图片：抽取、哈希命名、上传、CDN URL 替换
- 诊断：样式一致性指标与覆盖率统计

### 部分支持

- 复杂跨页规则（widow/orphan 全覆盖）
- 复杂列表跨章节连续性
- 复杂嵌套表格语义
- 部分 DrawingML 锚点对象

### 规划中

- Track Changes
- 批注系统
- 域代码/目录刷新
- SmartArt/图表/公式深层支持

## 工程目录

```txt
app/
  api/assets/upload/route.ts
  editor/custom/page.tsx

components/editor/custom/
  WordCustomEditorShell.tsx
  WordRenderer.tsx
  OverlayEditor.tsx
  BlockIndexer.ts

lib/word/
  styleProfile.ts
  htmlCompat.ts
  renderApply.ts
  audit.ts
  coverage.ts
  editorHtml.ts

lib/assets/
  imagePipeline.ts

tests/lib/word/
  htmlCompat.test.ts
  renderApply.test.ts
  coverage.test.ts

docs/
  FRONTEND_STANDARDS.md
```

## 前端规范

完整规范见：`/Users/yemeishu/Documents/codes/coding01/next/docs/docs/FRONTEND_STANDARDS.md`

覆盖内容：

- 分层边界（app/components/lib/tests）
- TS 类型约束与命名约定
- Next.js Server/Client 组件边界规则
- 样式管理与性能约束
- 测试与质量门禁
- 提交流程与安全规范

## 环境变量

```bash
UPYUN_BUCKET=your_bucket
UPYUN_OPERATOR=your_operator
UPYUN_PASSWORD=your_password
UPYUN_DOMAIN=https://v0.api.upyun.com
UPYUN_CDN_DOMAIN=https://your-cdn-domain
```

## 本地运行

```bash
npm install
npm run dev
```

访问：`http://localhost:3000/editor/custom`

## 质量门禁

```bash
npm run typecheck
npm run lint
npm run test
```

## Docker / Bun（可选）

```bash
docker compose up --build
```

适合团队统一环境与构建提速场景。
