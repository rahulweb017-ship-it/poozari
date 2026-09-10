import type { ReactNode } from 'react';

/**
 * A small Markdown renderer for admin-authored blog bodies.
 *
 * It builds React elements directly rather than producing an HTML string, so
 * there is no `dangerouslySetInnerHTML` and nothing to sanitise. Supports what
 * a post actually needs: headings, paragraphs, ordered/unordered lists,
 * blockquotes, fenced code, horizontal rules, and inline bold/italic/code/links.
 */

/** Inline spans: **bold**, *italic*, `code`, [text](href). */
function renderInline(text: string, keyPrefix = ''): ReactNode[] {
  const pattern = /(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`\n]+`|\[[^\]]+\]\([^)\s]+\))/g;
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    const token = match[0];
    const key = `${keyPrefix}i${index++}`;

    if (token.startsWith('**')) {
      nodes.push(
        <strong key={key} className="font-bold text-foreground">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith('`')) {
      nodes.push(
        <code key={key} className="rounded bg-gray-100 px-1.5 py-0.5 text-[0.9em] font-semibold">
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith('[')) {
      const linkMatch = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(token);
      if (linkMatch) {
        const [, label, href] = linkMatch;
        const external = /^https?:\/\//.test(href);
        nodes.push(
          <a
            key={key}
            href={href}
            className="font-semibold text-accent underline decoration-accent/30 underline-offset-2 hover:decoration-accent"
            {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          >
            {label}
          </a>,
        );
      } else {
        nodes.push(token);
      }
    } else {
      nodes.push(
        <em key={key} className="italic">
          {token.slice(1, -1)}
        </em>,
      );
    }
    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

type Block =
  | { type: 'heading'; level: 2 | 3 | 4; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'quote'; text: string }
  | { type: 'code'; text: string }
  | { type: 'rule' };

/** Group raw lines into blocks. */
function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    // Fenced code
    if (line.trimStart().startsWith('```')) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        body.push(lines[i]);
        i++;
      }
      i++; // closing fence
      blocks.push({ type: 'code', text: body.join('\n') });
      continue;
    }

    // Horizontal rule
    if (/^\s*(?:---+|\*\*\*+|___+)\s*$/.test(line)) {
      blocks.push({ type: 'rule' });
      i++;
      continue;
    }

    // Headings. A single # is treated as h2: the page already has the h1.
    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      const hashes = heading[1].length;
      const level = (hashes <= 2 ? 2 : hashes === 3 ? 3 : 4) as 2 | 3 | 4;
      blocks.push({ type: 'heading', level, text: heading[2].trim() });
      i++;
      continue;
    }

    // Blockquote
    if (/^\s*>\s?/.test(line)) {
      const body: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        body.push(lines[i].replace(/^\s*>\s?/, ''));
        i++;
      }
      blocks.push({ type: 'quote', text: body.join(' ').trim() });
      continue;
    }

    // Lists
    const unordered = /^\s*[-*+]\s+/;
    const ordered = /^\s*\d+[.)]\s+/;
    if (unordered.test(line) || ordered.test(line)) {
      const isOrdered = ordered.test(line);
      const marker = isOrdered ? ordered : unordered;
      const items: string[] = [];
      while (i < lines.length && marker.test(lines[i])) {
        items.push(lines[i].replace(marker, '').trim());
        i++;
      }
      blocks.push({ type: 'list', ordered: isOrdered, items });
      continue;
    }

    // Paragraph: consume until a blank line or the start of another block.
    const paragraph: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,4})\s+/.test(lines[i]) &&
      !/^\s*>\s?/.test(lines[i]) &&
      !unordered.test(lines[i]) &&
      !ordered.test(lines[i]) &&
      !lines[i].trimStart().startsWith('```')
    ) {
      paragraph.push(lines[i].trim());
      i++;
    }
    blocks.push({ type: 'paragraph', text: paragraph.join(' ') });
  }

  return blocks;
}

export function Markdown({ source, className }: { source: string; className?: string }) {
  const blocks = parseBlocks(source ?? '');

  return (
    <div className={className}>
      {blocks.map((block, index) => {
        const key = `b${index}`;
        switch (block.type) {
          case 'heading': {
            const Tag = (`h${block.level}` as unknown) as 'h2';
            const size =
              block.level === 2
                ? 'mt-10 text-xl'
                : block.level === 3
                  ? 'mt-8 text-lg'
                  : 'mt-6 text-base';
            return (
              <Tag key={key} className={`${size} font-display font-bold text-foreground`}>
                {renderInline(block.text, key)}
              </Tag>
            );
          }
          case 'list':
            return block.ordered ? (
              <ol key={key} className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed">
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{renderInline(item, `${key}-${itemIndex}`)}</li>
                ))}
              </ol>
            ) : (
              <ul key={key} className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed">
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{renderInline(item, `${key}-${itemIndex}`)}</li>
                ))}
              </ul>
            );
          case 'quote':
            return (
              <blockquote
                key={key}
                className="mt-6 border-l-4 pl-5 text-sm italic leading-relaxed text-muted-foreground"
                style={{ borderColor: 'hsl(var(--accent) / 0.4)' }}
              >
                {renderInline(block.text, key)}
              </blockquote>
            );
          case 'code':
            return (
              <pre
                key={key}
                className="mt-6 overflow-x-auto rounded-2xl bg-gray-900 p-4 text-xs leading-relaxed text-gray-100"
              >
                <code>{block.text}</code>
              </pre>
            );
          case 'rule':
            return (
              <hr
                key={key}
                className="mt-8 border-t"
                style={{ borderColor: 'hsl(var(--border))' }}
              />
            );
          default:
            return (
              <p key={key} className="mt-4 text-sm leading-relaxed text-muted-foreground">
                {renderInline(block.text, key)}
              </p>
            );
        }
      })}
    </div>
  );
}
