---
packages:
  "@agent-stash/dsh-enhance": patch
---

## 使用 o200k_base 估算输入 Tokens

改用 tiktoken 编码器统计草稿、预设指令与关联上下文的输入文本。界面注明 o200k_base 估算，不代表所选模型的实际计费，也不包含输出 Tokens。

编码器在 DSH Host 按需创建并复用，插件卸载时释放。浏览器菜单通过防抖请求读取估算，不在输入线程加载 WASM。
