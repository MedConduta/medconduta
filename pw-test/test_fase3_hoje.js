const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const page = await browser.newPage();
  await page.route("https://medconduta-ai.medcondutaa.workers.dev/**", async (route) => {
    const req = route.request();
    const localUrl = req.url().replace("https://medconduta-ai.medcondutaa.workers.dev", "http://127.0.0.1:8787");
    const res = await page.request.fetch(localUrl, { method: req.method(), headers: req.headers(), data: req.postDataBuffer() || undefined });
    await route.fulfill({ status: res.status(), headers: res.headers(), body: await res.body() });
  });
  page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE ERROR:", m.text()); });
  page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));

  const email = `teste.fase3.${Date.now()}@example.com`;
  await page.goto("http://localhost:8744");
  await page.waitForSelector("#login-email", { timeout: 10000 });
  const heading = await page.textContent("h1");
  if (!heading.includes("Criar")) await page.click("#login-alternar");
  await page.fill("#login-email", email);
  await page.fill("#login-password", "senha12345");
  await page.click("#login-submit");
  await page.waitForSelector("#sidebar-nav a", { timeout: 15000 });

  // 1) Checa o rótulo de navegação "Hoje"
  const navLabels = await page.$$eval("#sidebar-nav .nav-link__label", (els) => els.map((e) => e.textContent.trim()));
  console.log("Rótulos da sidebar:", navLabels);

  // 2) Responde algumas questões de Dermatologia de propósito ERRANDO, para gerar
  // um gargalo real e verificar se o motor prioriza essa categoria depois.
  await page.evaluate(() => { location.hash = "/residencia/questoes"; });
  await page.waitForSelector("#filtro-tema", { timeout: 10000 });
  const opcoesDisponiveis = await page.$$eval("#filtro-tema option", (els) => els.map((e) => e.value));
  const temaAlvo = opcoesDisponiveis.find((v) => v.toLowerCase().includes("farmacodermia")) || opcoesDisponiveis[1];
  console.log("Tema escolhido para errar de propósito:", temaAlvo);
  await page.selectOption("#filtro-tema", temaAlvo);
  await page.waitForTimeout(300);
  const opcoesErradas = await page.$$(".opcoes");
  for (const opcoesEl of opcoesErradas) {
    const botoes = await opcoesEl.$$(".question-option");
    if (botoes.length) {
      await botoes[botoes.length - 1].click().catch(() => {}); // clica na última alternativa (provavelmente errada)
      await page.waitForTimeout(150);
    }
  }

  // 3) Vai para "Hoje" e gera o plano
  await page.evaluate(() => { location.hash = "/residencia/planejador"; });
  await page.waitForSelector("#horas-range", { timeout: 10000 });
  await page.fill("#horas-range", "5").catch(() => {});
  await page.evaluate(() => {
    const el = document.querySelector("#horas-range");
    el.value = "5";
    el.dispatchEvent(new Event("input"));
  });
  await page.click("#btn-gerar");
  await page.waitForTimeout(800);

  const statValues = await page.$$eval(".stat-tile__value", (els) => els.map((e) => e.textContent.trim()));
  console.log("Stats do plano:", statValues);

  const gargalos = await page.$$eval(".card ul li", (els) => els.map((e) => e.textContent.trim())).catch(() => []);
  console.log("Gargalos exibidos:", gargalos);

  const agendaItens = await page.$$eval(".plan-queue .plan-item strong", (els) => els.map((e) => e.textContent.trim()));
  console.log("Primeiros itens da agenda:", agendaItens.slice(0, 6));

  await browser.close();
})().catch((e) => { console.error("ERRO:", e); process.exit(1); });
