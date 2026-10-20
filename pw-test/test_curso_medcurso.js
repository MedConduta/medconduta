const { chromium } = require("playwright");

// Curso alinhado ao MEDCURSO 2026: 45 semanas, aulas com subtópicos, link de questões por tema e aviso de aulas bônus no fim do resumo.
(async () => {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
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
  await page.fill("#login-email", `teste.curso.${Date.now()}@example.com`);
  await page.fill("#login-password", "senha12345");
  await page.click("#login-submit");
  await page.waitForSelector("#sidebar-nav a", { timeout: 15000 });

  await page.evaluate(() => { location.hash = "/residencia/curso"; });
  await page.waitForSelector("[data-semana-card]", { timeout: 15000 });
  const semanas = await page.$$eval("[data-semana-card]", (els) => els.length);
  const sem1 = await page.$eval("[data-semana-card]", (el) => ({
    aulas: [...el.querySelectorAll(".curso-aula__titulo")].map((x) => x.textContent.trim()),
    topicos: el.querySelector(".curso-aula__topicos")?.textContent.trim() || "",
    links: [...el.querySelectorAll("a.acao-mini--link")].map((a) => a.getAttribute("href")),
  }));
  console.log("45 semanas:", semanas === 45, semanas);
  console.log("semana 1 com 2 aulas:", sem1.aulas.length === 2, sem1.aulas.join(" | "));
  console.log("subtópicos da aula:", sem1.topicos.includes("Doença de Berger"), sem1.topicos.slice(0, 90));
  console.log("links de questões por tema:", sem1.links.length > 0 && sem1.links.every((h) => h.includes("temaId=")), sem1.links[0]);
  await page.screenshot({ path: "pw-test/curso_semana1.png", clip: { x: 0, y: 0, width: 1280, height: 900 } });
  const card = await page.$("[data-semana-card]");
  await card.screenshot({ path: "pw-test/curso_semana1_card.png" });

  // Link de questões leva ao banco filtrado pelo tema.
  await page.evaluate((h) => { location.hash = h.replace(/^#/, ""); }, sem1.links[0]);
  await page.waitForTimeout(2500);
  const filtro = await page.evaluate(() => ({ hash: location.hash, texto: document.querySelector("main")?.innerText || "" }));
  console.log("questões filtradas pelo tema:", /Síndrome Nefrítica/.test(filtro.texto), filtro.hash);
  await page.screenshot({ path: "pw-test/curso_questoes_tema.png" });

  // Resumo: última seção é o aviso das aulas bônus.
  await page.evaluate(() => { location.hash = "/residencia/conteudo/sindrome-nefritica"; });
  await page.waitForSelector(".prose", { timeout: 15000 });
  await page.waitForTimeout(800);
  const ultima = await page.$$eval(".prose > *", (els) => els.filter((e) => e.textContent.trim()).map((e) => (e.querySelector("h3")?.textContent || e.className).trim()).pop());
  console.log("última seção do resumo é das aulas bônus:", /Aulas bônus no MEDCURSO/.test(ultima || ""), ultima);
  for (const id of ["imunizacoes", "bradiarritmias", "cancer-gastrico", "gestacao-multipla", "linfomas"]) {
    await page.evaluate((i) => { location.hash = `/residencia/conteudo/${i}`; }, id);
    await page.waitForTimeout(700);
    const tit = await page.$eval("h1", (h) => h.textContent.trim()).catch(() => "");
    console.log("tema novo abre:", id, Boolean(tit), tit.slice(0, 60));
  }
  console.log("sem erros de página:", erros.length === 0, erros.slice(0, 3));
  await browser.close();
})();
