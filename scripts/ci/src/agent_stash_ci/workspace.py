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
