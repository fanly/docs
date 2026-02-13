import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import type { EditorOperation } from "@/lib/types/editor";

export interface CollabConfig {
  room: string;
  endpoint: string;
}

export class YjsOperationChannel {
  private doc: Y.Doc;
  private provider: WebsocketProvider;
  private operationMap: Y.Map<string>;

  constructor(config: CollabConfig) {
    this.doc = new Y.Doc();
    this.provider = new WebsocketProvider(config.endpoint, config.room, this.doc, {
      connect: true
    });
    this.operationMap = this.doc.getMap<string>("ops");
  }

  onOperation(cb: (op: EditorOperation) => void): () => void {
    const observer = () => {
      const raw = this.operationMap.get("latest");
      if (!raw) return;
      cb(JSON.parse(raw) as EditorOperation);
    };

    this.operationMap.observe(observer);
    return () => this.operationMap.unobserve(observer);
  }

  publishOperation(op: EditorOperation): void {
    this.operationMap.set("latest", JSON.stringify(op));
  }

  destroy(): void {
    this.provider.destroy();
    this.doc.destroy();
  }
}
