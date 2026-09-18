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
  const email = `teste.fluxo.${Date.now()}@example.com`;
  await page.goto("http://localhost:8744");
  await page.waitForSelector("#login-email", { timeout: 10000 });
  const heading = await page.textContent("h1");
  if (!heading.includes("Criar")) await page.click("#login-alternar");
  await page.fill("#login-email", email);
  await page.fill("#login-password", "senha12345");
  await page.click("#login-submit");
  await page.waitForSelector("#sidebar-nav a", { timeout: 15000 });

  const ids = [
    // Pediatria
    "prematuridade-rn-baixo-peso", "desenvolvimento-neuropsicomotor-crescimento", "crupe-laringotraqueite", "fibrose-cistica",
    // Psiquiatria
    "depressao-maior", "transtorno-bipolar", "tdah-tea",
    // Medicina Preventiva
    "vigilancia-epidemiologica", "testes-diagnosticos-acuracia", "incongruencia-genero",
    // Otorrino
    "otites-media-externa", "vertigem-vppb-meniere",
    // Oftalmo
    "olho-vermelho-diagnostico-diferencial", "glaucoma-cronico-angulo-aberto",
    // Ortopedia
    "fraturas-luxacoes-comuns", "lombalgia-hernia-disco",
    // Dermato
    "farmacodermias", "escabiose-pediculose",
    // Anestesiologia
    "avaliacao-pre-anestesica-asa", "manejo-dor-aguda-cronica",
  ];

  for (const id of ids) {
    await page.evaluate((i) => { location.hash = `/residencia/conteudo/${i}`; }, id);
    await page.waitForTimeout(300);
    await page.waitForSelector(".prose", { timeout: 10000 });
    const details = await page.$$("details.card");
    let flowNodes = 0;
    if (details.length) {
      await details[details.length - 1].click().catch(() => {});
      await page.waitForTimeout(150);
      flowNodes = await page.$$eval(".flowchart .flow-node", (els) => els.length).catch(() => 0);
    }
    console.log(id, "| details(flux+decks):", details.length, "| flow-nodes(last):", flowNodes);
  }
  await browser.close();
})().catch((e) => { console.error("ERRO:", e); process.exit(1); });
