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

  const email = `teste.status.${Date.now()}@example.com`;
  await page.goto("http://localhost:8744");
  await page.waitForSelector("#login-email", { timeout: 10000 });
  await page.click("#login-alternar");
  await page.fill("#login-email", email);
  await page.fill("#login-password", "senha12345");
  await page.click("#login-submit");
  await page.waitForSelector("#sidebar-nav a", { timeout: 15000 });
  await page.waitForTimeout(800);

  await page.evaluate(() => {
    location.hash = "/residencia/questoes";
  });
  await page.waitForSelector("#questoes-stats .stat-tile", { timeout: 20000 });
  await page.waitForTimeout(300);

  // --- 1) Os 6 contadores aparecem no topo com os rótulos certos.
  const rotulos = await page.$$eval("#questoes-stats .stat-tile__label", (els) => els.map((e) => e.textContent));
  console.log(
    "6 contadores aparecem (Total/Não respondidas/Respondidas/Acertos/Erros/Aproveitamento):",
    ["Total", "Não respondidas", "Respondidas", "Acertos", "Erros", "Aproveitamento"].every((r) => rotulos.includes(r))
  );

  // --- 2) Para um usuário novo: Total === Não respondidas, Respondidas/Acertos/Erros = 0.
  const valoresIniciais = await page.$$eval("#questoes-stats .stat-tile", (els) =>
    Object.fromEntries(els.map((el) => [el.querySelector(".stat-tile__label").textContent, el.querySelector(".stat-tile__value").textContent]))
  );
  console.log(
    "Usuário novo: Total === Não respondidas, e Respondidas/Acertos/Erros são 0:",
    valoresIniciais["Total"] === valoresIniciais["Não respondidas"] &&
      valoresIniciais["Respondidas"] === "0" &&
      valoresIniciais["Acertos"] === "0" &&
      valoresIniciais["Erros"] === "0"
  );

  // --- 3) Clicar em "Não respondidas" filtra e destaca o tile (is-active).
  await page.click('#questoes-stats [data-status="nao-respondidas"]');
  await page.waitForTimeout(300);
  const tileAtivo = await page.$eval('#questoes-stats [data-status="nao-respondidas"]', (el) => el.classList.contains("is-active"));
  console.log("Clicar em 'Não respondidas' ativa visualmente o tile:", tileAtivo);
  const cardsNaoRespondidas = await page.$$eval("#questoes-lista .card", (els) => els.length);
  console.log("Filtro 'Não respondidas' mostra resultados (usuário novo, tudo não respondido):", cardsNaoRespondidas > 0);

  // --- 4) Clicar de novo no mesmo tile desliga o filtro (toggle → Todas).
  await page.click('#questoes-stats [data-status="nao-respondidas"]');
  await page.waitForTimeout(300);
  const tileDesativado = await page.$eval('#questoes-stats [data-status="nao-respondidas"]', (el) => !el.classList.contains("is-active"));
  const tileTodosAtivo = await page.$eval('#questoes-stats [data-status="todas"]', (el) => el.classList.contains("is-active"));
  console.log("Clicar de novo desliga o filtro (volta para 'Todas'):", tileDesativado && tileTodosAtivo);

  // --- 5) Responder uma questão atualiza os contadores imediatamente (sem reload).
  const primeiraOpcao = await page.$("#questoes-lista .card .question-option");
  await primeiraOpcao.click();
  await page.waitForTimeout(300);
  const valoresApos1Resposta = await page.$$eval("#questoes-stats .stat-tile", (els) =>
    Object.fromEntries(els.map((el) => [el.querySelector(".stat-tile__label").textContent, el.querySelector(".stat-tile__value").textContent]))
  );
  console.log("Contador 'Respondidas' vira 1 imediatamente após responder:", valoresApos1Resposta["Respondidas"] === "1");
  console.log(
    "Contador 'Acertos' ou 'Erros' (um dos dois) vira 1:",
    valoresApos1Resposta["Acertos"] === "1" || valoresApos1Resposta["Erros"] === "1"
  );

  // --- 6) O card respondido mostra o badge "já acertou/errou" ao re-renderizar a lista.
  await page.click('#questoes-stats [data-status="respondidas"]');
  await page.waitForTimeout(300);
  const badgeJaRespondido = await page.$eval("#questoes-lista .card", (el) => el.textContent.includes("Já acertou") || el.textContent.includes("Já errou"));
  console.log("Filtro 'Respondidas' mostra a questão com badge de status:", badgeJaRespondido);
  const totalRespondidasFiltro = await page.$$eval("#questoes-lista .card", (els) => els.length);
  console.log("Filtro 'Respondidas' mostra exatamente 1 questão:", totalRespondidasFiltro === 1);

  // --- 7) Filtro de status combina com a hierarquia (contagens por nível respeitam o status).
  await page.click('#questoes-stats [data-status="todas"]');
  await page.waitForTimeout(200);
  await page.click('#questoes-stats [data-status="respondidas"]');
  await page.waitForTimeout(200);
  const areaComRespondida = await page.$$eval("#questoes-hierarquia .content-area", (els) => els.filter((el) => Number(el.querySelector(".content-area__count").textContent) > 0).length);
  console.log("Contagem por grande área respeita o filtro de status (só 1 área com >0):", areaComRespondida === 1);

  console.log("Erros JS capturados:", erros.length ? erros : "nenhum");
  await browser.close();
})().catch((e) => {
  console.error("ERRO:", e);
  process.exit(1);
});
