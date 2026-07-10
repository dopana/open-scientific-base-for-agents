import { useEffect, useRef, useState } from 'react';
import { CATEGORY_MAP, formatDate, stripFrontmatter } from '../config';
import type { FileEntry } from '../types';

interface FileViewerProps {
  file: FileEntry | null;
  loading: boolean;
}

/** Parse markdown into renderable blocks */
type Block =
  | { type: 'h1'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'p'; text: string }
  | { type: 'empty' }
  | { type: 'code'; lang: string; code: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'blockquote'; text: string }
  | { type: 'hr' };

function parseMarkdown(content: string): Block[] {
  const lines = content.split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.startsWith('```')) {
      const lang = line.replace(/^```/, '').trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push({ type: 'code', lang, code: codeLines.join('\n') });
      i++; // skip closing ```
      continue;
    }

    // Headers
    if (line.startsWith('# ')) {
      blocks.push({ type: 'h1', text: line.replace(/^# /, '') });
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      blocks.push({ type: 'h2', text: line.replace(/^## /, '') });
      i++;
      continue;
    }
    if (line.startsWith('### ')) {
      blocks.push({ type: 'h3', text: line.replace(/^### /, '') });
      i++;
      continue;
    }

    // Horizontal rule
    if (line.match(/^---+\s*$/) || line.match(/^\*\*\*+\s*$/)) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      blocks.push({ type: 'blockquote', text: line.replace(/^> ?/, '') });
      i++;
      continue;
    }

    // Unordered list - collect consecutive items
    if (line.match(/^[-*+]\s/)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^[-*+]\s/)) {
        items.push(lines[i].replace(/^[-*+]\s/, ''));
        i++;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }

    // Ordered list
    if (line.match(/^\d+\.\s/)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^\d+\.\s/)) {
        items.push(lines[i].replace(/^\d+\.\s/, ''));
        i++;
      }
      blocks.push({ type: 'ol', items });
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      blocks.push({ type: 'empty' });
      i++;
      continue;
    }

    // Regular paragraph
    blocks.push({ type: 'p', text: line });
    i++;
  }

  return blocks;
}

/** Match result for inline markdown tokens */
type InlineToken =
  | { type: 'text'; text: string }
  | { type: 'bold'; text: string }
  | { type: 'code'; text: string }
  | { type: 'link'; text: string; href: string };

/** Parse inline markdown tokens (bold, code, links) */
function parseInlineTokens(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  const regex = /(\*\*(.+?)\*\*|`(.+?)`|\[(.+?)\]\((.+?)\))/g;
  let lastIndex = 0;

  for (const match of text.matchAll(regex)) {
    // Text before match
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', text: text.slice(lastIndex, match.index) });
    }

    const fullMatch = match[0];
    if (fullMatch.startsWith('**')) {
      tokens.push({ type: 'bold', text: match[2] });
    } else if (fullMatch.startsWith('`')) {
      tokens.push({ type: 'code', text: match[3] });
    } else if (fullMatch.startsWith('[')) {
      tokens.push({ type: 'link', text: match[4], href: match[5] });
    }

    lastIndex = match.index + fullMatch.length;
  }

  // Remaining text
  if (lastIndex < text.length) {
    tokens.push({ type: 'text', text: text.slice(lastIndex) });
  }

  return tokens;
}

/** Render inline markdown tokens to React nodes */
function renderInline(text: string, baseKey: number = 0): React.ReactNode[] {
  const tokens = parseInlineTokens(text);

  return tokens.map((token, i) => {
    const key = baseKey + i;
    switch (token.type) {
      case 'bold':
        return <strong key={key}>{token.text}</strong>;
      case 'code':
        return (
          <code
            key={key}
            className="px-1.5 py-0.5 text-xs font-mono text-indigo-300 bg-indigo-500/10 rounded border border-indigo-500/20"
          >
            {token.text}
          </code>
        );
      case 'link':
        return (
          <a
            key={key}
            href={token.href}
            className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors"
            target="_blank"
            rel="noopener"
          >
            {token.text}
          </a>
        );
      default:
        return <span key={key}>{token.text}</span>;
    }
  });
}

export default function FileViewer({ file, loading }: FileViewerProps) {
  const [copied, setCopied] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Reset scroll position when file changes — depends on fileKey to trigger on navigation
  const fileKey = file?.id ?? '';
  // biome-ignore lint/correctness/useExhaustiveDependencies: fileKey triggers scroll reset
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileKey]);

  const handleCopyContent = async () => {
    if (!file) return;
    try {
      await navigator.clipboard.writeText(stripFrontmatter(file.content));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for insecure contexts
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-400 rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Loading content...</p>
        </div>
      </div>
    );
  }

  if (!file) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md px-8">
          <div className="text-5xl mb-4">📖</div>
          <h2 className="text-xl font-semibold text-slate-300 mb-2">
            Select a file
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            Choose a file from the list to view its content, or search for
            specific topics using the search bar above.
          </p>
        </div>
      </div>
    );
  }

  const cat = CATEGORY_MAP.get(file.category);
  const blocks = parseMarkdown(stripFrontmatter(file.content));

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* File Header */}
      <div className="px-8 py-5 border-b border-slate-800/50 bg-slate-950/50">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {cat && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded-full">
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </span>
              )}
              <span className="text-xs text-slate-600">·</span>
              <span className="text-xs text-slate-500 font-mono">
                {file.id}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              {file.title}
            </h2>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyContent}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-400 bg-slate-800/60 hover:bg-slate-700/60 hover:text-slate-200 rounded-lg border border-slate-700/40 transition-all duration-200"
              title="Copy markdown content"
            >
              {copied ? (
                <>
                  <svg
                    className="w-3.5 h-3.5 text-emerald-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    role="img"
                    aria-label="Copied"
                  >
                    <title>Copied</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    role="img"
                    aria-label="Copy content"
                  >
                    <title>Copy content</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  Copy
                </>
              )}
            </button>
          </div>
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap items-center gap-4 mt-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              role="img"
              aria-label="Version"
            >
              <title>Version</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
              />
            </svg>
            <span>v{file.version}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              role="img"
              aria-label="Last updated"
            >
              <title>Last updated</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span>Updated {formatDate(file.last_updated)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              role="img"
              aria-label="File path"
            >
              <title>File path</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span className="font-mono">{file.path}</span>
          </div>
        </div>

        {/* Tags */}
        {file.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {file.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium text-indigo-300 bg-indigo-500/10 rounded-full border border-indigo-500/20"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* File Content */}
      <div ref={contentRef} className="flex-1 overflow-y-auto px-8 py-6">
        <div className="max-w-none space-y-2">
          {blocks.map((block, blockIdx) => {
            // Use a derived key to avoid the noArrayIndexKey lint rule
            const blockKey = `block-${blockIdx}`;
            switch (block.type) {
              case 'h1':
                return (
                  <h1
                    key={blockKey}
                    className="text-2xl font-bold text-white mt-6 mb-4"
                  >
                    {renderInline(block.text)}
                  </h1>
                );
              case 'h2':
                return (
                  <h2
                    key={blockKey}
                    className="text-xl font-semibold text-slate-200 mt-8 mb-3 pb-2 border-b border-slate-800/50"
                  >
                    {renderInline(block.text)}
                  </h2>
                );
              case 'h3':
                return (
                  <h3
                    key={blockKey}
                    className="text-lg font-medium text-slate-300 mt-6 mb-2"
                  >
                    {renderInline(block.text)}
                  </h3>
                );
              case 'p':
                return (
                  <p
                    key={blockKey}
                    className="text-sm text-slate-300 leading-relaxed"
                  >
                    {renderInline(block.text)}
                  </p>
                );
              case 'code':
                return (
                  <pre
                    key={blockKey}
                    className="bg-slate-900/80 border border-slate-800/50 rounded-xl p-4 my-4 overflow-x-auto"
                  >
                    <code className="text-sm text-slate-300 font-mono leading-relaxed block whitespace-pre">
                      {block.code}
                    </code>
                  </pre>
                );
              case 'ul':
                return (
                  <ul key={blockKey} className="space-y-1 my-2">
                    {block.items.map((item, itemIdx) => {
                      const itemKey = `${blockKey}-item-${itemIdx}`;
                      return (
                        <li
                          key={itemKey}
                          className="flex items-start gap-2 text-sm text-slate-300"
                        >
                          <span className="text-slate-500 mt-1 shrink-0">
                            •
                          </span>
                          <span>{renderInline(item)}</span>
                        </li>
                      );
                    })}
                  </ul>
                );
              case 'ol':
                return (
                  <ol
                    key={blockKey}
                    className="space-y-1 my-2 list-decimal list-inside"
                  >
                    {block.items.map((item, itemIdx) => {
                      const itemKey = `${blockKey}-item-${itemIdx}`;
                      return (
                        <li key={itemKey} className="text-sm text-slate-300">
                          {renderInline(item)}
                        </li>
                      );
                    })}
                  </ol>
                );
              case 'blockquote':
                return (
                  <blockquote
                    key={blockKey}
                    className="border-l-2 border-indigo-500/30 pl-4 py-1 my-2 text-slate-400 italic"
                  >
                    {renderInline(block.text)}
                  </blockquote>
                );
              case 'hr':
                return (
                  <hr key={blockKey} className="border-slate-800/50 my-6" />
                );
              case 'empty':
                return <div key={blockKey} className="h-3" />;
              default:
                return null;
            }
          })}
        </div>
      </div>
    </div>
  );
}
