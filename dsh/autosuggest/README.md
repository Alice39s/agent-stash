# @agent-stash/dsh-autosuggest

[![npm](https://img.shields.io/npm/v/@agent-stash/dsh-autosuggest)](https://www.npmjs.com/package/@agent-stash/dsh-autosuggest) [![DSH Plugin](https://img.shields.io/badge/DeepSeek%20Harness-Plugin-4d6bfe)](https://github.com/deepseek-ai/deepseek-harness)

DeepSeek Harness（DSH）插件「Prompt 自动补全」，参照 zsh-autosuggestions：输入的内容是某条历史 Prompt 的开头（区分大小写）时，光标后以灰字显示剩余部分，输入框上方列出最多五条匹配，标出来源会话与日期。需要 DSH 0.2.1-alpha.4 或更新的版本。

## 安装

DSH 桌面版：在「插件」页点「添加插件」，填入 `@agent-stash/dsh-autosuggest` 后安装。也可以在「发现」页添加插件索引 `https://alice39s.github.io/agent-stash/index.json`，从索引安装。

命令行：

```bash
dsh plugin --profile web add @agent-stash/dsh-autosuggest
```

界面建立在 Agent Stash 基础核心框架 [`@agent-stash/dsh-stash-kit`](https://www.npmjs.com/package/@agent-stash/dsh-stash-kit) 上。插件第一次启动时会自动安装并启用框架。

## 使用

| 按键    | 作用                       |
| ------- | -------------------------- |
| Tab / → | 填入高亮的那条             |
| ↑ / ↓   | 有多条匹配时切换           |
| Esc     | 收起建议，改动草稿后再出现 |

历史来自所有会话里最近发过 Prompt 的 50 个，按时间倒序，相同文本只保留最新一条。只有亲手输入才会出现建议，`@agent-stash/dsh-recall` 放进输入框的内容不会触发。

## 许可证

Apache-2.0，见 [LICENSE](LICENSE)。
