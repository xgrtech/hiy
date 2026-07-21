/** Paragraph-respecting chunker: ~180-word windows, 30-word overlap. */
export interface Chunk {
  content: string;
  sourceTitle: string;
}

const SIZE = 180;
const OVERLAP = 30;

export function chunkText(text: string, sourceTitle: string): Chunk[] {
  const words: string[] = [];
  for (const para of text.split(/\n\s*\n/)) {
    const w = para.trim().split(/\s+/).filter(Boolean);
    if (w.length) words.push(...w, "¶");
  }
  const chunks: Chunk[] = [];
  let i = 0;
  while (i < words.length) {
    const window = words.slice(i, i + SIZE);
    const content = window.filter((w) => w !== "¶").join(" ").trim();
    if (content.length > 40) chunks.push({ content, sourceTitle });
    if (i + SIZE >= words.length) break;
    i += SIZE - OVERLAP;
  }
  return chunks;
}
