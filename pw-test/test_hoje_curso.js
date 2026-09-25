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

  const email = `teste.hojecurso.${Date.now()}@example.com`;
  await page.goto("http://localhost:8744");
  await page.waitForSelector("#login-email", { timeout: 10000 });
  await page.click("#login-alternar");
  await page.fill("#login-email", email);
  await page.fill("#login-password", "senha12345");
  await page.click("#login-submit");
  await page.waitForSelector("#sidebar-nav a", { timeout: 15000 });
  await page.waitForTimeout(800);

  // --- 1) Usuário que NUNCA abriu o Curso: "Hoje" não amarra nada ao Curso
  // (sem badge "Semana X do Curso") — comportamento de antes preservado.
  await page.evaluate(() => { location.hash = "/residencia/planejador"; });
  await page.waitForSelector("#plano-resultado .plan-item, #plano-resultado .empty-state", { timeout: 15000 });
  await page.waitForTimeout(500);
  const badgesAntesDoCurso = await page.$$eval(".plan-item .badge--accent", (els) => els.length);
  console.log("Sem o Curso iniciado, nenhum item mostra badge de semana do Curso:", badgesAntesDoCurso === 0);

  // --- 2) Abrir o Curso pela 1ª vez ancora o cronograma em hoje (semana 1
  // alinhada com a data de hoje).
  await page.evaluate(() => { location.hash = "/residencia/curso"; });
  await page.waitForSelector(".card", { timeout: 20000 });
  await page.waitForTimeout(500);

  // --- 3) Voltar em "Hoje": agora deve mostrar pelo menos um item de
  // conteúdo com a badge "Semana 1 do Curso" (curriculo.json começa na
  // semana 1, ancorada em hoje pela abertura do Curso no passo 2).
  await page.evaluate(() => { location.hash = "/residencia/planejador"; });
  await page.waitForSelector("#plano-resultado .plan-item, #plano-resultado .empty-state", { timeout: 15000 });
  await page.waitForTimeout(500);

  const badgesDepoisDoCurso = await page.$$eval(".plan-item .badge--accent", (els) => els.map((e) => e.textContent.trim()));
  console.log("Badges de semana do Curso na agenda de hoje:", badgesDepoisDoCurso);
  console.log("Pelo menos um item citando 'Semana 1 do Curso':", badgesDepoisDoCurso.some((t) => t.includes("Semana 1 do Curso")));

  // --- 4) O bloco de questões também deve citar a semana atual do Curso
  // no detalhe, quando há categoria em comum com o cronograma de hoje.
  const detalheQuestoes = await page.$$eval("#plano-resultado .plan-item", (els) =>
    els.map((el) => el.textContent).filter((t) => t.includes("Bloco de questões"))
  );
  console.log("Detalhe do bloco de questões:", detalheQuestoes[0] || "(nenhum bloco de questões na fila)");

  console.log("Erros JS capturados:", erros.length ? erros : "nenhum");
  await browser.close();
})().catch((e) => {
  console.error("ERRO:", e);
  process.exit(1);
});
