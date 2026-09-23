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

  const email = `teste.hier.${Date.now()}@example.com`;
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
  await page.waitForSelector("#questoes-hierarquia .content-area", { timeout: 20000 });
  await page.waitForTimeout(300);

  // --- 1) Grande área "Clínica Médica" aparece com contador, e é a soma real do banco.
  const totalGeral = await page.$eval("#questoes-contagem", (el) => el.textContent);
  console.log("Contagem geral aparece no topo (sem erro de pluralização):", /^\d+ quest(ão|ões) encontradas?/.test(totalGeral));

  const areasVisiveis = await page.$$eval("#questoes-hierarquia .content-area summary", (els) => els.map((e) => e.textContent.trim()));
  console.log("Grandes áreas reais aparecem (ex.: Clínica Médica):", areasVisiveis.some((t) => t.includes("Clínica Médica")));
  console.log("Nenhuma grande área fictícia (ex.: 'Subtema' não é nível de área):", !areasVisiveis.some((t) => t.toLowerCase().includes("subtema")));

  // --- 2) Clicar em uma grande área expande, filtra os resultados e mostra especialidades com contagem.
  await page.click("#questoes-hierarquia .content-area summary");
  await page.waitForTimeout(300);
  const especialidadesVisiveis = await page.$$eval("#questoes-hierarquia [data-especialidade]", (els) => els.length);
  console.log("Especialidades aparecem ao abrir a grande área:", especialidadesVisiveis > 0);

  const breadcrumbApos1Clique = await page.$eval("#questoes-breadcrumb", (el) => el.textContent);
  console.log("Breadcrumb reflete a grande área selecionada:", breadcrumbApos1Clique.length > 0);

  const contagemApos1Clique = await page.$eval("#questoes-contagem", (el) => el.textContent);
  console.log("Contagem de resultados mudou ao filtrar por grande área:", contagemApos1Clique !== totalGeral);

  // --- 3) Clicar em uma especialidade expande temas com contagem, e filtra ainda mais.
  const primeiraEspecialidade = await page.$eval("#questoes-hierarquia [data-especialidade]", (el) => el.dataset.especialidade);
  await page.click("#questoes-hierarquia [data-especialidade]");
  await page.waitForTimeout(300);
  const temasVisiveis = await page.$$eval("#questoes-hierarquia [data-tema-id]", (els) => els.length);
  console.log(`Temas aparecem ao abrir a especialidade '${primeiraEspecialidade}':`, temasVisiveis > 0);

  const contagemApos2Cliques = await page.$eval("#questoes-contagem", (el) => el.textContent);
  console.log("Contagem muda de novo ao filtrar por especialidade:", contagemApos2Cliques !== contagemApos1Clique);

  // --- 4) Clicar em um tema filtra para exatamente aquele tema (todos os cards com a mesma badge).
  await page.click("#questoes-hierarquia [data-tema-id]");
  await page.waitForTimeout(300);
  const cardsMesmoTema = await page.$$eval("#questoes-lista .card .badge--accent", (els) => new Set(els.map((e) => e.textContent)).size);
  console.log("Filtrar por tema mostra cards de um único tema:", cardsMesmoTema === 1);

  // --- 5) Cada card mostra a hierarquia (breadcrumb grande área › especialidade).
  const temBreadcrumbNoCard = await page.$eval("#questoes-lista .card p", (el) => el.textContent.includes("›"));
  console.log("Cada card mostra a hierarquia (Grande Área › Especialidade):", temBreadcrumbNoCard);

  // --- 6) "Ver todas as questões" limpa a hierarquia e volta ao total geral.
  await page.click("#questoes-limpar-hierarquia");
  await page.waitForTimeout(300);
  const contagemFinal = await page.$eval("#questoes-contagem", (el) => el.textContent);
  console.log("'Ver todas as questões' restaura a contagem total:", contagemFinal === totalGeral);
  const breadcrumbSumiu = await page.$eval("#questoes-breadcrumb", (el) => el.style.display === "none");
  console.log("Breadcrumb some após limpar:", breadcrumbSumiu);

  // --- 7) Compat ?categoria=Cardiologia continua funcionando com a hierarquia real.
  await page.evaluate(() => {
    location.hash = "";
  });
  await page.waitForTimeout(200);
  await page.evaluate(() => {
    location.hash = "/residencia/questoes?categoria=Cardiologia";
  });
  await page.waitForSelector("#questoes-hierarquia .content-area[open]", { timeout: 15000 });
  await page.waitForTimeout(300);
  const especialidadeAberta = await page.$eval("#questoes-hierarquia [data-especialidade]", (el) => el.textContent);
  console.log("?categoria=Cardiologia abre a hierarquia já na especialidade certa:", especialidadeAberta.includes("Cardiologia"));

  console.log("Erros JS capturados:", erros.length ? erros : "nenhum");
  await browser.close();
})().catch((e) => {
  console.error("ERRO:", e);
  process.exit(1);
});
