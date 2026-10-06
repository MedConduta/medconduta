// Requer no worker/.dev.vars local: ADMIN_EMAILS="admin.teste@example.com"
const { chromium } = require("playwright");
const SHOTS = process.env.SHOTS_DIR || "/tmp";
const W = "http://127.0.0.1:8787";

async function novaPagina(browser, viewport) {
  const page = await browser.newPage({ viewport });
  await page.route("https://medconduta-ai.medcondutaa.workers.dev/**", async (route) => {
    const req = route.request();
    try {
      const res = await page.request.fetch(req.url().replace("https://medconduta-ai.medcondutaa.workers.dev", W), {
        method: req.method(),
        headers: req.headers(),
        data: req.postDataBuffer() || undefined,
      });
      await route.fulfill({ status: res.status(), headers: res.headers(), body: await res.body() });
    } catch {
      await route.abort().catch(() => {});
    }
  });
  page.erros = [];
  page.on("pageerror", (e) => page.erros.push(e.message));
  return page;
}

async function entrar(page, email, senha = "senha12345") {
  await page.goto("http://localhost:8744");
  await page.waitForSelector("#login-email");
  await page.fill("#login-email", email);
  await page.fill("#login-password", senha);
  await page.click("#login-submit");
  await page.waitForSelector("#sidebar-nav a", { timeout: 15000 });
}

const ok = (cond, msg) => console.log(`${cond ? "✓" : "✗ FALHOU:"} ${msg}`);

(async () => {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

  // ---------- Desktop (admin) ----------
  const d = await novaPagina(browser, { width: 1366, height: 900 });
  await entrar(d, "admin.teste@example.com");
  await d.waitForSelector(".continue-card, .primeiros-passos", { timeout: 20000 });
  await d.waitForTimeout(1500);

  const itensMenu = await d.$$eval("#sidebar-nav .nav-section:first-child .nav-link__label", (els) => els.map((e) => e.textContent));
  ok(itensMenu.join(",") === "Início,Curso,Conteúdo,Questões,Revisar,Simulados,Desempenho", `menu com 7 itens: ${itensMenu.join(", ")}`);
  ok(await d.isVisible("#topbar-busca"), "busca visível na barra superior do computador");
  ok(await d.isVisible("#topbar-foco"), "botão Modo Foco visível");
  ok(await d.isVisible(".inicio-lateral"), "coluna lateral do Início visível");
  await d.screenshot({ path: `${SHOTS}/layout_inicio_desktop.png` });

  await d.click("#perfil-btn");
  ok(await d.isVisible("#perfil-menu #theme-toggle") && await d.isVisible("#perfil-menu #logout-btn"), "menu de perfil com Tema e Sair");
  ok(await d.isVisible("#perfil-admin"), "menu de perfil mostra Administração para admin");
  await d.keyboard.press("Escape");

  // Busca global
  await d.keyboard.press("Control+k");
  await d.waitForSelector("#busca-input", { state: "visible" });
  await d.fill("#busca-input", "hipertensao arterial");
  await d.waitForTimeout(800);
  const primeiro = await d.$eval(".busca-item.is-selecionado .busca-item__titulo", (el) => el.textContent);
  await d.screenshot({ path: `${SHOTS}/layout_busca.png` });
  await d.keyboard.press("Enter");
  await d.waitForSelector(".tema-leitura", { timeout: 15000 });
  ok(/hipertens/i.test(primeiro), `busca encontra tema (${primeiro}) e Enter abre`);

  // Leitura de tema
  await d.waitForTimeout(500);
  ok(await d.isVisible(".tema-sumario--lateral"), "sumário lateral visível");
  ok(await d.isVisible(".tema-acoes-fixas #btn-concluir"), "barra fixa com Marcar como estudado");
  await d.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight / 2));
  await d.waitForTimeout(400);
  const progresso = await d.$eval(".leitura-progresso__barra", (el) => parseFloat(el.style.width));
  ok(progresso > 20, `barra de progresso de leitura avança (${progresso.toFixed(0)}%)`);
  await d.click(".tema-sumario--lateral .tema-sumario__link >> nth=1");
  await d.waitForTimeout(800);
  ok(d.url().includes("/residencia/conteudo/"), "clicar no sumário não troca de tela");
  await d.screenshot({ path: `${SHOTS}/layout_tema_desktop.png` });
  const temaTitulo = await d.$eval(".tema-leitura h1", (el) => el.childNodes[0].textContent.trim());

  // Abas e item ativo
  await d.evaluate(() => { location.hash = "/residencia/erros"; });
  await d.waitForSelector(".page-tab.is-active");
  ok((await d.textContent(".page-tab.is-active")) === "Meus erros", "aba Meus erros ativa em /erros");
  ok((await d.textContent(".nav-link.is-active .nav-link__label")) === "Revisar", "menu acende Revisar em /erros");
  await d.evaluate(() => { location.hash = "/residencia/cronograma"; });
  await d.waitForSelector(".page-tabs");
  ok((await d.$$(".page-tab")).length === 3 && (await d.textContent(".nav-link.is-active .nav-link__label")) === "Curso", "Curso com 3 abas");
  await d.evaluate(() => { location.hash = "/residencia/revisar"; });
  await d.waitForSelector(".revisar-grid", { timeout: 20000 });
  await d.screenshot({ path: `${SHOTS}/layout_revisar.png` });

  // Bug do roteador: trocar de tela antes da anterior terminar de carregar
  await d.evaluate(() => { location.hash = "/residencia/minha-preparacao"; });
  await d.waitForTimeout(50);
  await d.evaluate(() => { location.hash = "/residencia/questoes"; });
  await d.waitForTimeout(6000);
  const h1 = await d.textContent("#main-content h1");
  ok(/quest/i.test(h1), `após troca rápida a tela certa permanece (${h1.trim()})`);

  // Continue de onde parou
  await d.evaluate(() => { location.hash = "/residencia/minha-preparacao"; });
  await d.waitForSelector(".continue-card", { timeout: 20000 });
  const cont = await d.textContent(".continue-card__titulo");
  ok(cont.trim() === "Questões" || cont.includes(temaTitulo), `Continue de onde parou: ${cont.trim()}`);

  // Convite para o usuário novo
  const token = await d.evaluate(() => localStorage.getItem("medconduta:auth_token"));
  const convite = await (await d.request.post(`${W}/admin/convites`, {
    headers: { Authorization: `Bearer ${token}`, Origin: "http://localhost:8744", "Content-Type": "application/json" },
    data: { nota: "teste layout" },
  })).json();

  // ---------- Celular (usuário novo) ----------
  const m = await novaPagina(browser, { width: 393, height: 851 });
  await m.goto(`http://localhost:8744/?convite=${convite.code}`);
  await m.waitForSelector("#login-convite");
  await m.fill("#login-email", `novo.${Date.now()}@example.com`);
  await m.fill("#login-password", "senha12345");
  await m.click("#login-submit");
  await m.waitForSelector(".primeiros-passos", { timeout: 25000 });
  ok(true, "usuário novo vê Primeiros passos");
  const abas = await m.$$eval(".bottom-nav__link > span:last-child", (els) => els.map((e) => e.textContent));
  ok(abas.join(",") === "Início,Estudar,Questões,Revisar,Mais", `barra inferior: ${abas.join(", ")}`);
  ok(!(await m.isVisible("#topbar-busca .topbar-busca__texto")), "busca vira só ícone no celular");
  await m.screenshot({ path: `${SHOTS}/layout_inicio_mobile.png` });
  await m.screenshot({ path: `${SHOTS}/layout_inicio_mobile_full.png`, fullPage: true });

  await m.click("#bottom-nav-mais");
  await m.waitForTimeout(400);
  ok(await m.evaluate(() => document.getElementById("app-shell").classList.contains("nav-open")), "Mais abre o menu lateral");
  await m.screenshot({ path: `${SHOTS}/layout_mais_mobile.png` });
  await m.click("#sidebar-overlay", { position: { x: 380, y: 400 } });

  await m.evaluate(() => { location.hash = "/residencia/conteudo/has"; });
  await m.waitForSelector(".tema-leitura", { timeout: 15000 });
  await m.waitForTimeout(500);
  ok(await m.isVisible(".tema-sumario--chips"), "sumário em chips no celular");
  await m.evaluate(() => window.scrollTo(0, 1400));
  await m.waitForTimeout(400);
  await m.screenshot({ path: `${SHOTS}/layout_tema_mobile.png` });
  const overflow = await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  ok(!overflow, "sem rolagem horizontal no celular");

  const erros = [...d.erros, ...m.erros];
  ok(!erros.length, `erros de JS: ${erros.length ? erros.join(" | ") : "nenhum"}`);
  await browser.close();
})().catch((e) => {
  console.error("ERRO:", e);
  process.exit(1);
});
