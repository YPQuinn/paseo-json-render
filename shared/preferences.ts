import { defineSettings } from "@getpaseo/plugin";
import { z } from "zod";

export const preferences = defineSettings({
  id: "preferences",
  scope: "host",
  version: 1,
  schema: z.object({
    autoPrompt: z.boolean().default(true),
    rememberForms: z.boolean().default(true),
  }),
});

export const savedFormSchema = z.object({
  state: z.record(z.string(), z.json()),
  submitted: z.boolean(),
  updatedAt: z.number(),
});
export type SavedForm = z.output<typeof savedFormSchema>;

export const formHistory = defineSettings({
  id: "forms",
  scope: "host",
  version: 1,
  schema: z.object({
    entries: z.record(z.string(), savedFormSchema).default({}),
  }),
});
