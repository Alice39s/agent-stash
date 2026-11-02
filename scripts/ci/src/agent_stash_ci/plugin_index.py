import time
from http import HTTPStatus
from pathlib import Path
from typing import Self

import requests
import yaml
from pydantic import (
    BaseModel,
    ConfigDict,
    SerializerFunctionWrapHandler,
    field_validator,
    model_serializer,
    model_validator,
)
from semver import Version

MAX_VERSIONS = 10
"""每个插件在发布的索引里最多列出的版本数。"""


def _move_last(data: dict[str, object], *keys: str) -> dict[str, object]:
    """把 `keys` 挪到末尾，其余字段保持原顺序；输出与生成器写出的字段顺序一致。"""
    return {key: value for key, value in data.items() if key not in keys} | {
        key: data[key] for key in keys if key in data
    }


class IndexedVersion(BaseModel):
    """索引里的一个版本；版本号以外的字段原样保留，参与比较。"""

    model_config = ConfigDict(extra="allow")

    version: str


class IndexedPlugin(BaseModel):
    """索引里的一个插件；名称与版本以外的字段原样保留，参与比较。"""

    model_config = ConfigDict(extra="allow")

    name: str
    versions: list[IndexedVersion]

    @model_serializer(mode="wrap")
    def _versions_last(self, handler: SerializerFunctionWrapHandler) -> dict[str, object]:
        return _move_last(handler(self), "versions")

    def tagged_versions(self) -> set[str]:
        """`dist-tags` 指向的版本号；索引格式要求这些版本都在列表里。"""
        tags = (self.model_extra or {}).get("dist-tags", {})
        if not isinstance(tags, dict):
            raise TypeError(f"{self.name}: dist-tags is not an object")
        return {str(version) for version in tags.values()}


class PluginIndex(BaseModel):
    """DSH 插件索引；插件列表以外的字段原样保留，参与比较。"""

    model_config = ConfigDict(extra="allow")

    plugins: list[IndexedPlugin]

    @model_serializer(mode="wrap")
    def _plugins_last(self, handler: SerializerFunctionWrapHandler) -> dict[str, object]:
        return _move_last(handler(self), "plugins")


class Declaration(BaseModel):
    """索引声明的一个分类或标签：id 对应的显示名称，按语言给出，必须有英文。"""

    model_config = ConfigDict(extra="forbid")

    title: dict[str, str]

    @field_validator("title")
    @classmethod
    def _has_english(cls, title: dict[str, str]) -> dict[str, str]:
        if "en" not in title:
            raise ValueError("title needs an en entry")
        return title


class ListedPlugin(BaseModel):
    """来源列表里的一个插件：npm 包名，以及索引给它的分类和标签。"""

    model_config = ConfigDict(extra="forbid")

    name: str
    category: str
    labels: list[str]


class IndexSources(BaseModel):
    """dsh/plugin-index.yaml：生成器读取的插件列表，以及索引声明的分类和标签。"""

    model_config = ConfigDict(extra="forbid")

    categories: dict[str, Declaration]
    labels: dict[str, Declaration]
    plugins: list[ListedPlugin]

    @model_validator(mode="after")
    def _references_are_declared(self) -> Self:
        names = [plugin.name for plugin in self.plugins]
        if len(set(names)) != len(names):
            raise ValueError("plugins lists a package more than once")
        for plugin in self.plugins:
            if plugin.category not in self.categories:
                raise ValueError(f"{plugin.name}: category {plugin.category!r} is not declared")
            undeclared = [label for label in plugin.labels if label not in self.labels]
            if undeclared:
                raise ValueError(f"{plugin.name}: labels {undeclared} are not declared")
            if len(set(plugin.labels)) != len(plugin.labels):
                raise ValueError(f"{plugin.name}: labels repeat an id")
        return self

    def source_list(self) -> str:
        """生成器的输入：每行一个 npm 包名，顺序即索引里插件的顺序。"""
        return "".join(f"{plugin.name}\n" for plugin in self.plugins)


def load_sources(path: Path) -> IndexSources:
    return IndexSources.model_validate(yaml.safe_load(path.read_text(encoding="utf-8")))


def categorize(index: PluginIndex, sources: IndexSources) -> PluginIndex:
    """在索引里声明分类和标签，并写入每个插件的分类和标签；生成器写出的关键词保持不变。"""
    listed = {plugin.name: plugin for plugin in sources.plugins}
    data = index.model_dump()
    data["metadata"] = sources.model_dump(include={"categories", "labels"})
    for plugin in data["plugins"]:
        entry = listed[plugin["name"]]
        plugin["metadata"] = plugin.get("metadata", {}) | {
            "category": entry.category,
            "labels": entry.labels,
        }
    return PluginIndex.model_validate(data)


def newest_versions(plugin: IndexedPlugin, limit: int) -> IndexedPlugin:
    """只留 SemVer 最高的 `limit` 个版本和 `dist-tags` 指向的版本，按原来的顺序排列。"""
    ranked = sorted(plugin.versions, key=lambda entry: Version.parse(entry.version), reverse=True)
    kept = {entry.version for entry in ranked[:limit]} | plugin.tagged_versions()
    versions = [entry for entry in plugin.versions if entry.version in kept]
    return plugin.model_copy(update={"versions": versions})


def finish_index_file(path: Path, sources: IndexSources, limit: int = MAX_VERSIONS) -> None:
    """把生成的索引改写为每个插件只列最新的 `limit` 个版本，并写入分类和标签。"""
    index = PluginIndex.model_validate_json(path.read_bytes())
    trimmed = index.model_copy(
        update={"plugins": [newest_versions(plugin, limit) for plugin in index.plugins]}
    )
    finished = categorize(trimmed, sources)
    path.write_text(f"{finished.model_dump_json(indent=2)}\n", encoding="utf-8")


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
        changes.append("index title, description, format, categories, or labels changed")
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
