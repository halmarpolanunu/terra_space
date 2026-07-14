import { FramedPanel } from "@/components/framed-panel";

type SourcePanelProps = {
  content: string;
  evidenceQuote?: string | null;
};

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildQuoteRegex(quote: string): RegExp | null {
  const trimmed = quote.trim();
  if (!trimmed) {
    return null;
  }
  const pattern = trimmed
    .split(/\s+/)
    .map((word) => escapeRegExp(word))
    .join("\\s+");
  return new RegExp(pattern, "i");
}

export function SourcePanel({ content, evidenceQuote }: SourcePanelProps) {
  const regex = evidenceQuote ? buildQuoteRegex(evidenceQuote) : null;
  const match = regex ? regex.exec(content) : null;

  if (!match) {
    return (
      <FramedPanel title="Source Document">
        <p className="source-document">{content}</p>
      </FramedPanel>
    );
  }

  const start = match.index;
  const end = start + match[0].length;

  return (
    <FramedPanel title="Source Document">
      <p className="source-document">
        {content.slice(0, start)}
        <mark className="evidence-highlight">{content.slice(start, end)}</mark>
        {content.slice(end)}
      </p>
    </FramedPanel>
  );
}
