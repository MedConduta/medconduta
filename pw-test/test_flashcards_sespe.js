// Requer worker local (wrangler dev :8787) e http-server :8744; conta admin.teste@example.com.
const { chromium } = require("playwright");
const W = "http://127.0.0.1:8787";
const SHOTS = process.env.SHOTS_DIR || "/tmp";
const ok = (cond, msg) => console.log(`${cond ? "✓" : "✗ FALHOU:"} ${msg}`);

(async () => {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.route("https://medconduta-ai.medcondutaa.workers.dev/**", async (route) => {
    const req = route.request();
    try {
      const res = await page.request.fetch(req.url().replace("https://medconduta-ai.medcondutaa.workers.dev", W), {
        method: req.method(), headers: req.headers(), data: req.postDataBuffer() || undefined,
      });
      await route.fulfill({ status: res.status(), headers: res.headers(), body: await res.body() });
    } catch { await route.abort().catch(() => {}); }
  });
  const erros = [];
  page.on("pageerror", (e) => erros.push(e.message));

  await page.goto("http://localhost:8744");
  await page.fill("#login-email", "admin.teste@example.com");
  await page.fill("#login-password", "senha12345");
  await page.click("#login-submit");
  await page.waitForSelector("#sidebar-nav a", { timeout: 15000 });

  await page.evaluate(() => { location.hash = "/residencia/flashcards"; });
  await page.waitForSelector("[data-baralho]", { timeout: 15000 });
  const valores = async () => page.$$eval(".stat-tile__value", (els) => els.map((e) => Number(e.textContent)));
  const [, , , totalTodos] = await valores();
  ok(totalTodos >= 800, `baralho completo com ${totalTodos} cards`);
  const botao = await page.textContent("#btn-revisar");
  ok(/Estudar (\d+)/.test(botao) && Number(botao.match(/\d+/)[0]) <= 20 + (await valores())[0], `sessão limitada: "${botao.trim()}"`);

  await page.click(`[data-baralho="sespe"]`);
  await page.waitForFunction(() => document.querySelector('[data-baralho="sespe"]').classList.contains("is-active"));
  const [, , , totalSespe] = await valores();
  ok(totalSespe >= 600 && totalSespe < totalTodos, `baralho IAUPE/SES-PE com ${totalSespe} cards`);
  await page.selectOption("#novos-por-sessao", "10");
  await page.waitForFunction(() => /Estudar \d+/.test(document.querySelector("#btn-revisar")?.textContent || ""));
  await page.screenshot({ path: `${SHOTS}/flashcards_config.png` });

  await page.click("#btn-revisar");
  await page.waitForSelector("#btn-mostrar");
  const temas = [];
  for (let i = 0; i < 3; i++) {
    temas.push((await page.textContent(".page-header__desc")).trim());
    if (i === 0) ok(/IAUPE\/SES-PE/.test(temas[0]), `card mostra tema e banca: ${temas[0]}`);
    await page.click("#btn-mostrar");
    await page.click("#btn-lembrei");
    await page.waitForTimeout(300);
  }
  ok(new Set(temas).size === 3, `novos alternam entre temas: ${temas.join(" | ")}`);
  await page.screenshot({ path: `${SHOTS}/flashcards_card.png` });

  ok(!erros.length, `erros de JS: ${erros.join(" | ") || "nenhum"}`);
  await page.unrouteAll({ behavior: "ignoreErrors" });
  await browser.close();
})().catch((e) => { console.error("ERRO:", e); process.exit(1); });
