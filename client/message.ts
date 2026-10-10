import { parseUISpec, describeSpecError } from "../shared/spec";
import { compileUIStream } from "../shared/stream";
import type { Spec } from "@json-render/core";

export type MessageSegment =
  | { kind: "text"; text: string; id: string }
  | { kind: "ui"; spec: Spec; id: string; streaming: boolean }
  | { kind: "loading"; id: string }
  | { kind: "error"; error: string; source: string; id: string };

// Walk ordinary fences too, so a UI example inside a Markdown code block stays code.
interface UIBlock {
  start: number;
  contentStart: number;
  contentEnd: number;
  end: number;
  closed: boolean;
  stream: boolean;
}
function findUIBlocks(text: string): UIBlock[] {
  const blocks: UIBlock[] = [];
  const fences = /^ {0,3}(`{3,}|~{3,})([^\r\n]*)\r?$/gm;
  let opening: RegExpExecArray | null;
  while ((opening = fences.exec(text))) {
    const marker = opening[1];
    const label = opening[2].trim();
    const contentStart = opening.index + opening[0].length;
    const closing = new RegExp(
      `^ {0,3}${marker[0]}{${marker.length},}[ \\t]*\\r?$`,
      "gm",
    );
    closing.lastIndex = contentStart;
    const end = closing.exec(text);
    if (label === "paseo-ui" || label === "paseo-ui-stream") {
      blocks.push({
        start: opening.index,
        contentStart,
        contentEnd: end?.index ?? text.length,
        end: end ? end.index + end[0].length : text.length,
        closed: !!end,
        stream: label === "paseo-ui-stream",
      });
    }
    if (!end) break;
    fences.lastIndex = end.index + end[0].length;
  }
  return blocks;
}

export function hasUIBlock(text: string): boolean {
  return findUIBlocks(text).length > 0;
}

// Paseo sends accumulated text. Replaying patches also reconstructs fetched history.
export function splitMessage(
  text: string,
  phase: "streaming" | "complete",
): MessageSegment[] {
  const segments: MessageSegment[] = [];
  let cursor = 0;
  for (const block of findUIBlocks(text)) {
    if (block.start > cursor)
      segments.push({
        kind: "text",
        text: text.slice(cursor, block.start),
        id: `text-${cursor}`,
      });
    const source = text.slice(block.contentStart, block.contentEnd);
    const id = `ui-${block.start}`;
    const pending = !block.closed && phase === "streaming";
    try {
      if (!block.closed && !pending)
        throw new Error("界面代码块缺少结束标记。");
      let spec: Spec | null;
      if (block.stream) spec = compileUIStream(source, !pending);
      else if (pending) {
        try {
          spec = parseUISpec(source);
        } catch {
          spec = null;
        }
      } else spec = parseUISpec(source);
      segments.push(
        spec
          ? { kind: "ui", spec, id, streaming: phase === "streaming" }
          : { kind: "loading", id },
      );
    } catch (error) {
      segments.push({
        kind: "error",
        error: describeSpecError(error),
        source: source.trim(),
        id,
      });
    }
    cursor = block.end;
  }
  if (cursor < text.length)
    segments.push({
      kind: "text",
      text: text.slice(cursor),
      id: `text-${cursor}`,
    });
  return segments;
}
