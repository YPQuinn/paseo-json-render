import type { PluginTheme } from "@getpaseo/plugin";
import type {
  PluginHostProps,
  PluginWorkspacePanelProps,
} from "@getpaseo/plugin/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  View,
  TextInput,
  useWindowDimensions,
} from "react-native";
import { dashboardSpec, demoSpec } from "../shared/demo";
import { specToStream } from "../shared/stream";
import { MessageView } from "./message-view";
import type { Submission } from "./generated-ui";

const queryClient = new QueryClient();
const themes: Record<"light" | "dark", PluginTheme> = {
  light: {
    colors: {
      surface0: "#ffffff",
      surface1: "#f8fafc",
      surface2: "#eef2f6",
      border: "#d6dce5",
      foreground: "#172033",
      foregroundMuted: "#566276",
      accent: "#25634b",
      accentForeground: "#ffffff",
      statusSuccess: "#25634b",
      statusWarning: "#915d08",
      statusDanger: "#b42318",
    },
  },
  dark: {
    colors: {
      surface0: "#111827",
      surface1: "#1a2436",
      surface2: "#253247",
      border: "#3b4b63",
      foreground: "#f1f5f9",
      foregroundMuted: "#abb9cd",
      accent: "#82dab2",
      accentForeground: "#10291e",
      statusSuccess: "#82dab2",
      statusWarning: "#f4cd75",
      statusDanger: "#fda29b",
    },
  },
};

const examples: Record<string, string> = {
  表单:
    "## 下一步目标\n填写目标、选择范围，再提交给 agent。\n\n```paseo-ui\n" +
    JSON.stringify(demoSpec, null, 2) +
    "\n```\n\n**提交后**，agent 会继续处理你的目标。",
  仪表盘: "```paseo-ui\n" + JSON.stringify(dashboardSpec, null, 2) + "\n```",
  流式:
    "正在逐步构建表单。\n\n```paseo-ui-stream\n" +
    specToStream(demoSpec) +
    "\n```",
  格式错误:
    '说明文字。\n```paseo-ui\n{"root":"missing","elements":{}}\n```\n界面后的说明。',
};

function Playground(host: PluginHostProps) {
  const { theme, layout } = host;
  const [source, setSource] = useState(examples.表单);
  const [text, setText] = useState(examples.表单);
  const [streamTarget, setStreamTarget] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [fail, setFail] = useState(false);
  const [submitted, setSubmitted] = useState<Submission | null>(null);
  useEffect(() => {
    if (!streamTarget) return;
    let length = 0;
    const timer = setInterval(() => {
      length += 96;
      setText(streamTarget.slice(0, length));
      if (length >= streamTarget.length) {
        clearInterval(timer);
        setStreamTarget(null);
      }
    }, 80);
    return () => clearInterval(timer);
  }, [streamTarget]);

  function apply(next: string, stream = false) {
    setSource(next);
    setText(stream ? "" : next);
    setStreamTarget(stream ? next : null);
    setRevision((value) => value + 1);
    setSubmitted(null);
  }
  const buttonStyle = {
    padding: 12,
    borderRadius: 8,
    backgroundColor: theme.colors.surface2,
  };
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.surface0 }}
      contentContainerStyle={{ padding: layout.compact ? 16 : 24 }}
    >
      <View
        style={{ width: "100%", maxWidth: 900, alignSelf: "center", gap: 18 }}
      >
        <Text
          accessibilityRole="header"
          style={{
            fontSize: 24,
            fontWeight: "600",
            color: theme.colors.foreground,
          }}
        >
          JSON Render 预览
        </Text>
        <Text style={{ color: theme.colors.foregroundMuted }}>
          预览只显示提交值，不向 agent 发送消息。可修改源文本并检查渲染结果。
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {Object.keys(examples).map((name) => (
            <Pressable
              key={name}
              accessibilityRole="button"
              onPress={() => apply(examples[name], name === "流式")}
              style={buttonStyle}
            >
              <Text style={{ color: theme.colors.foreground }}>{name}</Text>
            </Pressable>
          ))}
          <Pressable
            accessibilityRole="switch"
            aria-checked={fail}
            accessibilityState={{ checked: fail }}
            onPress={() => setFail(!fail)}
            style={buttonStyle}
          >
            <Text style={{ color: theme.colors.foreground }}>
              模拟发送失败：{fail ? "启用" : "关闭"}
            </Text>
          </Pressable>
        </View>
        <TextInput
          accessibilityLabel="界面源文本"
          value={source}
          onChangeText={setSource}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
          style={{
            minHeight: 180,
            maxHeight: 320,
            padding: 12,
            color: theme.colors.foreground,
            backgroundColor: theme.colors.surface1,
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: 8,
            fontFamily: "monospace",
            fontSize: 12,
            textAlignVertical: "top",
          }}
        />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <Pressable
            accessibilityRole="button"
            onPress={() => apply(source)}
            style={buttonStyle}
          >
            <Text style={{ color: theme.colors.foreground }}>应用源文本</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => apply(source, true)}
            style={buttonStyle}
          >
            <Text style={{ color: theme.colors.foreground }}>模拟流式输出</Text>
          </Pressable>
        </View>
        <MessageView
          key={revision}
          {...host}
          text={text}
          phase={streamTarget ? "streaming" : "complete"}
          onSubmit={async (submission) => {
            await new Promise<void>((resolve) => setTimeout(resolve, 500));
            if (fail) throw new Error("模拟发送失败。关闭模拟后重新提交。");
            setSubmitted(submission);
          }}
        />
        {submitted ? (
          <View
            style={{
              padding: 16,
              borderRadius: 8,
              backgroundColor: theme.colors.surface2,
            }}
          >
            <Text selectable style={{ color: theme.colors.foreground }}>
              {JSON.stringify(submitted, null, 2)}
            </Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

export function UIPlayground({
  theme,
  host,
  layout,
}: PluginWorkspacePanelProps) {
  return <Playground theme={theme} host={host} layout={layout} />;
}

function DevelopmentPreview() {
  const [appearance, setAppearance] = useState<"light" | "dark">("light");
  const { width } = useWindowDimensions();
  const theme = themes[appearance];
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface0 }}>
      <Pressable
        accessibilityRole="button"
        onPress={() => setAppearance(appearance === "light" ? "dark" : "light")}
        style={{ padding: 12 }}
      >
        <Text style={{ color: theme.colors.foreground }}>切换主题</Text>
      </Pressable>
      <Playground
        theme={theme}
        host={{ id: "preview", label: "Preview" }}
        layout={{ compact: width < 600, platform: "web" }}
      />
    </View>
  );
}

export function PreviewApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <DevelopmentPreview />
    </QueryClientProvider>
  );
}
