import { escapeHtml, formatDate } from "../utils.js";
import { icon } from "../components/icons.js";
import { listarBackups, criarBackupAgora, baixarBackup } from "../backup.js";

export async function renderBackup(container) {
  container.innerHTML = `
    <div class="main__container">
      <div class="page-header">
        <div class="page-header__eyebrow">Minha Preparação — Backup</div>
        <h1>Backup dos seus dados</h1>
        <p class="page-header__desc">
          Todo o seu progresso já é salvo automaticamente na nuvem a cada ação — respostas, revisões, anotações e tudo
          mais ficam gravados no servidor assim que você usa o app, sem precisar de nenhum botão. Aqui, além disso,
          um snapshot completo do dia fica guardado à parte (últimos 30 dias) e você pode baixar uma cópia pro seu
          computador quando quiser, como segurança extra.
        </p>
      </div>
      <div class="skeleton" style="height:88px;margin-bottom:24px;"></div>
      <div class="skeleton-card"><div class="skeleton skeleton-line"></div></div>
    </div>
  `;

  const backups = await listarBackups();
  renderConteudo(container, backups);
}

function renderConteudo(container, backups) {
  const ultimo = backups[0];

  container.innerHTML = `
    <div class="main__container">
      <div class="page-header">
        <div class="page-header__eyebrow">Minha Preparação — Backup</div>
        <h1>Backup dos seus dados</h1>
        <p class="page-header__desc">
          Todo o seu progresso já é salvo automaticamente na nuvem a cada ação — respostas, revisões, anotações e tudo
          mais ficam gravados no servidor assim que você usa o app, sem precisar de nenhum botão. Aqui, além disso,
          um snapshot completo do dia fica guardado à parte (últimos 30 dias) e você pode baixar uma cópia pro seu
          computador quando quiser, como segurança extra.
        </p>
      </div>

      <div class="card" style="margin-bottom:24px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;">
        <div style="display:flex;gap:12px;align-items:center;">
          <span class="icon-badge icon-badge--accent">${icon("cloud", { size: 20 })}</span>
          <div>
            <div class="list-card__title">Último backup</div>
            <div style="color:var(--color-text-secondary);font-size:var(--fs-sm);margin-top:2px;">
              ${ultimo ? `${formatDate(ultimo.criadoEm)} · ${ultimo.totalRegistros} registros` : "Nenhum backup ainda"}
            </div>
          </div>
        </div>
        <button id="backup-agora" class="btn btn--primary" type="button">${icon("cloud", { size: 16 })} Fazer backup agora</button>
      </div>

      <h3>Histórico (últimos 30 dias)</h3>
      ${
        backups.length
          ? `<div class="plan-queue">
              ${backups
                .map(
                  (b) => `
                <div class="card" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
                  <div>
                    <strong>${formatDate(b.criadoEm)}</strong>
                    <div style="color:var(--color-text-secondary);font-size:var(--fs-sm);">${b.totalRegistros} registros</div>
                  </div>
                  <button class="btn btn--secondary" type="button" data-baixar="${escapeHtml(b.id)}">${icon("download", { size: 16 })} Baixar</button>
                </div>`
                )
                .join("")}
            </div>`
          : `<div class="empty-state"><p>Nenhum backup criado ainda — clique em "Fazer backup agora".</p></div>`
      }
    </div>
  `;

  const btnAgora = container.querySelector("#backup-agora");
  btnAgora.addEventListener("click", async () => {
    btnAgora.disabled = true;
    btnAgora.innerHTML = "Fazendo backup...";
    await criarBackupAgora();
    const atualizados = await listarBackups();
    renderConteudo(container, atualizados);
  });

  container.querySelectorAll("[data-baixar]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-baixar");
      baixarBackup(id);
    });
  });
}
