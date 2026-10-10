import type { PluginHostProps } from "@getpaseo/plugin/client";
import MarkdownIt from "markdown-it";
import type Token from "markdown-it/lib/token.mjs";
import { useMemo, useState, type ReactNode } from "react";
import { Linking, Text, View } from "react-native";

const markdown = new MarkdownIt({ html: false, linkify: true });
interface Node {
  token: Token;
  children: Node[];
}

function tokenTree(tokens: Token[]): Node[] {
  const root: Node[] = [];
  const stack = [root];
  for (const token of tokens) {
    if (token.nesting === -1) {
      stack.pop();
      continue;
    }
    const node = { token, children: [] as Node[] };
    stack[stack.length - 1].push(node);
    if (token.nesting === 1) stack.push(node.children);
  }
  return root;
}

export function MarkdownText({
  text,
  theme,
}: Pick<PluginHostProps, "theme"> & { text: string }) {
  const nodes = useMemo(() => tokenTree(markdown.parse(text, {})), [text]);
  const [linkError, setLinkError] = useState<string | null>(null);
  const color = theme.colors.foreground;

  function inline(nodes: Node[]): ReactNode[] {
    return nodes.map(({ token, children }, index) => {
      if (token.type === "text") return token.content;
      if (token.type === "softbreak" || token.type === "hardbreak") return "\n";
      if (token.type === "image") return token.content;
      if (token.type === "code_inline")
        return (
          <Text
            key={index}
            style={{
              color,
              fontFamily: "monospace",
              backgroundColor: theme.colors.surface2,
            }}
          >
            {token.content}
          </Text>
        );
      if (token.type === "link_open") {
        const href = token.attrGet("href") ?? "";
        const allowed = /^(https?:\/\/|mailto:)/i.test(href);
        return (
          <Text
            key={index}
            accessibilityRole={allowed ? "link" : undefined}
            onPress={
              allowed
                ? () => {
                    void Linking.openURL(href).catch(() =>
                      setLinkError("无法打开链接。"),
                    );
                  }
                : undefined
            }
            style={{ color: allowed ? theme.colors.accent : color }}
          >
            {inline(children)}
          </Text>
        );
      }
      return (
        <Text
          key={index}
          style={{
            color,
            fontWeight: token.type === "strong_open" ? "700" : undefined,
            fontStyle: token.type === "em_open" ? "italic" : undefined,
            textDecorationLine:
              token.type === "s_open" ? "line-through" : undefined,
          }}
        >
          {inline(children)}
        </Text>
      );
    });
  }

  function blocks(nodes: Node[]): ReactNode[] {
    return nodes.map(({ token, children }, index) => {
      if (token.type === "inline")
        return (
          <Text
            key={index}
            selectable
            style={{ color, fontSize: 14, lineHeight: 22 }}
          >
            {inline(tokenTree(token.children ?? []))}
          </Text>
        );
      if (token.type === "paragraph_open")
        return <View key={index}>{blocks(children)}</View>;
      if (token.type === "heading_open") {
        const content = children[0]?.token.children ?? [];
        return (
          <Text
            key={index}
            selectable
            accessibilityRole="header"
            style={{
              color,
              fontWeight: "600",
              fontSize: token.tag === "h1" ? 24 : token.tag === "h2" ? 20 : 17,
              lineHeight: 28,
            }}
          >
            {inline(tokenTree(content))}
          </Text>
        );
      }
      if (
        token.type === "bullet_list_open" ||
        token.type === "ordered_list_open"
      ) {
        const start = Number(token.attrGet("start") ?? 1);
        return (
          <View key={index} style={{ gap: 8 }}>
            {children.map((child, itemIndex) => (
              <View key={itemIndex} style={{ flexDirection: "row", gap: 10 }}>
                <Text style={{ color, lineHeight: 22 }}>
                  {token.type === "ordered_list_open"
                    ? `${start + itemIndex}.`
                    : "•"}
                </Text>
                <View style={{ flex: 1, minWidth: 0, gap: 8 }}>
                  {blocks(child.children)}
                </View>
              </View>
            ))}
          </View>
        );
      }
      if (token.type === "blockquote_open")
        return (
          <View
            key={index}
            style={{
              paddingLeft: 12,
              borderLeftWidth: 3,
              borderLeftColor: theme.colors.border,
              gap: 8,
            }}
          >
            {blocks(children)}
          </View>
        );
      if (token.type === "fence" || token.type === "code_block")
        return (
          <Text
            key={index}
            selectable
            style={{
              color,
              fontFamily: "monospace",
              fontSize: 12,
              lineHeight: 20,
              padding: 12,
              borderRadius: 8,
              backgroundColor: theme.colors.surface2,
            }}
          >
            {token.content.trimEnd()}
          </Text>
        );
      if (token.type === "hr")
        return (
          <View
            key={index}
            style={{ height: 1, backgroundColor: theme.colors.border }}
          />
        );
      if (token.type === "tr_open")
        return (
          <View
            key={index}
            style={{
              flexDirection: "row",
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.border,
            }}
          >
            {children.map((cell, cellIndex) => (
              <View
                key={cellIndex}
                style={{ flex: 1, minWidth: 0, padding: 8 }}
              >
                {blocks(cell.children)}
              </View>
            ))}
          </View>
        );
      return (
        <View key={index} style={{ gap: 8 }}>
          {blocks(children)}
        </View>
      );
    });
  }

  return (
    <View style={{ gap: 12 }}>
      {blocks(nodes)}
      {linkError ? (
        <Text
          accessibilityRole="alert"
          style={{ color: theme.colors.statusDanger }}
        >
          {linkError}
        </Text>
      ) : null}
    </View>
  );
}
