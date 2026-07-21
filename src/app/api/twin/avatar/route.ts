/**
 * Avatar upload for YOUR twin. Multipart {twinId, file}; server enforces
 * the 2MB cap and sniffs magic bytes (jpeg/png/webp) — extension is not
 * trusted. Stored in the public-read `avatars` bucket via service role.
 */
import { NextRequest } from "next/server";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase/server";
import { rateLimit, clientIp } from "@/lib/ratelimit";

const MAX_BYTES = 2 * 1024 * 1024;

function sniffImage(buf: Buffer): { ext: string; mime: string } | null {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { ext: "jpg", mime: "image/jpeg" };
  }
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { ext: "png", mime: "image/png" };
  }
  if (
    buf.length > 12 &&
    buf.subarray(0, 4).toString("ascii") === "RIFF" &&
    buf.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return { ext: "webp", mime: "image/webp" };
  }
  return null;
}

export async function POST(req: NextRequest) {
  if (!rateLimit(`avatar:${clientIp(req)}`, 6, 60_000)) {
    return Response.json({ error: "Too many requests." }, { status: 429 });
  }

  const sb = await supabaseServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return Response.json({ error: "Sign in first." }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const twinId = String(form?.get("twinId") ?? "");
  const file = form?.get("file");
  if (!form || !(file instanceof File) || !/^[0-9a-f-]{36}$/.test(twinId)) {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "Avatar must be under 2MB." }, { status: 422 });
  }

  const db = supabaseAdmin();
  const { data: twin } = await db
    .from("twins")
    .select("id, owner_id")
    .eq("id", twinId)
    .single();
  if (!twin || twin.owner_id !== auth.user.id) {
    return Response.json({ error: "Twin not found." }, { status: 404 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const kind = sniffImage(buf);
  if (!kind) {
    return Response.json(
      { error: "That doesn't look like a JPEG, PNG, or WebP image." },
      { status: 422 }
    );
  }

  const path = `${twinId}.${kind.ext}`;
  const { error: upErr } = await db.storage
    .from("avatars")
    .upload(path, buf, { contentType: kind.mime, upsert: true });
  if (upErr) {
    console.error("avatar upload error", upErr);
    return Response.json({ error: "Upload failed. Try again." }, { status: 500 });
  }

  const { data: pub } = db.storage.from("avatars").getPublicUrl(path);
  // Cache-bust so a replaced avatar shows immediately.
  const avatar_url = `${pub.publicUrl}?v=${Date.now()}`;
  await db.from("twins").update({ avatar_url }).eq("id", twinId);

  return Response.json({ avatar_url });
}
