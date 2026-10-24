---
packages:
  agent-stash: minor
---

- `/init` 支持 Cline、Grok Build、goose 与 Aider：Cline 通过插件注册 `/init`，Grok Build 与 goose 由 `agent-stash init install` 写入 `/init-<预设名>` 命令，Aider 用 `agent-stash init aider` 启动。
- 新增从 Qwen Code 同步的 `qwen-code` 预设，去掉了开头介绍 Qwen Code 身份的一句。
- 新增从 Kilo Code 同步的 `kilo-code` 预设。
- `claude-code` 与 `claude-code-init-new` 预设生成 `AGENTS.md`。
