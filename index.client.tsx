import type { PluginClientContext } from "@getpaseo/plugin/client";
import { GeneratedMessage } from "./client/timeline";
import { hasUIBlock } from "./client/message";
import { uiInstructions } from "./shared/catalog";
import { showDemo, timelineDataSchema, timelineKind } from "./shared/rpc";
import {
  createFormRepository,
  FormHistoryContext,
} from "./client/form-history";
import { UISettings } from "./client/settings";
import { UIPlayground } from "./client/preview";

export default function contribute(client: PluginClientContext) {
  const repository = createFormRepository((contract, input) =>
    client.rpc(contract, input),
  );
  client.addTimelineTransformer({
    id: "json-render",
    query: { itemType: "assistant_message" },
    transform({ item, phase }) {
      if (!hasUIBlock(item.text)) return;
      return {
        items: [
          {
            type: "plugin",
            kind: timelineKind,
            version: 1,
            data: {
              text: item.text,
              phase,
              ...(item.messageId ? { sourceId: item.messageId } : {}),
            },
          },
        ],
      };
    },
  });
  client.addTimelineRenderer({
    kind: timelineKind,
    version: 1,
    schema: timelineDataSchema,
    Component: (props) => (
      <FormHistoryContext.Provider value={repository}>
        <GeneratedMessage {...props} />
      </FormHistoryContext.Provider>
    ),
  });
  client.addSlashCommand({
    name: "ui",
    description: "让当前 agent 输出交互界面",
    argumentHint: "[任务]",
    context: "agent",
    async onSubmit({ args, paseo, agent }) {
      await paseo.agents
        .ref(agent.id)
        .send(
          uiInstructions +
            "\n\n" +
            (args || "启用以上界面输出约定。在合适的任务中使用交互界面。"),
        );
    },
  });
  client.addSlashCommand({
    name: "ui-demo",
    description: "显示可交互的 json-render 示例",
    argumentHint: "[form | dashboard | stream]",
    context: "agent",
    async onSubmit({ rpc, agent, args }) {
      const example = args || "form";
      if (example !== "form" && example !== "dashboard" && example !== "stream")
        throw new Error("使用 /ui-demo form、dashboard 或 stream。");
      await rpc(showDemo, { agentId: agent.id, example });
    },
  });
  client.addWorkspacePanel({
    id: "playground",
    title: "JSON Render",
    icon: "PanelsTopLeft",
    context: "workspace",
    Component: UIPlayground,
  });
  client.addSettingsScreen({
    id: "preferences",
    title: "JSON Render",
    icon: "Settings2",
    Component: (props) => (
      <FormHistoryContext.Provider value={repository}>
        <UISettings {...props} />
      </FormHistoryContext.Provider>
    ),
  });
  client.addSlashCommand({
    name: "ui-settings",
    description: "打开 JSON Render 设置",
    argumentHint: "",
    context: "workspace",
    onSubmit: ({ openSettings }) => openSettings("preferences"),
  });
  client.addCommandCenterItem({
    id: "preview",
    title: "JSON Render：打开界面预览",
    icon: "PanelsTopLeft",
    context: "workspace",
    onSelect: ({ openPanel }) => openPanel("playground"),
  });
  client.addCommandCenterItem({
    id: "settings",
    title: "JSON Render：设置",
    icon: "Settings2",
    context: "global",
    onSelect: ({ openSettings }) => openSettings("preferences"),
  });
  client.addCommandCenterItem({
    id: "demo",
    title: "JSON Render：显示示例表单",
    icon: "LayoutTemplate",
    context: "agent",
    onSelect: async ({ rpc, agent }) => {
      await rpc(showDemo, { agentId: agent.id });
    },
  });
  return () => {};
}
