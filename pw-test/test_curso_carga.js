// Curso com carga real: videoaulas, leitura, questões e revisões por semana,
// redistribuído pelas horas do plano e pela data da prova.
// Requer o Worker local (wrangler dev --local --var ADMIN_EMAILS:<email>) e o site em :8744.
const { chromium } = require("playwright");
const EMAIL = process.env.EMAIL_ADMIN || "teste.plano@example.com";

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
  const ok = (rotulo, cond) => console.log(`${cond ? "OK " : "FALHOU"} ${rotulo}`);

  await page.goto("http://localhost:8744");
  await page.waitForSelector("#login-email", { timeout: 10000 });
  await page.fill("#login-email", EMAIL);
  await page.fill("#login-password", "senha12345");
  await page.click("#login-submit");
  try {
    await page.waitForSelector("#sidebar-nav a", { timeout: 6000 });
  } catch {
    await page.click(".login-switch a[data-modo=criar]");
    await page.fill("#login-email", EMAIL);
    await page.fill("#login-password", "senha12345");
    await page.click("#login-submit");
    await page.waitForSelector("#sidebar-nav a", { timeout: 15000 });
  }

  const abrirCurso = async () => {
    await page.goto("http://localhost:8744/#/residencia/curso");
    await page.waitForSelector("#form-curso-inicio", { timeout: 30000 });
  };
  const definirProva = async (iso) => {
    await page.goto("http://localhost:8744/#/residencia/cronograma");
    await page.waitForSelector("#prova-data");
    await page.fill("#prova-data", iso);
    await page.click("#form-prova button[type=submit]");
    await page.waitForTimeout(800);
  };

  // 1) Plano padrão: 4,5 h por dia, 6 dias, vídeos a 1,5x; sem data de prova
  await definirProva("");
  await abrirCurso();
  ok("Plano padrão 4,5 h/dia", (await page.$eval("#plano-horas", (e) => e.value)) === "4.5");
  ok("Plano padrão 6 dias", (await page.$eval("#plano-dias", (e) => e.value)) === "6");
  ok("Plano padrão vídeos a 1,5x", (await page.$eval("#plano-velocidade", (e) => e.value)) === "1.5");
  const semanas = await page.$$eval("[data-semana-card]", (els) => els.length);
  console.log("Semanas no curso (padrão):", semanas);
  ok("Curso padrão em até 45 semanas", semanas > 30 && semanas <= 45);
  const carga1 = await page.$eval("[data-semana-card] .curso-semana__carga", (e) => e.textContent);
  console.log("Semana 1:", carga1.trim());
  ok("Semana mostra vídeo, leitura e questões", /vídeo/.test(carga1) && /leitura/.test(carga1) && /questões/.test(carga1));
  ok("Aula mostra a lista de videoaulas", (await page.$$("[data-semana-card] .curso-videos li")).length > 0);
  ok("Item mostra meta de questões x/30", /Questões 0\/30/.test(await page.$eval(".content-tree", (e) => e.textContent)));
  await page.screenshot({ path: "pw-test/curso_carga_padrao.png", fullPage: false });

  // 2) Prova perto: o curso é comprimido até 4 semanas antes e avisa as horas necessárias
  const inicio = await page.$eval("#curso-inicio-data", (e) => e.value);
  const somar = (semanasN) => {
    const d = new Date(inicio + "T00:00:00");
    d.setDate(d.getDate() + 7 * semanasN);
    return d.toLocaleDateString("sv-SE");
  };
  await definirProva(somar(30));
  await abrirCurso();
  const semanasProva = await page.$$eval("[data-semana-card]", (els) => els.length);
  console.log("Semanas com prova em 30 semanas:", semanasProva);
  ok("Curso cabe em 26 semanas (30 - 4 de reserva)", semanasProva <= 26);
  const aviso = await page.$eval(".curso-plano__aviso, .curso-plano__ok", (e) => e.textContent);
  console.log("Aviso:", aviso.trim());
  ok("Aviso fala em horas por dia para caber", /por dia/.test(aviso));

  // 3) Mudar para 3 h por dia não recomeça o curso e mantém a data de início
  await page.selectOption("#plano-horas", "3");
  await page.click("#form-curso-inicio button[type=submit]");
  await page.waitForTimeout(1500);
  await page.waitForSelector("#form-curso-inicio");
  ok("Horas salvas em 3", (await page.$eval("#plano-horas", (e) => e.value)) === "3");
  ok("Data de início não mudou", (await page.$eval("#curso-inicio-data", (e) => e.value)) === inicio);

  // 4) Prova distante: com 3 h o curso estica além de 45 semanas
  await definirProva(somar(120));
  await abrirCurso();
  const semanas3h = await page.$$eval("[data-semana-card]", (els) => els.length);
  console.log("Semanas com 3 h/dia e prova distante:", semanas3h);
  ok("Com 3 h/dia o curso precisa de mais de 45 semanas", semanas3h > 45);
  console.log("Situação:", (await page.$eval(".curso-plano__aviso, .curso-plano__ok", (e) => e.textContent)).trim());

  // 5) Planejamento semanal mostra o tempo da semana
  await page.goto("http://localhost:8744/#/residencia/planejamento-semanal");
  await page.waitForFunction(() => document.querySelector(".main__container")?.textContent.includes("Tempo desta semana"), { timeout: 20000 }).catch(() => {});
  ok("Planejamento Semanal mostra 'Tempo desta semana'", (await page.textContent("body")).includes("Tempo desta semana"));
  await page.screenshot({ path: "pw-test/planejamento_semanal_tempo.png", fullPage: false });

  // 6) Celular: sem rolagem lateral no Curso
  await page.setViewportSize({ width: 390, height: 844 });
  await abrirCurso();
  await page.$eval("[data-semana-card] .curso-videos", (d) => (d.open = true));
  const largura = await page.evaluate(() => document.documentElement.scrollWidth);
  ok(`Sem rolagem lateral no celular (${largura}px)`, largura <= 390);
  await page.screenshot({ path: "pw-test/curso_carga_celular.png", fullPage: false });

  // Volta o plano ao padrão e tira a data da prova
  await page.selectOption("#plano-horas", "4.5");
  await page.click("#form-curso-inicio button[type=submit]");
  await page.waitForTimeout(800);
  await definirProva("");

  ok("Sem erros de página", erros.length === 0);
  if (erros.length) console.log(erros);
  await browser.close();
})();
