/**
 * Persona + prompt assembly test harness. Run: npx tsx tests/persona.test.ts
 * Pure-function tests only — LLM and DB layers are exercised at runtime;
 * these lock the parsing, prompt composition, and priority rules.
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

async function main() {
  // ---------- persona.ts ----------
  const { parsePersona, personaPromptInput } = await import(
    "../src/lib/rag/persona"
  );
  console.log("persona.ts");

  const validPersona = {
    tone: ["warm", "direct"],
    style_notes: "Short sentences. Dry humor.",
    signature_phrases: ["here's the thing"],
    boundaries: ["politics"],
    facts: ["Grew up in Lahore"],
  };

  await test("parsePersona accepts plain JSON", () => {
    const p = parsePersona(JSON.stringify(validPersona));
    assert.ok(p);
    assert.deepEqual(p!.tone, ["warm", "direct"]);
  });
  await test("parsePersona accepts ```json fenced output", () => {
    const p = parsePersona("```json\n" + JSON.stringify(validPersona) + "\n```");
    assert.ok(p);
    assert.equal(p!.style_notes, "Short sentences. Dry humor.");
  });
  await test("parsePersona rejects junk", () => {
    assert.equal(parsePersona("I am not JSON at all"), null);
  });
  await test("parsePersona rejects missing keys", () => {
    assert.equal(parsePersona(JSON.stringify({ tone: ["warm"] })), null);
  });
  await test("parsePersona tolerates prose around a JSON object", () => {
    const p = parsePersona(
      "Here is the profile:\n" + JSON.stringify(validPersona) + "\nDone."
    );
    assert.ok(p);
  });

  await test("personaPromptInput puts interview sources first", () => {
    const input = personaPromptInput([
      { title: "Blog post", type: "blog", text: "blog words" },
      { title: "Personality interview", type: "interview", text: "Q: A?\nA: B" },
    ]);
    assert.ok(
      input.indexOf("Personality interview") < input.indexOf("Blog post"),
      "interview should come before blog"
    );
    assert.ok(input.includes("Q: A?"));
  });

  // ---------- prompt.ts ----------
  const { buildSystemPrompt } = await import("../src/lib/rag/prompt");
  console.log("prompt.ts");

  const baseOpts = {
    name: "Zee",
    roleLine: "Engineer",
    guardrailTopics: ["religion"],
    chunks: [{ content: "I like tea", source_title: "Blog", similarity: 0.9 }],
  };

  await test("without persona: no HOW YOU SPEAK block (baseline unchanged)", () => {
    const p = buildSystemPrompt(baseOpts);
    assert.ok(!p.includes("HOW YOU SPEAK"));
    assert.ok(p.includes("AI twin of Zee"));
    assert.ok(p.includes("I like tea"));
  });

  await test("with persona: HOW YOU SPEAK block with tone + phrases", () => {
    const p = buildSystemPrompt({ ...baseOpts, persona: validPersona });
    assert.ok(p.includes("HOW YOU SPEAK"));
    assert.ok(p.includes("warm"));
    assert.ok(p.includes("here's the thing"));
  });

  await test("persona boundaries merge into guardrail refusals", () => {
    const p = buildSystemPrompt({ ...baseOpts, persona: validPersona });
    assert.ok(p.includes("religion"));
    assert.ok(p.includes("politics"));
  });

  await test("persona never overrides grounding rules", () => {
    const p = buildSystemPrompt({ ...baseOpts, persona: validPersona });
    assert.ok(p.includes("never invent facts"));
    const rulesIdx = p.indexOf("Non-negotiable rules");
    const personaIdx = p.indexOf("HOW YOU SPEAK");
    assert.ok(rulesIdx < personaIdx, "rules come before persona style");
  });

  // ---------- interview/format.ts ----------
  const { qaToTranscript, qaBoundaries } = await import(
    "../src/lib/interview/format"
  );
  const { SEED_QUESTIONS } = await import("../src/lib/interview/questions");
  console.log("interview");

  await test("qaToTranscript renders answered pairs, drops empty answers", () => {
    const t = qaToTranscript([
      { q: "How do you greet people?", a: "Hey! Always informal." },
      { q: "Skipped one", a: "" },
    ]);
    assert.ok(t.includes("Q: How do you greet people?"));
    assert.ok(t.includes("A: Hey! Always informal."));
    assert.ok(!t.includes("Skipped one"));
  });

  await test("qaBoundaries extracts answers to boundary-group questions", () => {
    const boundaryQ = SEED_QUESTIONS.find((q) => q.group === "boundaries")!;
    const out = qaBoundaries([
      { q: boundaryQ.text, a: "My family, and my clients' names" },
      { q: "How do you greet people?", a: "Hey!" },
    ]);
    assert.deepEqual(out, ["My family, and my clients' names"]);
  });

  await test("seed bank has 5 groups and enough questions", () => {
    const groups = new Set(SEED_QUESTIONS.map((q) => q.group));
    assert.deepEqual(
      [...groups].sort(),
      ["bio", "boundaries", "faqs", "opinions", "voice"]
    );
    assert.ok(SEED_QUESTIONS.length >= 15);
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main();
