import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // DSH 浏览器模块表在运行时提供这个包；组件测试换成属性一致的替身。
      "@deepseek-ai/dsh-client-ui-primitives": fileURLToPath(
        new URL("dsh/kit/src/primitives-stand-in.tsx", import.meta.url),
      ),
    },
  },
  test: {
    exclude: [...configDefaults.exclude, ".scratch/**", ".agents/worktrees/**"],
  },
});
