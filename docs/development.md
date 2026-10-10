# Development

## Local setup

Development has been verified with Node.js 24 and npm 11. Use Paseo 0.11.2 or later for both the app and daemon, with plugins enabled on the target daemon.

```sh
git clone https://github.com/YPQuinn/paseo-json-render.git
cd paseo-json-render
npm ci
npm run typecheck
paseo plugin install "$PWD"
paseo plugin ls
```

The local installation uses this checkout. After changing source files:

```sh
npm run typecheck
paseo plugin reload paseo-json-render
paseo plugin ls
paseo plugin logs paseo-json-render
```

Require `running` with no load error. Reload the plugin rather than restarting the daemon, because a daemon restart can terminate active agents.

## Preview

```sh
npm run preview
```

The development server watches source changes and serves `http://127.0.0.1:4317`. It uses the same preview component as the Paseo workspace panel, with additional light and dark theme controls.

The preview supports form and dashboard samples, progressive output, invalid specifications, editable source text, and simulated send failures. Submitted values appear locally; no agent receives a message, and form history is not saved.

In Paseo, search for JSON Render in the Command Center and select the preview entry. The workspace panel follows the host theme and compact layout.

## Project structure

| Path                      | Responsibility                                                                               |
| ------------------------- | -------------------------------------------------------------------------------------------- |
| `index.client.tsx`        | Register timeline transformation, rendering, commands, workspace panel, and settings screen. |
| `index.server.ts`         | Register the creation hook, persistent settings, and demo RPC.                               |
| `shared/catalog.ts`       | Define the 16 components and generate the agent instructions.                                |
| `shared/spec.ts`          | Validate specifications, references, bindings, and submitted values.                         |
| `shared/stream.ts`        | Replay JSON patches and construct intermediate renderable specifications.                    |
| `shared/preferences.ts`   | Define preferences and saved form records.                                                   |
| `shared/rpc.ts`           | Define typed demo and timeline contracts.                                                    |
| `shared/demo.ts`          | Provide form and dashboard samples.                                                          |
| `client/message.ts`       | Separate Markdown and UI fences.                                                             |
| `client/message-view.tsx` | Render message segments and derive form identities.                                          |
| `client/timeline.tsx`     | Connect rendered messages to the selected Paseo host and agent.                              |
| `client/generated-ui.tsx` | Manage editable state, restoration, validation, submission, reset, and retry.                |
| `client/form-history.ts`  | Merge saved records and handle revision conflicts.                                           |
| `client/components.tsx`   | Map the catalog to themed React Native components.                                           |
| `client/markdown.tsx`     | Render accompanying Markdown with React Native.                                              |
| `client/settings.tsx`     | Expose preferences and record clearing.                                                      |
| `client/preview.tsx`      | Provide the workspace and development previews.                                              |
| `client/web.ts`           | Mount the browser-only development preview.                                                  |
| `scripts/preview.mjs`     | Bundle, watch, and serve the preview.                                                        |

## Runtime boundaries

Client and server entries are separate. Shared modules contain contracts and plain values, without Node.js or React Native runtime imports. Plugin UI uses React Native primitives, Paseo theme colors, and `layout.compact` for narrow screens. The browser entry is development-only and is never imported by a plugin runtime entry.

Paseo supplies host modules such as its plugin SDK, React, React Native, and Zod. Keep those dependencies in `devDependencies`. json-render and markdown-it are runtime dependencies.

## Git distribution

The manifest includes `build: [["npm", "ci", "--omit=dev"]]`. Git installations run this command to install the runtime dependencies pinned in `package-lock.json`. Paseo then compiles the TypeScript entries; no separate JavaScript release build is required.

Keep `OVERVIEW.md` next to `paseo-plugin.json`. It supplies the in-app plugin description and is required if the plugin is later submitted to the registry. GitHub publication alone does not create a registry listing.

`package.json` remains `private` because this project is distributed through Git. A future npm release needs separate preparation, including removing the Git-only dependency installation command from the published manifest. See the [Paseo publishing guide](https://paseo.sh/docs/plugins/publishing).

## Validation

Run `npm run typecheck` before reloading. Validate runtime preparation in a clean checkout so local development dependencies cannot hide missing runtime dependencies.

For behavior changes, exercise forms through the preview and a Paseo agent: required fields, reset, failed sends and retries, draft restoration, restored submission status, and submission after streaming completes. Check wide and compact layouts and both themes.

Previous integration validation covered these form behaviors using a virtual DOM and the daemon's real settings RPCs, plus progressive demo updates in a live timeline. iOS and Android still require physical-device verification.
