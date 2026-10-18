const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.route("https://medconduta-ai.medcondutaa.workers.dev/**", async (route) => {
    const req = route.request();
    const localUrl = req.url().replace("https://medconduta-ai.medcondutaa.workers.dev", "http://127.0.0.1:8787");
    const res = await page.request.fetch(localUrl, { method: req.method(), headers: req.headers(), data: req.postDataBuffer() || undefined, timeout: 60000 });
    await route.fulfill({ status: res.status(), headers: res.headers(), body: await res.body() });
  });
  const erros = [];
  page.on("pageerror", (e) => erros.push(e.message));
  const imagensQuebradas = [];
  page.on("response", (r) => {
    if (r.url().includes("/imagens/questoes/") && r.status() >= 400) imagensQuebradas.push(`${r.status()} ${r.url()}`);
  });

  const email = `teste.imagens.${Date.now()}@example.com`;
  await page.goto("http://localhost:8744");
  await page.waitForSelector("#login-email", { timeout: 10000 });
  await page.click("#login-alternar");
  await page.fill("#login-email", email);
  await page.fill("#login-password", "senha12345");
  await page.click("#login-submit");
  await page.waitForSelector("#sidebar-nav a", { timeout: 15000 });
  await page.waitForTimeout(800);

  // --- 1) Dados: toda questão com "imagens" aponta para arquivos que existem.
  const dados = await page.evaluate(async () => {
    const { carregarEspecialidades } = await import("/app/bancoQuestoes.js");
    const qs = await carregarEspecialidades();
    const comImagem = qs.filter((q) => Array.isArray(q.imagens) && q.imagens.length);
    const faltando = [];
    for (const q of comImagem) {
      for (const url of q.imagens) {
        const r = await fetch(url, { method: "HEAD" });
        if (!r.ok) faltando.push(`${q.id} ${url}`);
      }
    }
    return { total: comImagem.length, faltando };
  });
  console.log(`Questões com imagem no banco: ${dados.total}`);
  console.log("Todas as imagens referenciadas existem:", dados.total > 0 && dados.faltando.length === 0, dados.faltando.slice(0, 5));

  await page.evaluate(() => {
    location.hash = "/residencia/questoes";
  });
  await page.waitForSelector("#questoes-lista .card", { timeout: 20000 });

  // --- 2) A questão da curva de Langfitt (SES-PE 2019) mostra a imagem no card.
  await page.fill("#filtro-busca", "curva de Langfitt");
  await page.waitForTimeout(500);
  // sem filtro de especialidade, a busca no enunciado do banco todo é um clique explícito
  if (await page.$("#questoes-busca-global-btn")) {
    await page.click("#questoes-busca-global-btn");
    await page.waitForSelector("#questoes-lista .card .questao-imagem img", { timeout: 30000 });
  }
  const imgsNoCard = await page.$$eval("#questoes-lista .card .questao-imagem img", (els) => els.length);
  console.log("Card mostra a imagem da questão:", imgsNoCard >= 1);
  await page.waitForFunction(() => {
    const img = document.querySelector("#questoes-lista .card .questao-imagem img");
    return img && img.complete && img.naturalWidth > 0;
  }, null, { timeout: 10000 });
  const cabeNaTela = await page.$eval("#questoes-lista .card .questao-imagem img", (img) => img.getBoundingClientRect().width <= window.innerWidth);
  console.log("Imagem carregou e cabe na largura do celular:", cabeNaTela);

  // --- 3) Tocar na imagem abre a visualização ampliada; tocar nela amplia; tocar fora fecha.
  await page.click("#questoes-lista .card .questao-imagem");
  await page.waitForSelector(".zoom-imagem", { timeout: 3000 });
  const larguraAntes = await page.$eval(".zoom-imagem img", (img) => img.getBoundingClientRect().width);
  await page.click(".zoom-imagem img");
  await page.waitForTimeout(200);
  const larguraDepois = await page.$eval(".zoom-imagem img", (img) => img.getBoundingClientRect().width);
  console.log("Tocar na imagem abre o zoom em tela cheia:", true);
  console.log("Tocar de novo amplia a imagem (largura dobra):", larguraDepois > larguraAntes * 1.8, Math.round(larguraAntes), "->", Math.round(larguraDepois));
  await page.click(".zoom-imagem__fechar");
  await page.waitForTimeout(200);
  const fechou = (await page.$(".zoom-imagem")) === null;
  console.log("Botão fechar remove a visualização ampliada:", fechou);

  await page.click("#questoes-lista .card .questao-imagem");
  await page.waitForSelector(".zoom-imagem");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  console.log("Esc também fecha:", (await page.$(".zoom-imagem")) === null);

  // --- 4) Questões sem imagem não ganham bloco de imagem.
  await page.fill("#filtro-busca", "hipertensão");
  await page.waitForTimeout(500);
  const blocosVazios = await page.$$eval("#questoes-lista .card .questao-imagens:not(:has(img))", (els) => els.length);
  console.log("Nenhum bloco de imagem vazio em questões sem imagem:", blocosVazios === 0);

  console.log("Requisições de imagem com erro:", imagensQuebradas.length ? imagensQuebradas : "nenhuma");
  console.log("Erros JS capturados:", erros.length ? erros : "nenhum");
  await browser.close();
})().catch((e) => {
  console.error("ERRO:", e);
  process.exit(1);
});
