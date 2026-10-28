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
  await page.click(".login-switch a[data-modo=criar]");
  await page.fill("#login-email", `teste.cards.${Date.now()}@example.com`);
  await page.fill("#login-password", "senha12345");
  await page.click("#login-submit");
  await page.waitForSelector("#sidebar-nav a", { timeout: 15000 });

  // --- 1) Responder (errando) uma questão NÃO mostra mais "Criar flashcard".
  await page.evaluate(() => {
    location.hash = "/residencia/questoes";
  });
  await page.waitForSelector("#questoes-lista .card .question-option", { timeout: 30000 });
  const correta = await page.evaluate(async () => {
    const id = document.querySelector("#questoes-lista .opcoes").dataset.qid;
    const { obterQuestoes } = await import("/app/bancoQuestoes.js");
    return (await obterQuestoes([id])).get(id).correta;
  });
  const errada = correta === 0 ? 1 : 0;
  await page.click(`#questoes-lista .card >> nth=0 >> .question-option >> nth=${errada}`);
  await page.waitForSelector("#questoes-lista .resultado .explanation-box", { timeout: 15000 });
  const temBotao = await page.$("#questoes-lista .resultado .criar-card");
  console.log("Botão 'Criar flashcard' não aparece no comentário:", !temBotao);

  // --- 2) "Gerar cards dos meus erros" cria o card da questão errada; o verso traz a resposta.
  await page.evaluate(() => {
    location.hash = "/residencia/flashcards?baralho=questoes";
  });
  await page.waitForSelector("#btn-gerar-cards", { timeout: 20000 });
  await page.click("#btn-gerar-cards");
  await page.waitForFunction(() => {
    const s = document.querySelector("#gerar-cards-status");
    return s && !s.hidden && !/Gerando/.test(s.textContent);
  }, null, { timeout: 30000 });
  await page.evaluate(() => {
    location.hash = "/residencia/flashcards?baralho=questoes&_=" + Date.now();
  });
  await page.waitForSelector("#btn-revisar", { timeout: 20000 });
  const totalBaralho = await page.$eval(".stat-row .stat-tile:last-child .stat-tile__value", (el) => Number(el.textContent));
  console.log("Baralho 'Das minhas questões' tem o card da questão errada:", totalBaralho === 1, totalBaralho);
  await page.click("#btn-revisar");
  await page.waitForSelector("#btn-mostrar", { timeout: 10000 });
  await page.click("#btn-mostrar");
  const verso = await page.$eval(".card .enunciado-texto + *, .card div .enunciado-texto", (el) => el.textContent);
  console.log("Verso começa pela letra da alternativa correta:", verso.trim().startsWith(`${String.fromCharCode(65 + correta)})`), verso.slice(0, 60));

  // --- 4) Com tema, gera até 20 cards das questões do tema.
  const temaId = await page.evaluate(async () => {
    const { registros } = await (await import("/app/bancoQuestoes.js")).carregarIndiceBanco();
    return registros.find((r) => r.temaId === "pancreatite-aguda")?.temaId || registros[0].temaId;
  });
  await page.evaluate((t) => {
    location.hash = `/residencia/flashcards?tema=${t}`;
  }, temaId);
  await page.waitForSelector("#btn-gerar-cards", { timeout: 20000 });
  await page.click("#btn-gerar-cards");
  await page.waitForFunction(() => {
    const s = document.querySelector("#gerar-cards-status");
    return s && !s.hidden && /criado/.test(s.textContent);
  }, null, { timeout: 60000 });
  const criados = Number((await page.$eval("#gerar-cards-status", (el) => el.textContent)).match(/\d+/)[0]);
  console.log("Gerar cards do tema cria até 20 cards:", criados > 0 && criados <= 20, criados);

  console.log("Erros JS capturados:", erros.length ? erros : "nenhum");
  await browser.close();
})().catch((e) => {
  console.error("ERRO:", e);
  process.exit(1);
});
