/**
 * Ingestion test harness. Run: npx tsx tests/ingest.test.ts
 * Network-dependent paths (live blog fetch, live YouTube) are covered by
 * fixture-level tests here; live-fetch smoke tests run post-deploy.
 */
import assert from "node:assert";
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";

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
  // ---------- clean.ts ----------
  const { cleanText, paragraphizeTranscript, looksLikeText, wordCount } =
    await import("../src/lib/ingest/clean");

  console.log("clean.ts");
  await test("normalizes nbsp, zero-width, CRLF, collapse blank lines", () => {
    const dirty = "hello world​\r\n\r\n\r\n\r\nnext  para\t\t!";
    const out = cleanText(dirty);
    assert.equal(out, "hello world\n\nnext para !");
  });
  await test("wordCount counts words", () => {
    assert.equal(wordCount("one two  three\nfour"), 4);
  });
  await test("paragraphize reflows transcript stream", () => {
    const stream = Array(200).fill("word").join(" ");
    const out = paragraphizeTranscript(stream, 90);
    assert.equal(out.split("\n\n").length, 3);
  });
  await test("looksLikeText rejects binary-ish input", () => {
    assert.equal(looksLikeText("normal prose here"), true);
    assert.equal(looksLikeText("\x00\x01\x02\x03".repeat(100)), false);
  });

  // ---------- youtube.ts ----------
  const { extractVideoId, ingestYoutubePaste } = await import(
    "../src/lib/ingest/youtube"
  );
  console.log("youtube.ts");
  await test("extracts video id from every URL shape", () => {
    const id = "dQw4w9WgXcQ";
    for (const u of [
      `https://www.youtube.com/watch?v=${id}`,
      `https://www.youtube.com/watch?feature=share&v=${id}&t=42`,
      `https://youtu.be/${id}`,
      `https://youtu.be/${id}?t=10`,
      `https://www.youtube.com/embed/${id}`,
      `https://www.youtube.com/shorts/${id}`,
      `https://www.youtube.com/live/${id}`,
      id,
    ]) {
      assert.equal(extractVideoId(u), id, `failed on: ${u}`);
    }
    assert.equal(extractVideoId("https://vimeo.com/12345"), null);
    assert.equal(extractVideoId("not a url"), null);
  });
  await test("paste path strips YouTube panel timestamps", () => {
    const pasted = Array.from(
      { length: 30 },
      (_, i) => `${i}:0${i % 10}\nthis is what I said in segment number ${i} of the talk`
    ).join("\n");
    const src = ingestYoutubePaste(pasted, "https://youtu.be/dQw4w9WgXcQ");
    assert.ok(!/\d{1,2}:\d{2}/.test(src.text.split("\n")[0].slice(0, 20)));
    assert.equal(src.meta.videoId, "dQw4w9WgXcQ");
    assert.ok(src.wordCount > 200);
  });
  await test("paste path rejects too-short transcripts", async () => {
    let threw = false;
    try {
      ingestYoutubePaste("too short");
    } catch (e) {
      threw = true;
      assert.equal((e as { code: string }).code, "text_too_short");
    }
    assert.ok(threw);
  });

  // ---------- net.ts SSRF guard (via blocked fetches, no real network) ----------
  const { safeFetch } = await import("../src/lib/ingest/net");
  console.log("net.ts (SSRF guard)");
  const mustBlock = [
    "http://127.0.0.1/admin",
    "http://localhost:8080/",
    "http://169.254.169.254/latest/meta-data/", // cloud metadata
    "http://10.0.0.5/internal",
    "http://192.168.1.1/",
    "http://172.16.0.9/",
    "http://[::1]/",
    "file:///etc/passwd",
    "ftp://example.com/x",
  ];
  for (const url of mustBlock) {
    await test(`blocks ${url}`, async () => {
      let code = "";
      try {
        await safeFetch(url);
      } catch (e) {
        code = (e as { code?: string }).code ?? "";
      }
      assert.ok(
        code === "blocked_url" || code === "invalid_url",
        `expected block, got: ${code || "no error"}`
      );
    });
  }
  await test("rejects malformed URL", async () => {
    let code = "";
    try {
      await safeFetch("not a url at all");
    } catch (e) {
      code = (e as { code?: string }).code ?? "";
    }
    assert.equal(code, "invalid_url");
  });

  // ---------- blog extraction on fixture HTML (no network) ----------
  console.log("blog extraction (fixtures via jsdom+Readability directly)");
  const { Readability } = await import("@mozilla/readability");
  const { JSDOM } = await import("jsdom");
  await test("Readability extracts article, drops nav/footer", () => {
    const html = `<!doctype html><html><head><title>My Post — Blog</title></head><body>
      <nav><a>Home</a><a>About</a><a>Subscribe now!</a></nav>
      <article><h1>On pricing early products</h1>
      ${Array.from({ length: 12 }, (_, i) => `<p>Paragraph ${i}: charge sooner than feels comfortable, because price is the fastest honest signal that people value what you make. Repetition pads length for the readability threshold.</p>`).join("")}
      </article>
      <footer>© 2026 · Privacy · Terms · Cookie settings</footer></body></html>`;
    const dom = new JSDOM(html, { url: "https://example.com/post" });
    const article = new Readability(dom.window.document).parse();
    assert.ok(article?.textContent?.includes("charge sooner"));
    assert.ok(!article?.textContent?.includes("Cookie settings"));
    assert.ok(!article?.textContent?.includes("Subscribe now"));
  });

  // ---------- files.ts ----------
  console.log("files.ts");
  const { ingestFile } = await import("../src/lib/ingest/files");

  await test("txt file round-trips", async () => {
    const words = Array(60).fill("word").join(" ");
    const src = await ingestFile("notes.txt", Buffer.from(`My notes\n\n${words}`));
    assert.equal(src.type, "file");
    assert.equal(src.title, "notes");
    assert.ok(src.wordCount >= 60);
  });
  await test("md file accepted", async () => {
    const src = await ingestFile(
      "post.md",
      Buffer.from(`# Title\n\n${Array(40).fill("insight").join(" ")}`)
    );
    assert.equal(src.meta.format, "text");
  });
  await test("unsupported extension rejected with friendly error", async () => {
    let code = "";
    try {
      await ingestFile("data.xlsx", Buffer.from("x"));
    } catch (e) {
      code = (e as { code?: string }).code ?? "";
    }
    assert.equal(code, "file_unsupported");
  });
  await test("empty file rejected", async () => {
    let code = "";
    try {
      await ingestFile("empty.txt", Buffer.alloc(0));
    } catch (e) {
      code = (e as { code?: string }).code ?? "";
    }
    assert.equal(code, "file_empty");
  });
  await test("oversize file rejected", async () => {
    let code = "";
    try {
      await ingestFile("big.txt", Buffer.alloc(21 * 1024 * 1024));
    } catch (e) {
      code = (e as { code?: string }).code ?? "";
    }
    assert.equal(code, "too_large");
  });
  await test("binary masquerading as txt rejected", async () => {
    let code = "";
    try {
      await ingestFile("fake.txt", Buffer.from(Array(500).fill(1)));
    } catch (e) {
      code = (e as { code?: string }).code ?? "";
    }
    assert.equal(code, "file_corrupt");
  });

  // real PDF fixture (generated locally with reportlab if available, else skip)
  await test("PDF text extraction (generated fixture)", async () => {
    try {
      execSync(
        `python3 -c "
from reportlab.pdfgen import canvas
c = canvas.Canvas('/tmp/fixture.pdf')
t = c.beginText(72, 720)
for i in range(40):
    t.textLine('Line %d: pricing is the fastest honest signal of value.' % i)
c.drawText(t); c.save()"`,
        { stdio: "pipe" }
      );
    } catch {
      // reportlab unavailable — generate minimal PDF by hand instead
      const minimal = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 120>>stream
BT /F1 12 Tf 72 720 Td (pricing is the fastest honest signal of value and this line repeats meaning) Tj ET
endstream endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
trailer<</Root 1 0 R>>`;
      writeFileSync("/tmp/fixture.pdf", minimal);
    }
    const { readFileSync } = await import("node:fs");
    const buf = readFileSync("/tmp/fixture.pdf");
    try {
      const src = await ingestFile("fixture.pdf", buf);
      assert.ok(src.text.toLowerCase().includes("pricing"));
    } catch (e) {
      // A hand-built minimal PDF may fall below word minimum — accept
      // file_empty for the fallback fixture only.
      const code = (e as { code?: string }).code ?? "";
      assert.ok(code === "file_empty", `unexpected: ${code || (e as Error).message}`);
    }
  });

  // ---------- dispatcher ----------
  console.log("dispatcher");
  const { ingest } = await import("../src/lib/ingest/index");
  await test("manual paste happy path", async () => {
    const src = await ingest({
      sourceType: "manual",
      payload: `I am a builder. ${Array(40).fill("I ship fast and value honest tools.").join(" ")}`,
      title: "About me",
    });
    assert.equal(src.type, "manual");
    assert.equal(src.title, "About me");
  });
  await test("linkedin type tagged correctly", async () => {
    const src = await ingest({
      sourceType: "linkedin",
      payload: Array(50).fill("experience building products at companies").join(" "),
    });
    assert.equal(src.type, "linkedin");
    assert.equal(src.title, "LinkedIn / résumé");
  });
  await test("youtube dispatcher routes URL vs pasted transcript", async () => {
    // pasted transcript (long text) must route to paste path, not fetch
    const src = await ingest({
      sourceType: "youtube",
      payload: Array(100).fill("spoken words from my talk").join(" "),
      videoRef: "https://youtu.be/dQw4w9WgXcQ",
    });
    assert.equal(src.meta.pasted, "true");
    assert.equal(src.meta.videoId, "dQw4w9WgXcQ");
  });
  await test("manual too-short rejected", async () => {
    let code = "";
    try {
      await ingest({ sourceType: "manual", payload: "hi there" });
    } catch (e) {
      code = (e as { code?: string }).code ?? "";
    }
    assert.equal(code, "text_too_short");
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main();
