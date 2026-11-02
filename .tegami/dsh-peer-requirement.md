---
packages:
  "@agent-stash/init": minor
  "@agent-stash/dsh-message-edit": minor
  "@agent-stash/dsh-recall": minor
  "@agent-stash/dsh-autosuggest": minor
  "@agent-stash/dsh-enhance": minor
  "@agent-stash/dsh-stash-kit": minor
  "@agent-stash/dsh-skill-scout": minor
---

## DSH 版本要求

- `package.json` 的 `peerDependencies` 声明可选的 `@deepseek-ai/dsh`，范围与 `engines.dsh` 相同。从 `peerDependencies` 读取兼容声明的插件市场也能显示插件支持的 DSH 版本，安装时不会额外装上 DSH。
