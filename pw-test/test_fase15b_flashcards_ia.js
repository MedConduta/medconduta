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

  const email = `teste.fase15b.${Date.now()}@example.com`;
  await page.goto("http://localhost:8744");
  await page.waitForSelector("#login-email", { timeout: 10000 });
  const heading = await page.textContent("h1");
  if (!heading.includes("Criar")) await page.click("#login-alternar");
  await page.fill("#login-email", email);
  await page.fill("#login-password", "senha12345");
  await page.click("#login-submit");
  await page.waitForSelector("#sidebar-nav a", { timeout: 15000 });

  // --- 1) Criar baralho manual ---
  await page.evaluate(() => { location.hash = "/residencia/flashcards"; });
  await page.waitForSelector("#form-novo-baralho", { timeout: 10000 });
  await page.fill("#novo-baralho-titulo", "Meu baralho de teste");
  await page.click("#form-novo-baralho button[type=submit]");
  await page.waitForFunction(() => document.querySelector(".main__container")?.textContent.includes("Gerenciar:"), { timeout: 10000 });
  let texto = await page.$eval(".main__container", (el) => el.textContent);
  console.log("Criar baralho manual redireciona pra Gerenciar:", texto.includes("Gerenciar: Meu baralho de teste"));
  console.log("Baralho vazio mostra formulário de adicionar card:", !!(await page.$("#form-novo-card")));

  // --- 2) Adicionar card ---
  await page.fill("#novo-card-frente", "Qual a tríade de Virchow?");
  await page.fill("#novo-card-verso", "Estase venosa, lesão endotelial, hipercoagulabilidade.");
  await page.click("#form-novo-card button[type=submit]");
  await page.waitForFunction(() => document.querySelector(".main__container")?.textContent.includes("Tríade de Virchow") || document.querySelector(".main__container")?.textContent.includes("tríade de Virchow"), { timeout: 10000 });
  texto = await page.$eval(".main__container", (el) => el.textContent);
  console.log("Card adicionado aparece na lista:", texto.includes("Virchow"));
  console.log("Card mostra 'Nunca revisado':", texto.includes("Nunca revisado"));

  // --- 3) Editar card ---
  await page.click("[data-editar-card]");
  await page.waitForSelector("textarea[id^='editar-frente-']", { timeout: 5000 });
  const frenteInput = await page.$("textarea[id^='editar-frente-']");
  await frenteInput.fill("Tríade de Virchow (TVP) — componentes?");
  await page.click("[data-card-linha] form button[type=submit]");
  await page.waitForFunction(() => document.querySelector(".main__container")?.textContent.includes("Tríade de Virchow (TVP)"), { timeout: 10000 });
  texto = await page.$eval(".main__container", (el) => el.textContent);
  console.log("Edição de card salva corretamente:", texto.includes("Tríade de Virchow (TVP) — componentes?"));

  // --- 4) Marcar difícil / dominado ---
  await page.click('[data-marcar="dificil"]');
  await page.waitForFunction(() => document.querySelector(".main__container")?.textContent.includes("Revisa em"), { timeout: 10000 });
  texto = await page.$eval(".main__container", (el) => el.textContent);
  console.log("Marcar difícil atualiza status de revisão:", texto.includes("Revisa em 1 dia"));

  await page.click('[data-marcar="dominado"]');
  await page.waitForFunction(() => document.querySelector(".main__container")?.textContent.includes("Revisa em 30 dias"), { timeout: 10000 });
  texto = await page.$eval(".main__container", (el) => el.textContent);
  console.log("Marcar dominado atualiza status de revisão (30 dias):", texto.includes("Revisa em 30 dias"));

  // --- 5) Estudar o baralho — deve funcionar normalmente ---
  const deckIdMatch = await page.evaluate(() => location.hash);
  const deckId = deckIdMatch.match(/flashcards\/([^/]+)\/gerenciar/)[1];
  await page.evaluate((id) => { location.hash = `/residencia/flashcards/${id}`; }, deckId);
  await page.waitForSelector("#flashcard", { timeout: 10000 });
  console.log("Estudar baralho manual funciona (card renderizado):", !!(await page.$("#flashcard")));

  // --- 6) Excluir card ---
  await page.evaluate((id) => { location.hash = `/residencia/flashcards/${id}/gerenciar`; }, deckId);
  await page.waitForSelector("[data-excluir-card]", { timeout: 10000 });
  page.once("dialog", (d) => d.accept());
  await page.click("[data-excluir-card]");
  await page.waitForFunction(() => document.querySelector(".main__container")?.textContent.includes("Nenhum card ainda"), { timeout: 10000 });
  texto = await page.$eval(".main__container", (el) => el.textContent);
  console.log("Excluir card funciona (baralho volta a ficar vazio):", texto.includes("Nenhum card ainda"));

  // --- 7) Excluir baralho inteiro ---
  page.once("dialog", (d) => d.accept());
  await page.click("#btn-excluir-baralho");
  await page.waitForFunction(() => document.querySelector(".main__container")?.textContent.includes("Baralhos por tema"), { timeout: 10000 });
  texto = await page.$eval(".main__container", (el) => el.textContent);
  console.log("Excluir baralho volta pra lista de baralhos:", texto.includes("Baralhos por tema"));
  console.log("Baralho excluído não aparece mais na lista:", !texto.includes("Meu baralho de teste"));

  // --- 8) Baralho curado NÃO é editável (sem form de adicionar card) ---
  await page.evaluate(() => { location.hash = "/residencia/flashcards"; });
  await page.waitForSelector(".card-grid a.card", { timeout: 10000 });
  const primeiroDeckHref = await page.$eval(".card-grid a.card", (el) => el.getAttribute("href"));
  const primeiroDeckId = primeiroDeckHref.replace("#/residencia/flashcards/", "");
  await page.evaluate((id) => { location.hash = `/residencia/flashcards/${id}/gerenciar`; }, primeiroDeckId);
  await page.waitForFunction(() => document.querySelector(".main__container")?.textContent.includes("Gerenciar:"), { timeout: 10000 });
  texto = await page.$eval(".main__container", (el) => el.textContent);
  console.log("Baralho curado mostra aviso de somente-leitura:", texto.includes("Baralho curado"));
  console.log("Baralho curado NÃO mostra form de adicionar card:", !(await page.$("#form-novo-card")));
  console.log("Baralho curado ainda mostra botões de marcar difícil/dominado:", !!(await page.$('[data-marcar="dificil"]')));
  console.log("Baralho curado NÃO mostra botão de excluir card:", !(await page.$("[data-excluir-card]")));

  // --- 9) IA sob demanda: pegadinhas, o que memorizar, me testar, fluxograma (agora em abas no topo do tema) ---
  await page.evaluate(() => { location.hash = "/residencia/conteudo"; });
  await page.waitForSelector(".content-area", { timeout: 10000 });
  await page.$eval(".content-area", (el) => (el.open = true));
  await page.waitForSelector(".content-list__item", { timeout: 10000 });
  await page.click(".content-list__item");
  await page.waitForSelector(".ia-tab", { timeout: 10000 });

  console.log("Abas de IA sob demanda presentes:",
    !!(await page.$('.ia-tab[data-tipo="fluxograma"]')) &&
    !!(await page.$('.ia-tab[data-tipo="pegadinhas"]')) &&
    !!(await page.$('.ia-tab[data-tipo="memorizar"]')) &&
    !!(await page.$('.ia-tab[data-tipo="testar"]'))
  );

  await page.click('.ia-tab[data-tipo="pegadinhas"]');
  await page.waitForFunction(() => {
    const el = document.querySelector("#ia-tab-panel");
    return el && el.textContent.trim().length > 20 && !el.textContent.includes("Gerando...");
  }, { timeout: 30000 });
  let resultado = await page.$eval("#ia-tab-panel", (el) => el.textContent.trim());
  console.log("Pegadinhas retornou conteúdo real da IA:", resultado.length > 20);
  console.log("Aba 'Pegadinhas' fica marcada como já gerada:", await page.$eval('.ia-tab[data-tipo="pegadinhas"]', (el) => el.classList.contains("has-content")));

  await page.click('.ia-tab[data-tipo="memorizar"]');
  await page.waitForFunction(() => {
    const el = document.querySelector("#ia-tab-panel");
    return el && el.textContent.trim().length > 20 && !el.textContent.includes("Gerando...");
  }, { timeout: 30000 });
  resultado = await page.$eval("#ia-tab-panel", (el) => el.textContent.trim());
  console.log("'O que memorizar' retornou conteúdo real da IA:", resultado.length > 20);

  // Voltar pra "Pegadinhas" não deve refazer a chamada de IA — só reabrir o que já foi salvo
  await page.click('.ia-tab[data-tipo="pegadinhas"]');
  await page.waitForTimeout(300);
  const resultadoReaberto = await page.$eval("#ia-tab-panel", (el) => el.textContent.trim());
  console.log("Reabrir aba já gerada mostra o conteúdo salvo instantaneamente:", !resultadoReaberto.includes("Gerando...") && resultadoReaberto.length > 20);

  // --- 10) Me testar (quiz interativo) ---
  await page.click('.ia-tab[data-tipo="testar"]');
  await page.waitForSelector("#form-resposta-testar", { timeout: 30000 });
  console.log("Quiz gerou uma pergunta + formulário de resposta:", !!(await page.$("#resposta-testar")));
  await page.fill("#resposta-testar", "Não sei, pode me explicar?");
  await page.click("#form-resposta-testar button[type=submit]");
  await page.waitForSelector("#btn-testar-nova", { timeout: 30000 });
  resultado = await page.$eval("#ia-tab-panel", (el) => el.textContent.trim());
  console.log("Quiz corrigiu a resposta e ofereceu nova pergunta:", resultado.length > 20 && !!(await page.$("#btn-testar-nova")));
  console.log("Aba 'Me testar' fica marcada como já gerada (depois do feedback):", await page.$eval('.ia-tab[data-tipo="testar"]', (el) => el.classList.contains("has-content")));

  // --- 11) Gerar fluxograma com IA ---
  await page.click('.ia-tab[data-tipo="fluxograma"]');
  await page.waitForFunction(() => {
    const el = document.querySelector("#ia-tab-panel");
    if (!el) return false;
    return el.querySelector(".ia-tab-panel__regerar") || el.textContent.includes("⚠");
  }, { timeout: 40000 });
  resultado = await page.$eval("#ia-tab-panel", (el) => el.textContent.trim());
  console.log("Fluxograma gerado com sucesso (ou erro tratado sem travar):", resultado.length > 0);
  const temFluxogramaVisual = !!(await page.$(".flow-node"));
  console.log("Fluxograma renderizado visualmente (nós do fluxograma presentes):", temFluxogramaVisual);

  // --- 12) Recarregar a página do tema: abas com conteúdo salvo continuam marcadas ---
  const urlTema = await page.evaluate(() => location.hash);
  await page.evaluate(() => { location.hash = "/residencia/conteudo"; });
  await page.waitForTimeout(200);
  await page.evaluate((h) => { location.hash = h; }, urlTema);
  await page.waitForSelector(".ia-tab", { timeout: 10000 });
  const abasComConteudoAoRecarregar = await page.$$eval(".ia-tab.has-content", (els) => els.map((el) => el.dataset.tipo));
  console.log("Depois de recarregar, abas já geradas continuam marcadas (persistência):",
    ["pegadinhas", "memorizar", "testar", "fluxograma"].every((t) => abasComConteudoAoRecarregar.includes(t))
  );

  console.log("Erros JS capturados:", erros.length ? erros : "nenhum");
  await browser.close();
})().catch((e) => { console.error("ERRO:", e); process.exit(1); });
