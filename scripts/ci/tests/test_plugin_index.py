import json
from collections.abc import Iterator
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread

import pytest
from typer.testing import CliRunner

from agent_stash_ci.cli import app
from agent_stash_ci.plugin_index import (
    IndexedPlugin,
    PluginIndex,
    index_changes,
    newest_versions,
    trim_index_file,
)


def _plugin(name: str, *versions: str, description: str = "A plugin") -> dict[str, object]:
    return {
        "name": name,
        "description": {"en": description},
        "versions": [
            {"version": version, "publishTimestamp": 1, "source": {"type": "npm"}}
            for version in versions
        ],
    }


def _index(*plugins: dict[str, object]) -> dict[str, object]:
    return {"format": 1, "title": "Agent Stash", "plugins": list(plugins)}


def _changes(generated: dict[str, object], published: dict[str, object]) -> list[str]:
    return index_changes(
        PluginIndex.model_validate(generated), PluginIndex.model_validate(published)
    )


def test_an_identical_index_has_no_changes() -> None:
    index = _index(_plugin("@agent-stash/dsh-enhance", "0.3.0", "0.2.1"))
    assert _changes(index, index) == []


def test_a_new_release_is_listed_as_an_added_version() -> None:
    generated = _index(_plugin("@agent-stash/dsh-enhance", "0.3.0", "0.2.1"))
    published = _index(_plugin("@agent-stash/dsh-enhance", "0.2.1"))
    assert _changes(generated, published) == ["@agent-stash/dsh-enhance: +0.3.0"]


def test_added_and_removed_plugins_and_versions_are_listed() -> None:
    generated = _index(_plugin("dsh-context", "0.79.0"), _plugin("dsh-whale-widget", "0.4.2"))
    published = _index(_plugin("dsh-context", "0.78.2"), _plugin("dsh-old", "1.0.0"))
    assert _changes(generated, published) == [
        "dsh-old: removed",
        "dsh-context: +0.79.0 -0.78.2",
        "dsh-whale-widget: added with 0.4.2",
    ]


def test_a_change_outside_the_versions_is_reported_as_metadata() -> None:
    generated = _index(_plugin("dsh-context", "0.78.2", description="New text"))
    published = _index(_plugin("dsh-context", "0.78.2"))
    assert _changes(generated, published) == ["dsh-context: metadata changed"]


def test_a_reordered_index_is_a_change() -> None:
    first, second = _plugin("a", "1.0.0"), _plugin("b", "1.0.0")
    assert _changes(_index(first, second), _index(second, first)) == ["plugin order changed"]


def test_an_unpublished_index_is_a_change() -> None:
    generated = PluginIndex.model_validate(_index(_plugin("a", "1.0.0")))
    assert index_changes(generated, None) == ["no index is published yet"]


def _kept(plugin: dict[str, object], limit: int = 10) -> list[str]:
    trimmed = newest_versions(IndexedPlugin.model_validate(plugin), limit)
    return [entry.version for entry in trimmed.versions]


def test_only_the_ten_highest_versions_are_kept() -> None:
    versions = [f"0.{minor}.0" for minor in range(12, 0, -1)]
    assert _kept(_plugin("dsh-context", *versions)) == versions[:10]


def test_a_plugin_with_few_versions_keeps_them_all() -> None:
    assert _kept(_plugin("@agent-stash/dsh-enhance", "0.3.0", "0.2.1")) == ["0.3.0", "0.2.1"]


def test_versions_are_ranked_by_semver_and_keep_their_listed_order() -> None:
    plugin = _plugin("a", "0.9.0", "0.10.0", "1.0.0-rc.1", "0.2.0", "1.0.0")
    assert _kept(plugin, limit=3) == ["0.10.0", "1.0.0-rc.1", "1.0.0"]


def test_a_version_a_dist_tag_points_to_is_kept() -> None:
    plugin = _plugin("a", "3.0.0", "2.0.0", "1.0.0") | {"dist-tags": {"latest": "1.0.0"}}
    assert _kept(plugin, limit=1) == ["3.0.0", "1.0.0"]


def test_the_trimmed_file_keeps_the_generator_layout(tmp_path: Path) -> None:
    short = {
        "name": "@agent-stash/init",
        "title": {"en": "/init", "zh": "初始化"},
        "icon": "data:image/svg+xml;base64,AA==",
        "metadata": {"keywords": []},
        "versions": [
            {
                "version": "1.4.1",
                "publishTimestamp": 1,
                "source": {"type": "npm"},
                "engines": {"dsh": ">=0.2.1-alpha.2"},
            }
        ],
    }
    long = _plugin("dsh-context", *(f"0.{minor}.0" for minor in range(15, 0, -1)))
    index = {
        "format": 1,
        "title": "Agent Stash",
        "description": "Plugins",
        "plugins": [short, long],
    }
    path = tmp_path / "index.json"
    path.write_text(json.dumps(index, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    trim_index_file(path)
    expected = index | {"plugins": [short, long | {"versions": long["versions"][:10]}]}
    assert (
        path.read_text(encoding="utf-8")
        == json.dumps(expected, indent=2, ensure_ascii=False) + "\n"
    )


@pytest.fixture
def site(tmp_path: Path) -> Iterator[tuple[Path, str]]:
    """一个本地静态站点，代替 GitHub Pages 提供已发布的 index.json。"""
    root = tmp_path / "site"
    root.mkdir()
    handler = partial(SimpleHTTPRequestHandler, directory=root)
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    yield root, f"http://127.0.0.1:{server.server_address[1]}/index.json"
    server.shutdown()
    server.server_close()


def _diff(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, generated: dict[str, object], url: str
) -> tuple[str, str]:
    """运行 `plugin-index-diff`，返回写入的步骤输出与步骤摘要。"""
    index = tmp_path / "index.json"
    index.write_text(json.dumps(generated))
    output, summary = tmp_path / "output", tmp_path / "summary"
    output.touch()
    summary.touch()
    monkeypatch.setenv("GITHUB_OUTPUT", str(output))
    monkeypatch.setenv("GITHUB_STEP_SUMMARY", str(summary))
    result = CliRunner().invoke(
        app, ["plugin-index-diff", "--index", str(index), "--published", url]
    )
    assert result.exit_code == 0, result.output
    return output.read_text(), summary.read_text()


def test_the_command_reports_an_unchanged_index(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, site: tuple[Path, str]
) -> None:
    root, url = site
    index = _index(_plugin("@agent-stash/dsh-enhance", "0.3.0"))
    (root / "index.json").write_text(json.dumps(index))
    assert _diff(tmp_path, monkeypatch, index, url) == ("changed=false\n", "")


def test_the_command_reports_a_stale_index(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, site: tuple[Path, str]
) -> None:
    root, url = site
    (root / "index.json").write_text(
        json.dumps(_index(_plugin("@agent-stash/dsh-enhance", "0.2.1")))
    )
    generated = _index(_plugin("@agent-stash/dsh-enhance", "0.3.0", "0.2.1"))
    output, summary = _diff(tmp_path, monkeypatch, generated, url)
    assert output == "changed=true\n"
    assert summary == "Plugin index changes:\n\n- @agent-stash/dsh-enhance: +0.3.0\n"


def test_the_command_treats_a_missing_index_as_changed(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, site: tuple[Path, str]
) -> None:
    _, url = site
    output, _ = _diff(tmp_path, monkeypatch, _index(_plugin("a", "1.0.0")), url)
    assert output == "changed=true\n"
