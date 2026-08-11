import DOMPurify from 'dompurify';
import katex from 'katex';
import { marked } from 'marked';

const escapeHtml = (value: string): string => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const safeAttribute = (value: string): string => escapeHtml(value).replaceAll('`', '&#096;');

const transformExtendedSyntax = (source: string): string => {
  let markdown = source.replace(/^\[\^([^\]]+)\]:\s*(.+)$/gm, '<div class="markdown-footnote-definition" data-footnote="$1"><strong>[$1]</strong> $2</div>');
  markdown = markdown.replace(/\[\^([^\]]+)\]/g, '<sup class="markdown-footnote"><a href="#footnote-$1">[$1]</a></sup>');
  markdown = markdown.replace(/\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]/g, (_match, target: string, heading: string | undefined, label: string | undefined) => {
    const text = label ?? target;
    const href = `#wiki-${encodeURIComponent(target.trim())}${heading ? `-${encodeURIComponent(heading.trim())}` : ''}`;
    return `<a class="markdown-wiki-link" href="${safeAttribute(href)}" data-wiki-target="${safeAttribute(target.trim())}">${escapeHtml(text)}</a>`;
  });
  markdown = markdown.replace(/(^|\s)#([a-zA-Z][\w/-]*)/g, (_match, prefix: string, tag: string) => `${prefix}<a class="markdown-tag" href="#tag-${safeAttribute(tag)}">#${escapeHtml(tag)}</a>`);
  markdown = markdown.replace(/==([^=\n]+)==/g, '<mark>$1</mark>');
  markdown = markdown.replace(/(?<!\\)([A-Za-z0-9)])~([^~\n]+)~/g, '$1<sub>$2</sub>');
  markdown = markdown.replace(/(?<!\\)\^([^\^\n]+)\^/g, '<sup>$1</sup>');
  markdown = markdown.replace(/^> \[!(NOTE|TIP|WARNING|IMPORTANT|CAUTION|SUCCESS|BUG|QUESTION|QUOTE)\]\s*\n((?:^>.*(?:\n|$))*)/gim, (_match, type: string, body: string) => {
    const content = body.split('\n').map((line) => line.replace(/^> ?/, '').trim()).filter(Boolean).join('\n');
    return `<div class="markdown-callout callout-${type.toLowerCase()}"><strong>${type}</strong><div>${escapeHtml(content)}</div></div>\n`;
  });
  markdown = markdown.replace(/^(?!<)([^\n]+)\n:\s+(.+)$/gm, '<dl><dt>$1</dt><dd>$2</dd></dl>');
  return markdown;
};

export const renderMarkdown = (source: string): string => {
  const mathExpressions: Array<{ expression: string; displayMode: boolean }> = [];
  const withMathPlaceholders = source
    .replace(/\$\$([\s\S]+?)\$\$/g, (_match, expression: string) => `@@MATH${mathExpressions.push({ expression, displayMode: true }) - 1}@@`)
    .replace(/(?<!\\)\$([^$\n]+)\$/g, (_match, expression: string) => `@@MATH${mathExpressions.push({ expression, displayMode: false }) - 1}@@`);
  let html = marked.parse(transformExtendedSyntax(withMathPlaceholders), { gfm: true, breaks: true, async: false }) as string;
  html = html.replace(/@@MATH(\d+)@@/g, (_match, index: string) => {
    const math = mathExpressions[Number(index)];
    if (!math) return '';
    try {
      return katex.renderToString(math.expression.trim(), { displayMode: math.displayMode, throwOnError: false });
    } catch {
      return escapeHtml(math.expression);
    }
  });
  return DOMPurify.sanitize(html, {
    ADD_ATTR: ['target', 'rel', 'data-wiki-target', 'data-footnote'],
    ALLOW_UNKNOWN_PROTOCOLS: false,
  });
};

export const escapeMessageText = escapeHtml;
