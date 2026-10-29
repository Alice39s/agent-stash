<div align="center">

# Agent-Stash

[![CI](https://img.shields.io/github/actions/workflow/status/Alice39s/agent-stash/ci.yml?branch=main&label=CI&logo=githubactions&logoColor=white)](https://github.com/Alice39s/agent-stash/actions/workflows/ci.yml) [![Agent Stash release](https://img.shields.io/github/v/release/Alice39s/agent-stash?label=Agent%20Skills&color=D97757)](https://github.com/Alice39s/agent-stash/releases/latest) [![skills.sh](https://skills.sh/b/Alice39s/agent-stash)](https://skills.sh/Alice39s/agent-stash) [![License](https://img.shields.io/github/license/Alice39s/agent-stash)](LICENSE)

自用的 Agent Skills，以及给 [Pi](https://pi.dev)、[DSH (DeepSeek Harness)](https://github.com/deepseek-ai/deepseek-harness)、Cline、Grok Build、goose 与 Aider 用的插件。

**[文档站](https://alice39s.github.io/agent-stash/zh/)** · [English](https://alice39s.github.io/agent-stash/en/)

</div>

## 收录内容

| 名称                                                                                                     | 说明                                                                   |
| -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [/init](https://alice39s.github.io/agent-stash/zh/plugins/init/)                                         | 插件，用其他 Coding Agent 的 `/init` prompt 分析项目，写出 `AGENTS.md` |
| [消息编辑](https://alice39s.github.io/agent-stash/zh/plugins/dsh-message-edit/)                          | DSH 插件，编辑消息、重新生成回复或重试回合，每次改动另开一个会话版本   |
| [经验提炼](https://alice39s.github.io/agent-stash/zh/plugins/dsh-skill-scout/)                           | DSH 插件，从已结束的会话里找出可复用的流程，审核后保存成 Skill         |
| [Prompt 回溯](https://alice39s.github.io/agent-stash/zh/plugins/dsh-recall/)                             | DSH 插件，在输入框里按 ↑↓ 翻看当前会话发过的 Prompt                    |
| [Prompt 补全](https://alice39s.github.io/agent-stash/zh/plugins/dsh-autosuggest/)                        | DSH 插件，输入历史 Prompt 的开头时以灰字补出剩余部分                   |
| [增强提示词](https://alice39s.github.io/agent-stash/zh/plugins/dsh-enhance/)                             | DSH 插件，把草稿改写成更适合交给 AI 的提示词，一键可撤销               |
| [`code-styleguide`](https://alice39s.github.io/agent-stash/zh/skills/#code-styleguide)                   | 技能，Google、Angular 与 Android Kotlin 风格指南，每天从上游同步       |
| [`self-use-<model>-subagent`](https://alice39s.github.io/agent-stash/zh/skills/#self-use-model-subagent) | 技能，在 DSH 里把任务委托给指定模型的子代理                            |

## 安装

技能用 [skills.sh](https://skills.sh/Alice39s/agent-stash) 的命令行安装：

```bash
npx -y skills add Alice39s/agent-stash
```

DSH 插件推荐导入 Agent Stash 插件市场后按需安装，步骤和其他 Agent 的接入方法见文档站的[安装](https://alice39s.github.io/agent-stash/zh/install/)页。

## 开发

本地开发、CI 命令行与发布流程见文档站的[参与开发](https://alice39s.github.io/agent-stash/zh/development/)页。

## 许可证

本仓库使用 [Apache License 2.0](LICENSE)。
