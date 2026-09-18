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
  const email = `teste.questoes.${Date.now()}@example.com`;
  await page.goto("http://localhost:8744");
  await page.waitForSelector("#login-email", { timeout: 10000 });
  const heading = await page.textContent("h1");
  if (!heading.includes("Criar")) await page.click("#login-alternar");
  await page.fill("#login-email", email);
  await page.fill("#login-password", "senha12345");
  await page.click("#login-submit");
  await page.waitForSelector("#sidebar-nav a", { timeout: 15000 });

  await page.evaluate(() => { location.hash = "/residencia/questoes"; });
  await page.waitForSelector("#filtro-tema", { timeout: 10000 });

  const temasParaChecar = [
    "Transtorno Afetivo Bipolar",
    "Fraturas e Luxações Comuns",
    "Avaliação Pré-Anestésica e Classificação ASA",
    "Vigilância Epidemiológica e Notificação Compulsória",
    "Prematuridade e Recém-Nascido de Baixo Peso",
  ];

  for (const label of temasParaChecar) {
    await page.selectOption("#filtro-tema", { label });
    await page.waitForTimeout(250);
    const cards = await page.$$eval("#questoes-lista .card", (els) => els.length);
    console.log(label, "| questões:", cards);
  }

  // Testa fluxo de resposta na última seleção (Prematuridade)
  const primeiraOpcao = await page.$("#questoes-lista .question-option");
  if (primeiraOpcao) {
    await primeiraOpcao.click();
    await page.waitForTimeout(300);
    const explicacao = await page.$(".explanation-box");
    console.log("Explicação renderizada após responder:", !!explicacao);
  }

  await browser.close();
})().catch((e) => { console.error("ERRO:", e); process.exit(1); });
