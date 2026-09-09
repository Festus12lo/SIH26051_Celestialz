# Data Slot And Submit Event Contract

`slots` and `events` are sibling top-level fields of `Widget.update` — never `slots.events`.
Use `slots.main` only for Automation artifact delivery; use `events.submit` for Widget input sent
to the active Automation Binding.

```json
{
  "action": "update",
  "widgetId": "widget_generated",
  "slots": {
    "main": {
      "kind": "json",
      "schema": {
        "type": "object",
        "properties": { "summary": { "type": "string" } },
        "required": ["summary"]
      }
    }
  },
  "events": {
    "submit": {
      "schema": {
        "type": "object",
        "properties": { "query": { "type": "string" } },
        "required": ["query"]
      }
    }
  }
}
```

- Slot and event schemas must describe JSON objects.
- Choose schemas before writing the dynamic UI so sample data and live data share one render path.
- The Automation artifact schema must be compatible with `slots.main.schema`.
- `events.submit.schema` must be compatible with the Automation input contract.

Widget submit input resolves in this order:

```text
event payload -> Widget currentInput -> Automation defaultInput
```
