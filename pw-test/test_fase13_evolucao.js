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

  const email = `teste.fase13.${Date.now()}@example.com`;
  await page.goto("http://localhost:8744");
  await page.waitForSelector("#login-email", { timeout: 10000 });
  const heading = await page.textContent("h1");
  if (!heading.includes("Criar")) await page.click("#login-alternar");
  await page.fill("#login-email", email);
  await page.fill("#login-password", "senha12345");
  await page.click("#login-submit");
  await page.waitForSelector("#sidebar-nav a", { timeout: 15000 });

  // --- 0) Usuário novo, sem dados: /residencia/desempenho não deve quebrar
  await page.evaluate(() => { location.hash = "/residencia/desempenho"; });
  await page.waitForSelector(".main__container", { timeout: 10000 });
  await page.waitForFunction(() => document.querySelector(".main__container")?.textContent.includes("Análise de desempenho"), { timeout: 15000 });
  let texto = await page.$eval(".main__container", (el) => el.textContent);
  console.log("Usuário novo — página carrega sem quebrar:", texto.includes("Análise de desempenho"));
  const numCards = await page.$$eval(".plan-queue .card", (els) => els.length);
  console.log("Usuário novo — mostra 8 semanas no detalhamento (cards):", numCards === 8);
  console.log("Usuário novo — mostra estatística de prontidão atual:", texto.includes("Prontidão agora"));

  // --- 1) Link de acesso a partir de "Minha Preparação"
  await page.evaluate(() => { location.hash = "/residencia/minha-preparacao"; });
  // Espera o render assíncrono terminar de verdade (não só o placeholder de
  // loading) antes de interagir — senão essa renderização mais lenta pode
  // terminar depois e sobrescrever a página seguinte (race condition do
  // roteador entre navegações rápidas e renders lentos concorrentes).
  await page.waitForFunction(() => document.querySelector(".main__container")?.textContent.includes("Agenda de hoje"), { timeout: 15000 });
  const linkDesempenho = await page.$('a[href="#/residencia/desempenho"]');
  console.log("Atalho 'Desempenho' presente em Minha Preparação:", !!linkDesempenho);
  await linkDesempenho.click();
  await page.waitForSelector(".main__container", { timeout: 10000 });
  await page.waitForFunction(() => document.querySelector(".main__container")?.textContent.includes("Análise de desempenho"), { timeout: 15000 });
  texto = await page.$eval(".main__container", (el) => el.textContent);
  console.log("Clique no atalho navega para Análise de desempenho:", texto.includes("Análise de desempenho"));

  // --- 2) Nav lateral tem o item Desempenho
  const navDesempenho = await page.$('a[href="#/residencia/desempenho"].nav-link');
  console.log("Item 'Desempenho' presente na sidebar:", !!navDesempenho);

  // --- 3) Responde algumas questões pra gerar dados reais, depois confere a evolução
  await page.evaluate(() => { location.hash = "/residencia/questoes"; });
  await page.waitForSelector(".main__container", { timeout: 10000 });
  await page.waitForTimeout(1000);
  for (let i = 0; i < 3; i++) {
    const alternativa = await page.$(".alternativa, .question-option, [data-alternativa]");
    if (!alternativa) break;
    await alternativa.click();
    await page.waitForTimeout(300);
    const proximo = await page.$("text=/Próxima|Continuar|Ver resultado/i");
    if (proximo) {
      await proximo.click();
      await page.waitForTimeout(500);
    } else {
      break;
    }
  }

  await page.evaluate(() => { location.hash = "/residencia/desempenho"; });
  await page.waitForSelector(".main__container", { timeout: 10000 });
  await page.waitForFunction(() => document.querySelector(".main__container")?.textContent.includes("Análise de desempenho"), { timeout: 15000 });
  texto = await page.$eval(".main__container", (el) => el.textContent);
  console.log("Após responder questões, página de desempenho ainda carrega sem erro:", texto.includes("Análise de desempenho"));

  console.log("Erros JS capturados:", erros.length ? erros : "nenhum");
  await browser.close();
})().catch((e) => { console.error("ERRO:", e); process.exit(1); });
