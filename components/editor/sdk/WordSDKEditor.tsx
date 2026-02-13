"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArchitectureComparePanel } from "@/components/editor/shared/ArchitectureComparePanel";
import { EditorMetrics, type MetricSnapshot } from "@/lib/metrics";
import { createWordSDKAdapter, type WordSDKAdapter } from "@/lib/sdkAdapter";
import styles from "./sdk.module.css";

const initialMetrics: MetricSnapshot = {
  loadMs: 0,
  firstRenderMs: 0,
  memoryMb: null
};

export default function WordSDKEditor() {
  const mountRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const adapterRef = useRef<WordSDKAdapter | null>(null);
  const metricsRef = useRef(new EditorMetrics());

  const [dropActive, setDropActive] = useState(false);
  const [metrics, setMetrics] = useState<MetricSnapshot>(initialMetrics);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);

  const initSdk = useCallback(async () => {
    const mountNode = mountRef.current;
    if (!mountNode) return;

    metricsRef.current.markInit();

    try {
      const adapter = createWordSDKAdapter();
      await adapter.init(mountNode);
      adapterRef.current = adapter;
      metricsRef.current.markLoaded();
      setMetrics(metricsRef.current.snapshot());
      setRuntimeError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown SDK initialization error";
      setRuntimeError(message);
    }
  }, []);

  useEffect(() => {
    void initSdk();
    return () => {
      adapterRef.current?.destroy();
      adapterRef.current = null;
    };
  }, [initSdk]);

  const loadDocx = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".docx")) {
      setRuntimeError("Only .docx files are supported in SDK mode.");
      return;
    }

    const adapter = adapterRef.current;
    if (!adapter) {
      setRuntimeError("SDK is not initialized. Check runtime config and retry.");
      return;
    }

    metricsRef.current.markInit();
    await adapter.loadDocument(file);
    metricsRef.current.markLoaded();
    setMetrics(metricsRef.current.snapshot());
    setRuntimeError(null);
  }, []);

  const onDrop = useCallback(
    async (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDropActive(false);
      const file = event.dataTransfer.files[0];
      if (!file) return;
      await loadDocx(file);
    },
    [loadDocx]
  );

  const onFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      await loadDocx(file);
      event.target.value = "";
    },
    [loadDocx]
  );

  const metricView = useMemo(
    () => [
      { label: "文档加载时间", value: `${metrics.loadMs} ms` },
      { label: "首次渲染时间", value: `${metrics.firstRenderMs} ms` },
      { label: "内存占用", value: metrics.memoryMb === null ? "N/A" : `${metrics.memoryMb} MB` }
    ],
    [metrics]
  );

  return (
    <div className="page-card">
      <h1 className="page-title">SDK Word 编辑器（Nutrient Adapter）</h1>
      <p className="page-subtitle">通过统一 SDK Adapter 层隔离供应商依赖，支持真实业务替换与扩展。</p>

      <section className={styles.layout}>
        <div className={styles.editorPane}>
          <div className={styles.toolbar}>
            <button type="button" className={styles.uploadBtn} onClick={() => inputRef.current?.click()}>
              上传 .docx
            </button>
            <input ref={inputRef} type="file" accept=".docx" className={styles.fileInput} onChange={onFileSelect} />

            <div className={`${styles.dropZone} ${dropActive ? styles.dropZoneActive : ""}`}>拖拽 .docx 到此自动加载</div>
          </div>

          <div
            className={styles.canvas}
            onDragOver={(e) => {
              e.preventDefault();
              setDropActive(true);
            }}
            onDragLeave={() => setDropActive(false)}
            onDrop={onDrop}
          >
            <div ref={mountRef} className={styles.mountPoint} />
            {runtimeError ? <div className={styles.fallback}>{runtimeError}</div> : null}
          </div>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          <section className={styles.editorPane} style={{ minHeight: "auto" }}>
            <div className={styles.toolbar}>Performance Metrics</div>
            <div style={{ padding: 10 }}>
              <div className={styles.metrics}>
                {metricView.map((item) => (
                  <div key={item.label} className={styles.metricItem}>
                    <span className={styles.metricLabel}>{item.label}</span>
                    <span className={styles.metricValue}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <ArchitectureComparePanel />
        </div>
      </section>
    </div>
  );
}
