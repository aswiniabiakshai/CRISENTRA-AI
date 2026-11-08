import React, { useState } from "react";

export interface InlineToken {
  type: "text" | "bold" | "italic" | "bold_italic" | "code" | "strike" | "link";
  content?: string;
  text?: string;
  url?: string;
}

export type MarkdownBlock =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "ul"; items: { indent: number; text: string }[] }
  | { type: "ol"; items: { indent: number; text: string }[] }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "code_block"; code: string; lang: string }
  | { type: "blockquote"; text: string }
  | { type: "hr" };

/**
 * Remove escape backslashes before markdown characters (e.g. \*\*text\*\* -> **text**)
 */
export function cleanEscapedMarkdown(raw: string): string {
  if (!raw) return "";
  return raw
    .replace(/\\(\*|_|#|\[|\]|\(|\)|`|~|-)/g, "$1")
    .replace(/&nbsp;/g, " ");
}

/**
 * Check if a URL is safe to render as a link
 */
function isSafeUrl(url: string): boolean {
  if (!url) return false;
  const clean = url.trim().toLowerCase();
  return (
    clean.startsWith("https://") ||
    clean.startsWith("http://") ||
    clean.startsWith("mailto:") ||
    clean.startsWith("#") ||
    clean.startsWith("/")
  );
}

/**
 * Tokenize inline markdown elements (bold, italic, code, links, strikethrough)
 */
export function parseInlineTokens(text: string): InlineToken[] {
  if (!text) return [];
  const cleaned = cleanEscapedMarkdown(text);

  // Regex matches:
  // 1. Inline code: `...`
  // 2. Bold + Italic: ***...*** or ___...___
  // 3. Bold: **...** or __...__
  // 4. Italic: *...* or _..._
  // 5. Strikethrough: ~~...~~
  // 6. Links: [text](url)
  const regex = /(`[^`]+`|\*\*\*[^*]+\*\*\*|___[^_]+___|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|(?<=\s|^)_[^_]+_(?=\s|$|[.,!?:;])|~~[^~]+~~|\[[^\]]+\]\([^)]+\))/g;

  const tokens: InlineToken[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(cleaned)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: "text", content: cleaned.slice(lastIndex, match.index) });
    }
    const tokenStr = match[0];
    if (tokenStr.startsWith("`") && tokenStr.endsWith("`")) {
      tokens.push({ type: "code", content: tokenStr.slice(1, -1) });
    } else if (
      (tokenStr.startsWith("***") && tokenStr.endsWith("***")) ||
      (tokenStr.startsWith("___") && tokenStr.endsWith("___"))
    ) {
      tokens.push({ type: "bold_italic", content: tokenStr.slice(3, -3) });
    } else if (
      (tokenStr.startsWith("**") && tokenStr.endsWith("**")) ||
      (tokenStr.startsWith("__") && tokenStr.endsWith("__"))
    ) {
      tokens.push({ type: "bold", content: tokenStr.slice(2, -2) });
    } else if (
      (tokenStr.startsWith("*") && tokenStr.endsWith("*")) ||
      (tokenStr.startsWith("_") && tokenStr.endsWith("_"))
    ) {
      tokens.push({ type: "italic", content: tokenStr.slice(1, -1) });
    } else if (tokenStr.startsWith("~~") && tokenStr.endsWith("~~")) {
      tokens.push({ type: "strike", content: tokenStr.slice(2, -2) });
    } else if (tokenStr.startsWith("[") && tokenStr.includes("](") && tokenStr.endsWith(")")) {
      const closingBracket = tokenStr.indexOf("](");
      const linkText = tokenStr.slice(1, closingBracket);
      const linkUrl = tokenStr.slice(closingBracket + 2, -1);
      tokens.push({ type: "link", text: linkText, url: linkUrl });
    } else {
      tokens.push({ type: "text", content: tokenStr });
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < cleaned.length) {
    tokens.push({ type: "text", content: cleaned.slice(lastIndex) });
  }

  return tokens;
}

/**
 * Render parsed inline tokens into React elements
 */
export function InlineRenderer({ text }: { text: string }): React.ReactElement {
  const tokens = parseInlineTokens(text);

  return (
    <>
      {tokens.map((token, index) => {
        switch (token.type) {
          case "bold":
            return (
              <strong key={index} className="font-semibold text-white">
                {token.content}
              </strong>
            );
          case "italic":
            return (
              <em key={index} className="italic text-slate-100">
                {token.content}
              </em>
            );
          case "bold_italic":
            return (
              <strong key={index} className="font-semibold text-white">
                <em className="italic">{token.content}</em>
              </strong>
            );
          case "code":
            return (
              <code
                key={index}
                className="px-1.5 py-0.5 mx-0.5 rounded bg-slate-800/90 border border-slate-700/70 text-teal-300 font-mono text-xs select-all [overflow-wrap:anywhere]"
              >
                {token.content}
              </code>
            );
          case "strike":
            return (
              <del key={index} className="line-through text-slate-400">
                {token.content}
              </del>
            );
          case "link":
            if (token.url && isSafeUrl(token.url)) {
              return (
                <a
                  key={index}
                  href={token.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-400 hover:text-teal-300 underline underline-offset-2 transition-colors cursor-pointer [overflow-wrap:anywhere]"
                >
                  {token.text || token.url}
                </a>
              );
            }
            return <span key={index}>{token.text || token.url}</span>;
          case "text":
          default:
            return <span key={index}>{token.content}</span>;
        }
      })}
    </>
  );
}

/**
 * Interactive Copy button with feedback
 */
export function CopyButton({
  text,
  label = "",
  className = "",
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium transition cursor-pointer shrink-0 ${
        copied
          ? "bg-teal-900/70 text-teal-300 border border-teal-700/50"
          : "bg-slate-800/80 hover:bg-slate-700/80 text-slate-400 hover:text-slate-200 border border-slate-700/60"
      } ${className}`}
      title={copied ? "Copied to clipboard!" : "Copy content"}
    >
      {copied ? (
        <>
          <svg className="w-3.5 h-3.5 text-teal-300" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
          <span>Copied!</span>
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
          {label && <span>{label}</span>}
        </>
      )}
    </button>
  );
}

/**
 * Fenced Code block component
 */
function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const displayLang = (lang || "code").toLowerCase();

  return (
    <div className="my-3 rounded-xl border border-slate-800/90 bg-slate-950 overflow-hidden shadow-md">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-900/90 border-b border-slate-800 text-[11px] font-mono text-slate-400">
        <span className="uppercase font-semibold tracking-wider text-teal-400/90">{displayLang}</span>
        <CopyButton text={code} label="Copy code" />
      </div>
      <div className="p-3.5 overflow-x-auto text-xs font-mono text-emerald-300 leading-relaxed">
        <pre className="m-0 p-0 font-mono">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}

/**
 * Table block component
 */
function TableBlock({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="my-3.5 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/70 shadow-sm max-w-full">
      <table className="w-full border-collapse text-left text-xs">
        {headers && headers.length > 0 && (
          <thead>
            <tr className="bg-slate-900/90 border-b border-slate-800">
              {headers.map((h, idx) => (
                <th
                  key={idx}
                  className="px-3.5 py-2.5 text-teal-300 font-semibold uppercase tracking-wider text-[11px]"
                >
                  <InlineRenderer text={h} />
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody className="divide-y divide-slate-800/50">
          {rows.map((row, rIdx) => (
            <tr key={rIdx} className="hover:bg-slate-800/30 transition-colors even:bg-slate-900/25">
              {row.map((cell, cIdx) => (
                <td key={cIdx} className="px-3.5 py-2.5 text-slate-300 leading-normal align-top">
                  <InlineRenderer text={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * List block with support for 2-level nesting
 */
function ListBlock({
  type,
  items,
}: {
  type: "ul" | "ol";
  items: { indent: number; text: string }[];
}) {
  type ListItemNode = { text: string; children: string[] };
  const roots: ListItemNode[] = [];
  let currentRoot: ListItemNode | null = null;

  for (const item of items) {
    if (item.indent === 0 || !currentRoot) {
      currentRoot = { text: item.text, children: [] };
      roots.push(currentRoot);
    } else {
      currentRoot.children.push(item.text);
    }
  }

  const ListTag = type;
  const listClass =
    type === "ul"
      ? "my-2.5 pl-5 list-disc space-y-1.5 marker:text-teal-400 text-slate-200 text-sm"
      : "my-2.5 pl-5 list-decimal space-y-1.5 marker:text-teal-400 text-slate-200 text-sm";

  return (
    <ListTag className={listClass}>
      {roots.map((root, idx) => (
        <li key={idx} className="leading-relaxed">
          <InlineRenderer text={root.text} />
          {root.children.length > 0 && (
            <ul className="mt-1 pl-4 list-[circle] space-y-1 marker:text-teal-500/70 text-slate-300 text-xs sm:text-sm">
              {root.children.map((child, cIdx) => (
                <li key={cIdx} className="leading-relaxed">
                  <InlineRenderer text={child} />
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ListTag>
  );
}

/**
 * Heading block component
 */
function HeadingBlock({ level, text }: { level: number; text: string }) {
  switch (level) {
    case 1:
      return (
        <h1 className="text-lg font-bold text-teal-300 border-b border-slate-800/90 pb-1.5 mt-4 mb-2.5 first:mt-0 tracking-tight">
          <InlineRenderer text={text} />
        </h1>
      );
    case 2:
      return (
        <h2 className="text-base font-semibold text-teal-400 mt-3.5 mb-2 first:mt-0 tracking-tight">
          <InlineRenderer text={text} />
        </h2>
      );
    case 3:
      return (
        <h3 className="text-sm font-semibold text-slate-100 mt-3 mb-1.5 first:mt-0 flex items-center gap-1.5">
          <InlineRenderer text={text} />
        </h3>
      );
    case 4:
    default:
      return (
        <h4 className="text-xs font-semibold text-teal-300/90 uppercase tracking-wider mt-2.5 mb-1 first:mt-0">
          <InlineRenderer text={text} />
        </h4>
      );
  }
}

/**
 * Paragraph block component
 */
function ParagraphBlock({ text }: { text: string }) {
  const lines = text.split("\n");
  if (lines.length > 1) {
    return (
      <p className="mb-2.5 last:mb-0 text-slate-200 text-sm leading-relaxed [overflow-wrap:anywhere]">
        {lines.map((line, idx) => (
          <React.Fragment key={idx}>
            <InlineRenderer text={line} />
            {idx < lines.length - 1 && <br />}
          </React.Fragment>
        ))}
      </p>
    );
  }

  return (
    <p className="mb-2.5 last:mb-0 text-slate-200 text-sm leading-relaxed [overflow-wrap:anywhere]">
      <InlineRenderer text={text} />
    </p>
  );
}

/**
 * Parse markdown string into structured blocks
 */
export function parseMarkdownBlocks(markdown: string): MarkdownBlock[] {
  if (!markdown) return [];
  const lines = markdown.split(/\r?\n/);
  const blocks: MarkdownBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Empty line
    if (!trimmed) {
      i++;
      continue;
    }

    // 2. Fenced code block (```lang ... ```)
    if (trimmed.startsWith("```")) {
      const lang = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // consume closing ```
      blocks.push({
        type: "code_block",
        lang,
        code: codeLines.join("\n"),
      });
      continue;
    }

    // 3. Horizontal Rule (---, ***, ___)
    if (/^(?:---|\*\*\*|___)\s*$/.test(trimmed)) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    // 4. Headings (# H1, ## H2, ### H3, #### H4)
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2].trim();
      blocks.push({ type: "heading", level, text });
      i++;
      continue;
    }

    // 5. Blockquotes (> ...)
    if (trimmed.startsWith(">")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ""));
        i++;
      }
      blocks.push({
        type: "blockquote",
        text: quoteLines.join("\n"),
      });
      continue;
    }

    // 6. Tables (lines with | ... |)
    if (trimmed.startsWith("|") && trimmed.endsWith("|") && trimmed.includes("|")) {
      const tableLines: string[] = [];
      while (
        i < lines.length &&
        lines[i].trim().startsWith("|") &&
        lines[i].trim().endsWith("|")
      ) {
        tableLines.push(lines[i].trim());
        i++;
      }
      if (tableLines.length >= 2) {
        const headerCells = tableLines[0].split("|").slice(1, -1).map((c) => c.trim());
        const isSeparator = /^\|?(\s*:?-+:?\s*\|)+\s*$/.test(tableLines[1]);
        const dataRowStart = isSeparator ? 2 : 1;
        const rows: string[][] = [];
        for (let r = dataRowStart; r < tableLines.length; r++) {
          const cells = tableLines[r].split("|").slice(1, -1).map((c) => c.trim());
          // Pad or trim to match header count
          const padded = cells.concat(new Array(Math.max(0, headerCells.length - cells.length)).fill(""));
          rows.push(padded.slice(0, headerCells.length));
        }
        blocks.push({
          type: "table",
          headers: headerCells,
          rows,
        });
        continue;
      } else {
        // Fallback to paragraph
        i -= tableLines.length;
      }
    }

    // 7. Unordered Lists (* item, - item, + item)
    if (/^(\s*)[*+-]\s+(.*)$/.test(line)) {
      const items: { indent: number; text: string }[] = [];
      while (i < lines.length && /^(\s*)[*+-]\s+(.*)$/.test(lines[i])) {
        const m = lines[i].match(/^(\s*)[*+-]\s+(.*)$/)!;
        const indent = m[1].length;
        const text = m[2];
        items.push({ indent, text });
        i++;
      }
      blocks.push({
        type: "ul",
        items,
      });
      continue;
    }

    // 8. Ordered Lists (1. item, 2. item)
    if (/^(\s*)\d+\.\s+(.*)$/.test(line)) {
      const items: { indent: number; text: string }[] = [];
      while (i < lines.length && /^(\s*)\d+\.\s+(.*)$/.test(lines[i])) {
        const m = lines[i].match(/^(\s*)\d+\.\s+(.*)$/)!;
        const indent = m[1].length;
        const text = m[2];
        items.push({ indent, text });
        i++;
      }
      blocks.push({
        type: "ol",
        items,
      });
      continue;
    }

    // 9. Regular Paragraphs
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith("```") &&
      !/^(#{1,6})\s+/.test(lines[i].trim()) &&
      !/^(?:---|\*\*\*|___)\s*$/.test(lines[i].trim()) &&
      !lines[i].trim().startsWith(">") &&
      !(lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) &&
      !/^(\s*)[*+-]\s+/.test(lines[i]) &&
      !/^(\s*)\d+\.\s+/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      blocks.push({
        type: "paragraph",
        text: paraLines.join("\n"),
      });
    }
  }

  return blocks;
}

/**
 * Main AssistantMarkdown Component
 * Provides clean, ChatGPT-style rendered typography for assistant responses.
 */
export function AssistantMarkdown({ text }: { text: string }): React.ReactElement {
  if (!text) return <span />;

  const blocks = parseMarkdownBlocks(text);

  return (
    <div className="assistant-markdown-content space-y-2 text-slate-200 text-sm leading-relaxed [overflow-wrap:anywhere]">
      {blocks.map((block, idx) => {
        switch (block.type) {
          case "heading":
            return <HeadingBlock key={idx} level={block.level} text={block.text} />;
          case "paragraph":
            return <ParagraphBlock key={idx} text={block.text} />;
          case "ul":
          case "ol":
            return <ListBlock key={idx} type={block.type} items={block.items} />;
          case "table":
            return <TableBlock key={idx} headers={block.headers} rows={block.rows} />;
          case "code_block":
            return <CodeBlock key={idx} code={block.code} lang={block.lang} />;
          case "blockquote":
            return (
              <blockquote
                key={idx}
                className="my-2.5 pl-3.5 py-1.5 border-l-2 border-teal-500 bg-teal-950/20 rounded-r-lg text-slate-300 italic text-xs leading-relaxed"
              >
                <InlineRenderer text={block.text} />
              </blockquote>
            );
          case "hr":
            return <hr key={idx} className="my-3.5 border-t border-slate-800/90" />;
          default:
            return null;
        }
      })}
    </div>
  );
}

export default AssistantMarkdown;
