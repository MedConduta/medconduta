import { escapeHtml } from "../utils.js";
import { chamarApiAutenticada } from "../auth.js";

/**
 * Tela de administrador: quem tem conta, quando usou pela última vez, e os
 * convites de uso único exigidos no cadastro. O acesso é decidido pelo
 * Worker (secret ADMIN_EMAILS) — esta tela só exibe o 403 se não for admin.
 */
export async function renderAdmin(container) {
  container.innerHTML = `<div class="main__container"><div class="empty-state">Carregando...</div></div>`;

  const [usuariosRes, convitesRes] = await Promise.all([
    chamarApiAutenticada("GET", "/admin/usuarios"),
    chamarApiAutenticada("GET", "/admin/convites"),
  ]);

  if (!usuariosRes.ok || !convitesRes.ok) {
    const res = usuariosRes.ok ? convitesRes : usuariosRes;
    container.innerHTML = `
      <div class="main__container">
        <div class="page-header"><h1>Administração</h1></div>
        <div class="empty-state">${escapeHtml(
          res.status === 403 ? "Esta área é restrita ao administrador da plataforma." : res.dados.erro || "Não foi possível carregar."
        )}</div>
      </div>`;
    return;
  }

  let usuarios = usuariosRes.dados;
  let convites = convitesRes.dados;

  function render() {
    const livres = convites.filter((c) => !c.usado_por).length;
    container.innerHTML = `
      <div class="main__container">
        <div class="page-header">
          <div class="page-header__eyebrow">Administração</div>
          <h1>Usuários e convites</h1>
          <p class="page-header__desc">Novas contas só podem ser criadas com um código de convite gerado aqui. Cada código vale para uma única conta.</p>
        </div>

        <div class="stat-row">
          <div class="stat-tile"><div class="stat-tile__value">${usuarios.length}</div><div class="stat-tile__label">Contas</div></div>
          <div class="stat-tile"><div class="stat-tile__value">${usuarios.filter((u) => ativoNosUltimosDias(u, 7)).length}</div><div class="stat-tile__label">Ativas nos últimos 7 dias</div></div>
          <div class="stat-tile"><div class="stat-tile__value">${livres}</div><div class="stat-tile__label">Convites disponíveis</div></div>
        </div>

        <section class="card" style="margin-bottom:24px;">
          <h2 style="font-size:var(--fs-lg);">Convites</h2>
          <form id="form-convite" class="admin-convite-form">
            <div class="field">
              <label for="convite-nota">Para quem é (opcional)</label>
              <input type="text" id="convite-nota" maxlength="120" placeholder="Ex.: João, colega do internato" />
            </div>
            <button type="submit" class="btn btn--primary" id="btn-gerar">Gerar convite</button>
          </form>
          <p class="admin-feedback" id="convite-feedback" role="status"></p>
          ${
            convites.length
              ? `<ul class="admin-list">${convites.map(renderConvite).join("")}</ul>`
              : `<div class="empty-state">Nenhum convite gerado ainda.</div>`
          }
        </section>

        <section class="card">
          <h2 style="font-size:var(--fs-lg);">Contas (${usuarios.length})</h2>
          ${
            usuarios.length
              ? `<ul class="admin-list">${usuarios.map(renderUsuario).join("")}</ul>`
              : `<div class="empty-state">Nenhuma conta criada.</div>`
          }
        </section>
      </div>
    `;

    const feedbackEl = container.querySelector("#convite-feedback");

    container.querySelector("#form-convite").addEventListener("submit", async (e) => {
      e.preventDefault();
      const botao = container.querySelector("#btn-gerar");
      botao.disabled = true;
      const nota = container.querySelector("#convite-nota").value.trim();
      const { ok, dados } = await chamarApiAutenticada("POST", "/admin/convites", { nota });
      if (!ok) {
        botao.disabled = false;
        feedbackEl.textContent = dados.erro || "Não foi possível gerar o convite.";
        return;
      }
      convites = [dados, ...convites];
      render();
      const copiado = await copiar(linkConvite(dados.code));
      container.querySelector("#convite-feedback").textContent = copiado
        ? `Convite ${dados.code} criado — link copiado, é só colar na conversa.`
        : `Convite ${dados.code} criado.`;
    });

    container.querySelectorAll("[data-copiar]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        const ok = await copiar(linkConvite(btn.dataset.copiar));
        feedbackEl.textContent = ok ? `Link do convite ${btn.dataset.copiar} copiado.` : linkConvite(btn.dataset.copiar);
      })
    );

    container.querySelectorAll("[data-revogar]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        const codigo = btn.dataset.revogar;
        if (!confirm(`Revogar o convite ${codigo}? Ele deixará de funcionar.`)) return;
        const { ok, dados } = await chamarApiAutenticada("DELETE", `/admin/convites/${encodeURIComponent(codigo)}`);
        if (!ok) {
          feedbackEl.textContent = dados.erro || "Não foi possível revogar.";
          return;
        }
        convites = convites.filter((c) => c.code !== codigo);
        render();
      })
    );
  }

  render();
}

function renderConvite(c) {
  const status = c.usado_por
    ? `<span class="badge badge--tratamento">Usado por ${escapeHtml(c.usado_por)} · ${formatarData(c.used_at)}</span>`
    : `<span class="badge badge--accent">Disponível</span>`;
  return `
    <li class="admin-list__item">
      <div class="admin-list__main">
        <span class="admin-list__title mono">${escapeHtml(c.code)}</span>
        <span class="admin-list__meta">${c.note ? `${escapeHtml(c.note)} · ` : ""}criado em ${formatarData(c.created_at)}</span>
      </div>
      <div class="admin-list__actions">
        ${status}
        ${
          c.usado_por
            ? ""
            : `<button type="button" class="btn btn--secondary btn--sm" data-copiar="${escapeHtml(c.code)}">Copiar link</button>
               <button type="button" class="btn btn--ghost btn--sm" data-revogar="${escapeHtml(c.code)}">Revogar</button>`
        }
      </div>
    </li>`;
}

function renderUsuario(u) {
  const ultimoUso = maisRecente(u.ultima_atividade, u.ultimo_login);
  return `
    <li class="admin-list__item">
      <div class="admin-list__main">
        <span class="admin-list__title">${escapeHtml(u.email)}</span>
        <span class="admin-list__meta">Conta criada em ${formatarData(u.created_at)}${u.convite ? ` · convite ${escapeHtml(u.convite)}` : ""}</span>
      </div>
      <div class="admin-list__actions">
        <span class="badge${ativoNosUltimosDias(u, 7) ? " badge--tratamento" : ""}">${ultimoUso ? `Último uso ${tempoRelativo(ultimoUso)}` : "Nunca usou"}</span>
        <span class="badge">${u.respostas} ${u.respostas === 1 ? "questão" : "questões"}</span>
      </div>
    </li>`;
}

function linkConvite(codigo) {
  return `${window.location.origin}${window.location.pathname}?convite=${encodeURIComponent(codigo)}`;
}

async function copiar(texto) {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    return false;
  }
}

function maisRecente(a, b) {
  if (!a) return b || null;
  if (!b) return a;
  return a > b ? a : b;
}

function ativoNosUltimosDias(u, dias) {
  const ultimo = maisRecente(u.ultima_atividade, u.ultimo_login);
  return !!ultimo && Date.now() - new Date(ultimo).getTime() < dias * 24 * 60 * 60 * 1000;
}

function formatarData(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function tempoRelativo(iso) {
  const minutos = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutos < 60) return minutos <= 1 ? "agora há pouco" : `há ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.round(horas / 24);
  return dias === 1 ? "ontem" : `há ${dias} dias`;
}
