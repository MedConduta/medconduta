const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const page = await browser.newPage();
  await page.route("https://medconduta-ai.medcondutaa.workers.dev/**", async (route) => {
    const req = route.request();
    const localUrl = req.url().replace("https://medconduta-ai.medcondutaa.workers.dev", "http://127.0.0.1:8787");
    // Atraso proposital pra dar tempo do teste flagrar o skeleton antes do conteúdo real.
    await new Promise((r) => setTimeout(r, 120));
    const res = await page.request.fetch(localUrl, { method: req.method(), headers: req.headers(), data: req.postDataBuffer() || undefined, timeout: 60000 });
    await route.fulfill({ status: res.status(), headers: res.headers(), body: await res.body() });
  });
  const erros = [];
  page.on("pageerror", (e) => erros.push(e.message));
  page.on("console", (msg) => {
    if (msg.type() === "error" && !msg.text().includes("ERR_CERT_AUTHORITY_INVALID")) erros.push(msg.text());
  });

  const email = `teste.skeletons.${Date.now()}@example.com`;
  await page.goto("http://localhost:8744");
  await page.waitForSelector("#login-email", { timeout: 10000 });
  await page.click("#login-alternar");
  await page.fill("#login-email", email);
  await page.fill("#login-password", "senha12345");
  await page.click("#login-submit");
  await page.waitForSelector("#sidebar-nav a", { timeout: 15000 });

  async function checaSkeletonEConteudoFinal(nomeTela, linkTexto, textoFinal) {
    await page.click(`.nav-link:has-text('${linkTexto}')`);
    const temSkeleton = await page.waitForSelector(".main__container .skeleton", { timeout: 3000 }).then(() => true).catch(() => false);
    console.log(`${nomeTela}: mostra skeleton enquanto carrega:`, temSkeleton);
    await page.waitForFunction(
      (t) => document.querySelector(".main__container")?.textContent.includes(t),
      textoFinal,
      { timeout: 20000 }
    );
    await page.waitForTimeout(200);
    const skeletonSumiu = (await page.$(".main__container .skeleton")) === null;
    console.log(`${nomeTela}: skeleton some depois que o conteúdo real carrega:`, skeletonSumiu);
  }

  await checaSkeletonEConteudoFinal("Minha Preparação", "Minha Preparação", "Índice de Prontidão");
  await checaSkeletonEConteudoFinal("Curso", "Curso", "Progresso do Curso");
  await checaSkeletonEConteudoFinal("Conteúdo", "Conteúdo", "Resumos por tema");
  await checaSkeletonEConteudoFinal("Prontidão", "Prontidão", "Painel de prontidão");

  console.log("\nErros de console/página:", erros.length ? erros : "nenhum");
  await page.waitForTimeout(300);
  await browser.close();
})();
