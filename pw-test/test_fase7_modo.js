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

  const email = `teste.fase7.${Date.now()}@example.com`;
  await page.goto("http://localhost:8744");
  await page.waitForSelector("#login-email", { timeout: 10000 });
  const heading = await page.textContent("h1");
  if (!heading.includes("Criar")) await page.click("#login-alternar");
  await page.fill("#login-email", email);
  await page.fill("#login-password", "senha12345");
  await page.click("#login-submit");
  await page.waitForSelector("#sidebar-nav a", { timeout: 15000 });

  // --- 1) Prova a 120 dias (fase Consolidação, checkpoint 35% de conteúdo)
  // Usuário novo tem 0% de conteúdo concluído -> bem abaixo do checkpoint -> Modo Recuperação
  await page.evaluate(() => { location.hash = "/residencia/cronograma"; });
  await page.waitForSelector("#form-prova", { timeout: 10000 });
  await page.fill("#prova-data", dataDaquiA(120));
  await page.click("#form-prova button[type=submit]");
  await page.waitForTimeout(800);
  let texto = await page.$eval(".main__container", (el) => el.textContent);
  console.log("Cronograma (120 dias, 0% conteúdo) mostra Modo Recuperação:", texto.includes("Modo Recuperação"));
  console.log("Cronograma NÃO mostra Modo Reta Final nesse cenário:", !texto.includes("Modo Reta Final"));

  await page.evaluate(() => { location.hash = "/residencia/planejador"; });
  await page.waitForTimeout(500);
  await page.click("#btn-gerar");
  await page.waitForTimeout(1000);
  let textoHoje = await page.$eval(".main__container", (el) => el.textContent);
  console.log("Hoje (120 dias, 0% conteúdo) mostra Modo Recuperação:", textoHoje.includes("Modo Recuperação"));

  // --- 2) Prova a 20 dias (Reta Final) com 0% de conteúdo -> deve mostrar SÓ Reta Final, não Recuperação
  await page.evaluate(() => { location.hash = "/residencia/cronograma"; });
  await page.waitForSelector("#form-prova", { timeout: 10000 });
  await page.fill("#prova-data", dataDaquiA(20));
  await page.click("#form-prova button[type=submit]");
  await page.waitForTimeout(800);
  texto = await page.$eval(".main__container", (el) => el.textContent);
  console.log("Cronograma (20 dias, 0% conteúdo) mostra Modo Reta Final:", texto.includes("Modo Reta Final"));
  console.log("Cronograma (20 dias) NÃO mostra Modo Recuperação (Reta Final prevalece):", !texto.includes("Modo Recuperação"));

  await page.evaluate(() => { location.hash = "/residencia/planejador"; });
  await page.waitForTimeout(500);
  await page.click("#btn-gerar");
  await page.waitForTimeout(1000);
  textoHoje = await page.$eval(".main__container", (el) => el.textContent);
  console.log("Hoje (20 dias) mostra Modo Reta Final:", textoHoje.includes("Modo Reta Final"));

  // --- 3) Smoke test geral
  const rotas = [
    "/residencia/conteudo",
    "/residencia/revisao",
    "/residencia/flashcards",
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
