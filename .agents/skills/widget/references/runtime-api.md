# Widget Runtime API

Read this reference before writing iframe JavaScript that uses `window.DaimonWidget` or
`window.DaimonCanvas`. These are host APIs, not agent-facing Blueprint tools. Do not infer call
shapes from method names. A static Widget that uses no host API does not need this file.

Sections, in order: **Portable Runtime** (data/status/theme/locale/input/event surface every Widget can
use), **File References** (the `FileResourceRef` value and its persistence rule), **File API**
(pick/read/write/url/download, limits, errors, workflow), **Delivery Smoke Host** (mandatory guards
for Binding delivery), **Canvas Placement Runtime** (`DaimonCanvas`-only surface). Read only the
sections the current code touches; Binding-delivered Widgets always need Delivery Smoke Host.

## Portable Runtime

Use `window.DaimonWidget` for code that must work in conversation, dock, pin, fullscreen, and
Canvas placements. Treat returned objects as read-only snapshots.

```ts
type JsonValue = null | boolean | number | string | JsonValue[] | JsonObject;
type JsonObject = { [key: string]: JsonValue };
type Unsubscribe = () => void;

type WidgetStatus =
  | "idle"
  | "running"
  | "error"
  | "degraded"
  | "needs_input"
  | "cancelled";

interface DaimonWidgetRuntime {
  readonly widgetId: string;
  readonly title: string;
  readonly data: Readonly<JsonObject>;
  readonly status: WidgetStatus;
  readonly inputState: { readonly currentInput?: JsonObject };
  readonly theme: "light" | "dark";
  readonly locale?: string;
  readonly tokens: Readonly<Record<string, string>>;

  getToken(name: string): string | undefined;
  onDataChange(callback: (data: Readonly<JsonObject>) => void): Unsubscribe;
  onStatusChange(callback: () => void): Unsubscribe;
  onThemeChange(callback: () => void): Unsubscribe;
  onLocaleChange?(callback: (locale: string) => void): Unsubscribe;

  saveInput(input: JsonObject): void;
  emit(eventName: string, payload?: JsonObject): void;
  readonly files: DaimonWidgetFiles;
  readonly conversations?: DaimonWidgetConversations;
}
```

`data.main` is the Automation artifact delivered to the Widget's `slots.main`. `onDataChange`
immediately calls the callback with the current snapshot, then calls it for later updates. Do not
render once before subscribing:

```js
const stopData = window.DaimonWidget.onDataChange((data) => {
  render(data.main ?? {});
});
```

Status and theme callback payloads differ by host surface. Read the current property inside the
callback. Initialize those views once yourself and keep rendering idempotent:

```js
function renderStatus() {
  statusNode.textContent = window.DaimonWidget.status;
}

renderStatus();
const stopStatus = window.DaimonWidget.onStatusChange(renderStatus);
```

Every subscription returns an unsubscribe function. Release listeners when the page no longer
needs them.

`saveInput` saves draft input only. It does not update `currentInput` or start an Automation.
`emit` submits a declared event such as `events.submit`; the host validates and routes its payload.
Both calls are fire-and-forget and return `undefined`. Do not `await` them as run completion. Observe
`status` and `data` changes instead.

Use semantic CSS variables for normal HTML. For JavaScript-rendered SVG or Canvas, read a token with
`window.DaimonWidget.getToken(name) || fallback` and redraw from `onThemeChange`.

Desktop hosts expose the current host language as a BCP-47 tag in `locale`. A locale subscription
immediately receives the current tag and then receives later host-language changes. Keep this
extension compatible with older and read-only hosts by feature-detecting it, preferring the host tag
over `navigator.language`, updating visible copy and accessibility labels together, and falling
back to English when the Widget does not ship the requested translation:

```js
const host = window.DaimonWidget;
let locale = host?.locale || document.documentElement.lang || navigator.language || "en-US";

function applyLocale(nextLocale) {
  locale = typeof nextLocale === "string" && nextLocale.trim() ? nextLocale : "en-US";
  document.documentElement.lang = locale;
  renderLocalizedCopy(locale);
}

applyLocale(locale);
const stopLocale = host?.onLocaleChange?.((nextLocale) => {
  applyLocale(nextLocale || host.locale);
});
```

Release `stopLocale` when the page no longer needs the subscription. Do not use
`navigator.language` as the primary value when `DaimonWidget.locale` is available.

Conversation and dock frames may also expose `error`, `lastRun`, and `onInputStateChange`. They are
not available on every Canvas placement, so portable Widget code must not use them. Inspect detailed
input and run evidence with agent-facing `Widget.read` and `AutomationControl` (`action: "readRun"`).

## Conversation Status Capability

Only a Widget granted a `conversations.*` capability exposes the corresponding
`DaimonWidget.conversations` member. Pet Widgets receive both `conversations.status` and
`conversations.open` by default, but the interface is not Pet-specific. Widgets without a grant
do not receive that member; always feature-detect it. The status is a small display projection,
not conversation history:

```ts
type ConversationStatusPart =
  | { readonly kind: "text"; readonly text: string }
  | {
      readonly kind: "tool-call";
      readonly toolCallId: string;
      readonly toolName?: string;
    }
  | {
      readonly kind: "tool-result";
      readonly toolCallId: string;
      readonly toolName?: string;
      readonly isError: boolean;
      readonly summary?: string;
    };

interface ConversationStatusItem {
  readonly id: string;
  readonly title: string;
  readonly runState: "idle" | "running" | "failed";
  readonly unread: boolean;
  readonly latestPart?: ConversationStatusPart;
}

interface ConversationStatusSnapshot {
  readonly conversations: readonly ConversationStatusItem[];
  readonly activeConversationId?: string;
}

interface DaimonWidgetConversations {
  readonly status: ConversationStatusSnapshot;
  onStatusChange(
    callback: (status: ConversationStatusSnapshot) => void,
  ): Unsubscribe;
  open(conversationId: string): void;
}
```

`open` is present only with `conversations.open`. Pass an `id` from the current
`status.conversations` array. It asks the trusted host to focus Daimon and navigate to that
conversation; it returns `undefined` and does not expose conversation contents.

`runState` is the kernel-observed execution state, while `unread` is the host-owned read state.
They are independent so, for example, a failed result can remain unread. Hosts normally project
only conversations that are running or unread; opening one lets the host acknowledge it and remove
an otherwise-idle item. Legacy snapshots without `unread` normalize to `false`.

`onStatusChange` immediately calls the callback with the current snapshot. For later events, the
host replaces `conversations.status` before invoking callbacks, so the callback argument and the
current property refer to the same snapshot. With no visible conversations the value is
`{ conversations: [] }`, never `null`.

Capabilities expose narrow, read-only host observations; they are not a background execution
environment. Scheduled work, desktop capture, network access, and model calls belong in an
Automation with the corresponding permission. Deliver Automation output to the Widget through a
Binding and `data.main`, so the same user-authored UI remains portable across pin, conversation,
dock, and Canvas surfaces.

Pin appearance, sizing, placement, input passthrough, and stacking belong to the trusted desktop
Pin Host configuration. Widget iframe code cannot request arbitrary native window policy.

Each conversation contains only its latest displayable part. Its `id` is an opaque host navigation
handle: pass it back unchanged and do not parse or construct it. Tool arguments, full tool output,
paths, hidden reasoning, and earlier messages are deliberately omitted. This iframe API does not
expose `getMessages`; full conversation history remains available only through the trusted desktop
Conversation API.

## File References

Files passed through Widget input or Automation output use this stable JSON value:

```ts
interface FileResourceRef {
  readonly kind: "file";
  readonly fileId: string;
  readonly name: string;
  readonly mimeType?: string;
  readonly sizeBytes: number;
  readonly sha256?: string;
  readonly source: "user-upload" | "widget-output" | "automation-output" | "imported";
  readonly createdAt: string;
}
```

Persist or submit the reference, never browser `File`, bytes, base64, a local path, a `file:` URL,
or a temporary resource URL.

Agents cannot fabricate a `FileResourceRef` for `AutomationControl.runInput`; refs must come from `pick`,
`write`, or an Automation output artifact. To verify the submit → Automation → artifact →
`data.main.files` chain without a manual pick, make `inputFile` optional in the submit event and
Automation input schemas and add a sample-file fallback inside the Automation.

## File API

`window.DaimonCanvas.files` and `window.DaimonWidget.files` are the same object. Prefer
`DaimonWidget.files` in new portable Widget code.

```ts
type FileTarget =
  | FileResourceRef
  | `workspace/${string}`
  | { readonly fileRef: FileResourceRef }
  | { readonly path: `workspace/${string}` };

interface FileBytes {
  readonly encoding: "base64";
  readonly data: string;
  readonly sizeBytes: number;
  readonly mimeType?: string;
}

type FileWriteData =
  | string
  | Blob
  | ArrayBuffer
  | ArrayBufferView
  | { readonly encoding: "utf8"; readonly text: string }
  | { readonly encoding: "base64"; readonly data: string; readonly sizeBytes?: number };

type FileDownloadResult =
  | { readonly cancelled: false; readonly fileRef: FileResourceRef }
  | { readonly cancelled: true; readonly reasonCode: string };

interface DaimonWidgetFiles {
  pick(options?: {
    readonly accept?: string | readonly string[];
    readonly multiple?: boolean;
  }): Promise<FileResourceRef[]>;

  readText(
    target: FileTarget,
    options?: { readonly encoding?: "utf8"; readonly maxBytes?: number },
  ): Promise<string>;

  readBytes(
    target: FileTarget,
    options?: { readonly maxBytes?: number },
  ): Promise<FileBytes>;

  write(input: {
    readonly name: string;
    readonly mimeType?: string;
    readonly data: FileWriteData;
  }): Promise<FileResourceRef>;

  writeText(
    path: `workspace/${string}`,
    contents: string,
  ): Promise<{ readonly path: string; readonly url: string; readonly bytesWritten: number }>;

  url(target: FileTarget): Promise<string>;

  download(
    fileRef: FileResourceRef,
    options?: { readonly suggestedFilename?: string },
  ): Promise<FileDownloadResult>;
}
```

Rules by method:

- `pick`: a single selection still returns an array. User cancellation resolves to `[]`; other
  failures reject.
- `readText`: returns text. Use it only for small files; submit the reference to Automation for
  large-file processing.
- `readBytes`: returns a base64 envelope, not `ArrayBuffer` or `Uint8Array`.
- `write`: creates a managed `widget-output` and returns its `FileResourceRef`.
- `writeText`: writes only below the Widget's `workspace/`. Ignore extra host metadata in its result.
- `url`: the result depends on the target. A `FileResourceRef` yields a `daimon-resource:` preview
  URL that expires after 15 minutes by default; outside the preview whitelist (text, JSON, XML,
  SVG, PDF, PNG/JPEG/GIF/WebP) it rejects with `unsupported_mime_type`. A workspace path yields a
  persistent `daimon-widget-resource:` URL from the controlled Widget origin, suitable for
  long-lived `<img src>`. Neither URL is a file reference; never persist or submit one.
- `download`: requires a `FileResourceRef`. Use `suggestedFilename`, not `suggestedName`.

Workspace paths must start with `workspace/` and cannot contain empty, `.` or `..` segments. Normal
relative URLs already load Widget workspace/assets through the controlled Widget origin; use the
file API when JavaScript needs the content or a managed file reference.

Default Resource Store limits are 250 MiB for a picked user file, 10 MiB for FileResourceRef
`readText`, 25 MiB for FileResourceRef `readBytes`, and 50 MiB for `write`. A smaller positive
`maxBytes` requests a tighter read limit on the `FileResourceRef` branch, where the host enforces
it. Workspace path reads do not inherit these limits and differ by method: `readText` on a path
silently ignores `maxBytes` and `encoding` and reads the whole file with no size cap, while
`readBytes` on a path honors `maxBytes` but enforces it only after the full file is fetched into
renderer memory. Do not read a large file into the iframe merely to submit it; submit its
`FileResourceRef`.

File calls reject with an object containing at least `{ code, message }`. Stable resource error
codes are `file_not_found`, `permission_denied`, `unsupported_mime_type`, `file_too_large`,
`invalid_file_ref`, `resource_expired`, and `download_cancelled`. Argument, host, and timeout errors
may use additional codes; display a generic failure and do not branch on undocumented codes.

### File Workflow

```js
const [inputFile] = await window.DaimonWidget.files.pick({
  accept: [".csv", "text/csv"],
  multiple: false
});

if (inputFile) {
  window.DaimonWidget.saveInput({ inputFile });
  window.DaimonWidget.emit("submit", { inputFile });
}

const outputFile = window.DaimonWidget.data.main?.files?.[0];
if (outputFile?.kind === "file") {
  await window.DaimonWidget.files.download(outputFile, {
    suggestedFilename: outputFile.name
  });
}
```

## Delivery Smoke Host

Binding delivery runs `index.html` top-level code in a lean smoke sandbox before accepting an
artifact. Its `window.DaimonWidget` exposes only `data`, `status`, `error`, and `lastRun` — no
`files` bridge, no `onDataChange`/`onStatusChange`/`onThemeChange`, no `saveInput`/`emit`, no
`getToken`, and no `window.DaimonCanvas`; timers are no-ops and `document.querySelector` returns
`undefined`. Unguarded calls throw and fail delivery with `render_smoke_failed`, even when
`Widget.validate` passed — they are different gates. Guard every optional host capability:

```js
const host = window.DaimonWidget;
if (typeof host.onDataChange === "function") {
  host.onDataChange(render);
}
if (host.files && typeof host.files.pick === "function") {
  // wire file controls
}
host.saveInput?.({ draft });
```

## Canvas Placement Runtime

The same `index.html` may render outside Canvas. Feature-detect Canvas-only methods and keep core
rendering on `DaimonWidget`.

```ts
interface DaimonCanvasPlacementRuntime {
  readonly canvasId: string;
  readonly mountId: string;
  readonly widgetId: string;
  readonly artifact: Readonly<JsonObject>;
  readonly input: Readonly<JsonObject>;
  readonly theme: {
    readonly theme: "light" | "dark";
    readonly tokens: Readonly<Record<string, string>>;
  };
  readonly state: Readonly<JsonObject>;
  readonly viewState: Readonly<JsonObject>;
  readonly capabilities: Readonly<Record<string, unknown>> & {
    readonly files?: Readonly<Record<keyof DaimonWidgetFiles, boolean>>;
  };
  readonly files: DaimonWidgetFiles;

  onArtifactChange(callback: () => void): Unsubscribe;
  onThemeChange(callback: () => void): Unsubscribe;
  onStateChange(callback: () => void): Unsubscribe;
  onViewStateChange(callback: () => void): Unsubscribe;
  setViewState(next: JsonObject): void;
  resize(height: number): void;

  saveInput?(input: JsonObject): void;
  submitInput?(input: JsonObject): void;
  intent?(name: string, payload?: JsonObject): void;
  openRun(runId: string): void;
  openConversation(conversationKey: string): void;
  openLink(url: string): void;
  downloadResource(
    urlOrFileRef: string | FileResourceRef,
    fileName?: string,
  ): void | Promise<FileDownloadResult>;
}
```

Use `viewState` only for presentation state local to one `mountId`, such as a selected tab or filter.
`setViewState` replaces the complete placement-local object, updates the current frame immediately,
and persists it through the host. Preserve unrelated keys when updating it. Use
`onViewStateChange` when host-driven changes must redraw the page; read `DaimonCanvas.viewState`
inside the callback instead of relying on its surface-specific payload.

Prefer `DaimonWidget.data`, `onDataChange`, `saveInput`, `emit`, theme APIs, and files over the
Canvas aliases. `artifact`, `input`, `state`, `resize`, `submitInput`, and `intent` are
surface-specific compatibility APIs. `downloadResource` is a legacy URL helper; new code uses
`files.download(FileResourceRef)`. Navigation helpers are host actions and return `undefined`.
