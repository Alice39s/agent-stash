import { remarkMdxFiles } from "fumadocs-core/mdx-plugins";
import { defineConfig } from "fumadocs-mdx/config";
import { rehypeCodeLabels } from "./lib/rehype-code-labels.ts";
import { remarkContentLinks } from "./lib/remark-content-links.ts";
import { remarkLabelColumns } from "./lib/remark-label-columns.ts";

// 集合在 lib/source.ts 里用宏 API 声明；这里只放共用的 MDX 处理流程。
export default defineConfig({
  mdxOptions: {
    // 远程图片保持原始尺寸，构建不访问网络。
    remarkImageOptions: { external: false },
    // GitHub 默认主题的注释在两种主题的代码块表面上都达到 4.5:1。
    rehypeCodeOptions: { themes: { light: "github-light-default", dark: "github-dark-default" } },
    // 内容链接在 Fumadocs 自带插件之前改写，给 LLM 读的 Markdown 也带上页面地址；文件树在它们之后变成组件，
    // Markdown 里保留源码。步骤只用显式的 <Steps> 组件：design.md 的章节标题带序号，不能被当成步骤。
    remarkPlugins: (defaults) => [
      remarkContentLinks,
      remarkLabelColumns,
      ...defaults,
      remarkMdxFiles,
    ],
    // 在语法高亮之后运行，高亮会从代码围栏读取标题。
    rehypePlugins: (defaults) => [...defaults, rehypeCodeLabels],
  },
});
