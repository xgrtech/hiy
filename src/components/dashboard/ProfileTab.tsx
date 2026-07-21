"use client";
/** Profile tab: avatar, name, role line, bio, social links. */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { patchProfile, type TwinRecord, type TwinLink } from "./types";

export default function ProfileTab({ twin }: { twin: TwinRecord }) {
  const router = useRouter();
  const [name, setName] = useState(twin.name);
  const [roleLine, setRoleLine] = useState(twin.role_line ?? "");
  const [bio, setBio] = useState(twin.bio ?? "");
  const [links, setLinks] = useState<TwinLink[]>(twin.links ?? []);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  async function save() {
    setBusy(true);
    setStatus("");
    try {
      await patchProfile(twin.id, {
        name: name.trim() || twin.name,
        role_line: roleLine.trim() || null,
        bio: bio.trim() || null,
        links: links.filter((l) => l.label.trim() && l.url.trim()),
      });
      setStatus("Saved.");
      router.refresh();
    } catch (e) {
      setStatus((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function uploadAvatar(file: File) {
    setBusy(true);
    setStatus("");
    try {
      const fd = new FormData();
      fd.set("twinId", twin.id);
      fd.set("file", file);
      const res = await fetch("/api/twin/avatar", { method: "POST", body: fd });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Upload failed.");
      setStatus("Avatar updated.");
      router.refresh();
    } catch (e) {
      setStatus((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    "w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-sm outline-none focus:border-accent";

  return (
    <section className="rounded-3xl border border-line bg-surface p-6">
      <h2 className="font-display text-lg font-medium">Public profile</h2>
      <p className="mt-1 text-sm text-inksoft">
        What visitors see at hiy.ai/{twin.slug}.
      </p>

      <div className="mt-5 flex items-center gap-4">
        {twin.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={twin.avatar_url}
            alt=""
            className="h-16 w-16 rounded-full border border-line object-cover"
          />
        ) : (
          <div className="orb h-16 w-16" />
        )}
        <label className="cursor-pointer rounded-full border border-line px-4 py-2 text-sm hover:border-accent">
          {twin.avatar_url ? "Replace photo" : "Add a photo"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadAvatar(f);
            }}
          />
        </label>
        <span className="text-xs text-inkfaint">JPEG/PNG/WebP, max 2MB</span>
      </div>

      <div className="mt-5 grid gap-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className={inputCls} />
        <input
          value={roleLine}
          onChange={(e) => setRoleLine(e.target.value)}
          placeholder="Role line — e.g. Product designer & educator"
          className={inputCls}
        />
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          maxLength={600}
          placeholder="Short bio shown under your name (a couple of sentences)."
          className={`${inputCls} resize-none`}
        />
      </div>

      <h3 className="mt-6 text-sm font-semibold">Links</h3>
      <p className="mt-0.5 text-xs text-inkfaint">Up to 6 — site, YouTube, socials…</p>
      <div className="mt-2 grid gap-2">
        {links.map((l, i) => (
          <div key={i} className="flex gap-2">
            <input
              value={l.label}
              onChange={(e) =>
                setLinks(links.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))
              }
              placeholder="Label"
              className={`${inputCls} max-w-36`}
            />
            <input
              value={l.url}
              onChange={(e) =>
                setLinks(links.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))
              }
              placeholder="https://…"
              className={inputCls}
            />
            <button
              onClick={() => setLinks(links.filter((_, j) => j !== i))}
              className="shrink-0 text-inkfaint hover:text-accent2"
              aria-label="Remove link"
            >
              ✕
            </button>
          </div>
        ))}
        {links.length < 6 && (
          <button
            onClick={() => setLinks([...links, { label: "", url: "" }])}
            className="w-fit rounded-full border border-dashed border-line px-4 py-1.5 text-xs text-inksoft hover:border-accent"
          >
            + Add link
          </button>
        )}
      </div>

      {status && (
        <p className={`mt-3 text-sm ${status === "Saved." || status === "Avatar updated." ? "text-accent" : "text-accent2"}`}>
          {status}
        </p>
      )}
      <button
        onClick={save}
        disabled={busy}
        className="mt-4 rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-40"
      >
        {busy ? "Saving…" : "Save profile"}
      </button>
    </section>
  );
}
