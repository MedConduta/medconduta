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

  const email = `teste.curso.${Date.now()}@example.com`;
  await page.goto("http://localhost:8744");
  await page.waitForSelector("#login-email", { timeout: 10000 });
  await page.click("#login-alternar");
  await page.fill("#login-email", email);
  await page.fill("#login-password", "senha12345");
  await page.click("#login-submit");
  await page.waitForSelector("#sidebar-nav a", { timeout: 15000 });
  await page.waitForTimeout(800);

  // --- 1) Item "Curso" está na sidebar, na seção Minha Preparação
  const labels = await page.$$eval(".nav-section:has(.nav-section__title:text('Minha Preparação')) .nav-link__label", (els) =>
    els.map((e) => e.textContent.trim())
  );
  console.log("Sidebar 'Minha Preparação' inclui 'Curso':", labels.includes("Curso"));

  // --- 2) Navega para /residencia/curso e valida conteúdo geral
  await page.click(".nav-link:has-text('Curso')");
  await page.waitForFunction(() => document.querySelector(".main__container")?.textContent.includes("Curso completo"), { timeout: 10000 });
  let texto = await page.$eval(".main__container", (el) => el.textContent);
  console.log("Mostra título 'Curso completo':", texto.includes("Curso completo"));
  console.log("Mostra 'Progresso do curso':", texto.includes("Progresso do curso"));
  console.log("Mostra 'Semana 1':", texto.includes("Semana 1"));
  console.log("Mostra badge 'Você está aqui':", texto.includes("Você está aqui"));

  // --- 3) Todos os temas do currículo aparecem, divididos em semanas — total de itens de conteúdo bate com data/temas.json
  const totalTemas = await page.evaluate(async () => {
    const res = await fetch("data/temas.json");
    const temas = await res.json();
    return temas.length;
  });
  const totalLinks = await page.$$eval(".content-tree .content-list__item", (els) => els.length);
  console.log(`Total de temas listados no Curso bate com temas.json (${totalLinks} === ${totalTemas}):`, totalLinks === totalTemas);

  // --- 4) Nº de semanas bate com o alvo (41) e nenhuma semana está vazia
  const tamanhosSemana = await page.$$eval(".content-tree .content-area", (els) =>
    els.map((el) => el.querySelectorAll(".content-list__item").length)
  );
  console.log("Nº de semanas === 41:", tamanhosSemana.length === 41);
  console.log("Nenhuma semana vazia:", tamanhosSemana.every((n) => n > 0));
  console.log("Semanas somam o total de temas:", tamanhosSemana.reduce((a, b) => a + b, 0) === totalTemas);
  console.log("Largura das semanas varia (não é fixa):", new Set(tamanhosSemana).size > 1);

  // --- 5) Marcar um tema como estudado em Conteúdo e conferir que o Curso reflete o progresso
  const primeiroLink = await page.$eval(".content-tree .content-list__item", (el) => el.getAttribute("href"));
  await page.evaluate((href) => { location.hash = href.replace(/^#/, ""); }, primeiroLink);
  await page.waitForFunction(() => document.querySelector("#btn-concluir"), { timeout: 10000 });
  await page.click("#btn-concluir");
  await page.waitForFunction(() => document.querySelector("#btn-concluir")?.textContent.includes("Marcado"), { timeout: 10000 });

  await page.evaluate(() => { location.hash = "/residencia/curso"; });
  await page.waitForFunction(() => document.querySelector(".main__container")?.textContent.includes("Curso completo"), { timeout: 10000 });
  texto = await page.$eval(".main__container", (el) => el.textContent);
  console.log("Progresso do curso mostra 1 tema concluído:", /1\s*\/\s*\d+\s*temas/.test(texto));
  const primeiroItemMarcado = await page.$eval(".content-tree .content-list__item .content-list__title", (el) => el.textContent.trim().startsWith("✓"));
  console.log("Primeiro tema da lista aparece marcado com ✓:", primeiroItemMarcado);

  // --- 6) Smoke: rota funciona em navegação direta por hash
  await page.evaluate(() => { location.hash = ""; });
  await page.waitForTimeout(300);
  await page.evaluate(() => { location.hash = "/residencia/curso"; });
  await page.waitForFunction(() => document.querySelector(".main__container")?.textContent.includes("Curso completo"), { timeout: 10000 });
  console.log("Rota /residencia/curso renderiza via navegação direta: true");

  // --- 7) Screenshots pra inspeção visual (desktop + mobile)
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: "/tmp/screenshot_curso_desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: "/tmp/screenshot_curso_mobile.png", fullPage: true });

  console.log("Erros JS capturados:", erros.length ? erros : "nenhum");
  await browser.close();
})().catch((e) => { console.error("ERRO:", e); process.exit(1); });
