# @agent-stash/dsh-recall

[![npm](https://img.shields.io/npm/v/@agent-stash/dsh-recall)](https://www.npmjs.com/package/@agent-stash/dsh-recall) [![DSH Plugin](https://img.shields.io/badge/DeepSeek%20Harness-Plugin-4d6bfe)](https://github.com/deepseek-ai/deepseek-harness)

DeepSeek Harness（DSH）插件「Prompt 回溯」：在输入框开头按 ↑，翻看当前会话发过的 Prompt。需要 DSH 0.2.1-alpha.4 或更新的版本。

## 安装

DSH 桌面版：在「插件」页点「添加插件」，填入 `@agent-stash/dsh-recall` 后安装。也可以在「发现」页添加插件索引 `https://alice39s.github.io/agent-stash/index.json`，从索引安装。

命令行：

```bash
dsh plugin --profile web add @agent-stash/dsh-recall
```

界面建立在 Agent Stash 基础核心框架 [`@agent-stash/dsh-stash-kit`](https://www.npmjs.com/package/@agent-stash/dsh-stash-kit) 上。插件第一次启动时会自动安装并启用框架。

## 使用

| 按键            | 作用                                       |
| --------------- | ------------------------------------------ |
| ↑（光标在开头） | 打开历史面板，把最近一条 Prompt 放进输入框 |
| ↑ / ↓           | 在更早与更新的 Prompt 之间切换             |
| ↓（最新一条）   | 回到打开面板前的草稿                       |
| Esc             | 回到打开面板前的草稿                       |
| Tab             | 保留当前这条，关闭面板继续编辑             |
| Enter           | 直接发送当前这条                           |

面板按日期分组，点任意一行也能把它放进输入框。`/`、`@` 菜单打开时方向键仍归菜单使用。

## 许可证

Apache-2.0，见 [LICENSE](LICENSE)。
