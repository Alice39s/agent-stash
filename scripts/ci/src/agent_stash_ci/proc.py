import os
import shlex
import subprocess
from collections.abc import Mapping, Sequence
from pathlib import Path

from rich.console import Console

console = Console(stderr=True, highlight=False)


def run(
    args: Sequence[str],
    *,
    cwd: Path,
    env: Mapping[str, str] | None = None,
    stdin: str | None = None,
    capture: bool = False,
) -> str:
    """先回显命令再执行；退出码非零时抛出带命令与目录的错误。`capture` 为真时返回 stdout。"""
    console.print(f"$ {shlex.join(args)}", style="dim", markup=False)
    result = subprocess.run(
        args,
        cwd=cwd,
        env=None if env is None else {**os.environ, **env},
        input=stdin,
        stdout=subprocess.PIPE if capture else None,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(f"`{shlex.join(args)}` exited with code {result.returncode} in {cwd}")
    return result.stdout if capture else ""
