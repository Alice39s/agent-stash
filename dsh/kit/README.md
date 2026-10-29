# @agent-stash/dsh-stash-kit

[![npm](https://img.shields.io/npm/v/@agent-stash/dsh-stash-kit)](https://www.npmjs.com/package/@agent-stash/dsh-stash-kit) [![DSH Plugin](https://img.shields.io/badge/DeepSeek%20Harness-Plugin-4d6bfe)](https://github.com/deepseek-ai/deepseek-harness)

Agent Stash 框架：为 Agent Stash 系列的 DeepSeek Harness（DSH）插件提供共用的面板、补全灰字、动画和外观配置。[`@agent-stash/dsh-recall`](https://www.npmjs.com/package/@agent-stash/dsh-recall)、[`@agent-stash/dsh-autosuggest`](https://www.npmjs.com/package/@agent-stash/dsh-autosuggest) 与 [`@agent-stash/dsh-enhance`](https://www.npmjs.com/package/@agent-stash/dsh-enhance) 依赖它渲染界面，第一次启动时会自动安装并启用它，一般不需要单独安装。

单独安装：

```bash
dsh plugin --profile web add @agent-stash/dsh-stash-kit
```

停用框架后，依赖它的插件会停在「等待依赖」，再次启用这些插件时框架会被重新启用。

## 外观配置

在「插件」页打开「Agent Stash 框架」，点它的条目进入配置页。页面顶部有实时预览，可以重播动画；改动点保存后立即生效，所有插件同时生效。

| 配置项     | 字段        | 可选值                                             | 默认 |
| ---------- | ----------- | -------------------------------------------------- | ---- |
| 毛玻璃效果 | `glass`     | 开（不透明底色加背景模糊）/ 关（不透明底色）       | 开   |
| 动画       | `motion`    | `lively` 灵动、`subtle` 轻柔、`off` 关闭           | 灵动 |
| 补全灰字   | `ghost`     | `wave` 波浪、`fade` 淡入、`none` 直接显示          | 波浪 |
| 高亮移动   | `highlight` | `glide` 滑动、`instant` 即时                       | 滑动 |
| 行高       | `density`   | `comfortable` 舒适（34px）、`compact` 紧凑（28px） | 舒适 |
| 按键提示   | `hints`     | 开 / 关                                            | 开   |

也可以在 profile 的 patch 里写：

```yaml
- id: dsh-stash-kit
  name: "@agent-stash/dsh-stash-kit"
  config:
    glass: false
    motion: subtle
```

## 许可证

Apache-2.0，见 [LICENSE](LICENSE)。
