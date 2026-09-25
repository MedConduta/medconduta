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

  const email = `teste.questoes.${Date.now()}@example.com`;
  await page.goto("http://localhost:8744");
  await page.waitForSelector("#login-email", { timeout: 10000 });
  await page.click("#login-alternar");
  await page.fill("#login-email", email);
  await page.fill("#login-password", "senha12345");
  await page.click("#login-submit");
  await page.waitForSelector("#sidebar-nav a", { timeout: 15000 });
  await page.waitForTimeout(800);

  const totalCuradas = await page.evaluate(async () => {
    const res = await fetch("data/questoes.json");
    return (await res.json()).length;
  });

  await page.evaluate(() => {
    location.hash = "/residencia/questoes";
  });
  await page.waitForSelector("#questoes-lista .card", { timeout: 20000 });
  await page.waitForTimeout(300);

  // --- 1) Não renderiza tudo de uma vez — só um lote (20) no DOM inicial, não os 4000+ totais.
  const cardsIniciais = await page.$$eval("#questoes-lista .card", (els) => els.length);
  console.log(`Total de questões curadas no banco: ${totalCuradas}`);
  console.log(`Cards renderizados no DOM logo após o load (deve ser 20, não ${totalCuradas}):`, cardsIniciais);
  console.log("Renderização inicial é paginada (não despeja o banco inteiro):", cardsIniciais > 0 && cardsIniciais <= 20 && cardsIniciais < totalCuradas);

  const contagemTexto = await page.$eval("#questoes-contagem", (el) => el.textContent);
  console.log("Contador mostra total de questões encontradas:", contagemTexto.includes(String(totalCuradas)));

  // --- 2) Paginação numerada: clicar na página 2 troca o lote de cards (sem acumular)
  // e mostra a página ativa destacada, em vez de scroll infinito.
  await page.click('#questoes-paginacao [data-pagina="2"]');
  await page.waitForTimeout(400);
  const cardsPagina2 = await page.$$eval("#questoes-lista .card", (els) => els.length);
  console.log(`Cards na página 2 (deve ser <= 20, sem acumular com a página 1):`, cardsPagina2);
  console.log("Paginação troca o lote em vez de acumular:", cardsPagina2 > 0 && cardsPagina2 <= 20);
  const paginaAtivaMarcada = await page.$eval('#questoes-paginacao .pag-btn.is-active', (el) => el.textContent.trim());
  console.log("Página 2 fica destacada como ativa:", paginaAtivaMarcada === "2");
  const urlComPagina = await page.evaluate(() => location.hash.includes("pagina=2"));
  console.log("URL reflete a página atual (pagina=2):", urlComPagina);

  await page.click('#questoes-paginacao [data-pagina="1"]');
  await page.waitForTimeout(400);

  // --- 3) Responder uma questão mostra o resultado e não trava a página.
  const primeiraOpcao = await page.$("#questoes-lista .card .question-option");
  await primeiraOpcao.click();
  await page.waitForTimeout(300);
  const resultadoApareceu = await page.$eval("#questoes-lista .card .resultado", (el) => el.innerHTML.trim().length > 0);
  console.log("Responder uma questão exibe o resultado (correto/incorreto):", resultadoApareceu);

  // --- 4) Filtro por tema (hierarquia Grande Área › Especialidade › Tema) tem teste
  // próprio e mais completo em test_questoes_hierarquia.js — o filtro plano por
  // <select> foi substituído pela árvore na Fase 2, ver esse arquivo.

  // --- 5) Filtro por banca também funciona.
  const bancaOpcao = await page.$eval("#filtro-banca", (el) => el.options[1]?.value);
  if (bancaOpcao) {
    await page.selectOption("#filtro-banca", bancaOpcao);
    await page.waitForTimeout(300);
    const todasDaBanca = await page.$$eval(
      "#questoes-lista .card .badge:not(.badge--accent):not(.badge--ia)",
      (els, banca) => els.every((e) => e.textContent.includes(banca)),
      bancaOpcao
    );
    console.log(`Filtro por banca '${bancaOpcao}' funciona:`, todasDaBanca);
  }

  // --- 6) Filtro ?categoria= (compat com Revisão de Alto Rendimento) continua funcionando.
  await page.evaluate(() => {
    location.hash = "";
  });
  await page.waitForTimeout(200);
  await page.evaluate(() => {
    location.hash = "/residencia/questoes?categoria=Cardiologia";
  });
  await page.waitForSelector("#questoes-lista .card", { timeout: 15000 });
  await page.waitForTimeout(300);
  const badgeFiltrado = await page.$eval(".page-header .badge--warning", (el) => el.textContent);
  console.log("Filtro ?categoria=Cardiologia (compat com Revisão de Alto Rendimento):", badgeFiltrado.includes("Cardiologia"));

  console.log("Erros JS capturados:", erros.length ? erros : "nenhum");
  await browser.close();
})().catch((e) => {
  console.error("ERRO:", e);
  process.exit(1);
});
