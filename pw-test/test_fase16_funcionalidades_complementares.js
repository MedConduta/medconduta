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

  const email = `teste.fase16.${Date.now()}@example.com`;
  await page.goto("http://localhost:8744");
  await page.waitForSelector("#login-email", { timeout: 10000 });
  const heading = await page.textContent("h1");
  if (!heading.includes("Criar")) await page.click("#login-alternar");
  await page.fill("#login-email", email);
  await page.fill("#login-password", "senha12345");
  await page.click("#login-submit");
  await page.waitForSelector("#sidebar-nav a", { timeout: 15000 });

  // --- 1) Meta mínima diária: usuário novo, ainda não bateu ---
  // Minha Preparação já é a rota padrão do boot (hash vazio) — o próprio
  // initRouter() já disparou esse render. Setar o hash de novo pra essa
  // MESMA rota dispara um hashchange redundante (valor mudou de "" pra
  // "/residencia/minha-preparacao"), gerando dois renders concorrentes da
  // mesma página cujo término fora de ordem pode sobrescrever a navegação
  // seguinte. Por isso só esperamos o render (único) que o boot já iniciou.
  await page.waitForFunction(() => document.querySelector(".main__container")?.textContent.includes("Meta mínima de hoje"), { timeout: 15000 });
  let texto = await page.$eval(".main__container", (el) => el.textContent);
  console.log("Meta mínima diária aparece em Minha Preparação:", texto.includes("Meta mínima de hoje"));
  console.log("Usuário novo — meta ainda não batida:", texto.includes("ainda não batida"));

  // Responde 10 questões (uma por card distinto) pra bater a meta
  await page.evaluate(() => { location.hash = "/residencia/questoes"; });
  await page.waitForSelector("#filtro-tema", { timeout: 10000 });
  await page.waitForFunction(() => document.querySelectorAll(".opcoes").length > 0, { timeout: 10000 });
  const containers = await page.$$(".opcoes");
  let respondidas = 0;
  for (let i = 0; i < 10 && i < containers.length; i++) {
    const qid = await containers[i].getAttribute("data-qid");
    const primeiraOpcao = await containers[i].$(".question-option");
    await primeiraOpcao.click();
    try {
      await page.waitForFunction(
        (id) => document.querySelector(`.resultado[data-qid="${id}"]`)?.textContent.trim().length > 0,
        qid,
        { timeout: 5000 }
      );
      respondidas++;
    } catch {
      // segue mesmo se uma tentativa não confirmar visualmente a tempo
    }
  }
  console.log("[debug] respostas confirmadas visualmente:", respondidas, "de 10");
  await page.evaluate(() => { location.hash = "/residencia/minha-preparacao"; });
  await page.waitForSelector(".main__container", { timeout: 10000 });
  await page.waitForFunction(() => document.querySelector(".main__container")?.textContent.includes("Meta mínima de hoje"), { timeout: 15000 });
  texto = await page.$eval(".main__container", (el) => el.textContent);
  console.log("Após responder 10 questões, meta mínima diária batida:", texto.includes("Meta mínima de hoje batida"));

  // --- 2) Modo dia ruim ---
  await page.evaluate(() => { location.hash = "/residencia/planejador"; });
  await page.waitForSelector("#btn-dia-ruim", { timeout: 10000 });
  await page.click("#btn-dia-ruim");
  await page.waitForFunction(() => document.querySelector("#plano-resultado")?.textContent.includes("dias ruins"), { timeout: 10000 });
  texto = await page.$eval("#plano-resultado", (el) => el.textContent);
  console.log("Modo dia ruim mostra aviso encorajador:", texto.includes("Tudo bem ter dias ruins"));
  const totalMinutosDiaRuim = await page.$$eval(".plan-item__duration", (els) => els.reduce((acc, e) => acc + parseInt(e.textContent), 0));
  console.log("Modo dia ruim gera uma fila bem pequena (<=25min):", totalMinutosDiaRuim > 0 && totalMinutosDiaRuim <= 25);

  // --- 3) Simulados estratégicos ---
  await page.evaluate(() => { location.hash = "/residencia/simulados"; });
  await page.waitForSelector("#simulado-tipo", { timeout: 10000 });
  console.log("Seletor de tipo de simulado presente:", !!(await page.$("#simulado-tipo")));
  await page.selectOption("#simulado-tipo", "estrategico");
  await page.selectOption("#simulado-tamanho", "20");
  await page.click("#btn-iniciar");
  await page.waitForSelector(".question-option", { timeout: 15000 });
  texto = await page.$eval(".page-header", (el) => el.textContent);
  console.log("Simulado estratégico mostra quais categorias são o foco:", texto.includes("🎯 Estratégico — foco em"));

  // Responde tudo rápido pra finalizar
  const totalQuestoesSimulado = await page.$$eval("[data-nav]", (els) => els.length);
  for (let i = 0; i < totalQuestoesSimulado; i++) {
    await page.click(".question-option");
    const proximo = await page.$("#btn-proxima:not([disabled])");
    if (proximo) await proximo.click();
  }
  await page.click("#btn-finalizar");
  await page.waitForSelector("#btn-novo-simulado", { timeout: 10000 });
  texto = await page.$eval(".page-header", (el) => el.textContent);
  console.log("Resultado do simulado estratégico também mostra o foco:", texto.includes("🎯 Simulado estratégico"));

  // --- 4) Revisão de Alto Rendimento ---
  await page.evaluate(() => { location.hash = "/residencia/revisao-alto-rendimento"; });
  await page.waitForSelector(".main__container", { timeout: 10000 });
  await page.waitForTimeout(500);
  texto = await page.$eval(".main__container", (el) => el.textContent);
  console.log("Revisão de Alto Rendimento carrega sem quebrar:", texto.includes("Revisão de Alto Rendimento"));
  const temCategoriaCritica = texto.includes("Crítico") || texto.includes("Atenção") || texto.includes("Nenhum gargalo crítico");
  console.log("Mostra categorias críticas/atenção OU estado vazio coerente:", temCategoriaCritica);

  const linkPraticar = await page.$('a[href^="#/residencia/questoes?categoria="]');
  if (linkPraticar) {
    const href = await linkPraticar.getAttribute("href");
    await linkPraticar.click();
    await page.waitForSelector(".main__container", { timeout: 10000 });
    await page.waitForTimeout(300);
    texto = await page.$eval(".main__container", (el) => el.textContent);
    console.log("Link 'Praticar questões' filtra corretamente por categoria:", texto.includes("Filtrado:"));
    console.log("Link 'Ver todas as questões' está presente pra limpar o filtro:", !!(await page.$('a[href="#/residencia/questoes"]')));
  } else {
    console.log("Sem categoria crítica pra testar o link de questões (estado vazio, ok pra usuário novo):", true);
  }

  // --- 5) Item de sidebar novo ---
  console.log("Item 'Alto Rendimento' presente na sidebar:", !!(await page.$('a[href="#/residencia/revisao-alto-rendimento"].nav-link')));

  // --- 6) Regressão: rotas principais ainda funcionam ---
  const rotas = ["/residencia/minha-preparacao", "/residencia/cronograma", "/residencia/planejador", "/residencia/prontidao"];
  for (const rota of rotas) {
    await page.evaluate((r) => { location.hash = r; }, rota);
    await page.waitForSelector(".main__container", { timeout: 10000 });
    await page.waitForTimeout(500);
    const t = await page.$eval(".main__container", (el) => el.textContent);
    console.log(`${rota} — renderizou sem quebrar:`, t.trim().length > 0);
  }

  console.log("Erros JS capturados:", erros.length ? erros : "nenhum");
  await browser.close();
})().catch((e) => { console.error("ERRO:", e); process.exit(1); });
