const { chromium } = require("playwright");

// Modo Foco: o cronômetro continua contando fora da tela do foco e aparece
// ao lado do relógio na barra superior.
(async () => {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const page = await browser.newPage();
  await page.route("https://medconduta-ai.medcondutaa.workers.dev/**", async (route) => {
    const req = route.request();
    const localUrl = req.url().replace("https://medconduta-ai.medcondutaa.workers.dev", "http://127.0.0.1:8787");
    const res = await page.request.fetch(localUrl, { method: req.method(), headers: req.headers(), data: req.postDataBuffer() || undefined });
    await route.fulfill({ status: res.status(), headers: res.headers(), body: await res.body() });
  });
  const erros = [];
  page.on("pageerror", (e) => erros.push(e.message));

  const email = process.env.EMAIL_TESTE || "teste.foco@example.com";
  await page.goto("http://localhost:8744");
  await page.waitForSelector("#login-email", { timeout: 10000 });
  await page.fill("#login-email", email);
  await page.fill("#login-password", "senha12345");
  await page.click("#login-submit");
  try {
    await page.waitForSelector("#sidebar-nav a", { timeout: 5000 });
  } catch {
    await page.click(".login-switch a[data-modo=criar]");
    await page.fill("#login-email", email);
    await page.fill("#login-password", "senha12345");
    await page.click("#login-submit");
    await page.waitForSelector("#sidebar-nav a", { timeout: 15000 });
  }

  const tempoTopbar = () => page.$eval("#topbar-foco", (el) => ({ tempo: el.querySelector(".topbar-foco__tempo").textContent, visivel: !el.querySelector(".topbar-foco__tempo").hidden, ativo: el.classList.contains("is-ativo") }));

  console.log("Sem sessão, topbar não mostra tempo:", !(await tempoTopbar()).visivel);

  await page.evaluate(() => { location.hash = "/residencia/foco"; });
  await page.waitForSelector("#btn-iniciar", { timeout: 10000 });
  await page.click("#btn-iniciar");
  await page.waitForSelector("#btn-pausar");
  await page.waitForTimeout(1200);
  let t = await tempoTopbar();
  console.log("Topbar mostra MM:SS com sessão ativa:", t.visivel && t.ativo && /^\d{2}:\d{2}$/.test(t.tempo), t.tempo);

  await page.evaluate(() => { location.hash = "/residencia/questoes"; });
  await page.waitForTimeout(2500);
  const t2 = await tempoTopbar();
  console.log("Em outra tela, o tempo continua contando:", t2.visivel && t2.tempo < t.tempo, t2.tempo);

  await page.reload();
  await page.waitForSelector("#sidebar-nav a", { timeout: 15000 });
  await page.waitForTimeout(1500);
  const t3 = await tempoTopbar();
  console.log("Sobrevive a recarregar a página:", t3.visivel && t3.tempo <= t2.tempo, t3.tempo);

  await page.click("#topbar-foco");
  await page.waitForSelector("#btn-pausar", { timeout: 10000 });
  const relogio = await page.$eval("#foco-relogio", (el) => el.textContent);
  console.log("Volta à tela do foco com a sessão em andamento:", /^\d{2}:\d{2}$/.test(relogio), relogio);

  await page.click("#btn-pausar");
  await page.waitForTimeout(300);
  const p1 = await tempoTopbar();
  await page.waitForTimeout(2000);
  const p2 = await tempoTopbar();
  console.log("Pausado: topbar congela o tempo:", p1.tempo === p2.tempo && p1.tempo.includes("⏸"), p2.tempo);

  await page.click("#btn-pausar");
  // Força o fim da sessão adiantando o horário de término salvo.
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("medconduta.focoAtivo"));
    s.fimEmMs = Date.now() + 1500;
    localStorage.setItem("medconduta.focoAtivo", JSON.stringify(s));
  });
  await page.reload();
  await page.waitForSelector("#sidebar-nav a", { timeout: 15000 });
  await page.evaluate(() => { location.hash = "/residencia/conteudo"; });
  await page.waitForTimeout(3500);
  const fim = await page.$eval("#topbar-foco", (el) => el.textContent);
  console.log("Ao zerar fora da tela, topbar avisa 'Concluída':", fim.includes("Concluída"));
  const sessoes = await page.evaluate(async () => (await import("/app/db.js")).getAll("sessoes"));
  console.log("Sessão concluída registrada:", sessoes.some((s) => s.concluida && s.duracaoMin === 25));

  await page.evaluate(() => { location.hash = "/residencia/foco"; });
  await page.waitForSelector("#btn-iniciar", { timeout: 10000 });
  await page.click("#btn-iniciar");
  await page.waitForTimeout(300);
  await page.click("#btn-encerrar");
  await page.waitForTimeout(500);
  console.log("Encerrar some com o tempo da topbar:", !(await tempoTopbar()).visivel);

  await page.setViewportSize({ width: 390, height: 800 });
  await page.click("#btn-iniciar");
  await page.waitForTimeout(1200);
  const mob = await page.$eval("#topbar-foco .topbar-foco__tempo", (el) => el.getBoundingClientRect().width > 0);
  console.log("No celular o tempo aparece na topbar:", mob);
  await page.screenshot({ path: process.env.SHOT || "pw-test/foco_mobile.png" });
  await page.click("#btn-encerrar");

  console.log("Sem erros de página:", erros.length === 0, erros);
  await browser.close();
})().catch((e) => { console.error("ERRO:", e); process.exit(1); });
