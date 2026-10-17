// Requer worker local (wrangler dev :8787, .dev.vars com ADMIN_EMAILS) e http-server :8744.
// Verifica que, com o Curso ativo, agenda do dia, questões e flashcards se voltam aos temas da semana.
const { chromium } = require("playwright");
const W = "http://127.0.0.1:8787";
const ok = (c, m) => console.log(`${c ? "✓" : "✗ FALHOU:"} ${m}`);

async function novaPagina(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, serviceWorkers: "block" });
  await ctx.route("https://medconduta-ai.medcondutaa.workers.dev/**", async (route) => {
    const req = route.request();
    try {
      const res = await ctx.request.fetch(req.url().replace("https://medconduta-ai.medcondutaa.workers.dev", W), { method: req.method(), headers: req.headers(), data: req.postDataBuffer() || undefined });
      await route.fulfill({ status: res.status(), headers: res.headers(), body: await res.body() });
    } catch { await route.abort().catch(() => {}); }
  });
  const page = await ctx.newPage();
  page.erros = [];
  page.on("pageerror", (e) => page.erros.push(e.message));
  return page;
}

(async () => {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const admin = await novaPagina(browser);
  await admin.goto("http://localhost:8744");
  await admin.fill("#login-email", "admin.teste@example.com");
  await admin.fill("#login-password", "senha12345");
  await admin.click("#login-submit");
  await admin.waitForSelector("#sidebar-nav a", { timeout: 15000 });
  const token = await admin.evaluate(() => localStorage.getItem("medconduta:auth_token"));
  const convite = await (await admin.request.post(`${W}/admin/convites`, { headers: { Authorization: `Bearer ${token}`, Origin: "http://localhost:8744", "Content-Type": "application/json" }, data: {} })).json();

  // Usuário novo, sem Curso: comportamento geral.
  const p = await novaPagina(browser);
  await p.goto(`http://localhost:8744/?convite=${convite.code}`);
  await p.waitForSelector("#login-convite");
  await p.fill("#login-email", `curso.${Date.now()}@example.com`);
  await p.fill("#login-password", "senha12345");
  await p.click("#login-submit");
  await p.waitForSelector("#sidebar-nav a", { timeout: 20000 });

  await p.evaluate(() => { location.hash = "/residencia/flashcards"; });
  await p.waitForSelector("[data-baralho]", { timeout: 20000 });
  ok(!(await p.$('[data-baralho="curso"]')), "sem Curso: não há baralho do Curso");

  // Abre o Curso (ancora o cronograma hoje → semana 1 ativa).
  await p.evaluate(() => { location.hash = "/residencia/curso"; });
  await p.waitForTimeout(4000);

  await p.evaluate(() => { location.hash = "/residencia/planejador"; });
  await p.waitForSelector("#btn-gerar", { timeout: 20000 });
  await p.click("#btn-gerar");
  await p.waitForSelector(".plan-queue", { timeout: 30000 });
  const textoAgenda = await p.textContent("#plano-resultado");
  ok(/Foco no Curso — semana 1/.test(textoAgenda), "agenda mostra o foco na semana do Curso");
  const links = await p.$$eval(".plan-queue a", (as) => as.map((a) => a.getAttribute("href")));
  ok(links.some((l) => l.includes("questoes?temaId=")), "blocos de questões apontam para temas da semana");
  console.log("  agenda:", links.join(" | "));

  await p.evaluate(() => { location.hash = "/residencia/questoes"; });
  await p.waitForSelector('[data-deck="curso"]', { timeout: 30000 });
  const deck = (await p.textContent('[data-deck="curso"]')).replace(/\s+/g, " ").trim();
  ok(/Semana 1 do Curso/.test(deck), `deck do Curso em Questões: ${deck.slice(0, 90)}`);
  await p.click('[data-deck-treinar="curso"]');
  await p.waitForTimeout(1500);
  ok(/curso=1/.test(p.url()), "treinar o deck aplica ?curso=1");

  await p.evaluate(() => { location.hash = "/residencia/flashcards"; });
  await p.waitForSelector('[data-baralho="curso"]', { timeout: 20000 });
  ok(await p.$eval('[data-baralho="curso"]', (b) => b.classList.contains("is-active")), "flashcards abre no baralho do Curso");

  const erros = [...admin.erros, ...p.erros];
  ok(!erros.length, `erros de JS: ${erros.join(" | ") || "nenhum"}`);
  await browser.close();
})().catch((e) => { console.error("ERRO:", e); process.exit(1); });
