import os
import re
from pathlib import Path

from .proc import run

_RUN_URL = re.compile(r"/actions/runs/(\d+)")


def write_step_summary(markdown: str) -> None:
    """在 GitHub Actions 里把 Markdown 追加到当前步骤摘要；本地运行时什么也不做。"""
    path = os.environ.get("GITHUB_STEP_SUMMARY")
    if path:
        with Path(path).open("a") as summary:
            summary.write(markdown)


def write_output(name: str, value: str) -> None:
    """在 GitHub Actions 里设置当前步骤的输出；本地运行时什么也不做。"""
    path = os.environ.get("GITHUB_OUTPUT")
    if path:
        with Path(path).open("a") as output:
            output.write(f"{name}={value}\n")


def repo_slug(root: Path) -> str:
    view = ["gh", "repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"]
    return run(view, cwd=root, capture=True).strip()


def set_secret(root: Path, repo: str, name: str, value: str) -> None:
    """经 stdin 交给 gh，值不出现在命令行参数与输出里。"""
    run(["gh", "secret", "set", name, "--repo", repo], cwd=root, stdin=value)


def delete_secret(root: Path, repo: str, name: str) -> None:
    run(["gh", "secret", "delete", name, "--repo", repo], cwd=root)


def dispatch_workflow(
    root: Path, repo: str, workflow: str, ref: str, inputs: dict[str, str]
) -> int:
    """触发 workflow_dispatch 并返回新运行的 id。"""
    fields = [arg for key, value in inputs.items() for arg in ("-f", f"{key}={value}")]
    command = ["gh", "workflow", "run", workflow, "--repo", repo, "--ref", ref, *fields]
    output = run(command, cwd=root, capture=True)
    match = _RUN_URL.search(output)
    if match is None:
        raise RuntimeError(f"gh workflow run reported no run URL: {output.strip()}")
    return int(match.group(1))


def watch_run(root: Path, repo: str, run_id: int) -> None:
    watch = ["gh", "run", "watch", str(run_id), "--repo", repo, "--exit-status", "--interval", "10"]
    run(watch, cwd=root)
