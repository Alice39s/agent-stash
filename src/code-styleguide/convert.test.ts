import { describe, expect, test } from "vitest";
import { convertGuide, renderReference } from "./convert.ts";

const URL_BASE = "https://example.com/guides/page.html";

describe("convertGuide", () => {
  test("keeps the #content of an HTML guide and tags example verdicts", async () => {
    const guide = await convertGuide({
      format: "html",
      url: URL_BASE,
      content: [
        "<html><head><script>init()</script></head><body><div id='content'>",
        "<h1>Sample Guide</h1><div id='tocDiv'></div>",
        "<h2 id='Naming'>Naming</h2>",
        "<p>See <a href='other.html'>other</a>, <a href='#Naming'>naming</a><a name='x'></a>.</p>",
        "<pre><code class='language-cpp bad'>int X;</code></pre>",
        "<pre class='prettyprint lang-java'>class A {}</pre>",
        "<pre><code class='language-.ts good'>let x = 1;</code></pre>",
        "</div></body></html>",
      ].join(""),
    });
    expect(guide.title).toBe("Sample Guide");
    expect(guide.body).toBe(
      [
        "## Naming",
        "",
        "See [other](https://example.com/guides/other.html), [naming](#Naming).",
        "",
        "```cpp bad",
        "int X;",
        "```",
        "",
        "```java",
        "class A {}",
        "```",
        "",
        "```ts good",
        "let x = 1;",
        "```",
        "",
      ].join("\n"),
    );
  });

  test("drops site directives, comments, and anchors from a Markdown guide", async () => {
    const guide = await convertGuide({
      format: "markdown",
      url: URL_BASE,
      rewriteUrl: (url) => new URL(url.href.replace(/\.md$/, ".html")),
      content: [
        "<!-- AUTHORS: keep this file in sync. -->",
        "",
        "# Sample Guide",
        "",
        "* TOC",
        "{:toc}",
        "",
        "{% raw %}",
        "",
        "[TOC]",
        "",
        '<a id="s1-rules"></a>',
        '<a id="rules"></a>',
        "## Rules",
        "",
        "Read [the other guide](other.md).",
        "",
        "```ts {avoid}",
        "var x;",
        "```",
        "",
        "| A | B |",
        "| - | - |",
        "| long cell | x |",
        "",
        "{% endraw %}",
      ].join("\n"),
    });
    expect(guide.title).toBe("Sample Guide");
    expect(guide.body).toBe(
      [
        "## Rules",
        "",
        "Read [the other guide](https://example.com/guides/other.html).",
        "",
        "```ts bad",
        "var x;",
        "```",
        "",
        "| A | B |",
        "| - | - |",
        "| long cell | x |",
        "",
      ].join("\n"),
    );
  });
});

describe("renderReference", () => {
  test("indexes level 2 and 3 headings by their line in the rendered file", () => {
    const body = ["Intro.", "", "## One", "", "Text.", "", "### One A", "", "## Two", ""].join(
      "\n",
    );
    const reference = renderReference("Guide", "Source: <https://example.com>", body);
    const lines = reference.text.split("\n");
    const index = lines.slice(0, reference.indexEnd).filter((line) => /^\s*- L\d+ /.test(line));
    expect(index).toEqual(["- L15 One", "  - L19 One A", "- L21 Two"]);
    for (const entry of index) {
      const [, line, title] = /- L(\d+) (.+)$/.exec(entry) ?? [];
      expect(lines[Number(line) - 1]).toMatch(new RegExp(`^#{2,3} ${title}$`));
    }
    expect(reference.lines).toBe(lines.length - 1);
  });
});
