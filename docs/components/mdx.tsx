import { Accordion, Accordions } from "fumadocs-ui/components/accordion";
import { Cards } from "fumadocs-ui/components/card";
import { CodeBlock, Pre } from "fumadocs-ui/components/codeblock";
import { File, Files, Folder } from "fumadocs-ui/components/files";
import { ImageZoom } from "fumadocs-ui/components/image-zoom";
import { Step, Steps } from "fumadocs-ui/components/steps";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import { TypeTable } from "fumadocs-ui/components/type-table";
import defaultMdxComponents from "fumadocs-ui/mdx";
import type { ImageProps } from "fumadocs-core/framework";
import type { MDXComponents } from "mdx/types";
import type { ComponentProps } from "react";
import { Callout } from "./callout";
import { Card } from "./card";
import { Kbd, Keys } from "./kbd";
import { Showcase } from "./showcase";
import { iconComponents } from "@/lib/icons";
import { routeHref } from "@/lib/shared";

const DefaultLink = defaultMdxComponents.a;

type PreProps = ComponentProps<"pre"> & { "data-label"?: string };

/** 滚动区域由 `rehypeCodeLabels` 命名的代码块。 */
function LabelledPre({ "data-label": label, children, ref: _ref, ...props }: PreProps) {
  if (label === undefined) throw new Error("A code block reached the page without a label.");
  return (
    <CodeBlock {...props} viewportProps={{ "aria-label": label }}>
      <Pre>{children}</Pre>
    </CodeBlock>
  );
}

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    ...iconComponents,
    a: ({ href, ...props }: ComponentProps<"a">) => (
      <DefaultLink {...props} href={href === undefined ? href : routeHref(href)} />
    ),
    // 文中图片以导入的文件到达这里，Fumadocs 的图片属性同时描述字符串地址与导入的图片。
    img: (props: ImageProps) => <ImageZoom {...props} />,
    pre: LabelledPre,
    Accordion,
    Accordions,
    Callout,
    Card,
    // design.md 的卡片间隔 16px。
    Cards: (props: ComponentProps<typeof Cards>) => <Cards {...props} className="gap-4" />,
    File,
    Files,
    Folder,
    Kbd,
    Keys,
    Showcase,
    Step,
    Steps,
    // 面板直接画在标签页卡片上，不再是一层带圆角的内表面。
    Tab: (props: ComponentProps<typeof Tab>) => (
      <Tab {...props} className="rounded-none bg-transparent" />
    ),
    // 标签栏与面板是同一张卡片，面板里不再嵌套卡片。
    Tabs: (props: ComponentProps<typeof Tabs>) => (
      <Tabs {...props} className="rounded-(--radius-card) bg-fd-card [&>[role=tablist]]:border-b" />
    ),
    TypeTable,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
