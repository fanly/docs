export type EditorMode = "fidelity" | "editing" | "semantic";

export type BlockType =
  | "paragraph"
  | "heading"
  | "table"
  | "image"
  | "list"
  | "quote"
  | "generic";

export interface BlockRecord {
  id: string;
  type: BlockType;
  xpath: string;
  tagName: string;
  top: number;
  left: number;
  width: number;
  height: number;
  pageIndex: number;
  html: string;
}

export interface PageMetrics {
  widthPx: number;
  heightPx: number;
  marginTopPx: number;
  marginBottomPx: number;
  marginLeftPx: number;
  marginRightPx: number;
  headerOffsetPx: number;
  footerOffsetPx: number;
}

export interface PaginationPage {
  index: number;
  startY: number;
  endY: number;
}

export type EditorOperation =
  | {
      type: "replace_block";
      blockId: string;
      beforeHtml: string;
      afterHtml: string;
      timestamp: number;
    }
  | {
      type: "insert_text";
      blockId: string;
      text: string;
      offset: number;
      timestamp: number;
    }
  | {
      type: "delete_block";
      blockId: string;
      removedHtml: string;
      timestamp: number;
    };
