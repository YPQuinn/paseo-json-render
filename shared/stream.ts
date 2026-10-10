import { applySpecStreamPatch, type Spec } from "@json-render/core";
import { z } from "zod";
import { elementSchema, uiSpecSchema } from "./spec";

const patchSchema = z.discriminatedUnion("op", [
  z
    .object({ op: z.literal("add"), path: z.string(), value: z.json() })
    .strict(),
  z
    .object({ op: z.literal("replace"), path: z.string(), value: z.json() })
    .strict(),
  z.object({ op: z.literal("remove"), path: z.string() }).strict(),
]);

// Render only complete, reachable elements while other referenced elements arrive.
function projectPartialSpec(document: Record<string, unknown>): Spec | null {
  if (
    typeof document.root !== "string" ||
    !document.elements ||
    typeof document.elements !== "object"
  )
    return null;
  const source = document.elements as Record<string, unknown>;
  const elements: Record<string, z.output<typeof elementSchema>> = {};
  const visiting = new Set<string>();
  function visit(id: string): boolean {
    if (visiting.has(id)) return false;
    if (elements[id]) return true;
    const parsed = elementSchema.safeParse(source[id]);
    if (!parsed.success) return false;
    visiting.add(id);
    const children = parsed.data.children.filter(visit);
    visiting.delete(id);
    elements[id] = { ...parsed.data, children };
    return true;
  }
  if (!visit(document.root)) return null;
  const parsed = uiSpecSchema.safeParse(
    JSON.parse(
      JSON.stringify({
        root: document.root,
        elements,
        ...(document.state ? { state: document.state } : {}),
      }),
    ),
  );
  return parsed.success ? parsed.data : null;
}

export function compileUIStream(
  source: string,
  complete: boolean,
): Spec | null {
  const document: Record<string, unknown> = { elements: {} };
  const lines = source.split(/\r?\n/);
  if (!complete && !source.endsWith("\n")) lines.pop();
  let preview: Spec | null = null;
  for (let index = 0; index < lines.length; index++) {
    if (!lines[index].trim()) continue;
    try {
      const patch = patchSchema.parse(JSON.parse(lines[index]));
      const segments = patch.path
        .split("/")
        .slice(1)
        .map((part) => part.replace(/~1/g, "/").replace(/~0/g, "~"));
      if (
        !/^\/(root|elements|state)(\/|$)/.test(patch.path) ||
        /~(?![01])/.test(patch.path) ||
        segments.some((part) =>
          ["__proto__", "constructor", "prototype"].includes(part),
        )
      ) {
        throw new Error("补丁路径必须位于 /root、/elements 或 /state 中。");
      }
      applySpecStreamPatch(document, patch);
      if (!complete) preview = projectPartialSpec(document) ?? preview;
    } catch (error) {
      throw new Error(
        `第 ${index + 1} 行补丁无效：${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  return complete ? uiSpecSchema.parse(document) : preview;
}

export function specToStream(spec: Spec): string {
  return [
    { op: "add", path: "/state", value: spec.state ?? {} },
    { op: "add", path: "/root", value: spec.root },
    ...Object.entries(spec.elements).map(([id, value]) => ({
      op: "add",
      path: `/elements/${id.replace(/~/g, "~0").replace(/\//g, "~1")}`,
      value,
    })),
  ]
    .map((patch) => JSON.stringify(patch))
    .join("\n");
}
