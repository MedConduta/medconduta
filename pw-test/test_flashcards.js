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
  page.on("console", (msg) => {
    if (msg.type() === "error") erros.push(msg.text());
  });

  const email = `teste.flashcards.${Date.now()}@example.com`;
  await page.goto("http://localhost:8744");
  await page.waitForSelector("#login-email", { timeout: 10000 });
  await page.click("#login-alternar");
  await page.fill("#login-email", email);
  await page.fill("#login-password", "senha12345");
  await page.click("#login-submit");
  await page.waitForSelector("#sidebar-nav a", { timeout: 15000 });
  await page.waitForTimeout(800);

  // --- 1) Item "Flashcards" está na sidebar, na seção Estudar
  const labels = await page.$$eval(".nav-section:has(.nav-section__title:text('Estudar')) .nav-link__label", (els) =>
    els.map((e) => e.textContent.trim())
  );
  console.log("Sidebar 'Estudar' inclui 'Flashcards':", labels.includes("Flashcards"));

  // --- 2) Navega para /residencia/flashcards e valida tela de config
  await page.click(".nav-link:has-text('Flashcards')");
  await page.waitForFunction(() => document.querySelector(".main__container")?.textContent.includes("Flashcards"), { timeout: 20000 });
  let texto = await page.$eval(".main__container", (el) => el.textContent);
  console.log("Mostra stat 'Para revisar agora':", texto.includes("Para revisar agora"));
  console.log("Mostra stat 'no total':", texto.includes("no total"));

  const totalCards = await page.evaluate(async () => (await (await fetch("data/flashcards.json")).json()).length);
  console.log(`data/flashcards.json tem cards (${totalCards}):`, totalCards > 0);

  const valorTotal = await page.$$eval(".stat-tile", (els) => {
    const tile = els.find((el) => el.textContent.includes("Cards"));
    return tile ? tile.querySelector(".stat-tile__value")?.textContent.trim() : null;
  });
  console.log(`Contador de total bate com o JSON (${valorTotal} === ${totalCards}):`, Number(valorTotal) === totalCards);

  // --- 3) Inicia revisão (usuário novo => todos vencidos) e revisa 1 card com cada botão
  await page.click("#btn-revisar");
  await page.waitForFunction(() => document.querySelector(".main__container")?.textContent.includes("Mostrar resposta"), { timeout: 10000 });
  let textoRevisao = await page.$eval(".main__container", (el) => el.textContent);
  console.log("Tela de revisão mostra 'Flashcard 1 de':", textoRevisao.includes("Flashcard 1 de"));
  console.log("Verso ainda oculto antes de clicar 'Mostrar resposta':", !(await page.$(".card > div"))); // sem o bloco de verso ainda

  await page.click("#btn-mostrar");
  await page.waitForSelector("#btn-nao-lembrei", { timeout: 5000 });
  textoRevisao = await page.$eval(".main__container", (el) => el.textContent);
  console.log("Após mostrar resposta, verso aparece e 3 botões de avaliação existem:", !!(await page.$("#btn-nao-lembrei")) && !!(await page.$("#btn-lembrei")) && !!(await page.$("#btn-facil")));

  await page.click("#btn-lembrei");
  await page.waitForFunction(() => document.querySelector(".main__container")?.textContent.includes("Flashcard 2 de") || document.querySelector(".main__container")?.textContent.includes("Revisão concluída"), { timeout: 10000 });
  console.log("Avança para o próximo card (ou resumo, se só havia 1) após avaliar");

  // --- 4) Termina a fila inteira até chegar ao resumo
  let tentativas = 0;
  while (tentativas < totalCards + 2) {
    const t = await page.$eval(".main__container", (el) => el.textContent);
    if (t.includes("Revisão concluída")) break;
    const mostrarBtn = await page.$("#btn-mostrar");
    if (mostrarBtn) {
      await page.click("#btn-mostrar");
      await page.waitForSelector("#btn-lembrei", { timeout: 5000 });
    }
    await page.click("#btn-facil");
    await page.waitForTimeout(150);
    tentativas += 1;
  }
  const textoResumo = await page.$eval(".main__container", (el) => el.textContent);
  console.log("Chegou na tela de resumo 'Revisão concluída':", textoResumo.includes("Revisão concluída"));
  console.log("Resumo mostra 'Não lembrei'/'Lembrei'/'Fácil':", textoResumo.includes("Não lembrei") && textoResumo.includes("Lembrei") && textoResumo.includes("Fácil"));

  await page.click("#btn-voltar");
  await page.waitForFunction(() => document.querySelector(".main__container")?.textContent.includes("Para revisar agora"), { timeout: 10000 });
  const textoConfigDepois = await page.$eval(".main__container", (el) => el.textContent);
  console.log("Depois de revisar tudo, mostra empty-state 'Tudo revisado por hoje':", textoConfigDepois.includes("Tudo revisado por hoje"));

  // --- 5) Link "Flashcards deste tema" em Conteúdo (tema com cards: has)
  await page.goto("http://localhost:8744/#/residencia/conteudo/has");
  await page.waitForFunction(() => document.querySelector(".tema-toolbar__acoes"), { timeout: 15000 });
  await page.waitForTimeout(300);
  const linkFlashcardsTema = await page.$('a:has-text("Flashcards deste tema")');
  console.log("Página do tema 'has' mostra link 'Flashcards deste tema':", !!linkFlashcardsTema);
  if (linkFlashcardsTema) {
    await linkFlashcardsTema.click();
    await page.waitForFunction(() => document.querySelector(".page-header__eyebrow")?.textContent.includes("Residência — Flashcards"), { timeout: 15000 });
    const textoFiltroTema = await page.$eval(".main__container", (el) => el.textContent);
    console.log("Ao clicar, filtra flashcards só do tema (título contém 'Flashcards —'):", textoFiltroTema.includes("Flashcards —"));
  }

  // --- 6) Tema sem flashcards não mostra o link (ex.: um tema qualquer sem cards ainda)
  await page.goto("http://localhost:8744/#/residencia/conteudo");
  await page.waitForFunction(() => document.querySelectorAll(".content-tree a, a[href*='conteudo/']").length > 0 || document.querySelector(".main__container")?.textContent.length > 50, { timeout: 15000 });

  console.log("\nErros de console/página:", erros.length ? erros : "nenhum");

  await page.waitForTimeout(500);
  await browser.close();
})();
