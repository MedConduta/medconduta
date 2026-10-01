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
  page.on("console", (msg) => { if (msg.type() === "error") erros.push(msg.text()); });

  await page.goto("http://localhost:8744");
  await page.waitForSelector("#login-email", { timeout: 10000 });
  const bodyFont = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
  const h1Font = await page.evaluate(() => getComputedStyle(document.querySelector("h1")).fontFamily);
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  console.log("LOGIN — body font:", bodyFont);
  console.log("LOGIN — h1 font:", h1Font);
  console.log("LOGIN — bg:", bg);
  await page.screenshot({ path: "/tmp/claude-0/-home-user-medconduta/189a7ed4-3170-599a-adb3-6689b402ef7e/scratchpad/shot_login.png" });

  const email = `teste.cores.${Date.now()}@example.com`;
  await page.click("#login-alternar");
  await page.fill("#login-email", email);
  await page.fill("#login-password", "senha12345");
  await page.click("#login-submit");
  await page.waitForSelector("#sidebar-nav a", { timeout: 15000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: "/tmp/claude-0/-home-user-medconduta/189a7ed4-3170-599a-adb3-6689b402ef7e/scratchpad/shot_minha_preparacao.png", fullPage: true });

  const navColors = await page.evaluate(() => {
    const sections = document.querySelectorAll(".nav-section");
    return [...sections].map((s) => {
      const active = s.querySelector(".nav-link.is-active");
      return active ? getComputedStyle(active).color : null;
    });
  });
  console.log("Cores das seções ativas da sidebar:", navColors);

  await page.evaluate(() => { location.hash = "/residencia/conteudo"; });
  await page.waitForSelector(".content-area", { timeout: 10000 });
  await page.waitForTimeout(300);
  const areaColors = await page.evaluate(() => {
    return [...document.querySelectorAll(".content-area")].slice(0, 8).map((el) => getComputedStyle(el).borderLeftColor);
  });
  console.log("Cores do border-left de cada Grande Área:", areaColors);
  await page.screenshot({ path: "/tmp/claude-0/-home-user-medconduta/189a7ed4-3170-599a-adb3-6689b402ef7e/scratchpad/shot_conteudo.png", fullPage: true });

  await page.evaluate(() => { location.hash = "/residencia/questoes"; });
  await page.waitForTimeout(600);
  await page.screenshot({ path: "/tmp/claude-0/-home-user-medconduta/189a7ed4-3170-599a-adb3-6689b402ef7e/scratchpad/shot_questoes.png", fullPage: true });

  console.log("Erros JS capturados:", erros.length ? erros : "nenhum");
  await browser.close();
})().catch((e) => { console.error("ERRO:", e); process.exit(1); });
