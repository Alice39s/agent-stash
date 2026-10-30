import { get_encoding, type Tiktoken } from "tiktoken";

let encoder: Tiktoken | undefined;

/**
 * Host 复用 o200k_base 编码器；只估算输入文本，不代表所选模型的实际计费。
 * 特殊 token 的字面文本也作为普通草稿编码，避免用户输入导致估算抛错。
 */
export function estimateTokens(text: string): number {
  if (text === "") return 0;
  encoder ??= get_encoding("o200k_base");
  return encoder.encode(text, [], []).length;
}

/** 插件卸载时释放 WASM 编码器；重新启用后按需创建。 */
export function freeTokenEncoder(): void {
  encoder?.free();
  encoder = undefined;
}
