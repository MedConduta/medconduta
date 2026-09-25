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

  const email = `teste.fase7.${Date.now()}@example.com`;
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

  // --- 1) Atalho "Fazer questões novas" aplica status=não respondidas (usuário novo: tudo não respondido).
  await page.click('[data-atalho="novas"]');
  await page.waitForTimeout(300);
  const tileNaoRespondidasAtivo = await page.$eval('#questoes-stats [data-status="nao-respondidas"]', (el) => el.classList.contains("is-active"));
  console.log("Atalho 'Fazer questões novas' ativa o filtro 'Não respondidas':", tileNaoRespondidasAtivo);

  // --- 2) Responder uma questão errando, depois usar o atalho "Revisar erros".
  await page.click('#questoes-stats [data-status="todas"]');
  await page.waitForTimeout(200);
  const primeiraOpcao = await page.$("#questoes-lista .card .question-option");
  await primeiraOpcao.click();
  await page.waitForTimeout(300);
  await page.click('[data-atalho="erros"]');
  await page.waitForTimeout(300);
  const tileErrosAtivo = await page.$eval('#questoes-stats [data-status="incorretas"]', (el) => el.classList.contains("is-active"));
  console.log("Atalho 'Revisar erros' ativa o filtro 'Erros':", tileErrosAtivo);

  // --- 3) Atalho "Questões recentes" define a ordenação como "Mais recentes".
  await page.selectOption("#filtro-ordenacao", "antigas");
  await page.waitForTimeout(200);
  await page.click('[data-atalho="recentes"]');
  await page.waitForTimeout(300);
  const ordenacaoRecentes = await page.$eval("#filtro-ordenacao", (el) => el.value === "recentes");
  console.log("Atalho 'Questões recentes' define ordenação 'Mais recentes':", ordenacaoRecentes);

  // --- 4) Salvar o filtro atual (com banca selecionada) e conferir que aparece na lista de salvos.
  await page.click('#questoes-stats [data-status="todas"]');
  await page.waitForTimeout(200);
  await page.selectOption("#filtro-banca", "ABC-SP");
  await page.waitForTimeout(200);
  await page.fill("#filtros-salvos-nome", "Meu filtro ABC-SP");
  await page.click("#filtros-salvos-criar");
  await page.waitForTimeout(400);
  const opcoesFiltrosSalvos = await page.$$eval("#filtros-salvos-select option", (els) => els.map((e) => e.textContent));
  console.log("Filtro salvo aparece na lista:", opcoesFiltrosSalvos.some((t) => t.includes("Meu filtro ABC-SP")));

  // --- 5) Trocar a banca, depois selecionar o filtro salvo e conferir que ele restaura o estado salvo (banca=ABC-SP).
  await page.selectOption("#filtro-banca", "todas");
  await page.waitForTimeout(200);
  await page.selectOption("#filtros-salvos-select", { label: "Meu filtro ABC-SP" });
  await page.waitForTimeout(400);
  const bancaRestaurada = await page.$eval("#filtro-banca", (el) => el.value === "ABC-SP");
  console.log("Selecionar o filtro salvo restaura banca=ABC-SP:", bancaRestaurada);
  const botaoRemoverVisivel = await page.$eval("#filtros-salvos-remover", (el) => getComputedStyle(el).display !== "none");
  console.log("Botão 'Remover' aparece quando um filtro salvo está selecionado:", botaoRemoverVisivel);

  // --- 6) Remover o filtro salvo e conferir que some da lista.
  await page.click("#filtros-salvos-remover");
  await page.waitForTimeout(400);
  const opcoesAposRemover = await page.$$eval("#filtros-salvos-select option", (els) => els.map((e) => e.textContent));
  console.log("Filtro salvo removido some da lista:", !opcoesAposRemover.some((t) => t.includes("Meu filtro ABC-SP")));

  console.log("Erros JS capturados:", erros.length ? erros : "nenhum");
  await browser.close();
})().catch((e) => {
  console.error("ERRO:", e);
  process.exit(1);
});
