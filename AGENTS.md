# Repository Guidelines

## Project Structure & Module Organization

- `src/init/`: shared `/init` core (preset registry, prompt rendering, agent adapters). Test fixtures live in `src/init/fixtures/`.
- `src/code-styleguide/`: converter that turns upstream style guides into the skill.
- Agent entry points: `pi/extensions/init/`, `dsh/init/` (with `locale/*.json` and `cordis.patch.yml`), `cline/init/`, and `cli/agent-stash.ts`.
- DSH bundle metadata: `dsh/locale/*.json` (bundle title and description, exported as `./locale/*.json`), plus `icon`, `engines.dsh`, and `dsh.manifestVersion` in `package.json`. Keep the package public; plugin index generators skip private bundles.
- `dsh/plugin-index.txt`: source list that `.github/workflows/plugin-index.yml` turns into the plugin index at `https://alice39s.github.io/agent-stash/index.json` with DSH's reference generator.
- `prompts/init/`: hand-maintained presets (`claude-code*.md`).
- Generated content, never edited by hand: `vendor/init-prompts/` (from `pnpm sync:init-prompts`), `skills/code-styleguide/` (from `pnpm sync:code-styleguide`), and `dist/` (from `pnpm bundle`).

## Build, Test, and Development Commands

Requires Node 24+ and pnpm 11.

- `pnpm install`: install dependencies.
- `pnpm check`: `oxfmt --check`, type-aware `oxlint`, and `vitest run`; this is what CI runs.
- `pnpm test`, `pnpm lint`, `pnpm format`: run each step on its own.
- `pnpm bundle`: rebuild `dist/` with tsdown. DSH, Cline, and the CLI load `dist/` directly, so commit the rebuilt output; CI fails when `dist/` differs from the sources.

Keep the bundling script named `bundle`. A `build` script makes `npm install -g github:...` install a broken link.

## Coding Style & Naming Conventions

- TypeScript ESM with `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, and `erasableSyntaxOnly` (no enums or namespaces). Import local files with the `.ts` extension.
- oxfmt formats with a 100-column print width. oxlint denies warnings and forbids `any` and floating promises.
- Validate external input with valibot schemas (`ConfigSchema`); use `pathe` for paths.
- Constants use `UPPER_SNAKE_CASE`, schemas `PascalCaseSchema`, files `kebab-case.ts`. Write doc comments in Chinese, matching existing code.

## Testing Guidelines

Tests use Vitest and sit next to their source as `*.test.ts` (`src/init/registry.test.ts`). Write `describe`/`test` names as English behavior statements. Put on-disk config cases under `src/init/fixtures/<case>/`. Every new preset, adapter, or config path needs a test.

## Commit & Pull Request Guidelines

- Commits follow Conventional Commits with a scope, for example `feat(init): add Crush preset` or `ci(release): ...`. Use the body to explain why.
- For user-facing changes, add a changeset to `.tegami/<topic>.md` with `packages: { agent-stash: minor }` frontmatter and release notes in Chinese under at least one Markdown heading; Tegami ignores changesets without a heading. Tegami opens the Version Packages PR on `main`.
- PRs must pass `pnpm check` and include the rebuilt `dist/`. Describe which agents or presets the change affects.
