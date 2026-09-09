---
name: in-app-browser
description: Use when a task involves opening, viewing, reading, or interacting with a web page — the built-in browser (right panel) is the default way to open URLs and show pages to the user, even when the user just gives a URL or says "open" without naming a browser. Yield when the user asks for their own browser (Chrome, Edge) instead, and skip it for pure background information gathering the user never needs to see.
---

# In-App Browser

Use the native `InAppBrowser` tool over the existing control connection. Do not use HTTP, shell commands, or a separate service.

This controls the app's embedded browser in the right panel.

## Default surface

The in-app browser is the default way to open a web page: when a task calls for showing, reading, or interacting with a page, navigate here without waiting for the user to name the built-in browser. Two exceptions: when the user asks for their own browser (Chrome, Edge) or the page depends on their external login state, use the plugin that controls that browser instead; and when the user does not need to see the page at all (background information gathering), use plain fetch/search tools.

## Call Shape

Pass an action and action parameters. There is no browser session parameter:

```json
{
  "action": "navigate",
  "params": {
    "url": "https://example.com",
    "newTab": true
  }
}
```

To operate on an existing page, put its `tabId` inside `params`:

```json
{
  "action": "click",
  "params": {
    "tabId": "browser-tab-id-from-list-tabs",
    "selector": "@e1"
  }
}
```

Never pass a browser session, owner, conversation ID, or conversation key. Electron derives the trusted conversation from the current turn and isolates tab access accordingly.

## Tab identity and control

`tabId` is the only Agent-visible page identity. Call `list_tabs` before acting on existing pages, then reuse the returned `tabId` in `params.tabId`. Tabs opened manually by the user are first-class control targets, just like tabs created through this tool. The `origin` field records provenance only; it does not grant or restrict actions.

The security boundary is the trusted conversation, not tab origin. `list_tabs` exposes the current conversation's browser tabs, and every action may affect only those tabs. A `tabId` from another conversation must be rejected by Electron.

Page-targeted actions accept optional `params.tabId`. When it is omitted, Electron may use the current conversation's active browser tab. Always pass `tabId` after `list_tabs` when more than one tab exists so the target is unambiguous.

For compatibility with older Electron clients that accept `tabId` but still act on the active tab, first call `find_tab` with the target tab's exact `url`, then issue the page action with its `tabId`. A current client uses `tabId` directly; the extra activation keeps the same call safe on an older client. If two old-client tabs have the exact same URL, tell the user the client must be updated before claiming precise targeting. Legacy `sessionId` or `inSession` fields in a `list_tabs` result are compatibility metadata only; never use them as page identity or send a `session` argument.

## URLs handed off by other tools

The in-app browser has its OWN cookie jar with no login state — URLs meant for the user's external browser will land on a sign-in page here. Some tool results therefore return two URL variants: a plain user-facing link, and a dedicated embedded/handoff URL (often carrying a one-time sign-in token and flags such as `required` or a launch-surface parameter).

- When a handoff/embedded variant exists, `navigate` to it EXACTLY as returned — never the plain external-browser link, and never rebuild or edit the URL.
- Fetch a FRESH handoff URL from the providing tool for each open; one-time tokens in an earlier result may already be consumed or expired.
- Never show token-bearing URLs to the user; link the plain variant instead.
- Apply any origin validation the providing skill defines before opening.

If `InAppBrowser` is not available, Agent control is disabled for this turn. Do not work around that through HTTP or another local transport. The user can still operate the in-app browser manually.

## Actions

| Action | `params` | Purpose |
| --- | --- | --- |
| `navigate` | `url` (required), `newTab`, `tabId` | Navigate the targeted tab. Use `newTab: true` only when a separate tab is wanted; otherwise reuse `tabId` or the active tab. |
| `list_tabs` | none | List the browser tabs owned by the current conversation, including tabs the user opened manually. Use each entry's `tabId` for subsequent actions. |
| `find_tab` | `url` (required) | Re-activate an owned tab whose URL or host matches `url` (bare domains match all subdomains). Returns its `tabId`; fails when no owned tab matches. |
| `snapshot` | `output`, `inlineLimitBytes`, `outputDir`, `maxTextLength`, `textOffset`, `chunkSize`, `maxElements` | Read page text and interactive `@e` references. `outputDir`, when supplied, must be under the system temporary directory. Rebuilds the `@e` ref table. |
| `read_page` | `max_chars` (default 60000), `start` | Read the whole page text via an in-page scroll-and-collect loop (covers virtualized pages). Returns honest `complete`/`truncated`/`nextStart` metadata — when `complete` is false, continue with `start: nextStart`. |
| `find` | `query` (required) | Search the last snapshot's `@e` ref table by text/label/href; returns matches with refs. Read-only — does not rebuild or reset the ref table. |
| `click` | `selector` (required), `snapshot` | Click an `@e` reference or CSS selector (DOM-level). |
| `mouse_click` | `selector` (required), `snapshot` | Real CDP mouse click at the element center: activates the tab, hit-tests for covering elements first and verifies event delivery. Use when `click` has no effect. Requires the in-app browser panel to be visible (see below). |
| `fill` | `selector` (required), `value`, `snapshot` | Fill an input, textarea, select, or contenteditable element. |
| `key_type` | `text` (required), `snapshot` | Insert text at the current focus via `Input.insertText`. |
| `send_keys` | `keys` (required), `repeat` (1–100), `snapshot` | Dispatch real key events: `"Enter"`, `"Mod+A"`, `"Shift+Tab"`, or space-separated sequences like `"Enter Escape"`. `Mod` resolves to Cmd on macOS, Ctrl elsewhere. |
| `select_option` | `selector` (required), `value` or `values`, `snapshot` | Drive a native `<select>`; without `value`/`values` it lists the options instead. Values match the option value first, then its label (case-insensitive). |
| `hover` | `selector` (required), `snapshot` | Move the CDP mouse over the element center to reveal `:hover` state and menus. |
| `scroll` | `selector` or `text` or `direction` (`up`/`down`) or `to` (`top`/`bottom`), `snapshot` | Scroll the page: to an element, until text is visible, by one viewport, or to an edge. Finds the real scroll container when the window itself does not scroll. |
| `drag` | `from` (required), `to` (required), `snapshot` | Drag one element onto another. HTML5 draggable sources report `dropAccepted`; pointer-driven targets return `verified: false` — always confirm with a snapshot. |
| `wait` | `text` and/or `text_gone` and/or `selector` (at least one), `timeout_ms` (500–60000, default 10000), `snapshot` | Wait until text appears, text disappears, or a selector becomes visible. A timeout returns `{ok: false, timedOut: true}` — it is an observation, not an error; when the page rendering looks frozen (hidden panel / background throttling) the result carries `renderFrozen: true` and a note telling you to make the panel visible and retry, since the polled text may be stale. |
| `upload` | `selector` (required), `files` (required) | Set local files on a file input. `files` must be absolute paths of existing files. |
| `dialog` | `action` (required: `status`/`accept`/`dismiss`), `text` | JavaScript dialogs (alert/confirm) open as NATIVE modals and freeze the page's renderer until handled. `status` shows the tracked open dialog; `accept`/`dismiss` close it via CDP (`text` fills a prompt on `accept`) and unfreeze the page. While a dialog is open, every other action fails fast with `IN_APP_BROWSER_DIALOG_OPEN` instead of hanging — handle the dialog here first, then retry. `window.prompt` is different: Electron has no native prompt, so it is downgraded to a scriptable hook — calls never block, return the current default (initially `null`), and are recorded under `prompt.records` in `status`; `accept` with `text` sets the default returned by FUTURE prompt calls, `dismiss` resets it to `null`. |
| `network` | `cmd` (required: `start`/`stop`/`list`/`detail`), `filter`, `requestId` | Capture network requests for the targeted tab. `list` shows captured requests (optional `filter` on URL); `detail` returns the response body (JSON auto-parsed). `stop` preserves captured data until the next `start` or tab cleanup. |
| `save_as_pdf` | `paper_format` (`letter`/`legal`/`a4`/`a3`/`tabloid`), `landscape`, `scale` (0.1–2.0), `print_background`, `outputDir` | Print the page to PDF via Electron's native `printToPDF`, written under the system temporary directory; returns `path`, `bytes`, `sha256`. |
| `evaluate` | `code` (required) | Evaluate JavaScript in the targeted tab. Keep output compact. |
| `cdp` | `method` (required), `params` | Send a Chrome DevTools Protocol command. Use only when DOM actions are insufficient. |
| `screenshot` | `format` (`png` or `jpeg`), `quality`, `outputDir` | Capture the targeted tab to an image file written under the system temporary directory (like `save_as_pdf`); returns `path`, `format`, `bytes`, `sha256` — never inline base64. To look at the image, read the returned `path` with a file-reading tool. |
| `close_tab` | `tabId` | Close one tab owned by the current conversation. |
| `close_session` | none | Legacy action name: close all browser tabs owned by the current conversation. It does not take a browser session ID. |

Interaction actions (`click`, `fill`, `mouse_click`, `scroll`, `hover`, `drag`, `key_type`, `send_keys`, `select_option`, `wait`) accept `snapshot: true`: after the action the page settles for 300 ms and a fresh bounded snapshot is appended as `page_snapshot` — act and observe in one call. The appended snapshot rebuilds the `@e` ref table, replacing all earlier refs.

Real-input actions (`mouse_click`, `hover`, `send_keys`, `key_type`, `drag`) dispatch trusted CDP input events, which only reach a visible tab: they activate the targeted tab first, and fail with `IN_APP_BROWSER_TAB_NOT_VISIBLE` when the in-app browser panel itself is closed or hidden. That error means "use `click` (DOM-level) instead, or ask the user to open the panel" — never pretend the action succeeded.

## Workflow

1. Call `list_tabs`. If the target page already exists, call `find_tab` with its exact `url` and keep its `tabId`; otherwise call `navigate` with `newTab: true` and keep the returned `tabId`.
2. Call `snapshot` to read the page and obtain element references.
3. Use `click` or `fill` (optionally with `snapshot: true`), then verify the result. Use `wait` for async page changes instead of fixed delays.
4. Use `evaluate` or `cdp` only when normal page actions are insufficient.
5. Call `close_tab` with the exact `tabId` when a temporary page is no longer needed. Use `close_session` only when every browser tab in the current conversation should be closed.

Snapshot delivery defaults to `output: "auto"`: small results are inline; results over 64 KB are written under the system temporary directory and return `path`, `bytes`, `sha256`, and `preview`. When `hasMore` is true, continue with `textOffset: nextTextOffset`.
