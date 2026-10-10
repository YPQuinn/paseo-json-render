# UI protocol

The plugin recognizes two fenced code block labels: `paseo-ui` for a complete specification and `paseo-ui-stream` for progressive JSON patches. Keep explanatory Markdown outside the fences. A message can contain multiple independent interfaces.

## Complete specifications

The following example collects a goal and sends it back to the agent:

```paseo-ui
{
  "root": "form",
  "state": { "values": { "goal": "" } },
  "elements": {
    "form": {
      "type": "Card",
      "props": { "title": "Your next goal" },
      "children": ["goal", "submit"]
    },
    "goal": {
      "type": "Input",
      "props": {
        "label": "Goal",
        "required": true,
        "value": { "$bindState": "/values/goal" }
      },
      "children": []
    },
    "submit": {
      "type": "Button",
      "props": { "label": "Create a plan" },
      "on": {
        "press": {
          "action": "submit",
          "params": { "message": "Create a plan using the submitted goal." }
        }
      },
      "children": []
    }
  }
}
```

`root` names an element in `elements`. Every element has a `type`, a `props` object, and a `children` array. Only `Card` and `Stack` accept children; leaf elements use `[]`. All references must exist, and cycles are invalid. Specifications must be self-contained.

## Components

| Component     | Required properties                   | Optional properties                                              |
| ------------- | ------------------------------------- | ---------------------------------------------------------------- |
| `Card`        | None                                  | `title`, `description`                                           |
| `Stack`       | None                                  | `direction`: `vertical` or `horizontal`                          |
| `Heading`     | `text`                                | None                                                             |
| `Text`        | `text`                                | `muted`                                                          |
| `Metric`      | `label`, `value` (strings)            | None                                                             |
| `Input`       | `label`, `value` (binding)            | `placeholder`, `required`, `multiline`, `minLength`, `maxLength` |
| `Select`      | `label`, `value` (binding), `options` | `required`                                                       |
| `MultiSelect` | `label`, `value` (binding), `options` | `required`                                                       |
| `Toggle`      | `label`, `value` (binding)            | `required`                                                       |
| `Button`      | `label`, `on.press` action            | `variant`: `primary` or `secondary`                              |
| `Divider`     | Empty `props` object                  | None                                                             |
| `Badge`       | `text`                                | `tone`                                                           |
| `Alert`       | `text`                                | `title`, `tone`                                                  |
| `List`        | `items`                               | `ordered`                                                        |
| `Table`       | `columns`, `rows`                     | None                                                             |
| `Progress`    | `label`, `value` (0–100)              | None                                                             |

`on.press` belongs on the element, outside `props`. `tone` accepts `neutral`, `success`, `warning`, or `danger`.

Choice fields require a nonempty options array with unique values:

```json
[
  { "label": "Normal", "value": "normal" },
  { "label": "High", "value": "high" }
]
```

`List.items` contains objects with a required `title` and optional `description`.

`Table.columns` contains one or more `{ "key": "field", "label": "Column title" }` objects. Each row is an object indexed by those keys. Cells accept strings, numbers, booleans, or `null`. Compact layouts display rows as labeled records; horizontal stacks also become vertical.

## Field bindings and validation

Editable fields must bind `value` to a single field under `state.values`:

```json
{ "value": { "$bindState": "/values/goal" } }
```

Use JSON Pointer escaping (`~0` for `~`, `~1` for `/`) when needed in a field name. Nested field paths are unsupported. Initialize every bound field in `state.values` with the expected type:

| Field         | Initial value type | Meaning of `required: true`            |
| ------------- | ------------------ | -------------------------------------- |
| `Input`       | String             | Nonempty after trimming whitespace.    |
| `Select`      | String             | A valid option is selected.            |
| `MultiSelect` | String array       | At least one valid option is selected. |
| `Toggle`      | Boolean            | The checkbox is checked.               |

Option values are also checked for optional choice fields. `Input.minLength` is a nonnegative integer, `maxLength` is a positive integer, and the minimum must not exceed the maximum. Text length checks use the entered string's length.

Display components use literal properties. Bindings are supported for editable fields, not for computed display values.

## Actions

Only `Button` elements accept actions. Submit sends the action message and the complete current state to the current agent:

```json
{
  "press": {
    "action": "submit",
    "params": { "message": "Continue the task using these form values." }
  }
}
```

Each submit button can carry a different message. Reset restores the initial state and sends nothing:

```json
{ "press": { "action": "reset", "params": {} } }
```

Use `variant: "secondary"` for a reset button. Actions do not execute arbitrary code.

## Progressive specifications

Use one JSON patch per line in a `paseo-ui-stream` fence. Supported operations are `add`, `replace`, and `remove`, with paths under `/root`, `/elements`, or `/state`.

```paseo-ui-stream
{"op":"add","path":"/state","value":{"values":{}}}
{"op":"add","path":"/root","value":"card"}
{"op":"add","path":"/elements/card","value":{"type":"Card","props":{"title":"Task status"},"children":["status"]}}
{"op":"add","path":"/elements/status","value":{"type":"Text","props":{"text":"Working."},"children":[]}}
{"op":"replace","path":"/elements/status/props/text","value":"Complete."}
```

Start with state and root, then add complete elements. End the fence after the final patch. Do not put multiple patches on one line.

The plugin applies complete lines and renders reachable elements that have arrived. Missing children are temporarily omitted. Until a valid root is available, it shows a generation indicator. When the fence closes, the entire specification must validate, including references that were previously omitted.

Invalid patches or final specifications show an error and the source text. Fetched history is reconstructed by replaying the patches. Complete `paseo-ui` JSON can render as soon as it parses, but both protocols remain read-only until the agent finishes its message.

UI protocol examples inside an ordinary Markdown code fence remain code; nested fences do not create live forms. HTML, JavaScript, unlisted actions, conditional visibility expressions, and repeat directives are unsupported.

## Implementation references

- [Component catalog and agent instructions](../shared/catalog.ts)
- [Specification and field validation](../shared/spec.ts)
- [Stream replay](../shared/stream.ts)
- [Markdown fence parsing](../client/message.ts)
