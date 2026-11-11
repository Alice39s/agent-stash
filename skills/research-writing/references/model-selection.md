---
title: 写作模型选择
category: 工具与模型
use_when: 上游按 arena.ai Creative Writing 榜单给出的写作与润色模型推荐
input: 无
authors:
- Leey21
source: https://github.com/Leey21/awesome-ai-research-writing#模型选择
source_lines: https://github.com/Leey21/awesome-ai-research-writing/blob/df0af726a79109b8760c1b80d5dfc36ed44a6f1f/README.md?plain=1#L807-L815
revision: df0af726a79109b8760c1b80d5dfc36ed44a6f1f
updated: '2026-08-19'
curated_by: Alice39s (https://github.com/Alice39s/agent-stash)
curation: 从上游 README 按章节拆出，图片改为固定提交的绝对链接，补充 title、category、use_when、input 与出处字段
---

# 写作模型选择

我们从公开网站 [arena.ai](https://arena.ai/zh/leaderboard/text/creative-writing) 上获取了Creative Writing能力排名靠前的模型与具体版本，该榜单结果与调研群体的日常使用选择高度契合。

与年初情况不同，目前 Claude 系列模型在语言表达和润色上具备明显的优势。预算充足的情况下，推荐使用 Claude Fable 5，以及 opus 4.6 与 4.7；兼顾性价比可以使用 Gemini-3.7-flash；若科学上网受限或者预算较低的情况下，推荐使用 qwen3.8-max；不推荐使用 GPT 系列模型，其语言表达较为僵硬，同时性价比也较低。

![模型排名](https://raw.githubusercontent.com/Leey21/awesome-ai-research-writing/df0af726a79109b8760c1b80d5dfc36ed44a6f1f/images/model-rank.png)
