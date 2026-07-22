/**
 * Provider selection tests. Run: npx tsx tests/provider.test.ts
 * providerFor reads process.env at call time, so tests steer it by
 * mutating env between calls — no network, no SDK calls.
 */
import assert from "node:assert";

let passed = 0;
let failed = 0;
async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    console.error(`  ✗ ${name}\n    ${(e as Error).message}`);
  }
}

function setEnv(env: {
  ANTHROPIC_API_KEY?: string;
  OPENAI_API_KEY?: string;
  CHAT_PROVIDER?: string;
}) {
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.OPENAI_API_KEY;
  delete process.env.CHAT_PROVIDER;
  Object.assign(process.env, env);
}

async function main() {
  const { providerFor } = await import("../src/lib/llm/provider");
  console.log("provider.ts");

  await test("both keys, no flag: anthropic preferred for every task", () => {
    setEnv({ ANTHROPIC_API_KEY: "a", OPENAI_API_KEY: "o" });
    assert.equal(providerFor("chat"), "anthropic");
    assert.equal(providerFor("synthesis"), "anthropic");
    assert.equal(providerFor("light"), "anthropic");
  });

  await test("CHAT_PROVIDER=openai flips chat only, synthesis stays anthropic", () => {
    setEnv({ ANTHROPIC_API_KEY: "a", OPENAI_API_KEY: "o", CHAT_PROVIDER: "openai" });
    assert.equal(providerFor("chat"), "openai");
    assert.equal(providerFor("synthesis"), "anthropic");
    assert.equal(providerFor("light"), "anthropic");
  });

  await test("CHAT_PROVIDER=anthropic is honored explicitly", () => {
    setEnv({ ANTHROPIC_API_KEY: "a", OPENAI_API_KEY: "o", CHAT_PROVIDER: "anthropic" });
    assert.equal(providerFor("chat"), "anthropic");
  });

  await test("flagged provider without its key falls back to auto (never dead chat)", () => {
    setEnv({ ANTHROPIC_API_KEY: "a", CHAT_PROVIDER: "openai" });
    assert.equal(providerFor("chat"), "anthropic");
  });

  await test("garbage flag value falls back to auto", () => {
    setEnv({ ANTHROPIC_API_KEY: "a", OPENAI_API_KEY: "o", CHAT_PROVIDER: "grok" });
    assert.equal(providerFor("chat"), "anthropic");
  });

  await test("only OpenAI key, no flag: openai serves everything", () => {
    setEnv({ OPENAI_API_KEY: "o" });
    assert.equal(providerFor("chat"), "openai");
    assert.equal(providerFor("synthesis"), "openai");
  });

  await test("no keys: none (routes 503 by design)", () => {
    setEnv({});
    assert.equal(providerFor("chat"), "none");
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main();
