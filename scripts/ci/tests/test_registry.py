from pathlib import Path

import pytest

from agent_stash_ci import registry

FIXTURE = Path(__file__).parent / "fixtures" / "packument.json"


@pytest.fixture
def packument() -> registry.Packument:
    return registry.Packument.model_validate_json(FIXTURE.read_bytes())


def test_placeholders_and_releases_are_told_apart(packument: registry.Packument) -> None:
    assert registry.placeholder_versions(packument) == [
        "0.0.0-placeholder.0",
        "0.0.0-placeholder.1",
    ]
    assert registry.released_versions(packument) == ["0.3.0"]


def test_the_staged_publishing_version_is_not_a_release() -> None:
    assert not registry.is_release("0.0.0-stage")
    assert not registry.is_placeholder("0.0.0-stage")
    assert registry.is_release("0.0.1")


def test_next_placeholder_follows_the_highest_index(packument: registry.Packument) -> None:
    assert registry.next_placeholder(packument) == "0.0.0-placeholder.2"


def test_an_unknown_package_starts_at_placeholder_zero() -> None:
    assert registry.next_placeholder(None) == "0.0.0-placeholder.0"
    assert registry.released_versions(None) == []


def test_trusted_publishing_needs_a_trusted_publisher_and_provenance(
    packument: registry.Packument,
) -> None:
    assert not registry.is_trusted(packument.versions["0.0.0-placeholder.0"])
    assert registry.is_trusted(packument.versions["0.0.0-placeholder.1"])


def test_newest_version_follows_publish_time(packument: registry.Packument) -> None:
    assert registry.newest_version(packument).version == "0.3.0"
