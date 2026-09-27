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

  const email = `teste.motivoerro.${Date.now()}@example.com`;
  await page.goto("http://localhost:8744");
  await page.waitForSelector("#login-email", { timeout: 10000 });
  await page.click("#login-alternar");
  await page.fill("#login-email", email);
  await page.fill("#login-password", "senha12345");
  await page.click("#login-submit");
  await page.waitForSelector("#sidebar-nav a", { timeout: 15000 });
  await page.waitForTimeout(800);

  // --- 1) Questões: responde até achar uma questão errada, confirma seletor de motivo
  await page.click(".nav-link:has-text('Questões')");
  await page.waitForFunction(() => document.querySelector(".main__container")?.textContent.includes("Banco de questões"), { timeout: 20000 });
  await page.waitForSelector(".opcoes[data-qid]", { timeout: 15000 });

  let questaoErradaId = null;
  let indiceErrado = null;
  for (let tentativa = 0; tentativa < 15; tentativa++) {
    const opcoesEl = (await page.$$(".opcoes[data-qid]"))[tentativa];
    if (!opcoesEl) break;
    const qid = await opcoesEl.getAttribute("data-qid");
    const primeiraOpcao = await opcoesEl.$(".question-option");
    await primeiraOpcao.click();
    await page.waitForTimeout(200);
    const temMotivo = await page.$(`.resultado[data-qid="${qid}"] .motivo-erro`);
    if (temMotivo) {
      questaoErradaId = qid;
      indiceErrado = 0;
      break;
    }
  }
  console.log("Achou uma questão errada com seletor de motivo visível:", !!questaoErradaId);

  if (questaoErradaId) {
    const motivoBtn = await page.$(`.resultado[data-qid="${questaoErradaId}"] .motivo-erro [data-motivo="atencao"]`);
    await motivoBtn.click();
    await page.waitForTimeout(300);
    const selecionado = await motivoBtn.evaluate((el) => el.classList.contains("is-selected"));
    console.log("Botão de motivo fica com classe 'is-selected' após clicar:", selecionado);

    // Confirma persistência: busca o registro salvo em respostas com motivoErro
    const registros = await page.evaluate(async () => {
      const mod = await import("./app/db.js");
      return mod.getAll("respostas");
    });
    const registroComMotivo = registros.find((r) => r.questaoId === questaoErradaId && r.motivoErro === "atencao");
    console.log("Registro em 'respostas' persiste motivoErro='atencao':", !!registroComMotivo);
  }

  // --- 2) Meus Erros: mesma questão errada aparece e, ao errar de novo, também mostra o seletor
  if (questaoErradaId) {
    await page.click(".nav-link:has-text('Meus Erros')");
    await page.waitForFunction(() => document.querySelector(".main__container")?.textContent.includes("Revisão de erros"), { timeout: 20000 });
    await page.waitForTimeout(500);
    const opcoesErro = await page.$(`.opcoes[data-qid="${questaoErradaId}"]`);
    console.log("Questão errada aparece em Meus Erros (vencida imediatamente):", !!opcoesErro);
    if (opcoesErro) {
      const botoes = await opcoesErro.$$(".question-option");
      await botoes[indiceErrado].click();
      await page.waitForTimeout(300);
      const temMotivoErros = await page.$(`.resultado[data-qid="${questaoErradaId}"] .motivo-erro`);
      console.log("Ao errar de novo em Meus Erros, mostra seletor de motivo:", !!temMotivoErros);
      if (temMotivoErros) {
        await page.click(`.resultado[data-qid="${questaoErradaId}"] .motivo-erro [data-motivo="interpretacao"]`);
        await page.waitForTimeout(300);
      }
    }
  }

  // --- 3) Simulados: revisão pós-simulado também tem o seletor quando erra
  await page.goto("http://localhost:8744/#/residencia/simulados");
  await page.waitForFunction(() => document.querySelector("#simulado-tamanho"), { timeout: 15000 });
  await page.selectOption("#simulado-tamanho", "20");
  await page.click("#btn-iniciar");
  await page.waitForFunction(() => document.querySelector(".question-option"), { timeout: 15000 });
  for (let i = 0; i < 20; i++) {
    await page.click(".question-option");
    await page.waitForTimeout(60);
    const proximoBtn = await page.$("#btn-proxima:not([disabled])");
    if (proximoBtn) {
      await proximoBtn.click();
      await page.waitForTimeout(80);
    } else break;
  }
  await page.click("#btn-finalizar");
  await page.waitForFunction(() => document.querySelector(".main__container")?.textContent.includes("Resultado do simulado"), { timeout: 20000 });
  await page.waitForTimeout(300);

  const motivoNoSimulado = await page.$(".plan-queue .motivo-erro");
  console.log("Revisão pós-simulado mostra seletor de motivo em ao menos 1 questão errada:", !!motivoNoSimulado);
  if (motivoNoSimulado) {
    const btn = await motivoNoSimulado.$('[data-motivo="naoSabia"]');
    await btn.click();
    await page.waitForTimeout(300);
    const selecionadoSimulado = await btn.evaluate((el) => el.classList.contains("is-selected"));
    console.log("Botão de motivo no simulado fica selecionado:", selecionadoSimulado);
  }

  // --- 4) Relatório Semanal mostra a agregação de motivos
  await page.goto("http://localhost:8744/#/residencia/relatorio-semanal");
  await page.waitForFunction(() => document.querySelector(".main__container")?.textContent.includes("Sua semana em resumo"), { timeout: 20000 });
  await page.waitForTimeout(500);
  const textoRelatorio = await page.$eval(".main__container", (el) => el.textContent);
  console.log("Relatório Semanal mostra seção 'Por que você errou':", textoRelatorio.includes("Por que você errou"));
  console.log("Relatório Semanal mostra rótulo 'Falta de atenção' (motivo registrado):", textoRelatorio.includes("Falta de atenção"));

  console.log("\nErros de console/página:", erros.length ? erros : "nenhum");
  await page.waitForTimeout(300);
  await browser.close();
})();
