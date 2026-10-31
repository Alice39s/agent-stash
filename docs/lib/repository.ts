/** 文档站与录屏水印共用的仓库信息；不读环境变量，构建外的脚本也能导入。 */
export const repository = {
  owner: "Alice39s",
  name: "agent-stash",
  branch: "main",
  contentDir: "docs/content/docs",
} as const;
export const repositoryUrl = `https://github.com/${repository.owner}/${repository.name}`;
