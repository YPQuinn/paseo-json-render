import type { PluginServerContext } from "@getpaseo/plugin/server";
import { uiInstructions } from "./shared/catalog";
import { dashboardSpec, demoSpec } from "./shared/demo";
import { showDemo, timelineKind } from "./shared/rpc";
import { formHistory, preferences } from "./shared/preferences";
import { specToStream } from "./shared/stream";

export default function contribute(server: PluginServerContext) {
  const settings = server.registerSettings(preferences);
  let demoNumber = 0;
  let active = true;
  const pauses = new Map<ReturnType<typeof setTimeout>, () => void>();
  function pause() {
    return new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        pauses.delete(timer);
        resolve();
      }, 80);
      pauses.set(timer, resolve);
    });
  }
  server.registerSettings(formHistory);
  server.before("agent.create", async ({ request }) => {
    const current = await settings.read();
    if (current.status !== "ready" || !current.values.autoPrompt) return;
    const previous = request.config.systemPrompt ?? "";
    if (previous.includes("[paseo-json-render]")) return;
    return {
      ...request,
      config: {
        ...request.config,
        systemPrompt: [previous, uiInstructions].filter(Boolean).join("\n\n"),
      },
    };
  });
  server.handle(showDemo, async ({ agentId, example }, { paseo }) => {
    const sourceId = `ui-demo-${Date.now()}-${++demoNumber}`;
    const timeline = paseo.agents.ref(agentId).timeline;
    const text =
      example === "stream"
        ? "```paseo-ui-stream\n" + specToStream(demoSpec) + "\n```"
        : "```paseo-ui\n" +
          JSON.stringify(example === "dashboard" ? dashboardSpec : demoSpec) +
          "\n```";
    if (example === "stream") {
      let partial = "```paseo-ui-stream\n";
      for (const line of specToStream(demoSpec).split("\n")) {
        if (!active) return {};
        partial += line + "\n";
        await timeline.append({
          type: "plugin",
          id: sourceId,
          kind: timelineKind,
          version: 1,
          data: { text: partial, phase: "streaming", sourceId },
        });
        await pause();
      }
      if (!active) return {};
    }
    await timeline.append({
      type: "plugin",
      id: sourceId,
      kind: timelineKind,
      version: 1,
      data: {
        text,
        phase: "complete",
        sourceId,
      },
    });
    return {};
  });
  return () => {
    active = false;
    for (const [timer, resolve] of pauses) {
      clearTimeout(timer);
      resolve();
    }
    pauses.clear();
  };
}
