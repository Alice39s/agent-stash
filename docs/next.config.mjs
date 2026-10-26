import { createMDX } from "fumadocs-mdx/next";
import { join } from "node:path";
import { basePath, siteOrigin } from "./site.config.ts";

const workspaceRoot = join(import.meta.dirname, "..");

/** @type {import('next').NextConfig} */
const config = {
  // GitHub Pages 只提供静态文件：页面、Markdown 副本、预览图和搜索索引都在构建时生成。
  output: "export",
  // 页面写成 `<路径>/index.html`：GitHub Pages 用它响应 `/zh/`，并把 `/zh` 重定向过去。
  trailingSlash: true,
  basePath,
  images: { unoptimized: true },
  reactStrictMode: true,
  poweredByHeader: false,
  turbopack: { root: workspaceRoot },
  outputFileTracingRoot: workspaceRoot,
  serverExternalPackages: ["@takumi-rs/core"],
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
    NEXT_PUBLIC_SITE_ORIGIN: siteOrigin,
  },
  experimental: {
    // 每种语言各是一个根布局，带自己的 `<html lang>`，404 页需要独立的文档。
    globalNotFound: true,
  },
  // 类型检查由仓库根目录的 `oxlint --type-aware --type-check` 完成。
  typescript: { ignoreBuildErrors: true },
};

const withMDX = createMDX();

export default withMDX(config);
