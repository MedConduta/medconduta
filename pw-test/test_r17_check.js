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
  const email = `teste.r17.${Date.now()}@example.com`;
  await page.goto("http://localhost:8744");
  await page.waitForSelector("#login-email", { timeout: 10000 });
  const heading = await page.textContent("h1");
  if (!heading.includes("Criar")) await page.click("#login-alternar");
  await page.fill("#login-email", email);
  await page.fill("#login-password", "senha12345");
  await page.click("#login-submit");
  await page.waitForSelector("#sidebar-nav a", { timeout: 15000 });

  const ids = ["depressao-maior","transtorno-bipolar","transtornos-ansiosos","toc","esquizofrenia-psicoses","transtornos-uso-substancias","emergencias-psiquiatricas","transtornos-alimentares","transtornos-somatoformes","tdah-tea"];
  for (const id of ids) {
    await page.evaluate((i) => { location.hash = `/residencia/conteudo/${i}`; }, id);
    await page.waitForTimeout(300);
    await page.waitForSelector(".prose", { timeout: 10000 });
    const examFocus = await page.$eval(".exam-focus", (el) => el.textContent).catch(() => null);
    const tables = await page.$$eval(".table-wrap table", (els) => els.length);
    console.log(id, "EXAM_FOCUS_LEN:", examFocus ? examFocus.length : null, "TABLES:", tables);
  }

  await page.evaluate(() => { location.hash = "/residencia/questoes"; });
  await page.waitForTimeout(500);
  const selectExists = await page.$("#questoes-filtro-tema");
  if (selectExists) {
    await page.selectOption("#questoes-filtro-tema", { label: "Depressão Maior (Transtorno Depressivo Maior)" }).catch(() => {});
    await page.waitForTimeout(300);
    const qCount = await page.$$eval(".questao-card", (els) => els.length).catch(() => -1);
    console.log("Questões filtradas para Depressão Maior:", qCount);
  }

  await browser.close();
})().catch((e) => { console.error("ERRO:", e); process.exit(1); });
