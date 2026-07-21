/**
 * Typed ingestion errors so the API layer can return actionable messages
 * (and the UI can render a helpful fallback) instead of a generic 500.
 *
 * Every error carries:
 *  - `code`: stable machine-readable identifier
 *  - `userMessage`: safe, friendly copy shown directly to the creator
 *  - `retryable`: whether "try again" is honest advice
 */
export type IngestErrorCode =
  | "invalid_url"
  | "blocked_url" // SSRF guard: private/reserved address, disallowed scheme
  | "fetch_failed"
  | "fetch_timeout"
  | "too_large"
  | "not_html"
  | "extraction_empty" // page fetched fine but no meaningful article text
  | "yt_bad_url"
  | "yt_no_transcript" // video has no captions
  | "yt_blocked" // YouTube refused us (datacenter IP etc.) → paste fallback
  | "file_unsupported"
  | "file_corrupt"
  | "file_empty"
  | "text_too_short"
  | "cap_exceeded" // tier content/input caps
  | "sitemap_not_found"
  | "sitemap_too_large"
  | "feed_invalid"
  | "channel_not_found"
  | "channel_no_videos";

export class IngestError extends Error {
  readonly code: IngestErrorCode;
  readonly userMessage: string;
  readonly retryable: boolean;

  constructor(code: IngestErrorCode, userMessage: string, retryable = false) {
    super(`${code}: ${userMessage}`);
    this.name = "IngestError";
    this.code = code;
    this.userMessage = userMessage;
    this.retryable = retryable;
  }
}

export const INGEST_ERRORS = {
  invalidUrl: () =>
    new IngestError(
      "invalid_url",
      "That doesn't look like a valid web address. Check the URL and try again."
    ),
  blockedUrl: () =>
    new IngestError(
      "blocked_url",
      "That address can't be fetched for security reasons. Public web pages only."
    ),
  fetchFailed: (status?: number) =>
    new IngestError(
      "fetch_failed",
      status
        ? `The site responded with an error (HTTP ${status}). It may be down or blocking automated readers.`
        : "We couldn't reach that site. It may be down or blocking automated readers.",
      true
    ),
  fetchTimeout: () =>
    new IngestError(
      "fetch_timeout",
      "That site took too long to respond. Try again in a moment.",
      true
    ),
  tooLarge: () =>
    new IngestError(
      "too_large",
      "That page or file is too large to ingest. Try a specific article or a smaller file."
    ),
  notHtml: () =>
    new IngestError(
      "not_html",
      "That URL isn't a web page. If it's a PDF, upload it as a file instead."
    ),
  extractionEmpty: () =>
    new IngestError(
      "extraction_empty",
      "We fetched the page but couldn't find meaningful article text — it may be behind a login, paywalled, or built entirely with scripts. Try pasting the text directly."
    ),
  ytBadUrl: () =>
    new IngestError(
      "yt_bad_url",
      "We couldn't find a YouTube video ID in that link. Paste a normal video URL like youtube.com/watch?v=…"
    ),
  ytNoTranscript: () =>
    new IngestError(
      "yt_no_transcript",
      "That video has no captions available, so there's no transcript to learn from. You can paste a transcript manually instead."
    ),
  ytBlocked: () =>
    new IngestError(
      "yt_blocked",
      "YouTube is blocking automated transcript access right now. Open the video's transcript (··· → Show transcript), copy it, and paste it here instead — it works just as well.",
      true
    ),
  fileUnsupported: (ext: string) =>
    new IngestError(
      "file_unsupported",
      `.${ext} files aren't supported yet. Use PDF, DOCX, TXT, or MD.`
    ),
  fileCorrupt: () =>
    new IngestError(
      "file_corrupt",
      "We couldn't read that file — it may be corrupted or password-protected."
    ),
  fileEmpty: () =>
    new IngestError(
      "file_empty",
      "That file doesn't contain any extractable text. If it's a scanned PDF, it needs OCR first."
    ),
  textTooShort: (min: number) =>
    new IngestError(
      "text_too_short",
      `That's too little text to learn from (minimum ~${min} words). Add a bit more.`
    ),
  capExceeded: (kind: "words" | "sources") =>
    new IngestError(
      "cap_exceeded",
      kind === "words"
        ? "This would exceed your plan's training-content limit."
        : "You've reached your plan's source limit."
    ),
  sitemapNotFound: () =>
    new IngestError(
      "sitemap_not_found",
      "We couldn't find a sitemap or feed for that site. Try adding individual post URLs instead."
    ),
  sitemapTooLarge: () =>
    new IngestError(
      "sitemap_too_large",
      "That sitemap is too large to process. Try a more specific sitemap URL (e.g. your posts sitemap)."
    ),
  feedInvalid: () =>
    new IngestError(
      "feed_invalid",
      "That sitemap or feed couldn't be parsed. Try adding individual post URLs instead."
    ),
  channelNotFound: () =>
    new IngestError(
      "channel_not_found",
      "We couldn't find that YouTube channel. Paste the channel URL (youtube.com/@yourhandle).",
      true
    ),
  channelNoVideos: () =>
    new IngestError(
      "channel_no_videos",
      "That channel has no public videos we can read."
    ),
} as const;
