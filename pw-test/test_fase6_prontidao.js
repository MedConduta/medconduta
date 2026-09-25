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
  const erros = [];
  page.on("pageerror", (e) => erros.push(e.message));

  const email = `teste.fase6.${Date.now()}@example.com`;
  await page.goto("http://localhost:8744");
  await page.waitForSelector("#login-email", { timeout: 10000 });
  const heading = await page.textContent("h1");
  if (!heading.includes("Criar")) await page.click("#login-alternar");
  await page.fill("#login-email", email);
  await page.fill("#login-password", "senha12345");
  await page.click("#login-submit");
  await page.waitForSelector("#sidebar-nav a", { timeout: 15000 });

  // --- 1) Painel de Prontidão com usuário novo (sem progresso/respostas)
  await page.evaluate(() => { location.hash = "/residencia/prontidao"; });
  await page.waitForTimeout(800);
  let texto = await page.$eval(".main__container", (el) => el.textContent);
  console.log("Painel renderizou:", texto.includes("Índice de Prontidão"));
  console.log("Mostra Heatmap de fraquezas:", texto.includes("Heatmap de fraquezas"));
  console.log("Mostra Mapa de domínio:", texto.includes("Mapa de domínio"));
  const indiceTexto = await page.$eval(".main__container div[style*='font-size:48px']", (el) => el.textContent).catch(() => null);
  console.log("Índice numérico exibido:", indiceTexto);

  // --- 2) Responder algumas questões de Cardiologia (peso alto) corretamente e errando outras
  await page.evaluate(() => { location.hash = "/residencia/questoes"; });
  await page.waitForSelector("#questoes-lista .card .question-option", { timeout: 10000 });
  await page.waitForTimeout(400);
  // Escopado a #questoes-lista porque a árvore de hierarquia (Grande Área/Especialidade)
  // também usa a classe .card (mesmo padrão de app/views/curso.js).
  const cards = await page.$$("#questoes-lista .card");
  for (const card of cards.slice(0, 3)) {
    const opcoes = await card.$$(".question-option");
    if (!opcoes.length) continue;
    await opcoes[0].click();
    await page.waitForTimeout(400);
  }

  // --- 3) Conferir que o painel de prontidão reflete alguma mudança sem quebrar
  await page.evaluate(() => { location.hash = "/residencia/prontidao"; });
  await page.waitForTimeout(800);
  texto = await page.$eval(".main__container", (el) => el.textContent);
  console.log("Painel renderizou após responder questões:", texto.includes("Índice de Prontidão"));
  console.log("Mostra pelo menos um badge de quadrante (emoji):", /🔴|🟠|🟢|🟡|⚪/.test(texto));

  // --- 4) Smoke test geral
  const rotas = [
    "/residencia/conteudo",
    "/residencia/questoes",
    "/residencia/erros",
    "/residencia/planejador",
    "/residencia/cronograma",
    "/residencia/prontidao",
  ];
  for (const rota of rotas) {
    await page.evaluate((r) => { location.hash = r; }, rota);
    await page.waitForTimeout(500);
    const temMain = await page.$(".main__container");
    console.log(rota, "| renderizou:", !!temMain);
  }

  console.log("Erros JS capturados:", erros.length ? erros : "nenhum");
  await browser.close();
})().catch((e) => { console.error("ERRO:", e); process.exit(1); });
