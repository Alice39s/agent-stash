---
name: dsh-message-edit-design
description: Presentation rules for the DeepSeek Harness (DSH) Web UI surfaces that @agent-stash/dsh-message-edit renders through slots, namely a compact control cluster in the session header, a master-detail conversation view with a long list, icon buttons in the assistant message action row, and a modal dialog. Applies to DSH 0.1.0-rc.3 and 0.2.1-rc.3, light and dark themes, pointer-and-keyboard desktop readers. Every surface must read as native DSH chrome.
version: 5804f07
---

# dsh-message-edit design

Host references use two locations:

- Primitive CSS: the published `@deepseek-ai/dsh-client-ui-primitives@0.2.1-rc.3`, file `lib/<Name>.module.css`.
- Other host code: `packages/client/<package>/src/...` in the DSH repository at tag `dsh-v0.2.1-alpha.2`. Paths below omit `packages/client/`.

A file name without a package path, such as `Modal.module.css`, is a published primitive file. Within one table cell, later file names share the package of the first path.

## 1. Scope and Priority

| Surface                | Slot                                  | Page type                              | Host reference                                                                                                                               |
| ---------------------- | ------------------------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Header control cluster | `conversation.session.header.actions` | Compact control cluster in a host band | `ui-conversation/src/client/skeleton/ConversationRoot.module.css` `.headerActions`                                                           |
| Conversation view      | `conversation.view`                   | Master-detail with a long list         | `ui-trajectory/src/client/views.module.css`, `TrajectoryToolbar.module.css`, `TrajectoryTable.module.css`, `TrajectoryTurnHeader.module.css` |
| Message action buttons | `conversation.chat.assistant-actions` | Inline icon cluster in a host row      | `ui-chat/src/client/chat/MessageIconActions.module.css`                                                                                      |
| Dialog                 | Top layer (native `<dialog>`)         | Modal dialog                           | `Modal.module.css`, `ui-primitives/src/Modal.tsx`, `ui-primitives/src/useModalLayer.ts`                                                      |

This file does not apply to host-owned chrome: the session title, the view tab strip, the message row container, and the composer. It does not apply to package metadata such as the bundle icon.

Resolve conflicts in this order:

1. User requirements: host tokens only, valid on both DSH versions; copied host components; no DOM outside the plugin tree; `zh` and `en`; light and dark themes.
2. Accessibility: visible focus, keyboard operation, reduced motion.
3. Reader tasks on each surface.
4. DSH 0.2.1-rc.3 conventions.
5. DSH 0.1.0-rc.3 conventions.
6. Decorative detail.

- [SHOULD] When the two DSH versions differ, copy the 0.2.1-rc.3 appearance. Decision: Desktop 0.2.1-rc.3 is the current host; 0.2 replaced the 0.1 capsule radii with the radius scale in `ui-theme/src/styles/base.css`.

## 2. Brand and Readers

- [MUST] Show no plugin brand on any surface: no logo, no brand color, no custom font, no illustration.
- [SHOULD] Use one accent. `--dsw-alias-state-business-primary` marks the current item, the checked option, the focus ring, and the focused field edge. All other ink is neutral.
- [SHOULD] Keep controls quiet. Header, toolbar, and row controls have no fill until hover. The dialog confirm button is the only filled button.
- [SHOULD] Keep chrome text at 11 to 14px roles. The dialog title is the only 16px text.

Readers use laptop and desktop screens with a pointer and a keyboard. Side panels can make the conversation column narrow. Readers switch between `zh` and `en` and between light and dark themes. Copy is short and neutral (Chapter 6).

## 3. Page Structure and Composition

### 3.1 Header control cluster

- [SHOULD] Order the cluster as one stepper (icon button, position label, icon button), then quiet text actions.
- [SHOULD] Register the entry with `order` above 20. Decision: the cluster then follows the host background-jobs trigger (`ui-jobs/src/client/index.ts`, order 20) at the trailing end of the band.
- [SHOULD] Render nothing before the first data arrives. Render nothing when no control in the cluster can act.

### 3.2 Message action buttons

- [SHOULD] Render only icon buttons and an optional status line in the slot. The host row owns the gap, the hover reveal, the clock, and the position between its copy and branch buttons.
- [SHOULD] Register the entry with `order` above 10. Decision: the buttons then follow the host feedback pair (`ui-message-feedback/src/client/index.ts`, order 10).
- [SHOULD] Put a button that opens a dialog before a button that acts at once.

### 3.3 Conversation view (master-detail with a long list)

First viewport, top to bottom:

1. Toolbar row: 32px, sticky, controls on the leading side, status on the trailing side.
2. Split area that fills the remaining height. The primary pane is on the leading side and flexes. The secondary pane is on the trailing side and holds the hierarchical list.

- [SHOULD] Put `data-conversation-composer-overlay` on the view root. Decision: in both DSH versions the host conversation layout then floats the composer over the view and stops the outer scroll, which the panes need for their own scroll (`ui-conversation/src/client/skeleton/ConversationRoot.module.css`).
- [SHOULD] Lay out the view root like the trajectory root (`ui-trajectory/src/client/views.module.css` `.root`): a full-height flex column on `--dsw-alias-bg-layer-1` that does not scroll.
- [SHOULD] Give each pane its own vertical scroll. Pad the pane bottom with `calc(var(--dsh-composer-height, 152px) + 16px)`, as the trajectory `.ledger` does, so the last row clears the composer.
- [SHOULD] Size and separate the secondary pane like the trajectory detail pane (`ui-trajectory/src/client/TrajectoryTable.module.css` `.details`). Start it with a header row like `.detailsHeader`: title on the leading side, count on the trailing side.
- [SHOULD] Start each group in the primary pane with a sticky group header like `ui-trajectory/src/client/TrajectoryTurnHeader.module.css` `.root` and `.inner`: title, one-line preview, and a quiet action on the trailing side.
- [SHOULD] Do not render a page title, an intro paragraph, or an `h1`. The host tab names the view.
- End position: the last row of each pane, then the composer clearance. Add no footer.

### 3.4 Modal dialog

- [MUST] Render the dialog as a native `<dialog>` inside the component that opens it, and open it with `showModal()`. Decision: the browser top layer keeps the card above host chrome, and no host `container-type` or transform ancestor can offset it. Both DSH versions run in Chromium-based browsers that support `showModal()`.
- [SHOULD] Compose the card, header row, description, body, and footer as `Modal.tsx` does, with the classes of `Modal.module.css` and the 4.3 replacements. Style `::backdrop` as the host mask (4.4).
- [SHOULD] Keep the header row and the footer fixed. Let the body scroll when the card reaches its maximum height.
- [SHOULD] Show a choice dialog as option rows in the body without a footer confirm button. Selecting a row replaces the body in the same card. The card does not close and reopen.

## 4. Visual Rules

### 4.1 Typography

- [MUST] Set text with the `font` shorthand tokens below. Do not write literal font sizes, line heights, or weights.
- [SHOULD] Use `font-variant-numeric: tabular-nums` for counts, positions, and times.

| Type role                                                                                              | Token                                                               |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| Dialog title                                                                                           | `--dsw-font-base-strong-16`                                         |
| Dialog description, text field, dialog buttons                                                         | `--dsw-font-s-14`                                                   |
| Group title, pane title, current tree row title                                                        | `--dsw-font-xs-strong-13`                                           |
| Tree row title, option row, long text, pane empty and error lines, tooltip, row status line            | `--dsw-font-xs-13`                                                  |
| Header text action, toolbar controls, compact buttons, metadata, field helper, dialog status and error | `--dsw-font-xxs-12`                                                 |
| Identifier                                                                                             | `--dsw-font-xxxs-11` with `font-family: var(--ds-font-family-code)` |

### 4.2 Color and themes

- [MUST] Reference only the tokens of Chapter 5. Write no color literals and no theme selectors such as `body[data-ds-dark-theme]` or `prefers-color-scheme`. The host switches every token between light and dark.
- [SHOULD] Make tints only with `color-mix(in srgb, <token> 10%, transparent)`.

| Color role                                             | Token                                                                                                                   |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| View surface, text field fill                          | `--dsw-alias-bg-layer-1`                                                                                                |
| Dialog card                                            | `--dsw-alias-bg-layer-2`                                                                                                |
| Group header band                                      | `--dsw-alias-button-ghost-active-fill`                                                                                  |
| Modal mask                                             | `--dsw-alias-bg-mask-1`                                                                                                 |
| Skeleton bar                                           | `--dsw-alias-bg-skeleton`                                                                                               |
| Hairline between items                                 | `--dsw-alias-border-l1`                                                                                                 |
| Hairline between panes, under toolbar and pane headers | `--dsw-alias-border-l2`                                                                                                 |
| Outline button stroke, focused field edge              | `--dsw-alias-border-l3`                                                                                                 |
| Field stroke, dialog card edge                         | `--dsw-alias-border-l4`                                                                                                 |
| Primary text                                           | `--dsw-alias-label-primary`                                                                                             |
| Secondary text, hovered control ink                    | `--dsw-alias-label-secondary`                                                                                           |
| Metadata, resting control ink                          | `--dsw-alias-label-tertiary`                                                                                            |
| Placeholder, empty value, inactive tree marker         | `--dsw-alias-label-caption`                                                                                             |
| Read-only field text                                   | `--dsw-alias-label-dimmed`                                                                                              |
| Hover fill, pressed toggle fill                        | `--dsw-alias-interactive-bg-hover`                                                                                      |
| Current tree row fill, active press                    | `--dsw-alias-interactive-bg-active`                                                                                     |
| Accent                                                 | `--dsw-alias-state-business-primary`                                                                                    |
| Error text                                             | `--dsw-alias-state-error-primary`                                                                                       |
| Filled button                                          | `--dsw-alias-button-primary-fill`, hover `--dsw-alias-button-primary-hover`, ink `--dsw-alias-label-primary-foreground` |
| Tooltip                                                | `--dsw-alias-tooltip-bg`, ink `--dsw-static-neutral-bluish-00`                                                          |

### 4.3 Geometry and host CSS replacement

- [MUST] Copy each control from the host class that Chapter 5 names. Keep its geometry.
- [MUST] In copied CSS, replace every name that DSH 0.1.0-rc.3 does not define:

| Host reference                                                      | Plugin replacement                                              |
| ------------------------------------------------------------------- | --------------------------------------------------------------- |
| `--dsw-radius-xs`, `-sm`, `-md`, `-lg`, `-panel`                    | `--message-edit-radius-xs`, `-sm`, `-md`, `-lg`, `-panel`       |
| `--dsw-focus-ring-width`                                            | `--message-edit-focus-width`                                    |
| `var(--dsw-focus-ring-color, X)`                                    | `X`                                                             |
| `--dsw-elevation-prominent`                                         | `0 0 0 0.5px var(--dsw-alias-border-l4), var(--dsw-shadow-lv3)` |
| `+ var(--dsh-content-font-delta, 0px)`                              | remove the term                                                 |
| `var(--dsh-frame-overlay-top, A)`, `var(--dsh-frame-chrome-top, B)` | `A`, `B`                                                        |
| Literal font size and line height                                   | the 4.1 token with the same pair                                |

- [SHOULD] Declare the replacement properties once on the root class of each surface: radius `xs` 4px, `sm` 8px, `md` 12px, `lg` 16px, `panel` 28px; focus width 2px. Decision: these are the 0.2 values in `ui-theme/src/styles/base.css` and `ui-theme/src/styles/focus.css`.
- [SHOULD] Pair every full-round radius (`50%` or a capsule) with `corner-shape: round`.
- [SHOULD] Use these plugin values. Decision: the host has no component for these elements.

| Element                              | Value                                                  | Basis                                                                                      |
| ------------------------------------ | ------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| Stepper gap; gap before text actions | 2px; 8px                                               | Trajectory toolbar `.actions` gap; `.headerActions` gap                                    |
| Group item                           | `padding: 8px 16px`, lane `max-width: 880px`, centered | Trajectory turn header `.inner` lane                                                       |
| Tree indent                          | 12px per level, at most 6 levels                       | At the 320px pane minimum, row text keeps at least 220px                                   |
| Text field                           | `min-height: 160px`, `max-height: 360px`               | Feedback `.detail` (116–280px) holds a note; message text needs about six lines            |
| Dialog card                          | `width: min(560px, 100%)`, `max-height: 100%`          | Host wide dialog `ui-plugin-manager` `.installDialog`                                      |
| Message action button                | fixed 28px                                             | The host size delta exists only in 0.2; at non-default text sizes plugin buttons stay 28px |

### 4.4 Surfaces and elevation

- [SHOULD] Draw hairlines at `0.5px`, with the 4.2 border roles.
- [SHOULD] Keep the view, panes, groups, and rows flat: no shadow and no frame around panes, groups, or items.
- [SHOULD] Paint the dialog mask with `--dsw-alias-bg-mask-1` and `backdrop-filter: var(--dsw-mask-blur)`. Each DSH version then applies its own blur.

### 4.5 Icons

- [MUST] Copy SVG artwork from `ui-primitives/src/icons/index.tsx` into plugin components, in the `Regular` weight. Color it with `currentColor` and set `aria-hidden="true"`.
- [SHOULD] Map glyphs: open-editor actions use `IconEditOutlineRegular`; regenerate and retry use `IconRefreshOutlineRegular`; stepper steps use `IconChevronLeftOutlineRegular` and `IconChevronRightOutlineRegular`; dialog close uses `IconCloseOutlineRegular`.
- [SHOULD] Size glyphs at 14px in the header, toolbar, and dialog close, and at 15px in message action buttons.
- [SHOULD] Use the `ongoing` spinner of `ui-primitives/src/StateDot.tsx` for in-progress glyphs, at the size of the glyph it replaces, in `--dsw-alias-label-tertiary`.

### 4.6 Controls and states

- [SHOULD] Take resting, hover, pressed, and disabled styles from the copied class. A copied class without a disabled rule uses `opacity: 0.4` and `cursor: default` and keeps its resting colors on hover.
- [SHOULD] Use `aria-disabled="true"` instead of `disabled` when a tooltip explains the reason. Keep such a control focusable.
- [SHOULD] Show a pressed toggle or checked option with `--dsw-alias-label-primary` ink and `--dsw-alias-interactive-bg-hover` fill, as `ui-trajectory/src/client/TrajectoryToolbar.module.css` `.toggle[aria-pressed='true']` does.
- [SHOULD] Show the current tree row with `--dsw-alias-interactive-bg-active` fill, the strong title role, and the accent marker.
- [MUST] Show a visible focus style on every focusable element. Controls use `outline: var(--message-edit-focus-width) solid var(--dsw-alias-state-business-primary)` on `:focus-visible`. Option rows and tree rows use the hover fill, as `Menu.module.css` `.item` does. The text field uses its focus edge.
- [SHOULD] Write focus rules as one class plus `:focus-visible`. In 0.2 the host pointer-modality rule (`ui-theme/src/styles/focus.css`) then hides rings after pointer clicks.
- [SHOULD] Use `outline-offset: 2px` by default and `-2px` inside clipped rows. Toolbar controls use a 1px outline with a 1px offset.
- [SHOULD] Copy the text field from `ui-message-feedback/src/client/FeedbackDialog.module.css` `.detail`, with the 4.3 height. Show read-only text in `--dsw-alias-label-dimmed`.
- [SHOULD] During an operation, show the spinner in place of the acting control's glyph, set `aria-busy="true"`, and use the progressive label. Disable every other plugin control that starts an operation until it ends.
- [SHOULD] Give every icon-only control the copied `Tooltip` (`ui-primitives/src/Tooltip.tsx`, `Tooltip.module.css`) with `side="bottom"`. Render the bubble with the Popover API (`popover="manual"`) and position it from the trigger's `getBoundingClientRect()`. Decision: the popover sits in the top layer, so the 0.2 title row, which is a size container, cannot offset or clip it, and no portal is needed. Also set `aria-label` on the control.
- [MUST] Give the dialog the keyboard behavior of `ui-primitives/src/useModalLayer.ts`. Escape closes the dialog through its `cancel` event unless an operation runs. Initial focus goes to the `data-modal-autofocus` control with the caret at the end. Focus returns to the invoking control on close. Enter and Escape do nothing during IME composition.

### 4.7 Data states

- [SHOULD] Show the data states of each surface as the table states. Decision for the 4-second header failure label: it copies the host failed-stop hint in `ui-jobs/src/client/JobListAction.tsx` (`KILL_FAILED_MS`).

| Surface                           | Loading                                                                                | Empty                                                                       | Error                                                                                                                                                        |
| --------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Header control cluster            | Render nothing                                                                         | Render nothing                                                              | The text action shows a failure label in `--dsw-alias-state-error-primary` for 4 seconds, then returns to rest                                               |
| Message action buttons            | Render the buttons disabled                                                            | Render nothing for a message without an action                              | One status line after the buttons, as `ui-message-feedback/src/client/MessageFeedbackActions.module.css` `.failure`, with `role="status"`                    |
| Conversation view, no data yet    | Toolbar with disabled controls; three skeleton rows per pane                           | One line at the top of the pane in `--dsw-alias-label-tertiary`, 16px inset | One error line with a compact outline retry button, `gap: 10px`, at the top of the primary pane                                                              |
| Conversation view, data on screen | Keep the content; spinner at the trailing end of the toolbar; `aria-busy` on the panes | Not applicable                                                              | One notice row under the toolbar: `--dsw-font-xxs-12`, `--dsw-alias-state-error-primary`, `padding: 6px 12px`, bottom hairline; keep the content             |
| Dialog                            | Not applicable                                                                         | Not applicable                                                              | Error line under the field as `ui-workspace/src/client/rows/WorkspaceBrowser.module.css` `.renameError`, `role="alert"`; keep the dialog open with the draft |

- [SHOULD] While a dialog operation runs, show a status line under the field as `ui-workspace/src/client/rows/WorkspaceBrowser.module.css` `.deleteStatus` with `role="status"`. Make the field read-only. Disable cancel, close, mask click, and Escape.
- [SHOULD] Show a helper line under the field in `--dsw-font-xxs-12` and `--dsw-alias-label-tertiary` when the confirm action has a consequence that the reader must know.

### 4.8 Content types

- Hierarchical list:
  - [SHOULD] Put a 10px marker slot on the leading side of each tree row, with the 6px round core of `StateDot.module.css` `.dot`. Color the core `--dsw-alias-state-business-primary` for the current item, `--dsw-alias-label-secondary` for its ancestors, and `--dsw-alias-label-caption` for other items.
  - [SHOULD] Draw the tree guide as a 1px line in `--dsw-alias-border-l2` through the marker column. Draw no elbows.
  - [SHOULD] Show one title line and one metadata line. Color the metadata `--dsw-alias-label-tertiary`. Truncate both lines with an ellipsis.
- Long text:
  - [SHOULD] Show it in `--dsw-alias-label-secondary` with `white-space: pre-wrap` and `overflow-wrap: anywhere`. Clamp it to six lines in lists. Show the full text only in the text field.
- Before-and-after text pair:
  - [SHOULD] Show two lines in `--dsw-font-xxs-12`, each led by a locale label. Show the earlier text in `--dsw-alias-label-tertiary` and the later text in `--dsw-alias-label-secondary`. Clamp each to two lines.
- Empty text value:
  - [SHOULD] Show the locale placeholder in `--dsw-alias-label-caption`. Never show a blank line or a dash.
- Identifier:
  - [SHOULD] Show the first 8 characters. Put the full value in the `title` attribute. Decision: 8 characters keep a metadata line on one line at the 320px pane minimum.
- Mutually exclusive set of two to four options:
  - [SHOULD] Show toolbar toggles with `role="radio"` and `aria-checked` inside a `role="radiogroup"`. Do not use a native `<select>`.

### 4.9 Responsive behavior

- [SHOULD] Hide the position label and the text-action labels of the header control cluster under `@container (max-width: 540px)`, as `ui-agent-preset/src/client/AgentPresetLabel.module.css` does. Keep glyphs and accessible names.
- [SHOULD] Set `container-type: inline-size` on the view split. Under `@container (max-width: 760px)`, stack the panes: the secondary pane goes first at full width with `max-height: 40%` and its own scroll, and a bottom hairline replaces its side hairline. Decision: 760px is the viewport width where the host trajectory detail pane leaves the side-by-side layout (`ui-trajectory/src/client/TrajectoryTable.module.css`, `@media (max-width: 760px)`); a container query applies the same width to the view itself.
- [SHOULD] Under the same container width, let the toolbar wrap with `row-gap: 4px` and `min-height: 32px`.
- [MUST] Keep `document.scrollingElement.scrollWidth` at or below the viewport width on every surface.

### 4.10 Motion

- [SHOULD] Transition only `color`, `background-color`, `border-color`, and `opacity`, over `var(--ds-transition-duration-fast)` with `var(--ds-ease-in-out)`.
- [SHOULD] Fade the dialog in with the `modalEnter` animation of `Modal.module.css`, over `var(--ds-transition-duration)` with `var(--ds-ease-in-out)`. Remove the dialog without an exit animation.
- [SHOULD] Pulse skeleton bars as `ui-plugin-manager/src/client/PluginManagerPage.module.css` `.skeletonFill` and `.skeletonBar` do.
- [MUST] Under `prefers-reduced-motion: reduce`, remove all plugin animations and transitions. Show the spinner as a static arc.
- [SHOULD] Do not animate size, position, or layout.

## 5. Available Primitives

Public names are the tokens in the table, the plugin components in the table, and the `--message-edit-*` properties of 4.3. Pages use only these names and do not guess other host token names.

- [MUST] Put plugin custom properties in the `--message-edit-*` namespace. Keep class names in plugin CSS Modules.
- [MUST] Do not style host selectors or host data attributes. The only host attribute the plugin sets is `data-conversation-composer-overlay` (3.3).
- [SHOULD] Do not change the layout, type, borders, or surfaces of a plugin primitive from a surface stylesheet. Add a variant to the component.

| Role                           | Implementation name or value                             | Source or path                                                                          | Usage condition                                     | Status                             |
| ------------------------------ | -------------------------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------- | ---------------------------------- |
| Color, type, and motion tokens | Tokens of 4.1, 4.2, 4.10                                 | `ui-theme/src/styles/design-platform.css`, `gradient-shadow-text.css`, `base.css`       | Every surface                                       | Implemented by host, both versions |
| Dialog shadow and mask blur    | `--dsw-shadow-lv3`, `--dsw-mask-blur`                    | `ui-theme/src/styles/gradient-shadow-text.css`                                          | Dialog only                                         | Implemented by host, both versions |
| Composer clearance             | `--dsh-composer-height`                                  | Set by `ui-conversation/src/client/skeleton/ConversationContent.tsx` in both versions   | View pane bottom padding only                       | Implemented by host                |
| Radius and focus width         | `--message-edit-radius-*`, `--message-edit-focus-width`  | Plugin CSS Modules                                                                      | Every surface root                                  | To be implemented                  |
| Header icon button             | `IconButton` variant `header`                            | `ui-schedule/src/client/ScheduleCatalogAction.module.css` `.trigger`                    | Header stepper                                      | To be implemented                  |
| Header text action             | `QuietAction` variant `header`                           | `ui-jobs/src/client/JobListAction.module.css` `.trigger`                                | Header text actions                                 | To be implemented                  |
| Message action button          | `IconButton` variant `row`                               | `ui-message-feedback/src/client/MessageFeedbackActions.module.css` `.action`            | Message action slot                                 | To be implemented                  |
| Toolbar control                | `QuietAction` variant `toolbar`                          | `ui-trajectory/src/client/TrajectoryToolbar.module.css` `.toggle`, `.action`            | View toolbar                                        | To be implemented                  |
| Button                         | `Button` variants `primary`, `outline`; sizes `md`, `sm` | `Button.module.css`                                                                     | `md`: dialog footer; `sm` `outline`: retry in panes | To be implemented                  |
| Dialog                         | `Dialog`                                                 | `Modal.module.css`, `ui-primitives/src/Modal.tsx`, `ui-primitives/src/useModalLayer.ts` | Native `<dialog>` opened with `showModal()`         | To be implemented                  |
| Text field                     | `TextField` (multi-line)                                 | `ui-message-feedback/src/client/FeedbackDialog.module.css` `.detail`                    | Dialog body                                         | To be implemented                  |
| Option row, tree row           | `ListRow` variants `option`, `tree`                      | `Menu.module.css` `.item`                                                               | Dialog choices; hierarchical list                   | To be implemented                  |
| Tooltip                        | `Tooltip` in a `popover="manual"` bubble                 | `Tooltip.module.css`, `ui-primitives/src/Tooltip.tsx`                                   | Every icon-only control                             | To be implemented                  |
| Marker and spinner             | `StateDot` (`dot`, `ongoing`)                            | `StateDot.module.css`, `ui-primitives/src/StateDot.tsx`                                 | Tree marker; in-progress glyph                      | To be implemented                  |
| Icons                          | Icon components                                          | `ui-primitives/src/icons/index.tsx`                                                     | 4.5                                                 | To be implemented                  |

Dialog markup sketch (not runnable; literal copy in place of locale text):

```tsx
<dialog ref={dialogRef} className={css.dialog} aria-label="Title" onCancel={onCancel}>
  <div className={css.content}>
    <div className={css.header}>
      <h2 className={css.title}>Title</h2>
      <button type="button" className={css.close} aria-label="Close" onClick={close}>
        <IconClose size={14} />
      </button>
    </div>
    <div className={css.body}>
      <textarea className={css.field} aria-label="Text" data-modal-autofocus />
    </div>
  </div>
  <div className={css.footer}>
    <Button variant="outline" size="md" onClick={close}>
      Cancel
    </Button>
    <Button variant="primary" size="md">
      Save
    </Button>
  </div>
</dialog>
```

| Glossary name                | Meaning                                                     |
| ---------------------------- | ----------------------------------------------------------- |
| Header control cluster       | The plugin entry in `conversation.session.header.actions`   |
| Stepper                      | Icon button, position label, icon button, in that order     |
| Message action button        | An icon button in `conversation.chat.assistant-actions`     |
| Conversation view            | The plugin entry in `conversation.view`                     |
| Toolbar row                  | The sticky row at the top of the conversation view          |
| Primary pane, secondary pane | The leading flexible pane and the trailing fixed-width pane |
| Group header                 | The sticky band that starts a group in the primary pane     |
| Tree row                     | One row of the hierarchical list                            |
| Dialog                       | The native `<dialog>` the plugin opens with `showModal()`   |
| Text field                   | The multi-line field of the dialog                          |
| Option row                   | A selectable row in a choice dialog                         |
| Quiet action                 | A text control without fill in the header or the toolbar    |

## 6. Copy and Number Formats

- [MUST] Show every visible string, tooltip, and accessible name in the active host locale, `zh` or `en`. A locale switch updates the view tab label and all plugin text without a reload.
- [SHOULD] Write labels, buttons, and tooltips as short verb phrases. Name the result in confirm buttons (Save, Retry). Do not use "OK".
- [SHOULD] In `en`, use sentence case. End no label, button, tooltip, status, or error line with a period.
- [SHOULD] In `zh`, use full-width punctuation, 你 rather than 您, and no exclamation marks. Put one space between an Arabic numeral and the following Chinese word (`共 3 项`).
- [SHOULD] Write progress labels in the progressive form (`正在保存`, `Saving`) without an ellipsis.
- [SHOULD] Write an error line as "Could not <verb> <object>" or `<对象><动作>失败`. Add a second clause after a semicolon (en) or a comma (zh) when something stayed unchanged. Put raw error detail after a colon. Do not show stack traces, file paths, or internal event names.
- [SHOULD] Write an empty-state line as a fact about the content, without instructions.
- [SHOULD] Show times in local time as the host message clock does (`ui-chat/src/client/chat/message-chrome.ts`): same day `HH:mm`; same year `{m}月{d}日 HH:mm` or `{m}/{d} HH:mm`; other years `{y}年{m}月{d}日 HH:mm` or `{y}-{m}-{d} HH:mm`. Show no seconds.
- [SHOULD] Show counts as integers with locale grouping. Use singular and plural forms in `en` and one form in `zh`.
- [SHOULD] Show positions as 1-based integers in a locale template (`2 / 5`).
- [SHOULD] Show identifiers untranslated.

## 7. Anti-Patterns

- [SHOULD] Do not use a centered hero with a card grid as a page structure.
- [SHOULD] Do not put cards inside cards. Do not frame panes, groups, or items with bordered rounded boxes.
- [SHOULD] Do not use decorative icon tiles or colored icon backgrounds.
- [SHOULD] Do not write font sizes, font weights, or color literals outside the primitives.
- [SHOULD] Do not put primary information in `--dsw-alias-label-caption` or in `--dsw-font-xxxs-11`.
- [SHOULD] Do not use pill labels for metadata or for the current item.
- [MUST] Do not reference `--dsw-alias-bg-mask` or `--dsw-alias-bg-module-hover`. Neither DSH version defines them.
- [MUST] Do not append nodes to `document.body`, portal, or insert nodes into host rows with DOM queries or `MutationObserver`.
- [MUST] Do not import DSH client component packages at runtime. Copy them (Chapter 5).
- [SHOULD] Do not use text characters such as arrows as icons.
- [SHOULD] Do not use filled buttons in the header, the toolbar, or rows.
- [SHOULD] Do not nest a scrolling text area inside a scrolling pane. Clamp the text.

## 8. Implementation and Integration

- Style entry point: plugin CSS Modules in the client bundle. No global stylesheet.
- Fonts: inherited through the 4.1 tokens. The plugin loads no font files.
- Theme switching: automatic through host tokens on `body`. The plugin keeps no theme state.
- Component sources: the host paths of Chapter 5, copied into plugin components with the 4.3 replacements.

Review checks, run on both DSH versions in both themes:

1. Scan the built CSS: every `var(--name)` is a Chapter 5 token, a `--message-edit-*` property, or `--dsh-composer-height`. No `#hex`, `rgb(`, or `hsl(` literal and no literal `font-size` or `line-height` occurs.
2. For every plugin element and every `var(--name)` in its rules, `getComputedStyle(element).getPropertyValue('--name')` is non-empty.
3. With the dialog open, `document.body.childElementCount` is unchanged, the plugin `<dialog>` has the `open` attribute, and it matches `:modal`.
4. Press Tab through each surface. Each focused element has a computed `outline-style` other than `none`, the hover fill, or the field focus edge.
5. Press Escape in the dialog. The dialog closes and `document.activeElement` is the invoking control.
6. With `prefers-reduced-motion: reduce`, every plugin element has `animation-name: none` and a `0s` transition duration.
7. Switch between `zh` and `en`. No visible text equals a dictionary key, and the view tab label changes.
8. At 1440px and 390px viewport widths, `document.scrollingElement.scrollWidth` is at most the viewport width.

## Open Items

- [UNCONFIRMED] On Desktop 0.2.1 macOS, the dialog backdrop also covers the native caption strip. Source: the top-layer `::backdrop` covers the whole viewport, and the host mask starts below `--dsh-frame-chrome-top`, which only 0.2 publishes.
- [UNCONFIRMED] In 0.1.0-rc.3 the header labels stay visible at every width. Source: the 0.1.0-rc.3 title row declares no `container-type`, so the 4.9 container query has no container.
