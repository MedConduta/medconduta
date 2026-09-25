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

  const email = `teste.fase11.${Date.now()}@example.com`;
  await page.goto("http://localhost:8744");
  await page.waitForSelector("#login-email", { timeout: 10000 });
  const heading = await page.textContent("h1");
  if (!heading.includes("Criar")) await page.click("#login-alternar");
  await page.fill("#login-email", email);
  await page.fill("#login-password", "senha12345");
  await page.click("#login-submit");
  await page.waitForSelector("#sidebar-nav a", { timeout: 15000 });
  await page.waitForTimeout(800);

  // --- 1) Página inicial padrão agora é Minha Preparação (sem hash explícito, após login)
  const hashAtual = await page.evaluate(() => location.hash);
  console.log("Hash após login (deve ser vazio ou minha-preparacao):", hashAtual === "" || hashAtual.includes("minha-preparacao"));
  let texto = await page.$eval(".main__container", (el) => el.textContent);
  console.log("Tela inicial mostra 'Minha Preparação':", texto.includes("Minha Preparação"));
  console.log("Mostra Índice de Prontidão:", texto.includes("Índice de Prontidão"));
  console.log("Mostra 'Agenda de hoje' com CTA:", texto.includes("Agenda de hoje") && texto.includes("Ver agenda de hoje"));
  // Minha Preparação virou um dashboard analítico (sem lista de atalhos) —
  // a navegação pras demais telas fica só pela sidebar/bottom-nav.
  console.log("Não mostra mais a lista de atalhos (Cronograma/Simulados/Meus Erros/Modo Foco como cards):",
    !["Cronograma", "Simulados", "Meus Erros", "Modo Foco"].every((t) => texto.includes(t)));
  console.log("Mostra o dashboard analítico (Progresso do Curso, semana atual, gráfico semanal):",
    texto.includes("Progresso do Curso") && texto.includes("sua semana atual") && texto.includes("Progresso semana a semana"));

  // --- 2) Navegação reorganizada: 3 seções na sidebar
  const secoes = await page.$$eval(".nav-section__title", (els) => els.map((e) => e.textContent.trim()));
  console.log("Sidebar tem as 3 seções esperadas:", JSON.stringify(secoes));
  console.log("Ordem/nomes corretos:", secoes.join("|") === "Minha Preparação|Estudar|Praticar");

  // --- 3) Bottom nav tem "Início" apontando pra Minha Preparação
  const bottomLabels = await page.$$eval(".bottom-nav__link span:last-child", (els) => els.map((e) => e.textContent.trim()));
  console.log("Bottom nav mostra 'Início' primeiro:", bottomLabels[0] === "Início");

  // --- 4) Clicar em "Ver agenda de hoje" navega pra Hoje corretamente
  await page.click("text=Ver agenda de hoje");
  await page.waitForTimeout(600);
  texto = await page.$eval(".main__container", (el) => el.textContent);
  console.log("CTA leva pra tela Hoje:", texto.includes("Quanto tempo você tem hoje"));

  // --- 5) Clicar em "Minha Preparação" na sidebar volta pra tela inicial
  await page.click(".nav-link:has-text('Minha Preparação')");
  await page.waitForTimeout(600);
  texto = await page.$eval(".main__container", (el) => el.textContent);
  console.log("Voltar por 'Minha Preparação' na sidebar funciona:", texto.includes("Minha Preparação") && texto.includes("Índice de Prontidão"));

  // --- 6) Smoke test geral de todas as rotas
  const rotas = [
    "/residencia/minha-preparacao",
    "/residencia/conteudo",
    "/residencia/assistente",
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

  // --- 7) Screenshot da tela inicial pra inspeção visual
  await page.evaluate(() => { location.hash = "/residencia/minha-preparacao"; });
  await page.waitForTimeout(800);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({ path: "/tmp/screenshot_minha_preparacao_desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: "/tmp/screenshot_minha_preparacao_mobile.png", fullPage: true });

  console.log("Erros JS capturados:", erros.length ? erros : "nenhum");
  await browser.close();
})().catch((e) => { console.error("ERRO:", e); process.exit(1); });
