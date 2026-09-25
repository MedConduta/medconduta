const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const page = await browser.newPage();
  await page.route("https://medconduta-ai.medcondutaa.workers.dev/**", async (route) => {
    const req = route.request();
    const localUrl = req.url().replace("https://medconduta-ai.medcondutaa.workers.dev", "http://127.0.0.1:8787");
    const res = await page.request.fetch(localUrl, { method: req.method(), headers: req.headers(), data: req.postDataBuffer() || undefined, timeout: 60000 });
    await route.fulfill({ status: res.status(), headers: res.headers(), body: await res.body() });
  });
  const erros = [];
  page.on("pageerror", (e) => erros.push(e.message));

  const email = `teste.estrat.${Date.now()}@example.com`;
  await page.goto("http://localhost:8744");
  await page.waitForSelector("#login-email", { timeout: 10000 });
  await page.click("#login-alternar");
  await page.fill("#login-email", email);
  await page.fill("#login-password", "senha12345");
  await page.click("#login-submit");
  await page.waitForSelector("#sidebar-nav a", { timeout: 15000 });
  await page.waitForTimeout(800);

  await page.evaluate(() => { location.hash = "/residencia/questoes"; });
  await page.waitForSelector("#filtro-grande-area", { timeout: 20000 });
  await page.waitForTimeout(300);

  // --- 1) Nenhuma grande área "Outros" aparece mais no select (estratificação corrigida).
  const areas = await page.$$eval("#filtro-grande-area option", (els) => els.map((e) => e.textContent.trim()).filter(Boolean));
  console.log("Grande áreas reais no select:", areas);
  console.log("Nenhuma área é 'Outros':", !areas.some((a) => a.includes("Outros")));

  // --- 2) O total de questões bate com o total geral (nenhuma questão "perdida").
  const totalGeral = await page.$eval('#questoes-stats [data-status="todas"] .stat-tile__value', (el) => Number(el.textContent));
  console.log("Total geral de questões:", totalGeral);
  console.log("Total é bem maior que antes da correção (>27000):", totalGeral > 27000);

  // --- 3) Hepatologia agora aparece dentro de Clínica Médica (antes caía em "Outros").
  const rotuloClinica = areas.find((a) => a.includes("Clínica Médica"));
  await page.selectOption("#filtro-grande-area", { label: rotuloClinica });
  await page.waitForTimeout(300);
  const especialidadesClinica = await page.$$eval("#filtro-especialidade option", (els) => els.map((e) => e.textContent.trim()).filter(Boolean));
  console.log("Hepatologia aparece dentro de Clínica Médica:", especialidadesClinica.some((e) => e.includes("Hepatologia")));

  // --- 4) Um tema recém-criado (ex.: Parada Cardiorrespiratória) tem questões de verdade associadas.
  const rotuloCardio = especialidadesClinica.find((e) => e.includes("Cardiologia"));
  if (rotuloCardio) {
    await page.selectOption("#filtro-especialidade", { label: rotuloCardio });
    await page.waitForTimeout(300);
    const temas = await page.$$eval("#filtro-tema option", (els) => els.map((e) => e.textContent.trim()).filter(Boolean));
    console.log("Tema novo 'Parada Cardiorrespiratória' aparece com questões:", temas.some((t) => t.includes("Parada Cardiorrespiratória")));
  }

  console.log("Erros JS capturados:", erros.length ? erros : "nenhum");
  await browser.close();
})().catch((e) => {
  console.error("ERRO:", e);
  process.exit(1);
});
