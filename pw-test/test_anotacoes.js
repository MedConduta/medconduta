const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const page = await browser.newPage();
  await page.route("https://medconduta-ai.medcondutaa.workers.dev/**", async (route) => {
    const req = route.request();
    const localUrl = req.url().replace("https://medconduta-ai.medcondutaa.workers.dev", "http://127.0.0.1:8787");
    const res = await page.request.fetch(localUrl, { method: req.method(), headers: req.headers(), data: req.postDataBuffer() || undefined, timeout: 60000 });
    await route.fulfill({ status: res.status(), headers: res.headers(), body: await res.body() });
  });
  const erros = [];
  page.on("pageerror", (e) => erros.push(e.message));
  page.on("console", (msg) => {
    if (msg.type() === "error" && !msg.text().includes("ERR_CERT_AUTHORITY_INVALID")) erros.push(msg.text());
  });

  const email = `teste.anotacoes.${Date.now()}@example.com`;
  await page.goto("http://localhost:8744");
  await page.waitForSelector("#login-email", { timeout: 10000 });
  await page.click("#login-alternar");
  await page.fill("#login-email", email);
  await page.fill("#login-password", "senha12345");
  await page.click("#login-submit");
  await page.waitForSelector("#sidebar-nav a", { timeout: 15000 });
  await page.waitForTimeout(800);

  // --- 1) Página do tema mostra o campo de anotações, vazio inicialmente
  await page.goto("http://localhost:8744/#/residencia/conteudo/has");
  await page.waitForFunction(() => document.querySelector("#anotacao-tema"), { timeout: 15000 });
  const valorInicial = await page.$eval("#anotacao-tema", (el) => el.value);
  console.log("Campo de anotação existe e começa vazio:", valorInicial === "");

  // --- 2) Digitar e aguardar o debounce salva e mostra "Salvo"
  await page.fill("#anotacao-tema", "Lembrar: sempre confirmar MAPA antes de rotular HAS.");
  await page.waitForFunction(() => document.querySelector("#anotacao-status")?.textContent.includes("Salvando"), { timeout: 3000 });
  await page.waitForFunction(() => document.querySelector("#anotacao-status")?.textContent.includes("Salvo"), { timeout: 3000 });
  console.log("Mostra 'Salvando...' e depois 'Salvo ✓' após parar de digitar");

  // --- 3) Persiste entre sessões: recarregar a página do tema mantém o texto
  await page.reload();
  await page.waitForFunction(() => document.querySelector("#anotacao-tema"), { timeout: 15000 });
  const valorDepoisReload = await page.$eval("#anotacao-tema", (el) => el.value);
  console.log("Texto persiste após reload:", valorDepoisReload === "Lembrar: sempre confirmar MAPA antes de rotular HAS.");

  // --- 4) Anotação é isolada por tema (outro tema não vê o texto do primeiro)
  // Passa pela lista antes (em vez de pular direto entre duas rotas dinâmicas
  // ":id" muito rápido) para não disparar a mesma condição de corrida já
  // conhecida no router: um render antigo ainda em voo pode sobrescrever
  // o DOM do render novo se a navegação for rápida demais entre duas rotas
  // que casam o mesmo padrão.
  await page.goto("http://localhost:8744/#/residencia/conteudo");
  await page.waitForTimeout(500);
  await page.goto("http://localhost:8744/#/residencia/conteudo/dm2");
  await page.waitForFunction(() => document.querySelector("#anotacao-tema"), { timeout: 15000 });
  await page.waitForTimeout(300);
  const valorOutroTema = await page.$eval("#anotacao-tema", (el) => el.value);
  console.log("Anotação de outro tema não vaza (começa vazia):", valorOutroTema === "");

  console.log("\nErros de console/página:", erros.length ? erros : "nenhum");
  await page.waitForTimeout(300);
  await browser.close();
})();
