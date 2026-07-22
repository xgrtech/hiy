"use client";
/** Behavior tab: greeting, suggested questions, guardrail topics, accent. */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { patchProfile, type TwinRecord } from "./types";

function ListEditor({
  items,
  setItems,
  max,
  placeholder,
  addLabel,
}: {
  items: string[];
  setItems: (v: string[]) => void;
  max: number;
  placeholder: string;
  addLabel: string;
}) {
  const inputCls =
    "w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-sm outline-none focus:border-accent";
  return (
    <div className="mt-2 grid gap-2">
      {items.map((s, i) => (
        <div key={i} className="flex gap-2">
          <input
            value={s}
            onChange={(e) => setItems(items.map((x, j) => (j === i ? e.target.value : x)))}
            placeholder={placeholder}
            className={inputCls}
          />
          <button
            onClick={() => setItems(items.filter((_, j) => j !== i))}
            className="shrink-0 text-inkfaint hover:text-accent2"
            aria-label="Remove"
          >
            ✕
          </button>
        </div>
      ))}
      {items.length < max && (
        <button
          onClick={() => setItems([...items, ""])}
          className="w-fit rounded-full border border-dashed border-line px-4 py-1.5 text-xs text-inksoft hover:border-accent"
        >
          {addLabel}
        </button>
      )}
    </div>
  );
}

export default function BehaviorTab({ twin }: { twin: TwinRecord }) {
  const router = useRouter();
  const [greeting, setGreeting] = useState(twin.greeting ?? "");
  const [questions, setQuestions] = useState<string[]>(twin.suggested_questions ?? []);
  const [guardrails, setGuardrails] = useState<string[]>(twin.guardrail_topics ?? []);
  const [accent, setAccent] = useState(twin.appearance?.accent ?? "#1f5648");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  async function save() {
    setBusy(true);
    setStatus("");
    try {
      await patchProfile(twin.id, {
        greeting: greeting.trim() || null,
        suggested_questions: questions.map((q) => q.trim()).filter(Boolean),
        guardrail_topics: guardrails.map((g) => g.trim()).filter(Boolean),
        appearance: { ...(twin.appearance ?? {}), accent },
      });
      setStatus("Saved.");
      router.refresh();
    } catch (e) {
      setStatus((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-3xl border border-line bg-surface p-6">
      <h2 className="font-display text-lg font-medium">Behavior</h2>

      <h3 className="mt-5 text-sm font-semibold">Greeting</h3>
      <p className="mt-0.5 text-xs text-inkfaint">
        The first thing visitors see from your twin (optional).
      </p>
      <textarea
        value={greeting}
        onChange={(e) => setGreeting(e.target.value)}
        rows={2}
        maxLength={300}
        placeholder={`Hey, I'm ${twin.name}'s twin — ask me anything about my work.`}
        className="mt-2 w-full resize-none rounded-xl border border-line bg-paper px-4 py-2.5 text-sm outline-none focus:border-accent"
      />

      <h3 className="mt-6 text-sm font-semibold">Suggested questions</h3>
      <p className="mt-0.5 text-xs text-inkfaint">
        Shown as chips before the first message (up to 6).
      </p>
      <ListEditor
        items={questions}
        setItems={setQuestions}
        max={6}
        placeholder="e.g. What's your take on…?"
        addLabel="+ Add question"
      />

      <h3 className="mt-6 text-sm font-semibold">Off-limits topics</h3>
      <p className="mt-0.5 text-xs text-inkfaint">
        Your twin refuses or deflects these (up to 10). Interview answers add here too.
      </p>
      <ListEditor
        items={guardrails}
        setItems={setGuardrails}
        max={10}
        placeholder="e.g. my family, client names"
        addLabel="+ Add topic"
      />

      <h3 className="mt-6 text-sm font-semibold">Accent color</h3>
      <div className="mt-2 flex items-center gap-3">
        <input
          type="color"
          value={accent}
          onChange={(e) => setAccent(e.target.value)}
          className="h-9 w-14 cursor-pointer rounded-lg border border-line bg-paper"
          aria-label="Accent color"
        />
        <code className="text-xs text-inksoft">{accent}</code>
        <button
          onClick={() => setAccent("#1f5648")}
          className="text-xs text-inkfaint underline hover:text-inksoft"
        >
          Reset
        </button>
      </div>

      {status && (
        <p className={`mt-3 text-sm ${status === "Saved." ? "text-accent" : "text-accent2"}`}>
          {status}
        </p>
      )}
      <button
        onClick={save}
        disabled={busy}
        className="mt-4 btn-warm px-6 py-2.5 text-sm disabled:opacity-50"
      >
        {busy ? "Saving…" : "Save behavior"}
      </button>
    </section>
  );
}
