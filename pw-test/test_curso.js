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

  const email = `teste.curso.${Date.now()}@example.com`;
  await page.goto("http://localhost:8744");
  await page.waitForSelector("#login-email", { timeout: 10000 });
  await page.click("#login-alternar");
  await page.fill("#login-email", email);
  await page.fill("#login-password", "senha12345");
  await page.click("#login-submit");
  await page.waitForSelector("#sidebar-nav a", { timeout: 15000 });
  await page.waitForTimeout(800);

  // --- 1) Item "Curso" está na sidebar, na seção Minha Preparação
  const labels = await page.$$eval(".nav-section:has(.nav-section__title:text('Minha Preparação')) .nav-link__label", (els) =>
    els.map((e) => e.textContent.trim())
  );
  console.log("Sidebar 'Minha Preparação' inclui 'Curso':", labels.includes("Curso"));

  // --- 2) Navega para /residencia/curso e valida dashboard + agenda Hoje + grade
  await page.click(".nav-link:has-text('Curso')");
  await page.waitForFunction(() => document.querySelector(".main__container")?.textContent.includes("Progresso do curso"), { timeout: 20000 });
  let texto = await page.$eval(".main__container", (el) => el.textContent);
  console.log("Mostra 'Progresso do curso':", texto.includes("Progresso do curso"));
  console.log("Mostra dashboard com 'Revisões hoje':", texto.includes("Revisões hoje"));
  console.log("Mostra bloco '📅 Hoje':", texto.includes("Hoje"));
  console.log("Mostra 'Semana 1':", texto.includes("Semana 1"));

  // --- 2b) Usuário novo (nunca configurou início) não deve ver nada "atrasado" — a Semana 1 é
  // ancorada em hoje automaticamente (ver app/curriculo.js:garantirInicioCurso), não na data
  // absoluta da planilha (jan/2026), que já passou.
  const zeroAtrasadasTile = await page.$$eval(".stat-tile", (els) =>
    els.some((el) => el.textContent.includes("Atrasadas") && el.querySelector(".stat-tile__value")?.textContent.trim() === "0")
  );
  console.log("Tile 'Atrasadas' mostra 0 para usuário novo:", zeroAtrasadasTile);
  const campoInicio = await page.$eval("#curso-inicio-data", (el) => el.value);
  const hojeIsoLocal = new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD local
  console.log("Campo 'Início do curso' vem preenchido com hoje:", campoInicio === hojeIsoLocal);

  // --- 3) Grade tem exatamente os 49 itens do lote piloto (semanas 1-8), sem duplicar
  const totalCurriculo = await page.evaluate(async () => {
    const res = await fetch("data/curriculo.json");
    return (await res.json()).length;
  });
  const totalLinks = await page.$$eval(".content-tree [data-item]", (els) => els.length);
  console.log(`Total de itens no Curso bate com curriculo.json (${totalLinks} === ${totalCurriculo}):`, totalLinks === totalCurriculo);

  const numerosSemana = await page.$$eval(".content-tree .content-area summary", (els) => els.map((e) => e.textContent.trim()));
  console.log("32 semanas renderizadas:", numerosSemana.length === 32);
  console.log("Nenhuma semana vazia:", await page.$$eval(".content-tree .content-area", (els) => els.every((el) => el.querySelectorAll("[data-item]").length > 0)));

  // --- 4) Busca/filtro client-side
  await page.fill("#curso-busca", "hipertensão arterial sistêmica");
  await page.waitForTimeout(200);
  const visiveisBusca = await page.$$eval(".content-tree [data-item]:not([hidden])", (els) => els.length);
  console.log("Busca por 'hipertensão arterial sistêmica' filtra a lista (restam poucos itens, >0):", visiveisBusca > 0 && visiveisBusca < totalCurriculo);
  await page.fill("#curso-busca", "");
  await page.waitForTimeout(200);

  // --- 5) Marcar um tema como estudado em Conteúdo cria as 5 revisões (3/5/7/15/30d) e é idempotente
  const primeiroLink = await page.$eval(".content-tree [data-item] a.content-list__item", (el) => el.getAttribute("href"));
  await page.evaluate((href) => { location.hash = href.replace(/^#/, ""); }, primeiroLink);
  await page.waitForFunction(() => document.querySelector("#btn-concluir"), { timeout: 10000 });
  await page.click("#btn-concluir");
  await page.waitForFunction(() => document.querySelector("#btn-concluir")?.textContent.includes("Marcado"), { timeout: 10000 });

  const revisoesApos1Clique = await page.evaluate(async () => {
    const token = localStorage.getItem("medconduta:auth_token");
    const res = await fetch("https://medconduta-ai.medcondutaa.workers.dev/data/revisoes_curso", { headers: { Authorization: `Bearer ${token}` } });
    return res.ok ? res.json() : [];
  }).catch(() => null);

  // Clicar de novo (desmarcar + remarcar) não deve duplicar — mesmo id determinístico
  await page.click("#btn-concluir");
  await page.waitForFunction(() => !document.querySelector("#btn-concluir")?.textContent.includes("Marcado"), { timeout: 10000 });
  await page.click("#btn-concluir");
  await page.waitForFunction(() => document.querySelector("#btn-concluir")?.textContent.includes("Marcado"), { timeout: 10000 });

  const revisoesApos2Ciclos = await page.evaluate(async () => {
    const token = localStorage.getItem("medconduta:auth_token");
    const res = await fetch("https://medconduta-ai.medcondutaa.workers.dev/data/revisoes_curso", { headers: { Authorization: `Bearer ${token}` } });
    return res.ok ? res.json() : [];
  }).catch(() => null);

  console.log("Marcar como estudado gera exatamente 5 revisões (3/5/7/15/30d):", Array.isArray(revisoesApos1Clique) && revisoesApos1Clique.length === 5);
  console.log(
    "Marcar/desmarcar/marcar de novo no mesmo dia não duplica (continua 5, ids determinísticos):",
    Array.isArray(revisoesApos2Ciclos) && revisoesApos2Ciclos.length === 5
  );
  console.log(
    "Todos os 5 tipos de intervalo presentes:",
    Array.isArray(revisoesApos2Ciclos) && ["3d", "5d", "7d", "15d", "30d"].every((t) => revisoesApos2Ciclos.some((r) => r.tipo === t))
  );

  // --- 6) Voltar ao Curso: a etapa "Resumo" do item marcado aparece concluída (as 3 etapas —
  // resumo/questões/flashcards — são independentes: só marcar o resumo não fecha o tema em 100%
  // se ele também tiver questões/flashcards vinculados, por design — ver seção 6/10 do pedido).
  await page.evaluate(() => { location.hash = "/residencia/curso"; });
  await page.waitForFunction(() => document.querySelector(".main__container")?.textContent.includes("Progresso do curso"), { timeout: 15000 });
  const primeiroItemTexto = await page.$eval(".content-tree [data-item]", (el) => el.textContent);
  console.log("Item marcado mostra etapa 'Resumo' concluída (✓ Resumo):", primeiroItemTexto.includes("✓ Resumo"));
  const statusPrimeiroItem = await page.$eval(".content-tree [data-item]", (el) => el.dataset.status);
  console.log("Item marcado sai de 'não iniciado' (status agora 'em-andamento' ou 'concluido'):", statusPrimeiroItem !== "nao-iniciado");

  // --- 7) Smoke: rota funciona em navegação direta por hash
  await page.evaluate(() => { location.hash = ""; });
  await page.waitForTimeout(300);
  await page.evaluate(() => { location.hash = "/residencia/curso"; });
  await page.waitForFunction(() => document.querySelector(".main__container")?.textContent.includes("Progresso do curso"), { timeout: 10000 });
  console.log("Rota /residencia/curso renderiza via navegação direta: true");

  // --- 8) Screenshots pra inspeção visual (desktop + mobile)
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: "/tmp/screenshot_curso_desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: "/tmp/screenshot_curso_mobile.png", fullPage: true });

  console.log("Erros JS capturados:", erros.length ? erros : "nenhum");
  await browser.close();
})().catch((e) => { console.error("ERRO:", e); process.exit(1); });
