/**
 * Provider-agnostic LLM layer on the Vercel AI SDK.
 * Chat: Anthropic preferred when both keys exist, else OpenAI.
 * Models are tiered by task: chat is the volume path (Sonnet), wiki/persona
 * synthesis is rare but deep (Opus), previews and gap questions are frequent
 * and disposable (Haiku).
 * Embeddings: OpenAI text-embedding-3-small (1536-dim, matches pgvector).
 */
import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import {
  embedMany,
  embed,
  generateText,
  streamText,
  type ModelMessage,
  type SystemModelMessage,
} from "ai";

export type ChatProvider = "anthropic" | "openai" | "none";

/** chat: visitor messages · synthesis: wiki/persona rebuilds · light: previews + gap questions */
export type LlmTask = "chat" | "synthesis" | "light";

const MODELS: Record<Exclude<ChatProvider, "none">, Record<LlmTask, string>> = {
  anthropic: {
    chat: "claude-sonnet-5",
    synthesis: "claude-opus-4-8",
    light: "claude-haiku-4-5",
  },
  openai: {
    chat: "gpt-4o",
    synthesis: "gpt-4o",
    light: "gpt-4o-mini",
  },
};

export function activeChatProvider(): ChatProvider {
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  return "none";
}

export function embeddingsConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

function modelFor(task: LlmTask) {
  const p = activeChatProvider();
  if (p === "anthropic") return anthropic(MODELS.anthropic[task]);
  if (p === "openai") return openai(MODELS.openai[task]);
  throw new Error(
    "No LLM configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY."
  );
}

const embeddingModel = () => openai.textEmbeddingModel("text-embedding-3-small");

export async function completeText(opts: {
  system: string;
  prompt: string;
  task?: LlmTask;
  maxTokens?: number;
}): Promise<string> {
  const { text } = await generateText({
    model: modelFor(opts.task ?? "synthesis"),
    system: opts.system,
    prompt: opts.prompt,
    maxOutputTokens: opts.maxTokens ?? 2000,
  });
  return text;
}

export interface ChatSystem {
  /** Stable per twin (identity + rules + persona) — prompt-cached at Anthropic,
   *  so every follow-up turn and every concurrent visitor of the same twin
   *  reads it at 10% of the input price. */
  cached: string;
  /** Per-question retrieved context — changes every turn, never cached. */
  dynamic?: string;
}

export function streamChat(opts: {
  system: string | ChatSystem;
  messages: ModelMessage[];
  maxTokens?: number;
  onFinish?: (text: string) => Promise<void> | void;
}) {
  // Cache control rides on system messages passed via the `system` option —
  // the SDK rejects role:"system" entries inside `messages` at runtime.
  // OpenAI ignores the anthropic provider options on the fallback path.
  const system: SystemModelMessage[] =
    typeof opts.system === "string"
      ? [{ role: "system", content: opts.system }]
      : [
          {
            role: "system",
            content: opts.system.cached,
            providerOptions: {
              anthropic: { cacheControl: { type: "ephemeral" } },
            },
          },
          ...(opts.system.dynamic
            ? [{ role: "system" as const, content: opts.system.dynamic }]
            : []),
        ];
  return streamText({
    model: modelFor("chat"),
    system,
    messages: opts.messages,
    maxOutputTokens: opts.maxTokens ?? 800,
    onFinish: async ({ text }) => {
      await opts.onFinish?.(text);
    },
  });
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (!embeddingsConfigured()) {
    throw new Error("Embeddings require OPENAI_API_KEY.");
  }
  // API caps batch sizes; chunk defensively.
  const out: number[][] = [];
  const BATCH = 96;
  for (let i = 0; i < texts.length; i += BATCH) {
    const { embeddings } = await embedMany({
      model: embeddingModel(),
      values: texts.slice(i, i + BATCH),
    });
    out.push(...embeddings);
  }
  return out;
}

export async function embedQuery(text: string): Promise<number[]> {
  const { embedding } = await embed({ model: embeddingModel(), value: text });
  return embedding;
}
