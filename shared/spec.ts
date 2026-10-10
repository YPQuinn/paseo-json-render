import { getByPath, type Spec } from "@json-render/core";
import { z } from "zod";
import { componentDefinitions } from "./catalog";

const pressAction = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("submit"),
      params: z.object({ message: z.string().min(1) }).strict(),
    })
    .strict(),
  z
    .object({ action: z.literal("reset"), params: z.object({}).strict() })
    .strict(),
]);

export const elementSchema = z
  .object({
    type: z.enum(
      Object.keys(componentDefinitions) as [
        keyof typeof componentDefinitions,
        ...Array<keyof typeof componentDefinitions>,
      ],
    ),
    props: z.record(z.string(), z.unknown()),
    children: z.array(z.string()),
    on: z.object({ press: pressAction }).strict().optional(),
  })
  .strict();

export const uiSpecSchema = z
  .object({
    root: z.string().min(1),
    elements: z.record(z.string(), elementSchema),
    state: z.record(z.string(), z.json()).optional(),
  })
  .strict()
  .superRefine((spec, context) => {
    for (const [id, element] of Object.entries(spec.elements)) {
      const result = componentDefinitions[element.type].props.safeParse(
        element.props,
      );
      if (!result.success) {
        context.addIssue({
          code: "custom",
          path: ["elements", id, "props"],
          message: result.error.issues
            .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
            .join("; "),
        });
      }
      if (element.on && element.type !== "Button") {
        context.addIssue({
          code: "custom",
          path: ["elements", id, "on"],
          message: "Only Button supports actions.",
        });
      }
      if (element.type === "Button" && !element.on) {
        context.addIssue({
          code: "custom",
          path: ["elements", id, "on"],
          message: "Button requires a submit or reset action.",
        });
      }
      if (
        element.type !== "Card" &&
        element.type !== "Stack" &&
        element.children.length
      ) {
        context.addIssue({
          code: "custom",
          path: ["elements", id, "children"],
          message: "Only Card and Stack accept children.",
        });
      }
      if (isField(element.type)) {
        const value = element.props.value;
        if (!value || typeof value !== "object" || !("$bindState" in value)) {
          context.addIssue({
            code: "custom",
            path: ["elements", id, "props", "value"],
            message: "Inputs require a $bindState path.",
          });
        } else if (result.success) {
          const path = (value as { $bindState: string }).$bindState;
          const initial = getByPath(spec.state ?? {}, path);
          const expected =
            element.type === "Toggle"
              ? z.boolean()
              : element.type === "MultiSelect"
                ? z.array(z.string())
                : z.string();
          if (!expected.safeParse(initial).success) {
            context.addIssue({
              code: "custom",
              path: ["state", path],
              message: `Initialize ${path} with the correct field type.`,
            });
          }
        }
      }
      if (
        element.type === "Input" &&
        typeof element.props.minLength === "number" &&
        typeof element.props.maxLength === "number" &&
        element.props.minLength > element.props.maxLength
      ) {
        context.addIssue({
          code: "custom",
          path: ["elements", id, "props"],
          message: "minLength must not exceed maxLength.",
        });
      }
    }

    const visiting = new Set<string>();
    const visited = new Set<string>();
    function visit(id: string): void {
      const element = spec.elements[id];
      if (!element) {
        context.addIssue({ code: "custom", message: `Missing element: ${id}` });
        return;
      }
      if (visiting.has(id)) {
        context.addIssue({ code: "custom", message: `Cyclic children: ${id}` });
        return;
      }
      if (visited.has(id)) return;
      visiting.add(id);
      for (const child of element.children) visit(child);
      visiting.delete(id);
      visited.add(id);
    }
    // Check unreachable branches too so malformed specs fail consistently.
    visit(spec.root);
    for (const id of Object.keys(spec.elements)) visit(id);
  });

export function parseUISpec(source: string): Spec {
  return uiSpecSchema.parse(JSON.parse(source));
}

export function describeSpecError(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
  }
  return error instanceof Error ? error.message : String(error);
}

export function isField(type: string): boolean {
  return ["Input", "Select", "Toggle", "MultiSelect"].includes(type);
}

export function validateFields(
  spec: Spec,
  state: Record<string, unknown>,
): string | null {
  const reachable = new Set<string>();
  function visit(id: string) {
    if (reachable.has(id)) return;
    reachable.add(id);
    for (const child of spec.elements[id]?.children ?? []) visit(child);
  }
  visit(spec.root);
  for (const id of reachable) {
    const element = spec.elements[id];
    if (!isField(element.type)) continue;
    const props = element.props;
    const value = getByPath(
      state,
      (props.value as { $bindState: string }).$bindState,
    );
    if (element.type === "Toggle") {
      if (props.required && value !== true) return `勾选「${props.label}」。`;
      if (typeof value !== "boolean")
        return `「${props.label}」的值必须为布尔值。`;
      continue;
    }
    if (element.type === "MultiSelect") {
      if (
        !Array.isArray(value) ||
        value.some((item) => typeof item !== "string")
      )
        return `为「${props.label}」选择有效选项。`;
      if (props.required && !value.length)
        return `至少选择一个「${props.label}」选项。`;
    } else {
      if (typeof value !== "string") return `填写「${props.label}」。`;
      if (props.required && !value.trim()) return `填写「${props.label}」。`;
      if (element.type === "Input") {
        if (
          typeof props.minLength === "number" &&
          value.length < props.minLength
        )
          return `「${props.label}」至少需要 ${props.minLength} 个字符。`;
        if (
          typeof props.maxLength === "number" &&
          value.length > props.maxLength
        )
          return `「${props.label}」最多允许 ${props.maxLength} 个字符。`;
      }
    }
    if (element.type === "Select" || element.type === "MultiSelect") {
      const choices = props.options as Array<{ value: string }>;
      const selected = Array.isArray(value)
        ? value
        : value === ""
          ? []
          : [value];
      if (
        selected.some(
          (item) => !choices.some((choice) => choice.value === item),
        )
      )
        return `为「${props.label}」选择有效选项。`;
    }
  }
  return null;
}
