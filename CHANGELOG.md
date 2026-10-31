## @agent-stash/init@1.4.2

### 文档站录屏

- 文档站的录屏和封面图右下角显示仓库地址 `github.com/Alice39s/agent-stash`，画面上另有一层低透明度的斜向仓库地址。下载、转发或全屏播放时，地址都在画面里。

### 插件简介

插件列表里的简介改为一句话：

- /init：用其他 Coding Agent 的 /init 预设分析项目，写出 AGENTS.md
- Prompt 回溯：按 ↑↓ 翻看当前会话发过的 Prompt
- Prompt 自动补全：用所有会话的历史 Prompt 补全输入内容
- 提示词增强器：一键润色、结构化、提炼 Prompt 草稿的核心内容
- Agent Stash 基础核心框架：统一设置 Agent Stash 插件的面板、补全灰字与动画
- 消息编辑：编辑消息、重新生成回复或重试回合，改动另存为可切换的版本
- 经验提炼器：从已结束的会话里提炼可复用的流程，审核后存为 Skill

### 插件索引

- `https://alice39s.github.io/agent-stash/index.json` 里每个插件最多列出版本号最高的 10 个版本，`dist-tags` 指向的版本也会保留。

## @agent-stash/init@1.4.1

### `/init` 的预设说明与出错提示

- DSH 的预设列表里，自定义预设显示 `init.json` 里写的 `description`。没写 `description` 时显示 `file` 的路径，Pi 的补全菜单、Grok Build 技能和 goose recipe 的说明也显示这个路径。
- DSH 里执行 `/init` 失败时，预设列表或输入框提示「/init 执行失败：」和原因，例如哪个预设的模板文件读不到；输入框保留原来的内容。

## @agent-stash/init@1.4.0

### 新增文档站

- 中英双语文档站发布在 <https://alice39s.github.io/agent-stash/>，收录安装方法、`/init`、技能，以及 `dsh-recall`、`dsh-autosuggest` 与 Agent Stash 框架的录屏和截图。
- 每页都有 Markdown 副本，站点提供 `llms.txt`、`llms-full.txt`、站内搜索与站点地图。
- 插件索引仍在 `https://alice39s.github.io/agent-stash/index.json`，与文档站一起发布。

### DSH 的 `/init` 进入 `/` 菜单

- `/init` 排在 `/` 菜单的「指令」区，和内置指令一样带图标、标题「初始化」和一句靠右的说明，英文界面显示为 Init。
- 在菜单里选中它，或者只输入 `/init` 就回车，会打开预设列表：默认预设打勾并已高亮，再按回车就用它；输入文字可以筛选预设，`init.json` 里的自定义预设单独列在「自定义」组。
- 在 `/init` 后面打空格，可以接着写预设名和额外 Prompt，规则不变。

## @agent-stash/init@1.3.1

### DSH 插件页的名称与图标

- `@agent-stash/init` 在 DSH 插件页和插件索引里显示为「/init」，与它添加的命令同名。
- `/init` 与「消息编辑」使用新图标，画法与 DSH 官方插件图标一致：透明底、蓝色渐变主体、青色点缀。

## @agent-stash/init@1.3.0

### 发布到 npm

- 仓库根包以 `@agent-stash/init` 发布到 npm，DSH 插件行随之改名为 `@agent-stash/init/dsh/init`。从 `github:Alice39s/agent-stash` 装过的 DSH profile 需要按新包名重装一次；`agent-stash` 命令名与各 Agent 的配置路径不变。
- 两个包都由 GitHub Actions 经 npm trusted publishing 发布，附带 provenance。
- DSH 插件索引改为列出两个 npm 包的发布版本。

### 新增 DSH 消息编辑插件

- `@agent-stash/dsh-message-edit` 基于 [Moeblack/dsh-message-edit](https://github.com/Moeblack/dsh-message-edit) 0.2.3 开发，同一份构建产物支持 DSH 0.1.0-rc.3 与 DSH Desktop 0.2.1-rc.3。
- 编辑用户消息或助手回复、重新生成最后的回复、重试任意回合，每次改动都从该回合之前另开一个会话版本，原版本保持不变。
- 会话视图里新增「时间线」视图，列出可编辑的回合与版本树；标题栏可以在上一版本与下一版本之间切换；已结束的助手消息动作行里有编辑与重试按钮。
- 版本记录存进 DSH 的 storage domain，会话日志里只有 DSH 内置事件，卸载插件后会话照常打开。

### 新增子代理委托技能

- 新增 `self-use-haiku-subagent`、`self-use-sonnet-subagent`、`self-use-luna-subagent`、`self-use-dpsk-subagent` 四个技能，分别对应 Haiku 5.5、Sonnet 5.5、GPT-5.6 Luna 和 DeepSeek V4.1 Flash。
- 在 DSH 里派发子代理时，技能按模型的上下文预算给出一个子代理能做多少、提示词怎么写，以及子代理用满上下文被终止后怎么接手。

## agent-stash@1.2.0

### 支持 DSH 插件索引

- 新增 JSON 插件索引 `https://alice39s.github.io/agent-stash/index.json`：在 DSH 的「发现」页添加这个索引源后，可以浏览并安装 agent-stash 的各个版本。索引在每次发布后自动更新。
- 组合包在 DSH 插件页显示为「Agent Stash」，带图标和中英文描述。
- `package.json` 声明 `engines.dsh: ">=0.2.1-alpha.2"`，DSH 安装前据此检查兼容性。

## agent-stash@1.1.0

### 支持更多 Agent 与预设

- `/init` 支持 Cline、Grok Build、goose 与 Aider：Cline 通过插件注册 `/init`，Grok Build 与 goose 由 `agent-stash init install` 写入 `/init-<预设名>` 命令，Aider 用 `agent-stash init aider` 启动。
- 新增从 Qwen Code 同步的 `qwen-code` 预设，去掉了开头介绍 Qwen Code 身份的一句。
- 新增从 Kilo Code 同步的 `kilo-code` 预设。
- `claude-code` 与 `claude-code-init-new` 预设生成 `AGENTS.md`。

## agent-stash@1.0.0

### 首个稳定版本

- `/init` 同时支持 pi 扩展与 DSH 插件，内置 `codex`、`kimi-code`、`opencode`、`crush`、`copilot` 五个从上游同步的预设，以及手动维护的 `claude-code`、`claude-code-init-new`。
- 新增 `code-styleguide` 技能，收录 Google、Angular 与 Android Kotlin 风格指南。
- `/init` 预设与风格指南每天从上游同步。
