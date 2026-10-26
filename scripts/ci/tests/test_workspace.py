import json
import subprocess
from pathlib import Path

from agent_stash_ci.workspace import Manifest, WorkspacePackage, manifest_at


def _git(repo: Path, *args: str) -> None:
    subprocess.run(
        ["git", "-c", "user.name=ci", "-c", "user.email=ci@example.com", *args],
        cwd=repo,
        check=True,
        capture_output=True,
    )


def _write_manifest(path: Path, version: str) -> None:
    path.write_text(json.dumps({"name": "@agent-stash/demo", "version": version}))


def test_a_manifest_is_read_from_the_commit_and_not_the_working_tree(tmp_path: Path) -> None:
    package_dir = tmp_path / "packages" / "demo"
    package_dir.mkdir(parents=True)
    _git(tmp_path, "init", "--quiet")
    _write_manifest(package_dir / "package.json", "1.0.0")
    _git(tmp_path, "add", "-A")
    _git(tmp_path, "commit", "--quiet", "-m", "release 1.0.0")
    _write_manifest(package_dir / "package.json", "1.0.1")

    package = WorkspacePackage(
        path=package_dir, manifest=Manifest(name="@agent-stash/demo", version="1.0.1")
    )
    assert manifest_at(tmp_path, package, "HEAD").version == "1.0.0"
