import type { PluginHostProps } from "@getpaseo/plugin/client";
import { defineRegistry, useBoundProp } from "@json-render/react-native";
import { createContext, useContext } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { catalog } from "../shared/catalog";

interface UIContextValue extends PluginHostProps {
  disabled: boolean;
  pending: boolean;
  submitted: boolean;
}

export const UIContext = createContext<UIContextValue | null>(null);

function useUI() {
  const ui = useContext(UIContext);
  if (!ui) throw new Error("UIContext is missing.");
  return ui;
}

export const { registry } = defineRegistry(catalog, {
  components: {
    Card: ({ props, children }) => {
      const { theme, layout } = useUI();
      return (
        <View
          style={{
            backgroundColor: theme.colors.surface1,
            borderColor: theme.colors.border,
            borderWidth: 1,
            borderRadius: 14,
            padding: layout.compact ? 14 : 20,
            gap: 16,
          }}
        >
          {props.title ? (
            <Text
              accessibilityRole="header"
              style={{
                color: theme.colors.foreground,
                fontSize: 20,
                fontWeight: "600",
              }}
            >
              {props.title}
            </Text>
          ) : null}
          {props.description ? (
            <Text
              style={{
                color: theme.colors.foregroundMuted,
                fontSize: 14,
                lineHeight: 22,
              }}
            >
              {props.description}
            </Text>
          ) : null}
          {children}
        </View>
      );
    },
    Stack: ({ props, children }) => {
      const { layout } = useUI();
      const horizontal = props.direction === "horizontal" && !layout.compact;
      return (
        <View
          style={{
            flexDirection: horizontal ? "row" : "column",
            flexWrap: horizontal ? "wrap" : "nowrap",
            gap: 12,
          }}
        >
          {children}
        </View>
      );
    },
    Heading: ({ props }) => {
      const { theme } = useUI();
      return (
        <Text
          accessibilityRole="header"
          style={{
            color: theme.colors.foreground,
            fontSize: 17,
            fontWeight: "600",
          }}
        >
          {props.text}
        </Text>
      );
    },
    Text: ({ props }) => {
      const { theme } = useUI();
      return (
        <Text
          selectable
          style={{
            color: props.muted
              ? theme.colors.foregroundMuted
              : theme.colors.foreground,
            fontSize: 14,
            lineHeight: 22,
          }}
        >
          {props.text}
        </Text>
      );
    },
    Metric: ({ props }) => {
      const { theme, layout } = useUI();
      return (
        <View
          style={{
            flexGrow: 1,
            flexBasis: layout.compact ? undefined : 140,
            minWidth: 0,
            padding: 14,
            gap: 6,
            borderRadius: 10,
            backgroundColor: theme.colors.surface2,
          }}
        >
          <Text style={{ color: theme.colors.foregroundMuted, fontSize: 12 }}>
            {props.label}
          </Text>
          <Text
            style={{
              color: theme.colors.foreground,
              fontSize: 24,
              fontWeight: "600",
            }}
          >
            {props.value}
          </Text>
        </View>
      );
    },
    Input: ({ props, bindings }) => {
      const { theme, disabled } = useUI();
      const [value, setValue] = useBoundProp(props.value, bindings?.value);
      return (
        <View style={{ gap: 8 }}>
          <Text style={{ color: theme.colors.foreground, fontSize: 14 }}>
            {props.label}
            {props.required ? " *" : ""}
          </Text>
          <TextInput
            accessibilityLabel={props.label}
            value={typeof value === "string" ? value : ""}
            onChangeText={setValue}
            placeholder={props.placeholder}
            placeholderTextColor={theme.colors.foregroundMuted}
            editable={!disabled}
            multiline={props.multiline}
            maxLength={props.maxLength}
            style={{
              color: theme.colors.foreground,
              backgroundColor: theme.colors.surface0,
              borderColor: theme.colors.border,
              borderWidth: 1,
              borderRadius: 8,
              padding: 12,
              minHeight: props.multiline ? 88 : 44,
              textAlignVertical: "top",
              opacity: disabled ? 0.6 : 1,
            }}
          />
        </View>
      );
    },
    Select: ({ props, bindings }) => {
      const { theme, disabled } = useUI();
      const [value, setValue] = useBoundProp(props.value, bindings?.value);
      return (
        <View style={{ gap: 8 }}>
          <Text style={{ color: theme.colors.foreground, fontSize: 14 }}>
            {props.label}
            {props.required ? " *" : ""}
          </Text>
          <View
            accessibilityRole="radiogroup"
            style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
          >
            {props.options.map((option) => {
              const selected = value === option.value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityLabel={option.label}
                  aria-checked={selected}
                  accessibilityState={{ checked: selected, disabled }}
                  disabled={disabled}
                  onPress={() => setValue(option.value)}
                  style={{
                    minHeight: 44,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderWidth: 1,
                    borderRadius: 8,
                    borderColor: selected
                      ? theme.colors.accent
                      : theme.colors.border,
                    backgroundColor: selected
                      ? theme.colors.accent
                      : theme.colors.surface0,
                    opacity: disabled ? 0.6 : 1,
                  }}
                >
                  <Text
                    style={{
                      color: selected
                        ? theme.colors.accentForeground
                        : theme.colors.foreground,
                    }}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      );
    },
    Button: ({ props, emit }) => {
      const { theme, disabled, pending } = useUI();
      const secondary = props.variant === "secondary";
      return (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={props.label}
          accessibilityState={{ disabled, busy: pending }}
          disabled={disabled}
          onPress={() => emit("press")}
          style={{
            minHeight: 44,
            borderRadius: 8,
            padding: 12,
            backgroundColor: secondary
              ? theme.colors.surface2
              : theme.colors.accent,
            opacity: disabled ? 0.6 : 1,
          }}
        >
          <Text
            style={{
              color: secondary
                ? theme.colors.foreground
                : theme.colors.accentForeground,
              textAlign: "center",
              fontWeight: "600",
            }}
          >
            {pending && !secondary ? "发送中…" : props.label}
          </Text>
        </Pressable>
      );
    },
    Divider: () => {
      const { theme } = useUI();
      return (
        <View style={{ height: 1, backgroundColor: theme.colors.border }} />
      );
    },
    Toggle: ({ props, bindings }) => {
      const { theme, disabled } = useUI();
      const [value, setValue] = useBoundProp(props.value, bindings?.value);
      return (
        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel={props.label}
          aria-checked={value === true}
          accessibilityState={{ checked: value === true, disabled }}
          disabled={disabled}
          onPress={() => setValue(!value)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            minHeight: 44,
            opacity: disabled ? 0.6 : 1,
          }}
        >
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 5,
              borderWidth: 1,
              borderColor: value ? theme.colors.accent : theme.colors.border,
              backgroundColor: value
                ? theme.colors.accent
                : theme.colors.surface0,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: theme.colors.accentForeground }}>
              {value ? "✓" : ""}
            </Text>
          </View>
          <Text style={{ flex: 1, color: theme.colors.foreground }}>
            {props.label}
            {props.required ? " *" : ""}
          </Text>
        </Pressable>
      );
    },
    MultiSelect: ({ props, bindings }) => {
      const { theme, disabled } = useUI();
      const [value, setValue] = useBoundProp(props.value, bindings?.value);
      const selectedValues = Array.isArray(value) ? value : [];
      return (
        <View style={{ gap: 8 }}>
          <Text style={{ color: theme.colors.foreground }}>
            {props.label}
            {props.required ? " *" : ""}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {props.options.map((option) => {
              const selected = selectedValues.includes(option.value);
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="checkbox"
                  accessibilityLabel={option.label}
                  aria-checked={selected}
                  accessibilityState={{ checked: selected, disabled }}
                  disabled={disabled}
                  onPress={() =>
                    setValue(
                      selected
                        ? selectedValues.filter((item) => item !== option.value)
                        : [...selectedValues, option.value],
                    )
                  }
                  style={{
                    minHeight: 44,
                    padding: 12,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: selected
                      ? theme.colors.accent
                      : theme.colors.border,
                    backgroundColor: selected
                      ? theme.colors.accent
                      : theme.colors.surface0,
                    opacity: disabled ? 0.6 : 1,
                  }}
                >
                  <Text
                    style={{
                      color: selected
                        ? theme.colors.accentForeground
                        : theme.colors.foreground,
                    }}
                  >
                    {selected ? "✓ " : ""}
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      );
    },
    Badge: ({ props }) => {
      const { theme } = useUI();
      return (
        <View
          style={{
            alignSelf: "flex-start",
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 20,
            backgroundColor: theme.colors.surface2,
          }}
        >
          <Text
            style={{
              color: toneColor(theme, props.tone),
              fontSize: 12,
              fontWeight: "600",
            }}
          >
            {props.text}
          </Text>
        </View>
      );
    },
    Alert: ({ props }) => {
      const { theme } = useUI();
      return (
        <View
          style={{
            padding: 14,
            gap: 6,
            borderLeftWidth: 3,
            borderLeftColor: toneColor(theme, props.tone),
            backgroundColor: theme.colors.surface2,
            borderRadius: 8,
          }}
        >
          {props.title ? (
            <Text
              style={{ color: toneColor(theme, props.tone), fontWeight: "600" }}
            >
              {props.title}
            </Text>
          ) : null}
          <Text
            selectable
            style={{ color: theme.colors.foreground, lineHeight: 22 }}
          >
            {props.text}
          </Text>
        </View>
      );
    },
    List: ({ props }) => {
      const { theme } = useUI();
      return (
        <View style={{ gap: 12 }}>
          {props.items.map((item, index) => (
            <View key={index} style={{ flexDirection: "row", gap: 10 }}>
              <Text style={{ color: theme.colors.foregroundMuted }}>
                {props.ordered ? `${index + 1}.` : "•"}
              </Text>
              <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                <Text
                  selectable
                  style={{ color: theme.colors.foreground, lineHeight: 22 }}
                >
                  {item.title}
                </Text>
                {item.description ? (
                  <Text
                    selectable
                    style={{
                      color: theme.colors.foregroundMuted,
                      lineHeight: 22,
                    }}
                  >
                    {item.description}
                  </Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      );
    },
    Table: ({ props }) => {
      const { theme, layout } = useUI();
      if (layout.compact)
        return (
          <View style={{ gap: 12 }}>
            {props.rows.map((row, index) => (
              <View
                key={index}
                style={{
                  padding: 12,
                  gap: 8,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  borderRadius: 8,
                }}
              >
                {props.columns.map((column) => (
                  <View key={column.key} style={{ gap: 2 }}>
                    <Text
                      style={{
                        color: theme.colors.foregroundMuted,
                        fontSize: 12,
                      }}
                    >
                      {column.label}
                    </Text>
                    <Text selectable style={{ color: theme.colors.foreground }}>
                      {formatCell(row[column.key])}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        );
      return (
        <View
          style={{
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              backgroundColor: theme.colors.surface2,
            }}
          >
            {props.columns.map((column) => (
              <Text
                key={column.key}
                style={{
                  flex: 1,
                  minWidth: 0,
                  padding: 12,
                  color: theme.colors.foreground,
                  fontWeight: "600",
                }}
              >
                {column.label}
              </Text>
            ))}
          </View>
          {props.rows.map((row, index) => (
            <View
              key={index}
              style={{
                flexDirection: "row",
                borderTopWidth: 1,
                borderTopColor: theme.colors.border,
              }}
            >
              {props.columns.map((column) => (
                <Text
                  key={column.key}
                  selectable
                  style={{
                    flex: 1,
                    minWidth: 0,
                    padding: 12,
                    color: theme.colors.foreground,
                  }}
                >
                  {formatCell(row[column.key])}
                </Text>
              ))}
            </View>
          ))}
        </View>
      );
    },
    Progress: ({ props }) => {
      const { theme } = useUI();
      return (
        <View
          accessibilityRole="progressbar"
          accessibilityLabel={props.label}
          accessibilityValue={{ min: 0, max: 100, now: props.value }}
          style={{ gap: 8 }}
        >
          <Text style={{ color: theme.colors.foreground }}>
            {props.label} · {props.value}%
          </Text>
          <View
            style={{
              height: 8,
              backgroundColor: theme.colors.surface2,
              borderRadius: 4,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                width: `${props.value}%`,
                height: 8,
                backgroundColor: theme.colors.accent,
              }}
            />
          </View>
        </View>
      );
    },
  },
});

function toneColor(theme: PluginHostProps["theme"], tone?: string) {
  if (tone === "success") return theme.colors.statusSuccess;
  if (tone === "warning") return theme.colors.statusWarning;
  if (tone === "danger") return theme.colors.statusDanger;
  return theme.colors.foreground;
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "—";
  return String(value);
}
