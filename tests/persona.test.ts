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

  await test("personaPromptInput puts corrections last with authoritative marker", () => {
    const input = personaPromptInput([
      { title: "Fix", type: "correction", text: "I left Acme in 2024." },
      { title: "Blog post", type: "blog", text: "blog words" },
      { title: "Personality interview", type: "interview", text: "Q: A?\nA: B" },
    ]);
    assert.ok(input.includes("[AUTHORITATIVE CORRECTION] Fix"));
    assert.ok(
      input.indexOf("Blog post") < input.indexOf("[AUTHORITATIVE CORRECTION]"),
      "corrections should come after other sources"
    );
  });

  await test("personaPromptInput excerpts long content sources (style sample, not corpus)", () => {
    const long = "filler ".repeat(3000) + "TAIL_MARKER_NEVER_INCLUDED";
    const input = personaPromptInput([
      { title: "Long blog", type: "blog", text: long },
      { title: "Personality interview", type: "interview", text: "Q: A?\nA: B" },
    ]);
    assert.ok(!input.includes("TAIL_MARKER_NEVER_INCLUDED"), "long blog should be excerpted");
    assert.ok(input.includes("Long blog"), "excerpted source still present");
    assert.ok(input.includes("Q: A?"), "interview untouched");
  });

  await test("personaPromptInput keeps interviews and corrections whole", () => {
    const interview = "Q: X?\nA: " + "detail ".repeat(1200) + "INTERVIEW_TAIL";
    const correction = "I left Acme in 2024. " + "context ".repeat(1000) + "CORRECTION_TAIL";
    const input = personaPromptInput([
      { title: "Personality interview", type: "interview", text: interview },
      { title: "Fix", type: "correction", text: correction },
    ]);
    assert.ok(input.includes("INTERVIEW_TAIL"), "interview must never be excerpted");
    assert.ok(input.includes("CORRECTION_TAIL"), "corrections must never be excerpted");
  });

  const { safePersona } = await import("../src/lib/rag/persona");
  await test("safePersona validates untrusted jsonb (null on malformed)", () => {
    assert.ok(safePersona(validPersona));
    assert.equal(safePersona({ tone: "not-an-array" }), null);
    assert.equal(safePersona(null), null);
    assert.equal(safePersona("junk"), null);
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
    assert.ok(p.includes("Zee's AI twin"));
    assert.ok(p.includes("FIRST PERSON")); // voice instruction present
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

  const { buildSystemPromptParts } = await import("../src/lib/rag/prompt");
  await test("prompt splits into cacheable core + per-question context", () => {
    const { core, context } = buildSystemPromptParts({ ...baseOpts, persona: validPersona });
    assert.ok(core.includes("Zee's AI twin"), "identity in core");
    assert.ok(core.includes("HOW YOU SPEAK"), "persona in core");
    assert.ok(!core.includes("I like tea"), "retrieved chunks must not pollute the cached core");
    assert.ok(context.includes("I like tea"), "chunks live in the variable context part");
  });

  await test("buildSystemPrompt is exactly core + context (no drift between paths)", () => {
    const parts = buildSystemPromptParts({ ...baseOpts, persona: validPersona });
    const joined = buildSystemPrompt({ ...baseOpts, persona: validPersona });
    assert.equal(joined, `${parts.core}\n\n${parts.context}`);
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
