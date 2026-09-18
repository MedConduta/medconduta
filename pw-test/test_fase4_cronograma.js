const { chromium } = require("playwright");

function dataDaquiA(dias) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

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

  const email = `teste.fase4.${Date.now()}@example.com`;
  await page.goto("http://localhost:8744");
  await page.waitForSelector("#login-email", { timeout: 10000 });
  const heading = await page.textContent("h1");
  if (!heading.includes("Criar")) await page.click("#login-alternar");
  await page.fill("#login-email", email);
  await page.fill("#login-password", "senha12345");
  await page.click("#login-submit");
  await page.waitForSelector("#sidebar-nav a", { timeout: 15000 });

  // --- 1) Sem data configurada: "Hoje" deve mostrar o card neutro, sem quebrar
  await page.evaluate(() => { location.hash = "/residencia/planejador"; });
  await page.waitForTimeout(500);
  await page.click("#btn-gerar");
  await page.waitForTimeout(1000);
  let cardFase = await page.$eval(".main__container", (el) => el.textContent);
  console.log("Sem data — mostra aviso de fase não definida:", cardFase.includes("não definida"));

  // --- 2) Configura prova a ~20 dias (Reta Final)
  await page.evaluate(() => { location.hash = "/residencia/cronograma"; });
  await page.waitForSelector("#form-prova", { timeout: 10000 });
  await page.fill("#prova-data", dataDaquiA(20));
  await page.click("#form-prova button[type=submit]");
  await page.waitForTimeout(800);
  let textoResumo = await page.$eval(".main__container", (el) => el.textContent);
  console.log("Cronograma (20 dias) mostra 'Reta Final':", textoResumo.includes("Reta Final"));
  console.log("Cronograma (20 dias) mostra 'Você está aqui':", textoResumo.includes("Você está aqui"));

  await page.evaluate(() => { location.hash = "/residencia/planejador"; });
  await page.waitForTimeout(500);
  await page.click("#btn-gerar");
  await page.waitForTimeout(1000);
  let textoHoje = await page.$eval(".main__container", (el) => el.textContent);
  console.log("Hoje (20 dias) mostra 'Reta Final':", textoHoje.includes("Reta Final"));
  console.log("Hoje (20 dias) mostra dias até a prova:", /\d+ dias até a prova/.test(textoHoje));

  // --- 3) Configura prova a ~200 dias (Construção)
  await page.evaluate(() => { location.hash = "/residencia/cronograma"; });
  await page.waitForSelector("#form-prova", { timeout: 10000 });
  await page.fill("#prova-data", dataDaquiA(200));
  await page.click("#form-prova button[type=submit]");
  await page.waitForTimeout(800);
  textoResumo = await page.$eval(".main__container", (el) => el.textContent);
  console.log("Cronograma (200 dias) mostra 'Construção':", textoResumo.includes("Construção"));

  await page.evaluate(() => { location.hash = "/residencia/planejador"; });
  await page.waitForTimeout(500);
  await page.click("#btn-gerar");
  await page.waitForTimeout(1000);
  textoHoje = await page.$eval(".main__container", (el) => el.textContent);
  console.log("Hoje (200 dias) mostra 'Construção':", textoHoje.includes("Construção"));

  // --- 4) Smoke test de todas as rotas (incluindo /residencia/cronograma)
  const rotas = [
    "/residencia/conteudo",
    "/residencia/revisao",
    "/residencia/flashcards",
    "/residencia/questoes",
    "/residencia/planejador",
    "/residencia/cronograma",
    "/residencia/erros",
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
