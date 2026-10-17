// Requer worker local (wrangler dev :8787) e http-server :8744; conta admin.teste@example.com.
const { chromium } = require("playwright");
const W = "http://127.0.0.1:8787";
const SHOTS = process.env.SHOTS_DIR || "/tmp";
const ok = (c, m) => console.log(`${c ? "✓" : "✗ FALHOU:"} ${m}`);
// PNG 2x2 vermelho
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==", "base64");

(async () => {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: "block" });
  await ctx.route("https://medconduta-ai.medcondutaa.workers.dev/**", async (route) => {
    const req = route.request();
    try {
      const res = await ctx.request.fetch(req.url().replace("https://medconduta-ai.medcondutaa.workers.dev", W), { method: req.method(), headers: req.headers(), data: req.postDataBuffer() || undefined });
      await route.fulfill({ status: res.status(), headers: res.headers(), body: await res.body() });
    } catch { await route.abort().catch(() => {}); }
  });
  const page = await ctx.newPage();
  const erros = [];
  page.on("pageerror", (e) => erros.push(e.message));
  await page.goto("http://localhost:8744");
  await page.fill("#login-email", "admin.teste@example.com");
  await page.fill("#login-password", "senha12345");
  await page.click("#login-submit");
  await page.waitForSelector("#sidebar-nav a", { timeout: 15000 });

  await page.evaluate(() => { location.hash = "/residencia/conteudo/angina-instavel-iamssst"; });
  const area = ".editor-anotacao__area";
  await page.waitForSelector(area, { timeout: 20000 });
  await page.evaluate((s) => { document.querySelector(s).innerHTML = ""; }, area);

  await page.click(area);
  await page.keyboard.type("Troponina alta define IAM");
  // seleciona "Troponina" e aplica negrito e marca-texto
  await page.evaluate((s) => {
    const t = document.querySelector(s).firstChild;
    const no = t.nodeType === 3 ? t : t.firstChild;
    const r = document.createRange(); r.setStart(no, 0); r.setEnd(no, 9);
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
  }, area);
  await page.click('[data-acao="bold"]');
  ok(await page.$eval('[data-acao="bold"]', (b) => b.classList.contains("is-ativo")), "botão negrito fica ativo");
  await page.click('[data-acao="marca"]');
  await page.click('[data-acao="justifyFull"]');
  await page.setInputFiles(".editor-anotacao__arquivo", { name: "img.png", mimeType: "image/png", buffer: PNG });
  await page.waitForSelector(`${area} img`, { timeout: 10000 });
  await page.waitForFunction(() => document.querySelector("#anotacao-status").textContent.includes("Salvo"), null, { timeout: 15000 });
  await page.screenshot({ path: `${SHOTS}/editor_anotacao.png`, clip: await page.$eval("#secao-anotacoes", (e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y + scrollY, width: r.width, height: r.height }; }), fullPage: true });

  await page.reload();
  await page.waitForSelector(area, { timeout: 20000 });
  const html = await page.$eval(area, (e) => e.innerHTML);
  ok(/<b>Troponina<\/b>|<mark>.*Troponina/.test(html) && /<b>/.test(html), "negrito salvo e recarregado");
  ok(/<mark>/.test(html), "marca-texto salvo");
  ok(/text-align: justify/.test(html), "justificado salvo");
  ok(/<img src="data:image\/png;base64/.test(html), "imagem salva");

  const limpo = await page.evaluate(async () => {
    const { higienizarHtml } = await import("./app/components/editorAnotacao.js");
    return higienizarHtml('<p onclick="x()">oi<script>alert(1)</script><img src="https://x/y.png"><img src="x" onerror="alert(1)"><a href="javascript:1">link</a></p>');
  });
  ok(!/script|onclick|onerror|https:|<a/.test(limpo), `HTML higienizado: ${limpo}`);

  ok(!erros.length, `erros de JS: ${erros.join(" | ") || "nenhum"}`);
  await browser.close();
})().catch((e) => { console.error("ERRO:", e); process.exit(1); });
