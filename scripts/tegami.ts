import { tegami, type TegamiPlugin } from "tegami";
import { runCli } from "tegami/cli";
import { github } from "tegami/plugins/github";

const REPO = "Alice39s/agent-stash";
const ROOT_PACKAGE = "@agent-stash/init";
const CO_AUTHOR_TRAILER = "Co-authored-by: Alice39s <180387319+Alice39s@users.noreply.github.com>";

/**
 * 根包沿用 `v<version>` tag，与既有的发布历史一致；工作区里的其他包使用默认的 `<name>@<version>`。
 * 各包都经 npm trusted publishing 发布，见 `.github/workflows/release.yml`。
 */
function rootVersionTag(): TegamiPlugin {
  return {
    name: "root-version-tag",
    enforce: "pre",
    initPublishPlan({ plan }) {
      for (const [id, packagePlan] of plan.packages) {
        const pkg = this.graph.get(id);
        if (pkg?.name === ROOT_PACKAGE && pkg.version) {
          packagePlan.git = { ...packagePlan.git, tag: `v${pkg.version}` };
        }
      }
    },
  };
}

const paper = tegami({
  plugins: [
    rootVersionTag(),
    github({
      repo: REPO,
      versionPr: {
        base: "main",
        // Version Packages 提交由 github-actions[bot] 在 CI 中创建，署上仓库所有者为共同作者。
        commit: () => ({ title: "Version Packages", body: CO_AUTHOR_TRAILER }),
      },
    }),
  ],
});

await runCli(paper);
