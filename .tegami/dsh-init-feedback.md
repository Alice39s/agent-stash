---
packages:
  "@agent-stash/init": patch
---

## `/init` 的预设说明与出错提示

- DSH 的预设列表里，自定义预设显示 `init.json` 里写的 `description`。没写时显示 `file` 的路径，Pi 的补全菜单和 Cline、goose 的命令说明也改为显示这个路径。
- DSH 里执行 `/init` 失败时，预设列表或输入框提示「/init 执行失败：」和原因，例如哪个预设的模板文件读不到；输入框保留原来的内容。
