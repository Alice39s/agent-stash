/**
 * design.md 第 8 章检查 1：扫描各界面的 CSS Module，只引用 design 点名的 token、插件自己的 `--scout-*`
 * 与图表的 `--chart-*`；不写颜色字面量，也不写字号、行高、字重的字面量；混色比例在 10% 到 55% 之间。
 * 另外检查两条结构：容器查询只用本文件声明的容器名（CSS Modules 按文件给容器名加前缀），
 * 行与详情的元信息只占一行、只有路径一项收窄（design 3.1、4.10）。
 * 用打包时同一个解析器（lightningcss）读样式表。
 */
import { readdirSync, readFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";
import {
  transform,
  type ContainerNameList,
  type CssColor,
  type Declaration,
  type Selector,
  type SelectorComponent,
  type TokenOrValue,
} from "lightningcss";
import { describe, expect, test } from "vitest";

const CLIENT = new URL("./", import.meta.url);
const DESIGN = readFileSync(new URL("../../design.md", import.meta.url), "utf8");

/** design 第 7 章点名、主题里没有的名字。 */
const UNDEFINED: ReadonlySet<string> = new Set([
  "--dsw-alias-state-error-label",
  "--dsw-font-family-mono",
  "--dsw-alias-fill-l1",
  "--dsw-alias-bg-mask",
]);

/** 按前缀开放的名字：圆角 token、插件自己的属性、图表组件的属性。 */
const PREFIXES = ["--dsw-radius-", "--scout-", "--chart-"] as const;

/** design 里出现的全部自定义属性名，去掉主题里没有的。 */
const NAMED: ReadonlySet<string> = new Set(
  [...DESIGN.matchAll(/--[a-z][a-z0-9-]*[a-z0-9]/gu)]
    .map((match) => match[0])
    .filter((name) => !UNDEFINED.has(name)),
);

/** 只能用 `font` 简写的 token 设置的属性。 */
const TYPE_PROPERTIES: ReadonlySet<string> = new Set(["font-size", "line-height", "font-weight"]);

/** 插件设置页由宿主的设置表单渲染，不在 design 的范围里。 */
const OUT_OF_SCOPE: ReadonlySet<string> = new Set(["settings.module.css"]);

function allowed(name: string): boolean {
  return NAMED.has(name) || PREFIXES.some((prefix) => name.startsWith(prefix));
}

function stylesheets(): string[] {
  return readdirSync(CLIENT, { recursive: true })
    .map(String)
    .filter((file) => file.endsWith(".module.css") && !OUT_OF_SCOPE.has(file))
    .toSorted();
}

/** 颜色字面量；currentColor 与 transparent 不算。 */
function isLiteral(color: CssColor): boolean {
  if (typeof color !== "object" || !("type" in color)) return true;
  if (color.type === "currentcolor") return false;
  return !(color.type === "rgb" && color.alpha === 0);
}

/** 函数参数里的百分比，0 到 1。 */
function percentages(values: readonly TokenOrValue[]): number[] {
  return values.flatMap((entry) =>
    entry.type === "token" && entry.value.type === "percentage" ? [entry.value.value] : [],
  );
}

/** 一个样式表里不合规的引用与字面量。 */
function review(file: string): string[] {
  const problems: string[] = [];
  transform({
    filename: file,
    code: readFileSync(new URL(file, CLIENT)),
    cssModules: true,
    errorRecovery: false,
    visitor: {
      Variable(variable) {
        if (!allowed(variable.name.ident)) problems.push(`var(${variable.name.ident})`);
      },
      Declaration(declaration) {
        // lightningcss 也把它不认识的普通属性记为 custom；只检查以 -- 开头的自定义属性。
        if (declaration.property === "custom") {
          const { name } = declaration.value;
          if (name.startsWith("--") && !allowed(name)) problems.push(`sets ${name}`);
          return;
        }
        const property =
          declaration.property === "unparsed"
            ? declaration.value.propertyId.property
            : declaration.property;
        if (TYPE_PROPERTIES.has(property)) problems.push(`literal ${property}`);
        if (declaration.property === "font") problems.push("literal font");
      },
      Color(color) {
        if (isLiteral(color)) problems.push(`color literal ${JSON.stringify(color)}`);
      },
      Function(fn) {
        if (fn.name !== "color-mix") return;
        for (const share of percentages(fn.arguments)) {
          if (share < 0.1 || share > 0.55) problems.push(`color-mix ${String(share)}`);
        }
      },
    },
  });
  return problems;
}

/** 一条样式规则：选择器列表与声明。 */
interface StyleRule {
  readonly selectors: readonly Selector[];
  readonly declarations: readonly Declaration[];
}

/** 一个样式表里的全部样式规则（含 @media、@container 里的）与容器名。 */
function structureOf(file: string): {
  readonly rules: readonly StyleRule[];
  readonly declared: ReadonlySet<string>;
  readonly queried: ReadonlySet<string>;
} {
  const rules: StyleRule[] = [];
  const declared = new Set<string>();
  const queried = new Set<string>();
  const names = (value: ContainerNameList) => {
    if (value.type === "names") for (const name of value.value) declared.add(name);
  };
  transform({
    filename: file,
    code: readFileSync(new URL(file, CLIENT)),
    errorRecovery: false,
    visitor: {
      Rule: {
        style(rule) {
          rules.push({
            selectors: rule.value.selectors,
            declarations: rule.value.declarations?.declarations ?? [],
          });
        },
        container(rule) {
          if (rule.value.name !== null && rule.value.name !== undefined)
            queried.add(rule.value.name);
        },
      },
      Declaration: {
        container(declaration) {
          if (declaration.property === "container") names(declaration.value.name);
        },
        "container-name"(declaration) {
          if (declaration.property === "container-name") names(declaration.value);
        },
      },
    },
  });
  return { rules, declared, queried };
}

/** 选择器正好是 `selector` 的规则里的全部声明。 */
function declarationsOf(rules: readonly StyleRule[], selector: Selector): Declaration[] {
  return rules
    .filter((rule) => rule.selectors.some((entry) => isDeepStrictEqual(entry, selector)))
    .flatMap((rule) => rule.declarations);
}

function className(name: string): SelectorComponent {
  return { type: "class", name };
}

const FILL: SelectorComponent = {
  type: "attribute",
  namespace: null,
  name: "data-fill",
  operation: null,
};

/** 选择器里出现的类名。 */
function classesOf(selector: Selector): string[] {
  return selector.flatMap((component) => (component.type === "class" ? [component.name] : []));
}

describe("design review check 1", () => {
  test("reads the public names from design.md", () => {
    expect(NAMED.has("--dsw-alias-bg-base")).toBe(true);
    expect(NAMED.has("--ds-font-family-code")).toBe(true);
    expect(NAMED.has("--dsh-composer-height")).toBe(true);
    for (const name of UNDEFINED) expect(NAMED.has(name)).toBe(false);
    expect(stylesheets()).toContain("ui/list-row.module.css");
  });

  test.each(stylesheets())(
    "%s uses only public names, type tokens, and no color literals",
    (file) => {
      expect(review(file)).toEqual([]);
    },
  );
});

describe("stylesheet structure", () => {
  test("reads container names and queries", () => {
    const layout = structureOf("layout.module.css");
    expect([...layout.declared]).toEqual(["scout-split"]);
    expect([...layout.queried]).toEqual(["scout-split"]);
  });

  test.each(stylesheets())("%s queries only containers it names itself", (file) => {
    const { declared, queried } = structureOf(file);
    expect([...queried].filter((name) => !declared.has(name))).toEqual([]);
  });

  test.each(["ui/list-row.module.css", "detail.module.css"])(
    "%s keeps the metadata on one line and lets only the filling item shrink",
    (file) => {
      const { rules } = structureOf(file);
      expect(declarationsOf(rules, [className("meta")])).toEqual(
        expect.arrayContaining([
          { property: "flex-wrap", vendorPrefix: [], value: "nowrap" },
          { property: "white-space", value: "nowrap" },
          { property: "overflow", value: { x: "hidden", y: "hidden" } },
        ]),
      );
      expect(declarationsOf(rules, [className("metaItem")])).toContainEqual({
        property: "flex",
        vendorPrefix: [],
        value: { grow: 0, shrink: 0, basis: { type: "auto" } },
      });
      expect(declarationsOf(rules, [className("metaItem"), FILL])).toEqual(
        expect.arrayContaining([
          {
            property: "flex",
            vendorPrefix: [],
            value: { grow: 1, shrink: 1, basis: { type: "auto" } },
          },
          {
            property: "min-width",
            value: {
              type: "length-percentage",
              value: { type: "dimension", value: { unit: "px", value: 0 } },
            },
          },
        ]),
      );
    },
  );

  test.each(stylesheets())("%s caps no width inside a metadata line", (file) => {
    const capped = structureOf(file).rules.filter(
      (rule) =>
        rule.selectors.some((selector) =>
          classesOf(selector).some(
            (name) => name === "meta" || name === "metaItem" || name === "path",
          ),
        ) && rule.declarations.some((declaration) => declaration.property === "max-width"),
    );
    expect(capped).toEqual([]);
  });
});
