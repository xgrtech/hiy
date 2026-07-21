/**
 * YouTube transcript ingestion.
 *
 * Reality check baked into this module: YouTube aggressively blocks
 * transcript access from datacenter IPs (exactly where this code runs in
 * production). So this ingester is built to DEGRADE GRACEFULLY, not to
 * pretend it always works:
 *
 *   1. Try youtubei.js (InnerTube client — the most resilient library
 *      approach) with a hard timeout.
 *   2. On any block/failure, throw `yt_blocked` whose userMessage tells
 *      the creator exactly how to paste the transcript manually — the UI
 *      renders a paste box right in the YouTube tab. The paste path is a
 *      first-class flow (`ingestYoutubePaste`), not a shrug.
 *
 * Transcripts (fetched or pasted) are re-flowed into paragraphs so
 * chunking doesn't slice an unpunctuated word-stream at random points.
 */
import { INGEST_ERRORS } from "./errors";
import { cleanText, paragraphizeTranscript, wordCount } from "./clean";
import type { IngestedSource } from "./types";

const FETCH_TIMEOUT_MS = 20_000;
const MIN_TRANSCRIPT_WORDS = 40;

export function extractVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const patterns = [
    /(?:youtube\.com\/watch\?[^#]*v=|youtube\.com\/(?:embed|shorts|live|v)\/|youtu\.be\/)([A-Za-z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = p.exec(trimmed);
    if (m) return m[1];
  }
  return null;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, rej) =>
      setTimeout(() => rej(new Error("timeout")), ms)
    ),
  ]);
}

export async function ingestYoutubeUrl(rawUrl: string): Promise<IngestedSource> {
  const videoId = extractVideoId(rawUrl);
  if (!videoId) throw INGEST_ERRORS.ytBadUrl();

  let title = `YouTube video ${videoId}`;
  let transcriptText = "";

  try {
    const { Innertube } = await import("youtubei.js");
    const yt = await withTimeout(Innertube.create({ retrieve_player: false }), FETCH_TIMEOUT_MS);
    const info = await withTimeout(yt.getInfo(videoId), FETCH_TIMEOUT_MS);
    title = info.basic_info.title ?? title;

    const transcriptInfo = await withTimeout(info.getTranscript(), FETCH_TIMEOUT_MS);
    const segments =
      transcriptInfo?.transcript?.content?.body?.initial_segments ?? [];
    transcriptText = segments
      .map((s: { snippet?: { text?: string } }) => s.snippet?.text ?? "")
      .filter(Boolean)
      .join(" ");
  } catch (e) {
    const msg = e instanceof Error ? e.message.toLowerCase() : "";
    if (msg.includes("transcript") && (msg.includes("not") || msg.includes("disabled"))) {
      throw INGEST_ERRORS.ytNoTranscript();
    }
    // Everything else (login walls, IP blocks, timeouts, API drift) lands
    // on the honest answer: fetch is blocked, use the paste path.
    throw INGEST_ERRORS.ytBlocked();
  }

  const text = cleanText(paragraphizeTranscript(cleanText(transcriptText)));
  if (wordCount(text) < MIN_TRANSCRIPT_WORDS) throw INGEST_ERRORS.ytNoTranscript();

  return {
    type: "youtube",
    title,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    text,
    wordCount: wordCount(text),
    meta: { videoId },
  };
}

/**
 * First-class fallback: the creator pastes a transcript they copied from
 * YouTube's own "Show transcript" panel. Strips the timestamp lines that
 * come along when copying from that panel ("0:00", "12:34", "1:02:33").
 */
export function ingestYoutubePaste(
  pasted: string,
  videoUrlOrTitle?: string
): IngestedSource {
  const stripped = pasted
    .split("\n")
    .filter((line) => !/^\s*\d{1,2}:\d{2}(:\d{2})?\s*$/.test(line))
    .join("\n");

  const text = cleanText(paragraphizeTranscript(cleanText(stripped)));
  if (wordCount(text) < MIN_TRANSCRIPT_WORDS) {
    throw INGEST_ERRORS.textTooShort(MIN_TRANSCRIPT_WORDS);
  }

  const videoId = videoUrlOrTitle ? extractVideoId(videoUrlOrTitle) : null;
  return {
    type: "youtube",
    title: videoId
      ? `YouTube video ${videoId} (pasted transcript)`
      : videoUrlOrTitle?.trim() || "Pasted video transcript",
    url: videoId ? `https://www.youtube.com/watch?v=${videoId}` : null,
    text,
    wordCount: wordCount(text),
    meta: videoId ? { videoId, pasted: "true" } : { pasted: "true" },
  };
}
