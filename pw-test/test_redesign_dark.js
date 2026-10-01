const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.route("https://medconduta-ai.medcondutaa.workers.dev/**", async (route) => {
    const req = route.request();
    const localUrl = req.url().replace("https://medconduta-ai.medcondutaa.workers.dev", "http://127.0.0.1:8787");
    const res = await page.request.fetch(localUrl, { method: req.method(), headers: req.headers(), data: req.postDataBuffer() || undefined });
    await route.fulfill({ status: res.status(), headers: res.headers(), body: await res.body() });
  });
  const erros = [];
  page.on("pageerror", (e) => erros.push(e.message));

  const email = `teste.cores.dark.${Date.now()}@example.com`;
  await page.goto("http://localhost:8744");
  await page.waitForSelector("#login-email", { timeout: 10000 });
  await page.click("#login-alternar");
  await page.fill("#login-email", email);
  await page.fill("#login-password", "senha12345");
  await page.click("#login-submit");
  await page.waitForSelector("#sidebar-nav a", { timeout: 15000 });

  // Força tema escuro via o botão de tema da sidebar (ciclo: sistema -> escuro -> claro)
  await page.click("#theme-toggle");
  await page.waitForTimeout(200);
  let theme = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
  if (theme !== "dark") { await page.click("#theme-toggle"); await page.waitForTimeout(200); }
  theme = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
  console.log("Tema atual:", theme);

  await page.evaluate(() => { location.hash = "/residencia/conteudo"; });
  await page.waitForSelector(".content-area", { timeout: 10000 });
  await page.waitForTimeout(300);
  const areaColors = await page.evaluate(() => [...document.querySelectorAll(".content-area")].slice(0, 5).map((el) => getComputedStyle(el).borderLeftColor));
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  console.log("Dark — bg:", bg);
  console.log("Dark — cores das áreas:", areaColors);
  await page.screenshot({ path: "/tmp/claude-0/-home-user-medconduta/189a7ed4-3170-599a-adb3-6689b402ef7e/scratchpad/shot_conteudo_dark.png", fullPage: false });

  console.log("Erros JS capturados:", erros.length ? erros : "nenhum");
  await browser.close();
})().catch((e) => { console.error("ERRO:", e); process.exit(1); });
