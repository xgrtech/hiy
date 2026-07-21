/**
 * Blog / article URL ingestion.
 *
 * Primary extractor: Mozilla Readability — the engine behind Firefox's
 * reader mode, the industry standard for boilerplate removal. Fallback:
 * a density heuristic over <article>/<main>/<body> for pages Readability
 * declines (it returns null when it isn't confident it found an article).
 *
 * Charset handling: pages are decoded per their declared charset (header
 * or meta), not blindly as UTF-8 — mojibake in the knowledge base makes
 * the twin misquote its own author.
 */
import { Readability } from "@mozilla/readability";
import { JSDOM, VirtualConsole } from "jsdom";
import { INGEST_ERRORS } from "./errors";
import { safeFetch } from "./net";
import { cleanText, wordCount } from "./clean";
import type { IngestedSource } from "./types";

const MIN_ARTICLE_WORDS = 40;

function decodeBody(body: Buffer, contentType: string): string {
  const fromHeader = /charset=([\w-]+)/i.exec(contentType)?.[1];
  let charset = fromHeader?.toLowerCase() ?? null;
  if (!charset) {
    // sniff <meta charset> from the first 4KB
    const head = body.subarray(0, 4096).toString("latin1");
    charset =
      /<meta[^>]+charset=["']?([\w-]+)/i.exec(head)?.[1]?.toLowerCase() ?? null;
  }
  try {
    return new TextDecoder(charset ?? "utf-8", { fatal: false }).decode(body);
  } catch {
    return body.toString("utf-8");
  }
}

function fallbackExtract(dom: JSDOM): string {
  const doc = dom.window.document;
  doc
    .querySelectorAll(
      "script,style,nav,header,footer,aside,form,noscript,svg,iframe,button"
    )
    .forEach((el) => el.remove());
  const candidates = [
    ...doc.querySelectorAll("article, main, [role='main']"),
  ];
  const root =
    candidates.sort(
      (a, b) => (b.textContent?.length ?? 0) - (a.textContent?.length ?? 0)
    )[0] ?? doc.body;
  if (!root) return "";
  const blocks = [...root.querySelectorAll("p, li, h1, h2, h3, blockquote, pre")]
    .map((el) => el.textContent?.trim() ?? "")
    .filter((t) => t.length > 25);
  return blocks.join("\n\n");
}

export async function ingestBlogUrl(rawUrl: string): Promise<IngestedSource> {
  const { finalUrl, contentType, body } = await safeFetch(rawUrl);

  if (
    contentType &&
    !/(text\/html|application\/xhtml)/.test(contentType) &&
    contentType.trim() !== ""
  ) {
    throw INGEST_ERRORS.notHtml();
  }

  const html = decodeBody(body, contentType);

  // VirtualConsole swallows jsdom's noisy CSS-parse errors; we never run
  // page scripts (no `runScripts`), so fetched JS is inert by construction.
  const vc = new VirtualConsole();
  const dom = new JSDOM(html, { url: finalUrl, virtualConsole: vc });

  let title =
    dom.window.document.title?.trim() ||
    new URL(finalUrl).hostname.replace(/^www\./, "");
  let text = "";
  let byline: string | undefined;

  try {
    const article = new Readability(
      dom.window.document.cloneNode(true) as Document,
      { charThreshold: 250 }
    ).parse();
    if (article?.textContent) {
      text = article.textContent;
      if (article.title) title = article.title;
      byline = article.byline ?? undefined;
    }
  } catch {
    // Readability can throw on exotic DOMs — fall through to heuristic
  }

  if (wordCount(text) < MIN_ARTICLE_WORDS) {
    text = fallbackExtract(dom);
  }

  text = cleanText(text);
  if (wordCount(text) < MIN_ARTICLE_WORDS) {
    throw INGEST_ERRORS.extractionEmpty();
  }

  return {
    type: "blog",
    title,
    url: finalUrl,
    text,
    wordCount: wordCount(text),
    meta: byline ? { byline } : {},
  };
}
