import time
from http import HTTPStatus

import requests
from pydantic import BaseModel, ConfigDict


class IndexedVersion(BaseModel):
    """索引里的一个版本；版本号以外的字段原样保留，参与比较。"""

    model_config = ConfigDict(extra="allow")

    version: str


class IndexedPlugin(BaseModel):
    """索引里的一个插件；名称与版本以外的字段原样保留，参与比较。"""

    model_config = ConfigDict(extra="allow")

    name: str
    versions: list[IndexedVersion]


class PluginIndex(BaseModel):
    """DSH 插件索引；插件列表以外的字段原样保留，参与比较。"""

    model_config = ConfigDict(extra="allow")

    plugins: list[IndexedPlugin]


def fetch_published(url: str) -> PluginIndex | None:
    """读取已发布的索引；站点上还没有索引时返回 None。

    GitHub Pages 的 CDN 会把文件缓存约十分钟，带一个一次性的查询参数才能读到最近一次部署的内容。
    """
    response = requests.get(url, params={"t": time.time_ns()}, timeout=30)
    if response.status_code == HTTPStatus.NOT_FOUND:
        return None
    if not response.ok:
        raise RuntimeError(f"GET {response.url} failed with {response.status_code}")
    return PluginIndex.model_validate_json(response.content)


def _versions(plugin: IndexedPlugin) -> list[str]:
    return [entry.version for entry in plugin.versions]


def index_changes(generated: PluginIndex, published: PluginIndex | None) -> list[str]:
    """列出新生成的索引与已发布索引的差别，一处一行；两者相同时返回空列表。"""
    if published is None:
        return ["no index is published yet"]
    changes: list[str] = []
    if generated.model_dump(exclude={"plugins"}) != published.model_dump(exclude={"plugins"}):
        changes.append("index title, description, or format changed")
    before = {plugin.name: plugin for plugin in published.plugins}
    listed = {plugin.name for plugin in generated.plugins}
    changes.extend(
        f"{plugin.name}: removed" for plugin in published.plugins if plugin.name not in listed
    )
    for plugin in generated.plugins:
        old = before.get(plugin.name)
        if old is None:
            changes.append(f"{plugin.name}: added with {', '.join(_versions(plugin))}")
            continue
        if old == plugin:
            continue
        versions, old_versions = _versions(plugin), _versions(old)
        moved = [f"+{v}" for v in versions if v not in old_versions] + [
            f"-{v}" for v in old_versions if v not in versions
        ]
        changes.append(f"{plugin.name}: {' '.join(moved) if moved else 'metadata changed'}")
    if not changes and generated != published:
        changes.append("plugin order changed")
    return changes
