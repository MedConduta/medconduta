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
  const erros = [];
  page.on("pageerror", (e) => erros.push(e.message));

  const email = `teste.fase5.${Date.now()}@example.com`;
  await page.goto("http://localhost:8744");
  await page.waitForSelector("#login-email", { timeout: 10000 });
  const heading = await page.textContent("h1");
  if (!heading.includes("Criar")) await page.click("#login-alternar");
  await page.fill("#login-email", email);
  await page.fill("#login-password", "senha12345");
  await page.click("#login-submit");
  await page.waitForSelector("#sidebar-nav a", { timeout: 15000 });

  // --- 1) Meus Erros vazio de início
  await page.evaluate(() => { location.hash = "/residencia/erros"; });
  await page.waitForTimeout(600);
  let texto = await page.$eval(".main__container", (el) => el.textContent);
  console.log("Meus Erros (vazio) mostra estado neutro:", texto.includes("Nenhum erro registrado"));

  // --- 2) Ir para questões e errar deliberadamente uma questão
  await page.evaluate(() => { location.hash = "/residencia/questoes"; });
  await page.waitForSelector(".card .question-option", { timeout: 10000 });

  // Tenta clicar em alternativas até garantir pelo menos 1 erro (clica sempre na primeira opção de cada questão)
  const primeiraQuestaoCard = await page.$(".card");
  const primeiraOpcao = await primeiraQuestaoCard.$(".question-option");
  await primeiraOpcao.click();
  await page.waitForTimeout(500);
  const resultadoTexto = await primeiraQuestaoCard.$eval(".resultado", (el) => el.textContent);
  console.log("Resultado da 1ª tentativa:", resultadoTexto.includes("Correto") ? "acertou" : "errou");

  // Se acertou de primeira (alternativa A era a correta), tenta outro card clicando na 2ª opção
  let idQuestaoErrada = null;
  if (resultadoTexto.includes("Incorreto")) {
    idQuestaoErrada = await primeiraQuestaoCard.$eval(".opcoes", (el) => el.dataset.qid);
  } else {
    const cards = await page.$$(".card");
    for (const card of cards.slice(1, 6)) {
      const opcoes = await card.$$(".question-option");
      if (opcoes.length < 2) continue;
      await opcoes[1].click();
      await page.waitForTimeout(400);
      const res = await card.$eval(".resultado", (el) => el.textContent).catch(() => "");
      if (res.includes("Incorreto")) {
        idQuestaoErrada = await card.$eval(".opcoes", (el) => el.dataset.qid);
        break;
      }
    }
  }
  console.log("Questão errada registrada:", !!idQuestaoErrada);

  // --- 3) Meus Erros deve agora mostrar essa questão como vencida
  await page.evaluate(() => { location.hash = "/residencia/erros"; });
  await page.waitForTimeout(600);
  texto = await page.$eval(".main__container", (el) => el.textContent);
  console.log("Meus Erros mostra 'Para revisar agora' > 0:", /Para revisar agora/.test(texto) && !texto.includes("Nenhum erro registrado"));
  const temListaErros = await page.$("#erros-lista .card");
  console.log("Lista de erros renderizou pelo menos 1 questão:", !!temListaErros);

  // --- 4) Resolver a questão errada corretamente dentro de Meus Erros
  if (temListaErros) {
    const opcoesErro = await page.$(".opcoes");
    const qidErro = await opcoesErro.getAttribute("data-qid");
    // Precisamos saber a alternativa correta — vamos tentar clicar em todas até acertar
    const botoes = await opcoesErro.$$(".question-option");
    for (const btn of botoes) {
      await btn.click();
      await page.waitForTimeout(400);
      const resultadoDaCard = await page.$eval(`.resultado[data-qid="${qidErro}"]`, (el) => el.textContent).catch(() => "");
      if (resultadoDaCard) break;
    }
  }

  // --- 5) Verificar "Hoje" reflete a revisão de erro no card de fase/agenda (sem quebrar)
  await page.evaluate(() => { location.hash = "/residencia/planejador"; });
  await page.waitForTimeout(500);
  await page.click("#btn-gerar");
  await page.waitForTimeout(1000);
  const textoHoje = await page.$eval(".main__container", (el) => el.textContent);
  console.log("Hoje renderizou sem erro após integração de Meus Erros:", textoHoje.length > 0);

  console.log("Erros JS capturados:", erros.length ? erros : "nenhum");
  await browser.close();
})().catch((e) => { console.error("ERRO:", e); process.exit(1); });
