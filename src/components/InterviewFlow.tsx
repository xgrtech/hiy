"use client";
/**
 * Chat-style personality interview: your twin-in-training asks, you answer.
 * One question at a time, skippable; progress survives reloads via
 * localStorage (same browser). Completing submits to /api/interview.
 */
import { useEffect, useState } from "react";
import { SEED_QUESTIONS } from "@/lib/interview/questions";

interface QA {
  q: string;
  a: string;
}

export default function InterviewFlow({
  twinId,
  twinName,
  onDone,
}: {
  twinId: string;
  twinName: string;
  onDone: () => void;
}) {
  const storageKey = `hiy-interview-${twinId}`;
  const [questions, setQuestions] = useState<string[]>(
    SEED_QUESTIONS.map((q) => q.text)
  );
  const [hints] = useState<Record<string, string>>(
    Object.fromEntries(SEED_QUESTIONS.filter((q) => q.hint).map((q) => [q.text, q.hint!]))
  );
  const [idx, setIdx] = useState(0);
  const [qa, setQa] = useState<QA[]>([]);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [gapsLoaded, setGapsLoaded] = useState(false);

  // Restore progress + fetch adaptive gap questions once.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? "null");
      if (saved?.qa?.length) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- restore saved progress on mount
        setQa(saved.qa);
        setIdx(saved.idx ?? saved.qa.length);
      }
    } catch {}
    fetch(`/api/interview/gaps?twinId=${twinId}`)
      .then((r) => (r.ok ? r.json() : { questions: [] }))
      .then((j: { questions: string[] }) => {
        if (j.questions?.length) {
          setQuestions((qs) => [
            ...qs,
            ...j.questions.filter((g) => !qs.includes(g)),
          ]);
        }
      })
      .catch(() => {})
      .finally(() => setGapsLoaded(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [twinId]);

  function saveProgress(nextQa: QA[], nextIdx: number) {
    setQa(nextQa);
    setIdx(nextIdx);
    try {
      localStorage.setItem(storageKey, JSON.stringify({ qa: nextQa, idx: nextIdx }));
    } catch {}
  }

  function record(a: string) {
    const next = [...qa, { q: questions[idx], a }];
    saveProgress(next, idx + 1);
    setAnswer("");
  }

  async function submit() {
    setBusy(true);
    setStatus("");
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ twinId, qa }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Something went wrong.");
      try {
        localStorage.removeItem(storageKey);
      } catch {}
      setStatus("done");
      onDone();
    } catch (e) {
      setStatus((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const answered = qa.filter((p) => p.a.trim()).length;
  const finished = idx >= questions.length;

  if (status === "done") {
    return (
      <div className="rounded-3xl border border-line bg-surface p-8 text-center">
        <p className="font-display text-xl">Interview absorbed ✨</p>
        <p className="mt-2 text-sm text-inksoft">
          Your twin now speaks more like you. Re-run the interview any time —
          each session teaches it more.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-line bg-surface p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold">Refine your twin</h2>
        <span className="text-xs text-inkfaint">
          {Math.min(idx, questions.length)}/{questions.length} · {answered} answered
        </span>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-surface2">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${(Math.min(idx, questions.length) / questions.length) * 100}%` }}
        />
      </div>

      {!finished ? (
        <div className="mt-5">
          <div className="flex items-start gap-3">
            <div className="orb h-9 w-9 shrink-0" />
            <div className="rounded-2xl rounded-bl-md bg-surface2 px-4 py-3 text-sm leading-relaxed">
              {questions[idx]}
              {hints[questions[idx]] && (
                <span className="mt-1 block text-xs text-inkfaint">
                  {hints[questions[idx]]}
                </span>
              )}
            </div>
          </div>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={4}
            placeholder="Answer in your own voice — the wording matters as much as the facts."
            className="mt-4 w-full resize-none rounded-xl border border-line bg-paper px-4 py-2.5 text-sm outline-none focus:border-accent"
          />
          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={() => record(answer)}
              disabled={!answer.trim()}
              className="btn-warm px-5 py-2 text-sm disabled:opacity-50"
            >
              Next
            </button>
            <button
              onClick={() => record("")}
              className="text-sm text-inkfaint underline hover:text-inksoft"
            >
              Skip
            </button>
            {!gapsLoaded && (
              <span className="text-xs text-inkfaint">
                Looking for gaps in {twinName}&apos;s knowledge…
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-5 text-center">
          <p className="text-sm text-inksoft">
            That&apos;s every question. {answered} answered — ready to teach your twin?
          </p>
          {status && status !== "done" && (
            <p className="mt-2 text-sm text-accent2">{status}</p>
          )}
          <button
            onClick={submit}
            disabled={busy || answered < 3}
            className="btn-warm mt-4 px-6 py-2.5 text-sm disabled:opacity-50"
          >
            {busy ? "Teaching your twin…" : "Finish interview"}
          </button>
          {answered < 3 && (
            <p className="mt-2 text-xs text-inkfaint">
              Answer at least 3 questions first (
              <button
                onClick={() => saveProgress([], 0)}
                className="underline"
              >
                start over
              </button>
              ).
            </p>
          )}
        </div>
      )}
    </div>
  );
}
