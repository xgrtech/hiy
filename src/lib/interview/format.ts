/**
 * Pure formatting for interview sessions: Q&A pairs → source transcript,
 * and boundary extraction for guardrail merging. No DB/LLM imports.
 */
import { SEED_QUESTIONS } from "./questions";

export interface QA {
  q: string;
  a: string;
}

/** Answered pairs → the raw_text stored on the interview source. */
export function qaToTranscript(qa: QA[]): string {
  return qa
    .filter((p) => p.a.trim().length > 0)
    .map((p) => `Q: ${p.q.trim()}\nA: ${p.a.trim()}`)
    .join("\n\n");
}

const BOUNDARY_QUESTIONS = new Set(
  SEED_QUESTIONS.filter((q) => q.group === "boundaries").map((q) => q.text)
);

/** Answers to boundary-group questions (merged into guardrail_topics). */
export function qaBoundaries(qa: QA[]): string[] {
  return qa
    .filter((p) => BOUNDARY_QUESTIONS.has(p.q.trim()) && p.a.trim().length > 0)
    .map((p) => p.a.trim());
}

/** How many pairs actually carry an answer. */
export function answeredCount(qa: QA[]): number {
  return qa.filter((p) => p.a.trim().length > 0).length;
}
