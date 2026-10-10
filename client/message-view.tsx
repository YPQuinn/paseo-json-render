import type { PluginHostProps } from "@getpaseo/plugin/client";
import { useMemo } from "react";
import { Text, View } from "react-native";
import { GeneratedUI, type Submission } from "./generated-ui";
import { splitMessage } from "./message";
import { MarkdownText } from "./markdown";
import { formKey } from "./form-history";
import { isField } from "../shared/spec";

interface MessageViewProps extends PluginHostProps {
  text: string;
  phase: "streaming" | "complete";
  onSubmit(submission: Submission): Promise<void>;
  identity?: { agentId: string; sourceId: string };
}

export function MessageView({
  text,
  phase,
  onSubmit,
  identity,
  ...host
}: MessageViewProps) {
  const segments = useMemo(() => splitMessage(text, phase), [text, phase]);
  return (
    <View style={{ gap: 12 }}>
      {segments.map((segment) => {
        switch (segment.kind) {
          case "ui":
            return (
              <GeneratedUI
                key={segment.id}
                {...host}
                spec={segment.spec}
                streaming={segment.streaming}
                persistenceKey={
                  identity &&
                  Object.values(segment.spec.elements).some(
                    (element) =>
                      isField(element.type) || element.type === "Button",
                  )
                    ? formKey(
                        identity.agentId,
                        identity.sourceId,
                        segment.id,
                        segment.spec,
                      )
                    : undefined
                }
                onSubmit={onSubmit}
              />
            );
          case "loading":
            return (
              <Text
                key={segment.id}
                style={{
                  color: host.theme.colors.foregroundMuted,
                  padding: 14,
                }}
              >
                正在生成界面…
              </Text>
            );
          case "error":
            return (
              <View
                key={segment.id}
                style={{
                  gap: 8,
                  padding: 14,
                  borderRadius: 8,
                  backgroundColor: host.theme.colors.surface1,
                }}
              >
                <Text
                  accessibilityRole="alert"
                  style={{ color: host.theme.colors.statusDanger }}
                >
                  界面格式错误：{segment.error}
                </Text>
                <Text
                  selectable
                  style={{
                    color: host.theme.colors.foregroundMuted,
                    fontFamily: "monospace",
                    fontSize: 12,
                  }}
                >
                  {segment.source}
                </Text>
              </View>
            );
          case "text":
            return segment.text.trim() ? (
              <MarkdownText
                key={segment.id}
                theme={host.theme}
                text={segment.text}
              />
            ) : null;
        }
      })}
    </View>
  );
}
