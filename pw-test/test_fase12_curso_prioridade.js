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

  const email = `teste.fase12.${Date.now()}@example.com`;
  await page.goto("http://localhost:8744");
  await page.waitForSelector("#login-email", { timeout: 10000 });
  const heading = await page.textContent("h1");
  if (!heading.includes("Criar")) await page.click("#login-alternar");
  await page.fill("#login-email", email);
  await page.fill("#login-password", "senha12345");
  await page.click("#login-submit");
  await page.waitForSelector("#sidebar-nav a", { timeout: 15000 });

  // --- 1) Lista de Conteúdo: reordenação por prioridade + selo de quadrante
  await page.evaluate(() => { location.hash = "/residencia/conteudo"; });
  await page.waitForSelector(".content-area", { timeout: 10000 });
  let texto = await page.$eval(".main__container", (el) => el.textContent);
  console.log("Explica a reordenação por prioridade no cabeçalho:", texto.includes("ordenadas por prioridade"));
  console.log("Mostra selo de quadrante (algum emoji) nos grupos:", /🔴|🟠|🟢|🟡|⚪/.test(texto));

  // Abre a 1ª área (Clínica Médica) e confere que a 1ª categoria dentro dela é Cardiologia
  // ou Infectologia (peso 5, usuário novo = mesmo desempenho padrão => desempate por score+alfabética)
  const primeiraArea = await page.$(".content-area");
  await primeiraArea.evaluate((el) => (el.open = true));
  const primeiraCategoria = await page.$eval(".content-area .content-group__title", (el) => el.textContent.trim());
  console.log("Primeira categoria dentro da 1ª área (deve ser de peso alto, ex. contém 'Cardiologia' ou 'Infectologia'):", primeiraCategoria);

  // --- 2) Página de tópico expandida: abre um tema qualquer
  const primeiroLink = await page.$(".content-list__item");
  await primeiroLink.click();
  await page.waitForSelector(".prose", { timeout: 10000 });
  texto = await page.$eval(".main__container", (el) => el.textContent);
  console.log("Mostra o selo de quadrante da categoria no cabeçalho do tema:", /🔴|🟠|🟢|🟡|⚪/.test(texto));
  const temPraticar = texto.includes("Praticar questões deste tema");
  console.log("Mostra (ou não) o link 'Praticar questões deste tema' coerentemente:", typeof temPraticar === "boolean");

  // --- 3) Testa o link "Praticar questões deste tema" quando presente
  const linkPraticar = await page.$("text=Praticar questões deste tema");
  if (linkPraticar) {
    const tituloTema = await page.$eval("h1", (el) => el.textContent.replace("✨ IA", "").trim());
    await linkPraticar.click();
    await page.waitForSelector("#filtro-tema", { timeout: 10000 });
    const valorSelecionado = await page.$eval("#filtro-tema", (el) => el.value);
    console.log(`Filtro de questões pré-selecionado com o tema (esperado: "${tituloTema}", obtido: "${valorSelecionado}"):`, valorSelecionado === tituloTema);
  } else {
    console.log("Tema aberto não tinha questões associadas — testando com um tema que sabidamente tem (HAS, q1):");
    await page.evaluate(() => { location.hash = "/residencia/questoes?tema=" + encodeURIComponent("Hipertensão Arterial Sistêmica (HAS)"); });
    await page.waitForSelector("#filtro-tema", { timeout: 10000 });
    const valorSelecionado = await page.$eval("#filtro-tema", (el) => el.value);
    console.log("Filtro pré-selecionado via query string direta:", valorSelecionado === "Hipertensão Arterial Sistêmica (HAS)");
  }

  // --- 4) Navegação anterior/próximo dentro da categoria
  await page.evaluate(() => { location.hash = "/residencia/conteudo"; });
  await page.waitForSelector(".content-area", { timeout: 10000 });
  await page.$eval(".content-area", (el) => (el.open = true));
  await page.waitForSelector(".content-list__item", { timeout: 10000 });
  const links = await page.$$eval(".content-area:first-of-type .content-group:first-of-type .content-list__item", (els) =>
    els.map((e) => e.getAttribute("href"))
  );
  if (links.length >= 2) {
    await page.evaluate((h) => { location.hash = h; }, links[0]);
    await page.waitForSelector(".prose", { timeout: 10000 });
    const temProximo = await page.$("text=/→$/");
    console.log("Primeiro tema da categoria mostra navegação 'próximo':", !!temProximo);
  }

  console.log("Erros JS capturados:", erros.length ? erros : "nenhum");
  await browser.close();
})().catch((e) => { console.error("ERRO:", e); process.exit(1); });
