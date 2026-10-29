import os
from enum import StrEnum
from pathlib import Path
from typing import Annotated

import typer
from rich.console import Console
from rich.table import Column, Table

from . import github, registry
from .placeholder import Auth, check_credentials, publish_placeholder
from .proc import console, run
from .publish_lock import LOCK_PATH, parse_publish_lock
from .workspace import (
    WorkspacePackage,
    publishable_packages,
    read_at,
    released_manifests,
    repo_root,
    workspace_packages,
)


def _typer(summary: str) -> typer.Typer:
    # 局部变量里可能有 token，异常回溯一律不打印 locals。
    return typer.Typer(help=summary, no_args_is_help=True, pretty_exceptions_show_locals=False)


app = _typer("CI and release tasks for the agent-stash workspace.")
npm_app = _typer("Inspect npm packages and publish placeholder versions.")
bootstrap_app = _typer("Drive the one-time npm trusted publishing setup from a workstation.")
app.add_typer(npm_app, name="npm")
app.add_typer(bootstrap_app, name="bootstrap")

stdout = Console(highlight=False)

RELEASE_WORKFLOW = "release.yml"
TOKEN_SECRET = "NPM_TOKEN"


class SyncTarget(StrEnum):
    INIT_PROMPTS = "init-prompts"
    CODE_STYLEGUIDE = "code-styleguide"


_SYNC_INTRO = {
    SyncTarget.INIT_PROMPTS: "Upstream `/init` prompts at their default branch heads:",
    SyncTarget.CODE_STYLEGUIDE: (
        "Regenerated `skills/code-styleguide` from the upstream style guides:"
    ),
}


@app.command()
def bundle(
    check: Annotated[
        bool, typer.Option(help="Fail when the rebuilt output differs from the checkout.")
    ] = False,
) -> None:
    """Rebuild the committed bundles of every workspace package."""
    root = repo_root()
    run(["pnpm", "--recursive", "--include-workspace-root", "run", "bundle"], cwd=root)
    if not check:
        return
    changes = run(["git", "status", "--porcelain"], cwd=root, capture=True)
    if changes:
        run(["git", "--no-pager", "diff", "--stat"], cwd=root)
        console.print(
            "Bundled output differs from the checkout. Run `uv run --project scripts/ci ci bundle`"
            f" and commit the result:\n{changes}",
            markup=False,
        )
        raise typer.Exit(1)


@app.command()
def sync(
    target: SyncTarget,
    body: Annotated[Path, typer.Option(help="File that receives the pull request body.")],
) -> None:
    """Regenerate vendored upstream content and write a pull request body listing the result."""
    report = run(["pnpm", "--silent", f"sync:{target}"], cwd=repo_root(), capture=True)
    text = f"{_SYNC_INTRO[target]}\n\n```\n{report}```\n"
    body.write_text(text)
    stdout.print(text, markup=False)


@app.command("plugin-index")
def plugin_index(
    dsh: Annotated[
        Path, typer.Option(help="Checkout of deepseek-ai/deepseek-harness with the generator.")
    ],
    output: Annotated[Path, typer.Option(help="index.json to write.")],
    cache: Annotated[Path, typer.Option(help="Generator result cache, kept between runs.")],
) -> None:
    """Generate the DSH plugin index from dsh/plugin-index.txt with DSH's reference generator."""
    generator = "@deepseek-ai/dsh-plugin-market-generator"
    run(["pnpm", "install", "--frozen-lockfile", "--filter", f"{generator}..."], cwd=dsh)
    run(
        [
            "pnpm", "--filter", generator, "start",
            "--input", str(repo_root() / "dsh" / "plugin-index.txt"),
            "--output", str(output.resolve()),
            "--cache", str(cache.resolve()),
            "--title", "Agent Stash",
            "--description", "Agent Stash bundles plus recommended third-party DSH plugins",
        ],
        cwd=dsh,
    )  # fmt: skip


@app.command()
def docs(
    base_path: Annotated[
        str,
        typer.Option(
            envvar="DOCS_BASE_PATH", help="Path prefix the site is served under, e.g. /agent-stash."
        ),
    ],
    origin: Annotated[
        str,
        typer.Option(envvar="SITE_ORIGIN", help="Origin of the published site, for absolute URLs."),
    ],
) -> None:
    """Export the docs site to docs/out for GitHub Pages."""
    run(
        ["pnpm", "--filter", "agent-stash-docs", "build"],
        cwd=repo_root(),
        env={"DOCS_BASE_PATH": base_path, "SITE_ORIGIN": origin},
    )


@npm_app.command()
def status() -> None:
    """List publishable packages on npm and whether trusted publishing made their newest version."""
    table = Table(
        *(
            Column(header, overflow="fold")
            for header in (
                "Package",
                "Local",
                "npm latest",
                "Releases",
                "Placeholders",
                "Trusted publishing",
            )
        )
    )
    with registry.registry_client() as client:
        for package in publishable_packages(repo_root()):
            name = package.manifest.name
            packument = registry.fetch_packument(client, name)
            if packument is None:
                table.add_row(name, package.manifest.version, "not on npm", "0", "0", "-")
                continue
            newest = registry.newest_version(packument)
            trusted = f"yes ({newest.version})" if registry.is_trusted(newest) else "no"
            table.add_row(
                name,
                package.manifest.version,
                packument.dist_tags.get("latest", "-"),
                str(len(registry.released_versions(packument))),
                str(len(registry.placeholder_versions(packument))),
                trusted,
            )
    stdout.print(table)


@npm_app.command()
def wait(
    ref: Annotated[
        str,
        typer.Option(envvar="GITHUB_SHA", help="Commit whose publish lock and versions to read."),
    ] = "HEAD",
) -> None:
    """Wait until npm serves the version of every public package in a commit's publish lock.

    npm needs a few minutes before installs can see a new version.
    Waiting here lets the workflows after Release, such as the plugin index, list the release.
    Versions released earlier are already on npm, so later runs return at once.
    """
    root = repo_root()
    # 开 Version Packages PR 时 `tegami ci` 把 HEAD 留在升过版本的提交上，所以读触发工作流的提交。
    lock = parse_publish_lock(read_at(root, ref, LOCK_PATH))
    manifests = released_manifests(root, workspace_packages(root), lock.npm_names(), ref)
    with registry.registry_client() as client:
        for manifest in manifests:
            published = registry.wait_for_version(client, manifest.name, manifest.version)
            stdout.print(f"npm serves {manifest.name}@{published.version}")


def _select(packages: list[WorkspacePackage], names: list[str]) -> list[WorkspacePackage]:
    if not names:
        return packages
    unknown = set(names) - {package.manifest.name for package in packages}
    if unknown:
        raise typer.BadParameter(
            f"not a publishable workspace package: {', '.join(sorted(unknown))}"
        )
    return [package for package in packages if package.manifest.name in names]


@npm_app.command()
def placeholder(
    auth: Annotated[
        Auth, typer.Option(envvar="PLACEHOLDER_AUTH", help="Credential to publish with.")
    ],
    package: Annotated[
        list[str] | None, typer.Option("--package", "-p", help="Limit to these package names.")
    ] = None,
    dry_run: Annotated[bool, typer.Option(help="List the versions without publishing.")] = False,
) -> None:
    """Publish an empty placeholder version of every package that has no release on npm yet.

    `--auth token` publishes with NPM_TOKEN and can create a package that npm does not know yet.
    `--auth oidc` publishes through npm trusted publishing and requires provenance on the result.
    """
    root = repo_root()
    if not dry_run:
        check_credentials(auth)
    work_dir = Path(os.environ.get("RUNNER_TEMP") or root / ".scratch" / "ci")
    rows: list[str] = []
    with registry.registry_client() as client:
        for target in _select(publishable_packages(root), package or []):
            name = target.manifest.name
            packument = registry.fetch_packument(client, name)
            if registry.released_versions(packument):
                console.print(f"Skipping {name}: it already has releases on npm")
                continue
            version = registry.next_placeholder(packument)
            if dry_run:
                stdout.print(f"Would publish {name}@{version} with {auth}")
                continue
            publish_placeholder(target, version, auth, work_dir)
            published = registry.wait_for_version(client, name, version)
            trusted = registry.is_trusted(published)
            if auth is Auth.OIDC and not trusted:
                raise RuntimeError(f"{name}@{version} carries no trusted publisher provenance")
            stdout.print(f"Published {name}@{version} with {auth}; trusted publishing: {trusted}")
            rows.append(f"| `{name}` | `{version}` | {auth} | {'yes' if trusted else 'no'} |")
    if rows:
        header = (
            "| Package | Version | Credential | Trusted publishing |\n| --- | --- | --- | --- |"
        )
        github.write_step_summary(
            f"### Placeholder versions\n\n{header}\n" + "\n".join(rows) + "\n"
        )


@bootstrap_app.command("store-token")
def store_token() -> None:
    """Move an npm token from the clipboard into the NPM_TOKEN secret and clear the clipboard.

    Copy the token on npmjs.com and run this command; the token never reaches the terminal.
    """
    root = repo_root()
    token = run(["pbpaste"], cwd=root, capture=True).strip()
    if not token.startswith("npm_"):
        raise RuntimeError("The clipboard does not hold an npm access token")
    github.set_secret(root, github.repo_slug(root), TOKEN_SECRET, token)
    run(["pbcopy"], cwd=root, stdin="")
    stdout.print(f"Stored the {TOKEN_SECRET} secret and cleared the clipboard")


@bootstrap_app.command("remove-token")
def remove_token() -> None:
    """Delete the NPM_TOKEN secret once trusted publishing works."""
    root = repo_root()
    github.delete_secret(root, github.repo_slug(root), TOKEN_SECRET)


@bootstrap_app.command()
def publish(
    auth: Annotated[Auth, typer.Option(help="Credential the workflow publishes with.")],
    ref: Annotated[str, typer.Option(help="Branch that holds the workflow.")] = "main",
) -> None:
    """Run the Release workflow in placeholder mode and wait for it to finish."""
    root = repo_root()
    repo = github.repo_slug(root)
    run_id = github.dispatch_workflow(root, repo, RELEASE_WORKFLOW, ref, {"placeholder": auth})
    github.watch_run(root, repo, run_id)
