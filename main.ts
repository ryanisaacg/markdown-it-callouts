import type MarkdownIt from "markdown-it/index.js";
import type { StateCore, Token } from "markdown-it/index.js";

/**
 * How to handle a callout title and symbol if no custom callout title is specified:
 * i.e
 * > [!Info]
 * > Callout text here
 *
 * Instead of
 * > [!Info] Title
 * > Callout text here.
 *
 * - "none": (default) do not render any title.
 * - "blank": render a blank title (""). Renders the callout-title and callout-symbol containers,
 *            so you can have a symbol even with no title.
 * - "match-type": render a title that matches the type of callout. An info callout will have an "Info" title,
 *                   a note callout will have a "Note" title, etc.
 */
export type EmptyTitleFallback = "none" | "blank" | "match-type";

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
   * May be "none" (default), "empty", or "match-type", see EmptyTitleFallback for more
   */
  emptyTitleFallback?: EmptyTitleFallback;
}

export default function (md: MarkdownIt, config: Config = {}) {
  const { elementTypes, defaultElementType = "div" } = config;

  md.core.ruler.after("block", "callouts", (state: StateCore) => {
    const tokens = state.tokens;

    for (let idx = 0; idx < tokens.length; idx++) {
      if (tokens[idx].type !== "blockquote_open") {
        continue;
      }

      const openIdx = idx;
      const openToken = tokens[idx];
      const closeIndex = findBlockquoteCloseToken(tokens, idx);
      if (closeIndex == null) {
        console.error("Found a blockquote with no close");
        continue;
      }

      const blockquoteTokens = tokens.slice(openIdx, closeIndex + 1);
      const calloutDef = parseCalloutDefinition(blockquoteTokens);
      if (!calloutDef) {
        continue;
      }

      const { inlineToken, remainingInlineContent, calloutType, title } =
        calloutDef;

      openToken.type = "callout_open";
      openToken.tag = elementTypes?.[calloutType] ?? defaultElementType;
      openToken.attrPush(["class", `callout callout-${calloutType}`]);

      const closeToken = tokens[closeIndex];
      closeToken.type = "callout_close";
      closeToken.tag = openToken.tag;

      const titleContents = title
        ? title
        : // Fallbacks for a missing title
        config.emptyTitleFallback === "match-type"
        ? prettyFormatCalloutType(calloutType)
        : config.emptyTitleFallback === "blank"
        ? ""
        : null;

      if (titleContents != null) {
        const titleTokens = createTitleTokens(
          state,
          config,
          calloutType,
          titleContents
        );
        tokens.splice(openIdx + 1, 0, ...titleTokens);
      }

      inlineToken.content = remainingInlineContent;
    }
  });
}

function findBlockquoteCloseToken(
  tokens: Token[],
  startIndex: number
): number | null {
  let nested = 0;

  for (let idx = startIndex + 1; idx < tokens.length; idx++) {
    if (tokens[idx].type === "blockquote_open") {
      nested += 1;
    } else if (tokens[idx].type === "blockquote_close") {
      if (nested === 0) {
        return idx;
      }

      nested -= 1;
    }
  }

  return null;
}

// match [!CALLOUT_TYPE](COLLAPSE) (CALLOUT TITLE)
const CALLOUT_REGEX = /^\[\!([\w-]+)\]([\+-]?)( +[^\n\r]+)?/i;

function parseCalloutDefinition(blockquoteTokens: Token[]): {
  inlineToken: Token;
  calloutType: string;
  title: string | null;
  remainingInlineContent: string;
} | null {
  const [blockquoteOpen, paragraphOpen, inline] = blockquoteTokens;

  if (
    blockquoteOpen?.type !== "blockquote_open" ||
    paragraphOpen?.type !== "paragraph_open" ||
    inline?.type !== "inline"
  ) {
    return null;
  }

  const match = inline.content.match(CALLOUT_REGEX);
  if (!match) {
    return null;
  }

  const [fullMatch, calloutType, _collapses, title] = match;

  const remainingInlineContent = inline.content
    .slice(fullMatch.length)
    .trimStart();

  return {
    inlineToken: inline,
    remainingInlineContent,
    calloutType: calloutType.toLowerCase(),
    title: title?.trim(),
  };
}

function createTitleTokens(
  state: StateCore,
  {
    calloutSymbols,
    calloutTitleElementType = "h3",
    calloutSymbolElementType = "span",
  }: Config,
  calloutType: string,
  title: string
): Token[] {
  const titleTokens = [];
  const openHeader = new state.Token(
    "callout_title_open",
    calloutTitleElementType,
    1
  );
  openHeader.attrPush(["class", "callout-title"]);
  titleTokens.push(openHeader);

  const calloutSymbol = calloutSymbols?.[calloutType];
  if (calloutSymbol) {
    const openSpan = new state.Token(
      "callout_symbol_open",
      calloutSymbolElementType,
      1
    );
    openSpan.attrPush(["class", "callout-symbol"]);
    titleTokens.push(openSpan);
    const symbol = new state.Token("inline", "", 0);
    symbol.content = calloutSymbol;
    symbol.children = [];
    titleTokens.push(symbol);
    titleTokens.push(
      new state.Token("callout_symbol_open", calloutSymbolElementType, -1)
    );
  }

  const titleContent = new state.Token("inline", "", 0);
  titleContent.content = title;
  titleContent.children = [];
  titleTokens.push(titleContent);

  titleTokens.push(
    new state.Token("callout_title_close", calloutTitleElementType, -1)
  );

  return titleTokens;
}

/* Takes a string and returns the same string with the first letter capitalized.
 * Assumes that the input string is lowercase.
 */
function prettyFormatCalloutType(calloutType: string): string {
  return calloutType.charAt(0).toUpperCase() + calloutType.slice(1);
}
