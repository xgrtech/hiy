/**
 * Provider-agnostic LLM layer on the Vercel AI SDK.
 * Chat: Anthropic preferred when both keys exist, else OpenAI.
 * Embeddings: OpenAI text-embedding-3-small (1536-dim, matches pgvector).
 */
import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { embedMany, embed, generateText, streamText, type ModelMessage } from "ai";

export type ChatProvider = "anthropic" | "openai" | "none";

export function activeChatProvider(): ChatProvider {
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  return "none";
}

export function embeddingsConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

function chatModel() {
  const p = activeChatProvider();
  if (p === "anthropic") return anthropic("claude-sonnet-4-5");
  if (p === "openai") return openai("gpt-4o-mini");
  throw new Error(
    "No LLM configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY."
  );
}

const embeddingModel = () => openai.textEmbeddingModel("text-embedding-3-small");

export async function completeText(opts: {
  system: string;
  prompt: string;
  maxTokens?: number;
}): Promise<string> {
  const { text } = await generateText({
    model: chatModel(),
    system: opts.system,
    prompt: opts.prompt,
    maxOutputTokens: opts.maxTokens ?? 2000,
  });
  return text;
}

export function streamChat(opts: {
  system: string;
  messages: ModelMessage[];
  maxTokens?: number;
  onFinish?: (text: string) => Promise<void> | void;
}) {
  return streamText({
    model: chatModel(),
    system: opts.system,
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
