const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const page = await browser.newPage();
  await page.route("https://medconduta-ai.medcondutaa.workers.dev/**", async (route) => {
    const req = route.request();
    const localUrl = req.url().replace("https://medconduta-ai.medcondutaa.workers.dev", "http://127.0.0.1:8787");
    const res = await page.request.fetch(localUrl, { method: req.method(), headers: req.headers(), data: req.postDataBuffer() || undefined });
    await route.fulfill({ status: res.status(), headers: res.headers(), body: await res.body() });
  });
  const email = `teste.r19r20.${Date.now()}@example.com`;
  await page.goto("http://localhost:8744");
  await page.waitForSelector("#login-email", { timeout: 10000 });
  const heading = await page.textContent("h1");
  if (!heading.includes("Criar")) await page.click("#login-alternar");
  await page.fill("#login-email", email);
  await page.fill("#login-password", "senha12345");
  await page.click("#login-submit");
  await page.waitForSelector("#sidebar-nav a", { timeout: 15000 });

  const ids = ["otites-media-externa","rinossinusite-faringite","perda-auditiva","vertigem-vppb-meniere","urgencias-orl-epistaxe-corpo-estranho","olho-vermelho-diagnostico-diferencial","catarata-erros-refrativos","retinopatia-diabetica-hipertensiva","trauma-ocular","glaucoma-cronico-angulo-aberto","fraturas-luxacoes-comuns","lesoes-ligamentares-joelho","artrite-septica-osteomielite","ortopedia-pediatrica-quadril-pe","lombalgia-hernia-disco","dermatoses-inflamatorias","infeccoes-cutaneas","neoplasias-cutaneas","farmacodermias","escabiose-pediculose","avaliacao-pre-anestesica-asa","via-aerea-dificil","farmacologia-anestesicos-locais-gerais","manejo-dor-aguda-cronica"];
  for (const id of ids) {
    await page.evaluate((i) => { location.hash = `/residencia/conteudo/${i}`; }, id);
    await page.waitForTimeout(300);
    await page.waitForSelector(".prose", { timeout: 10000 });
    const examFocus = await page.$eval(".exam-focus", (el) => el.textContent).catch(() => null);
    const tables = await page.$$eval(".table-wrap table", (els) => els.length);
    console.log(id, "EXAM_FOCUS_LEN:", examFocus ? examFocus.length : null, "TABLES:", tables);
  }
  await browser.close();
})().catch((e) => { console.error("ERRO:", e); process.exit(1); });
