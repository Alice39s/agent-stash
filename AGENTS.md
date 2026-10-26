# Repository Guidelines

## Project Structure & Module Organization

- `src/init/`: shared `/init` core (preset registry, prompt rendering, agent adapters). Test fixtures live in `src/init/fixtures/`.
- `src/code-styleguide/`: converter that turns upstream style guides into the skill.
- Agent entry points: `pi/extensions/init/`, `dsh/init/` (with `locale/*.json` and `cordis.patch.yml`), `cline/init/`, and `cli/agent-stash.ts`.
- DSH bundle metadata: `dsh/locale/*.json` (bundle title and description, exported as `./locale/*.json`), plus `icon`, `engines.dsh`, and `dsh.manifestVersion` in `package.json`. Keep the package public; plugin index generators skip private bundles.
- `dsh/plugin-index.txt`: source list that `.github/workflows/plugin-index.yml` turns into the plugin index at `https://alice39s.github.io/agent-stash/index.json` with DSH's reference generator.
- `packages/`: further workspace packages published to npm, each with its own `bundle` script and committed `dist/`. `packages/dsh-message-edit/` is a DSH bundle with a Host half (`src/host/`) and a browser half (`src/client/`); its UI follows `packages/dsh-message-edit/design.md`.
- `scripts/ci/`: Python CLI (uv + Typer) that every workflow step calls (`uv run --project scripts/ci ci --help`). Workflows contain no inline shell; add a CLI command instead. Check it with `uv run ruff format --check`, `uv run ruff check`, and `uv run pytest` in that directory.
- Standalone DSH bundles `dsh/recall/` (`@agent-stash/dsh-recall`), `dsh/autosuggest/` (`@agent-stash/dsh-autosuggest`), and `dsh/kit/` (`@agent-stash/dsh-stash-kit`, the Agent Stash Kit): workspace packages published to npm, each with its own `package.json`, `cordis.patch.yml`, `locale/*.json`, `icon.svg`, and `README.md`, a Host half in `src/index.ts`, and a browser half in `src/client.tsx`. Their plugin rows keep the short ids `dsh-recall`, `dsh-autosuggest`, and `dsh-stash-kit`, which also name their dictionaries and config. The kit's browser half provides the `stashKit` Cordis service (panel, ghost text, draft-swap motion, appearance store) and the `plugins.row.config` settings page; its Host half owns the volatile appearance `Config`. Recall and autosuggest register into the `conversation.input.overlay` slot, inject `stashKit`, import kit code only as types, and install or enable the kit bundle through `pluginManager` at Host startup (`dsh/shared/host/kit.ts`). Shared code lives in `dsh/shared/` (`prompts.ts` for pure history logic, `host/` for the prompt route and kit installation, `client/` for the composer hooks and component-test harness). The root `pnpm bundle` writes both halves to each bundle's `dist/`; the browser half is CommonJS wrapped in `window.__ModuleLoader__.load` and takes `react` and `@deepseek-ai/dsh-client-ui-primitives` from the DSH module table. Their UI follows the root `design.md`.
- `prompts/init/`: hand-maintained presets (`claude-code*.md`).
- Generated content, never edited by hand: `vendor/init-prompts/` (from `pnpm sync:init-prompts`), `skills/code-styleguide/` (from `pnpm sync:code-styleguide`), `SKILL.md` and `agents/openai.yaml` in each `skills/self-use-*-subagent/` (from `uv run skills/self-use-haiku-subagent/scripts/render.py`, which renders that directory's `templates/` with `models.yaml`), and `dist/` plus `dsh/*/dist/` (from `pnpm bundle`).

## Build, Test, and Development Commands

Requires Node 24+ and pnpm 11.

- `pnpm install`: install dependencies.
- `pnpm check`: `oxfmt --check`, type-aware `oxlint`, and `vitest run`; this is what CI runs.
- `pnpm test`, `pnpm lint`, `pnpm format`: run each step on its own.
- `pnpm bundle`: rebuild `dist/` and `dsh/*/dist/` with tsdown. DSH, Cline, and the CLI load these directories directly, so commit the rebuilt output; CI fails when they differ from the sources. `uv run --project scripts/ci ci bundle` rebuilds every workspace package.

Keep the bundling script named `bundle`. A `build` script makes `npm install -g github:...` install a broken link.

## Coding Style & Naming Conventions

- TypeScript ESM with `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, and `erasableSyntaxOnly` (no enums or namespaces). Import local files with the `.ts` extension.
- oxfmt formats with a 100-column print width. oxlint denies warnings and forbids `any` and floating promises.
- Validate external input with valibot schemas (`ConfigSchema`); use `pathe` for paths.
- Constants use `UPPER_SNAKE_CASE`, schemas `PascalCaseSchema`, files `kebab-case.ts`. Write doc comments in Chinese, matching existing code.

## Testing Guidelines

Tests use Vitest and sit next to their source as `*.test.ts` (`src/init/registry.test.ts`). Browser-half component tests are `*.test.tsx` files with a `// @vitest-environment happy-dom` header that mount the overlay through `dsh/shared/client/harness.tsx`, which provides the real kit service from `dsh/kit/src/harness.tsx` (kit tests use `mountKit` and `createSettings` from there); `vitest.config.ts` aliases `@deepseek-ai/dsh-client-ui-primitives`, which the DSH module table supplies at runtime, to `dsh/kit/src/primitives-stand-in.tsx`. Write `describe`/`test` names as English behavior statements. Put on-disk config cases under `src/init/fixtures/<case>/`. Every new preset, adapter, or config path needs a test.

## Commit & Pull Request Guidelines

- Commits follow Conventional Commits with a scope, for example `feat(init): add Crush preset` or `ci(release): ...`. Use the body to explain why.
- For user-facing changes, add a changeset to `.tegami/<topic>.md` with `packages: { "@agent-stash/init": minor }` frontmatter (use the name of each changed workspace package) and release notes in Chinese under at least one Markdown heading; Tegami ignores changesets without a heading. Tegami opens the Version Packages PR on `main`.
- PRs must pass `pnpm check` and include the rebuilt `dist/`. Describe which agents or presets the change affects.
