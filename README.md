# Paseo JSON Render

Interactive forms and dashboards inside [Paseo](https://paseo.sh) conversations, powered by Vercel's [json-render](https://github.com/vercel-labs/json-render).

Agents describe an interface as JSON. The plugin renders it using React Native, and sends submitted form values back to the same agent so it can continue the task.

[Install](#install) · [Usage](#usage) · [UI protocol](docs/ui-protocol.md) · [Development](docs/development.md)

## Features

- Render 16 components, including cards, tables, metrics, progress indicators, and form fields.
- Display interfaces progressively as JSON patches arrive.
- Validate required fields, option values, and text length before submission.
- Keep entered values after a failed send and allow a retry.
- Restore drafts and submission status from the Paseo daemon.
- Follow the host theme and adapt tables and horizontal layouts to narrow screens.
- Preview and edit UI specifications without sending messages to an agent.

## Install

Requirements:

- Paseo **0.11.2 or later**, for both the app and the daemon.
- Plugins enabled on the target daemon.
- Git, Node.js, and npm available on the daemon host.

```sh
paseo plugin add git:YPQuinn/paseo-json-render
paseo plugin ls
```

The plugin should report `running`. Paseo installs runtime dependencies from the committed lockfile and compiles the TypeScript entries.

On macOS, the desktop app bundles the CLI at `/Applications/Paseo.app/Contents/Resources/bin/paseo`. Use that path if `paseo` is not on your `PATH`. For a remote daemon, install on the daemon host.

> [!NOTE]
> Paseo plugins run as trusted code on the daemon and in the app. Review the source before enabling a plugin.

To fetch a newer revision:

```sh
paseo plugin update paseo-json-render
```

## Usage

Try a form without waiting for an agent to generate one:

```text
/ui-demo
```

For an existing agent, send the UI instructions together with a task:

```text
/ui Collect my goal and priority in a form, then use the submitted values to plan the next steps.
```

| Command                              | Purpose                                                                              |
| ------------------------------------ | ------------------------------------------------------------------------------------ |
| `/ui [task]`                         | Send the UI protocol and an optional task to the current agent.                      |
| `/ui-demo [form\|dashboard\|stream]` | Insert a sample form, dashboard, or progressively rendered form. Defaults to `form`. |
| `/ui-settings`                       | Open the plugin settings.                                                            |

`/ui` and `/ui-demo` require an existing agent. Settings are also available from a workspace. Search for **JSON Render** in the Command Center to open the preview, settings, or demo.

### When agents receive the UI instructions

Automatic prompting is enabled by default. The server's `agent.create` hook appends the component catalog and output protocol to the existing system prompt before creating a new agent. It skips prompts that already contain the plugin marker.

Loading or reloading the plugin registers the hook; it does not rewrite existing agents. The hook does not run on every turn or resume. For an existing agent, `/ui` sends the instructions as a user message. The agent decides when an interface is useful, and may still answer in Markdown.

### Form submissions

Forms become interactive after the agent finishes its output. A submit button sends its action message and the complete current form state to the same agent through the existing Paseo connection. A successful send disables that form. A failed send preserves the values and allows another attempt. A reset button restores the original values without sending a message.

Different submit buttons can carry different action messages, allowing the user to choose what the agent should do next.

### Settings and stored data

| Setting                   | Effect                                                                                                                              |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Automatic UI instructions | Append the protocol when creating an agent. Disabling this preserves existing agents' prompts; `/ui` remains available.             |
| Remember forms            | Read and save drafts and submission status on the current client. Disabling it does not delete stored records.                      |
| Clear saved forms         | Delete records for this plugin installation. Historical forms use their initial state when loaded again and can be submitted again. |

The daemon stores the most recent **200 forms** using Paseo's persistent settings. Authorized clients connected to the same daemon share these settings and records. Save or restore failures show a retry action; unsaved edits may be lost on reload.

Records are ordinary JSON data, not a credential vault. Submissions use the current agent's provider and account. The plugin does not connect to a separate model service.

## UI protocol

Agents emit either a complete JSON specification in a `paseo-ui` fence or one JSON patch per line in a `paseo-ui-stream` fence. Both formats can appear alongside explanatory Markdown.

The catalog includes `Card`, `Stack`, `Heading`, `Text`, `Metric`, `Input`, `Select`, `MultiSelect`, `Toggle`, `Button`, `Divider`, `Badge`, `Alert`, `List`, `Table`, and `Progress`.

See the [protocol reference](docs/ui-protocol.md) for complete examples, component properties, bindings, actions, and streaming behavior.

## Development

```sh
git clone https://github.com/YPQuinn/paseo-json-render.git
cd paseo-json-render
npm ci
npm run typecheck
npm run preview
```

Open `http://127.0.0.1:4317` for the development preview. It supports source editing, streaming simulation, theme switching, malformed specifications, and simulated send failures. It displays submissions locally without connecting to an agent or saving form history.

See the [development guide](docs/development.md) for local installation, reload commands, project structure, and release checks.

## Known limitations

- Only catalog components and `submit` / `reset` actions are supported. Arbitrary code, repeat directives, and conditional visibility expressions are unsupported.
- Built-in controls, settings, and demo labels are currently in Chinese. Agent-generated labels follow the user's language.
- Saved records do not update another client's already open form in real time. Concurrent submissions from multiple clients are not guaranteed to send only once.
- Providers without stable message IDs use message timestamps for restoration. Restoration depends on those timestamps remaining consistent.
- Demo rows disappear when the daemon restarts. UI blocks in agent history can still be rendered.
- The plugin's Markdown renderer displays image alternative text and does not provide host navigation for local file links.
- iOS and Android have not been verified on physical devices.
