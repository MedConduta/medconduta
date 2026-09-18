const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const page = await browser.newPage();
  await page.route("https://medconduta-ai.medcondutaa.workers.dev/**", async (route) => {
    const req = route.request();
    const localUrl = req.url().replace("https://medconduta-ai.medcondutaa.workers.dev", "http://127.0.0.1:8787");
    const res = await page.request.fetch(localUrl, { method: req.method(), headers: req.headers(), data: req.postDataBuffer() || undefined, timeout: 90000 });
    await route.fulfill({ status: res.status(), headers: res.headers(), body: await res.body() });
  });
  const erros = [];
  page.on("pageerror", (e) => erros.push(e.message));

  const email = `teste.geminireal.${Date.now()}@example.com`;
  await page.goto("http://localhost:8744");
  await page.waitForSelector("#login-email", { timeout: 10000 });
  const heading = await page.textContent("h1");
  if (!heading.includes("Criar")) await page.click("#login-alternar");
  await page.fill("#login-email", email);
  await page.fill("#login-password", "senha12345");
  await page.click("#login-submit");
  await page.waitForSelector("#sidebar-nav a", { timeout: 15000 });

  // --- 1) Chat do Assistente IA: pergunta real, mede o tempo da 1ª chamada (vai ao Gemini)
  await page.evaluate(() => { location.hash = "/residencia/assistente"; });
  await page.waitForSelector("#chat-form", { timeout: 10000 });

  const perguntaUnica = `Explique em 1 frase o que é hipertensão arterial sistêmica (teste-${Date.now()}).`;
  await page.fill("#chat-input", perguntaUnica);
  const t0 = Date.now();
  await page.click("#chat-enviar");
  await page.waitForFunction(
    () => !document.querySelector("#chat-mensagens .chat-msg--loading"),
    { timeout: 30000 }
  );
  const t1 = Date.now();
  const duracaoPrimeira = t1 - t0;
  let texto = await page.$eval("#chat-mensagens", (el) => el.textContent);
  console.log("1ª resposta do Gemini chegou (sem erro):", !texto.includes("⚠"));
  console.log(`1ª chamada levou ${duracaoPrimeira}ms (chamada real ao Gemini, deve ser >500ms)`);

  // --- 2) Repete a MESMA pergunta: deve vir do cache, quase instantâneo
  await page.fill("#chat-input", perguntaUnica);
  const t2 = Date.now();
  await page.click("#chat-enviar");
  await page.waitForFunction(
    () => !document.querySelector("#chat-mensagens .chat-msg--loading"),
    { timeout: 30000 }
  );
  const t3 = Date.now();
  const duracaoSegunda = t3 - t2;
  console.log(`2ª chamada (mesma pergunta) levou ${duracaoSegunda}ms`);
  console.log("2ª chamada foi bem mais rápida que a 1ª (cache funcionando):", duracaoSegunda < duracaoPrimeira / 2);

  // --- 3) Conferir se as duas respostas de IA no chat são idênticas (mesma resposta cacheada)
  const respostasIA = await page.$$eval(".chat-msg--ia .chat-msg__texto", (els) => els.map((el) => el.textContent.trim()));
  console.log("Total de respostas de IA no chat:", respostasIA.length);
  console.log("As duas respostas são idênticas (veio do cache):", respostasIA.length === 2 && respostasIA[0] === respostasIA[1]);

  // --- 4) gerarFlashcardsComIA real: gera uma vez, gera de novo, confirma que é o MESMO deck (sem duplicar)
  const resultadoFlashcards = await page.evaluate(async () => {
    const { gerarFlashcardsComIA } = await import("/app/iaConteudo.js");
    const { getAll } = await import("/app/db.js");
    const temaTeste = {
      id: "tema-teste-fase10-real",
      titulo: "Hipertensão Arterial Sistêmica (teste Fase 10)",
      categoria: "Cardiologia",
      resumo: "Tema de teste pra validar dedup de geração de flashcards.",
      secoes: [{ titulo: "Definição", conteudo: "PA >= 140/90 mmHg em duas medidas." }],
      mnemonicos: [],
    };
    const t0 = Date.now();
    const deck1 = await gerarFlashcardsComIA(temaTeste);
    const t1 = Date.now();
    const deck2 = await gerarFlashcardsComIA(temaTeste);
    const t2 = Date.now();
    const todos = await getAll("ia_flashcards");
    const decksDoTema = todos.filter((d) => d.temaId === temaTeste.id);
    return {
      duracao1: t1 - t0,
      duracao2: t2 - t1,
      mesmoId: deck1.id === deck2.id,
      totalCards1: deck1.cards.length,
      decksDoTemaNoStore: decksDoTema.length,
    };
  });
  console.log(`Gerar flashcards 1ª vez: ${resultadoFlashcards.duracao1}ms (chamada real, gera ${resultadoFlashcards.totalCards1} cards)`);
  console.log(`Gerar flashcards 2ª vez (mesmo tema): ${resultadoFlashcards.duracao2}ms (deve ser quase instantâneo)`);
  console.log("2ª chamada devolveu o MESMO deck (id idêntico):", resultadoFlashcards.mesmoId);
  console.log("Só existe 1 deck de IA pra esse tema no store (sem duplicar):", resultadoFlashcards.decksDoTemaNoStore === 1);
  console.log("2ª chamada foi muito mais rápida (não recriou, não chamou Gemini de novo):", resultadoFlashcards.duracao2 < resultadoFlashcards.duracao1 / 3);

  // --- 5) gerarQuestaoComIA real: gera duas vezes pro MESMO tema, confirma que são questões DIFERENTES
  const resultadoQuestoes = await page.evaluate(async () => {
    const { gerarQuestaoComIA } = await import("/app/iaConteudo.js");
    const temaTeste = {
      id: "tema-teste-fase10-real",
      titulo: "Hipertensão Arterial Sistêmica (teste Fase 10)",
      categoria: "Cardiologia",
      resumo: "Tema de teste.",
      secoes: [{ titulo: "Definição", conteudo: "PA >= 140/90 mmHg em duas medidas." }],
      mnemonicos: [],
      fonte: "",
    };
    const q1 = await gerarQuestaoComIA(temaTeste);
    const q2 = await gerarQuestaoComIA(temaTeste);
    return { enunciado1: q1.enunciado, enunciado2: q2.enunciado, idsDiferentes: q1.id !== q2.id };
  });
  console.log("As duas questões geradas têm ids diferentes:", resultadoQuestoes.idsDiferentes);
  console.log("Os enunciados são DIFERENTES (variedade preservada, cache não interferiu):", resultadoQuestoes.enunciado1 !== resultadoQuestoes.enunciado2);

  console.log("Erros JS capturados:", erros.length ? erros : "nenhum");
  await browser.close();
})().catch((e) => { console.error("ERRO:", e); process.exit(1); });
