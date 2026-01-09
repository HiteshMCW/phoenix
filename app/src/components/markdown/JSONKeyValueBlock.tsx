import { useMemo, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { css } from "@emotion/react";

import { Icon, Icons } from "@phoenix/components";
import { safelyParseJSON } from "@phoenix/utils/jsonUtils";

import { markdownCSS } from "./styles";

const containerCSS = css`
  margin: var(--ac-global-dimension-static-size-200);
  display: flex;
  flex-direction: column;
  gap: var(--ac-global-dimension-static-size-150);
`;

const keyValueBoxCSS = css`
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: var(--ac-global-dimension-static-size-100);
  background-color: var(--ac-global-color-grey-75);
  border-radius: var(--ac-global-rounding-medium);
  border: 1px solid var(--ac-global-color-grey-200);
  padding: var(--ac-global-dimension-static-size-100)
    var(--ac-global-dimension-static-size-150);
`;

const keyCSS = css`
  font-weight: 700;
  font-size: var(--ac-global-font-size-s);
  color: var(--ac-global-text-color-900);
  font-family: var(--px-font-family-mono);
  white-space: nowrap;
  flex-shrink: 0;
  &::after {
    content: ":";
  }
`;

const valueCSS = css`
  flex: 1;
  min-width: 0;
`;

const primitiveValueCSS = css`
  font-family: var(--px-font-family-mono);
  font-size: var(--ac-global-font-size-s);
  color: var(--ac-global-text-color-700);
  white-space: pre-wrap;
  word-break: break-word;
`;

const stringValueCSS = css`
  font-size: var(--ac-global-font-size-s);
  color: var(--ac-global-text-color-700);
  white-space: pre-wrap;
  word-break: break-word;
`;

const nullValueCSS = css`
  font-family: var(--px-font-family-mono);
  font-size: var(--ac-global-font-size-s);
  color: var(--ac-global-text-color-500);
  font-style: italic;
`;

const nestedContainerCSS = css`
  display: flex;
  flex-direction: column;
  gap: var(--ac-global-dimension-static-size-100);
  width: 100%;
`;

const collapsibleBoxCSS = css`
  display: flex;
  flex-direction: column;
  background-color: var(--ac-global-color-grey-75);
  border-radius: var(--ac-global-rounding-medium);
  border: 1px solid var(--ac-global-color-grey-200);
  overflow: hidden;
`;

const collapsibleHeaderCSS = css`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: var(--ac-global-dimension-static-size-50);
  padding: var(--ac-global-dimension-static-size-100)
    var(--ac-global-dimension-static-size-150);
  cursor: pointer;
  user-select: none;
  background-color: var(--ac-global-color-grey-100);
  border: none;
  width: 100%;
  text-align: left;
  &:hover {
    background-color: var(--ac-global-color-grey-200);
  }
`;

const collapsibleKeyCSS = css`
  font-weight: 700;
  font-size: var(--ac-global-font-size-s);
  color: var(--ac-global-text-color-900);
  font-family: var(--px-font-family-mono);
`;

const collapsibleIconCSS = css`
  transition: transform 0.2s ease-in-out;
  color: var(--ac-global-text-color-700);
  &[data-expanded="true"] {
    transform: rotate(90deg);
  }
`;

const collapsibleContentCSS = css`
  padding: var(--ac-global-dimension-static-size-100)
    var(--ac-global-dimension-static-size-150);
`;

const countBadgeCSS = css`
  font-size: var(--ac-global-font-size-xs);
  color: var(--ac-global-text-color-500);
  font-family: var(--px-font-family-mono);
  margin-left: var(--ac-global-dimension-static-size-50);
`;

const arrayItemCSS = css`
  display: flex;
  flex-direction: column;
  background-color: var(--ac-global-color-grey-75);
  border-radius: var(--ac-global-rounding-medium);
  border: 1px solid var(--ac-global-color-grey-200);
  padding: var(--ac-global-dimension-static-size-100)
    var(--ac-global-dimension-static-size-150);
`;

const arrayIndexCSS = css`
  font-weight: 600;
  font-size: var(--ac-global-font-size-xs);
  color: var(--ac-global-text-color-500);
  margin-bottom: var(--ac-global-dimension-static-size-50);
`;

const fallbackTextCSS = css`
  font-family: var(--px-font-family-mono);
  white-space: pre-wrap;
  word-break: break-word;
  margin: var(--ac-global-dimension-static-size-200);
  font-size: var(--ac-global-font-size-s);
`;

const markdownValueCSS = css`
  ${markdownCSS}
  & > :first-child {
    margin-top: 0;
  }
  & > :last-child {
    margin-bottom: 0;
  }
`;

interface JSONKeyValueBlockProps {
  children: string;
}

/**
 * Checks if a string looks like it contains markdown formatting
 */
function looksLikeMarkdown(str: string): boolean {
  // Check for common markdown patterns
  const markdownPatterns = [
    /\*\*[^*]+\*\*/, // bold
    /\*[^*]+\*/, // italic
    /^#+\s/m, // headers
    /^\s*[-*+]\s/m, // unordered lists
    /^\s*\d+\.\s/m, // ordered lists
    /\[.+\]\(.+\)/, // links
    /`[^`]+`/, // inline code
    /```[\s\S]*```/, // code blocks
    /^\s*>\s/m, // blockquotes
  ];

  return markdownPatterns.some((pattern) => pattern.test(str));
}

/**
 * Renders a value appropriately based on its type
 */
function ValueDisplay({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <span css={nullValueCSS}>{value === null ? "null" : "—"}</span>;
  }

  if (typeof value === "boolean") {
    return <span css={primitiveValueCSS}>{value ? "true" : "false"}</span>;
  }

  if (typeof value === "number") {
    return <span css={primitiveValueCSS}>{String(value)}</span>;
  }

  if (typeof value === "string") {
    // Check if the string contains markdown and render it
    if (looksLikeMarkdown(value)) {
      return (
        <div css={markdownValueCSS}>
          <Markdown remarkPlugins={[remarkGfm]}>{value}</Markdown>
        </div>
      );
    }
    return <span css={stringValueCSS}>{value}</span>;
  }

  // For complex types, stringify
  return (
    <span css={primitiveValueCSS}>{JSON.stringify(value, null, 2)}</span>
  );
}

/**
 * Checks if a value is a simple primitive
 */
function isSimpleValue(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

/**
 * A collapsible section for nested content
 */
function CollapsibleSection({
  label,
  count,
  children,
  defaultExpanded = true,
}: {
  label: string;
  count?: number;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div css={collapsibleBoxCSS}>
      <button
        css={collapsibleHeaderCSS}
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <Icon
          svg={<Icons.ArrowIosForwardOutline />}
          css={collapsibleIconCSS}
          data-expanded={isExpanded}
        />
        <span css={collapsibleKeyCSS}>{label}</span>
        {count !== undefined && <span css={countBadgeCSS}>({count})</span>}
      </button>
      {isExpanded && <div css={collapsibleContentCSS}>{children}</div>}
    </div>
  );
}

/**
 * Renders a key-value box with "key: value" format
 */
function KeyValueBox({
  keyName,
  value,
}: {
  keyName: string;
  value: unknown;
}) {
  if (isSimpleValue(value)) {
    return (
      <div css={keyValueBoxCSS}>
        <span css={keyCSS}>{keyName}</span>
        <div css={valueCSS}>
          <ValueDisplay value={value} />
        </div>
      </div>
    );
  }

  if (Array.isArray(value)) {
    return (
      <CollapsibleSection label={keyName} count={value.length}>
        <div css={nestedContainerCSS}>
          {value.map((item, index) => (
            <ArrayItemBox key={index} index={index} item={item} />
          ))}
        </div>
      </CollapsibleSection>
    );
  }

  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value as Record<string, unknown>);
    return (
      <CollapsibleSection label={keyName} count={entries.length}>
        <div css={nestedContainerCSS}>
          {entries.map(([k, v]) => (
            <KeyValueBox key={k} keyName={k} value={v} />
          ))}
        </div>
      </CollapsibleSection>
    );
  }

  return (
    <div css={keyValueBoxCSS}>
      <span css={keyCSS}>{keyName}</span>
      <div css={valueCSS}>
        <ValueDisplay value={value} />
      </div>
    </div>
  );
}

/**
 * Renders an array item with its index
 */
function ArrayItemBox({ index, item }: { index: number; item: unknown }) {
  if (isSimpleValue(item)) {
    return (
      <div css={arrayItemCSS}>
        <span css={arrayIndexCSS}>Item {index}</span>
        <ValueDisplay value={item} />
      </div>
    );
  }

  if (typeof item === "object" && item !== null) {
    const entries = Object.entries(item as Record<string, unknown>);
    return (
      <CollapsibleSection
        label={`Item ${index}`}
        count={entries.length}
        defaultExpanded={true}
      >
        <div css={nestedContainerCSS}>
          {entries.map(([key, value]) => (
            <KeyValueBox key={key} keyName={key} value={value} />
          ))}
        </div>
      </CollapsibleSection>
    );
  }

  return (
    <div css={arrayItemCSS}>
      <span css={arrayIndexCSS}>Item {index}</span>
      <ValueDisplay value={item} />
    </div>
  );
}

/**
 * A component that displays a JSON string as styled key-value blocks.
 * Each key-value pair is shown in a box with "key: value" format.
 * Nested objects and arrays are collapsible.
 * Markdown content within string values is rendered.
 * Falls back to plain text if parsing fails.
 */
export function JSONKeyValueBlock({ children }: JSONKeyValueBlockProps) {
  const parsed = useMemo(() => safelyParseJSON(children), [children]);

  // If parsing failed, show as plain text
  if (parsed.parseError || parsed.json === null) {
    return <pre css={fallbackTextCSS}>{children}</pre>;
  }

  const { json } = parsed;

  // Handle arrays at the top level
  if (Array.isArray(json)) {
    return (
      <div css={containerCSS}>
        {json.map((item, index) => (
          <ArrayItemBox key={index} index={index} item={item} />
        ))}
      </div>
    );
  }

  // Handle objects at the top level
  if (typeof json === "object" && json !== null) {
    const entries = Object.entries(json);
    return (
      <div css={containerCSS}>
        {entries.map(([key, value]) => (
          <KeyValueBox key={key} keyName={key} value={value} />
        ))}
      </div>
    );
  }

  // Handle primitives at the top level
  return (
    <div css={containerCSS}>
      <ValueDisplay value={json} />
    </div>
  );
}
