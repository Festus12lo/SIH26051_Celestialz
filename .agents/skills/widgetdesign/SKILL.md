---
name: widgetdesign
description: Kimi widget design system. Read this BEFORE rendering any inline widget. Defines when to use a widget and the runtime contract; the full visual style lives in references/design-system.md. Your widget runs in a sandboxed iframe with the Kimi design system pre-loaded — reference the provided CSS variables, never hardcode colors or fonts.
---

# Kimi Widget

A widget is a compact visual or interactive surface rendered inline in the conversation:
diagrams, dashboards, calculators, sliders, comparisons, timelines, state machines, small
simulations. Use one when seeing structure helps the user understand, compare, inspect, or act
on the answer better than prose alone.

## When to generate a widget

- The answer has spatial, sequential, systemic, comparative, numeric, or interactive structure.
- The user does not need to say "show", "visualize", "chart", or "widget" — proactive widgets are
  expected when the structure is there.
- If the user gives a compact visual spec without a verb ("REST vs GraphQL table", "checkout state
  machine", "pricing calculator"), render it as a widget instead of only describing it.

Do **not** use a widget for: ordinary prose answers, routine line-by-line code explanations, file
lists / galleries / final deliverables, blocking input workflows, destructive or native actions,
or large long-lived apps.

## Runtime contract

The widget runs in a **sandboxed iframe with the Kimi design system CSS already loaded**. All CSS
variables, form-element styles, and SVG classes are available at runtime — reference them, do not
redefine them.

- Allowed: HTML, SVG, CSS, inline JavaScript, native browser APIs.
- **Not allowed**: external scripts, modules, stylesheets, images, fonts, CDN libraries, npm
  packages, `fetch`, or WebSocket. For charts/diagrams use SVG, Canvas, CSS, or plain DOM.
- **Text goes in your response, visuals go in the widget.** All explanatory prose, intros, and
  summaries live OUTSIDE the widget.
- **After the widget renders, don't narrate it.** Once you've called the widget tool and the widget
  is done, do not re-summarize or repeat what you just did — the visual speaks for itself. Say only
  what the widget cannot.
- **Always leave outer padding on the top, left, and right.** Put all widget content in one root
  wrapper and apply `padding-block-start: var(--kimi-space-4)` plus
  `padding-inline: var(--kimi-space-4)`. Bottom padding is optional and follows the composition.
- Never hardcode colors, fonts, or border-radius — always use `var(--xxx)`. Hardcoded values break
  dark mode and look inconsistent with the host UI.

## Reusable host components

Use these pre-loaded classes before writing custom component CSS. Combine base and modifier classes;
add custom CSS only for the widget's data layout or visualization marks.

### Type and layout

- `.kimi-page-title`, `.kimi-section-title`: 20px and 17px headings, weight 500.
- `.kimi-text-secondary`, `.kimi-meta`: supporting text at 14px and 12px.
- `.kimi-number`: tabular numeric values; `.kimi-code`: short technical identifiers only.
- `.kimi-row`, `.kimi-stack`, `.kimi-grid`: wrapping row, vertical stack, responsive equal grid.
- `.kimi-panel`: transparent bounded panel. Do not nest panels or use one around every section.

### Actions and selection

- `.kimi-button` with one modifier: `.kimi-button--primary`, `--secondary`, `--ghost`, or
  `--danger`. Use at most one primary action per group.
- `.kimi-icon-button`: square icon action; always add `aria-label`. Put a host icon inside as
  `<kimi-icon name="SearchIcon"></kimi-icon>` using an exact manifest name.
- `.kimi-chip`: compact filter/category choice. Express selection with `aria-pressed="true"`,
  `aria-selected="true"`, or `.is-selected`.
- `.kimi-segmented`: wrap mutually exclusive `.kimi-chip` controls.
- `.kimi-row-actions`: secondary/destructive row actions revealed by parent hover/focus.

```html
<div class="kimi-row">
  <button class="kimi-button kimi-button--primary">Apply</button>
  <button class="kimi-button kimi-button--secondary">Cancel</button>
</div>
<div class="kimi-segmented" aria-label="Period">
  <button class="kimi-chip" aria-pressed="true">Day</button>
  <button class="kimi-chip" aria-pressed="false">Week</button>
</div>
```

### Forms and data

- `.kimi-field` + `.kimi-label`: labeled form field wrapper.
- `.kimi-input`, `.kimi-select`, `.kimi-textarea`: text input controls.
- `.kimi-range`: neutral native range control; place a `.kimi-number` value beside it.
- `.kimi-switch`: use on `<input type="checkbox">` inside a visible `<label>`.
- `.kimi-status` with `--positive`, `--warning`, `--danger`, or `--accent`: display-only semantic
  status, never an action.
- `.kimi-table`: quiet semantic table. Add `.kimi-number` to numeric cells for end alignment.

```html
<label class="kimi-field">
  <span class="kimi-label">Region</span>
  <select class="kimi-select"><option>Asia</option></select>
</label>
<label class="kimi-row">
  <input class="kimi-switch" type="checkbox" checked>
  Notifications
</label>
<span class="kimi-status kimi-status--positive">Running</span>
```

### Geometry tokens

- Spacing: `--kimi-space-1` … `--kimi-space-7` = 4, 8, 12, 16, 20, 24, 32px.
- Radius: `--kimi-radius-small`, `--kimi-radius-chip`, `--kimi-radius-button`,
  `--kimi-radius-input`, `--kimi-radius-panel`, `--kimi-radius-large`, `--kimi-radius-full`.

## ⚠️ Required: read the design system before you design

**Unless the user has given you very explicit, precise styling instructions for this specific
widget, you MUST read [references/design-system.md](references/design-system.md) before writing the
widget code.** It carries the full Kimi Perspective Widget style — visual rules, typography,
component patterns, runtime token map, and the application checklist. Do not decide a widget is too
simple, too static, or too small to need it. Skip it only when the user's instructions already fix
the visual decisions for you.

If the widget uses icons, also read [references/icon-system.md](references/icon-system.md): choose
one of the 105 Kimi icons from `references/icons/manifest.json`, then reference its exact `name` as
`<kimi-icon name="SearchIcon"></kimi-icon>`. The host resolves the SVG. Do not read or copy SVG
files, draw a replacement, or use emoji.
