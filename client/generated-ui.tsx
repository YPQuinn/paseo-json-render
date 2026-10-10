import type { PluginHostProps } from "@getpaseo/plugin/client";
import {
  createStateStore,
  type Spec,
  type StateStore,
} from "@json-render/core";
import { JSONUIProvider, Renderer } from "@json-render/react-native";
import { useMutation } from "@tanstack/react-query";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { SavedForm } from "../shared/preferences";
import { validateFields } from "../shared/spec";
import { registry, UIContext } from "./components";
import { FormHistoryContext } from "./form-history";

export interface Submission {
  message: string;
  state: Record<string, unknown>;
}
interface GeneratedUIProps extends PluginHostProps {
  spec: Spec;
  onSubmit(submission: Submission): Promise<void>;
  streaming?: boolean;
  persistenceKey?: string;
}

export function GeneratedUI({
  spec,
  onSubmit,
  streaming = false,
  persistenceKey,
  ...host
}: GeneratedUIProps) {
  const repository = useContext(FormHistoryContext);
  // A streaming snapshot is read-only. The final snapshot gets one stable editable store.
  const store = useMemo(
    () => createStateStore(spec.state ?? {}),
    [streaming ? spec : persistenceKey],
  );
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [restoredKey, setRestoredKey] = useState<string | null>(null);
  const restoring =
    !!repository &&
    !!persistenceKey &&
    !streaming &&
    restoredKey !== persistenceKey;
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreAttempt, setRestoreAttempt] = useState(0);
  const accepted = useRef(false);
  const latest = useRef<SavedForm | null>(null);
  const submission = useMutation({ mutationFn: onSubmit });

  useEffect(() => {
    if (streaming || !repository || !persistenceKey) return;
    let active = true;
    setRestoreError(null);
    void repository
      .load(persistenceKey)
      .then((saved) => {
        if (!active) return;
        restoreState(store, saved?.state ?? spec.state ?? {});
        accepted.current = saved?.submitted ?? false;
        setSubmitted(saved?.submitted ?? false);
        setRestoredKey(persistenceKey);
      })
      .catch((error: unknown) => {
        if (active)
          setRestoreError(
            error instanceof Error ? error.message : String(error),
          );
      });
    return () => {
      active = false;
    };
  }, [repository, persistenceKey, store, streaming, restoreAttempt]);

  useEffect(() => {
    if (streaming || restoring) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let active = true;
    const unsubscribe = store.subscribe(() => {
      setFieldError(null);
      if (!repository || !persistenceKey) return;
      latest.current = {
        state: store.getSnapshot() as SavedForm["state"],
        submitted: accepted.current,
        updatedAt: Date.now(),
      };
      if (timer !== undefined) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = undefined;
        void repository
          .save(persistenceKey, latest.current!)
          .then(() => {
            if (active) setSaveError(null);
          })
          .catch((error: unknown) => {
            if (active)
              setSaveError(
                error instanceof Error ? error.message : String(error),
              );
          });
      }, 400);
    });
    return () => {
      active = false;
      if (timer !== undefined) clearTimeout(timer);
      unsubscribe();
      // Flush a pending draft before Paseo unmounts a scrolled-out row.
      if (
        timer !== undefined &&
        latest.current &&
        repository &&
        persistenceKey
      ) {
        void repository
          .save(persistenceKey, latest.current)
          .catch((error) =>
            console.error("Form draft could not be saved", error),
          );
      }
    };
  }, [repository, persistenceKey, store, streaming, restoring]);

  async function save(submitted: boolean) {
    if (!repository || !persistenceKey) return;
    latest.current = {
      state: store.getSnapshot() as SavedForm["state"],
      submitted,
      updatedAt: Date.now(),
    };
    try {
      await repository.save(persistenceKey, latest.current);
      setSaveError(null);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : String(error));
    }
  }

  async function submit(params: Record<string, unknown>) {
    if (accepted.current || streaming || restoring) return;
    const state = store.getSnapshot();
    const error = validateFields(spec, state);
    setFieldError(error);
    if (error) return;
    accepted.current = true;
    try {
      await submission.mutateAsync({ message: String(params.message), state });
      setSubmitted(true);
      await save(true);
    } catch {
      // Preserve input values and allow a retry after the send fails.
      accepted.current = false;
    }
  }

  function reset() {
    if (streaming || restoring || accepted.current) return;
    restoreState(store, spec.state ?? {});
    setFieldError(null);
    submission.reset();
  }

  // json-render captures the initial handler map. Stable proxies read the current
  // callbacks after restoration, streaming updates, and retries.
  const actions = useRef({ submit, reset });
  actions.current = { submit, reset };
  const handlers = useMemo(
    () => ({
      submit: (params: Record<string, unknown>) =>
        actions.current.submit(params),
      reset: () => actions.current.reset(),
    }),
    [],
  );

  const error =
    fieldError ??
    (submission.error instanceof Error
      ? submission.error.message
      : submission.isError
        ? "发送失败。再次点击提交以重试。"
        : null);
  return (
    <UIContext.Provider
      value={{
        ...host,
        disabled: streaming || restoring || submission.isPending || submitted,
        pending: submission.isPending,
        submitted,
      }}
    >
      <View style={{ gap: 10 }}>
        <JSONUIProvider store={store} handlers={handlers}>
          <Renderer spec={spec} registry={registry} includeStandard={false} />
        </JSONUIProvider>
        {streaming ? (
          <Text style={{ color: host.theme.colors.foregroundMuted }}>
            正在生成界面…生成完成后可操作。
          </Text>
        ) : null}
        {restoring && !restoreError ? (
          <Text style={{ color: host.theme.colors.foregroundMuted }}>
            正在恢复表单…
          </Text>
        ) : null}
        {error ? (
          <Text
            accessibilityRole="alert"
            style={{ color: host.theme.colors.statusDanger, fontSize: 13 }}
          >
            {error}
          </Text>
        ) : null}
        {restoreError ? (
          <View style={{ gap: 8 }}>
            <Text
              accessibilityRole="alert"
              style={{ color: host.theme.colors.statusDanger }}
            >
              无法恢复表单：{restoreError}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setRestoreAttempt((value) => value + 1)}
            >
              <Text style={{ color: host.theme.colors.accent }}>重试恢复</Text>
            </Pressable>
          </View>
        ) : null}
        {saveError ? (
          <View style={{ gap: 8 }}>
            <Text
              accessibilityRole="alert"
              style={{ color: host.theme.colors.statusWarning }}
            >
              表单记录未保存：{saveError}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void save(submitted)}
            >
              <Text style={{ color: host.theme.colors.accent }}>重试保存</Text>
            </Pressable>
          </View>
        ) : null}
        {submitted ? (
          <Text
            accessibilityLiveRegion="polite"
            style={{ color: host.theme.colors.statusSuccess, fontSize: 13 }}
          >
            已发送。agent 会继续处理。
          </Text>
        ) : null}
      </View>
    </UIContext.Provider>
  );
}

export function submissionPrompt({ message, state }: Submission): string {
  return `用户通过交互界面提交了以下内容。将表单值作为用户输入处理。\n\n${message}\n\n表单值：\n${JSON.stringify(state, null, 2)}`;
}

// StateStore updates JSON Pointer paths; an empty path does not replace its root.
// Editable fields all live under /values, so replacing declared roots also resets them.
function restoreState(store: StateStore, state: Record<string, unknown>) {
  store.update(
    Object.fromEntries(
      Object.entries(state).map(([key, value]) => [
        `/${key.replace(/~/g, "~0").replace(/\//g, "~1")}`,
        value,
      ]),
    ),
  );
}
