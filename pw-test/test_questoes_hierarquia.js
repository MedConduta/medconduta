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
  await page.waitForSelector("#filtro-grande-area", { timeout: 20000 });
  await page.waitForTimeout(300);

  // --- 1) Contagem geral aparece no topo (sem erro de pluralização).
  const totalGeral = await page.$eval("#questoes-contagem", (el) => el.textContent);
  console.log("Contagem geral aparece no topo (sem erro de pluralização):", /^\d+ quest(ão|ões) encontradas?/.test(totalGeral));

  const areasVisiveis = await page.$$eval("#filtro-grande-area option", (els) => els.map((e) => e.textContent.trim()));
  console.log("Grandes áreas reais aparecem no select (ex.: Clínica Médica):", areasVisiveis.some((t) => t.includes("Clínica Médica")));
  console.log("Nenhuma grande área fictícia (ex.: 'Subtema' não é nível de área):", !areasVisiveis.some((t) => t.toLowerCase().includes("subtema")));

  // --- 2) Selecionar uma grande área filtra os resultados, habilita o select de especialidade e mostra o breadcrumb.
  await page.selectOption("#filtro-grande-area", { label: areasVisiveis.find((t) => t.includes("Clínica Médica")) });
  await page.waitForTimeout(300);
  const especialidadeHabilitada = await page.$eval("#filtro-especialidade", (el) => !el.disabled);
  console.log("Select de especialidade habilita ao escolher a grande área:", especialidadeHabilitada);

  const breadcrumbApos1Selecao = await page.$eval("#questoes-breadcrumb", (el) => el.textContent);
  console.log("Breadcrumb reflete a grande área selecionada:", breadcrumbApos1Selecao.includes("Clínica Médica"));

  const contagemApos1Selecao = await page.$eval("#questoes-contagem", (el) => el.textContent);
  console.log("Contagem de resultados mudou ao filtrar por grande área:", contagemApos1Selecao !== totalGeral);

  // --- 3) Selecionar uma especialidade habilita o select de tema com opções, e filtra ainda mais.
  const especialidadesVisiveis = await page.$$eval("#filtro-especialidade option[value]:not([value=''])", (els) => els.map((e) => e.textContent.trim()));
  console.log("Especialidades aparecem ao selecionar a grande área:", especialidadesVisiveis.length > 0);

  const primeiraEspecialidade = especialidadesVisiveis[0];
  await page.selectOption("#filtro-especialidade", { label: primeiraEspecialidade });
  await page.waitForTimeout(300);
  const temaHabilitado = await page.$eval("#filtro-tema", (el) => !el.disabled);
  console.log(`Select de tema habilita ao escolher a especialidade '${primeiraEspecialidade}':`, temaHabilitado);

  const temasVisiveis = await page.$$eval("#filtro-tema option[value]:not([value=''])", (els) => els.map((e) => e.textContent.trim()));
  console.log("Temas aparecem ao selecionar a especialidade:", temasVisiveis.length > 0);

  const contagemApos2Selecoes = await page.$eval("#questoes-contagem", (el) => el.textContent);
  console.log("Contagem muda de novo ao filtrar por especialidade:", contagemApos2Selecoes !== contagemApos1Selecao);

  // --- 4) Selecionar um tema filtra para exatamente aquele tema (todos os cards com a mesma badge).
  await page.selectOption("#filtro-tema", { label: temasVisiveis[0] });
  await page.waitForTimeout(300);
  const cardsMesmoTema = await page.$$eval("#questoes-lista .card .badge--accent", (els) => new Set(els.map((e) => e.textContent)).size);
  console.log("Filtrar por tema mostra cards de um único tema:", cardsMesmoTema === 1);

  // --- 5) Cada card mostra a hierarquia (breadcrumb grande área › especialidade).
  const temBreadcrumbNoCard = await page.$eval("#questoes-lista .card p", (el) => el.textContent.includes("›"));
  console.log("Cada card mostra a hierarquia (Grande Área › Especialidade):", temBreadcrumbNoCard);

  // --- 6) "Ver todas as questões" limpa a hierarquia, reseta os selects e volta ao total geral.
  await page.click("#questoes-limpar-hierarquia");
  await page.waitForTimeout(300);
  const contagemFinal = await page.$eval("#questoes-contagem", (el) => el.textContent);
  console.log("'Ver todas as questões' restaura a contagem total:", contagemFinal === totalGeral);
  const breadcrumbSumiu = await page.$eval("#questoes-breadcrumb", (el) => el.style.display === "none");
  console.log("Breadcrumb some após limpar:", breadcrumbSumiu);
  const selectsResetados = await page.$eval("#filtro-especialidade", (el) => el.disabled) && (await page.$eval("#filtro-tema", (el) => el.disabled));
  console.log("Selects de especialidade e tema voltam a ficar desabilitados:", selectsResetados);

  // --- 7) Compat ?categoria=Cardiologia continua funcionando com a hierarquia real.
  await page.evaluate(() => {
    location.hash = "";
  });
  await page.waitForTimeout(200);
  await page.evaluate(() => {
    location.hash = "/residencia/questoes?categoria=Cardiologia";
  });
  await page.waitForSelector("#filtro-especialidade:not([disabled])", { timeout: 15000 });
  await page.waitForTimeout(300);
  const especialidadeSelecionada = await page.$eval("#filtro-especialidade", (el) => el.selectedOptions[0]?.textContent || "");
  console.log("?categoria=Cardiologia abre a hierarquia já na especialidade certa:", especialidadeSelecionada.includes("Cardiologia"));

  console.log("Erros JS capturados:", erros.length ? erros : "nenhum");
  await browser.close();
})().catch((e) => {
  console.error("ERRO:", e);
  process.exit(1);
});
