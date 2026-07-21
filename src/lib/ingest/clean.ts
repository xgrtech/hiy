/**
 * Text normalization shared by every ingester. The goal is that whatever
 * the source (scraped HTML, transcript, PDF, paste), downstream stages
 * (wiki synthesis, chunking, embedding) receive uniform, clean plain text.
 */

/** Collapse whitespace artifacts without destroying paragraph structure. */
export function cleanText(input: string): string {
  return (
    input
      // normalize unicode oddities that PDFs and scrapes love
      .normalize("NFKC")
      .replace(/ /g, " ") // nbsp
      .replace(/[​-‍﻿]/g, "") // zero-width chars
      .replace(/\r\n?/g, "\n")
      // strip trailing spaces per line
      .replace(/[ \t]+$/gm, "")
      // collapse runs of spaces/tabs
      .replace(/[ \t]{2,}/g, " ")
      // collapse 3+ newlines to a paragraph break
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

export function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/**
 * Transcripts arrive as one giant unpunctuated stream ("so yeah I think
 * the thing about pricing is..."). Re-flow into readable paragraphs of
 * roughly N words so chunking respects thought boundaries at least
 * approximately, instead of slicing mid-run forever.
 */
export function paragraphizeTranscript(text: string, wordsPerPara = 90): string {
  const words = text.split(/\s+/).filter(Boolean);
  const paras: string[] = [];
  for (let i = 0; i < words.length; i += wordsPerPara) {
    paras.push(words.slice(i, i + wordsPerPara).join(" "));
  }
  return paras.join("\n\n");
}

/** Guard against pathological inputs (binary blobs pasted as text, etc.). */
export function looksLikeText(input: string): boolean {
  if (!input) return false;
  const sample = input.slice(0, 2000);
  let weird = 0;
  for (const ch of sample) {
    const code = ch.codePointAt(0)!;
    if (code === 0xfffd || (code < 32 && code !== 9 && code !== 10 && code !== 13)) weird++;
  }
  return weird / sample.length < 0.02;
}
