## @agent-stash/dsh-stash-kit@0.1.1

### 插件简介

插件列表里的简介改为一句话：

- /init：用其他 Coding Agent 的 /init 预设分析项目，写出 AGENTS.md
- Prompt 回溯：按 ↑↓ 翻看当前会话发过的 Prompt
- Prompt 自动补全：用所有会话的历史 Prompt 补全输入内容
- 提示词增强器：一键润色、结构化、提炼 Prompt 草稿的核心内容
- Agent Stash 基础核心框架：统一设置 Agent Stash 插件的面板、补全灰字与动画
- 消息编辑：编辑消息、重新生成回复或重试回合，改动另存为可切换的版本
- 经验提炼器：从已结束的会话里提炼可复用的流程，审核后存为 Skill

### 插件名称

插件页里显示的中文名称：

- `@agent-stash/dsh-autosuggest`：Prompt 自动补全
- `@agent-stash/dsh-enhance`：提示词增强器
- `@agent-stash/dsh-stash-kit`：Agent Stash 基础核心框架
- `@agent-stash/dsh-skill-scout`：经验提炼器，找不到发现模型和无法修改 Skill 的提示里也用这个名称

## @agent-stash/dsh-stash-kit@0.1.0

### 新增 DSH 插件 Prompt 回溯、Prompt 补全与 Agent Stash 框架

- `@agent-stash/dsh-recall`（Prompt 回溯）：在 DSH 输入框开头按 ↑ 打开历史面板，用 ↑↓ 翻看当前会话发过的 Prompt；越过最新一条或按 Esc 回到原来的草稿，Tab 留下当前这条继续编辑，Enter 直接发送。
- `@agent-stash/dsh-autosuggest`（Prompt 补全）：输入的内容是某条历史 Prompt 的开头时，光标后以灰字补出剩余部分，按 Tab 或 → 填入，多条匹配时用 ↑↓ 切换。历史来自所有会话，区分大小写。
- `@agent-stash/dsh-stash-kit`（Agent Stash 框架）：两个插件共用的面板、补全灰字与动画。面板与 `/` 菜单同一套几何和间距，底色不透明，默认加背景模糊；在「插件」页的框架配置页统一设置毛玻璃、动画强度（灵动 / 轻柔 / 关闭）、补全灰字的出现方式、高亮移动方式、行高与按键提示，页面带实时预览。
- 安装 `@agent-stash/dsh-recall` 或 `@agent-stash/dsh-autosuggest` 后，插件第一次启动时会从 npm 自动安装并启用框架。
- 三个插件都需要 DSH 0.2.1-alpha.4 或更新的版本，在「插件」页填入 npm 包名即可安装，也列在插件索引 `https://alice39s.github.io/agent-stash/index.json` 里。图标与 `/init`、消息编辑同一套画法。
