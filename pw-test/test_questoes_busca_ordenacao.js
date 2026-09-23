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

  const email = `teste.busca.${Date.now()}@example.com`;
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

  // --- 1) Busca textual filtra por tema/enunciado (debounce de 300ms).
  await page.fill("#filtro-busca", "hipertensão");
  await page.waitForTimeout(600);
  const temasAposBusca = await page.$$eval("#questoes-lista .card .badge--accent", (els) => els.map((e) => e.textContent.toLowerCase()));
  const enunciadosAposBusca = await page.$$eval("#questoes-lista .card > p:nth-of-type(2)", (els) => els.map((e) => e.textContent.toLowerCase()));
  const todosBatem = temasAposBusca.every((t, i) => t.includes("hipertens") || (enunciadosAposBusca[i] || "").includes("hipertens"));
  console.log("Busca por 'hipertensão' retorna resultados relevantes:", temasAposBusca.length > 0 && todosBatem);
  const chipBusca = await page.$eval("#questoes-chips", (el) => el.textContent);
  console.log("Chip de busca aparece:", chipBusca.includes("hipertensão"));

  // --- 2) Limpar a busca (via chip) restaura a lista completa.
  await page.click('#questoes-chips button:has-text("Busca:")');
  await page.waitForTimeout(300);
  const buscaLimpa = await page.$eval("#filtro-busca", (el) => el.value === "");
  console.log("Remover chip de busca limpa o campo:", buscaLimpa);

  // --- 3) Ordenação por "mais antigas" muda a ordem (ano crescente).
  // Escopado à banca 'ABC-SP' porque alguns lotes importados (ex.: "Estratégia MED")
  // têm `ano: null` — o próprio app trata isso corretamente (null vira 0 na comparação
  // numérica, então essas ficam primeiro em ordem crescente), mas isso não serve para
  // testar a ordenação numérica em si.
  await page.selectOption("#filtro-banca", "ABC-SP");
  await page.selectOption("#filtro-ordenacao", "antigas");
  await page.waitForTimeout(300);
  const anosAntigas = await page.$$eval("#questoes-lista .card .badge:nth-of-type(2)", (els) => els.slice(0, 5).map((e) => parseInt(e.textContent.split("·")[1], 10)));
  const crescente = anosAntigas.every((a, i) => i === 0 || a >= anosAntigas[i - 1]);
  console.log("Ordenação 'mais antigas' retorna anos em ordem crescente:", crescente, anosAntigas);
  await page.selectOption("#filtro-banca", "todas");

  // --- 4) Seletor de quantidade "10" muda o tamanho do lote inicial.
  await page.selectOption("#filtro-quantidade", "10");
  await page.waitForTimeout(300);
  const cardsCom10 = await page.$$eval("#questoes-lista .card", (els) => els.length);
  console.log("Selecionar quantidade '10' renderiza exatamente 10 cards:", cardsCom10 === 10);

  // --- 5) Selecionar "Todas" continua paginando em lotes (não despeja tudo de uma vez).
  await page.selectOption("#filtro-quantidade", "todas");
  await page.waitForTimeout(300);
  const cardsComTodas = await page.$$eval("#questoes-lista .card", (els) => els.length);
  console.log("Selecionar 'Todas' ainda pagina em lote (não despeja milhares):", cardsComTodas > 0 && cardsComTodas <= 100);

  console.log("Erros JS capturados:", erros.length ? erros : "nenhum");
  await browser.close();
})().catch((e) => {
  console.error("ERRO:", e);
  process.exit(1);
});
