"""Tegami 的发布锁 `.tegami/publish-lock.yaml`：Version Packages 提交写下这次发布的包，
发布流程按它把各包的当前版本发到 npm。"""

from pathlib import Path

import yaml
from pydantic import BaseModel, Field

LOCK_PATH = Path(".tegami") / "publish-lock.yaml"
NPM_ID_PREFIX = "npm:"


class _LockedPackage(BaseModel):
    id: str


class PublishLock(BaseModel):
    """发布锁里发布流程关心的字段，其余字段忽略。"""

    npm_packages: list[_LockedPackage] = Field(alias="npm:packages")

    def npm_names(self) -> list[str]:
        names: list[str] = []
        for package in self.npm_packages:
            if not package.id.startswith(NPM_ID_PREFIX):
                raise ValueError(f"publish lock entry {package.id!r} is not an npm package")
            names.append(package.id.removeprefix(NPM_ID_PREFIX))
        return names


def parse_publish_lock(text: str) -> PublishLock:
    return PublishLock.model_validate(yaml.safe_load(text))
