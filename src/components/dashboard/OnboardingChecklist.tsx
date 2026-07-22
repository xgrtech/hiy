"use client";
/** First-run activation: a clear "get your hiy live" checklist. Shown while
 *  a twin is still a draft, replacing the ad-hoc draft states. Publishing
 *  needs content; the voice interview is recommended (much better answers)
 *  but not required. */
import { Check, ArrowRight, Sparkles } from "lucide-react";
import PublishButton from "./PublishButton";

interface Step {
  key: string;
  title: string;
  desc: string;
  done: boolean;
  optional?: boolean;
  cta?: React.ReactNode;
}

export default function OnboardingChecklist({
  slug,
  hasContent,
  hasInterview,
  sourceCount,
  onAddContent,
  onTeachVoice,
}: {
  slug: string;
  hasContent: boolean;
  hasInterview: boolean;
  sourceCount: number;
  onAddContent: () => void;
  onTeachVoice: () => void;
}) {
  const steps: Step[] = [
    {
      key: "claim",
      title: "Claim your link",
      desc: `hiy.ai/${slug} is yours.`,
      done: true,
    },
    {
      key: "content",
      title: "Add your content",
      desc: hasContent
        ? `Learned from ${sourceCount} source${sourceCount === 1 ? "" : "s"}.`
        : "A blog post, a video, a résumé, or a few paragraphs in your voice.",
      done: hasContent,
      cta: !hasContent && (
        <button
          onClick={onAddContent}
          className="btn-warm press inline-flex items-center gap-1.5 px-4 py-2 text-xs"
        >
          Add content <ArrowRight className="h-3.5 w-3.5" />
        </button>
      ),
    },
    {
      key: "voice",
      title: "Teach your voice",
      desc: hasInterview
        ? "Your personality interview is in — answers sound like you."
        : "A 2-minute interview so it phrases things the way you would.",
      done: hasInterview,
      optional: true,
      cta: !hasInterview && (
        <button
          onClick={onTeachVoice}
          className="press inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-4 py-2 text-xs font-medium text-inksoft transition hover:border-ink hover:text-ink"
        >
          <Sparkles className="h-3.5 w-3.5 text-accent" /> Start the interview
        </button>
      ),
    },
    {
      key: "publish",
      title: "Publish",
      desc: hasContent
        ? "Make hiy.ai/" + slug + " public. You can unpublish anytime."
        : "Add content first, then publish when it sounds like you.",
      done: false,
      cta: hasContent && (
        <span className="inline-flex flex-wrap items-center gap-2">
          <a
            href={`/${slug}?preview=1`}
            target="_blank"
            rel="noreferrer"
            className="press rounded-full border border-line bg-surface px-4 py-2 text-xs font-medium text-inksoft transition hover:border-ink hover:text-ink"
          >
            Preview privately
          </a>
          <PublishButton publish className="btn-warm press px-4 py-2 text-xs">
            Publish
          </PublishButton>
        </span>
      ),
    },
  ];

  const actionable = steps.filter((s) => s.key !== "claim");
  const doneCount = actionable.filter((s) => s.done).length;

  return (
    <div className="beam dome mb-5 rounded-2xl border border-line p-6 sm:p-7">
      <div className="flex flex-wrap items-center gap-3">
        <span className="orb h-11 w-11 shrink-0" aria-hidden />
        <div className="min-w-0">
          <h2 className="font-display text-2xl leading-tight">Get your hiy live</h2>
          <p className="text-sm text-inksoft">
            {doneCount === actionable.length
              ? "You're ready — publish whenever you like."
              : "A couple of steps and your page goes public."}
          </p>
        </div>
        <span className="ml-auto rounded-full bg-surface/70 px-3 py-1 text-xs font-medium text-inksoft">
          {doneCount} of {actionable.length}
        </span>
      </div>

      <ol className="mt-5 space-y-3">
        {steps.map((s) => (
          <li key={s.key} className="flex items-start gap-3">
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                s.done
                  ? "bg-green text-white"
                  : "border border-line bg-surface text-inkfaint"
              }`}
            >
              {s.done ? <Check className="h-3 w-3" /> : "•"}
            </span>
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-semibold ${s.done ? "text-inksoft" : "text-ink"}`}>
                {s.title}
                {s.optional && !s.done && (
                  <span className="ml-2 rounded-full bg-surface/70 px-2 py-0.5 text-[10px] font-medium text-inkfaint">
                    recommended
                  </span>
                )}
              </p>
              <p className="text-xs text-inksoft">{s.desc}</p>
              {s.cta && <div className="mt-2">{s.cta}</div>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
