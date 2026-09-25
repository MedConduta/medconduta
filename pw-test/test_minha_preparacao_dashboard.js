const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1400 } });
  await page.route("https://medconduta-ai.medcondutaa.workers.dev/**", async (route) => {
    const req = route.request();
    const localUrl = req.url().replace("https://medconduta-ai.medcondutaa.workers.dev", "http://127.0.0.1:8787");
    const res = await page.request.fetch(localUrl, { method: req.method(), headers: req.headers(), data: req.postDataBuffer() || undefined, timeout: 60000 });
    await route.fulfill({ status: res.status(), headers: res.headers(), body: await res.body() });
  });
  const erros = [];
  page.on("pageerror", (e) => erros.push(e.message));

  const email = `teste.dashboard.${Date.now()}@example.com`;
  await page.goto("http://localhost:8744");
  await page.waitForSelector("#login-email", { timeout: 10000 });
  await page.click("#login-alternar");
  await page.fill("#login-email", email);
  await page.fill("#login-password", "senha12345");
  await page.click("#login-submit");
  await page.waitForSelector("#sidebar-nav a", { timeout: 15000 });
  await page.waitForTimeout(800);

  await page.evaluate(() => { location.hash = "/residencia/minha-preparacao"; });
  await page.waitForSelector(".main__container", { timeout: 15000 });
  await page.waitForTimeout(700);

  // --- 1) Os "Atalhos" (9 cards de shortcut) não existem mais.
  const texto = await page.$eval(".main__container", (el) => el.textContent);
  console.log("Título 'Atalhos' foi removido:", !texto.includes("Atalhos"));
  const cardsAtalho = await page.$$eval('.main__container a[href="#/residencia/simulados"], .main__container a[href="#/residencia/foco"]', (els) => els.length);
  console.log("Nenhum card de atalho antigo (Simulados/Modo Foco) sobrou no conteúdo principal:", cardsAtalho === 0);

  // --- 2) Dashboard: anel de progresso do curso (SVG) presente.
  const temAnel = await page.$("svg circle") !== null;
  console.log("Anel de progresso do curso (SVG) renderizado:", temAnel);

  // --- 3) Card da semana atual.
  console.log("Mostra 'sua semana atual':", texto.includes("sua semana atual"));
  console.log("Mostra 'O que falta nesta semana' ou semana concluída:", texto.includes("O que falta nesta semana") || texto.includes("Semana concluída"));

  // --- 4) Gráfico de barras semana a semana.
  console.log("Mostra 'Progresso semana a semana':", texto.includes("Progresso semana a semana"));
  const barrasSemana = await page.$$eval('[title^="Semana "]', (els) => els.length);
  console.log("Gráfico de semanas tem barras (title com 'Semana N'):", barrasSemana > 0, `(${barrasSemana})`);

  // --- 5) Agenda de hoje continua presente (não é um "atalho", é a ação central).
  console.log("Card 'Agenda de hoje' continua presente:", texto.includes("Agenda de hoje"));

  // --- 6) Nenhum erro de JS.
  console.log("Erros JS capturados:", erros.length ? erros : "nenhum");

  await page.screenshot({ path: "/tmp/claude-0/-home-user-medconduta/189a7ed4-3170-599a-adb3-6689b402ef7e/scratchpad/minha_preparacao_dashboard.png", fullPage: true });

  await browser.close();
})().catch((e) => {
  console.error("ERRO:", e);
  process.exit(1);
});
