from pathlib import Path

from pydantic import BaseModel, TypeAdapter

from .proc import run


class Repository(BaseModel):
    type: str
    url: str
    directory: str | None = None


class Manifest(BaseModel):
    """package.json 里发布流程读取的字段，其余字段忽略。"""

    name: str
    version: str
    private: bool = False
    license: str | None = None
    repository: Repository | None = None


class WorkspacePackage(BaseModel):
    path: Path
    manifest: Manifest


class _ListedProject(BaseModel):
    path: Path


_LISTING = TypeAdapter(list[_ListedProject])


def repo_root() -> Path:
    return Path(run(["git", "rev-parse", "--show-toplevel"], cwd=Path.cwd(), capture=True).strip())


def workspace_packages(root: Path) -> list[WorkspacePackage]:
    """pnpm 认定的全部工作区项目（含根包），顺序与 `pnpm ls` 一致。"""
    listing = run(["pnpm", "ls", "--recursive", "--depth", "-1", "--json"], cwd=root, capture=True)
    return [
        WorkspacePackage(
            path=project.path,
            manifest=Manifest.model_validate_json((project.path / "package.json").read_bytes()),
        )
        for project in _LISTING.validate_json(listing)
    ]


def publishable_packages(root: Path) -> list[WorkspacePackage]:
    return [package for package in workspace_packages(root) if not package.manifest.private]


def read_at(root: Path, ref: str, path: Path) -> str:
    """读取提交 `ref` 里的文件，`path` 相对仓库根目录；工作区里的改动不影响结果。"""
    return run(["git", "show", f"{ref}:{path.as_posix()}"], cwd=root, capture=True)


def manifest_at(root: Path, package: WorkspacePackage, ref: str) -> Manifest:
    """工作区包在提交 `ref` 里的 package.json。"""
    relative = package.path.resolve().relative_to(root.resolve())
    return Manifest.model_validate_json(read_at(root, ref, relative / "package.json"))


def released_manifests(
    root: Path, packages: list[WorkspacePackage], names: list[str], ref: str
) -> list[Manifest]:
    """发布锁列出的包在提交 `ref` 里的 package.json，按锁里的顺序。

    Tegami 的发布锁列出全部工作区包，文档站 `agent-stash-docs` 这类私有包也在其中。
    私有包不发到 npm，跳过。
    """
    by_name = {package.manifest.name: package for package in packages}
    manifests = [manifest_at(root, by_name[name], ref) for name in names]
    return [manifest for manifest in manifests if not manifest.private]
