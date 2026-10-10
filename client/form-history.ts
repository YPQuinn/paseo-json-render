import { settingsRpc } from "@getpaseo/plugin";
import type { PluginCommandCapabilities } from "@getpaseo/plugin/client";
import { createContext } from "react";
import { formHistory, type SavedForm } from "../shared/preferences";

export interface FormRepository {
  load(key: string): Promise<SavedForm | null>;
  save(key: string, form: SavedForm): Promise<void>;
  clear(): Promise<void>;
}

export const FormHistoryContext = createContext<FormRepository | null>(null);

// One queue per installation avoids overwriting another mounted form's draft.
// Revision checks also preserve changes made by other connected clients.
export function createFormRepository(
  rpc: PluginCommandCapabilities["rpc"],
): FormRepository {
  const contracts = settingsRpc(formHistory.id);
  let queue: Promise<unknown> = Promise.resolve();

  async function update(
    change: (entries: Record<string, SavedForm>) => Record<string, SavedForm>,
  ) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const current = await rpc(contracts.read, {});
      if (current.status !== "ready") throw new Error(current.error);
      const parsed = formHistory.schema.parse(current.values);
      const result = await rpc(contracts.write, {
        revision: current.revision,
        values: { entries: change(parsed.entries) },
      });
      if (result.status === "saved") return;
      if (result.status !== "conflict") throw new Error(result.error);
    }
    throw new Error("另一客户端正在修改表单记录。请重试保存。");
  }

  function enqueue(action: () => Promise<void>) {
    const next = queue.catch(() => {}).then(action);
    queue = next;
    return next;
  }

  return {
    async load(key) {
      await queue.catch(() => {});
      const current = await rpc(contracts.read, {});
      if (current.status !== "ready") throw new Error(current.error);
      return formHistory.schema.parse(current.values).entries[key] ?? null;
    },
    save(key, form) {
      return enqueue(() =>
        update((entries) => {
          // An acknowledged submission cannot be reopened by an older draft.
          if (!entries[key]?.submitted) entries[key] = form;
          // Keep the most recent 200 forms, including submitted forms.
          return Object.fromEntries(
            Object.entries(entries)
              .sort((a, b) => b[1].updatedAt - a[1].updatedAt)
              .slice(0, 200),
          );
        }),
      );
    },
    clear() {
      return enqueue(() => update(() => ({})));
    },
  };
}

// Include the spec so a replaced source row never inherits an older form's values.
export function formKey(
  agentId: string,
  sourceId: string,
  segmentId: string,
  spec: unknown,
): string {
  const source = JSON.stringify(spec);
  let hash = 2166136261;
  for (let index = 0; index < source.length; index++)
    hash = Math.imul(hash ^ source.charCodeAt(index), 16777619);
  return JSON.stringify([
    agentId,
    sourceId,
    segmentId,
    (hash >>> 0).toString(16),
  ]);
}
