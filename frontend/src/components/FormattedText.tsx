import type { ReactNode } from 'react';
import { Fragment } from 'react';

type FormattedTextProps = {
  text: string;
  className?: string;
  compact?: boolean;
};

type TextBlock =
  | {
      type: 'paragraph';
      text: string;
    }
  | {
      type: 'list';
      ordered: boolean;
      items: string[];
    };

export function FormattedText({
  text,
  className = '',
  compact = false,
}: FormattedTextProps) {
  const blocks = parseBlocks(text);

  if (blocks.length === 0) {
    return null;
  }

  return (
    <div className={[compact ? 'space-y-1' : 'space-y-2', className].join(' ')}>
      {blocks.map((block, index) => {
        if (block.type === 'list') {
          const ListTag = block.ordered ? 'ol' : 'ul';

          return (
            <ListTag
              className={[
                'space-y-1 pl-4',
                block.ordered ? 'list-decimal' : 'list-disc',
              ].join(' ')}
              key={`list-${index}`}
            >
              {block.items.map((item, itemIndex) => (
                <li key={`${index}-${itemIndex}`}>
                  {renderInlineWithBreaks(item, `${index}-${itemIndex}`)}
                </li>
              ))}
            </ListTag>
          );
        }

        return (
          <p key={`paragraph-${index}`}>
            {renderInlineWithBreaks(block.text, `${index}`)}
          </p>
        );
      })}
    </div>
  );
}

function parseBlocks(text: string): TextBlock[] {
  const blocks: TextBlock[] = [];
  const paragraphLines: string[] = [];
  let activeList: Extract<TextBlock, { type: 'list' }> | null = null;

  function flushParagraph() {
    if (paragraphLines.length === 0) return;

    blocks.push({
      type: 'paragraph',
      text: paragraphLines.join('\n'),
    });
    paragraphLines.length = 0;
  }

  function flushList() {
    if (!activeList) return;

    blocks.push(activeList);
    activeList = null;
  }

  for (const rawLine of text.replace(/\r\n/g, '\n').split('\n')) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    const unordered = line.match(/^[-*•]\s+(.+)$/);
    const ordered = line.match(/^\d+[\.)]\s+(.+)$/);

    if (unordered || ordered) {
      flushParagraph();

      const listItem = (unordered?.[1] ?? ordered?.[1] ?? '').trim();
      const isOrdered = Boolean(ordered);

      if (!activeList || activeList.ordered !== isOrdered) {
        flushList();
        activeList = {
          type: 'list',
          ordered: isOrdered,
          items: [],
        };
      }

      activeList.items.push(listItem);
      continue;
    }

    flushList();
    paragraphLines.push(line);
  }

  flushParagraph();
  flushList();

  return blocks;
}

function renderInlineWithBreaks(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const lines = text.split('\n');

  for (const [lineIndex, line] of lines.entries()) {
    if (lineIndex > 0) {
      nodes.push(<br key={`${keyPrefix}-br-${lineIndex}`} />);
    }

    nodes.push(
      <Fragment key={`${keyPrefix}-line-${lineIndex}`}>
        {parseInline(line, `${keyPrefix}-${lineIndex}`)}
      </Fragment>,
    );
  }

  return nodes;
}

function parseInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const boldPattern = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = boldPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    nodes.push(
      <strong className="font-semibold" key={`${keyPrefix}-bold-${match.index}`}>
        {match[1]}
      </strong>,
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}
