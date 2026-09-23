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

  const email = `teste.mobileurl.${Date.now()}@example.com`;
  await page.goto("http://localhost:8744");
  await page.waitForSelector("#login-email", { timeout: 10000 });
  await page.click("#login-alternar");
  await page.fill("#login-email", email);
  await page.fill("#login-password", "senha12345");
  await page.click("#login-submit");
  await page.waitForSelector("#sidebar-nav a", { timeout: 15000 });
  await page.waitForTimeout(800);

  // --- 1) Estado de carregamento mostra skeleton, não tela em branco.
  // O HTML do skeleton é escrito de forma síncrona (antes do único `await` da
  // função, que é o carregarIndice()) — poll rápido para não perder a janela
  // em ambientes onde o índice já está em cache e resolve quase instantaneamente.
  await page.evaluate(() => { location.hash = "/residencia/questoes"; });
  const teveSkeleton = await page
    .waitForFunction(() => document.querySelector(".skeleton") !== null, { timeout: 2000, polling: 10 })
    .then(() => true)
    .catch(() => false);
  console.log("Estado de carregamento mostra skeleton:", teveSkeleton);
  await page.waitForSelector("#questoes-stats .stat-tile", { timeout: 20000 });
  await page.waitForTimeout(300);

  // --- 2) Selecionar filtros atualiza a URL (querystring refletindo o estado).
  await page.selectOption("#filtro-banca", "ABC-SP");
  await page.selectOption("#filtro-ano", { index: 1 });
  await page.click('#questoes-stats [data-status="nao-respondidas"]');
  await page.waitForTimeout(300);
  const urlComFiltros = await page.evaluate(() => location.hash);
  console.log("URL reflete banca=ABC-SP:", urlComFiltros.includes("banca=ABC-SP"));
  console.log("URL reflete status=nao-respondidas:", urlComFiltros.includes("status=nao-respondidas"));
  console.log("URL reflete ano=:", /ano=\d{4}/.test(urlComFiltros));

  // --- 3) Um refresh (nova navegação para a mesma URL) restaura os filtros.
  const urlCompleta = await page.evaluate(() => location.href);
  await page.goto(urlCompleta);
  await page.waitForSelector("#questoes-stats .stat-tile", { timeout: 20000 });
  await page.waitForTimeout(500);
  const bancaRestaurada = await page.$eval("#filtro-banca", (el) => el.value === "ABC-SP");
  const statusRestaurado = await page.$eval('#questoes-stats [data-status="nao-respondidas"]', (el) => el.classList.contains("is-active"));
  console.log("Refresh restaura o filtro de banca:", bancaRestaurada);
  console.log("Refresh restaura o filtro de status:", statusRestaurado);

  // --- 4) Painel de filtros mobile: botão "Filtros (N)" abre o bottom-sheet.
  await page.setViewportSize({ width: 375, height: 800 });
  await page.waitForTimeout(200);
  const rotuloToggle = await page.$eval("#questoes-filtros-toggle", (el) => el.textContent);
  console.log("Botão mobile mostra contagem de filtros ativos:", /Filtros \(\d+\)/.test(rotuloToggle));
  const painelFechadoAntes = await page.$eval("#questoes-filtros-painel", (el) => !el.classList.contains("is-open"));
  await page.click("#questoes-filtros-toggle");
  await page.waitForTimeout(200);
  const painelAbertoDepois = await page.$eval("#questoes-filtros-painel", (el) => el.classList.contains("is-open"));
  console.log("Tocar no botão 'Filtros' abre o painel (bottom sheet):", painelFechadoAntes && painelAbertoDepois);
  await page.click("#questoes-filtros-fechar");
  await page.waitForTimeout(200);
  const painelFechadoDepois = await page.$eval("#questoes-filtros-painel", (el) => !el.classList.contains("is-open"));
  console.log("Botão 'Fechar' fecha o painel:", painelFechadoDepois);
  await page.setViewportSize({ width: 1280, height: 800 });

  // --- 5) Estado vazio mostra botão "Limpar filtros" (não é uma tela em branco).
  await page.fill("#filtro-busca", "xyzxyzxyz-inexistente-123");
  await page.waitForTimeout(500);
  const estadoVazioTemBotao = await page.$("#questoes-limpar-vazio");
  console.log("Estado vazio mostra botão 'Limpar filtros':", !!estadoVazioTemBotao);
  if (estadoVazioTemBotao) await estadoVazioTemBotao.click();
  await page.waitForTimeout(300);
  const cardsAposLimpar = await page.$$eval("#questoes-lista .card", (els) => els.length);
  console.log("Clicar em 'Limpar filtros' do estado vazio restaura resultados:", cardsAposLimpar > 0);

  console.log("Erros JS capturados:", erros.length ? erros : "nenhum");
  await browser.close();
})().catch((e) => {
  console.error("ERRO:", e);
  process.exit(1);
});
