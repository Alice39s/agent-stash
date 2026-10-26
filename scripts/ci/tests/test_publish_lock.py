from pathlib import Path

import pytest

from agent_stash_ci.publish_lock import LOCK_PATH, PublishLock, parse_publish_lock

FIXTURE_ROOT = Path(__file__).parent / "fixtures" / "release"


def test_the_publish_lock_lists_the_released_npm_packages() -> None:
    lock = parse_publish_lock((FIXTURE_ROOT / LOCK_PATH).read_text())
    assert lock.npm_names() == ["@agent-stash/init", "@agent-stash/dsh-message-edit"]


def test_a_publish_lock_entry_outside_npm_is_rejected() -> None:
    lock = PublishLock.model_validate({"npm:packages": [{"id": "cargo:agent-stash"}]})
    with pytest.raises(ValueError, match="not an npm package"):
        lock.npm_names()
