import type { PluginTimelineItemProps } from "@getpaseo/plugin/client";
import { usePaseo, useSettings } from "@getpaseo/plugin/client";
import { useContext } from "react";
import { Pressable, Text, View } from "react-native";
import type { z } from "zod";
import { timelineDataSchema } from "../shared/rpc";
import { submissionPrompt } from "./generated-ui";
import { MessageView } from "./message-view";
import { preferences } from "../shared/preferences";
import { FormHistoryContext } from "./form-history";

export function GeneratedMessage({
  item,
  agentId,
  timestamp,
  ...host
}: PluginTimelineItemProps<z.output<typeof timelineDataSchema>>) {
  const paseo = usePaseo();
  const settings = useSettings(preferences);
  const repository = useContext(FormHistoryContext);
  if (settings.status !== "ready")
    return (
      <View style={{ gap: 8 }}>
        <Text style={{ color: host.theme.colors.foregroundMuted }}>
          {settings.status === "loading" ? "正在读取界面设置…" : settings.error}
        </Text>
        {settings.status !== "loading" ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => void settings.reload()}
          >
            <Text style={{ color: host.theme.colors.accent }}>重试</Text>
          </Pressable>
        ) : null}
      </View>
    );
  return (
    <FormHistoryContext.Provider
      value={settings.values.rememberForms ? repository : null}
    >
      <MessageView
        {...host}
        text={item.data.text}
        phase={item.data.phase}
        identity={{
          agentId,
          sourceId: item.data.sourceId ?? timestamp.toISOString(),
        }}
        onSubmit={(submission) =>
          paseo.agents.ref(agentId).send(submissionPrompt(submission))
        }
      />
    </FormHistoryContext.Provider>
  );
}
