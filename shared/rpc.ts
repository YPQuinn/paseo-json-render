import { defineRpc } from "@getpaseo/plugin";
import { z } from "zod";

export const showDemo = defineRpc({
  name: "ui.demo",
  input: z.object({
    agentId: z.string(),
    example: z.enum(["form", "dashboard", "stream"]).default("form"),
  }),
  output: z.object({}),
});

export const timelineDataSchema = z.object({
  text: z.string(),
  phase: z.enum(["streaming", "complete"]),
  sourceId: z.string().optional(),
});

export const timelineKind = "generated-ui";
