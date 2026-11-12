import pytest

from agent_stash_ci import github


def test_waiting_returns_the_first_computed_merge_state() -> None:
    states = iter(["UNKNOWN", "UNKNOWN", "UNSTABLE"])
    assert github.wait_for_merge_state(lambda: next(states), interval=0) == "UNSTABLE"


def test_a_computed_merge_state_returns_without_waiting() -> None:
    assert github.wait_for_merge_state(lambda: "CLEAN", timeout=0) == "CLEAN"


def test_waiting_fails_when_the_merge_state_stays_unknown() -> None:
    with pytest.raises(RuntimeError, match="UNKNOWN"):
        github.wait_for_merge_state(lambda: "UNKNOWN", timeout=0, interval=0)
