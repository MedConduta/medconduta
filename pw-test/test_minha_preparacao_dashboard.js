const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const page = await browser.newPage({ viewport: { width: 1280, height: 1400 } });
  await page.route("https://medconduta-ai.medcondutaa.workers.dev/**", async (route) => {
    const req = route.request();
    const localUrl = req.url().replace("https://medconduta-ai.medcondutaa.workers.dev", "http://127.0.0.1:8787");
    const res = await page.request.fetch(localUrl, { method: req.method(), headers: req.headers(), data: req.postDataBuffer() || undefined, timeout: 60000 });
    await route.fulfill({ status: res.status(), headers: res.headers(), body: await res.body() });
  });
  const erros = [];
  page.on("pageerror", (e) => erros.push(e.message));

  const email = `teste.dashboard.${Date.now()}@example.com`;
  await page.goto("http://localhost:8744");
  await page.waitForSelector("#login-email", { timeout: 10000 });
  await page.click("#login-alternar");
  await page.fill("#login-email", email);
  await page.fill("#login-password", "senha12345");
  await page.click("#login-submit");
  await page.waitForSelector("#sidebar-nav a", { timeout: 15000 });
  await page.waitForTimeout(800);

  await page.evaluate(() => { location.hash = "/residencia/minha-preparacao"; });
  await page.waitForSelector(".main__container", { timeout: 15000 });
  await page.waitForTimeout(700);

  // --- 1) Os "Atalhos" (9 cards de shortcut) não existem mais.
  const texto = await page.$eval(".main__container", (el) => el.textContent);
  console.log("Título 'Atalhos' foi removido:", !texto.includes("Atalhos"));
  const cardsAtalho = await page.$$eval('.main__container a[href="#/residencia/simulados"], .main__container a[href="#/residencia/foco"]', (els) => els.length);
  console.log("Nenhum card de atalho antigo (Simulados/Modo Foco) sobrou no conteúdo principal:", cardsAtalho === 0);

  // --- 2) Dashboard: anel de progresso do curso (SVG) presente.
  const temAnel = await page.$("svg circle") !== null;
  console.log("Anel de progresso do curso (SVG) renderizado:", temAnel);

  // --- 3) Card da semana atual.
  console.log("Mostra 'sua semana atual':", texto.includes("sua semana atual"));
  console.log("Mostra 'O que falta nesta semana' ou semana concluída:", texto.includes("O que falta nesta semana") || texto.includes("Semana concluída"));

  // --- 4) Gráfico de barras semana a semana.
  console.log("Mostra 'Progresso semana a semana':", texto.includes("Progresso semana a semana"));
  const barrasSemana = await page.$$eval('[title^="Semana "]', (els) => els.length);
  console.log("Gráfico de semanas tem barras (title com 'Semana N'):", barrasSemana > 0, `(${barrasSemana})`);

  // --- 5) Agenda de hoje continua presente (não é um "atalho", é a ação central).
  console.log("Card 'Agenda de hoje' continua presente:", texto.includes("Agenda de hoje"));

  // --- 6) Desempenho por grande área — usuário novo mostra estado vazio.
  console.log("Mostra título 'Desempenho por grande área':", texto.includes("Desempenho por grande área"));
  console.log("Usuário novo (sem respostas) mostra estado vazio:", texto.includes("Responda questões pra essa análise aparecer"));

  // --- 7) Após semear respostas de áreas diferentes, a seção agrega por GRANDE área
  // (rollup de subespecialidade via AREA_POR_CATEGORIA), não por categoria específica.
  await page.evaluate(async () => {
    const { setItem } = await import("/app/db.js");
    const registros = [
      { categoria: "Cardiologia", acertou: true }, // Clínica Médica
      { categoria: "Cardiologia", acertou: false },
      { categoria: "Cirurgia Geral", acertou: true }, // Cirurgia Geral
      { categoria: "Obstetrícia", acertou: false }, // Ginecologia e Obstetrícia
    ];
    for (let i = 0; i < registros.length; i++) {
      const r = registros[i];
      await setItem("respostas", {
        id: `resp-seed-area-${i}`,
        questaoId: `q-seed-area-${i}`,
        temaId: `tema-seed-area-${i}`,
        tema: "Tema de teste",
        categoria: r.categoria,
        banca: "Teste",
        ano: 2026,
        acertou: r.acertou,
        respondidoEm: new Date().toISOString(),
      });
    }
  });
  // Navega pra outra rota antes de voltar — o roteador (hash-based) não
  // re-renderiza numa navegação pro MESMO hash (hashchange não dispara).
  await page.evaluate(() => { location.hash = "/residencia/cronograma"; });
  await page.waitForTimeout(300);
  await page.evaluate(() => { location.hash = "/residencia/minha-preparacao"; });
  await page.waitForFunction(() => document.querySelector(".main__container")?.textContent.includes("Agenda de hoje"), { timeout: 15000 });
  await page.waitForTimeout(300);
  const textoComRespostas = await page.$eval(".main__container", (el) => el.textContent);
  console.log("Após respostas, mostra 'Clínica Médica' (rollup de Cardiologia):", textoComRespostas.includes("Clínica Médica"));
  console.log("Após respostas, mostra 'Cirurgia Geral':", textoComRespostas.includes("Cirurgia Geral"));
  console.log("Após respostas, mostra 'Ginecologia e Obstetrícia' (rollup de Obstetrícia):", textoComRespostas.includes("Ginecologia e Obstetrícia"));
  console.log("Não mostra mais o estado vazio da seção:", !textoComRespostas.includes("Responda questões pra essa análise aparecer"));

  // --- 8) Nenhum erro de JS.
  console.log("Erros JS capturados:", erros.length ? erros : "nenhum");

  await page.screenshot({ path: "/tmp/claude-0/-home-user-medconduta/189a7ed4-3170-599a-adb3-6689b402ef7e/scratchpad/minha_preparacao_dashboard.png", fullPage: true });

  await browser.close();
})().catch((e) => {
  console.error("ERRO:", e);
  process.exit(1);
});
