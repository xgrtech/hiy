"use client";
/**
 * Chat per "Hiy Mockups" §4a/4c: a big ask-input with suggested chips below;
 * the conversation grows above once it starts. Citations ride each answer;
 * honest "I don't know" replies get the dashed treatment.
 */
import { useEffect, useRef, useState } from "react";
import { ArrowUp, Quote } from "lucide-react";
import Thinking from "./Thinking";

interface Citation {
  title: string;
  snippet: string;
}
interface Msg {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
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
  frameless = false,
}: {
  slug: string;
  name: string;
  suggested: string[];
  greeting?: string | null;
  initialQuestion?: string;
  avatarUrl?: string | null;
  compact?: boolean;
  frameless?: boolean;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // Which citation passage is expanded, keyed by "msgIndex:citeIndex".
  const [openCite, setOpenCite] = useState<string | null>(null);
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
      let citations: Citation[] = [];
      try {
        citations = JSON.parse(
          decodeURIComponent(res.headers.get("x-citations") ?? "[]")
        );
      } catch {}

      setMessages((m) => [...m, { role: "assistant", content: "", citations }]);
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

  const started = messages.length > 0;
  const showGreeting = !started && Boolean(greeting);

  return (
    <div className={frameless ? "" : "rounded-3xl border border-line bg-surface p-5"}>
      {(started || showGreeting) && (
        <div
          ref={scrollRef}
          className={`mb-4 flex flex-col gap-3 overflow-y-auto rounded-2xl border border-line bg-surface p-4 text-left ${
            compact ? "max-h-72" : "max-h-[26rem]"
          }`}
        >
          {showGreeting && (
            <div className="flex items-end gap-2">
              <Avatar avatarUrl={avatarUrl} name={name} />
              <div className="max-w-[88%] whitespace-pre-wrap rounded-2xl rounded-bl-md bg-paper px-4 py-2.5 text-sm leading-relaxed">
                {greeting}
              </div>
            </div>
          )}
          {messages.map((m, i) => {
            const honest =
              m.role === "assistant" && m.content && DONT_KNOW_RE.test(m.content);
            return (
              <div key={i} className="bubble-in">
                <div className={m.role === "assistant" ? "flex items-end gap-2" : ""}>
                  {m.role === "assistant" && <Avatar avatarUrl={avatarUrl} name={name} />}
                  <div
                    className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      m.role === "user"
                        ? "ml-auto rounded-br-md bg-dark text-white"
                        : honest
                          ? "rounded-bl-md border border-dashed border-line bg-paper"
                          : "rounded-bl-md bg-paper"
                    }`}
                  >
                    {m.content ||
                      (busy && i === messages.length - 1 ? (
                        <span className="flex items-center gap-2 py-0.5 text-xs text-inkfaint">
                          <Thinking state="composing" size={20} label="thinking" />
                          thinking…
                        </span>
                      ) : (
                        ""
                      ))}
                  </div>
                </div>
                {honest ? (
                  <p className="ml-9 mt-1 text-[11px] text-inkfaint">
                    Honest answer — {name} hasn&apos;t taught their hiy this yet.
                  </p>
                ) : (
                  m.role === "assistant" &&
                  m.citations &&
                  m.citations.length > 0 &&
                  m.content && (
                    <div className="ml-9 mt-1.5">
                      <p className="flex flex-wrap gap-1.5">
                        {m.citations.map((c, ci) => {
                          const key = `${i}:${ci}`;
                          const open = openCite === key;
                          return (
                            <button
                              key={key}
                              onClick={() => setOpenCite(open ? null : key)}
                              aria-expanded={open}
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium transition ${
                                open
                                  ? "bg-accentsoft text-accentdeep"
                                  : "bg-paper text-inksoft hover:bg-accentsoft hover:text-accentdeep"
                              }`}
                            >
                              <Quote className="h-2.5 w-2.5" /> From: {c.title}
                            </button>
                          );
                        })}
                      </p>
                      {m.citations.map((c, ci) => {
                        const key = `${i}:${ci}`;
                        if (openCite !== key) return null;
                        return (
                          <figure
                            key={`p-${key}`}
                            className="mt-1.5 rounded-xl border border-line bg-paper px-3.5 py-2.5"
                          >
                            <blockquote className="text-xs leading-relaxed text-inksoft">
                              &ldquo;{c.snippet}&rdquo;
                            </blockquote>
                            <figcaption className="mt-1 text-[10px] font-medium text-inkfaint">
                              — {c.title}
                            </figcaption>
                          </figure>
                        );
                      })}
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}

      {error && <p className="mb-2 text-xs text-accent">{error}</p>}

      <div className="flex items-center gap-2 rounded-full border border-line bg-surface py-1.5 pl-5 pr-1.5 shadow-[0_2px_10px_rgba(10,37,64,.06)]">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send(input)}
          placeholder={started ? `Message ${name}'s hiy…` : `Ask ${name.split(" ")[0]} anything…`}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-inkfaint"
        />
        <button
          onClick={() => send(input)}
          disabled={busy}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-white transition hover:bg-accentdeep disabled:opacity-40"
          aria-label="Send"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      </div>

      {!started && suggested.length > 0 && (
        <div className={`mt-3 flex flex-wrap gap-2 ${compact ? "" : "justify-center"}`}>
          {suggested.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="rounded-full border border-line bg-surface px-4 py-2 text-[12.5px] text-inksoft transition hover:border-accent hover:text-accent"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Avatar({ avatarUrl, name }: { avatarUrl?: string | null; name: string }) {
  return avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={avatarUrl}
      alt=""
      className="h-7 w-7 shrink-0 rounded-full border border-line object-cover"
    />
  ) : (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
      {name.slice(0, 1)}
    </span>
  );
}
