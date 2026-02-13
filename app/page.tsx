import Link from "next/link";
import styles from "./home.module.css";

export default function HomePage() {
  return (
    <div className={styles.center}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>Enterprise Online Document Architecture</p>
        <h1>Word 高保真编辑器工作台</h1>
        <p>
          当前聚焦自研 Render-first 引擎，围绕保真渲染、增量编辑、样式一致性诊断与图片资产链路进行工程化验证。
        </p>
        <div className={styles.ctaGroup}>
          <Link href="/editor/custom" className={styles.ctaPrimary}>
            自研高保真编辑器
          </Link>
        </div>
      </section>
    </div>
  );
}
