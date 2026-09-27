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
  page.on("console", (msg) => {
    if (msg.type() === "error" && !msg.text().includes("ERR_CERT_AUTHORITY_INVALID")) erros.push(msg.text());
  });

  const email = `teste.favoritos.${Date.now()}@example.com`;
  await page.goto("http://localhost:8744");
  await page.waitForSelector("#login-email", { timeout: 10000 });
  await page.click("#login-alternar");
  await page.fill("#login-email", email);
  await page.fill("#login-password", "senha12345");
  await page.click("#login-submit");
  await page.waitForSelector("#sidebar-nav a", { timeout: 15000 });
  await page.waitForTimeout(800);

  // --- 1) Navega para Questões e confirma que os cards têm botão de favoritar
  await page.click(".nav-link:has-text('Questões')");
  await page.waitForFunction(() => document.querySelector(".main__container")?.textContent.includes("Banco de questões"), { timeout: 20000 });
  await page.waitForSelector(".card .favorito-btn", { timeout: 15000 });
  const totalBotoes = await page.$$eval(".favorito-btn", (els) => els.length);
  console.log("Cards da lista têm botão de favoritar:", totalBotoes > 0);

  // --- 2) Tile "Favoritas" existe e começa em 0
  const tileFavoritasInicial = await page.$$eval(".stat-tile", (els) => {
    const t = els.find((el) => el.textContent.includes("Favoritas"));
    return t ? t.querySelector(".stat-tile__value")?.textContent.trim() : null;
  });
  console.log("Tile 'Favoritas' existe e começa em 0:", tileFavoritasInicial === "0");

  // --- 3) Favorita o primeiro card e confirma classe + contador
  const primeiroBtn = await page.$(".card .favorito-btn");
  const primeiroQid = await primeiroBtn.getAttribute("data-favorito-id");
  await primeiroBtn.click();
  await page.waitForTimeout(300);
  const ficouAtivo = await page.$eval(`.favorito-btn[data-favorito-id="${primeiroQid}"]`, (el) => el.classList.contains("is-ativo"));
  console.log("Botão fica com classe 'is-ativo' após clicar:", ficouAtivo);

  const tileFavoritasDepois = await page.$$eval(".stat-tile", (els) => {
    const t = els.find((el) => el.textContent.includes("Favoritas"));
    return t ? t.querySelector(".stat-tile__value")?.textContent.trim() : null;
  });
  console.log("Contador 'Favoritas' vai para 1:", tileFavoritasDepois === "1");

  // --- 4) Clicar no tile "Favoritas" filtra só as favoritadas
  await page.click('.stat-tile[data-favoritas="1"]');
  await page.waitForTimeout(300);
  const idsVisiveis = await page.$$eval(".opcoes[data-qid]", (els) => els.map((el) => el.dataset.qid));
  console.log("Filtro 'Favoritas' mostra só 1 questão (a favoritada):", idsVisiveis.length === 1 && idsVisiveis[0] === primeiroQid);

  // --- 5) URL reflete o filtro favoritas=1
  const hashComFiltro = await page.evaluate(() => window.location.hash);
  console.log("URL contém favoritas=1:", hashComFiltro.includes("favoritas=1"));

  // --- 6) Desfavoritar remove da lista filtrada (empty-state)
  await page.click(`.favorito-btn[data-favorito-id="${primeiroQid}"]`);
  await page.waitForTimeout(300);
  const textoVazio = await page.$eval(".main__container", (el) => el.textContent);
  console.log("Ao desfavoritar com filtro ativo, mostra estado vazio:", textoVazio.includes("Nenhuma questão encontrada"));

  // --- 7) Simulados: revisão pós-simulado também tem botão de favoritar
  await page.goto("http://localhost:8744/#/residencia/simulados");
  await page.waitForFunction(() => document.querySelector("#simulado-tamanho"), { timeout: 15000 });
  await page.selectOption("#simulado-tamanho", "20");
  await page.click("#btn-iniciar");
  await page.waitForFunction(() => document.querySelector(".question-option"), { timeout: 15000 });

  // Responde todas as questões clicando sempre na primeira alternativa, avançando com #btn-proxima
  for (let i = 0; i < 20; i++) {
    await page.click(".question-option");
    await page.waitForTimeout(80);
    const proximoBtn = await page.$("#btn-proxima:not([disabled])");
    if (proximoBtn) {
      await proximoBtn.click();
      await page.waitForTimeout(120);
    } else {
      break;
    }
  }
  await page.click("#btn-finalizar");
  await page.waitForFunction(() => document.querySelector(".main__container")?.textContent.includes("Resultado do simulado"), { timeout: 20000 });

  const temBotaoNoSimulado = await page.$(".plan-queue .favorito-btn");
  console.log("Revisão pós-simulado mostra botão de favoritar:", !!temBotaoNoSimulado);
  if (temBotaoNoSimulado) {
    await temBotaoNoSimulado.click();
    await page.waitForTimeout(200);
    const ativoSimulado = await temBotaoNoSimulado.evaluate((el) => el.classList.contains("is-ativo"));
    console.log("Botão do simulado fica ativo após clicar:", ativoSimulado);
  }

  console.log("\nErros de console/página:", erros.length ? erros : "nenhum");
  await page.waitForTimeout(300);
  await browser.close();
})();
