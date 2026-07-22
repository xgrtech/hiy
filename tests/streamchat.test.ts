/**
 * Smoke: the exact streamText shape streamChat now emits — system blocks via
 * the `system` option (array form) with anthropic cacheControl on block 1.
 * Asserts the stream actually yields text and the model receives both blocks.
 */
import assert from "node:assert";
import { streamText, type SystemModelMessage } from "ai";
import { MockLanguageModelV3, simulateReadableStream } from "ai/test";

async function main() {
  let receivedPrompt: unknown = null;
  const model = new MockLanguageModelV3({
    doStream: async ({ prompt }) => {
      receivedPrompt = prompt;
      return {
        stream: simulateReadableStream({
          chunks: [
            { type: "text-start", id: "1" },
            { type: "text-delta", id: "1", delta: "hello from the twin" },
            { type: "text-end", id: "1" },
            {
              type: "finish",
              finishReason: "stop",
              usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
            },
          ],
        }),
      };
    },
  });

  const system: SystemModelMessage[] = [
    {
      role: "system",
      content: "CACHED CORE: identity + rules + persona",
      providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } },
    },
    { role: "system", content: "DYNAMIC CONTEXT: retrieved chunks" },
  ];

  let finished = "";
  const result = streamText({
    model,
    system,
    messages: [{ role: "user", content: "who are you?" }],
    maxOutputTokens: 800,
    onFinish: ({ text }) => {
      finished = text;
    },
  });

  let streamed = "";
  for await (const delta of result.textStream) streamed += delta;

  assert.equal(streamed, "hello from the twin", "stream must yield text (not silently empty)");
  assert.equal(finished, "hello from the twin", "onFinish must fire with the full text");

  const prompt = receivedPrompt as { role: string; content: unknown; providerOptions?: unknown }[];
  const systems = prompt.filter((m) => m.role === "system");
  assert.equal(systems.length, 2, "both system blocks must reach the model");
  assert.ok(
    JSON.stringify(systems[0]).includes('"ephemeral"'),
    "cacheControl must survive on the cached block"
  );
  assert.ok(
    JSON.stringify(systems[0]).includes("CACHED CORE"),
    "cached core is the first block"
  );
  console.log("✓ streamChat shape streams text, fires onFinish, keeps cacheControl");
}

main().catch((e) => {
  console.error("✗ smoke failed:", e);
  process.exit(1);
});
