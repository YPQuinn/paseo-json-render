import { uiSpecSchema } from "./spec";

export const demoSpec = uiSpecSchema.parse({
  root: "card",
  state: {
    values: { goal: "", priority: "normal", areas: ["ui"], confirmed: false },
  },
  elements: {
    card: {
      type: "Card",
      props: {
        title: "下一步计划",
        description:
          "填写目标并选择优先级。提交后，agent 会根据你的选择继续工作。",
      },
      children: [
        "metrics",
        "divider",
        "goal",
        "priority",
        "areas",
        "confirmed",
        "actions",
      ],
    },
    metrics: {
      type: "Stack",
      props: { direction: "horizontal" },
      children: ["components", "platforms"],
    },
    components: {
      type: "Metric",
      props: { label: "界面组件", value: "16" },
      children: [],
    },
    platforms: {
      type: "Metric",
      props: { label: "渲染方式", value: "React Native" },
      children: [],
    },
    divider: { type: "Divider", props: {}, children: [] },
    goal: {
      type: "Input",
      props: {
        label: "目标",
        value: { $bindState: "/values/goal" },
        placeholder: "输入下一步要完成的目标",
        required: true,
        multiline: true,
      },
      children: [],
    },
    priority: {
      type: "Select",
      props: {
        label: "优先级",
        value: { $bindState: "/values/priority" },
        options: [
          { label: "普通", value: "normal" },
          { label: "优先", value: "high" },
        ],
      },
      children: [],
    },
    submit: {
      type: "Button",
      props: { label: "提交给 agent" },
      on: {
        press: {
          action: "submit",
          params: { message: "根据以下目标和优先级，给出下一步计划。" },
        },
      },
      children: [],
    },
    areas: {
      type: "MultiSelect",
      props: {
        label: "工作范围",
        value: { $bindState: "/values/areas" },
        required: true,
        options: [
          { label: "界面", value: "ui" },
          { label: "服务端", value: "server" },
          { label: "文档", value: "docs" },
        ],
      },
      children: [],
    },
    confirmed: {
      type: "Toggle",
      props: {
        label: "确认按以上目标继续",
        value: { $bindState: "/values/confirmed" },
        required: true,
      },
      children: [],
    },
    actions: { type: "Stack", props: {}, children: ["submit", "reset"] },
    reset: {
      type: "Button",
      props: { label: "重置", variant: "secondary" },
      on: { press: { action: "reset", params: {} } },
      children: [],
    },
  },
});

export const dashboardSpec = uiSpecSchema.parse({
  root: "dashboard",
  elements: {
    dashboard: {
      type: "Card",
      props: {
        title: "插件开发进度",
        description: "使用结构化界面展示状态、比较和后续步骤。",
      },
      children: ["status", "progress", "table", "steps", "notice"],
    },
    status: {
      type: "Badge",
      props: { text: "可以使用", tone: "success" },
      children: [],
    },
    progress: {
      type: "Progress",
      props: { label: "示例完成度", value: 100 },
      children: [],
    },
    table: {
      type: "Table",
      props: {
        columns: [
          { key: "feature", label: "功能" },
          { key: "behavior", label: "行为" },
        ],
        rows: [
          { feature: "流式渲染", behavior: "逐步显示完整元素" },
          { feature: "表单恢复", behavior: "从 daemon 读取保存记录" },
          { feature: "主题适配", behavior: "跟随 Paseo 主题" },
        ],
      },
      children: [],
    },
    steps: {
      type: "List",
      props: {
        ordered: true,
        items: [
          { title: "描述任务", description: "使用 /ui 发送任务。" },
          { title: "填写界面", description: "界面生成完成后即可操作。" },
          { title: "继续工作", description: "提交值会发送给当前 agent。" },
        ],
      },
      children: [],
    },
    notice: {
      type: "Alert",
      props: {
        title: "数据流向",
        text: "表单记录保存在当前 daemon，提交内容发送给当前 agent。",
        tone: "neutral",
      },
      children: [],
    },
  },
});
