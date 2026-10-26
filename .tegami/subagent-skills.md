---
packages:
  "@agent-stash/init": minor
---

## 新增子代理委托技能

- 新增 `self-use-haiku-subagent`、`self-use-sonnet-subagent`、`self-use-luna-subagent`、`self-use-dpsk-subagent` 四个技能，分别对应 Haiku 5.5、Sonnet 5.5、GPT-5.6 Luna 和 DeepSeek V4.1 Flash。
- 在 DSH 里派发子代理时，技能按模型的上下文预算给出一个子代理能做多少、提示词怎么写，以及子代理用满上下文被终止后怎么接手。
