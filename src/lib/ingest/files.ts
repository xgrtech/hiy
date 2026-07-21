/**
 * File upload ingestion: PDF, DOCX, TXT, MD.
 *
 * Library choices are deliberate for serverless (Vercel) compatibility:
 *  - `unpdf` — modern, worker-free PDF text extraction that runs in
 *    serverless/edge runtimes (pdf-parse and pdfjs-dist need workarounds).
 *  - `mammoth` — the standard for DOCX → text/HTML.
 *
 * Scanned (image-only) PDFs are detected honestly — near-zero extracted
 * text → `file_empty` with copy telling the creator OCR is needed, rather
 * than silently indexing an empty source that makes their twin "know"
 * nothing from a document they believe they uploaded.
 */
import { INGEST_ERRORS } from "./errors";
import { cleanText, looksLikeText, wordCount } from "./clean";
import type { IngestedSource } from "./types";

const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB
const MIN_WORDS = 20;

const EXT_TO_KIND: Record<string, "pdf" | "docx" | "text"> = {
  pdf: "pdf",
  docx: "docx",
  txt: "text",
  md: "text",
  markdown: "text",
};

async function extractPdf(buf: Buffer): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  let pdf;
  try {
    pdf = await getDocumentProxy(new Uint8Array(buf));
  } catch {
    throw INGEST_ERRORS.fileCorrupt();
  }
  const { text } = await extractText(pdf, { mergePages: true });
  return typeof text === "string" ? text : (text as string[]).join("\n\n");
}

async function extractDocx(buf: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  try {
    const result = await mammoth.extractRawText({ buffer: buf });
    return result.value;
  } catch {
    throw INGEST_ERRORS.fileCorrupt();
  }
}

export async function ingestFile(
  filename: string,
  buf: Buffer
): Promise<IngestedSource> {
  if (buf.byteLength > MAX_FILE_BYTES) throw INGEST_ERRORS.tooLarge();
  if (buf.byteLength === 0) throw INGEST_ERRORS.fileEmpty();

  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const kind = EXT_TO_KIND[ext];
  if (!kind) throw INGEST_ERRORS.fileUnsupported(ext || "unknown");

  let raw: string;
  if (kind === "pdf") raw = await extractPdf(buf);
  else if (kind === "docx") raw = await extractDocx(buf);
  else {
    raw = buf.toString("utf-8");
    if (!looksLikeText(raw)) throw INGEST_ERRORS.fileCorrupt();
  }

  const text = cleanText(raw);
  if (wordCount(text) < MIN_WORDS) throw INGEST_ERRORS.fileEmpty();

  return {
    type: "file",
    title: filename.replace(/\.[^.]+$/, ""),
    url: null,
    text,
    wordCount: wordCount(text),
    meta: { filename, format: kind },
  };
}
