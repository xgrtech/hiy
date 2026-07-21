"use client";
/**
 * Streaming chat UI used by the public twin page and the embed frame.
 * Understands greetings, ?q= auto-ask, cited-source panels, and gives
 * honest "I don't know" replies a deliberate visual treatment.
 */
import { useEffect, useRef, useState } from "react";

interface Msg {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
}

const DONT_KNOW_RE = /don'?t have that in my knowledge|I don'?t know/i;

export default function TwinChat({
  slug,
  name,
  suggested,
  greeting,
  initialQuestion,
  avatarUrl,
  compact = false,
}: {
  slug: string;
  name: string;
  suggested: string[];
  greeting?: string | null;
  initialQuestion?: string;
  avatarUrl?: string | null;
  compact?: boolean;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const sessionRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoAsked = useRef(false);

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

  // ?q= deep link: auto-ask exactly once so shared links land on an answer.
  useEffect(() => {
    if (initialQuestion && !autoAsked.current) {
      autoAsked.current = true;
      send(initialQuestion);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuestion]);

  const showGreeting = messages.length === 0 && Boolean(greeting);

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
          {showGreeting && (
            <div className="bubble-in flex items-end gap-2">
              <Avatar avatarUrl={avatarUrl} />
              <div className="max-w-[88%] whitespace-pre-wrap rounded-2xl rounded-bl-md bg-surface2 px-4 py-2.5 text-sm leading-relaxed">
                {greeting}
              </div>
            </div>
          )}
          {messages.length === 0 && !showGreeting && (
            <p className="py-6 text-center text-sm text-inkfaint">
              Ask {name}&apos;s twin anything.
            </p>
          )}
          {messages.map((m, i) => {
            const honest =
              m.role === "assistant" && m.content && DONT_KNOW_RE.test(m.content);
            return (
              <div key={i} className="bubble-in">
                <div className={m.role === "assistant" ? "flex items-end gap-2" : ""}>
                  {m.role === "assistant" && <Avatar avatarUrl={avatarUrl} />}
                  <div
                    className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      m.role === "user"
                        ? "ml-auto rounded-br-md bg-accent text-white"
                        : honest
                          ? "rounded-bl-md border border-dashed border-line bg-paper"
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
                </div>
                {honest && (
                  <p className="ml-9 mt-1 text-[11px] text-inkfaint">
                    Honest answer — {name} hasn&apos;t taught their twin this yet.
                  </p>
                )}
                {m.role === "assistant" &&
                  m.sources &&
                  m.sources.length > 0 &&
                  m.content &&
                  !honest && (
                    <details className="ml-9 mt-1">
                      <summary className="cursor-pointer list-none text-[11px] text-inkfaint hover:text-inksoft">
                        Sources ({m.sources.length}) ▸
                      </summary>
                      <ol className="mt-1 space-y-0.5">
                        {m.sources.map((s, j) => (
                          <li key={s} className="text-[11px] text-inksoft">
                            <span className="font-medium text-accent">[{j + 1}]</span> {s}
                          </li>
                        ))}
                      </ol>
                    </details>
                  )}
              </div>
            );
          })}
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

function Avatar({ avatarUrl }: { avatarUrl?: string | null }) {
  return avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={avatarUrl}
      alt=""
      className="h-7 w-7 shrink-0 rounded-full border border-line object-cover"
    />
  ) : (
    <div className="orb h-7 w-7 shrink-0" />
  );
}
