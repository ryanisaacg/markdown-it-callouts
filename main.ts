import type MarkdownIt from "markdown-it/index.js";
import type { StateCore, Token } from "markdown-it/index.js";

export interface Config {
  calloutSymbols?: Partial<CalloutSymbols>;
  elementTypes?: Partial<CalloutSymbols>;
  defaultElementType?: string;
  calloutTitleElementType?: string;
  calloutSymbolElementType?: string;
}

export interface CalloutSymbols {
  [calloutName: string]: string;
}

export default function (md: MarkdownIt, config?: Config) {
  const { elementTypes, defaultElementType = "div" } = config ?? {};

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
      openToken.attrPush(["class", `callout-${calloutType.toLowerCase()}`]);

      const closeToken = tokens[closeIndex];
      closeToken.type = "callout_close";
      closeToken.tag = openToken.tag;

      if (title) {
        const titleTokens = createTitleTokens(
          state,
          config,
          calloutType,
          title
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
    calloutType,
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
