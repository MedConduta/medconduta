// Requer worker local (wrangler dev :8787, com ADMIN_EMAILS="admin.teste@example.com"
// em worker/.dev.vars e essa conta já criada) e http.server :8744 na raiz do repo.
// Cria uma conta nova por convite, para começar sem histórico de flashcards.
const { chromium } = require("playwright");
const W = "http://127.0.0.1:8787";
const ORIGEM = "http://localhost:8744";
const SHOTS = process.env.SHOTS_DIR || "/tmp";
const ok = (cond, msg) => console.log(`${cond ? "✓" : "✗ FALHOU:"} ${msg}`);

async function api(caminho, corpo, token) {
  const res = await fetch(W + caminho, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: ORIGEM, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(corpo),
  });
  return res.json();
}

async function novaPagina(browser, viewport, opcoes = {}) {
  const page = await (await browser.newContext({ viewport, ...opcoes })).newPage();
  await page.route("https://medconduta-ai.medcondutaa.workers.dev/**", async (route) => {
    const req = route.request();
    try {
      const res = await page.request.fetch(req.url().replace("https://medconduta-ai.medcondutaa.workers.dev", W), {
        method: req.method(), headers: req.headers(), data: req.postDataBuffer() || undefined,
      });
      await route.fulfill({ status: res.status(), headers: res.headers(), body: await res.body() });
    } catch { await route.abort().catch(() => {}); }
  });
  page.erros = [];
  page.on("pageerror", (e) => page.erros.push(e.message));
  return page;
}

const irPara = (page, hash) => page.evaluate((h) => { location.hash = h; }, hash);

(async () => {
  const { token } = await api("/auth/login", { email: "admin.teste@example.com", password: "senha12345" });
  const { code } = await api("/admin/convites", { nota: "teste flashcards" }, token);

  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const page = await novaPagina(browser, { width: 1280, height: 900 });
  await page.goto(`${ORIGEM}/?convite=${code}`);
  await page.waitForSelector("#login-convite");
  await page.fill("#login-email", `fc.${Date.now()}@example.com`);
  await page.fill("#login-password", "senha12345");
  await page.click("#login-submit");
  await page.waitForSelector("#sidebar-nav a", { timeout: 15000 });

  // 1) Página própria, com os baralhos por prova e o filtro de área.
  await page.click(".nav-link:has-text('Flashcards')");
  await page.waitForSelector("#fc-config", { timeout: 20000 });
  const chips = await page.$$eval("[data-baralho].tag-filter", (els) => els.map((e) => e.textContent.trim()));
  ok(["Mais cobrados SES-PE", "Mais cobrados ENAMED", "Temas que errei", "Mais esquecidos"].every((c) => chips.includes(c)), `baralhos: ${chips.join(", ")}`);
  ok(!chips.includes("Das minhas questões"), "sem o baralho antigo de questões numa conta nova");
  ok(!(await page.$("#btn-gerar-cards")), "botão 'Gerar cards' saiu");
  const totalDe = async () => Number((await page.textContent(".stat-row .stat-tile:last-child .stat-tile__label")).match(/de (\d+)/)[1]);
  const totalTodos = await totalDe();

  await page.click("[data-baralho=enamed]");
  await page.waitForSelector("[data-baralho=enamed].is-active");
  const totalEnamed = await totalDe();
  ok(totalEnamed > 0 && totalEnamed < totalTodos, `baralho ENAMED filtra (${totalEnamed} de ${totalTodos})`);
  await page.click("[data-baralho=sespe]");
  await page.waitForSelector("[data-baralho=sespe].is-active");
  const totalSespe = await totalDe();
  ok(totalSespe > 0 && totalSespe < totalTodos, `baralho SES-PE filtra (${totalSespe})`);

  await page.click("[data-baralho=todos]");
  await page.waitForSelector("[data-baralho=todos].is-active");
  await page.selectOption("#fc-area", "Pediatria");
  await page.waitForFunction((t) => document.querySelector("#fc-area")?.value === "Pediatria", null);
  await page.waitForTimeout(500);
  const totalPed = await totalDe();
  ok(totalPed > 0 && totalPed < totalTodos, `filtro de área Pediatria (${totalPed})`);
  ok((await page.$$(".fc-dominio li")).length > 0, "painel de domínio por tema");
  await page.selectOption("#fc-area", "");
  await page.waitForTimeout(500);

  // 2) Sessão pelo teclado: espaço vira, 1 = não lembrei (volta no fim), 2 = lembrei.
  await page.selectOption("#novos-por-sessao", "10");
  await page.waitForTimeout(400);
  await page.click("#btn-revisar");
  await page.waitForSelector("#btn-mostrar");
  const tamanho = Number((await page.textContent(".page-header__eyebrow")).match(/de (\d+)/)[1]);
  await page.keyboard.press(" ");
  await page.waitForSelector("#btn-nao-lembrei");
  ok(!!(await page.$(".fc-card__resumo[target=_blank]")), "link 'Ver no resumo' abre em outra aba");
  await page.screenshot({ path: `${SHOTS}/flashcards_verso.png` });
  await page.keyboard.press("1");
  await page.waitForSelector("#btn-mostrar");
  const tamanhoDepois = Number((await page.textContent(".page-header__eyebrow")).match(/de (\d+)/)[1]);
  ok(tamanhoDepois === tamanho + 1, `card esquecido volta no fim da sessão (${tamanho} → ${tamanhoDepois})`);
  for (let i = 1; i < tamanhoDepois; i++) {
    await page.keyboard.press(" ");
    await page.waitForSelector("#btn-lembrei");
    await page.keyboard.press("2");
    await page.waitForSelector("#btn-mostrar, #btn-voltar");
  }
  await page.waitForSelector("#btn-voltar");
  const res = await page.$$eval(".stat-tile__value", (els) => els.map((e) => Number(e.textContent)));
  ok(res[0] === 1 && res[1] === tamanho - 1, `resumo conta só a 1ª resposta de cada card (${res.join("/")})`);

  // 3) Cards mais esquecidos: dois "não lembrei" no mesmo card o colocam na lista.
  const cardId = await page.evaluate(async () => {
    const { getAll, setItem } = await import("/app/db.js");
    const srs = await getAll("srs_flashcards");
    const alvo = srs.find((s) => s.erros === 1);
    await setItem("srs_flashcards", { ...alvo, erros: 2 });
    return alvo.id;
  });
  await page.click("#btn-voltar");
  await page.waitForSelector(".fc-dificeis li", { timeout: 10000 });
  ok(true, `lista 'Cards que você mais esquece' mostra o card ${cardId}`);
  await page.click("[data-baralho=dificeis].tag-filter");
  await page.waitForSelector("[data-baralho=dificeis].is-active");
  ok((await totalDe()) === 1, "baralho 'Mais esquecidos' tem o card");

  // 4) Temas que errei: uma resposta errada traz os cards do tema.
  await page.evaluate(async () => {
    const { setItem } = await import("/app/db.js");
    await setItem("respostas", { id: `t-${Date.now()}`, questaoId: "q1", temaId: "has", acertou: false, data: new Date().toISOString() });
  });
  await irPara(page, "/residencia/flashcards?baralho=erros&_=" + Date.now());
  await page.waitForSelector("[data-baralho=erros].is-active", { timeout: 15000 });
  const totalErros = await totalDe();
  const temasErros = await page.$$eval(".fc-dominio__titulo", (els) => els.map((e) => e.textContent));
  ok(totalErros > 0 && temasErros.length === 1 && /Hipertens/.test(temasErros[0]), `baralho 'Temas que errei' traz os cards de HAS (${totalErros})`);

  // 5) Celular: tocar vira o card, deslizar para a esquerda = não lembrei.
  const sessao = await page.context().storageState();
  const cel = await novaPagina(browser, { width: 393, height: 851 }, { hasTouch: true, isMobile: true, storageState: sessao });
  await cel.goto(`${ORIGEM}/#/residencia/flashcards`);
  await cel.waitForSelector("#btn-revisar", { timeout: 20000 });
  await cel.click("#btn-revisar");
  await cel.waitForSelector("#fc-card");
  const n0 = Number((await cel.textContent(".page-header__eyebrow")).match(/de (\d+)/)[1]);
  await cel.tap("#fc-card .fc-card__frente");
  await cel.waitForSelector("#btn-nao-lembrei");
  await cel.screenshot({ path: `${SHOTS}/flashcards_celular.png` });
  await cel.evaluate(() => {
    const el = document.querySelector("#fc-card");
    const t = (x) => new Touch({ identifier: 1, target: el, clientX: x, clientY: 300 });
    el.dispatchEvent(new TouchEvent("touchstart", { touches: [t(300)], bubbles: true }));
    el.dispatchEvent(new TouchEvent("touchend", { changedTouches: [t(100)], bubbles: true }));
  });
  await cel.waitForSelector("#btn-mostrar");
  const n1 = Number((await cel.textContent(".page-header__eyebrow")).match(/de (\d+)/)[1]);
  ok(n1 === n0 + 1, "deslizar para a esquerda marca 'não lembrei'");
  const largura = await cel.evaluate(() => document.documentElement.scrollWidth);
  ok(largura <= 393, "sem rolagem horizontal no celular");

  ok(!page.erros.length && !cel.erros.length, `erros de JS: ${[...page.erros, ...cel.erros].join(" | ") || "nenhum"}`);
  await browser.close();
})().catch((e) => {
  console.error("ERRO:", e);
  process.exit(1);
});
