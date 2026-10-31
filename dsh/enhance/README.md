# @agent-stash/dsh-enhance

[![npm](https://img.shields.io/npm/v/@agent-stash/dsh-enhance)](https://www.npmjs.com/package/@agent-stash/dsh-enhance) [![DSH Plugin](https://img.shields.io/badge/DeepSeek%20Harness-Plugin-4d6bfe)](https://github.com/deepseek-ai/deepseek-harness)

DeepSeek Harness（DSH）插件「提示词增强器」：输入框右下角、发送按钮左侧的按钮把草稿改写成更适合交给 AI 的提示词，改写后一键可撤销。默认使用会话的模型，并附带当前会话最近 3 轮对话的正文，让改写器理解「这个」「刚才的方案」指的是什么。需要 DSH 0.2.1-rc.3 或更新的版本。

## 安装

DSH 桌面版：在「插件」页点「添加插件」，填入 `@agent-stash/dsh-enhance` 后安装。也可以在「发现」页添加插件索引 `https://alice39s.github.io/agent-stash/index.json`，从索引安装。

命令行：

```bash
dsh plugin --profile web add @agent-stash/dsh-enhance
```

界面建立在 Agent Stash 基础核心框架 [`@agent-stash/dsh-stash-kit`](https://www.npmjs.com/package/@agent-stash/dsh-stash-kit) 上。插件第一次启动时会自动安装并启用框架。

## 使用

草稿不为空时按钮出现。点开菜单选一个预设，数字键 1–9 也能直接选择。菜单顶部按 o200k_base 显示所选预设、关联上下文与草稿的输入估算，并标出上下文轮数。估算不含输出或推理用量，实际用量以模型返回为准。

| 预设             | 改写方式                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------ |
| 润色 Prompt      | 先整理结构，再在原意内写清目标与范围，对目标有帮助时请 AI 权衡几种做法并推荐一种，按写作指南去掉 AI 腔 |
| 仅结构化整理     | 主要要求放在最前，按需分组，步骤和三项以上的并列内容改成列表，保留原有措辞，不增删要点                 |
| 使 Prompt 更精炼 | 去掉口头语、重复和改口，只留最终的要求，适合整理语音输入                                               |

润色 Prompt 的指令内联了 [humanizer](https://github.com/blader/humanizer)、[no-ai-slop](https://github.com/petergyang/no-ai-slop) 和 [no-negative-echo](https://github.com/LB623/no-negative-echo) 三份写作指南（MIT），原样放在 `vendor/` 里，由仓库的同步任务每天对照上游更新。自定义预设可以用 `<include ref="humanizer" />` 引用它们。

改写进行中草稿锁定，点按钮或按 Esc 停止。完成后按钮左侧出现撤销按钮，回到改写前的草稿。失败原因显示在按钮左侧，草稿不变。

上下文只含用户消息、助手回复的正文与压缩摘要，不含工具调用、工具输出和推理过程；能识别出的密钥替换为 `[redacted]`，草稿里的密钥以占位符发给模型，结果写回前换回原文。

## 配置

在「插件」页打开「提示词增强器」，点「配置」，或在菜单底部点「管理预设…」进入。可以设置：

- 模型：跟随会话（默认），或从模型列表里指定一个，并选推理强度。
- 超时：5–600 秒，默认 60。
- 附带最近几轮对话：默认开启，1–10 轮，默认 3 轮。
- 快捷键：默认关闭；开启后 ⇧⌘E / Ctrl+Shift+E 打开菜单，改写进行中按它停止，完成后按它撤销。
- 预设：调整顺序，修改图标、名称与改写指令，或添加自定义预设。编辑框里直接显示内置指令；图标从 DSH 图标库里选。

完整说明见[文档站](https://alice39s.github.io/agent-stash/zh/plugins/dsh-enhance/)。

## 许可证

Apache-2.0，见 [LICENSE](LICENSE)。
