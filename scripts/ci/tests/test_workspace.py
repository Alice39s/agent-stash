import json
import subprocess
from pathlib import Path

from agent_stash_ci.workspace import (
    Manifest,
    WorkspacePackage,
    manifest_at,
    released_manifests,
)


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


def test_released_manifests_skip_private_packages_listed_in_the_publish_lock(
    tmp_path: Path,
) -> None:
    demo_dir = tmp_path / "packages" / "demo"
    docs_dir = tmp_path / "docs"
    demo_dir.mkdir(parents=True)
    docs_dir.mkdir()
    _git(tmp_path, "init", "--quiet")
    _write_manifest(demo_dir / "package.json", "1.4.0")
    (docs_dir / "package.json").write_text(
        json.dumps({"name": "agent-stash-docs", "version": "0.0.0", "private": True})
    )
    _git(tmp_path, "add", "-A")
    _git(tmp_path, "commit", "--quiet", "-m", "release 1.4.0")

    packages = [
        WorkspacePackage(
            path=docs_dir, manifest=Manifest(name="agent-stash-docs", version="0.0.0")
        ),
        WorkspacePackage(
            path=demo_dir, manifest=Manifest(name="@agent-stash/demo", version="1.4.0")
        ),
    ]
    names = ["@agent-stash/demo", "agent-stash-docs"]
    released = released_manifests(tmp_path, packages, names, "HEAD")
    assert [(manifest.name, manifest.version) for manifest in released] == [
        ("@agent-stash/demo", "1.4.0")
    ]
