# /// script
# requires-python = ">=3.14"
# dependencies = ["jinja2>=3.1", "pyyaml>=6"]
# ///
from pathlib import Path

import yaml
from jinja2 import Environment, FileSystemLoader, StrictUndefined

SCRIPTS_DIR = Path(__file__).resolve().parent
SKILLS_DIR = SCRIPTS_DIR.parent.parent
TEMPLATE_PATH = "self-use-haiku-subagent/scripts/templates/SKILL.md.j2"


def dump_yaml(data: dict[str, object]) -> str:
    return yaml.safe_dump(data, allow_unicode=True, sort_keys=False, width=10_000)


def render_skill(env: Environment, author: str, model: dict[str, object]) -> Path:
    skill_name = f"self-use-{model['slug']}-subagent"
    skill_dir = SKILLS_DIR / skill_name
    description = env.get_template("description.j2").render(m=model).strip()
    short_description = env.get_template("short_description.j2").render(m=model).strip()
    body = env.get_template("SKILL.md.j2").render(m=model)
    frontmatter = dump_yaml(
        {
            "name": skill_name,
            "description": description,
            "metadata": {"author": author, "template": TEMPLATE_PATH},
        }
    )
    display_name = " ".join(part.capitalize() for part in skill_name.split("-"))
    openai = dump_yaml(
        {
            "interface": {
                "display_name": display_name,
                "short_description": short_description,
            }
        }
    )
    (skill_dir / "agents").mkdir(parents=True, exist_ok=True)
    (skill_dir / "SKILL.md").write_text(
        f"---\n{frontmatter}---\n\n{body}", encoding="utf-8"
    )
    (skill_dir / "agents" / "openai.yaml").write_text(openai, encoding="utf-8")
    return skill_dir


def main() -> None:
    config = yaml.safe_load((SCRIPTS_DIR / "models.yaml").read_text(encoding="utf-8"))
    env = Environment(
        loader=FileSystemLoader(SCRIPTS_DIR / "templates"),
        undefined=StrictUndefined,
        keep_trailing_newline=True,
        trim_blocks=True,
        lstrip_blocks=True,
    )
    env.filters["code"] = lambda value: f"`{value}`"
    for model in config["models"]:
        print(render_skill(env, config["author"], model))


if __name__ == "__main__":
    main()
