# markdown-it-callouts

A simple `markdown-it` plugin that adds support for [Obsidian callouts](https://help.obsidian.md/Editing+and+formatting/Callouts) or [GitHub Flavored Markdown alerts](https://github.com/orgs/community/discussions/16925).

Given the following markdown:

```markdown
> [!note] Title!
> Body line 1
>
> Body line 2
```

The rendered HTML looks like:

```html
<div class="callout callout-note">
    <h3 class="callout-title">Title!</h3>
    <p>Body line 1</p>
    <p>Body line 2</p>
</div>
```

The second class generated, `callout-note`, will pull the callout type from Markdown so you can easily style different callout types differently.

The elements generated are also configurable. The config is defined as follows:

```typescript
export interface Config {
  /**
   * The element that wraps the created callout. Defaults to "div"
   */
  defaultElementType?: string;
  /**
   * An override map to use different elements for different callout types.
   *
   * All callout types are converted to lowercase, so use lowercase keys
   */
  elementTypes?: Partial<{ [calloutType: string]: string }>;
  /**
   * The element that wraps the title and symbol
   */
  calloutTitleElementType?: string;
  /**
   * A symbol inserted before the title for given callout types
   *
   * All callout types are converted to lowercase, so use lowercase keys
   */
  calloutSymbols?: Partial<{ [calloutType: string]: string }>;
  /**
   * The element to wrap callout symbols in. Defaults to "span"
   */
  calloutSymbolElementType?: string;
  /**
   * - "none": (default) do not render any title.
   * - "blank": render a blank title (""). Renders the callout-title and callout-symbol containers,
   *            so you can have a symbol even with no title.
   * - "match-type": render a title that matches the type of callout. An info callout will have an "Info" title,
   *                   a note callout will have a "Note" title, etc.
   */
  emptyTitleFallback?: "none" | "blank" | "match-type";
}
```

This package is inspired by the [Eleventy Notes package](https://github.com/rothsandro/eleventy-notes/) implementation of callout parsing. It's designed to be pretty drop-in, especially for Eleventy blogs.

