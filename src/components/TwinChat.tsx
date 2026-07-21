"use client";
/** Streaming chat UI used by the public twin page and the embed frame. */
import { useRef, useState } from "react";

interface Msg {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
}

export default function TwinChat({
  slug,
  name,
  suggested,
  compact = false,
}: {
  slug: string;
  name: string;
  suggested: string[];
  compact?: boolean;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const sessionRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    setError("");
    setInput("");
    setBusy(true);
    const history = messages.map(({ role, content }) => ({ role, content }));
    setMessages((m) => [...m, { role: "user", content: q }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slug,
          message: q,
          history,
          sessionId: sessionRef.current ?? undefined,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Something went wrong.");
      }
      sessionRef.current = res.headers.get("x-session-id") || sessionRef.current;
      let sources: string[] = [];
      try {
        sources = JSON.parse(
          decodeURIComponent(res.headers.get("x-cited-sources") ?? "[]")
        );
      } catch {}

      setMessages((m) => [...m, { role: "assistant", content: "", sources }]);
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const delta = decoder.decode(value, { stream: true });
        setMessages((m) => {
          const copy = [...m];
          const last = copy[copy.length - 1];
          copy[copy.length - 1] = { ...last, content: last.content + delta };
          return copy;
        });
        scrollRef.current?.scrollTo(0, 1e9);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      scrollRef.current?.scrollTo(0, 1e9);
    }
  }

  return (
    <div>
      {messages.length === 0 && suggested.length > 0 && (
        <div className={`mb-4 flex flex-wrap gap-2 ${compact ? "" : "justify-center"}`}>
          {suggested.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="rounded-full border border-line bg-surface px-4 py-2 text-[13px] shadow-sm transition hover:border-accent"
            >
              {s}
            </button>
          ))}
        </div>
      )}
      <div
        className={`rounded-3xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(28,27,24,.04),0_10px_34px_rgba(28,27,24,.07)]`}
      >
        <div
          ref={scrollRef}
          className={`flex flex-col gap-2.5 overflow-y-auto ${compact ? "max-h-72" : "max-h-96"}`}
        >
          {messages.length === 0 && (
            <p className="py-6 text-center text-sm text-inkfaint">
              Ask {name}&apos;s twin anything.
            </p>
          )}
          {messages.map((m, i) => (
            <div key={i} className="bubble-in">
              <div
                className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "ml-auto rounded-br-md bg-accent text-white"
                    : "rounded-bl-md bg-surface2"
                }`}
              >
                {m.content ||
                  (busy && i === messages.length - 1 ? (
                    <span className="flex gap-1.5 py-1">
                      <span className="think-dot h-2 w-2 rounded-full bg-inkfaint" />
                      <span className="think-dot h-2 w-2 rounded-full bg-inkfaint" />
                      <span className="think-dot h-2 w-2 rounded-full bg-inkfaint" />
                    </span>
                  ) : (
                    ""
                  ))}
              </div>
              {m.role === "assistant" && m.sources && m.sources.length > 0 && m.content && (
                <p className="ml-1 mt-1 text-[11px] text-inkfaint">
                  Grounded in{" "}
                  {m.sources.map((s, j) => (
                    <span key={s}>
                      <b className="font-medium text-accent">{s}</b>
                      {j < m.sources!.length - 1 ? " · " : ""}
                    </span>
                  ))}
                </p>
              )}
            </div>
          ))}
        </div>
        {error && <p className="mt-2 text-xs text-accent2">{error}</p>}
        <div className="mt-3 flex items-center gap-2 rounded-full border border-line py-1.5 pl-4 pr-1.5">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send(input)}
            placeholder={`Ask ${name}'s twin anything…`}
            className="flex-1 bg-transparent text-sm outline-none"
          />
          <button
            onClick={() => send(input)}
            disabled={busy}
            className="h-9 w-9 rounded-full bg-ink text-paper transition hover:scale-110 hover:bg-accent disabled:opacity-40"
            aria-label="Send"
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}
