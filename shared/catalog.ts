import { defineCatalog, defineSchema } from "@json-render/core";
import { z } from "zod";

export const fieldPath = z
  .string()
  .regex(/^\/values\/(?:[^/~]|~[01])+$/)
  .refine(
    (path) =>
      !["__proto__", "constructor", "prototype"].includes(path.slice(8)),
    "Use a normal field name.",
  );
const binding = z.object({ $bindState: fieldPath }).strict();
const boundValue = z.union([z.string(), binding]);
const options = z
  .array(z.object({ label: z.string(), value: z.string() }))
  .min(1)
  .refine(
    (items) => new Set(items.map((item) => item.value)).size === items.length,
    "Option values must be unique.",
  );

export const componentDefinitions = {
  Card: {
    props: z.object({
      title: z.string().optional(),
      description: z.string().optional(),
    }),
    slots: ["default"],
    description: "A card containing a small interface.",
  },
  Stack: {
    props: z.object({
      direction: z.enum(["vertical", "horizontal"]).optional(),
    }),
    slots: ["default"],
    description:
      "Arrange children vertically or horizontally; narrow screens always stack.",
  },
  Heading: {
    props: z.object({ text: z.string() }),
    description: "A section heading.",
  },
  Text: {
    props: z.object({ text: z.string(), muted: z.boolean().optional() }),
    description: "Plain explanatory text.",
  },
  Metric: {
    props: z.object({ label: z.string(), value: z.string() }),
    description: "A labeled metric.",
  },
  Input: {
    props: z.object({
      label: z.string(),
      value: boundValue,
      placeholder: z.string().optional(),
      required: z.boolean().optional(),
      multiline: z.boolean().optional(),
      minLength: z.number().int().nonnegative().optional(),
      maxLength: z.number().int().positive().optional(),
    }),
    description: "Text input. Bind value with {$bindState: '/values/name'}.",
  },
  Select: {
    props: z.object({
      label: z.string(),
      value: boundValue,
      required: z.boolean().optional(),
      options,
    }),
    description:
      "Single-choice options. Bind value with {$bindState: '/values/name'}.",
  },
  Button: {
    props: z.object({
      label: z.string(),
      variant: z.enum(["primary", "secondary"]).optional(),
    }),
    description:
      "Use on.press with submit (params.message required) or reset (params: {}).",
  },
  Divider: {
    props: z.object({}),
    description: "Separate sections.",
  },
  Toggle: {
    props: z.object({
      label: z.string(),
      value: z.union([z.boolean(), binding]),
      required: z.boolean().optional(),
    }),
    description:
      "A boolean checkbox. Bind value with {$bindState: '/values/name'}. required means it must be checked.",
  },
  MultiSelect: {
    props: z.object({
      label: z.string(),
      value: z.union([z.array(z.string()), binding]),
      options,
      required: z.boolean().optional(),
    }),
    description:
      "Multiple choices. Bind value to a string array in state.values.",
  },
  Badge: {
    props: z.object({
      text: z.string(),
      tone: z.enum(["neutral", "success", "warning", "danger"]).optional(),
    }),
    description: "A compact status label.",
  },
  Alert: {
    props: z.object({
      title: z.string().optional(),
      text: z.string(),
      tone: z.enum(["neutral", "success", "warning", "danger"]).optional(),
    }),
    description: "A highlighted explanation or status message.",
  },
  List: {
    props: z.object({
      items: z.array(
        z.object({ title: z.string(), description: z.string().optional() }),
      ),
      ordered: z.boolean().optional(),
    }),
    description: "A list of steps or facts.",
  },
  Table: {
    props: z.object({
      columns: z.array(z.object({ key: z.string(), label: z.string() })).min(1),
      rows: z.array(
        z.record(
          z.string(),
          z.union([z.string(), z.number(), z.boolean(), z.null()]),
        ),
      ),
    }),
    description:
      "A comparison or data table. Compact layouts show labeled rows.",
  },
  Progress: {
    props: z.object({ label: z.string(), value: z.number().min(0).max(100) }),
    description: "Progress from 0 to 100 percent.",
  },
};

// This schema uses only core APIs so the daemon can generate the same catalog prompt.
const schema = defineSchema(
  (s) => ({
    spec: s.object({
      root: s.string(),
      elements: s.record(
        s.object({
          type: s.ref("catalog.components"),
          props: s.any(),
          children: s.array(s.string()),
          on: { ...s.any(), ...s.optional() },
        }),
      ),
      state: { ...s.any(), ...s.optional() },
    }),
    catalog: s.object({
      components: s.map({
        props: s.zod(),
        slots: s.array(s.string()),
        description: s.string(),
      }),
      actions: s.map({ params: s.zod(), description: s.string() }),
    }),
  }),
  {
    promptTemplate: ({ formatZodType }) =>
      [
        "[paseo-json-render]",
        "When an interactive form, comparison, checklist, or dashboard helps the user, use the following UI protocol. Ordinary answers can remain Markdown.",
        "For progressive rendering, use a fenced code block labeled paseo-ui-stream. Each line is one JSON Patch: {op: 'add'|'replace'|'remove', path: '/...', value: ...}. Start with /state, /root, then add complete elements at /elements/id. Never put multiple patches on a line. Finish the fence after the final patch.",
        "Alternatively, use a complete JSON spec in a fenced code block labeled paseo-ui. Never use a nested UI fence inside another code fence.",
        "Use the user's language for all labels. Keep explanatory text outside the code block.",
        "Spec format: {root: 'element-id', elements: {'element-id': {type: 'Card', props: {}, children: []}}, state: {values: {}}}.",
        "Use only these components:",
        ...Object.entries(componentDefinitions).map(
          ([name, definition]) =>
            `${name}: ${formatZodType(definition.props)}. ${definition.description}`,
        ),
        "Every element must have a children array. Only Card and Stack accept children. Leaf elements use []. All child IDs must exist. No cycles.",
        "Input, Select, MultiSelect, and Toggle values must use {$bindState: '/values/field'}; initialize each field in state.values (string, string, string array, boolean respectively). Use distinct field names.",
        "Only Button may have on: {press: {action: 'submit', params: {message: 'What the agent should do with the submitted values'}}} or {press: {action: 'reset', params: {}}}. Use variant: 'secondary' for reset.",
        "Submitting sends the message and the current form state back to this agent. It does not run arbitrary code.",
        "Use a fresh self-contained spec for each interface. Never output HTML, JavaScript, unlisted actions, visibility expressions, or repeat directives. Submit buttons can have different messages to represent different user choices.",
        'Example stream:\n```paseo-ui-stream\n{"op":"add","path":"/state","value":{"values":{}}}\n{"op":"add","path":"/root","value":"card"}\n{"op":"add","path":"/elements/card","value":{"type":"Card","props":{"title":"Status"},"children":["text"]}}\n{"op":"add","path":"/elements/text","value":{"type":"Text","props":{"text":"Ready"},"children":[]}}\n```',
        "[/paseo-json-render]",
      ].join("\n"),
  },
);

export const catalog = defineCatalog(schema, {
  components: componentDefinitions,
  actions: {
    submit: {
      params: z.object({ message: z.string().min(1) }),
      description: "Send current form values to the current agent.",
    },
    reset: {
      params: z.object({}),
      description: "Restore the initial form values without sending a message.",
    },
  },
});

export const uiInstructions = catalog.prompt();
