# Condition Trigger

`trigger.kind: "condition"` polls a Python predicate on an interval and starts the configured
`execution` only when it returns true:

```json
{
  "automationId": "automation_generated",
  "description": "Runs the configured task when the Python condition returns true.",
  "trigger": {
    "kind": "condition",
    "every": "10m",
    "condition": {
      "kind": "code",
      "runtime": "python",
      "entryRef": {
        "kind": "path",
        "base": "automation",
        "path": "conditions/should_fire.py"
      }
    }
  }
}
```

The condition entry is a Python module under the Automation assets root. It must expose:

```py
def should_fire(ctx):
    return True
```

`ctx` contains `scheduledAt`, `triggeredAt`, `taskDir`, `runDir`, and `input`. `ctx["input"]` includes `automationId`, `scheduledAt`, `observedAt`, and `workspacePath`.

The condition is a predicate, not the business execution. Keep it fast and side-effect-free. It has a 30-second limit and must return a boolean. `False` creates no business run; `True` starts the configured `execution`. A condition error or invalid return is recorded as scheduler skip evidence. Default `every` to 10 minutes when the user has not specified a poll interval; the predicate is bounded and cheap, so condition polls are exempt from the background Agent cadence floor in `SKILL.md`.
