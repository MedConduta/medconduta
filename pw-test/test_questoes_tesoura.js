const { chromium } = require("playwright");

// 10 questões por página por padrão + tesourinha pra eliminar alternativas (mobile).
// Requer um convite livre no D1 local: CONVITE=ABCD-EFGH node pw-test/test_questoes_tesoura.js
(async () => {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  await page.route("https://medconduta-ai.medcondutaa.workers.dev/**", async (route) => {
    const req = route.request();
    const localUrl = req.url().replace("https://medconduta-ai.medcondutaa.workers.dev", "http://127.0.0.1:8787");
    const res = await page.request.fetch(localUrl, { method: req.method(), headers: req.headers(), data: req.postDataBuffer() || undefined, timeout: 60000 });
    await route.fulfill({ status: res.status(), headers: res.headers(), body: await res.body() });
  });
  const erros = [];
  page.on("pageerror", (e) => erros.push(e.message));

  await page.goto("http://localhost:8744");
  await page.waitForSelector("#login-email", { timeout: 10000 });
  await page.click(".login-switch a[data-modo=criar]");
  await page.fill("#login-email", `teste.tesoura.${Date.now()}@example.com`);
  await page.fill("#login-password", "senha12345");
  if (process.env.CONVITE) await page.fill("#login-convite", process.env.CONVITE);
  await page.click("#login-submit");
  await page.waitForSelector("#sidebar-nav a", { timeout: 15000, state: "attached" });
  await page.waitForTimeout(800);

  await page.evaluate(() => { location.hash = "/residencia/questoes"; });
  await page.waitForSelector("#questoes-lista .card", { timeout: 20000 });
  await page.waitForTimeout(300);

  const cards = await page.$$eval("#questoes-lista .card", (els) => els.length);
  const porPagina = await page.$eval("#filtro-quantidade", (el) => el.value);
  console.log("10 por página por padrão:", cards === 10 && porPagina === "10", cards, porPagina);

  const card = page.locator("#questoes-lista .card").first();
  const tesouraB = card.locator(".question-option__tesoura").nth(1);
  const opcaoB = card.locator(".question-option").nth(1);
  const box = await tesouraB.boundingBox();
  console.log("Tesoura com alvo de toque >= 44px:", box.width >= 44 && box.height >= 44);
  await tesouraB.tap();
  const riscada = await opcaoB.evaluate((el) => el.classList.contains("is-eliminada") && getComputedStyle(el.querySelector(".question-option__texto")).textDecorationLine.includes("line-through"));
  console.log("Alternativa B riscada após tesoura:", riscada);

  await opcaoB.tap();
  const naoRespondeu = await card.locator(".resultado").innerHTML();
  console.log("Tocar na alternativa riscada não responde:", naoRespondeu.trim() === "");

  await tesouraB.tap();
  console.log("Tesoura de novo restaura:", !(await opcaoB.evaluate((el) => el.classList.contains("is-eliminada"))));

  await card.locator(".question-option__tesoura").nth(2).tap();
  await card.locator(".question-option").nth(0).tap();
  await page.waitForTimeout(400);
  const respondeu = (await card.locator(".resultado").innerHTML()).includes("explanation-box");
  const tesourasDesativadas = await card.locator(".question-option__tesoura").evaluateAll((els) => els.every((e) => e.disabled));
  console.log("Responder funciona e trava as tesouras:", respondeu && tesourasDesativadas);

  const scrollX = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  console.log("Sem rolagem horizontal no mobile:", scrollX);
  await page.screenshot({ path: "/tmp/claude-0/tesoura_mobile.png", clip: await card.boundingBox() });

  console.log("Erros de página:", erros.length ? erros : "nenhum");
  await browser.close();
})();
