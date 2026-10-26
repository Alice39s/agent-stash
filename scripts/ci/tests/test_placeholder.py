from pathlib import Path

import pytest

from agent_stash_ci.placeholder import Auth, check_credentials, placeholder_manifest
from agent_stash_ci.workspace import Manifest, Repository, WorkspacePackage


def package(repository: Repository | None) -> WorkspacePackage:
    manifest = Manifest(
        name="@agent-stash/example", version="1.0.0", license="MIT", repository=repository
    )
    return WorkspacePackage(path=Path("packages/example"), manifest=manifest)


def test_placeholder_manifest_keeps_name_license_and_repository() -> None:
    repository = Repository(
        type="git",
        url="git+https://github.com/Alice39s/agent-stash.git",
        directory="packages/example",
    )
    manifest = placeholder_manifest(package(repository), "0.0.0-placeholder.0")
    assert manifest["name"] == "@agent-stash/example"
    assert manifest["version"] == "0.0.0-placeholder.0"
    assert manifest["license"] == "MIT"
    assert manifest["repository"] == {
        "type": "git",
        "url": "git+https://github.com/Alice39s/agent-stash.git",
        "directory": "packages/example",
    }


def test_placeholder_manifest_requires_a_repository() -> None:
    with pytest.raises(RuntimeError, match="repository"):
        placeholder_manifest(package(None), "0.0.0-placeholder.0")


def test_token_publishing_requires_npm_token(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("NPM_TOKEN", raising=False)
    with pytest.raises(RuntimeError, match="NPM_TOKEN"):
        check_credentials(Auth.TOKEN)


def test_trusted_publishing_refuses_a_token(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("NPM_TOKEN", "npm_example")
    monkeypatch.setenv("ACTIONS_ID_TOKEN_REQUEST_URL", "https://example.invalid")
    with pytest.raises(RuntimeError, match="without NPM_TOKEN"):
        check_credentials(Auth.OIDC)


def test_trusted_publishing_requires_an_id_token(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("NPM_TOKEN", raising=False)
    monkeypatch.delenv("ACTIONS_ID_TOKEN_REQUEST_URL", raising=False)
    with pytest.raises(RuntimeError, match="id-token"):
        check_credentials(Auth.OIDC)
