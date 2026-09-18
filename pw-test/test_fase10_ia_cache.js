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

  const email = `teste.fase10.${Date.now()}@example.com`;
  await page.goto("http://localhost:8744");
  await page.waitForSelector("#login-email", { timeout: 10000 });
  const heading = await page.textContent("h1");
  if (!heading.includes("Criar")) await page.click("#login-alternar");
  await page.fill("#login-email", email);
  await page.fill("#login-password", "senha12345");
  await page.click("#login-submit");
  await page.waitForSelector("#sidebar-nav a", { timeout: 15000 });

  // --- 1) Cache básico: salvar e buscar, chave estável por conteúdo idêntico
  const testeCacheBasico = await page.evaluate(async () => {
    const { buscarNoCache, salvarNoCache } = await import("/app/iaCache.js");
    const params = { pergunta: "O que é HAS?", contexto: "ctx-x", tarefa: "responder", formatoJson: false };
    const antes = await buscarNoCache(params);
    await salvarNoCache(params, "Resposta cacheada de teste.");
    const depois = await buscarNoCache(params);
    const paramsDiferentes = await buscarNoCache({ ...params, pergunta: "O que é DM2?" });
    return { antes, depois, paramsDiferentes };
  });
  console.log("Cache vazio antes de salvar:", testeCacheBasico.antes === null);
  console.log("Cache retorna o valor salvo:", testeCacheBasico.depois === "Resposta cacheada de teste.");
  console.log("Pergunta diferente não bate no mesmo cache:", testeCacheBasico.paramsDiferentes === null);

  // --- 2) askAI usa o cache: sem GEMINI_API_KEY local, uma chamada normal falharia;
  // populando o cache manualmente, askAI deve devolver o valor cacheado SEM tentar
  // a rede (ou seja, sem lançar o erro que o Worker local daria por falta da chave).
  const testeAskAICache = await page.evaluate(async () => {
    const { askAI } = await import("/app/ai.js");
    const { salvarNoCache } = await import("/app/iaCache.js");
    const params = { pergunta: "Pergunta cacheada única 12345", contexto: "", tarefa: "responder à pergunta do usuário" };
    await salvarNoCache({ ...params, formatoJson: false }, "Resposta vinda do cache, sem chamar o Gemini.");
    const resposta = await askAI(params);
    return resposta;
  });
  console.log("askAI devolve resposta cacheada sem tentar a rede:", testeAskAICache === "Resposta vinda do cache, sem chamar o Gemini.");

  // --- 3) askAI SEM cache (pergunta nova, sem key local) deve tentar a rede e falhar
  // com o erro esperado do Worker ("GEMINI_API_KEY não configurada"), confirmando que
  // sem entrada em cache ele realmente tenta chamar o Gemini.
  const testeSemCache = await page.evaluate(async () => {
    const { askAI } = await import("/app/ai.js");
    try {
      await askAI({ pergunta: "Pergunta nunca antes feita " + Date.now(), contexto: "", tarefa: "responder" });
      return { erro: null };
    } catch (e) {
      return { erro: e.message };
    }
  });
  console.log("Pergunta nova tenta a rede e falha por falta de GEMINI_API_KEY local (esperado):", (testeSemCache.erro || "").includes("GEMINI_API_KEY"));

  // --- 4) gerarFlashcardsComIA: dedup por temaId (não deve tentar Gemini se já existe deck)
  const testeDedupFlashcards = await page.evaluate(async () => {
    const { setItem } = await import("/app/db.js");
    const deckFake = { id: "deck-ia-fake", temaId: "tema-fake-123", titulo: "Deck existente", origem: "ia", cards: [{ id: "c1", frente: "F", verso: "V" }] };
    await setItem("ia_flashcards", deckFake);

    const { gerarFlashcardsComIA } = await import("/app/iaConteudo.js");
    const resultado = await gerarFlashcardsComIA({ id: "tema-fake-123", titulo: "Tema Fake", categoria: "Cardiologia", secoes: [], mnemonicos: [] });
    return resultado;
  });
  console.log("gerarFlashcardsComIA devolve o deck já existente sem chamar o Gemini:", testeDedupFlashcards?.id === "deck-ia-fake");

  // --- 5) montarContextoAluno (via assistente.js) produz texto sensato
  await page.evaluate(() => { location.hash = "/residencia/assistente"; });
  await page.waitForSelector("#chat-form", { timeout: 10000 });
  let textoPagina = await page.$eval(".main__container", (el) => el.textContent);
  console.log("Página do Assistente IA renderiza normalmente:", textoPagina.includes("Assistente de estudo"));

  // --- 6) Smoke test geral (incluindo Conteúdo com os botões de IA, sem clicar neles)
  const rotas = [
    "/residencia/conteudo",
    "/residencia/assistente",
    "/residencia/revisao",
    "/residencia/flashcards",
    "/residencia/questoes",
    "/residencia/erros",
    "/residencia/simulados",
    "/residencia/planejador",
    "/residencia/cronograma",
    "/residencia/prontidao",
    "/residencia/foco",
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
