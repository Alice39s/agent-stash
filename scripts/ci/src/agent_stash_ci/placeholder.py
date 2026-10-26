import json
import os
from enum import StrEnum
from pathlib import Path
from tempfile import TemporaryDirectory

from .proc import run
from .registry import PLACEHOLDER_TAG
from .workspace import WorkspacePackage


class Auth(StrEnum):
    TOKEN = "token"
    OIDC = "oidc"


# npm 在运行时展开 `${NPM_TOKEN}`，token 本身不会写到磁盘上。
_USERCONFIG = {
    Auth.TOKEN: "//registry.npmjs.org/:_authToken=${NPM_TOKEN}\n",
    Auth.OIDC: "",
}

_README = """# {name}

This placeholder reserves the package name on npm. Releases of `{name}` are built and
published by GitHub Actions with npm trusted publishing; see the repository linked on this page.
"""


def check_credentials(auth: Auth) -> None:
    """确认凭据来源与 `auth` 一致，避免校验 OIDC 时实际走了 token。"""
    has_token = bool(os.environ.get("NPM_TOKEN"))
    has_oidc = "ACTIONS_ID_TOKEN_REQUEST_URL" in os.environ
    match auth:
        case Auth.TOKEN if not has_token:
            raise RuntimeError("Token publishing needs the NPM_TOKEN environment variable")
        case Auth.OIDC if has_token:
            raise RuntimeError("Trusted publishing must run without NPM_TOKEN")
        case Auth.OIDC if not has_oidc:
            raise RuntimeError("Trusted publishing needs a GitHub Actions job with id-token: write")


def placeholder_manifest(package: WorkspacePackage, version: str) -> dict[str, object]:
    """占位包只带名字、版本、许可证与仓库；provenance 要求 repository 与发布仓库一致。"""
    manifest = package.manifest
    if manifest.repository is None:
        raise RuntimeError(f"{manifest.name} needs a repository field before it can be published")
    return {
        "name": manifest.name,
        "version": version,
        "description": "Placeholder that reserves the name for releases from GitHub Actions",
        **({"license": manifest.license} if manifest.license else {}),
        "repository": manifest.repository.model_dump(exclude_none=True),
    }


def publish_placeholder(
    package: WorkspacePackage, version: str, auth: Auth, work_dir: Path
) -> None:
    work_dir.mkdir(parents=True, exist_ok=True)
    with TemporaryDirectory(prefix="placeholder-", dir=work_dir) as staging:
        package_dir = Path(staging) / "package"
        package_dir.mkdir()
        manifest = placeholder_manifest(package, version)
        (package_dir / "package.json").write_text(json.dumps(manifest, indent=2) + "\n")
        (package_dir / "README.md").write_text(_README.format(name=package.manifest.name))
        userconfig = Path(staging) / "npmrc"
        userconfig.write_text(_USERCONFIG[auth])
        args = [
            "npm",
            "publish",
            "--access",
            "public",
            "--tag",
            PLACEHOLDER_TAG,
            "--ignore-scripts",
        ]
        if auth is Auth.OIDC:
            args.append("--provenance")
        run(args, cwd=package_dir, env={"NPM_CONFIG_USERCONFIG": str(userconfig)})
