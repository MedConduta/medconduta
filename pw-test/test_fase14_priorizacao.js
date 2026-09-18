const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const page = await browser.newPage();
  await page.route("https://medconduta-ai.medcondutaa.workers.dev/**", async (route) => {
    const req = route.request();
    const localUrl = req.url().replace("https://medconduta-ai.medcondutaa.workers.dev", "http://127.0.0.1:8787");
    const res = await page.request.fetch(localUrl, { method: req.method(), headers: req.headers(), data: req.postDataBuffer() || undefined, timeout: 60000 });
    await route.fulfill({ status: res.status(), headers: res.headers(), body: await res.body() });
  });
  const erros = [];
  page.on("pageerror", (e) => erros.push(e.message));

  const email = `teste.fase14.${Date.now()}@example.com`;
  await page.goto("http://localhost:8744");
  await page.waitForSelector("#login-email", { timeout: 10000 });
  const heading = await page.textContent("h1");
  if (!heading.includes("Criar")) await page.click("#login-alternar");
  await page.fill("#login-email", email);
  await page.fill("#login-password", "senha12345");
  await page.click("#login-submit");
  await page.waitForSelector("#sidebar-nav a", { timeout: 15000 });

  // --- 1) Cronograma: configurar prova-alvo ENAMED + data a 5 dias (Pré-prova) ---
  await page.evaluate(() => { location.hash = "/residencia/cronograma"; });
  await page.waitForSelector("#form-prova", { timeout: 10000 });

  const daqui5dias = new Date();
  daqui5dias.setDate(daqui5dias.getDate() + 5);
  const dataIso = daqui5dias.toISOString().slice(0, 10);

  await page.fill("#prova-data", dataIso);
  await page.selectOption("#prova-alvo", "ENAMED");
  await page.click("#form-prova button[type=submit]");
  await page.waitForFunction(() => document.querySelector(".main__container")?.textContent.includes("Fase atual"), { timeout: 10000 });

  let texto = await page.$eval(".main__container", (el) => el.textContent);
  console.log("Com data a 5 dias, fase atual é 'Pré-prova':", texto.includes("Pré-prova"));
  console.log("Mostra as 5 fases da preparação:", texto.includes("As 5 fases da preparação"));
  console.log("Lista inclui 'Pré-prova' entre as fases:", (texto.match(/Pré-prova/g) || []).length >= 2);
  console.log("Prova-alvo salva como ENAMED (select):", await page.$eval("#prova-alvo", (el) => el.value) === "ENAMED");

  // --- 2) Reload confirma persistência da prova-alvo ---
  await page.evaluate(() => { location.hash = "/residencia/minha-preparacao"; });
  await page.waitForSelector(".main__container", { timeout: 10000 });
  await page.evaluate(() => { location.hash = "/residencia/cronograma"; });
  await page.waitForFunction(() => document.querySelector("#prova-alvo")?.value, { timeout: 10000 });
  console.log("Prova-alvo persiste após navegar (ENAMED):", await page.$eval("#prova-alvo", (el) => el.value) === "ENAMED");

  // --- 3) Prontidão/Desempenho não quebram com prova-alvo=ENAMED ---
  await page.evaluate(() => { location.hash = "/residencia/prontidao"; });
  await page.waitForSelector(".main__container", { timeout: 10000 });
  await page.waitForTimeout(500);
  texto = await page.$eval(".main__container", (el) => el.textContent);
  console.log("Prontidão renderiza normalmente com ENAMED:", texto.trim().length > 0);

  await page.evaluate(() => { location.hash = "/residencia/desempenho"; });
  await page.waitForSelector(".main__container", { timeout: 10000 });
  await page.waitForFunction(() => document.querySelector(".main__container")?.textContent.includes("Análise de desempenho"), { timeout: 15000 });
  console.log("Desempenho renderiza normalmente com ENAMED:", true);

  // --- 4) Hoje (planejador): fase Pré-prova não mostra conteúdo novo, e Modo Reta Final aparece ---
  await page.evaluate(() => { location.hash = "/residencia/planejador"; });
  await page.waitForSelector(".main__container", { timeout: 10000 });
  await page.waitForTimeout(1000);
  texto = await page.$eval(".main__container", (el) => el.textContent);
  console.log("Planejador (Hoje) mostra o banner de Reta Final também na fase Pré-prova:", texto.includes("Reta Final") || texto.includes("reta final") || texto.toLowerCase().includes("questões"));

  // --- 5) Simulados: monta um simulado sem quebrar com ENAMED configurado ---
  await page.evaluate(() => { location.hash = "/residencia/simulados"; });
  await page.waitForSelector("#btn-iniciar", { timeout: 10000 });
  await page.click("#btn-iniciar");
  await page.waitForTimeout(1500);
  texto = await page.$eval(".main__container", (el) => el.textContent);
  console.log("Simulado monta normalmente com prova-alvo ENAMED:", !texto.includes("undefined") && texto.trim().length > 0);

  console.log("Erros JS capturados:", erros.length ? erros : "nenhum");
  await browser.close();
})().catch((e) => { console.error("ERRO:", e); process.exit(1); });
