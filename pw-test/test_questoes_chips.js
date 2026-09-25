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

  const email = `teste.chips.${Date.now()}@example.com`;
  await page.goto("http://localhost:8744");
  await page.waitForSelector("#login-email", { timeout: 10000 });
  await page.click("#login-alternar");
  await page.fill("#login-email", email);
  await page.fill("#login-password", "senha12345");
  await page.click("#login-submit");
  await page.waitForSelector("#sidebar-nav a", { timeout: 15000 });
  await page.waitForTimeout(800);

  await page.evaluate(() => { location.hash = "/residencia/questoes"; });
  await page.waitForSelector("#questoes-stats .stat-tile", { timeout: 20000 });
  await page.waitForTimeout(300);

  // --- 1) Sem filtros ativos, a barra de chips fica oculta.
  const chipsOcultosInicio = await page.$eval("#questoes-chips", (el) => getComputedStyle(el).display === "none");
  console.log("Sem filtros ativos, chips ficam ocultos:", chipsOcultosInicio);

  // --- 2) Selecionar uma grande área mostra um chip "Área: X" + botão "Limpar filtros".
  await page.selectOption("#filtro-grande-area", { index: 1 });
  await page.waitForTimeout(300);
  let textoChips = await page.$eval("#questoes-chips", (el) => el.textContent);
  console.log("Chip de área aparece:", /Área:/.test(textoChips));
  console.log("Botão 'Limpar filtros' aparece:", /Limpar filtros/.test(textoChips));

  // --- 3) Selecionar um ano específico adiciona um chip "Ano: X" e filtra a lista.
  const anos = await page.$$eval("#filtro-ano option", (els) => els.map((e) => e.value));
  const anoEscolhido = anos.find((a) => a !== "todos");
  await page.selectOption("#filtro-ano", anoEscolhido);
  await page.waitForTimeout(300);
  textoChips = await page.$eval("#questoes-chips", (el) => el.textContent);
  console.log(`Chip de ano (${anoEscolhido}) aparece:`, textoChips.includes(`Ano: ${anoEscolhido}`));
  const cardsComAno = await page.$$eval("#questoes-lista .card .badge", (els) => els.map((e) => e.textContent));
  const todosDoAno = cardsComAno.some((t) => t.includes(String(anoEscolhido)));
  console.log("Lista reflete o filtro de ano combinado com a área:", todosDoAno);

  // --- 4) Remover o chip de ano (clique no X) reseta o select e o filtro, mantendo a área.
  const chipAnoBtn = await page.$(`#questoes-chips button:has-text("Ano: ${anoEscolhido}")`);
  await chipAnoBtn.click();
  await page.waitForTimeout(300);
  const anoSelectResetado = await page.$eval("#filtro-ano", (el) => el.value === "todos");
  const chipAreaAindaAtivo = (await page.$eval("#questoes-chips", (el) => el.textContent)).includes("Área:");
  console.log("Remover chip de ano reseta o select e mantém o chip de área:", anoSelectResetado && chipAreaAindaAtivo);

  // --- 5) "Limpar filtros" reseta tudo (área, banca, ano, status) e oculta a barra de chips.
  await page.selectOption("#filtro-banca", { index: 1 }).catch(() => {});
  await page.click('#questoes-stats [data-status="nao-respondidas"]');
  await page.waitForTimeout(300);
  await page.click("#questoes-chips button:has-text('Limpar filtros')");
  await page.waitForTimeout(300);
  const tudoLimpo =
    (await page.$eval("#filtro-banca", (el) => el.value === "todas")) &&
    (await page.$eval("#filtro-ano", (el) => el.value === "todos")) &&
    (await page.$eval("#questoes-chips", (el) => getComputedStyle(el).display === "none"));
  console.log("'Limpar filtros' reseta hierarquia + banca + ano + status:", tudoLimpo);
  const statusTodasAtivo = await page.$eval('#questoes-stats [data-status="todas"]', (el) => el.classList.contains("is-active"));
  console.log("Status volta para 'Todas' após limpar:", statusTodasAtivo);

  console.log("Erros JS capturados:", erros.length ? erros : "nenhum");
  await browser.close();
})().catch((e) => {
  console.error("ERRO:", e);
  process.exit(1);
});
