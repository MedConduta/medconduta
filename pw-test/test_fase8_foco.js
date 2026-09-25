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

  const email = `teste.fase8.${Date.now()}@example.com`;
  await page.goto("http://localhost:8744");
  await page.waitForSelector("#login-email", { timeout: 10000 });
  const heading = await page.textContent("h1");
  if (!heading.includes("Criar")) await page.click("#login-alternar");
  await page.fill("#login-email", email);
  await page.fill("#login-password", "senha12345");
  await page.click("#login-submit");
  await page.waitForSelector("#sidebar-nav a", { timeout: 15000 });

  // --- 1) Estado inicial do Modo Foco
  await page.evaluate(() => { location.hash = "/residencia/foco"; });
  await page.waitForSelector("#btn-iniciar", { timeout: 10000 });
  let texto = await page.$eval(".main__container", (el) => el.textContent);
  const streakInicial = await page.$eval(".stat-tile:first-child .stat-tile__value", (el) => el.textContent.trim());
  console.log("Modo Foco mostra 'Sua constância' com 0 dias seguidos:", texto.includes("Sua constância") && streakInicial === "0");
  console.log("Mostra botão Iniciar sessão:", texto.includes("Iniciar sessão"));

  // --- 2) Iniciar, pausar, retomar, encerrar cedo (não deve registrar sessão, <3min)
  await page.click("#btn-iniciar");
  await page.waitForSelector("#btn-pausar", { timeout: 5000 });
  await page.waitForTimeout(1500);
  let timerTexto = await page.$eval(".main__container div[style*='font-size:56px']", (el) => el.textContent);
  console.log("Timer no formato MM:SS:", /^\d{2}:\d{2}$/.test(timerTexto));

  await page.click("#btn-pausar");
  await page.waitForTimeout(300);
  let pausadoTexto = await page.$eval(".main__container", (el) => el.textContent);
  console.log("Estado pausado mostra 'Pausado' e botão 'Retomar':", pausadoTexto.includes("Pausado") && pausadoTexto.includes("Retomar"));

  await page.click("#btn-pausar"); // retoma
  await page.waitForTimeout(300);
  await page.click("#btn-encerrar");
  await page.waitForTimeout(300);
  let aposEncerrarCedo = await page.$eval(".main__container", (el) => el.textContent);
  console.log("Encerrar cedo (<3min) NÃO mostra 'Sessão concluída':", !aposEncerrarCedo.includes("Sessão concluída"));
  console.log("Volta pro estado ocioso (mostra 'Iniciar sessão' de novo):", aposEncerrarCedo.includes("Iniciar sessão"));

  let sessoesAposEncerrarCedo = await page.evaluate(async () => {
    const { getAll } = await import("/app/db.js");
    return getAll("sessoes");
  });
  console.log("Nenhuma sessão registrada após encerrar cedo:", sessoesAposEncerrarCedo.length === 0);

  // --- 3) Injeta sessões diretamente no store (hoje + ontem) pra validar streak/stats
  await page.evaluate(async () => {
    const { setItem } = await import("/app/db.js");
    const hoje = new Date();
    const ontem = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await setItem("sessoes", { id: "sessao-teste-1", inicioEm: hoje.toISOString(), duracaoMin: 30, concluida: true });
    await setItem("sessoes", { id: "sessao-teste-2", inicioEm: ontem.toISOString(), duracaoMin: 25, concluida: true });
  });

  await page.evaluate(() => { location.hash = "/residencia/conteudo"; });
  await page.waitForTimeout(300);
  await page.evaluate(() => { location.hash = "/residencia/foco"; });
  await page.waitForSelector("#btn-iniciar", { timeout: 10000 });
  texto = await page.$eval(".main__container", (el) => el.textContent);
  console.log("Após injetar 2 sessões (hoje+ontem), streak = 2:", /2\s*🔥/.test(texto) || texto.includes("2 🔥"));
  console.log("Dias ativos no total = 2:", texto.includes("2Dias ativos no total") || /2\s*Dias ativos no total/.test(texto));
  console.log("Tempo em Modo Foco ~0.9h (55min):", texto.includes("0.9h"));

  // --- 4) "Hoje" mostra a linha de streak
  await page.evaluate(() => { location.hash = "/residencia/planejador"; });
  await page.waitForTimeout(500);
  let textoHoje = await page.$eval(".main__container", (el) => el.textContent);
  console.log("Hoje mostra streak de 2 dias:", textoHoje.includes("2 dias seguidos estudando"));

  // --- 5) Smoke test geral
  const rotas = [
    "/residencia/conteudo",
    "/residencia/questoes",
    "/residencia/erros",
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
