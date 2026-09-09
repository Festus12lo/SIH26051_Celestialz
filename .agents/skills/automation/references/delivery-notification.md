# Notification Delivery

Notification is an optional side effect for either a local-conversation Automation or a
Widget-bound artifact Automation; it never replaces Binding-based Widget delivery.

```json
"delivery": [
  {
    "kind": "notification",
    "title": "Workspace review finished",
    "desktop": true,
    "actionContext": { "action": "open_run" }
  }
]
```

- Notification delivery is attempted for ordinary terminal completion such as success, failure, and timeout.
- An explicit `AutomationControl` call with `action: "cancel"` records a durable `cancelled` run without notification delivery; do not wait for a notification row after cancellation.
- Omit static fields to use the Automation title, run-derived severity, and default `open_run` action.
- To turn notification off, omit `delivery` or pass `delivery: []`. This does not change execution or its stored result.
- Verify with a `deliveryResults` row of `kind: "notification"` and `status: "succeeded"`.
