const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const page = await browser.newPage({ viewport: { width: 393, height: 851 } });
  await page.route("https://medconduta-ai.medcondutaa.workers.dev/**", async (route) => {
    const req = route.request();
    const localUrl = req.url().replace("https://medconduta-ai.medcondutaa.workers.dev", "http://127.0.0.1:8787");
    const res = await page.request.fetch(localUrl, { method: req.method(), headers: req.headers(), data: req.postDataBuffer() || undefined });
    await route.fulfill({ status: res.status(), headers: res.headers(), body: await res.body() });
  });
  const erros = [];
  page.on("pageerror", (e) => erros.push(e.message));

  const email = `teste.fix.mobile.${Date.now()}@example.com`;
  await page.goto("http://localhost:8744");
  await page.waitForSelector("#login-email", { timeout: 10000 });
  await page.click("#login-alternar");
  await page.fill("#login-email", email);
  await page.fill("#login-password", "senha12345");
  await page.click("#login-submit");
  await page.waitForSelector("#sidebar-nav a", { timeout: 15000 });

  // Abre o menu mobile e vai para Curso (view do print do usuário)
  await page.evaluate(() => { location.hash = "/residencia/curso"; });
  await page.waitForSelector(".content-area", { timeout: 10000 });
  await page.waitForTimeout(400);
  // Garante que pelo menos uma semana está aberta com itens visíveis
  const detailsAberto = await page.evaluate(() => {
    const d = document.querySelector("details.content-area");
    if (d && !d.open) d.open = true;
    return !!d;
  });
  await page.waitForTimeout(200);
  await page.screenshot({ path: "/tmp/claude-0/-home-user-medconduta/189a7ed4-3170-599a-adb3-6689b402ef7e/scratchpad/shot_curso_mobile_fix.png", fullPage: true });

  await page.evaluate(() => { location.hash = "/residencia/conteudo"; });
  await page.waitForSelector(".content-area", { timeout: 10000 });
  await page.waitForTimeout(300);
  await page.evaluate(() => { const d = document.querySelector("details.content-area"); if (d) d.open = true; });
  await page.waitForTimeout(200);
  await page.screenshot({ path: "/tmp/claude-0/-home-user-medconduta/189a7ed4-3170-599a-adb3-6689b402ef7e/scratchpad/shot_conteudo_mobile_fix.png", fullPage: true });

  console.log("details encontrado:", detailsAberto);
  console.log("Erros JS capturados:", erros.length ? erros : "nenhum");
  await browser.close();
})().catch((e) => { console.error("ERRO:", e); process.exit(1); });
