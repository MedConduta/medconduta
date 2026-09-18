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

  // Usuário novo: nenhum flashcard tem registro SRS ainda, então TODOS os
  // 158 flashcards contam como "vencidos" (estaVencido(null) === true) —
  // backlog gigante natural, sem precisar seed manual.
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
  const totalRevisoes = itens.filter((t) => t.startsWith("Revisar:")).length;
  const minutosRevisoes = totalRevisoes * 8; // MIN_POR_REVISAO_VENCIDA

  console.log("Total de itens 'Revisar:' na fila (backlog de 158 flashcards, dia de 120min):", totalRevisoes);
  console.log("Minutos em revisões:", minutosRevisoes, "de 120min disponíveis");
  console.log("Revisões ficaram <= 40% do dia (48min, ou seja <= 6 itens de 8min):", minutosRevisoes <= 48);
  console.log("Sem o teto seria só revisão até o fim dos 120min (15 itens) — confirma que o teto está ativo:", totalRevisoes < 15);

  const totalConteudoOuQuestoes = itens.length - totalRevisoes;
  console.log("Sobrou espaço na fila pra conteúdo/questões além das revisões:", totalConteudoOuQuestoes > 0);

  console.log("Erros JS capturados:", erros.length ? erros : "nenhum");
  await browser.close();
})().catch((e) => { console.error("ERRO:", e); process.exit(1); });
