/** Authed ingestion: add a source to YOUR twin, then reindex. */
import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { ingest, ingestFile, IngestError } from "@/lib/ingest";
import { reindexTwin } from "@/lib/rag/engine";
import { capsForTwin, checkContentCaps } from "@/lib/caps";
import { rateLimit, clientIp } from "@/lib/ratelimit";

export const maxDuration = 120;

const JsonBody = z.object({
  twinId: z.string().uuid(),
  sourceType: z.enum(["manual", "linkedin", "blog", "youtube", "correction"]),
  payload: z.string().min(1).max(2_100_000),
  title: z.string().max(200).optional(),
  videoRef: z.string().max(500).optional(),
  /** Batch imports: skip the per-source reindex; caller reindexes once at the end. */
  skipReindex: z.boolean().optional(),
});

function errResponse(e: unknown) {
  if (e instanceof IngestError) {
    return Response.json(
      { error: e.userMessage, code: e.code, retryable: e.retryable },
      { status: 422 }
    );
  }
  console.error("ingest error", e);
  return Response.json({ error: "Something went wrong ingesting that source." }, { status: 500 });
}

export async function POST(req: NextRequest) {
  if (!rateLimit(`ingest:${clientIp(req)}`, 10, 60_000)) {
    return Response.json({ error: "Too many requests." }, { status: 429 });
  }

  const sb = await supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return Response.json({ error: "Sign in first." }, { status: 401 });

  const contentType = req.headers.get("content-type") ?? "";
  const db = supabaseAdmin();

  try {
    let twinId: string;
    let ingested;
    let skipReindex = false;
    let pendingFile: File | null = null;
    let jsonReq: z.infer<typeof JsonBody> | null = null;

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      twinId = String(form.get("twinId") ?? "");
      const file = form.get("file");
      if (!(file instanceof File)) {
        return Response.json({ error: "No file provided." }, { status: 400 });
      }
      pendingFile = file;
    } else {
      const parsed = JsonBody.safeParse(await req.json().catch(() => null));
      if (!parsed.success) {
        return Response.json({ error: "Invalid request." }, { status: 400 });
      }
      twinId = parsed.data.twinId;
      skipReindex = parsed.data.skipReindex ?? false;
      jsonReq = parsed.data;
    }

    // ownership check BEFORE any expensive parsing/fetching
    const { data: twin } = await db
      .from("twins")
      .select("id, owner_id")
      .eq("id", twinId)
      .single();
    if (!twin || twin.owner_id !== auth.user.id) {
      return Response.json({ error: "Twin not found." }, { status: 404 });
    }

    if (pendingFile) {
      ingested = await ingestFile(
        pendingFile.name,
        Buffer.from(await pendingFile.arrayBuffer())
      );
    } else {
      ingested = await ingest(jsonReq!);
    }

    const caps = await capsForTwin(twinId);
    const capCheck = await checkContentCaps(twinId, ingested.wordCount, caps, ingested.type);
    if (capCheck !== "ok") {
      return Response.json(
        {
          error:
            capCheck === "words"
              ? "This would exceed your plan's training-content limit."
              : "You've reached your plan's source limit.",
          code: "cap_exceeded",
        },
        { status: 422 }
      );
    }

    const { data: source, error } = await db
      .from("sources")
      .insert({
        twin_id: twinId,
        type: ingested.type,
        title: ingested.title,
        url: ingested.url,
        raw_text: ingested.text,
        word_count: ingested.wordCount,
        meta: ingested.meta,
      })
      .select("id,title,type,word_count")
      .single();
    if (error) throw error;

    if (skipReindex) {
      // Batch import: caller hits /api/twin/reindex once after the last item.
      return Response.json({ source, numChunks: 0 });
    }

    // Content add no longer auto-publishes — the twin stays in whatever
    // publish state it's in until the creator explicitly publishes.
    const numChunks = await reindexTwin(twinId);

    return Response.json({ source, numChunks });
  } catch (e) {
    return errResponse(e);
  }
}
