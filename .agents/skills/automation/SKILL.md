---
name: automation
description: Use when creating, reading, updating, deleting, running, cancelling, scheduling, condition-triggering, or inspecting Daimon Blueprint Automations and their run records.
---

# Automation

Automation owns executable work: trigger, input contract, execution, result contract, files, delivery, runs, assets, and workspace.

Use exactly three tools:

- `AutomationCreate` creates an Automation; do not pass `action`.
- `AutomationUpdate` updates an Automation; do not pass `action`.
- `AutomationControl` handles every other operation and requires an explicit `action`.

References, read by need: `references/execution-agent.md` (background and local_conversation agent modes), `references/trigger-condition.md` (condition trigger), `references/delivery-notification.md` (notification delivery), `references/files.md` (file input and output).

## Commercial Limits

- Only enabled regular Automations count. Cron jobs and widget tasks use separate limits.
- Disabled tasks are kept and use no slot. Disable one before enabling another when a limit is full.
- On downgrade, the newest tasks by `createdAt` stay enabled. Older tasks are disabled, not deleted.
- A running task finishes after downgrade; disabling blocks future automatic runs.
- If a quota reminder says not to retry, report the limit and ask the user which task to disable.

## Confirm Quota Use

Before creating or materially updating either of the following, explain the quota impact and ask
the user whether to continue:

- An Agent Automation: say that running it **will consume credits**.
- A Python Automation whose code uses plugin-backed capabilities: say that running it **may consume
  credits**.

Wait for explicit confirmation before creating, writing code, installing dependencies, enabling,
or running it. The original request is not confirmation: ask, stop, and wait for a new user reply.
Combine overlapping cases into one confirmation request.

Keep the confirmation user-facing: describe only what the task does, when it runs, and its quota
impact. Do not mention implementation terms such as Agent, Automation, background,
Binding, artifact, or slots.

## Create Contract

`AutomationCreate` requires sibling top-level fields:

- `title`
- `description`: a concise, non-empty statement of purpose
- `trigger`
- `input`
- `execution`
- `result`

`delivery` is optional. Use it only for local notification delivery; omit it or pass `[]` when no notification is needed.

`input` is only the input contract:

- `{ kind: "none" }` — forbids `defaultInput`/`schema`
- `{ kind: "text", defaultInput? }` — `defaultInput` must be a string
- `{ kind: "json", schema, defaultInput? }` — `defaultInput` must be a JSON object

The schema enforces these per-kind types before the call runs; mismatches return `invalid_argument` with `error.path: "input.defaultInput"`.

Use `result.kind: "artifact"` for structured output and Widget delivery. The artifact must be a JSON object that matches `result.schema`.

Minimum Python artifact Automation:

```json
{
  "title": "Daily metric producer",
  "description": "Produces a daily metric artifact for downstream display.",
  "trigger": { "kind": "manual" },
  "input": {
    "kind": "json",
    "schema": { "type": "object", "properties": {}, "additionalProperties": false },
    "defaultInput": {}
  },
  "execution": {
    "kind": "code",
    "runtime": "python",
    "entryRef": { "kind": "path", "base": "automation", "path": "automation.py" }
  },
  "result": {
    "kind": "artifact",
    "schema": {
      "type": "object",
      "properties": { "summary": { "type": "string" } },
      "required": ["summary"],
      "additionalProperties": true
    }
  },
  "delivery": []
}
```

After create, write the Python program to the returned `codeEntry` path (present for code execution with a path `entryRef`). The returned `note` records the directory convention: `assets` and `workspace` are same-named subdirectories under the Automation root.

## Update Contract

Every `AutomationUpdate` call must include a top-level, non-empty `description`. Rewrite it to
accurately describe the resulting Automation after the requested changes; never leave stale
purpose or behavior in the description. `description` is a sibling of `trigger`, `input`,
`execution`, `result`, and `delivery`, not a nested field.

## Choose A Trigger

- When the user requests a recurring calendar task without specifying a time of day (for example, "run this daily"), prefer the current local hour and minute at creation time. Read the current clock, use the user's timezone when known (otherwise the runtime timezone), and tell the user which time and timezone were assumed.
- On demand: `{ "kind": "manual" }`
- Calendar schedule: `{ "kind": "schedule", "cron": "0 7 * * *", "timezone": "Asia/Shanghai" }`
- Fixed interval: `{ "kind": "interval", "every": "15m" }`
- One shot: `{ "kind": "once", "at": "2026-07-15T09:00:00+08:00" }`
- Poll a Python condition: use `kind: "condition"` with `every` and a Python condition entry. The condition is a predicate, not the business execution; the full contract lives in `references/trigger-condition.md`.

Background Agent cadence floor: do not proactively create a background Agent Automation that runs more often than once per hour from an interval trigger or a cron schedule. When the user has not specified a cadence, propose one hour or slower. Create a sub-hourly cycle only when the user explicitly asks for it; if you believe a shorter cycle is warranted, explain the quota and noise trade-off and confirm with the user before creating. A condition trigger is the exception: each poll runs a bounded Python predicate, and the Agent runs only when the predicate returns true, so default the poll to every 10 minutes when the user has not specified an interval.

Author automatic Python Automations in this order:

1. Create disabled with a manual trigger when possible.
2. Write and verify the Python execution entry.
3. For a condition trigger, write the Python condition entry under `assets/`: the directory holding create's `codeEntry`, or the sibling of `workspaceRoot` for agent executions — create always returns exactly one of the two handles.
4. Update the trigger to once, schedule, interval, or condition.
5. Read the Automation and confirm the stored trigger.
6. Enable it.

## Choose Python Or Agent

Choose by work type first and cadence second.

- Prefer `code` with Python for deterministic fetching, validation, calculation, normalization,
  threshold checks, or file generation from a known structured data source.
- For deterministic finance or market-data work scheduled more often than every six hours,
  strongly prefer Python. Use six hours only as a selection heuristic; let work type take
  precedence.
- Use an Agent when each run must discover sources, read unstructured content, reconcile evidence,
  summarize, explain, or make semantic judgments. Keep Agent execution for this work, subject to
  the background Agent cadence floor in "Choose A Trigger".
- Prefer `code` with Python for daily or weekly collection and, when practical, for daily or weekly
  briefs that require research or synthesis.
- Before choosing Python for unattended retrieval, confirm a supported data source, credentials,
  freshness or quote delay, provider quota, and rate limits. Follow the active data-source skill
  instead of copying provider-specific limits here.
- For market data, confirm the instrument, exchange, currency, adjustment basis, market session,
  exchange timezone, holiday behavior, and acceptable staleness. Include the source, data `asOf`,
  retrieval `fetchedAt`, and stale status in the artifact and its schema. Fail on unavailable or
  stale data unless the user explicitly permits a fallback.
- Align the trigger with the source's update cadence and relevant market hours. Keep expected run
  time below the trigger interval, bound retries, and omit per-run notifications for frequent
  polling unless the user explicitly requests them.

## Choose The Result Path

| Goal | Execution | Result | Contract |
|---|---|---|---|
| Deterministic transform or file-producing work | `code` (Python, below) | `artifact` | this file and `references/files.md` |
| Open-ended model work producing structured data for a Widget | `agent` `background` | `artifact` | `references/execution-agent.md` |
| Open-ended work whose result does not need Widget delivery | `agent` `local_conversation` | `conversation` | `references/execution-agent.md` |

For open-ended Agent work, default to `local_conversation` when the user does not need the result delivered to a Widget. Reserve `background` with `artifact` for results that feed a Widget through a Binding.

Widget delivery belongs to the Binding, not `delivery`: create compatible `Widget.slots.main`, then connect it with `Binding.create`. Notification is an independent optional side effect. Use `delivery: [{ "kind": "notification", ... }]` only when a completion push is needed; the full contract lives in `references/delivery-notification.md`.

## Python Runtime

The managed runner imports your module and calls `run(ctx)`; top-level script code is not the entrypoint. Define `run` with `ctx` as the only required parameter and return JSON-serializable data:

```py
def run(ctx):
    return {"artifact": {"summary": "ready"}}
```

`ctx` carries `taskId`/`runId`/`taskDir`/`runDir`, `scheduledAt`/`triggeredAt`, the run `input`, `resources.contextFile` and materialized `resources.files`, plus `locale`, `timezone`, `runtimeRoot`, and `allowedRoots`.

Runtime environment variables:

- `DAIMON_BLUEPRINT_AUTOMATION_ID`
- `DAIMON_BLUEPRINT_AUTOMATION_RUN_ID`
- `DAIMON_BLUEPRINT_AUTOMATION_RUN_DIRECTORY`
- `DAIMON_BLUEPRINT_AUTOMATION_WORKSPACE_PATH`
- `DAIMON_BLUEPRINT_AUTOMATION_OUTPUT_FILE`
- `DAIMON_BLUEPRINT_AUTOMATION_RESOURCES_CONTEXT_FILE`

The return value must emit one wrapper JSON object: `{"artifact": ...}` with optional `"files"`. The object inside `artifact` must match `result.schema`. Do not return raw artifact fields as the wrapper.

For large or file-backed output, write the same wrapper JSON to `DAIMON_BLUEPRINT_AUTOMATION_OUTPUT_FILE`; when present it takes precedence over the return value. Generated-file descriptors and input `FileResourceRef` handling live in `references/files.md`.

## Run And Verify

Run with stored default input:

```json
{ "action": "run", "automationId": "automation_generated" }
```

Run with one-off input:

```json
{
  "action": "run",
  "automationId": "automation_generated",
  "runInput": { "topic": "AI infrastructure", "limit": 5 }
}
```

Verification:

- A run succeeds only when `AutomationControl` with `action: "run"` or `action: "readRun"` reaches terminal `status: "succeeded"`.
- `failed`, `timeout`, `cancelled`, and `skipped` are terminal non-success states.
- A run that finishes with `status: "failed"` is still a completed call: `AutomationControl` with `action: "run"` returns `ok: true` with `status: "failed"`, `exit`, and an `error.message` pointing at `readRunLogs` evidence.
- Check `deliveryResults` separately; execution can succeed while delivery fails.
- For artifacts, use the current succeeded artifact run from `AutomationControl` with `action: "listRuns"`; `action: "read"` reports `latestRunStatus` for a quick health check.
- Use `readRunArtifact` to inspect the complete artifact and `readRunLogs` for failure evidence.
- For files, confirm expected `run.files` entries.
- For Widget delivery, require a succeeded delivery row and verify `Widget.latestData.main`, status, and `lastRun`.
- For local conversations, require `resultKind: "conversation"` and a real `conversationKey`.
- For notifications, require a `deliveryResults` row with `kind: "notification"` and `status: "succeeded"`.
- For an explicit cancellation, require terminal `status: "cancelled"`; no notification delivery row is expected.
- For schedule, interval, or condition triggers, confirm a real triggered run before reporting the automatic path as working.

If a run is still `running`, poll with `AutomationControl` and `action: "readRun"`; do not start another run. If `action: "run"` returns `ok: false` with `error.code: "already_running"`, `error.details` carries only `activeRunId` and `skippedRunId` (`retryable: false`); inspect the active run before retrying.

If an argument error returns `invalid_argument`, repair the field named by `error.path`. If domain validation returns `validation_failed`, repair the reported owning contract; do not retry unchanged input.

## Read Run Content

`AutomationControl` actions `list` and `listRuns` return paged results: `page` carries only `total` and `nextOffset`. Use `limit`, `offset`, and continue with the returned `page.nextOffset` until it disappears.

`AutomationControl` with `action: "readRun"` returns the trimmed run: `availableContent` lists which of `input`/`artifact`/`transcript`/`logs` exist, and non-success terminal runs (`failed`, `timeout`, `cancelled`, `skipped`) carry `failure.message` with the last recorded log line. Read full content with actions `readRunInput`, `readRunLogs`, `readRunArtifact`, or `readRunTranscript`; each returns `content` with optional `content` text, `totalBytes`, and `nextByteOffset`. Use `byteOffset` and `maxBytes` for chunked reads and continue with `nextByteOffset`.

## Update, Disable, Cancel, And Delete

- Prefer disabling an enabled automatic Automation before changing its trigger, execution entry, input contract, or result schema. The tool enforces this only while a run is active; disabling first prevents scheduler races during multi-step edits.
- After `AutomationUpdate`, inspect `revalidatedBindings`; repair invalid bindings before enabling or running.
- A running Automation does not re-enter. A concurrent trigger is skipped or returns `already_running`.
- Running update/delete returns `run_in_progress`. Cancel the active run and wait for a terminal state first.
- Cancellation does not deliver artifacts, Widget data, external results, or notifications, and does not overwrite the last successful Widget data.
- Before `AutomationControl` action `delete`, decide whether bound Widgets should remain. `cascadeWidgetIds` deletes only explicitly selected eligible Widgets and their placements; otherwise it removes the Automation and its Binding edges.
- Inspect the delete result's `deleted` counts for removed bindings, Widgets, and placements.
