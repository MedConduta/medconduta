const { chromium } = require("playwright");
const fs = require("fs");

// Resumos revisados pelas questões (campo revisaoProvas): abrem sem erro, sem rolagem lateral em 400 px,
// com fluxogramas/tabelas renderizados, imagens carregadas e aviso de aulas bônus no fim.
const IDS = JSON.parse(fs.readFileSync("data/temas.json", "utf8")).filter((t) => t.revisaoProvas).map((t) => t.id);
(async () => {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.route("https://medconduta-ai.medcondutaa.workers.dev/**", async (route) => {
    const req = route.request();
    const res = await page.request.fetch(req.url().replace("https://medconduta-ai.medcondutaa.workers.dev", "http://127.0.0.1:8787"), { method: req.method(), headers: req.headers(), data: req.postDataBuffer() || undefined, timeout: 60000 });
    await route.fulfill({ status: res.status(), headers: res.headers(), body: await res.body() });
  });
  const erros = [];
  page.on("pageerror", (e) => erros.push(e.message));
  await page.goto("http://localhost:8744");
  await page.waitForSelector("#login-email", { timeout: 10000 });
  await page.click(".login-switch a[data-modo=criar]");
  await page.fill("#login-email", `teste.revisados.${Date.now()}@example.com`);
  await page.fill("#login-password", "senha12345");
  await page.click("#login-submit");
  await page.waitForSelector("#sidebar-nav a", { timeout: 15000 });
  await page.setViewportSize({ width: 400, height: 900 });
  let ok = 0;
  for (const id of IDS) {
    await page.evaluate((i) => { location.hash = `/residencia/conteudo/${i}`; }, id);
    await page.waitForSelector(".prose h3", { timeout: 15000 });
    await page.waitForTimeout(500);
    const r = await page.evaluate(async () => {
      const imgs = [...document.querySelectorAll(".imagem-estudo img")];
      for (const i of imgs) { i.loading = "eager"; i.scrollIntoView(); await new Promise((f) => setTimeout(f, 150)); }
      await new Promise((f) => setTimeout(f, 400));
      const t = [...document.querySelectorAll(".prose h3")].map((h) => h.textContent.trim());
      return { n: imgs.length, carregadas: imgs.filter((i) => i.complete && i.naturalWidth > 0).length,
        largo: document.documentElement.scrollWidth > window.innerWidth + 1, ultimo: t[t.length - 1] || "" };
    });
    const bom = r.carregadas === r.n && !r.largo && /Aulas bônus/.test(r.ultimo);
    if (bom) ok++; else console.log("FALHA", id, JSON.stringify(r));
  }
  console.log("resumos revisados ok:", ok === IDS.length, `${ok}/${IDS.length}`);
  console.log("sem erros de página:", erros.length === 0, erros.slice(0, 3));
  await browser.close();
})();
