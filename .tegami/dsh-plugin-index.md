---
packages:
  agent-stash: minor
---

## 支持 DSH 插件索引

- 新增 JSON 插件索引 `https://alice39s.github.io/agent-stash/index.json`：在 DSH 的「发现」页添加这个索引源后，可以浏览并安装 agent-stash 的各个版本。索引在每次发布后自动更新。
- 组合包在 DSH 插件页显示为「Agent Stash」，带图标和中英文描述。
- `package.json` 声明 `engines.dsh: ">=0.2.1-alpha.2"`，DSH 安装前据此检查兼容性。
