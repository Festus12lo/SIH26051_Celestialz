# Agent Execution

Agent execution performs open-ended model work. Each mode has exactly one compatible result kind.
Omit `allowedTools`: both modes inherit the full Daimon tool set.

## Model Choice

Before creating or updating an Agent Automation, call `AutomationControl` with `action: "listModels"` and use an exact alias it returns.

- Default to Kimi K3; its alias usually contains `k3-agent`.
- Use Kimi K2.6, whose alias usually contains `k2d6-agent`, only when the task is both high-frequency and simple.
- Apply this rule to both `background` and `local_conversation` modes. When unsure, use K3.
- Alias prefixes and suffixes may vary. Match the family marker above; never invent an alias.
- If the preferred family is unavailable, omit `modelAlias` to use the current default model.

## Background Artifact

Use a background Agent for open-ended model work such as research, summarization, classification, extraction, or semantic analysis that must produce structured data for a Widget. Do not schedule it more often than once per hour unless the user explicitly asks for a shorter cycle; the cadence floor lives in `SKILL.md` under "Choose A Trigger":

```json
{
  "automationId": "automation_generated",
  "description": "Uses a background agent to analyze submitted material and produce a structured summary.",
  "execution": {
    "kind": "agent",
    "mode": "background",
    "prompt": "Analyze the submitted material and produce the requested structured result."
  },
  "result": {
    "kind": "artifact",
    "schema": {
      "type": "object",
      "properties": { "summary": { "type": "string" } },
      "required": ["summary"],
      "additionalProperties": true
    }
  }
}
```

`AutomationResources` and `AutomationOutput` are injected by the runtime. Call `AutomationOutput({ artifact, files? })` exactly once, after the final artifact is ready. Use `mode: "background"` only with `result.kind: "artifact"`. File input and output go through `AutomationResources`; see `files.md`.

## Local Conversation

Use a local conversation when the Automation should perform open-ended work in a local workspace and leave a durable conversation. For open-ended Agent work whose result does not need Widget delivery, prefer this mode over `background`. The default recipe includes a notification, but notification is optional:

```json
{
  "automationId": "automation_generated",
  "description": "Reviews the selected local project and stores the result as a durable conversation.",
  "execution": {
    "kind": "agent",
    "mode": "local_conversation",
    "workspace": { "kind": "current" },
    "prompt": "Review the workspace and summarize the current project state."
  },
  "result": { "kind": "conversation" },
  "delivery": [
    {
      "kind": "notification",
      "title": "Workspace review finished",
      "desktop": true,
      "actionContext": { "action": "open_run" }
    }
  ]
}
```

For `local_conversation`, always provide a workspace. `workspace.kind: "current"` is resolved when
the Automation is created and persisted as the current project's canonical absolute path. When the
current conversation uses a Daimon-managed temporary workspace, `current` resolves to the agent's
default workspace so scheduled results remain loose conversations instead of creating a project
group for the temporary directory. Use
`{ "kind": "path", "path": "/absolute/project/path" }` to bind another existing project.
Automation-owned directories remain asset/run storage, not the local conversation's project. The
completed run stores `conversationKey`; the notification is a separate delivery result.

Use `mode: "local_conversation"` only with `result.kind: "conversation"`. Use `timeoutMs` when the default agent limit is not appropriate.
