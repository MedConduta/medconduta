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

  await page.goto("http://localhost:8744");
  await page.waitForSelector("#login-email", { timeout: 10000 });
  await page.click("#login-alternar");
  await page.fill("#login-email", `teste.reporte.${Date.now()}@example.com`);
  await page.fill("#login-password", "senha12345");
  await page.click("#login-submit");
  await page.waitForSelector("#sidebar-nav a", { timeout: 15000 });


  // --- 1) O card da questão tem o botão ⚠️ ao lado do favorito.
  await page.evaluate(() => {
    location.hash = "/residencia/questoes";
  });
  await page.waitForSelector("#questoes-lista .card .reportar-btn", { timeout: 30000 });
  const lado = await page.$eval("#questoes-lista .card .card-acoes", (el) => !!el.querySelector(".reportar-btn") && !!el.querySelector(".favorito-btn"));
  console.log("Botão ⚠️ aparece ao lado do favorito:", lado);

  // --- 2) Clicar abre as 6 categorias; escolher "gabarito", escrever detalhe e enviar.
  await page.click("#questoes-lista .card >> nth=0 >> .reportar-btn");
  await page.waitForSelector("#questoes-lista .reportar-painel", { timeout: 5000 });
  const opcoes = await page.$$eval("#questoes-lista .reportar-painel input[type=radio]", (els) => els.map((e) => e.value));
  console.log("Painel tem as 6 categorias:", opcoes.length === 6 && opcoes.includes("gabarito") && opcoes.includes("classificacao"), opcoes);
  await page.check('#questoes-lista .reportar-painel input[value="gabarito"]');
  await page.fill("#questoes-lista .reportar-painel textarea", "Gabarito oficial é a letra C.");
  await page.click("#questoes-lista .reportar-painel [data-reportar-enviar]");
  await page.waitForSelector("#questoes-lista .reportar-painel__ok", { timeout: 15000 });
  console.log("Confirmação de envio aparece:", true);

  // --- 3) O reporte foi salvo com questão, categoria e detalhe.
  const salvos = await page.evaluate(async () => {
    const { getAll } = await import("/app/db.js");
    return getAll("reportes_questoes");
  });
  const r = salvos[0] || {};
  console.log("Reporte salvo com categoria e detalhe:", salvos.length === 1 && r.categoria === "gabarito" && /letra C/.test(r.detalhe) && !!r.questaoId, JSON.stringify(r).slice(0, 120));

  console.log("Erros JS capturados:", erros.length ? erros : "nenhum");
  await browser.close();
})().catch((e) => {
  console.error("ERRO:", e);
  process.exit(1);
});
