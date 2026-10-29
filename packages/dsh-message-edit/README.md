# @agent-stash/dsh-message-edit

[![npm](https://img.shields.io/npm/v/@agent-stash/dsh-message-edit)](https://www.npmjs.com/package/@agent-stash/dsh-message-edit) [![DSH Plugin](https://img.shields.io/badge/DeepSeek%20Harness-Plugin-4d6bfe)](https://github.com/deepseek-ai/deepseek-harness)

DeepSeek Harness（DSH）插件：编辑用户消息或助手回复、重新生成最后的回复、重试任意回合，报错或被停止的消息也能改了重发。每次改动都从该回合之前另开一个会话版本，原版本保持不变，可以切换回去。

同一份构建产物支持 DSH 0.1.0-rc.3 与 DSH Desktop 0.2.1-rc.3。基于 [Moeblack/dsh-message-edit](https://github.com/Moeblack/dsh-message-edit) 0.2.3 开发。

## 安装

DSH 桌面版：在「插件」页点「添加插件」，填入 `@agent-stash/dsh-message-edit` 后安装。

命令行：

```bash
dsh plugin --profile web add @agent-stash/dsh-message-edit
```

## 使用

- 「时间线」视图：会话标题下方的视图标签里多出「时间线」。左侧按回合列出可编辑的消息、思考与回复，每个回合都可以重试；右侧是版本树，点击任一版本切换过去。工具栏里选择修改历史回合后，后续回合是丢弃还是按原输入重放。
- 标题栏：在上一版本与下一版本之间切换，或按原消息重新生成最后一个由用户消息触发的回合。
- 消息动作行：每条已结束的助手消息下方有编辑与重试按钮。编辑可以改本回合的用户消息，也可以改这条消息的思考或回复。
- 回合末尾：回合报错、被停止或没有文字回复时，DSH 不显示消息动作行，插件在这一回合末尾放上「编辑消息」与「重试本回合」，可以改了消息再发，也可以按原消息重发。

改用户消息或重试会让模型重新生成这一回合；只改助手的思考或回复不会调用模型，新版本直接采用改后的文本。

## 数据

- 新版本是一个普通的 DSH 子会话，父会话是被修改的版本，会话日志里只有 DSH 内置事件。卸载插件后，所有版本照常可以打开。
- 每个版本由哪次操作产生（编辑了哪个块、改前改后的文本）记在 DSH storage domain `message_edit` 里，时间线据此显示版本说明与撤销链。

## 开发

```bash
pnpm install
pnpm --filter @agent-stash/dsh-message-edit run bundle   # 构建 dist/index.js（Host）与 dist/client.js（浏览器）
pnpm exec vitest run packages/dsh-message-edit
```

`dist/` 随仓库提交。浏览器 bundle 只能 `require` 两版 DSH 模块表都提供的 `react` 与 `react/jsx-runtime`，打包配置在 `tsdown.client.ts`。界面规则见 [design.md](design.md)。

## 许可证

MIT，见 [LICENSE](LICENSE)。
