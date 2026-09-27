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
  page.on("console", (msg) => {
    if (msg.type() === "error" && !msg.text().includes("ERR_CERT_AUTHORITY_INVALID")) erros.push(msg.text());
  });

  const email = `teste.streak.${Date.now()}@example.com`;
  await page.goto("http://localhost:8744");
  await page.waitForSelector("#login-email", { timeout: 10000 });
  await page.click("#login-alternar");
  await page.fill("#login-email", email);
  await page.fill("#login-password", "senha12345");
  await page.click("#login-submit");
  await page.waitForSelector("#sidebar-nav a", { timeout: 15000 });
  await page.waitForTimeout(800);

  // --- 1) Usuário novo (streak 0): componente aparece inativo em Minha Preparação
  await page.waitForFunction(() => document.querySelector(".streak-chamativo"), { timeout: 20000 });
  let classe = await page.$eval(".streak-chamativo", (el) => el.className);
  let numero = await page.$eval(".streak-chamativo__numero", (el) => el.textContent.trim());
  console.log("Minha Preparação (streak 0): componente existe e mostra 'is-inativo':", classe.includes("is-inativo"));
  console.log("Minha Preparação (streak 0): número mostrado é 0:", numero === "0");

  // --- 2) Responde uma questão (cria atividade hoje) e confirma que o streak vira 1 e o badge fica ativo
  await page.click(".nav-link:has-text('Questões')");
  await page.waitForFunction(() => document.querySelector(".main__container")?.textContent.includes("Banco de questões"), { timeout: 20000 });
  await page.waitForSelector(".opcoes[data-qid] .question-option", { timeout: 15000 });
  await page.click(".opcoes[data-qid] .question-option");
  await page.waitForTimeout(300);

  await page.click(".nav-link:has-text('Minha Preparação')");
  await page.waitForFunction(() => document.querySelector(".streak-chamativo"), { timeout: 20000 });
  await page.waitForTimeout(300);
  classe = await page.$eval(".streak-chamativo", (el) => el.className);
  numero = await page.$eval(".streak-chamativo__numero", (el) => el.textContent.trim());
  console.log("Após responder 1 questão hoje, streak vira 1:", numero === "1");
  console.log("Badge fica com classe 'is-ativo':", classe.includes("is-ativo"));

  // --- 3) Componente também aparece em Hoje (planejador), com o mesmo valor
  await page.click(".nav-link:has-text('Hoje')");
  await page.waitForFunction(() => document.querySelector(".streak-chamativo"), { timeout: 20000 });
  const numeroHoje = await page.$eval(".streak-chamativo__numero", (el) => el.textContent.trim());
  console.log("Tela 'Hoje' também mostra o streak (valor 1):", numeroHoje === "1");

  console.log("\nErros de console/página:", erros.length ? erros : "nenhum");
  await page.waitForTimeout(300);
  await browser.close();
})();
