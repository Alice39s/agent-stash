## @agent-stash/dsh-message-edit@0.3.0

### 发布到 npm

- 仓库根包以 `@agent-stash/init` 发布到 npm，DSH 插件行随之改名为 `@agent-stash/init/dsh/init`。从 `github:Alice39s/agent-stash` 装过的 DSH profile 需要按新包名重装一次；`agent-stash` 命令名与各 Agent 的配置路径不变。
- 两个包都由 GitHub Actions 经 npm trusted publishing 发布，附带 provenance。
- DSH 插件索引改为列出两个 npm 包的发布版本。

### 新增 DSH 消息编辑插件

- `@agent-stash/dsh-message-edit` 基于 [Moeblack/dsh-message-edit](https://github.com/Moeblack/dsh-message-edit) 0.2.3 开发，同一份构建产物支持 DSH 0.1.0-rc.3 与 DSH Desktop 0.2.1-rc.3。
- 编辑用户消息或助手回复、重新生成最后的回复、重试任意回合，每次改动都从该回合之前另开一个会话版本，原版本保持不变。
- 会话视图里新增「时间线」视图，列出可编辑的回合与版本树；标题栏可以在上一版本与下一版本之间切换；已结束的助手消息动作行里有编辑与重试按钮。
- 版本记录存进 DSH 的 storage domain，会话日志里只有 DSH 内置事件，卸载插件后会话照常打开。
