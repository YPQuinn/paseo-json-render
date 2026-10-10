// Development-only entry. It is never imported by either plugin runtime entry.
import { Platform } from "react-native";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { PreviewApp } from "./preview";

declare const document: { getElementById(id: string): unknown };

if (Platform.OS === "web") {
  const container = document.getElementById("root");
  if (container)
    createRoot(container as Parameters<typeof createRoot>[0]).render(
      createElement(PreviewApp),
    );
}
