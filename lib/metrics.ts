export interface MetricSnapshot {
  loadMs: number;
  firstRenderMs: number;
  memoryMb: number | null;
}

export class EditorMetrics {
  private initAt = 0;
  private loadAt = 0;

  markInit(): void {
    this.initAt = performance.now();
  }

  markLoaded(): void {
    this.loadAt = performance.now();
  }

  snapshot(): MetricSnapshot {
    const renderNow = performance.now();
    const loadMs = this.loadAt && this.initAt ? this.loadAt - this.initAt : 0;
    const firstRenderMs = this.loadAt ? renderNow - this.loadAt : 0;

    const memoryMb = this.readMemoryMb();

    return {
      loadMs: Number(loadMs.toFixed(2)),
      firstRenderMs: Number(firstRenderMs.toFixed(2)),
      memoryMb
    };
  }

  private readMemoryMb(): number | null {
    type MaybePerformance = Performance & {
      memory?: {
        usedJSHeapSize: number;
      };
    };

    const perf = performance as MaybePerformance;
    if (!perf.memory) return null;
    return Number((perf.memory.usedJSHeapSize / (1024 * 1024)).toFixed(2));
  }
}
