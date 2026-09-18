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

  const email = `teste.smoke.${Date.now()}@example.com`;
  await page.goto("http://localhost:8744");
  await page.waitForSelector("#login-email", { timeout: 10000 });
  const heading = await page.textContent("h1");
  if (!heading.includes("Criar")) await page.click("#login-alternar");
  await page.fill("#login-email", email);
  await page.fill("#login-password", "senha12345");
  await page.click("#login-submit");
  await page.waitForSelector("#sidebar-nav a", { timeout: 15000 });

  const rotas = [
    "/residencia/conteudo",
    "/residencia/revisao",
    "/residencia/flashcards",
    "/residencia/questoes",
    "/residencia/planejador",
    "/pratica/prescricao",
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
