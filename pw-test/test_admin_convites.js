// Requer no worker/.dev.vars local: ADMIN_EMAILS="admin.teste@example.com"
const { chromium } = require("playwright");
const SHOTS = process.env.SHOTS_DIR || "/tmp";

async function novaPagina(browser, viewport) {
  const page = await browser.newPage({ viewport });
  await page.route("https://medconduta-ai.medcondutaa.workers.dev/**", async (route) => {
    const req = route.request();
    const localUrl = req.url().replace("https://medconduta-ai.medcondutaa.workers.dev", "http://127.0.0.1:8787");
    const res = await page.request.fetch(localUrl, { method: req.method(), headers: req.headers(), data: req.postDataBuffer() || undefined });
    await route.fulfill({ status: res.status(), headers: res.headers(), body: await res.body() });
  });
  page.erros = [];
  page.on("pageerror", (e) => page.erros.push(e.message));
  return page;
}

(async () => {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

  // 1) Admin entra, vê a seção de administração e gera um convite.
  const admin = await novaPagina(browser, { width: 1280, height: 900 });
  await admin.goto("http://localhost:8744");
  await admin.waitForSelector("#login-email");
  await admin.fill("#login-email", "admin.teste@example.com");
  await admin.fill("#login-password", "senha12345");
  await admin.click("#login-submit");
  await admin.waitForSelector('a[href="#/residencia/admin"]', { timeout: 15000 });
  console.log("Admin vê item no menu: sim");
  // A tela inicial carrega de forma assíncrona e, se ainda estiver carregando,
  // sobrescreve a próxima rota ao terminar — espera ela assentar antes de navegar.
  await admin.waitForTimeout(2500);

  await admin.evaluate(() => { location.hash = "/residencia/admin"; });
  await admin.waitForSelector("#form-convite");
  await admin.fill("#convite-nota", "Amigo de teste");
  await admin.click("#btn-gerar");
  await admin.waitForFunction(() => /criado/.test(document.querySelector("#convite-feedback")?.textContent || ""));
  const codigo = await admin.$eval(".admin-list__item .admin-list__title.mono", (el) => el.textContent.trim());
  console.log("Convite gerado:", codigo);
  await admin.screenshot({ path: `${SHOTS}/admin_desktop.png`, fullPage: true });

  // 2) Amigo abre o link do convite: já cai em "Criar conta" com o código preenchido.
  const amigo = await novaPagina(browser, { width: 393, height: 851 });
  await amigo.goto(`http://localhost:8744/?convite=${codigo}`);
  await amigo.waitForSelector("#login-convite");
  console.log("Código preenchido pelo link:", await amigo.inputValue("#login-convite"));
  await amigo.screenshot({ path: `${SHOTS}/login_convite_mobile.png` });
  const emailAmigo = `amigo.${Date.now()}@example.com`;
  await amigo.fill("#login-email", emailAmigo);
  await amigo.fill("#login-password", "senha12345");
  await amigo.click("#login-submit");
  await amigo.waitForSelector("#sidebar-nav a", { timeout: 15000 });
  await amigo.waitForTimeout(2500);
  console.log("URL do amigo sem ?convite:", !amigo.url().includes("convite="));
  console.log("Amigo vê item de admin:", !!(await amigo.$('a[href="#/residencia/admin"]')));
  await amigo.evaluate(() => { location.hash = "/residencia/admin"; });
  await amigo.waitForTimeout(1500);
  console.log("Amigo em /admin:", (await amigo.textContent(".main__container")).trim().slice(0, 80));

  // 3) Admin recarrega: convite aparece como usado pelo amigo.
  await admin.reload();
  await admin.waitForSelector("#form-convite");
  const usado = await admin.$eval(".admin-list", (el, email) => el.textContent.includes(email), emailAmigo);
  console.log("Admin vê convite usado pelo amigo:", usado);
  await admin.setViewportSize({ width: 393, height: 851 });
  await admin.screenshot({ path: `${SHOTS}/admin_mobile.png`, fullPage: true });

  console.log("Erros JS:", [...admin.erros, ...amigo.erros].length ? [...admin.erros, ...amigo.erros] : "nenhum");
  await browser.close();
})().catch((e) => { console.error("ERRO:", e); process.exit(1); });
