const { chromium } = require("playwright");

// Imagens de questões nos resumos: aparecem na seção, carregam e ampliam ao tocar.
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
  await page.fill("#login-email", `teste.imagens.${Date.now()}@example.com`);
  await page.fill("#login-password", "senha12345");
  await page.click("#login-submit");
  await page.waitForSelector("#sidebar-nav a", { timeout: 15000 });
  await page.setViewportSize({ width: 400, height: 900 });
  for (const id of ["iam", "bradiarritmias", "cancer-pele-oncologia-cutanea"]) {
    await page.evaluate((i) => { location.hash = `/residencia/conteudo/${i}`; }, id);
    await page.waitForSelector(".prose h3", { timeout: 15000 });
    await page.waitForTimeout(800);
    const r = await page.evaluate(async () => {
      const imgs = [...document.querySelectorAll(".imagem-estudo img")];
      for (const i of imgs) { i.loading = "eager"; i.scrollIntoView(); await new Promise((ok) => setTimeout(ok, 300)); }
      return { n: imgs.length, ok: imgs.filter((i) => i.complete && i.naturalWidth > 0).length, largo: document.documentElement.scrollWidth > window.innerWidth + 1 };
    });
    console.log(id, "imagens:", r.n, "carregadas:", r.ok, "ok:", r.n > 0 && r.ok === r.n && !r.largo);
  }
  await page.click(".imagem-estudo__zoom");
  await page.waitForTimeout(400);
  console.log("zoom abre:", await page.$(".zoom-imagem") !== null);
  await page.screenshot({ path: "pw-test/imagens_resumo_zoom.png" });
  console.log("sem erros de página:", erros.length === 0, erros.slice(0, 3));
  await browser.close();
})();
