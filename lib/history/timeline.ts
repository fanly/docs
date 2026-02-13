import type { EditorOperation } from "@/lib/types/editor";

export interface TimelineEntry {
  id: string;
  operation: EditorOperation;
  snapshotHtml: string;
  timestamp: number;
}

export class OperationTimeline {
  private entries: TimelineEntry[] = [];

  push(operation: EditorOperation, snapshotHtml: string): TimelineEntry {
    const entry: TimelineEntry = {
      id: `${operation.type}_${operation.timestamp}_${this.entries.length}`,
      operation,
      snapshotHtml,
      timestamp: operation.timestamp
    };
    this.entries.push(entry);
    return entry;
  }

  list(): TimelineEntry[] {
    return [...this.entries].sort((a, b) => a.timestamp - b.timestamp);
  }

  restoreAt(entryId: string): string | null {
    const index = this.entries.findIndex((entry) => entry.id === entryId);
    if (index < 0) return null;
    return this.entries[index].snapshotHtml;
  }

  latestSnapshot(): string | null {
    if (this.entries.length === 0) return null;
    return this.entries[this.entries.length - 1].snapshotHtml;
  }
}
