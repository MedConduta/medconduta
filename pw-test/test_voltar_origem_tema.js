const { chromium } = require("playwright");

// "←" do tema volta para onde o usuário veio: Curso (mesma semana) ou Conteúdo.
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
  await page.fill("#login-email", `teste.voltar.${Date.now()}@example.com`);
  await page.fill("#login-password", "senha12345");
  if (process.env.CONVITE) await page.fill("#login-convite", process.env.CONVITE);
  await page.click("#login-submit");
  await page.waitForSelector("#sidebar-nav a", { timeout: 15000 });

  // --- 1) Pelo Curso: abre um tema da Semana 5 e volta
  await page.goto("http://localhost:8744/#/residencia/curso");
  await page.waitForSelector('[data-semana="5"] [data-item] a.content-list__item', { state: "attached", timeout: 20000 });
  await page.$eval('[data-semana="5"]', (d) => (d.open = true));
  await page.click('[data-semana="5"] [data-item] a.content-list__item');
  await page.waitForSelector(".tema-leitura .page-header a.btn--ghost", { timeout: 20000 });
  const volta = await page.$eval(".tema-leitura .page-header a.btn--ghost", (a) => ({ href: a.getAttribute("href"), texto: a.textContent.trim() }));
  console.log("Pelo Curso, volta para o Curso na semana 5:", volta.href === "#/residencia/curso?semana=5", volta);
  console.log("Rótulo 'Curso · Semana 5':", volta.texto === "← Curso · Semana 5");
  await page.click(".tema-leitura .page-header a.btn--ghost");
  await page.waitForSelector('[data-semana="5"]', { timeout: 20000 });
  await page.waitForTimeout(500);
  const semana5Aberta = await page.$eval('[data-semana="5"]', (d) => d.open);
  console.log("Voltou com a Semana 5 aberta:", semana5Aberta, page.url());

  // --- 2) Pelo Conteúdo: volta para Conteúdo
  await page.goto("http://localhost:8744/#/residencia/conteudo");
  await page.waitForSelector("#content-tree a.content-list__item", { state: "attached", timeout: 20000 });
  const href = await page.$eval("#content-tree a.content-list__item", (a) => a.getAttribute("href"));
  await page.goto(`http://localhost:8744/${href}`);
  await page.waitForSelector(".tema-leitura .page-header a.btn--ghost", { timeout: 20000 });
  const volta2 = await page.$eval(".tema-leitura .page-header a.btn--ghost", (a) => ({ href: a.getAttribute("href"), texto: a.textContent.trim() }));
  console.log("Pelo Conteúdo, volta para Conteúdo:", volta2.href === "#/residencia/conteudo" && volta2.texto === "← Conteúdo", volta2);

  await page.goto("http://localhost:8744/#/residencia/curso?semana=12");
  await page.waitForSelector('[data-semana="12"]', { state: "attached", timeout: 20000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: "pw-test/curso_volta_semana.png" });

  console.log("Sem erros de JS:", erros.length === 0, erros);
  await browser.close();
})();
