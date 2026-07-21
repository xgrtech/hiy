/**
 * Bulk-import discovery: list what a site or YouTube channel offers WITHOUT
 * ingesting anything. Site: robots.txt → sitemap.xml (index recursion) →
 * RSS/Atom fallback. Channel: youtubei.js listing. All fetching goes through
 * safeFetch (SSRF guard, size caps). Parsers are pure and fixture-tested.
 */
import { INGEST_ERRORS } from "./errors";
import { safeFetch } from "./net";

export interface DiscoveredPage {
  url: string;
  title: string | null;
  lastmod: string | null;
}

export interface DiscoveredVideo {
  videoId: string;
  title: string;
  duration: string | null;
  published: string | null;
}

const MAX_URLS = 500;
const MAX_INDEX_DEPTH = 3;
const MAX_CHILD_SITEMAPS = 10;

/** `Sitemap:` declarations from a robots.txt body (case-insensitive). */
export function parseRobotsSitemaps(robots: string): string[] {
  return robots
    .split(/\r?\n/)
    .map((l) => /^sitemap:\s*(\S+)/i.exec(l.trim())?.[1])
    .filter((u): u is string => Boolean(u));
}

function decodeEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .trim();
}

function tagContent(block: string, tag: string): string | null {
  const m = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i").exec(block);
  return m ? decodeEntities(m[1]) : null;
}

/**
 * Parse a sitemap document: either a urlset (page URLs) or a sitemap index
 * (child sitemap URLs). Throws feed_invalid when it's neither.
 */
export function parseSitemapXml(xml: string): {
  kind: "urlset" | "index";
  items: DiscoveredPage[];
} {
  const isIndex = /<sitemapindex[\s>]/i.test(xml);
  const isUrlset = /<urlset[\s>]/i.test(xml);
  if (!isIndex && !isUrlset) throw INGEST_ERRORS.feedInvalid();

  const blockTag = isIndex ? "sitemap" : "url";
  const blocks = xml.match(new RegExp(`<${blockTag}[\\s>][\\s\\S]*?</${blockTag}>`, "gi")) ?? [];
  const items = blocks
    .map((b): DiscoveredPage | null => {
      const loc = tagContent(b, "loc");
      if (!loc) return null;
      return { url: loc, title: null, lastmod: tagContent(b, "lastmod") };
    })
    .filter((i): i is DiscoveredPage => Boolean(i))
    .slice(0, MAX_URLS);
  return { kind: isIndex ? "index" : "urlset", items };
}

/** Parse RSS 2.0 items or Atom entries into pages. */
export function parseRssXml(xml: string): DiscoveredPage[] {
  const isRss = /<rss[\s>]|<channel[\s>]/i.test(xml);
  const isAtom = /<feed[\s>]/i.test(xml);
  if (!isRss && !isAtom) throw INGEST_ERRORS.feedInvalid();

  const blockTag = isAtom ? "entry" : "item";
  const blocks = xml.match(new RegExp(`<${blockTag}[\\s>][\\s\\S]*?</${blockTag}>`, "gi")) ?? [];
  return blocks
    .map((b) => {
      const url = isAtom
        ? /<link[^>]*href="([^"]+)"/i.exec(b)?.[1] ?? null
        : tagContent(b, "link");
      if (!url) return null;
      return {
        url: decodeEntities(url),
        title: tagContent(b, "title"),
        lastmod: tagContent(b, isAtom ? "updated" : "pubDate"),
      };
    })
    .filter((i): i is DiscoveredPage => Boolean(i))
    .slice(0, MAX_URLS);
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const { body } = await safeFetch(url);
    return body.toString("utf8");
  } catch {
    return null;
  }
}

async function expandSitemap(
  url: string,
  depth: number,
  seen: Set<string>
): Promise<DiscoveredPage[]> {
  if (depth > MAX_INDEX_DEPTH || seen.has(url) || seen.size > MAX_CHILD_SITEMAPS) return [];
  seen.add(url);
  const xml = await fetchText(url);
  if (!xml) return [];
  let parsed: ReturnType<typeof parseSitemapXml>;
  try {
    parsed = parseSitemapXml(xml);
  } catch {
    return [];
  }
  if (parsed.kind === "urlset") return parsed.items;
  const out: DiscoveredPage[] = [];
  for (const child of parsed.items) {
    out.push(...(await expandSitemap(child.url, depth + 1, seen)));
    if (out.length >= MAX_URLS) break;
  }
  return out.slice(0, MAX_URLS);
}

/** Discover importable pages for a site: sitemap first, feed fallback. */
export async function discoverSite(rawUrl: string): Promise<DiscoveredPage[]> {
  let origin: string;
  try {
    origin = new URL(rawUrl).origin;
  } catch {
    throw INGEST_ERRORS.invalidUrl();
  }

  const candidates: string[] = [];
  const robots = await fetchText(`${origin}/robots.txt`);
  if (robots) candidates.push(...parseRobotsSitemaps(robots));
  candidates.push(`${origin}/sitemap.xml`, `${origin}/sitemap_index.xml`);

  const seen = new Set<string>();
  for (const sm of candidates) {
    const pages = await expandSitemap(sm, 0, seen);
    if (pages.length) return pages;
  }

  // Feed fallback (also covers the "they pasted the feed URL" case).
  for (const feedUrl of [rawUrl, `${origin}/feed`, `${origin}/rss.xml`, `${origin}/atom.xml`, `${origin}/feed.xml`]) {
    const xml = await fetchText(feedUrl);
    if (!xml) continue;
    try {
      const items = parseRssXml(xml);
      if (items.length) return items;
    } catch {
      continue;
    }
  }

  throw INGEST_ERRORS.sitemapNotFound();
}

/** List a YouTube channel's videos (no transcripts fetched here). */
export async function discoverChannel(rawUrl: string): Promise<DiscoveredVideo[]> {
  const { Innertube } = await import("youtubei.js");
  const yt = await Innertube.create({ retrieve_player: false });

  let channelId: string | null = null;
  try {
    const idMatch = /youtube\.com\/channel\/(UC[\w-]{22})/i.exec(rawUrl);
    if (idMatch) {
      channelId = idMatch[1];
    } else {
      const handleMatch = /youtube\.com\/(@[\w.-]+)/i.exec(rawUrl) ?? /^(@[\w.-]+)$/.exec(rawUrl.trim());
      const query = handleMatch ? handleMatch[1] : rawUrl;
      const results = await yt.search(query, { type: "channel" });
      const first = results.channels?.[0] as { id?: string } | undefined;
      channelId = first?.id ?? null;
    }
  } catch {
    channelId = null;
  }
  if (!channelId) throw INGEST_ERRORS.channelNotFound();

  try {
    const channel = await yt.getChannel(channelId);
    const videosTab = await channel.getVideos();
    const videos = (videosTab.videos ?? []) as Array<{
      video_id?: string;
      id?: string;
      title?: { text?: string } | string;
      duration?: { text?: string };
      published?: { text?: string };
    }>;
    const out: DiscoveredVideo[] = videos
      .map((v) => {
        const videoId = v.video_id ?? v.id ?? "";
        const title = typeof v.title === "string" ? v.title : v.title?.text ?? "";
        if (!/^[A-Za-z0-9_-]{11}$/.test(videoId) || !title) return null;
        return {
          videoId,
          title,
          duration: v.duration?.text ?? null,
          published: v.published?.text ?? null,
        };
      })
      .filter((v): v is DiscoveredVideo => Boolean(v))
      .slice(0, 200);
    if (!out.length) throw INGEST_ERRORS.channelNoVideos();
    return out;
  } catch (e) {
    if ((e as { code?: string }).code === "channel_no_videos") throw e;
    throw INGEST_ERRORS.channelNotFound();
  }
}
