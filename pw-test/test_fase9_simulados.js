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

  const email = `teste.fase9.${Date.now()}@example.com`;
  await page.goto("http://localhost:8744");
  await page.waitForSelector("#login-email", { timeout: 10000 });
  const heading = await page.textContent("h1");
  if (!heading.includes("Criar")) await page.click("#login-alternar");
  await page.fill("#login-email", email);
  await page.fill("#login-password", "senha12345");
  await page.click("#login-submit");
  await page.waitForSelector("#sidebar-nav a", { timeout: 15000 });

  // --- 1) Testa a seleção ponderada diretamente (sem passar pela UI)
  const amostragem = await page.evaluate(async () => {
    const { selecionarQuestoesSimulado } = await import("/app/simulados.js");
    const qs = await selecionarQuestoesSimulado(20);
    const idsUnicos = new Set(qs.map((q) => q.id));
    return { total: qs.length, unicos: idsUnicos.size, temCategoria: qs.every((q) => !!q.categoria) };
  });
  console.log("selecionarQuestoesSimulado(20) retorna 20 questões:", amostragem.total === 20);
  console.log("Todas as questões são únicas (sem repetição):", amostragem.unicos === 20);
  console.log("Todas têm categoria resolvida:", amostragem.temCategoria);

  // --- 2) Fluxo completo pela UI com um simulado pequeno
  await page.evaluate(() => { location.hash = "/residencia/simulados"; });
  await page.waitForSelector("#simulado-tamanho", { timeout: 10000 });
  await page.selectOption("#simulado-tamanho", "20");
  await page.click("#btn-iniciar");
  await page.waitForSelector(".opcoes .question-option", { timeout: 10000 });

  let texto = await page.$eval(".main__container", (el) => el.textContent);
  console.log("Mostra 'Questão 1 de 20':", texto.includes("Questão 1 de 20"));

  // Responde todas as 20 questões, navegando com "Próxima", sempre clicando na 1ª alternativa
  for (let i = 0; i < 20; i++) {
    const opcoes = await page.$$(".opcoes .question-option");
    await opcoes[0].click();
    await page.waitForTimeout(150);
    if (i < 19) {
      await page.click("#btn-proxima");
      await page.waitForTimeout(150);
    }
  }

  texto = await page.$eval(".main__container", (el) => el.textContent);
  console.log("Todas as 20 respondidas antes de finalizar:", texto.includes("20/20 respondidas"));

  await page.click("#btn-finalizar");
  await page.waitForSelector("#btn-novo-simulado", { timeout: 10000 });
  texto = await page.$eval(".main__container", (el) => el.textContent);
  console.log("Mostra 'Resultado do simulado':", texto.includes("Resultado do simulado"));
  console.log("Mostra 'Desempenho por área':", texto.includes("Desempenho por área"));
  console.log("Mostra 'Revisão questão a questão':", texto.includes("Revisão questão a questão"));

  // --- 3) Confere se o simulado ficou no histórico e alimentou respostas/erros
  const dadosPosSimulado = await page.evaluate(async () => {
    const { getAll } = await import("/app/db.js");
    const simulados = await getAll("simulados");
    const respostas = await getAll("respostas");
    return {
      totalSimulados: simulados.length,
      respostasDeSimulado: respostas.filter((r) => r.origemSimulado).length,
    };
  });
  console.log("1 simulado salvo no histórico:", dadosPosSimulado.totalSimulados === 1);
  console.log("20 respostas de simulado gravadas em 'respostas':", dadosPosSimulado.respostasDeSimulado === 20);

  // Volta pra tela de config e confere se o histórico aparece
  await page.click("#btn-novo-simulado");
  await page.waitForSelector("#btn-iniciar", { timeout: 10000 });
  texto = await page.$eval(".main__container", (el) => el.textContent);
  console.log("Tela de config mostra 'Simulados anteriores':", texto.includes("Simulados anteriores"));

  // --- 4) Smoke test geral
  const rotas = [
    "/residencia/conteudo",
    "/residencia/revisao",
    "/residencia/flashcards",
    "/residencia/questoes",
    "/residencia/erros",
    "/residencia/simulados",
    "/residencia/planejador",
    "/residencia/cronograma",
    "/residencia/prontidao",
    "/residencia/foco",
    "/pratica/prescricao",
  ];
  for (const rota of rotas) {
    await page.evaluate((r) => { location.hash = r; }, rota);
    await page.waitForTimeout(500);
    const temMain = await page.$(".main__container");
    console.log(rota, "| renderizou:", !!temMain);
  }

  console.log("Erros JS capturados:", erros.length ? erros : "nenhum");
  await browser.close();
})().catch((e) => { console.error("ERRO:", e); process.exit(1); });
