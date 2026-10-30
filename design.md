---
name: agent-stash-dsh-overlay-design
description: Presentation rules for browser UI that agent-stash DSH plugins render inside the DeepSeek Harness Web GUI, chiefly floating panels anchored above the composer. Readers are developers typing prompts with the keyboard; the goal is UI that reads as part of the host application in light and dark themes.
---

# agent-stash DSH overlay design

## 1. Scope and priority

Applies to: panels, ghost text, and keyboard hint rows that a plugin renders in the DSH `conversation.input.overlay` slot, composer buttons that a plugin renders in the `conversation.input.right` slot (the Prompt enhance button, its menu, and its status line), and the plugin settings pages on the Plugins page, in the light and dark DSH themes.

Does not apply to: the README, plugin icons for plugin indexes, the host DSH UI itself, and CLI or TUI output.

Priority for conflicts, highest first: user requirements, keyboard usability and focus behavior, the reader's typing flow, DSH host conventions (theme tokens and the slash-menu material), this file's visual rules, decoration.

## 2. Brand and readers

- [MUST] The overlay looks like a host surface. A reader who knows the DSH slash menu sees the same material, radius, row height, highlight, and caption ink.
- [MUST] Readers keep their hands on the keyboard. Every action in a panel has a key, and the footer shows the keys with a short verb.
- [SHOULD] Motion explains where a panel or draft came from and never delays typing; panels carry no accent colors and show no badges or decorative icons beyond one row glyph.
- [SHOULD] Copy is terse. Titles are a noun phrase; hint labels are one verb or a two-word verb phrase.

## 3. Composition

Page type: composer overlay panel (a floating list anchored to the top edge of the composer card).

- [MUST] The panel spans the composer card edge to edge and sits above it with a 4px gap, the same as the host `/` menu. It never covers the composer.
- [MUST] Header, day captions, row glyphs, and footer start at 14px from the card's left edge, the composer text column. Row meta and the counter end 14px from the right edge.
- [MUST] Structure from top to bottom: header row (title left, counter right), hairline, scrolling list, hairline, footer hint row (primary hints left, secondary hints right).
- [MUST] The list grows to about six rows, then scrolls inside itself. When the space above the composer is smaller, the list shrinks to fit below the conversation header; it keeps at least 72px.
- [MUST] Only the list scrolls. Moving the highlight scrolls the list, never the conversation.
- [SHOULD] Chronological lists group rows under day captions (today, yesterday, `MM-DD`) and keep the newest row closest to the composer.
- [SHOULD] Ranked lists (suggestions) show no day captions and put the best match first.

Inline ghost text:

- [MUST] Ghost text continues the last line of the draft after the caret, in caption ink, and disappears during IME composition.
- [MUST] Ghost text shows only while the caret is collapsed at the end of the draft.

Composer button (Prompt enhance):

- [MUST] The button sits in the composer's right control row, left of the model selector and the send button, 12px apart like the host controls. It renders nothing while the draft is empty, so an empty composer looks like the host one.
- [MUST] Its menu is the host `Menu`, opened above the button and aligned to its right edge. Rows carry a title and a one-line hint, and the footer holds one management link.
- [MUST] A label row on top of the menu states the estimated token cost of the preset under the pointer or keyboard focus (the first preset otherwise) and the number of linked turns. The tooltip of the button names the linked turns too.
- [MUST] Status text (running, failure, nothing to change) sits on the left of the button inside the same row and never pushes the composer wider; long text ends in an ellipsis. Failures stay inline next to the button; no toast.
- [MUST] After a rewrite, an undo button appears left of the main button and leaves when the draft changes.

## 4. Visual rules

Typography:

- [SHOULD] Row text 13px / 20px in primary label ink; one line, ellipsis on overflow.
- [SHOULD] Row meta (time, source) 12px / 18px in tertiary ink, right-aligned, tabular numerals, at most 40% of the row width.
- [SHOULD] Header title 12px / 18px weight 600 in secondary ink; counter 11px / 16px tabular numerals in tertiary ink, zero-padded to two digits (`01 / 03`).
- [SHOULD] Day captions and footer text 11px / 16px in tertiary ink; captions weight 500, min height 23px, padding 5px 10px 2px, 3px extra space above every caption after the first.

Surfaces:

- [MUST] Panel geometry follows the host menu: padding 4px, radius `--dsw-radius-lg`, `border: 0`, `--dsw-elevation-prominent` with `--dsw-elevation-stroke-color: --dsw-alias-border-l1`.
- [MUST] The material is a separate `::before` layer behind the content and is fully opaque: `--dsw-alias-menu-group-header-fill` layered over `--dsw-alias-bg-base`. With frosted glass on (the default), the layer also applies `--dsw-menu-backdrop-filter`. With frosted glass off, it has no backdrop filter.
- [MUST] On macOS (`html[data-platform="darwin"]`) a frosted panel adds an opaque `--dsw-alias-bg-base` backing at the end of `body`, positioned with CSS anchors on the panel, like the host `MenuSurface`. The backing exists only while the panel is open and leaves when the exit starts.
- [MUST] Hairlines are 0.5px `--dsw-alias-border-l1`.
- [MUST] Colors come only from DSH theme variables. No hex or rgb literals in panel styles.

Rows and states:

- [MUST] Row: min height 34px, padding 6px 10px, radius `--dsw-radius-md`, 6px gap between glyph and text, 6px before the meta. Compact density: min height 28px, padding 3px 10px, captions 20px tall.
- [MUST] One highlight per list: background `--dsw-alias-interactive-bg-hover`. Pointer hover moves the highlight when moving it does not rewrite the draft.
- [SHOULD] When the highlight rewrites the draft (history recall), hover only tints the row at half strength and the highlight stays on the keyboard selection. Hover tints apply only under `(hover: hover) and (pointer: fine)`. Decision; source: a moving pointer must not replace the user's draft.
- [MUST] Rows select on mousedown with default prevented, so the composer keeps focus and the caret. A panel that is leaving ignores picks.
- [SHOULD] Row glyph: a 14px outlined document icon in `--dsw-alias-menu-icon`, the host menu icon size.

Keycaps:

- [SHOULD] Keycap: 16px tall, min width 16px, 4px side padding, radius `--dsw-radius-xs`, background `--dsw-alias-interactive-bg-hover`, 10px secondary ink, like the host menu's Tab hint. Alternative keys are separated by a caption-ink slash with 2px on each side; 5px separates the keys from their label and 12px separates hints.

Composer button visuals:

- [MUST] A 28px square with `--dsw-radius-sm` corners, the same radius as the model selector beside it, and a 16px host icon in `--dsw-alias-label-tertiary`, no fill at rest. Hover, an open menu, a running rewrite, and the undo button use `--dsw-alias-interactive-bg-hover` with secondary ink. A blocked button (reference chips in the draft) is at 40% opacity and explains why in its tooltip.
- [MUST] While a rewrite runs, the button shows the host spinner and turns into a stop icon on hover or keyboard focus; the editable area is `inert`, `aria-busy`, and dims to 45% opacity.
- [SHOULD] Status line: 12px / 18px, tertiary ink, error text in `--dsw-alias-state-error-primary` with a 12px warning icon and a 16px dismiss button; at most 240px wide. The running label uses the host `TextShimmer`.
- [SHOULD] Menu rows: title 13px / 20px primary ink, hint 12px / 18px tertiary ink; the menu is at least 248px wide. Rows 1–9 show their number key.
- [SHOULD] The estimate label uses the host menu label type (11px / 15px, tertiary ink, padding 6px 8px) with tabular numerals and thousands separators. It wraps inside the width the rows set and never widens the menu.

Settings page:

- [MUST] Appearance settings live in one place: the Agent Stash Kit row's `plugins.row.config` page. Feature plugins register no appearance settings of their own; a feature plugin's own `plugins.row.config` page holds only its behavior settings.
- [MUST] The page uses the host `SettingsForm`: it stages changes, writes only the changed fields on Save with the revision it read, keeps the staged value and shows the host error line when a write is refused, and drops staged changes when the page closes. A read-only profile disables every control.
- [SHOULD] The page opens with a live preview of the staged appearance: a panel and a draft line with ghost text on a `--dsw-alias-bg-layer-2` stage, plus a small host `Button` that replays the animations. Pointer hover on preview rows moves the highlight.
- [SHOULD] A settings row: 13px / 20px weight 500 label and 12px / 18px tertiary hint on the left, the host `Switch` or `SegmentedControl` on the right, 16px apart, rows separated by 0.5px `--dsw-alias-border-l2`; the control wraps under the text on narrow pages.

Motion:

The Kit's `motion` setting picks the motion level; `lively` is the default. All curves use the strong ease-out `cubic-bezier(0.23, 1, 0.32, 1)`; durations stay under 300ms.

- [MUST] `lively` panel enter: 200ms from opacity 0, translateY 8px, scale 0.97, blur 4px, origin bottom center. Rows rise 6px over 220ms, staggered 30ms from the row nearest the composer, at most 7 steps, only within the first 420ms after the panel opens.
- [MUST] `lively` panel exit: 140ms to opacity 0, translateY 6px, scale 0.98, blur 2px; the panel unmounts on `animationend` or after 400ms. Reopening during the exit cancels it.
- [MUST] `subtle`: 140ms fade with translateY 3px on enter, 100ms fade on exit, no row stagger, no draft swap. `off`: no panel, row, ghost, or draft motion, and the panel unmounts at once.
- [SHOULD] Highlight `glide`: one shared highlight block moves under the active row with a 160ms `transform` transition that retargets on rapid key presses; it does not animate its first placement. `instant` paints the active row directly.
- [SHOULD] History recall swaps the draft in from the direction of the walk in `lively` only: 160ms from opacity 0.2, translateY 5px (older from above, newer from below), blur 2px; restoring the draft fades in place.
- [SHOULD] Ghost `wave`: a soft mask edge sweeps the suffix in from left to right over 280ms while it sharpens from blur 1.5px. `fade`: 180ms from opacity 0 and blur 2px. `none`: shown at once. The entrance plays once per suggestion: typing along the suggestion keeps it still, a different suggestion replays it. Accepting and dismissing are instant.
- [SHOULD] Composer button in `lively`: the button enters over 200ms from opacity 0, scale 0.8, blur 2px; its icon swaps over 180ms from scale 0.6; status text enters over 180ms from translateX 4px and blur 1px. `subtle` fades the button and status over 140ms. A rewritten or restored draft uses the Kit draft swap `restore`.
- [MUST] `prefers-reduced-motion: reduce` drops every transform and blur: panels only fade, rows do not stagger, the glide jumps, the draft does not move, and ghost text appears at once. Composer buttons and status text only fade, and a pressed button does not scale.

Keyboard and focus:

- [MUST] Overlay panels never take focus from the composer. The list exposes `role="listbox"` with `aria-activedescendant`; rows are `role="option"` with `aria-selected`. A leaving panel is `aria-hidden`.
- [MUST] A composer button's menu takes focus while it is open so arrow and number keys work, and returns focus to the composer when it closes without a pick or when a rewrite ends. A running rewrite gives focus to the stop button; Escape stops it.
- [MUST] While a host trigger menu (`/`, `@`) is open, the overlay shows nothing and claims no keys.
- [MUST] Keys pressed during IME composition and keys with modifiers pass through to the editor.
- [MUST] Escape closes the overlay first, before any host layer.

## 5. Primitives

Public primitives (plugins use only these names). Feature plugins reach the Kit primitives through the injected `ctx.stashKit` service and import Kit code only as types:

| Role                     | Implementation                                                                                                                          | Source                          | Usage condition                                                                   | Status        |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | --------------------------------------------------------------------------------- | ------------- |
| Overlay panel            | `stashKit.Panel` with `owner`, `open`, `title`, `counter`, `rows`, `active`, `hints`, `trailingHints`, `hoverTint`, `onPick`, `onHover` | `dsh/kit/src/panel.tsx`         | Any composer overlay list; keep it mounted and toggle `open` so the exit can play | Implemented   |
| Ghost text               | `stashKit.Ghost` with `attribute`, `marker`, `suffix`, `identity`                                                                       | `dsh/kit/src/ghost.tsx`         | Inline completion after the caret                                                 | Implemented   |
| Draft swap               | `stashKit.swapDraft(card, "older" \| "newer" \| "restore")` after a programmatic draft write                                            | `dsh/kit/src/swap.ts`           | History navigation, a rewritten or restored draft                                 | Implemented   |
| Appearance               | `stashKit.appearance` store (`glass`, `motion`, `ghost`, `highlight`, `density`, `hints`)                                               | `dsh/kit/src/store.ts`          | Plugin UI that must follow the appearance settings                                | Implemented   |
| Kit stylesheet           | `kitCss`, ghost keyframes, and settings styles, installed once by the Kit                                                               | `dsh/kit/src/styles.ts`         | Installed by the Kit only                                                         | Implemented   |
| Host controls            | `Switch`, `SegmentedControl`, `Button`, `SettingsForm` from `@deepseek-ai/dsh-client-ui-primitives`                                     | DSH module table                | Settings page controls                                                            | Host-provided |
| Host menus and feedback  | `Menu`, `MenuItemButton`, `Tooltip`, `TextShimmer`, `Input`, and `Icon*` from `@deepseek-ai/dsh-client-ui-primitives`                   | DSH module table                | Composer button menus, tooltips, running labels, settings text fields             | Host-provided |
| Composer hooks           | `useComposer`, `useComposerKeys`, `usePointerOutside`, `useEditorSignals`                                                               | `dsh/shared/client/composer.ts` | Locating the composer, claiming keys, caret and IME state                         | Implemented   |
| Date and counter formats | `clockTime`, `dayLabel`, `relativeDay`, `counter`                                                                                       | `dsh/shared/client/format.ts`   | Row meta, captions, header counter                                                | Implemented   |
| Theme variables          | `--dsw-alias-*`, `--dsw-menu-*`, `--dsw-elevation-*`, `--dsw-radius-*`                                                                  | DSH `ui-theme`                  | All overlay colors, materials, radii                                              | Host-provided |

Extension boundary:

- [MUST] Kit class names are `dsh-stash-*`. A feature plugin marks its overlay root with its own `data-<package>` attribute and does not ship panel styles.
- [MUST] A composer button plugin styles only its own button, status line, menu rows, and settings page, under its row id as the class prefix (`dsh-enhance-*`). Surfaces such as the menu card and tooltips come from the host primitives.
- [MUST] A plugin does not restyle Kit classes, another plugin's classes, or host classes.
- [SHOULD] A plugin asks for a new Kit prop instead of overriding `Panel` layout, typography, surfaces, or motion from its own stylesheet.

```tsx
const { Panel } = ctx.stashKit;

<Panel
  owner="dsh-recall"
  open={state.open}
  title="Prompt history"
  counter="01 / 03"
  rows={[{ key: "0", text: "Summarize the meeting notes.", meta: "16:33", section: "Yesterday" }]}
  active={0}
  hoverTint
  hints={[{ keys: ["↑", "↓"], label: "Browse" }]}
  trailingHints={[{ keys: ["Esc"], label: "Restore draft" }]}
  onPick={() => {}}
  onHover={() => {}}
/>;
```

## 6. Copy and number formats

- [MUST] Visible text comes from the plugin's locale dictionary with English and Chinese entries.
- [SHOULD] Times of day are 24-hour `HH:MM`. Dates older than yesterday are `MM-DD`.
- [SHOULD] Row meta joins a source and a date with `·`.
- [SHOULD] A missing source name shows a neutral placeholder such as "Untitled session".

## 7. Anti-patterns

- [MUST] No overlay that covers or resizes the composer.
- [MUST] No overlay element that takes focus from the composer.
- [SHOULD] No colored left bar or accent border on the highlighted row.
- [SHOULD] No cards inside the panel and no nested surfaces.
- [SHOULD] No pill labels for row meta.
- [SHOULD] No font sizes, weights, or color literals outside section 4.
- [SHOULD] No small low-contrast text for the row text itself; only meta, captions, and hints use tertiary ink.

## 8. Implementation and integration

- Styles: the Kit installs one stylesheet in its Client `apply` and removes it on unload; overlay feature plugins install only their dictionaries. Prompt enhance installs its own `dsh-enhance` stylesheet the same way.
- Theme switching: inherited from DSH; panel styles read theme variables only.
- Appearance: the Kit's Host `Config` declares volatile `glass`, `motion`, `ghost`, `highlight`, `density`, and `hints` fields; the browser reads them through `ctx.configForms` and re-renders every Kit component without a page reload. Without the settings service the Kit uses the defaults.
- Dependency: feature plugins inject `stashKit` and wait in the pending state until the Kit loads; their Host halves install or enable the Kit bundle through `pluginManager`.
- Fonts: inherited from the composer card.
- Components: React and `@deepseek-ai/dsh-client-ui-primitives` from the DSH module table.
