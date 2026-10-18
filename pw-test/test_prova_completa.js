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

  await page.goto("http://localhost:8744");
  await page.waitForSelector("#login-email", { timeout: 10000 });
  await page.click(".login-switch a[data-modo=criar]");
  await page.fill("#login-email", `teste.prova.${Date.now()}@example.com`);
  await page.fill("#login-password", "senha12345");
  await page.click("#login-submit");
  await page.waitForSelector("#sidebar-nav a", { timeout: 15000 });

  // --- 1) Lista de provas vem do índice (instituição + ano, com numeração).
  const provas = await page.evaluate(async () => {
    const { listarProvasCompletas } = await import("/app/simulados.js");
    return listarProvasCompletas();
  });
  console.log(`Provas completas disponíveis: ${provas.length}`, provas.slice(0, 4).map((p) => `${p.instituicao} ${p.edicao} (${p.total})`));
  console.log("Há pelo menos uma prova completa:", provas.length > 0);
  if (!provas.length) {
    await browser.close();
    return;
  }
  const alvo = provas[0];

  // --- 2) Tipo "Prova completa" mostra o seletor de provas e esconde o número de questões.
  await page.evaluate(() => {
    location.hash = "/residencia/simulados";
  });
  await page.waitForSelector("#simulado-tipo", { timeout: 15000 });
  await page.selectOption("#simulado-tipo", "prova");
  await page.waitForSelector("#simulado-prova", { timeout: 10000 });
  const tamanhoOculto = await page.$eval("#simulado-tamanho", (el) => el.closest(".field").hidden);
  console.log("Seletor de prova aparece e o número de questões some:", tamanhoOculto);

  // --- 3) Iniciar: questões na ordem da prova, com o número original, sem as anuladas.
  await page.selectOption("#simulado-prova", alvo.chave);
  await page.click("#btn-iniciar");
  await page.waitForSelector("#simulado-timer", { timeout: 30000 });
  const cabecalho = await page.$eval(".page-header__eyebrow", (el) => el.textContent);
  const nav = await page.$$eval("[data-nav]", (els) => els.map((e) => Number(e.textContent)));
  const crescente = nav.every((n, i) => i === 0 || n > nav[i - 1]);
  console.log("Cabeçalho indica a prova:", cabecalho.includes(`Prova completa ${alvo.instituicao}`), cabecalho.trim());
  console.log("Navegação usa o número da questão, em ordem crescente:", crescente);
  console.log("Anuladas ficam fora:", nav.length === alvo.total - alvo.anuladas, `${nav.length} de ${alvo.total} (${alvo.anuladas} anuladas)`);

  // --- 4) Responder e finalizar gera o resultado sem erro.
  await page.click(".question-option >> nth=0");
  await page.click("#btn-finalizar");
  await page.waitForSelector("#btn-novo-simulado", { timeout: 20000 });
  console.log("Finalizar mostra o resultado:", true);

  console.log("Erros JS capturados:", erros.length ? erros : "nenhum");
  await browser.close();
})().catch((e) => {
  console.error("ERRO:", e);
  process.exit(1);
});
