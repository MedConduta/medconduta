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

  const email = `teste.teto.${Date.now()}@example.com`;
  await page.goto("http://localhost:8744");
  await page.waitForSelector("#login-email", { timeout: 10000 });
  const heading = await page.textContent("h1");
  if (!heading.includes("Criar")) await page.click("#login-alternar");
  await page.fill("#login-email", email);
  await page.fill("#login-password", "senha12345");
  await page.click("#login-submit");
  await page.waitForSelector("#sidebar-nav a", { timeout: 15000 });

  // Seed manual: 30 questões erradas (sem registro SRS ainda, então
  // estaVencido(null) === true pra todas) — backlog gigante de "Meus Erros"
  // pra testar o teto de tempo de revisões vencidas (ver TETO_REVISOES_PCT
  // em planner.js), sem depender de responder 30 questões via UI.
  const totalSeedado = await page.evaluate(async () => {
    const { fetchJsonCached } = await import("/app/utils.js");
    const { setItem } = await import("/app/db.js");
    const questoes = await fetchJsonCached("data/questoes.json");
    const amostra = questoes.slice(0, 30);
    for (const q of amostra) {
      await setItem("respostas", {
        id: `resp-seed-${q.id}`,
        questaoId: q.id,
        temaId: q.temaId,
        tema: q.tema,
        categoria: "Cardiologia",
        banca: q.banca,
        ano: q.ano,
        acertou: false,
        respondidoEm: new Date().toISOString(),
      });
    }
    return amostra.length;
  });
  console.log("Erros semeados (respostas com acertou=false):", totalSeedado);

  await page.evaluate(() => { location.hash = "/residencia/planejador"; });
  await page.waitForSelector("#horas-range", { timeout: 10000 });

  // Fixa 2h (120 min) — mesmo valor default.
  await page.evaluate(() => {
    const range = document.querySelector("#horas-range");
    range.value = "2";
    range.dispatchEvent(new Event("input"));
  });
  await page.click("#btn-gerar");
  await page.waitForSelector(".plan-queue .plan-item", { timeout: 10000 });
  await page.waitForTimeout(500);

  const itens = await page.$$eval(".plan-item strong", (els) => els.map((e) => e.textContent));
  const totalRevisoes = itens.filter((t) => t.startsWith("Revisar erro:")).length;
  const minutosRevisoes = totalRevisoes * 6; // MIN_POR_REVISAO_ERRO

  console.log("Total de itens 'Revisar erro:' na fila (backlog de 30 erros, dia de 120min):", totalRevisoes);
  console.log("Minutos em revisões:", minutosRevisoes, "de 120min disponíveis");
  console.log("Revisões ficaram <= 40% do dia (48min, ou seja <= 8 itens de 6min):", minutosRevisoes <= 48);
  console.log("Sem o teto seria revisão até esgotar o backlog de 30 — confirma que o teto está ativo:", totalRevisoes < 30);

  const totalConteudoOuQuestoes = itens.length - totalRevisoes;
  console.log("Sobrou espaço na fila pra conteúdo/questões além das revisões:", totalConteudoOuQuestoes > 0);

  console.log("Erros JS capturados:", erros.length ? erros : "nenhum");
  await browser.close();
})().catch((e) => { console.error("ERRO:", e); process.exit(1); });
