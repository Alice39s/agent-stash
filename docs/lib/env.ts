/**
 * Next.js 在构建时内联 `process.env.NEXT_PUBLIC_*`；`next.config.mjs` 总会定义这些变量，缺失说明模块在 Next.js
 * 构建之外运行。
 */
export function requiredEnv(name: string, value: string | undefined): string {
  if (value === undefined) {
    throw new Error(`${name} is not defined; run the docs through next.config.mjs.`);
  }
  return value;
}
