import { tegami, type TegamiPlugin } from "tegami";
import { runCli } from "tegami/cli";
import { github } from "tegami/plugins/github";

const REPO = "Alice39s/agent-stash";
const ROOT_PACKAGE = "agent-stash";

/**
 * 根包不发布到 npm：发布即打 `v<version>` tag 并创建 GitHub release。
 * preflight 抢在 npm 插件之前把根包标记为待发布，willPublish 再跳过 npm publish。
 */
function githubReleaseOnly(): TegamiPlugin {
  return {
    name: "github-release-only",
    enforce: "pre",
    initPublishPlan({ plan }) {
      for (const [id, packagePlan] of plan.packages) {
        const pkg = this.graph.get(id);
        if (pkg?.name === ROOT_PACKAGE && pkg.version) {
          packagePlan.git = { ...packagePlan.git, tag: `v${pkg.version}` };
        }
      }
    },
    publishPreflight({ pkg }) {
      return pkg.name === ROOT_PACKAGE ? { shouldPublish: true } : undefined;
    },
    willPublish({ pkg }) {
      return pkg.name === ROOT_PACKAGE ? false : undefined;
    },
  };
}

const paper = tegami({
  plugins: [githubReleaseOnly(), github({ repo: REPO, versionPr: { base: "main" } })],
});

await runCli(paper);
