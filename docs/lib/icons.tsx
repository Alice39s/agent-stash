import {
  BookOpen,
  Bot,
  Code,
  Download,
  FileText,
  History,
  Keyboard,
  Palette,
  Pencil,
  Puzzle,
  Rocket,
  Settings2,
  Sparkles,
  SwatchBook,
  Terminal,
  Wand,
} from "lucide-react";
import type { ReactNode } from "react";

/**
 * frontmatter 与 meta.json 里 `icon:` 可以写的图标，也可作为 MDX 组件使用，例如 `<Card icon={<Rocket />} />`。
 * 只列需要的图标，其余 lucide 图标不进入产物。
 */
export const iconComponents = {
  BookOpen,
  Bot,
  Code,
  Download,
  FileText,
  History,
  Keyboard,
  Palette,
  Pencil,
  Puzzle,
  Rocket,
  Settings2,
  Sparkles,
  SwatchBook,
  Terminal,
  Wand,
};

type IconName = keyof typeof iconComponents;

function isIconName(name: string): name is IconName {
  return Object.hasOwn(iconComponents, name);
}

export function resolveIcon(name: string | undefined): ReactNode {
  if (name === undefined) return undefined;
  if (!isIconName(name)) {
    throw new Error(`Unknown icon "${name}"; add it to docs/lib/icons.tsx.`);
  }
  const Icon = iconComponents[name];
  return <Icon />;
}
