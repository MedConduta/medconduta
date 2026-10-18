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
  const arquivosBaixados = new Set();
  page.on("request", (r) => {
    const m = r.url().match(/data\/questoes\/([^/?]+\.json)/);
    if (m) arquivosBaixados.add(m[1]);
  });

  const email = `teste.banco.${Date.now()}@example.com`;
  await page.goto("http://localhost:8744");
  await page.waitForSelector("#login-email", { timeout: 10000 });
  await page.click("#login-alternar");
  await page.fill("#login-email", email);
  await page.fill("#login-password", "senha12345");
  await page.click("#login-submit");
  await page.waitForSelector("#sidebar-nav a", { timeout: 15000 });
  await page.waitForTimeout(800);

  // --- 1) O antigo arquivo único não existe mais; o índice leve sim.
  const estrutura = await page.evaluate(async () => {
    const antigo = await fetch("data/questoes.json");
    const indice = await (await fetch("data/questoes/indice.json")).json();
    return { antigoStatus: antigo.status, total: indice.total, arquivos: indice.dicionarios.arquivo.length };
  });
  console.log(`Índice: ${estrutura.total} questões em ${estrutura.arquivos} arquivos por especialidade`);
  console.log("data/questoes.json não é mais servido (banco particionado):", estrutura.antigoStatus === 404);

  // --- 2) Abrir Questões baixa o índice e só as especialidades da primeira página (não as 26).
  arquivosBaixados.clear();
  await page.evaluate(() => {
    location.hash = "/residencia/questoes";
  });
  await page.waitForSelector("#questoes-lista .card .question-option", { timeout: 20000 });
  const especialidadesNaAbertura = [...arquivosBaixados].filter((a) => a !== "indice.json");
  console.log("Abrir Questões não baixa o banco inteiro:", especialidadesNaAbertura.length < estrutura.arquivos, especialidadesNaAbertura.length, "arquivo(s)");
  const cardsComTexto = await page.$$eval("#questoes-lista .card .card-enunciado", (els) => els.filter((e) => e.textContent.trim().length > 10).length);
  console.log("Cards da página têm enunciado carregado:", cardsComTexto > 0);

  // --- 3) Filtro de especialidade + busca por texto do enunciado funcionam.
  await page.evaluate(() => {
    location.hash = "/residencia/questoes?categoria=Cardiologia";
  });
  await page.waitForSelector("#questoes-lista .card", { timeout: 20000 });
  arquivosBaixados.clear();
  await page.fill("#filtro-busca", "fibrilação atrial");
  await page.waitForFunction(() => {
    const t = document.querySelector("#questoes-contagem")?.textContent || "";
    return t && !/Carregando/.test(t) && document.querySelector("#questoes-lista .card .card-enunciado");
  }, null, { timeout: 20000 });
  await page.waitForTimeout(800);
  const achou = await page.$$eval("#questoes-lista .card .card-enunciado", (els) => els.filter((e) => /fibrila/i.test(e.textContent)).length);
  console.log("Busca por enunciado dentro de uma especialidade encontra questões:", achou > 0, achou);
  console.log("Busca com filtro baixa só a especialidade filtrada:", [...arquivosBaixados].every((a) => a === "cardiologia.json"), [...arquivosBaixados]);

  // --- 4) Instituição e ano viram filtros; o rótulo é "Instituição".
  const rotulo = await page.$eval('label[for="filtro-banca"]', (el) => el.textContent.trim());
  const temSESPE = await page.$$eval("#filtro-banca option", (els) => els.some((o) => o.value === "SES-PE"));
  console.log("Filtro de instituição (com SES-PE):", rotulo === "Instituição" && temSESPE);

  // --- 5) Resposta gravada com o id de uma cópia mesclada (alias) conta para a questão principal.
  const aliasOk = await page.evaluate(async () => {
    const { setItem } = await import("/app/db.js");
    const indice = await (await fetch("data/questoes/indice.json")).json();
    const [antigo, principal] = Object.entries(indice.aliases)[0];
    await setItem("respostas", { id: `resp-alias-${Date.now()}`, questaoId: antigo, temaId: "x", acertou: false, respondidoEm: new Date().toISOString() });
    const { carregarIndice } = await import("/app/questoesIndex.js");
    const idx = await carregarIndice();
    return { antigo, principal, status: idx.statusPorQuestao.get(principal) || null, existeAntigo: idx.questoesPorId.has(antigo) };
  });
  console.log("Resposta com id antigo aparece na questão principal:", Boolean(aliasOk.status?.respondida) && !aliasOk.existeAntigo, `${aliasOk.antigo} -> ${aliasOk.principal}`);

  // --- 6) Simulado sorteia pelo índice e entrega questões completas.
  const simulado = await page.evaluate(async () => {
    const { selecionarQuestoesSimulado } = await import("/app/simulados.js");
    const qs = await selecionarQuestoesSimulado(20);
    return { n: qs.length, completas: qs.every((q) => q.enunciado && q.alternativas?.length >= 2 && q.correta >= 0) };
  });
  console.log("Simulado de 20 vem com 20 questões completas:", simulado.n === 20 && simulado.completas);

  console.log("Erros JS capturados:", erros.length ? erros : "nenhum");
  await browser.close();
})().catch((e) => {
  console.error("ERRO:", e);
  process.exit(1);
});
