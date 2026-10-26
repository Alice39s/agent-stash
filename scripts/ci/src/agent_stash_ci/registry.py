import time
from datetime import datetime
from http import HTTPStatus
from urllib.parse import quote

import requests
from pydantic import BaseModel, Field

from .proc import console

NPM_REGISTRY = "https://registry.npmjs.org"
RESERVED_PREFIX = "0.0.0-"
PLACEHOLDER_PREFIX = f"{RESERVED_PREFIX}placeholder."
PLACEHOLDER_TAG = "placeholder"


class TrustedPublisher(BaseModel):
    id: str


class NpmUser(BaseModel):
    name: str
    trusted_publisher: TrustedPublisher | None = Field(default=None, alias="trustedPublisher")


class Provenance(BaseModel):
    predicate_type: str = Field(alias="predicateType")


class Attestations(BaseModel):
    provenance: Provenance | None = None


class Dist(BaseModel):
    attestations: Attestations | None = None


class PublishedVersion(BaseModel):
    version: str
    dist: Dist
    npm_user: NpmUser | None = Field(default=None, alias="_npmUser")


class Packument(BaseModel):
    """registry 完整文档里发布流程关心的字段。"""

    name: str
    dist_tags: dict[str, str] = Field(alias="dist-tags")
    versions: dict[str, PublishedVersion]
    time: dict[str, datetime]


def registry_client() -> requests.Session:
    return requests.Session()


def fetch_packument(client: requests.Session, name: str) -> Packument | None:
    """读取包的完整文档；registry 还不认识这个包时返回 None。

    registry 的 CDN 会把包文档缓存几分钟且不理会 no-cache 请求头，
    带一个一次性的查询参数才能读到最新内容。
    """
    response = client.get(
        f"{NPM_REGISTRY}/{quote(name, safe='@')}", params={"t": time.time_ns()}, timeout=30
    )
    if response.status_code == HTTPStatus.NOT_FOUND:
        return None
    if not response.ok:
        raise RuntimeError(f"GET {response.url} failed with {response.status_code}")
    return Packument.model_validate_json(response.content)


def is_release(version: str) -> bool:
    """0.0.0 的预发布号只用于占位：本流程的占位版本，以及 npm 处理新包时留下的 `0.0.0-stage`。"""
    return not version.startswith(RESERVED_PREFIX)


def is_placeholder(version: str) -> bool:
    return version.startswith(PLACEHOLDER_PREFIX)


def placeholder_versions(packument: Packument | None) -> list[str]:
    versions = packument.versions if packument is not None else {}
    return sorted(
        (version for version in versions if is_placeholder(version)),
        key=lambda version: int(version.removeprefix(PLACEHOLDER_PREFIX)),
    )


def released_versions(packument: Packument | None) -> list[str]:
    versions = packument.versions if packument is not None else {}
    return [version for version in versions if is_release(version)]


def next_placeholder(packument: Packument | None) -> str:
    taken = [int(v.removeprefix(PLACEHOLDER_PREFIX)) for v in placeholder_versions(packument)]
    return f"{PLACEHOLDER_PREFIX}{max(taken, default=-1) + 1}"


def newest_version(packument: Packument) -> PublishedVersion:
    """按发布时间最新的一版，不论 dist-tag 指向哪里。"""
    return packument.versions[max(packument.versions, key=lambda version: packument.time[version])]


def is_trusted(published: PublishedVersion) -> bool:
    """这一版是否经 npm trusted publishing 发布且带 provenance。"""
    attestations = published.dist.attestations
    return (
        published.npm_user is not None
        and published.npm_user.trusted_publisher is not None
        and attestations is not None
        and attestations.provenance is not None
    )


def wait_for_version(
    client: requests.Session,
    name: str,
    version: str,
    *,
    timeout: float = 600,
    interval: float = 10,
) -> PublishedVersion:
    """轮询 registry 直到新版本出现；npm 处理新发布的版本要几分钟才对外可见。"""
    deadline = time.monotonic() + timeout
    while True:
        packument = fetch_packument(client, name)
        if packument is not None and version in packument.versions:
            return packument.versions[version]
        if time.monotonic() >= deadline:
            raise RuntimeError(f"{name}@{version} did not appear on {NPM_REGISTRY} in {timeout}s")
        console.print(f"Waiting for {name}@{version} to appear on the registry", style="dim")
        time.sleep(interval)
