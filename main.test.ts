import { expect, test } from "vitest";
import markdownIt from "markdown-it";
import { Config } from "./main.js";
import markdownItCallout from "./main.js";
import MarkdownIt from "markdown-it/lib/index.mjs";

function instance(config: Config): MarkdownIt {
  return markdownIt({
    html: true,
    typographer: true,
  }).use(markdownItCallout, config);
}

test("basic callout", () => {
  const md = instance({});
  expect(
    md.render(`> [!note] Title!
> Body line 1
>
> Body line 2`)
  ).toEqual(`<div class="callout callout-note">
<h3 class="callout-title">Title!</h3><p>Body line 1</p>
<p>Body line 2</p>
</div>
`);
});

test("custom element", () => {
  const md = instance({ defaultElementType: "aside" });
  expect(
    md.render(`> [!info] Title!
> Body line 1
>
> Body line 2`)
  ).toEqual(`<aside class="callout callout-info">
<h3 class="callout-title">Title!</h3><p>Body line 1</p>
<p>Body line 2</p>
</aside>
`);
});

test("custom element", () => {
  const md = instance({
    calloutSymbolElementType: "div",
    calloutSymbols: { warning: "W" },
  });
  expect(
    md.render(`> [!warning] Title!
> Body line 1
>
> Body line 2`)
  ).toEqual(`<div class="callout callout-warning">
<h3 class="callout-title"><div class="callout-symbol">W</div>Title!</h3><p>Body line 1</p>
<p>Body line 2</p>
</div>
`);
});

test("custom element with caps", () => {
  const md = instance({
    calloutSymbolElementType: "div",
    calloutSymbols: { warning: "W" },
  });
  expect(
    md.render(`> [!WARNING] Title!
> Body line 1
>
> Body line 2`)
  ).toEqual(`<div class="callout callout-warning">
<h3 class="callout-title"><div class="callout-symbol">W</div>Title!</h3><p>Body line 1</p>
<p>Body line 2</p>
</div>
`);
});
