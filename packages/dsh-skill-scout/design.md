---
name: dsh-skill-scout-design
description: Presentation rules for the DeepSeek Harness (DSH) Web UI surfaces that @agent-stash/dsh-skill-scout renders through slots, namely a header icon with a floating inbox panel, a master-detail conversation view, a main panel page whose sections are a master-detail, a long list with selection, and a dashboard, and the detail panel embedded in both master-details. Applies to DSH 0.2.1-rc.3 and later, light and dark themes, pointer-and-keyboard desktop readers. Every surface must read as native DSH chrome.
version: 2f1cdce
---

# dsh-skill-scout design

Host references use two locations:

- Primitive components: `@deepseek-ai/dsh-client-ui-primitives`, which the DSH module table supplies at runtime. Their source is `ui-primitives/src/<Name>.tsx` and `<Name>.module.css`.
- Other host code: `packages/client/<package>/src/...` in the DSH repository at tag `dsh-v0.2.1-rc.2`. Paths below omit `packages/client/`. Within one table cell, later file names share the package of the first path.

## 1. Scope and Priority

| Surface                | Slot                                    | Page type                                                                             | Host reference                                                                                                                    |
| ---------------------- | --------------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Header entry and inbox | `conversation.session.header.utilities` | Header icon with a floating panel                                                     | `ui-schedule/src/client/ScheduleCatalogAction.module.css`, `ui-jobs/src/client/JobListAction.module.css`                          |
| Conversation view      | `conversation.view`                     | Master-detail in a conversation view                                                  | `ui-trajectory/src/client/views.module.css`, `TrajectoryTable.module.css`                                                         |
| Main panel page        | `main`, entry in `sidebar.panellist`    | Main panel page with section tabs: master-detail, long list with selection, dashboard | `ui-plugin-manager/src/client/PluginManagerPage.module.css`, `ui-schedule/src/client/TaskManagerPage.module.css`                  |
| Detail panel           | Inside both master-details              | Embedded detail panel                                                                 | `ui-schedule/src/client/TaskManagerPage.module.css` `.detail*`, `ui-trajectory/src/client/TrajectoryTable.module.css` `.details*` |

This file does not apply to the plugin settings page in `plugins.row.config` (it renders the host `SettingsForm`), to host chrome (session title, view tab strip, sidebar row, composer), to the README and docs site, or to the bundle icon.

Resolve conflicts in this order:

1. User requirements: host tokens and host primitives only; `zh` and `en`; light and dark themes.
2. Accessibility: visible focus, keyboard operation, reduced motion.
3. Reader tasks on each surface: see what needs a decision, decide, move on.
4. DSH host conventions of the references in this file.
5. Decisions in this file.
6. Decorative detail.

## 2. Brand and Readers

- [MUST] Show no plugin brand: no logo, brand color, custom font, or illustration. The only plugin glyph is `IconSkillOutlineRegular` on the header entry and the sidebar entry.
- [SHOULD] Build hierarchy with type role and ink, not with frames. Each level of 3.1 differs from the next level in size or weight and in ink.
- [SHOULD] Use one accent, `--dsw-alias-state-business-primary`: the selected tab, checked options, focus rings, links, and the first series of a neutral chart. Status hues appear only in status markers (4.3), error and notice text (4.2), and result encodings (4.8).
- [SHOULD] Put at most one filled button in one action region (view header, page header, detail footer, selection bar).
- [SHOULD] Keep chrome text in the 11 to 16px roles. The page title (20px) and KPI values (24px) are the only larger text.

Readers are developers on laptop and desktop screens with a pointer and a keyboard. They scan many items, open one, decide, and return to the list. Side panels can make the conversation column narrow. They switch between `zh` and `en` and between themes. Copy is short and neutral (Chapter 6).

## 3. Page Structure and Composition

### 3.1 Hierarchy levels

| Level       | Element                                             | Type role                                                                                     | Ink                                        |
| ----------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Page        | Main panel page title (`h1`)                        | `--dsw-font-l-20`                                                                             | primary                                    |
| View header | Conversation view status title                      | `--dsw-font-s-strong-14`                                                                      | primary                                    |
| Panel       | Detail panel title (`h2`)                           | `--dsw-font-base-strong-16`                                                                   | primary                                    |
| Group       | Group header in a list, dashboard card title (`h2`) | `--dsw-font-s-strong-14`; count after it in `--dsw-font-xs-13`                                | primary; count tertiary                    |
| Row         | Row title                                           | `--dsw-font-xs-strong-13` in panes and popovers, `--dsw-font-s-strong-14` in main panel lists | primary                                    |
| Row text    | Summary or matched line                             | `--dsw-font-xxs-12` in panes, `--dsw-font-xs-13` in main panel lists                          | secondary                                  |
| Metadata    | Status word, source, counts, time                   | `--dsw-font-xxs-12`                                                                           | status word secondary (4.3), rest tertiary |

- [SHOULD] Render one `h1` on the main panel page and none in the conversation view, where the host tab names the view.
- [SHOULD] Compose a row as: a 16px leading marker column, then a content column with the title line, at most two summary lines, and one metadata line, then a trailing action column. Space the lines 2px apart. Separate metadata items with `" · "` as `TaskManagerPage.module.css` `.metadata + .metadata::before` does.
- [SHOULD] Start the metadata line with the status word, so the word sits beside the colored marker.
- [SHOULD] Keep one row kind per group. Rows that represent records the items came from (record rows) carry no summary line and one code line (4.10), and follow the groups of decision items.
- [SHOULD] Space groups 16px apart in panes and 32px apart in main panel lists, with 8px from the group header to its first row. Give each group header a 36px row with the title, the count, and an optional trailing chevron button that collapses the group.

### 3.2 Conversation view (master-detail)

First viewport, top to bottom:

1. View header row: 48px, `padding: 0 16px`, bottom hairline `--dsw-alias-border-l2`. Leading: a `StateDot` for the view's own state, the status title, and the metadata. Trailing: the actions of 4.4.
2. Notice row, only while a notice applies (4.9).
3. Split area that fills the remaining height: the list pane on the leading side, sized like the trajectory `.details` pane (`width: clamp(320px, 38%, 440px)`), with a trailing hairline `--dsw-alias-border-l2`; the detail panel (3.6) on the trailing side, flexible.

- [SHOULD] Put `data-conversation-composer-overlay` on the view root and lay it out like the trajectory `.root`: a full-height flex column on `--dsw-alias-bg-layer-1` that does not scroll.
- [SHOULD] Give each pane its own vertical scroll and pad its bottom with `calc(var(--dsh-composer-height, 152px) + 16px)`, as the trajectory `.ledger` does.
- [SHOULD] Make group headers sticky at the top of the list pane, on the pane background. Decision: the list pane mixes decision items and record rows, and the sticky header keeps the current kind visible (`ui-trajectory/src/client/TrajectoryTurnHeader.module.css` uses the same sticky band).
- [SHOULD] Start a record group collapsed when the pane has at least one decision item and the record group has more than five rows.
- End position: the last row of the list pane; the detail panel footer above the composer clearance.

### 3.3 Main panel page frame

- [SHOULD] Lay out the page like the Tasks page (`TaskManagerPage.module.css` `.page`, `.listPane`, `.pageScroll`, `.pageContent`): a full-height flex row on `--dsw-alias-bg-base`; a scrolling leading pane with a centered 960px column and `padding: 0 clamp(24px, 4vw, 48px) 48px`; an optional trailing detail pane (3.4).
- [SHOULD] Start the column with the header row of `.pageHeading`: `padding-top: 28px` (on `[data-platform='darwin']` `calc(28px + var(--dsh-frame-top-clearance, 0px))`), `data-window-drag`, the `h1` on the leading side, page actions on the trailing side with a 16px gap.
- [SHOULD] Put the section tabs under the header as the Plugins page does (`PluginManagerPage.module.css` `.pageTabs`, `.pageTabList`): `SegmentedTabs` with `width: fit-content` and `min-width: 240px`, 16px below the title. Decision: this is the host's page-section pattern; a value switch beside the title reads as a setting.
- End position: the last row or card, then the 48px bottom padding. No footer.

### 3.4 Master-detail section

- [SHOULD] Put the rows in the leading pane under the section tabs, as `TaskManagerPage.module.css` `.listRows` and `.row`: 2px apart, `padding: 8px`, `border-radius: var(--dsw-radius-md)`, hover fill.
- [SHOULD] Show the selected row with `--dsw-alias-interactive-bg-active` and keep hover on `--dsw-alias-interactive-bg-hover`. Decision: the Tasks page paints both with the hover fill; the trajectory table separates them, and the separation shows the selection while the pointer rests elsewhere.
- [SHOULD] Give the trailing detail pane `flex: 0 0 47%`, a leading hairline `--dsw-alias-border-l4`, `--dsw-alias-bg-base`, and the `--detail-gutter` steps of `TaskManagerPage.module.css`: 24px, 20px under 1100px, 16px under 400px.
- [SHOULD] When a row is selected from outside the page, scroll it into view and run the Plugins page highlight (`.card[data-plugin-highlight]`, `dsh-plugin-highlight`) on it once.

### 3.5 Long list with selection

First viewport, top to bottom: header and section tabs; query row (search field, then filter chips); scope line with background progress (4.9); result count line; rows.

- [SHOULD] Copy the search field from `TaskManagerPage.module.css` `.searchField` (36px, 0.5px `--dsw-alias-border-l3`, focus edge in the accent) with `IconSearchOutlineRegular` at 14px and the inline clear button `.searchClear`.
- [SHOULD] Show a filter of up to eight options as the chip row of `.filterTabs` and `.filterTab` (28px chips, tertiary ink; selected chip on the hover fill with primary ink). Wrap the chips under the field when the row is narrow.
- [SHOULD] Lead each selectable row with a `Checkbox` in the marker column and put the result dot (4.3) before the title. Reveal the row's trailing icon actions on hover and `:focus-within`.
- [SHOULD] While at least one row is selected, show a selection bar sticky at the bottom of the scroll area, styled as `TaskManagerPage.module.css` `.saveFooter`: top hairline `--dsw-alias-border-l4`, `--dsw-alias-bg-base`, the count leading, the actions of 4.4 trailing. Decision: a bottom bar keeps the action in view while the reader scrolls and selects.

### 3.6 Embedded detail panel

Top to bottom:

1. Header block, fixed: `h2` title (two-line clamp), one metadata line, an optional kind label (4.3), and the sibling pager (4.5) on the trailing side. Padding: 20px top, the gutter on both sides (24px on the main panel, 16px in the conversation view).
2. Step indicator (4.6) with its next-step line, 12px under the metadata line.
3. Content tab strip (4.5) with the tab's icon actions at its trailing end.
4. Body, the only scrolling part: `padding: 20px <gutter> 28px`. Prose uses `--dsw-font-s-14`; field labels use `--dsw-font-xxs-12` tertiary.
5. Footer action bar, fixed: top hairline (`--dsw-alias-border-l4` on the main panel, `--dsw-alias-border-l2` in the conversation view), `padding: 12px <gutter>`, actions of 4.4.

- [SHOULD] Keep the header, step indicator, tab strip, and footer outside the scroll. Decision: the reader must see the current stage and the primary action while reading a long body (`TaskManagerPage.module.css` keeps `.detailTabsBar` and `.saveFooter` fixed the same way).
- End position: the footer action bar.

### 3.7 Floating inbox panel

- [SHOULD] Render the trigger as `ScheduleCatalogAction.module.css` `.trigger`: a 28px round icon button with `IconSkillOutlineRegular` at 16px, tertiary ink, hover fill, and the hover state while open. Register it with `order` 30, after the host reminder entry (order 20).
- [SHOULD] Show the count of new items as a badge at the trigger's top-right corner: 14px tall capsule, `min-width: 14px`, `--dsw-font-xxxs-strong-11` with tabular numbers, fill `--dsw-alias-label-secondary`, ink `--dsw-alias-bg-layer-1`, and `9+` above nine.
- [SHOULD] Give the panel the host popover material: `--dsw-specific-menu`, `backdrop-filter: var(--dsw-menu-backdrop-filter)`, `--dsw-elevation-stroke-color: var(--dsw-alias-border-l1)`, `box-shadow: var(--dsw-elevation-prominent)`, radius 16px, padding 4px, width 360px, `max-height: min(480px, calc(100vh - 140px))`, 5px below the trigger.
- [SHOULD] Compose it top to bottom: header row (title, working status, one trailing link that opens the main panel page); scrolling sections with `JobListAction.module.css` `.sectionHeader` labels (11px tertiary, hairline `--dsw-alias-border-l1` above every label but the first); rows as `ScheduleCatalogAction.module.css` `.row` (`padding: 10px 12px`, radius 10px, hover fill) with the marker column of 3.1; one notice row at the bottom.
- [SHOULD] Show closed rows (4.3 "Closed") with tertiary title ink, as `TaskManagerPage.module.css` `.endedRow` does, and put them in the last section, collapsed.

## 4. Visual Rules

### 4.1 Typography

- [MUST] Set text with the `font` shorthand tokens of 3.1 and this table. Do not write literal font sizes, line heights, or weights.
- [SHOULD] Use `font-variant-numeric: tabular-nums` for counts, times, KPI values, table numbers, and axis ticks.

| Type role                                                         | Token                                                              |
| ----------------------------------------------------------------- | ------------------------------------------------------------------ |
| Content tab label                                                 | `--dsw-font-xs-strong-13`                                          |
| Detail prose, empty-state line                                    | `--dsw-font-s-14`                                                  |
| Popover row title, tooltip                                        | `--dsw-font-xs-13`                                                 |
| Buttons `sm`, field label, step label, notice, legend, table cell | `--dsw-font-xxs-12`                                                |
| Table header, current step label                                  | `--dsw-font-xxs-strong-12`                                         |
| Axis tick, popover section label                                  | `--dsw-font-xxxs-11`                                               |
| KPI value                                                         | `--dsw-font-xl-24`                                                 |
| Commands, identifiers, matched lines                              | `--dsw-font-xxs-12` with `font-family: var(--ds-font-family-code)` |
| Rendered document                                                 | `MarkdownText` (host markdown tokens)                              |

### 4.2 Color and themes

- [MUST] Reference only the public names of Chapter 5. Write no color literals and no theme selectors such as `body[data-ds-dark-theme]`. The host switches every token between light and dark.
- [SHOULD] Make tints only with `color-mix(in srgb, <token> N%, transparent)`, N from 10 to 55.

| Color role                                           | Token                                                                                  |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Main panel surface                                   | `--dsw-alias-bg-base`                                                                  |
| Conversation view surface                            | `--dsw-alias-bg-layer-1`                                                               |
| Card and KPI tile                                    | fill `--dsw-alias-settings-card-fill`, 0.5px stroke `--dsw-alias-settings-card-stroke` |
| Hairline between rows and table rows                 | `--dsw-alias-border-l1`                                                                |
| Hairline between panes, under headers and tab strips | `--dsw-alias-border-l2`                                                                |
| Outline button, search field, connector line         | `--dsw-alias-border-l3`                                                                |
| Main panel detail edge and footers                   | `--dsw-alias-border-l4`                                                                |
| Primary, secondary, metadata, placeholder ink        | `--dsw-alias-label-primary`, `-secondary`, `-tertiary`, `-caption`                     |
| Hover fill; selected row fill                        | `--dsw-alias-interactive-bg-hover`; `--dsw-alias-interactive-bg-active`                |
| Accent                                               | `--dsw-alias-state-business-primary`                                                   |
| Error text                                           | `--dsw-alias-state-error-primary`                                                      |
| Attention notice                                     | fill `--dsw-alias-state-warn-tertiary`, glyph `--dsw-alias-state-warn-primary`         |
| Skeleton                                             | `--dsw-alias-bg-skeleton`                                                              |

### 4.3 Status markers and kind labels

- [SHOULD] Mark every item row, record row, step, and view state with `StateDot` (10px slot, 14px when `ongoing`). Map status classes as the host semantics do (`ui-primitives/src/StateDot.tsx`: green done, amber attention, grey loading, red error, neutral idle). The product assigns each status to one class.

| Status class                | `StateDot state` | Status word ink                      | Title ink |
| --------------------------- | ---------------- | ------------------------------------ | --------- |
| Needs the reader's decision | `warning`        | `--dsw-alias-label-secondary`        | primary   |
| Work in progress            | `ongoing`        | tertiary inside `TextShimmer active` | primary   |
| Failed                      | `error`          | `--dsw-alias-state-error-primary`    | primary   |
| Done                        | `done`           | `--dsw-alias-label-secondary`        | primary   |
| Not started                 | `idle`           | `--dsw-alias-label-tertiary`         | secondary |
| Closed                      | `idle`           | `--dsw-alias-label-tertiary`         | tertiary  |

- [SHOULD] Map a result scale to dots: positive results `done`, contested `warning`, negative `error`, unknown and cancelled `idle`.
- [SHOULD] Show one kind label after the detail title as `Tag tone="outline"` when the kind changes how the reader reads the item. Rows carry no tags.

### 4.4 Actions

- [SHOULD] Place actions by region:

| Region        | Primary (filled)                                             | Secondary                                                                                                          | Others                                                                                               |
| ------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| View header   | `Button variant="primary" size="sm"` at the trailing end     | `Button variant="ghost" size="sm"` left of the primary                                                             | none                                                                                                 |
| Page header   | at most one; none when the section owns its primary          | `ghost` or `outline` `sm`                                                                                          | none                                                                                                 |
| Detail footer | trailing; a split button when the action has a target choice | one `ghost` `sm` at the leading end for the most frequent declining action                                         | overflow `Menu` from a 28px icon button with `IconEllipsisOutlineRegular`, right of the ghost button |
| Tab strip     | none                                                         | 28px icon buttons at the trailing end that act on the shown tab                                                    | none                                                                                                 |
| Row           | none                                                         | 24px icon buttons at the trailing end, revealed on hover and `:focus-within`, always visible under `(hover: none)` | none                                                                                                 |
| Selection bar | trailing                                                     | `ghost` clear button left of it                                                                                    | none                                                                                                 |

- [SHOULD] Build the split button from `PluginManagerPage.module.css` `.addGroup`, `.addPrimary`, `.addMore`: a 32px primary segment whose label names the current target, and a 32px chevron segment (`IconChevronDownOutlineRegular` 12px) that opens a `Menu` aligned to its end with `selection="check"`. Decision: one control replaces a separate target switch beside the primary button.
- [SHOULD] Use `IconEditOutlineRegular` for edit and `IconRefreshOutlineRegular` for regenerate and retry, at 14px, with a `Tooltip` (`side="bottom"`) and an `aria-label`. Mark a toggled edit button with `aria-pressed` and the hover fill.
- [SHOULD] Mark destructive menu rows with `danger`. Do not put destructive actions in the primary slot.
- [SHOULD] While an action runs, show the `ongoing` `StateDot` in the acting button, use the progressive label, and disable the other buttons that start operations.
- [SHOULD] When an action is unavailable for a reason the reader can fix, keep it focusable with `aria-disabled="true"`, the disabled look (`opacity: 0.4`), and a `Tooltip` naming the reason.

### 4.5 Section tabs, content tabs, pager, and list continuation

- [SHOULD] Switch main panel sections with `SegmentedTabs` (3.3). Do not use `SegmentedControl` for sections or content tabs; it is for value choices in settings.
- [SHOULD] Draw content tabs as the underline strip of `TaskManagerPage.module.css` `.detailTabsBar`, `.detailTabs`, `.detailTab`: tabs 36px apart, tertiary ink, selected tab in the accent with a 2px accent underline over the strip hairline, 44px bar on the main panel and 37px in the conversation view (`.tabBody > .detail .detailTabsBar`). The strip scrolls sideways without a scrollbar when it is too narrow.
- [SHOULD] Omit a tab that has no content for the current stage. Keep the order of the remaining tabs stable.
- [SHOULD] Navigate a set of sibling items with a pager in the detail header, as `ui-user-questions/src/client/QuestionComposer.module.css` `.pager`, `.progress`, `.iconButton`: 24px round buttons with `IconChevronLeftOutlineRegular` and `IconChevronRightOutlineRegular`, and an `n / m` position label in `--dsw-font-xs-strong-13` secondary. The label opens a `Menu` that lists every sibling with its `StateDot` as the row icon and the current one checked. Show the pager only for sets of two or more. Decision: the pager shows the position in one line at any width.
- [SHOULD] End a list that can load more rows with a full-width quiet row as `TrajectoryTable.module.css` `.historyLoadButton` (32px, `--dsw-font-xxs-12` secondary, hover fill). When no more rows can load, end with a tertiary count line. Do not use numbered page buttons.

### 4.6 Lifecycle step indicator

- [SHOULD] Show an item that moves through an ordered sequence of two to five stages as a step row: each step is a 16px `StateDot appearance="step"` followed by its label, gap 6px; steps are joined by a 12px line of 1px `--dsw-alias-border-l3` with 8px on each side. Decision: `StateDot` ships the step appearance (filled check when done, ring otherwise) for this use.
- [SHOULD] Make the current step the step that the item's status word names, and give its dot the item's status class (4.3): waiting for the reader `warning`, running `ongoing`, failed `error`, not started `idle`. A step whose output waits for the reader stays current until the reader acts. Earlier steps are `done` with secondary labels, later steps `idle` with tertiary labels, and the current label uses `--dsw-font-xxs-strong-12` primary. A closed item shows every step in tertiary ink with `idle` dots.
- [SHOULD] Under the step row, keep one next-step line in `--dsw-font-xxs-12` secondary in every state, so the tab strip does not move. While the reader can act, it starts with the verb of the footer primary action; while a step runs, it states what the step produces; for a failed step, it states the failure in error ink and the footer primary becomes the retry. The step row and this line carry the state, so the detail metadata line leaves out the status word.
- [SHOULD] Under a 360px container width, hide the labels of all steps but the current one. Put each step name and state in the step's `aria-label`.

### 4.7 Tables

- [SHOULD] Show records with three or more comparable attributes as a table. Do not join the attributes into one right-aligned metadata string.
- [SHOULD] Copy the geometry of `TrajectoryTable.module.css` `.table`: `table-layout: fixed`; header cells 30px, `--dsw-font-xxs-strong-12` tertiary, bottom hairline `--dsw-alias-border-l2`; body cells 34px, `--dsw-font-xxs-12`, bottom hairline `--dsw-alias-border-l1`, one line with an ellipsis and the full value in `title`.
- [SHOULD] Lead with the name column (dot and title). Size the other columns to their longest expected value and give the remaining width, at least 30% of the table, to the name column. Decision: the name identifies the row; the other columns hold short values. Right-align numeric columns and their headers with tabular numbers. Put time last. A row that opens an item takes the hover fill and an inset 1px accent focus ring, as `TrajectoryTable.module.css` `tbody tr:focus-visible`.
- [SHOULD] Under a 620px container width, hide the columns the page marks optional. The name column never hides. Decision: 620px is the host table's compact width (`@container trajectory-table (max-width: 620px)`).

### 4.8 Charts

- [SHOULD] Choose the chart by data shape:

| Data shape                                                                          | Chart                                                               | Component                                  |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------ |
| Daily counts split into categories, with one overlay count, over a continuous range | Stacked columns with a step area                                    | `StackedBarArea`                           |
| Short trend of one count beside a ranked row or KPI (8 to 30 points)                | Line without axes, 64×20 in rows, 80×24 in tiles                    | `Sparkline`                                |
| Share of a whole across up to six categories                                        | One 100% bar, 8px tall, track `--dsw-alias-interactive-bg-hover`    | `ShareBar`                                 |
| Ranked items by count (top five)                                                    | Rows: label, count, bar relative to the top row, optional sparkline | `RankedList`                               |
| Value against a target per category                                                 | Horizontal bullet                                                   | `BulletChart` (`orientation="horizontal"`) |
| One bounded ratio that heads a dashboard                                            | Segmented ring                                                      | `RadialGauge`, at most one per page        |

- [SHOULD] Draw one unit per chart. When one source item yields several output items, chart the sources and the outputs separately with their own scales and unit labels.
- [SHOULD] Keep time axes continuous: one column per day, empty days as gaps, no rows per date. Pick the tick interval from the measured width of the longest label in the active locale plus a 12px gap, so labels never touch. Always label the first and last day; anchor the first label to the plot start and the last label to the plot end.
- [SHOULD] Start value axes at 0 with a rounded top, three to five ticks, value axis on the trailing side. Draw gridlines as 0.5px `--dsw-alias-border-l1` and the baseline as 0.5px `--dsw-alias-border-l2`. Set ticks in `--dsw-font-xxxs-11` tertiary.
- [SHOULD] Place the legend above the plot, leading-aligned, in `--dsw-font-xxs-12` secondary with 8px swatches of 2px radius (`ui-conversation/src/client/skeleton/ContextMeter.module.css` `.swatch`). Each item shows its total for the shown range. List only categories with a nonzero total. A legend item toggles its series with `aria-pressed`; hidden items take tertiary ink and a line-through.
- [SHOULD] Style chart tooltips as the host tooltip: `--dsw-alias-tooltip-bg`, ink `--dsw-static-neutral-bluish-00`, `border-radius: var(--dsw-radius-sm)`, `padding: 6px 8px`, `--dsw-font-xxs-12`. Head with the date or name; list rows as swatch, label, right-aligned value; omit zero rows.
- [SHOULD] Color result categories with state tokens: strongest positive `--dsw-alias-state-success-primary`, positive `color-mix(in srgb, var(--dsw-alias-state-success-primary) 50%, transparent)`, unknown `--dsw-alias-state-idle-primary`, contested `--dsw-alias-state-warn-primary`, negative `--dsw-alias-state-error-primary`, cancelled `--dsw-alias-border-l3`. Color item-status categories by their 4.3 status class, so a share matches the row dots: needs decision `--dsw-alias-state-warn-primary`, in progress `--dsw-alias-label-tertiary`, failed `--dsw-alias-state-error-primary`, done `--dsw-alias-state-success-primary`, not started `--dsw-alias-state-idle-primary`, closed `--dsw-alias-border-l3`; when two categories share a class, the earlier stage takes the class color at 50%. Color up to four neutral quantity series in this order, so the first series stays the most prominent in both themes: the accent, `--dsw-alias-label-tertiary`, the accent at 50%, `--dsw-alias-border-l3`. Draw overlay areas in `--dsw-alias-label-secondary`.
- [SHOULD] Bind the chart color properties on the chart root: `--chart-text` primary, `--chart-text-2` secondary, `--chart-text-3` tertiary, `--chart-grid` `--dsw-alias-border-l1`, `--chart-axis` `--dsw-alias-border-l2`, `--chart-surface` card fill, `--chart-track` hover fill, `--chart-accent` accent, `--chart-success`, `--chart-warning`, `--chart-danger` the state primaries. Set `--chart-font` to `inherit` from the 4.1 role.
- [SHOULD] Paint bars at full opacity and separate stacked segments with a 1px gap in the surface color. Do not encode value with opacity. On hover, fade the other series to 0.35 opacity.
- [SHOULD] Size charts at 180px tall for the primary series and 140px for card charts. With no nonzero value in range, keep the height and show one centered line in `--dsw-font-xs-13` tertiary, without axes or legend.
- [SHOULD] Give every chart an `ariaLabel` that names the measure and the range.

### 4.9 Data states

| Surface                                     | Loading                                                                                                                          | Empty                                                                                           | Error                                                                               |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Conversation view and master-detail section | First load: three skeleton rows per pane. Refresh: keep content, `aria-busy` on panes, `ongoing` dot in the header               | One tertiary line under the group header; detail pane without a selection: centered empty state | Notice row under the header in error ink with an `outline` `sm` retry; keep content |
| Detail panel                                | Skeleton body; during an operation, the progress block (phase line, elapsed time, skeleton bars that light up as output arrives) | Not applicable                                                                                  | Error line above the footer actions, `role="alert"`; keep the body                  |
| Long list                                   | Skeleton rows; keep the old results while a new query runs                                                                       | Centered empty state naming the query                                                           | Error line with retry under the query row                                           |
| Dashboard                                   | KPI value as a 24px skeleton bar; chart areas as skeleton blocks of the chart height                                             | Chart empty line (4.8); KPI value `0`                                                           | One error line inside the affected card                                             |
| Inbox panel                                 | Render no trigger before the first data                                                                                          | Title and one fact line                                                                         | Error row with a retry link                                                         |

- [SHOULD] Copy the centered empty state from `TaskManagerPage.module.css` `.empty` and `.emptyGlyph`: `padding: 48px 20px`, 24px caption glyph, one line in `--dsw-font-s-14` tertiary, an optional action 16px below. Copy skeletons from `PluginManagerPage.module.css` `.skeletonFill` and `.skeletonBar`.
- [SHOULD] Show a condition that limits the surface (a missing setting, work in another window) as the notice band of `ui-plugin-market/src/client/DiscoverSection.module.css` `.notice` at the top of the affected region, with `IconWarningOutlineRegular` and at most one quiet link.
- [SHOULD] Show the result of an action with an undo link as a one-line notice where the action happened: at the top of the page region, at the bottom of the inbox panel, or, when no plugin surface is visible, in a popover under the header entry with the inbox material.
- [SHOULD] When background work ends, the dot and status word of the item's row carry the change. Raise the popover under the header entry only when no visible plugin surface lists the item.

### 4.10 Content types

- Command sequence: [SHOULD] one line in code font, secondary ink: the first three steps joined by a 10px tertiary `IconChevronRightOutlineRegular`, then `+N` in tertiary. Show the full sequence only in the detail body as an ordered list.
- Matched lines: [SHOULD] at most two lines in code font, one ellipsis line each; mark matched text with `<mark>` on `--dsw-alias-state-warn-tertiary`, `border-radius: 2px`, inherited ink.
- File path: [SHOULD] `PathLabel`, which keeps the file name visible and fades the leading directories.
- Rendered document: [SHOULD] `MarkdownText` placed directly in the body column, without a frame. When the document's first heading repeats the panel title, omit that heading. Show front-matter fields above it as a two-column list: label `--dsw-font-xxs-12` tertiary in a 96px column, value `--dsw-font-xs-13` primary, identifiers in code font. Show a change to a document with `DiffBlock`.
- Long free text: [SHOULD] two-line clamp in rows; full text in the detail body.
- Part of a whole: [SHOULD] one KPI tile with the part as the value, the whole in the context line ("of 53"), and a `ShareBar` under the context line. Do not show the part and the whole as sibling tiles.
- KPI tile: [SHOULD] label `--dsw-font-xxs-12` tertiary, value `--dsw-font-xl-24`, one context line `--dsw-font-xxs-12` tertiary, stacked and top-aligned so labels and values line up across the KPI row; `padding: 12px 14px`. An optional `Sparkline` (80×24) sits at the trailing end of the value line; the label and the context line keep the full tile width. The context line fits the tile at its narrowest width in every locale, without an ellipsis: it holds the whole or one comparison figure; figures that break down the value (parts, sources) go into its tooltip, not into a separate card.

### 4.11 Dashboard composition

- [SHOULD] Order the dashboard: a KPI row of three or four tiles (`repeat(4, minmax(0, 1fr))`, gap 12px); one full-width card with the primary time series; two columns of secondary cards; a full-width table card. Decision: the reader gets the overview before detail; structure taken from `dsh-context` `.lc-ov-kpis` and `.lc-ov-first`, the only DSH dashboard sample.
- [SHOULD] Give cards the settings card material (4.2), `border-radius: var(--dsw-radius-xl)`, `padding: 14px 16px`, and a header row with the title on the leading side and one summary figure or quiet control on the trailing side.
- [SHOULD] Stack the secondary cards in two columns that fill independently (gap 12px), not in rows, so a short card leaves no hole beside a tall one. Fill both columns in the same order: share card, ranked-list card, card chart. Only the primary time series and the table take a full-width row. Decision: list cards change height with their data, so cards paired in rows cannot stay level.
- [SHOULD] Do not put a card or tile inside a card.

### 4.12 Responsive behavior

- [SHOULD] Set `container-type: inline-size` on the conversation view split and the main panel page. Decision: side panels change these widths without changing the viewport; the widths below are the host media widths (`TaskManagerPage.module.css`, `TrajectoryTable.module.css`).
- [SHOULD] Under 760px, show one pane: the list fills the width; opening a row replaces the list with the detail panel, whose header leads with a 28px back button (`IconChevronLeftOutlineRegular`). On the main panel, the section tabs stay above the list.
- [SHOULD] Under 720px, show the KPI row in two columns and the two card columns as one column.
- [SHOULD] Let the view header wrap: the actions keep their labels and move to a second line; the metadata hides first.
- [MUST] Keep `document.scrollingElement.scrollWidth` at or below the viewport width at 390px and 1440px.

### 4.13 Motion

- [SHOULD] Transition only `color`, `background-color`, `border-color`, and `opacity`, over `var(--ds-transition-duration-fast)` with `var(--ds-ease-in-out)`. Do not animate size, position, or layout. Render charts without entry animation.
- [SHOULD] Keep the motion of host primitives as shipped: `SegmentedTabs` indicator, `Tooltip` fade, `StateDot` spinner, `TextShimmer`.
- [SHOULD] Fade the inbox panel in over 140ms with a 2px vertical offset. Remove it without an exit animation.
- [SHOULD] Pulse skeletons as `PluginManagerPage.module.css` `.skeletonFill` does. Light progress bars one by one as output arrives.
- [MUST] Under `prefers-reduced-motion: reduce`, remove plugin animations and transitions, show spinners as static arcs, keep `TextShimmer` static, and show the row highlight of 3.4 as a static ring.

## 5. Available Primitives

Public names are the tokens of Chapter 4, the host primitives and plugin components in the table, and the `--scout-*` and `--chart-*` properties. Pages use only these names and do not guess other host token names.

- [MUST] Put plugin custom properties in the `--scout-*` namespace; `--chart-*` belongs to the chart components. Keep class names in plugin CSS Modules.
- [MUST] Do not style host selectors or host data attributes, except `:global([data-platform='darwin'])` for the top clearance of 3.3. The plugin sets only `data-conversation-composer-overlay` (3.2) and `data-window-drag` (3.3).
- [SHOULD] Do not change the layout, type, borders, or surfaces of a primitive from a surface stylesheet. Add a variant to the component.

| Role                               | Implementation name or value                                                                                                                                                                                                                                                                           | Source or path                                                                                                                | Usage condition               | Status              |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ------------------- |
| Type, color, radius, motion tokens | Tokens of 4.1, 4.2, 4.13; `--dsw-radius-*`                                                                                                                                                                                                                                                             | `ui-theme/src/styles/design-platform.css`, `gradient-shadow-text.css`, `base.css`                                             | Every surface                 | Implemented by host |
| Layout properties                  | `--dsh-composer-height`, `--dsh-frame-top-clearance`                                                                                                                                                                                                                                                   | `ui-conversation`, `ui-layout/src/client/AppFrame.module.css`                                                                 | 3.2, 3.3                      | Implemented by host |
| Button                             | `Button` `variant` `primary`, `ghost`, `outline`; `size` `sm`                                                                                                                                                                                                                                          | `ui-primitives/src/Button.tsx`                                                                                                | 4.4                           | Implemented         |
| Section tabs                       | `SegmentedTabs`                                                                                                                                                                                                                                                                                        | `ui-primitives/src/SegmentedTabs.tsx`                                                                                         | Main panel sections           | To be implemented   |
| Status and step marker             | `StateDot` `appearance` `dot`, `step`                                                                                                                                                                                                                                                                  | `ui-primitives/src/StateDot.tsx`                                                                                              | 4.3, 4.6                      | To be implemented   |
| Menu                               | `Menu`, `MenuItemButton`                                                                                                                                                                                                                                                                               | `ui-primitives/src/Menu.tsx`                                                                                                  | Overflow, split button, pager | To be implemented   |
| Tooltip                            | `Tooltip`                                                                                                                                                                                                                                                                                              | `ui-primitives/src/Tooltip.tsx`                                                                                               | Every icon-only control       | To be implemented   |
| Checkbox, kind label, path         | `Checkbox`, `Tag tone="outline"`, `PathLabel`                                                                                                                                                                                                                                                          | `ui-primitives/src/`                                                                                                          | 3.5, 4.3, 4.10                | To be implemented   |
| Shimmer, document, diff            | `TextShimmer`, `MarkdownText`, `DiffBlock`                                                                                                                                                                                                                                                             | `ui-primitives/src/`                                                                                                          | 4.3, 4.10                     | Implemented         |
| Icons                              | `IconSkillOutlineRegular`, `IconEditOutlineRegular`, `IconRefreshOutlineRegular`, `IconChevronLeftOutlineRegular`, `IconChevronRightOutlineRegular`, `IconChevronDownOutlineRegular`, `IconEllipsisOutlineRegular`, `IconSearchOutlineRegular`, `IconWarningOutlineRegular`, `IconCloseOutlineRegular` | `ui-primitives/src/icons/index.tsx`                                                                                           | Chapter 4                     | Partly implemented  |
| List row                           | `ListRow` `variant` `item`, `record`, `select`, `popover`                                                                                                                                                                                                                                              | `TaskManagerPage.module.css` `.row`; `ScheduleCatalogAction.module.css` `.row`                                                | 3.1, 3.5, 3.7                 | To be implemented   |
| Group header                       | `GroupHeader`                                                                                                                                                                                                                                                                                          | `PluginManagerPage.module.css` `.groupHead`, `.groupTitle`                                                                    | 3.1                           | To be implemented   |
| View header                        | `ViewHeader`                                                                                                                                                                                                                                                                                           | 3.2                                                                                                                           | Conversation view             | To be implemented   |
| Content tabs                       | `DetailTabs` `size` `page`, `pane`                                                                                                                                                                                                                                                                     | `TaskManagerPage.module.css` `.detailTabsBar`, `.detailTab`                                                                   | 4.5                           | To be implemented   |
| Pager                              | `Pager`                                                                                                                                                                                                                                                                                                | `QuestionComposer.module.css` `.pager` with `Menu`                                                                            | 4.5                           | To be implemented   |
| Split button                       | `SplitButton`                                                                                                                                                                                                                                                                                          | `PluginManagerPage.module.css` `.addGroup` with `Menu`                                                                        | 4.4                           | To be implemented   |
| Step indicator                     | `Steps`                                                                                                                                                                                                                                                                                                | `StateDot` `step`                                                                                                             | 4.6                           | To be implemented   |
| Empty state, notice band, skeleton | `EmptyState`, `Notice`, `Skeleton`                                                                                                                                                                                                                                                                     | `TaskManagerPage.module.css` `.empty`; `DiscoverSection.module.css` `.notice`; `PluginManagerPage.module.css` `.skeletonFill` | 4.9                           | To be implemented   |
| Progress block                     | `Working`                                                                                                                                                                                                                                                                                              | `packages/dsh-skill-scout/src/client/progress.tsx`                                                                            | 4.9                           | Implemented         |
| Data table                         | `DataTable`                                                                                                                                                                                                                                                                                            | `TrajectoryTable.module.css` `.table`                                                                                         | 4.7                           | To be implemented   |
| KPI tile, card                     | `KpiTile`, `DashCard`                                                                                                                                                                                                                                                                                  | `ui-settings-models/src/client/ModelsSection.module.css` `.rowCard`                                                           | 4.10, 4.11                    | To be implemented   |
| Charts                             | `StackedBarArea`, `Sparkline`, `BulletChart`, `RadialGauge`, `ChartLegend`, `ChartTooltip`                                                                                                                                                                                                             | `packages/dsh-skill-scout/src/client/ui/charts/`                                                                              | 4.8                           | To be implemented   |
| Share bar, ranked list             | `ShareBar`, `RankedList`                                                                                                                                                                                                                                                                               | `ContextMeter.module.css` `.swatch` geometry; 4.8                                                                             | 4.8, 4.10                     | To be implemented   |

Split button and step marker with the host APIs (not run; literal copy in place of locale text):

```tsx
<span className={css.split} role="group" aria-label="Save">
  <Button variant="primary" size="sm" className={css.splitPrimary} onClick={save}>Save to project</Button>
  <Menu open={open} onClose={close} align="end" portal autoFocus selection="check" selectedId="project"
    items={[{ id: "project", label: "Project" }, { id: "user", label: "User" }]} onSelect={choose}
    anchor={<Button variant="primary" size="sm" className={css.splitMore} aria-label="Choose target"
      aria-haspopup="menu" aria-expanded={open} onClick={toggle}><IconChevronDownOutlineRegular size={12} /></Button>} />
</span>
<StateDot state="done" appearance="step" size={16} />
```

| Glossary name | Meaning                                         |
| ------------- | ----------------------------------------------- |
| Decision item | A row the reader accepts or declines            |
| Record row    | A row for a record that decision items cite     |
| View header   | The 48px first row of the conversation view     |
| List pane     | The leading pane of a master-detail             |
| Detail panel  | The trailing pane of a master-detail (3.6)      |
| Sibling set   | Items that share one source; the pager walks it |
| Selection bar | The sticky bottom bar of the long list          |
| KPI tile      | One headline measure on the dashboard           |

## 6. Copy and Number Formats

- [MUST] Show every visible string, tooltip, and accessible name in the active host locale, `zh` or `en`. A locale switch updates all plugin text without a reload.
- [SHOULD] Write titles as noun phrases, buttons as short verb phrases that name the result (`Save`, `保存`; `Retry`, `重试`), and progress labels in the progressive form without an ellipsis (`Saving`, `正在保存`).
- [SHOULD] In `en`, use sentence case and end no label, button, status, or error line with a period. In `zh`, use full-width punctuation, 你 rather than 您, no exclamation marks, and one space between an Arabic numeral and the following Chinese word.
- [SHOULD] Write status words as one or two words (`Needs review`, `待确认`). Write the next-step line as one clause that starts with the action verb.
- [SHOULD] Write an empty-state line as a fact about the content, without instructions. Write an error line as "Could not <verb> <object>" or `<对象><动作>失败`, with raw detail after a colon; show no stack traces, file paths, or internal names.
- [SHOULD] Show counts as integers with locale grouping and singular and plural forms in `en`. Show compact numbers (`1.2K`, `3.4M`, one decimal) only in KPI tiles, axes, and legends, with the full value in the tooltip. Show percentages as integers, with one decimal below 10%.
- [SHOULD] Show durations as `{s} 秒` / `{s}s` below a minute and `{m} 分 {s} 秒` / `{m}m {s}s` above.
- [SHOULD] Show times in rows as relative time (`刚刚`, `3 分钟前`, `3m ago`) with the absolute time in `title`; past 30 days, show the date. Show dates on axes and in tables as `{m}月{d}日` / `{m}/{d}`, as the host message clock does (`ui-chat/src/client/chat/message-chrome.ts`).
- [SHOULD] Put the unit in the chart title or axis title, not on every tick.

## 7. Anti-Patterns

- [SHOULD] Do not use a centered hero with a card grid as a page structure.
- [SHOULD] Do not put cards inside cards, frame list panes or groups with bordered boxes, or frame a rendered document inside the detail body.
- [SHOULD] Do not use decorative icon tiles or colored icon backgrounds.
- [SHOULD] Do not write font sizes, font weights, or color literals outside the primitives.
- [SHOULD] Do not put primary information, such as titles or status words, in `--dsw-alias-label-caption` or in `--dsw-font-xxxs-11`.
- [SHOULD] Do not use pill labels or wrapping capsule buttons for metadata, sibling sets, or the current item.
- [SHOULD] Do not show status only as a word in the metadata line.
- [SHOULD] Do not give two buttons in one region the same weight when one is the primary action.
- [SHOULD] Do not list every command of a record on its own line in a list row.
- [SHOULD] Do not repeat the panel title as the first heading of a rendered document.
- [SHOULD] Do not give every dashboard card the same weight without a KPI row.
- [SHOULD] Do not show zero-valued categories in legends or as empty bars, and do not give empty dates their own rows.
- [SHOULD] Do not draw two units on one scale.
- [SHOULD] Do not use native `<select>` elements on plugin surfaces. Use filter chips or a `Menu`.
- [MUST] Do not reference names that the theme does not define, such as `--dsw-alias-state-error-label`, `--dsw-font-family-mono`, `--dsw-alias-fill-l1`, and `--dsw-alias-bg-mask`.

## 8. Implementation and Integration

- Style entry point: plugin CSS Modules in the client bundle. No global stylesheet.
- Fonts: inherited through the 4.1 tokens; code text uses `--ds-font-family-code`. The plugin loads no font files.
- Theme switching: automatic through host tokens on `body`. The plugin keeps no theme state.
- Component sources: host primitives from the DSH module table; plugin components in `packages/dsh-skill-scout/src/client/ui/`, built from the host paths of Chapter 5.

Review checks, run in both themes and both locales:

1. Scan the CSS of the Chapter 1 surfaces: every `var(--name)` is a Chapter 5 name, or a `--scout-*` or `--chart-*` property. No `#hex`, `rgb(`, or `hsl(` literal and no literal `font-size` or `line-height` occurs outside the primitives.
2. For every plugin element and every `var(--name)` in its rules, `getComputedStyle(element).getPropertyValue('--name')` is non-empty.
3. The main panel page has exactly one `h1`; the conversation view has none.
4. Press Tab through each surface. Each focused plugin element shows a computed `outline-style` other than `none`, the hover fill, an inset ring on itself or its row (4.7), or an accent border on its field (3.5). Host primitives keep their own focus style and are not counted.
5. With `prefers-reduced-motion: reduce`, every plugin element has `animation-name: none` and a `0s` transition duration.
6. Switch between `zh` and `en`. No visible text equals a dictionary key.
7. At 1440px and 390px viewport widths, `document.scrollingElement.scrollWidth` is at most the viewport width.

## Open Items

- [UNCONFIRMED] `StateDot` (with `appearance`), `SegmentedTabs`, `Tag`, `PathLabel`, `Checkbox`, `Menu`, and `Tooltip` keep their rc.2 props in rc.3. Source: the rc.3 web bundle exports these names; only the rc.2 source of their props was read.
- [UNCONFIRMED] The host has no dashboard page; the 4.11 composition rests on one third-party plugin (`dsh-context`). Source: no dashboard in `dsh-v0.2.1-rc.2` `packages/client`.
