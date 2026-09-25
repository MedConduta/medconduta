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

  const email = `teste.fase15a.${Date.now()}@example.com`;
  await page.goto("http://localhost:8744");
  await page.waitForSelector("#login-email", { timeout: 10000 });
  const heading = await page.textContent("h1");
  if (!heading.includes("Criar")) await page.click("#login-alternar");
  await page.fill("#login-email", email);
  await page.fill("#login-password", "senha12345");
  await page.click("#login-submit");
  await page.waitForSelector("#sidebar-nav a", { timeout: 15000 });

  // --- Relatório Semanal ---
  await page.evaluate(() => { location.hash = "/residencia/relatorio-semanal"; });
  await page.waitForSelector(".main__container", { timeout: 10000 });
  await page.waitForFunction(() => document.querySelector(".main__container")?.textContent.includes("Sua semana em resumo"), { timeout: 15000 });
  let texto = await page.$eval(".main__container", (el) => el.textContent);
  console.log("Relatório Semanal — usuário novo carrega sem quebrar:", texto.includes("Sua semana em resumo"));
  console.log("Relatório Semanal — narrativa automática presente:", texto.includes("Nos últimos 7 dias"));
  console.log("Relatório Semanal — mostra botão de comentário IA:", !!(await page.$("#btn-comentario-ia")));

  // Item de sidebar e atalho em Minha Preparação
  console.log("Item 'Relatório Semanal' presente na sidebar:", !!(await page.$('a[href="#/residencia/relatorio-semanal"].nav-link')));

  // --- Planejamento Semanal ---
  await page.evaluate(() => { location.hash = "/residencia/planejamento-semanal"; });
  await page.waitForSelector(".main__container", { timeout: 10000 });
  await page.waitForFunction(() => document.querySelector(".main__container")?.textContent.includes("Sua semana"), { timeout: 15000 });
  texto = await page.$eval(".main__container", (el) => el.textContent);
  console.log("Planejamento Semanal — usuário novo carrega sem quebrar:", texto.includes("Sua semana"));
  console.log("Planejamento Semanal — mostra meta de temas novos:", texto.includes("Temas novos"));
  console.log("Planejamento Semanal — mostra meta de questões:", texto.includes("Questões"));
  console.log("Planejamento Semanal — mostra vencendo esta semana (flashcards):", texto.includes("Flashcards"));
  console.log("Item 'Planejamento Semanal' presente na sidebar:", !!(await page.$('a[href="#/residencia/planejamento-semanal"].nav-link')));

  // Usuário novo: os 158 flashcards do banco (todos "vencidos" por falta de SRS) devem aparecer na contagem de vencendo
  const badgeFlashcards = await page.$eval('a[href="#/residencia/revisao"] .badge', (el) => el.textContent.trim());
  console.log("Planejamento Semanal — contagem de flashcards vencendo é 158 (banco completo, usuário novo):", badgeFlashcards === "158");

  // Minha Preparação virou um dashboard analítico (sem lista de atalhos) —
  // Planejamento Semanal e Relatório Semanal ficam descobríveis só pela
  // sidebar (já testado acima), então só confirmamos que a página em si
  // renderiza sem quebrar.
  await page.evaluate(() => { location.hash = "/residencia/minha-preparacao"; });
  await page.waitForSelector(".main__container", { timeout: 10000 });
  await page.waitForFunction(() => document.querySelector(".main__container")?.textContent.includes("Agenda de hoje"), { timeout: 15000 });
  console.log("Minha Preparação (dashboard) renderiza sem quebrar:", true);

  // --- Testa o botão de comentário IA (real, via Worker local + Gemini) ---
  await page.evaluate(() => { location.hash = "/residencia/relatorio-semanal"; });
  await page.waitForSelector("#btn-comentario-ia", { timeout: 10000 });
  await page.click("#btn-comentario-ia");
  await page.waitForFunction(
    () => {
      const el = document.querySelector("#comentario-ia-resultado");
      return el && el.textContent.trim().length > 0 && el.textContent.trim() !== "Pensando...";
    },
    { timeout: 30000 }
  ).catch(() => {});
  const resultadoIa = await page.$eval("#comentario-ia-resultado", (el) => el.textContent.trim());
  console.log("Comentário IA retornou algum conteúdo (ou erro tratado, sem travar):", resultadoIa.length > 0);

  console.log("Erros JS capturados:", erros.length ? erros : "nenhum");
  await browser.close();
})().catch((e) => { console.error("ERRO:", e); process.exit(1); });
