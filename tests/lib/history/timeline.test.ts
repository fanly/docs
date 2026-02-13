import { describe, expect, it } from "vitest";
import { OperationTimeline } from "@/lib/history/timeline";

describe("OperationTimeline", () => {
  it("stores and restores snapshots by timeline entry id", () => {
    const timeline = new OperationTimeline();

    const first = timeline.push(
      {
        type: "replace_block",
        blockId: "b1",
        beforeHtml: "<p>old</p>",
        afterHtml: "<p>new</p>",
        timestamp: 100
      },
      "<html>state1</html>"
    );

    timeline.push(
      {
        type: "delete_block",
        blockId: "b2",
        removedHtml: "<p>remove</p>",
        timestamp: 200
      },
      "<html>state2</html>"
    );

    expect(timeline.list()).toHaveLength(2);
    expect(timeline.latestSnapshot()).toBe("<html>state2</html>");
    expect(timeline.restoreAt(first.id)).toBe("<html>state1</html>");
    expect(timeline.restoreAt("missing")).toBeNull();
  });
});
