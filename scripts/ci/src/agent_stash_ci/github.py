import os
import re
import time
from collections.abc import Callable
from pathlib import Path

from .proc import console, run

_RUN_URL = re.compile(r"/actions/runs/(\d+)")
# GitHub 收到推送后要过几秒才算出 PR 能否合并，这期间 mergeStateStatus 报 UNKNOWN。
_UNCOMPUTED_MERGE_STATE = "UNKNOWN"


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


def merge_state(root: Path, repo: str, number: int) -> str:
    view = ["gh", "pr", "view", str(number), "--repo", repo, "--json", "mergeStateStatus"]
    return run([*view, "--jq", ".mergeStateStatus"], cwd=root, capture=True).strip()


def wait_for_merge_state(
    read: Callable[[], str], *, timeout: float = 120, interval: float = 5
) -> str:
    """轮询到 GitHub 算出合并状态，返回该状态。"""
    deadline = time.monotonic() + timeout
    while True:
        state = read()
        if state != _UNCOMPUTED_MERGE_STATE:
            return state
        if time.monotonic() >= deadline:
            raise RuntimeError(f"GitHub still reports the merge state as {state} after {timeout}s")
        console.print("Waiting for GitHub to compute the merge state", style="dim")
        time.sleep(interval)


def merge_pull_request(root: Path, repo: str, number: int, subject: str, body: str) -> None:
    """能立即合并时 squash 合并，否则开启 auto-merge。

    状态为 UNKNOWN 时 `gh pr merge --auto` 一律改为开启 auto-merge，没有分支保护规则的仓库会拒绝，
    所以先等状态算出来。
    """
    state = wait_for_merge_state(lambda: merge_state(root, repo, number))
    console.print(f"Merge state of #{number}: {state}")
    merge = ["gh", "pr", "merge", str(number), "--repo", repo, "--auto", "--squash"]
    run([*merge, "--delete-branch", "--subject", subject, "--body", body], cwd=root)
