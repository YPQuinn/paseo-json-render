import { useSettings, type PluginSurfaceProps } from "@getpaseo/plugin/client";
import {
  SettingsAction,
  SettingsCard,
  SettingsSection,
  SettingsSwitch,
} from "@getpaseo/plugin/client/ui";
import { useMutation } from "@tanstack/react-query";
import { useContext } from "react";
import { Text, View } from "react-native";
import { preferences } from "../shared/preferences";
import { FormHistoryContext } from "./form-history";

export function UISettings({ theme }: PluginSurfaceProps) {
  const settings = useSettings(preferences);
  const repository = useContext(FormHistoryContext);
  const clearing = useMutation({
    mutationFn: async () => {
      await repository?.clear();
    },
  });
  if (settings.status !== "ready")
    return (
      <View style={{ gap: 12 }}>
        <Text style={{ color: theme.colors.foregroundMuted }}>
          {settings.status === "loading" ? "正在读取设置…" : settings.error}
        </Text>
        {settings.status !== "loading" ? (
          <SettingsAction
            label="重新读取设置"
            actionLabel="重试"
            onPress={() => void settings.reload()}
          />
        ) : null}
      </View>
    );
  return (
    <View style={{ gap: 24 }}>
      <SettingsSection title="界面输出">
        <SettingsCard>
          <SettingsSwitch
            label="新建 agent 自动启用界面输出"
            hint="关闭后仍可使用 /ui。已创建的 agent 保留原有提示词。"
            value={settings.values.autoPrompt}
            disabled={settings.saving}
            onValueChange={(autoPrompt) =>
              void settings.save(
                { ...settings.values, autoPrompt },
                settings.revision,
              )
            }
          />
          <SettingsSwitch
            label="保存表单记录"
            hint="编辑值和提交状态保存在当前 daemon。最多保留最近 200 份表单。"
            value={settings.values.rememberForms}
            disabled={settings.saving}
            onValueChange={(rememberForms) =>
              void settings.save(
                { ...settings.values, rememberForms },
                settings.revision,
              )
            }
          />
        </SettingsCard>
      </SettingsSection>
      {settings.saveError ? (
        <Text
          accessibilityRole="alert"
          style={{ color: theme.colors.statusDanger }}
        >
          {settings.saveError}
        </Text>
      ) : null}
      <SettingsSection title="表单记录">
        <SettingsCard>
          <SettingsAction
            label="清除保存的表单记录"
            hint="已显示的界面保留当前状态。下次加载历史表单时使用初始值，可再次提交。"
            actionLabel="清除"
            disabled={clearing.isPending}
            onPress={() => clearing.mutate()}
          />
        </SettingsCard>
      </SettingsSection>
      {clearing.isSuccess ? (
        <Text style={{ color: theme.colors.statusSuccess }}>
          已清除保存的表单记录。
        </Text>
      ) : null}
      {clearing.error ? (
        <Text
          accessibilityRole="alert"
          style={{ color: theme.colors.statusDanger }}
        >
          {clearing.error instanceof Error
            ? clearing.error.message
            : "清除失败。"}
        </Text>
      ) : null}
      <Text style={{ color: theme.colors.foregroundMuted, lineHeight: 22 }}>
        表单记录是 daemon 上的普通 JSON 数据。提交内容发送给当前 agent，并使用该
        agent 的提供商和账号。关闭保存不会删除已有记录。
      </Text>
    </View>
  );
}
