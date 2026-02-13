import styles from "./compare-panel.module.css";

const rows = [
  ["可控性", "可控性极高", "受 SDK 能力边界约束"],
  ["定制能力", "可深度定制数据结构与编辑行为", "定制依赖插件/API 扩展"],
  ["AI 适配", "语义层和操作流可深度融合 AI", "需做 Adapter 或导出再处理"],
  ["上线速度", "中等，需投入架构研发", "高，成熟能力可快速上线"],
  ["保真度", "取决于引擎投入，长期可追平", "初期通常更高且稳定"],
  ["长期成本", "License 低、团队能力要求高", "License 高、维护可预测"],
  ["企业风险", "技术债可控但实现门槛高", "供应商绑定风险"],
  ["推荐场景", "重定制、强 AI、一体化平台", "快速交付、文档能力先行" ]
] as const;

export function ArchitectureComparePanel() {
  return (
    <aside className={styles.panel}>
      <h3>Architecture Compare Panel</h3>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>维度</th>
            <th>自研 Render-first</th>
            <th>SDK</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([dimension, custom, sdk]) => (
            <tr key={dimension}>
              <td>{dimension}</td>
              <td>{custom}</td>
              <td>{sdk}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </aside>
  );
}
