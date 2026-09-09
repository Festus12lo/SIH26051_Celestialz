---
name: blueprint
description: Use when choosing between Daimon Blueprint Automation, Widget, Binding, and Canvas tools or routing a request to the correct Blueprint domain skill.
---

# Blueprint

Blueprint has four assets:

- `Automation`: executes work from manual, one-shot, scheduled, interval, condition, or Widget-event triggers.
- `Widget`: renders one responsive `index.html` and owns display data, input state, and UI events.
- `Binding`: connects an Automation artifact to `Widget.slots.main` and routes `Widget.events.submit` back to Automation input.
- `Canvas`: places Widgets and owns placement layout, z-order, and placement-local view state.

## Rules

- Every tool output is structured JSON: success is `{ "ok": true, ... }` with trimmed per-action fields; failure is `{ "ok": false, "error": { "code", "message", ... } }`. Branch on `ok` before reading further.
- Use returned ids; never invent `automationId`, `widgetId`, `bindingId`, `canvasId`, `mountId`, or `viewId`.
- Resolve named assets with `list`; use `read` for details. Paged outputs carry `page: { "total", "nextOffset?" }`; keep reading with `offset` set to the returned `nextOffset` until it disappears.
- Argument mistakes return `invalid_argument` with a machine-readable `error.path`; repair that field. Domain rule failures return `validation_failed`; repair the owning contract. A quota or onboarding failure appends a `<SYSTEM-REMINDER>` to `error.message` and is never retryable.
- Use the shortest asset chain that satisfies the request.
- Do not report completion until the matching verification below passes.
- Use platform file APIs and `FileResourceRef` for uploads and generated files.
- Automation limits count only enabled regular tasks. Cron jobs and widget tasks have separate limits.
- Disabled tasks are kept. A downgrade disables older tasks by `createdAt`; running tasks finish.
- Pass `verbose: true` to any Blueprint tool to see the full canonical JSON when debugging; defaults stay trimmed.

## Routing

- Executable work, schedules, conditions, runs, cancellation, or delivery: load `automation/SKILL.md`.
- HTML UI, data rendering, input controls, or Widget files: load `widget/SKILL.md`, then read `widget/references/runtime-api.md` before iframe API code.
- Automation-to-Widget data delivery or Widget submit routing: load `binding/SKILL.md`.
- Board creation, Widget placement, movement, resizing, z-order, or view state: load `canvas/SKILL.md`.

## Standard Chains

- Static Widget: `Widget.create` -> write `workspaceRoot/index.html` -> `Widget.validate` -> `Widget.show` or `Canvas.placeWidget`.
- Automation: `AutomationCreate` -> write Python entry when using code execution -> `AutomationControl` with `action: "run"` -> `AutomationControl` with `action: "readRun"`.
- Automation-backed Widget: define matching schemas -> create Automation and Widget -> write and validate `index.html` -> `Binding.create` -> run Automation -> verify delivery and `Widget.latestData.main`.
- File Widget: pick and submit `FileResourceRef` -> Automation reads and registers outputs -> Binding -> Widget/Canvas host preview, download, reveal, and copy actions.

## Verification

- Widget: `index.html` renders on the requested surface.
- Automation: the run reaches terminal `status: "succeeded"`.
- Binding delivery: the run has a succeeded delivery row and `Widget.read` shows the expected `latestData.main` and `lastRun`.
- Canvas placement: `Canvas.read` contains the generated `mountId` with the expected `widgetId`.
- `pending_run` means the Binding is configured; it does not mean fresh data has been delivered.

Ownership: Automation owns execution/results; Widget presentation/interaction; Binding the durable edge; Canvas placement only.

## Boundaries

- Pass files between assets as `FileResourceRef`; the full persistence rule (what may never enter persisted JSON or notifications) lives in `widget/references/runtime-api.md`.
- Run-local paths may be used only inside the current Automation run. Register output files before delivery.
- Widget iframe code uses `window.DaimonWidget` and `window.DaimonCanvas`; it never calls agent-facing Blueprint tools directly.
- Scheduled work uses `Automation.trigger`; do not use legacy Cron, instant-widget, or retired archive paths.
- Treat behavior absent from the current tool schema or an observed tool result as unavailable.
