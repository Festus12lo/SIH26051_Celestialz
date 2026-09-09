---
name: widget
description: Use when creating, showing, updating, validating, deleting, rendering, or troubleshooting Daimon Blueprint Widgets, their responsive index.html UI, data slots, submit events, input state, files, and workspace resources. You MUST read widgetdesign skill before creating any widget.
---

# Widget

Widget owns one responsive `index.html`, display data, input state, events, files, and workspace resources. Every surface renders `workspaceRoot/index.html` of the Widget root workspace.

## Create And Show

Create the Widget definition first (`type` defaults to `"html"` and does not need to be passed):

```json
{
  "action": "create",
  "title": "Status card",
  "description": "Shows the latest pipeline status.",
  "creationHints": ["Checking live status", "Preparing the status card"]
}
```

The create output returns `widgetId`, `workspaceRoot`, a fixed `note` describing the workspace/assets convention, and either `viewId` (automatic show succeeded) or `showSkipped` (`no_surface_context` / `no_renderable_face`).

Then:

1. Write a complete HTML document to the returned `workspaceRoot/index.html`.
2. Call `Widget.validate`.
3. For conversation or dock display, call `Widget.show`.
4. For Canvas display, call `Canvas.placeWidget` with the returned `widgetId`.

`creationHints` accepts 1-6 short progress lines shown while the page is authored. Static Widgets need no slots, events, Binding, or Automation.

For appearance and responsive layout, load `widgetdesign/SKILL.md` before writing HTML/CSS. It is
the self-contained Widget design authority; do not load another Widget Design Skill for the same
work.

## Inspect And Modify An Existing Widget

1. Resolve the Widget with `Widget.list` or a known `widgetId`; follow `page.nextOffset` until it disappears.
2. Call `Widget.read` and inspect the returned `widget`: `slots`, `events`, `bindings`, `activeBindingStatus`, `status`, `lastRun`, `latestData.main`, and `workspaceRoot`. Pass `fields` to narrow the projection: an array of groups (`basic`, `bindings`, `status`, `runs`) or the `"acceptance"` preset (`status` + `runs` + `bindings`); `widgetId` is always returned.
3. Read the existing `index.html` before editing it. Preserve working behavior unless the user requested a replacement.
4. If metadata, slots, or events change, call `Widget.update` and inspect `revalidatedBindings` (always present, `[]` when nothing was revalidated). Do not call update merely to activate `index.html`.
5. Write the updated complete document, then call `Widget.validate` and repair any invalid owning contract before running again.
6. If the Widget has an active Binding, call `Binding.validate` after page or resource changes and inspect its current status before running the Automation.
7. Confirm an existing mounted view refreshed, or call `Widget.show` when conversation/dock display is requested.

If `Widget.show` returns `no_surface_context`, the Widget remains valid; show it later from a conversation/dock context or place it on Canvas. Do not create a replacement Widget only to obtain a display surface.

## Responsive Size Contract

The same `index.html` renders across conversation, dock, Canvas placement, and fullscreen. Placement geometry (grid spans, min/default/max pixels) is owned by `canvas/SKILL.md`; responsive, natural-width, normal-flow guidance lives in `widgetdesign/references/design-system.md`. Keep `html` and `body` in normal document flow so conversation surfaces can measure content height.

## Data Slot And Submit Event

Use `slots.main` only for Automation artifact delivery. Use `events.submit` for Widget input sent to the active Automation Binding; `slots` and `events` are sibling fields — never `slots.events`. Choose schemas before writing the dynamic UI so sample data and live data share one render path. The full payload contract, JSON example, and submit-input resolution order live in `references/slots-and-events.md`.

## Common Widget Runtime

Author the shared `index.html` against the runtime surface common to conversation, pin, dock, and Canvas placements; do not depend on a field or listener that exists on only one host surface. Before iframe JavaScript uses either global, read `references/runtime-api.md`; it defines all signatures and behavior.

The portable `window.DaimonWidget` surface: `widgetId`, `title`, `data`, `status`, `inputState.currentInput`, `theme`, `tokens`, `getToken`, `onDataChange`, `onStatusChange`, `onThemeChange`, `files`, plus `saveInput` and `emit` for declared events. Desktop hosts also expose the current BCP-47 `locale` and `onLocaleChange`; feature-detect them so the Widget still renders in older or read-only hosts. Render current data on load — `onDataChange` immediately supplies the current snapshot — read current properties inside callbacks, and release returned unsubscribe functions. `saveInput` saves draft input only; `emit("submit", payload)` lets the host validate the payload, resolve the active Binding, run the Automation, and deliver fresh data back to `data.main`. Inspect run and error evidence outside the iframe with `Widget.read` (the `runs` group) and `AutomationControl` with `action: "readRun"`.

For language-sensitive UI, prefer `DaimonWidget.locale` over `navigator.language`, update visible copy and accessibility labels from `onLocaleChange`, and fall back to English for locales the Widget does not translate. Read `references/runtime-api.md` for the exact compatibility pattern.

## Files

Use `window.DaimonWidget.files` (`pick`, `readText`, `readBytes`, `write`, `writeText`, `url`, `download`) for Widget file workflows. `window.DaimonCanvas.files` is a compatibility alias; check `window.DaimonCanvas.capabilities.files` when supporting an older runtime. Before any file call, read `references/runtime-api.md` for arguments, returns, cancellation, errors, and limits:

```js
const [inputFile] = await window.DaimonWidget.files.pick({
  accept: ".csv,text/csv",
  multiple: false
});
if (!inputFile) return; // pick resolves to [] when the user cancels

window.DaimonWidget.saveInput({ inputFile });
window.DaimonWidget.emit("submit", { inputFile });
```

Pass only `FileResourceRef` values to Automation and keep large file contents out of Widget input; the full persistence rule lives in `references/runtime-api.md`. Read output refs from `window.DaimonWidget.data.main.files`.

## Canvas Placement State

`window.DaimonCanvas.viewState` and `setViewState` are Canvas-only and local to one `mountId`; use them for tabs, filters, and presentation choices. Business data stays in Widget data delivered through Binding. Signatures live in `references/runtime-api.md`.

## Validation

Before reporting a Widget ready:

1. `Widget.validate` returns `ok: true` with `status: "valid"` (non-empty `warnings` may still appear; an invalid Widget returns `ok: false`, `status: "invalid"`, and `issues` with `path`/`message` entries).
2. `index.html` is a complete document and renders at the requested size.
3. Static Widgets render on the requested conversation, dock, or Canvas surface.
4. Dynamic Widgets render schema-valid sample data before the first run.
5. Automation-backed Widgets have succeeded run and Binding delivery evidence before live data is reported ready.
6. After page or resource changes, an active Binding has been explicitly revalidated before the next run.

Failed, timed-out, or cancelled runs update status and error evidence without replacing the previous successful `latestData.main`.

## Runtime States

- `idle`/`running`: ready or active.
- `needs_input`: no payload, current input, or default satisfied the contract.
- `error`: show generic failure UI in the iframe; inspect `Widget.read`, the run, and Binding validation for details.
- `degraded`: keep usable data visible and inspect warning evidence.
- `cancelled`: keep the last successful data and allow explicit retry.

For interactive Widgets, render status without replacing the entire document. Disable duplicate submit actions while `running`, show field guidance for `needs_input`, and keep prior successful content visible for `error`, `degraded`, or `cancelled`.

## Update And Delete

- `Widget.update` changes title, description, slots, or events and revalidates related Bindings. Inspect the always-present `revalidatedBindings` (`{ bindingId, status, issues? }` entries).
- Workspace file changes refresh mounted views through resource revisions.
- `Widget.delete` is a force cascade: it removes the Widget and all of its Canvas placements, deletes every related Automation and all Binding edges owned by those Automations, and leaves other Widgets intact.
- A related active Automation is best-effort blocked from new runs, cancelled, and drained before deletion. Cancellation or drain failure does not prevent durable graph deletion. External delivery and Bindings to other Widgets also do not prevent deletion. `cascadeAutomationIds` is a deprecated compatibility field and is ignored.
- Inspect the delete result's `deleted` counts for removed placements, bindings, and Automations.
