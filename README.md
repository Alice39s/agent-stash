<div align="center">

<img src=".github/img/header.svg" alt="" width="100%">

# Agent-Stash

[![CI](https://img.shields.io/github/actions/workflow/status/Alice39s/agent-stash/ci.yml?branch=main&label=CI&logo=githubactions&logoColor=white)](https://github.com/Alice39s/agent-stash/actions/workflows/ci.yml) [![Agent Stash release](https://img.shields.io/github/v/release/Alice39s/agent-stash?label=Agent%20Skills&color=D97757)](https://github.com/Alice39s/agent-stash/releases/latest) [![skills.sh](https://skills.sh/b/Alice39s/agent-stash)](https://skills.sh/Alice39s/agent-stash) [![License](https://img.shields.io/github/license/Alice39s/agent-stash)](LICENSE)

自用的 Agent Skills，以及给 [Pi](https://pi.dev)、[DSH (DeepSeek Harness)](https://github.com/deepseek-ai/deepseek-harness)、Cline、Grok Build、goose 与 Aider 用的插件。

**[使用文档](https://alice39s.github.io/agent-stash/zh/)** · [User Manual (English)](https://alice39s.github.io/agent-stash/en/)

</div>

## <img src=".github/img/package.svg" alt="" width="24" height="24" align="absmiddle"> 收录内容

### <img src=".github/img/puzzle.svg" alt="" width="20" height="20" align="absmiddle"> 插件

| 名称                                                                                                                                                                           | 说明                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| <img src="dsh/init/icon.svg" alt="" width="22" height="22" align="absmiddle"> [/init](https://alice39s.github.io/agent-stash/zh/plugins/init/)                                 | 插件，用其他 Coding Agent 的 `/init` 预设分析项目，写出 `AGENTS.md` |
| <img src="packages/dsh-message-edit/icon.svg" alt="" width="22" height="22" align="absmiddle"> [消息编辑](https://alice39s.github.io/agent-stash/zh/plugins/dsh-message-edit/) | DSH 插件，编辑消息、重新生成回复或重试回合，改动另存为可切换的版本  |
| <img src="packages/dsh-skill-scout/icon.svg" alt="" width="22" height="22" align="absmiddle"> [经验提炼器](https://alice39s.github.io/agent-stash/zh/plugins/dsh-skill-scout/) | DSH 插件，从已结束的会话里提炼可复用的流程，审核后存为 Skill        |
| <img src="dsh/recall/icon.svg" alt="" width="22" height="22" align="absmiddle"> [Prompt 回溯](https://alice39s.github.io/agent-stash/zh/plugins/dsh-recall/)                   | DSH 插件，按 ↑↓ 翻看当前会话发过的 Prompt                           |
| <img src="dsh/autosuggest/icon.svg" alt="" width="22" height="22" align="absmiddle"> [Prompt 自动补全](https://alice39s.github.io/agent-stash/zh/plugins/dsh-autosuggest/)     | DSH 插件，用所有会话的历史 Prompt 补全输入内容                      |
| <img src="dsh/enhance/icon.svg" alt="" width="22" height="22" align="absmiddle"> [提示词增强器](https://alice39s.github.io/agent-stash/zh/plugins/dsh-enhance/)                | DSH 插件，一键润色、结构化、提炼 Prompt 草稿的核心内容              |

### <img src=".github/img/book-open-text.svg" alt="" width="20" height="20" align="absmiddle"> Agent Skills

| 名称                                                                                                                                                                                                               | 说明                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| <img src=".github/img/skill-code-styleguide.svg" alt="" width="22" height="22" align="absmiddle"> [`code-styleguide`](https://alice39s.github.io/agent-stash/zh/skills/#code-styleguide)                           | Google、Angular 与 Android Kotlin 风格指南，每天从上游同步                          |
| <img src=".github/img/skill-self-use-model-subagent.svg" alt="" width="22" height="22" align="absmiddle"> [`self-use-<model>-subagent`](https://alice39s.github.io/agent-stash/zh/skills/#self-use-model-subagent) | 在 DSH 里把任务委托给指定模型的子代理                                               |
| <img src=".github/img/skill-research-writing.svg" alt="" width="22" height="22" align="absmiddle"> [`research-writing`](https://alice39s.github.io/agent-stash/zh/skills/#research-writing)                        | 科研论文写作 prompt：翻译、润色、去 AI 味、图表、实验分析与审稿                     |
| <img src=".github/img/skill-modern-web-guidance.svg" alt="" width="22" height="22" align="absmiddle"> [`modern-web-guidance`](https://alice39s.github.io/agent-stash/zh/skills/#modern-web-guidance)               | Chrome 团队的现代 Web 开发指南：HTML、CSS、表单、性能、无障碍与安全，每天从上游同步 |

## <img src=".github/img/download.svg" alt="" width="24" height="24" align="absmiddle"> 安装

技能用 [skills.sh](https://skills.sh/Alice39s/agent-stash) 的命令行安装：

```bash
npx -y skills add Alice39s/agent-stash
```

DSH 插件推荐导入 Agent Stash 插件市场后按需安装：在插件页的「实验性插件」里打开「自定义插件市场」（新版叫「自定义插件索引」），再到「发现」页添加索引源：

```text
https://alice39s.github.io/agent-stash/index.json
```

也可以按 npm 包名安装，例如：

```bash
dsh plugin --profile web add @agent-stash/dsh-skill-scout
```

各插件的包名和其他 Agent 的接入方法见文档站的[安装](https://alice39s.github.io/agent-stash/zh/install/)页。

## <img src=".github/img/code-xml.svg" alt="" width="24" height="24" align="absmiddle"> 开发

本地开发、CI 命令行与发布流程见文档站的[参与开发](https://alice39s.github.io/agent-stash/zh/development/)页。

## <img src=".github/img/scale.svg" alt="" width="24" height="24" align="absmiddle"> 许可证

本仓库使用 [Apache License 2.0](LICENSE)。
