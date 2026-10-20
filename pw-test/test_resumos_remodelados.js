const { chromium } = require("playwright");

// Resumos não clínicos remodelados: abrem, têm seções próprias (sem o molde Fisiopatologia/Quadro clínico) e terminam no aviso de aulas bônus.
const IDS = ["rastreio-cancer", "medicina-familia-comunidade", "saude-mental-ab", "incongruencia-genero", "pre-natal-baixo-alto-risco", "assistencia-parto-partograma", "cardiotocografia-bem-estar-fetal", "ciclo-menstrual-normal", "planejamento-familiar", "aleitamento-materno-alimentacao-complementar", "desenvolvimento-neuropsicomotor-crescimento", "reanimacao-neonatal", "puberdade-normal-disturbios", "maus-tratos-infantil", "avaliacao-geriatrica-ampla", "oncologia-principios-basicos", "avaliacao-pre-anestesica-asa", "farmacologia-anestesicos-locais-gerais", "manejo-dor-aguda-cronica", "via-aerea-dificil", "politrauma-abcde", "pre-pos-operatorio", "hemoterapia-hemocomponentes", "disturbios-acido-basicos", "terapia-substituicao-renal"];
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
  await page.fill("#login-email", `teste.resumos.${Date.now()}@example.com`);
  await page.fill("#login-password", "senha12345");
  await page.click("#login-submit");
  await page.waitForSelector("#sidebar-nav a", { timeout: 15000 });
  await page.setViewportSize({ width: 400, height: 900 });
  let ok = 0;
  for (const id of IDS) {
    await page.evaluate((i) => { location.hash = `/residencia/conteudo/${i}`; }, id);
    await page.waitForSelector(".prose h3", { timeout: 15000 });
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => {
      const t = [...document.querySelectorAll(".prose h3")].map((h) => h.textContent.trim());
      return { t, largo: document.documentElement.scrollWidth > window.innerWidth + 1 };
    });
    const molde = r.t.some((x) => /^(Fisiopatologia|Quadro clínico|Exame físico)$/.test(x));
    const bonusUltimo = /Aulas bônus no MEDCURSO/.test(r.t[r.t.length - 1] || "");
    if (!molde && bonusUltimo && !r.largo) ok++; else console.log("FALHA", id, r.t.join(" | "), "rolagem lateral:", r.largo);
  }
  console.log("resumos ok:", ok === IDS.length, ok + "/" + IDS.length);
  await page.evaluate(() => { location.hash = "/residencia/conteudo/politrauma-abcde"; });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "pw-test/resumo_politrauma.png" });
  console.log("sem erros de página:", erros.length === 0, erros.slice(0, 3));
  await browser.close();
})();
