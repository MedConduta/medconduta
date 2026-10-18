// Meus dados, troca de senha, "esqueci minha senha" (via código do admin),
// Cancelar do reporte e remoção do "Montar do zero".
// Requer worker local (wrangler dev :8787), http-server :8744, conta admin.teste@example.com
// e uma conta aluno@example.com / senha12345.
const { chromium } = require("playwright");
const BASE = "http://127.0.0.1:8744/";
const WORKER = "https://medconduta-ai.medcondutaa.workers.dev";
let falhas = 0;
const ok = (c, m) => { console.log(`${c ? "OK  " : "FAIL"} ${m}`); if (!c) falhas++; };

async function contexto(b) {
  const c = await b.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: "block" });
  await c.route(`${WORKER}/**`, async (route) => {
    const req = route.request();
    try {
      const res = await c.request.fetch(req.url().replace(WORKER, "http://127.0.0.1:8787"), { method: req.method(), headers: req.headers(), data: req.postDataBuffer() || undefined });
      await route.fulfill({ status: res.status(), headers: res.headers(), body: await res.body() });
    } catch {
      await route.abort().catch(() => {});
    }
  });
  return c;
}
async function login(p, email, senha) {
  await p.fill("#login-email", email);
  await p.fill("#login-password", senha);
  await p.click("#login-submit");
}

(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const erros = [];

  // 1) senha errada → aparece "Esqueci minha senha" → pedido
  let c = await contexto(b);
  let p = await c.newPage();
  p.on("pageerror", (e) => erros.push(e.message));
  await p.goto(BASE);
  await p.waitForSelector("#login-form");
  ok(!(await p.isVisible("#login-esqueci")), "link 'Esqueci' oculto antes de errar a senha");
  await login(p, "aluno@example.com", "senhaerrada1");
  await p.waitForSelector("#login-erro:not([hidden])");
  ok(await p.isVisible("#login-esqueci"), "link 'Esqueci' aparece após senha errada");
  await p.click("#login-esqueci a");
  ok((await p.inputValue("#login-email")) === "aluno@example.com", "e-mail mantido ao ir para 'Esqueci'");
  await p.click("#login-submit");
  await p.waitForSelector(".login-hint--ok");
  ok(true, "pedido de redefinição enviado");
  await c.close();

  // 2) admin vê o pedido e gera o código
  c = await contexto(b);
  p = await c.newPage();
  p.on("pageerror", (e) => erros.push(e.message));
  p.on("dialog", (d) => d.accept());
  await p.goto(BASE);
  await login(p, "admin.teste@example.com", "senha12345");
  await p.waitForSelector("#perfil-btn");
  await p.goto(BASE + "#/residencia/admin");
  await p.waitForSelector('.admin-list [data-redefinir="aluno@example.com"].btn--primary');
  ok(true, "admin vê o pedido de aluno@example.com");
  await p.click('.admin-list [data-redefinir="aluno@example.com"].btn--primary');
  await p.waitForSelector("#copiar-redefinicao");
  const codigo = (await p.textContent(".explanation-box .mono")).trim();
  ok(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(codigo), `código gerado: ${codigo}`);
  ok(!(await p.isVisible('.admin-list [data-redefinir="aluno@example.com"].btn--primary')), "pedido some da lista após gerar");
  await c.close();

  // 3) aluno usa o código
  c = await contexto(b);
  p = await c.newPage();
  p.on("pageerror", (e) => erros.push(e.message));
  await p.goto(BASE);
  await login(p, "aluno@example.com", "errada12345");
  await p.waitForSelector("#login-esqueci:not([hidden])");
  await p.click("#login-esqueci a");
  await p.click('[data-modo="codigo"]');
  await p.fill("#login-codigo", "XXXX-YYYY");
  await p.fill("#login-password", "novasenha123");
  await p.click("#login-submit");
  await p.waitForSelector("#login-erro:not([hidden])");
  ok(/inválido/.test(await p.textContent("#login-erro")), "código errado é recusado");
  await p.fill("#login-codigo", codigo.toLowerCase());
  await p.click("#login-submit");
  await p.waitForSelector("#perfil-btn", { state: "visible" });
  ok(true, "código certo cria a senha nova e entra");

  // 4) Meus dados
  await p.click("#perfil-btn");
  ok(await p.isVisible("#perfil-conta"), "menu do perfil tem 'Meus dados'");
  await p.click("#perfil-conta");
  await p.waitForSelector("#conta-form-senha");
  ok((await p.textContent(".conta-dados")).includes("aluno@example.com"), "Meus dados mostra o e-mail");
  ok((await p.textContent(".conta-dados")).includes("Aluno"), "Meus dados mostra o tipo de conta");
  await p.fill("#conta-nome", "Zélia");
  await p.click("#conta-form-nome button");
  await p.waitForFunction(() => document.querySelector("#conta-feedback-nome").textContent.includes("salvo"));
  ok((await p.textContent("#perfil-btn")).trim() === "Z", "avatar usa a inicial do nome");
  await p.fill("#conta-senha-atual", "senhaerrada9");
  await p.fill("#conta-senha-nova", "outrasenha123");
  await p.fill("#conta-senha-confirma", "outrasenha123");
  await p.click("#conta-senha-btn");
  await p.waitForSelector("#conta-feedback-senha.is-erro");
  ok(/incorreta/.test(await p.textContent("#conta-feedback-senha")), "senha atual errada é recusada");
  await p.fill("#conta-senha-atual", "novasenha123");
  await p.click("#conta-senha-btn");
  await p.waitForFunction(() => /alterada/.test(document.querySelector("#conta-feedback-senha").textContent));
  ok(true, "senha trocada");
  const r = await p.evaluate(async () => (await fetch("http://127.0.0.1:8787/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "aluno@example.com", password: "outrasenha123" }) })).status);
  ok(r === 200, "login com a senha nova funciona");

  // 5) Questões: Montar do zero removido; Cancelar do reporte fecha o painel
  await p.goto(BASE + "#/residencia/questoes");
  await p.waitForSelector(".deck-grid");
  ok(!(await p.locator("text=Montar do zero").count()), "'Montar do zero' removido");
  const deck = p.locator("[data-deck-treinar]").first();
  await deck.click();
  await p.waitForSelector(".reportar-btn");
  await p.locator(".reportar-btn").first().click();
  await p.waitForSelector(".reportar-painel", { state: "visible" });
  await p.click("[data-reportar-cancelar]");
  ok(!(await p.locator(".reportar-painel").first().isVisible()), "Cancelar fecha o painel de reporte");
  await p.locator(".reportar-btn").first().click();
  ok(await p.locator(".reportar-painel").first().isVisible(), "painel reabre depois de cancelar");

  // 6) mobile: Meus dados sem rolagem horizontal
  await p.setViewportSize({ width: 390, height: 844 });
  await p.goto(BASE + "#/residencia/conta");
  await p.waitForSelector("#conta-form-senha");
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= 390), "Meus dados cabe no celular");
  await p.screenshot({ path: "/tmp/claude-0/-home-user-medconduta/189a7ed4-3170-599a-adb3-6689b402ef7e/scratchpad/conta-390.png", fullPage: true });

  ok(!erros.length, `sem erros de JavaScript ${erros.join(" | ")}`);
  await b.close();
  console.log(falhas ? `${falhas} falha(s)` : "tudo ok");
  process.exit(falhas ? 1 : 0);
})();
