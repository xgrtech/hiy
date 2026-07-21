/**
 * Ingestion dispatcher — the single entry point the API layer calls.
 * Validates, dispatches to the right adapter, and guarantees the result
 * shape. All adapters throw typed IngestError; anything else escaping is
 * a bug (the API layer maps unknown errors to a generic 500).
 */
import { INGEST_ERRORS, IngestError } from "./errors";
import { cleanText, looksLikeText, wordCount } from "./clean";
import { ingestBlogUrl } from "./blog";
import { ingestYoutubeUrl, ingestYoutubePaste } from "./youtube";
import { ingestFile } from "./files";
import type { IngestedSource, SourceType } from "./types";

export { IngestError, INGEST_ERRORS } from "./errors";
export type { IngestedSource, SourceType } from "./types";
export { ingestFile } from "./files";
export { extractVideoId } from "./youtube";

const MIN_MANUAL_WORDS = 30;
const MAX_TEXT_CHARS = 2_000_000; // ~300k words; caps enforce real limits per-tier

export interface IngestRequest {
  sourceType: SourceType;
  /** URL for blog/youtube; raw text for manual/linkedin/youtube-paste */
  payload: string;
  title?: string;
  /** youtube only: original URL when payload is a pasted transcript */
  videoRef?: string;
}

function ingestManual(
  payload: string,
  title: string | undefined,
  type: "manual" | "linkedin"
): IngestedSource {
  if (!looksLikeText(payload)) throw INGEST_ERRORS.fileCorrupt();
  const text = cleanText(payload).slice(0, MAX_TEXT_CHARS);
  if (wordCount(text) < MIN_MANUAL_WORDS) {
    throw INGEST_ERRORS.textTooShort(MIN_MANUAL_WORDS);
  }
  return {
    type,
    title:
      title?.trim() ||
      (type === "linkedin" ? "LinkedIn / résumé" : "Pasted text"),
    url: null,
    text,
    wordCount: wordCount(text),
    meta: {},
  };
}

export async function ingest(req: IngestRequest): Promise<IngestedSource> {
  const payload = req.payload?.trim() ?? "";
  if (!payload) throw INGEST_ERRORS.textTooShort(1);

  switch (req.sourceType) {
    case "manual":
      return ingestManual(payload, req.title, "manual");
    case "linkedin":
      // No live scraping (LinkedIn ToS + fragility). "LinkedIn" is the
      // creator's own exported profile / résumé text, pasted.
      return ingestManual(payload, req.title, "linkedin");
    case "blog":
      return ingestBlogUrl(payload);
    case "youtube": {
      // Heuristic: if the payload parses as a URL/ID, fetch; otherwise
      // it's a pasted transcript (the blocked-fetch fallback path).
      const looksLikeRef =
        wordCount(payload) <= 4 && /youtu|^[A-Za-z0-9_-]{11}$/.test(payload);
      if (looksLikeRef) return ingestYoutubeUrl(payload);
      return ingestYoutubePaste(payload, req.videoRef ?? req.title);
    }
    default:
      throw new IngestError(
        "file_unsupported",
        `Unknown source type: ${req.sourceType}`
      );
  }
}
