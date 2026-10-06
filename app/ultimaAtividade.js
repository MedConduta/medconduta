/**
 * "Continue de onde parou": guarda a última tela de estudo aberta (tema,
 * questões, flashcards, simulado...) para o Início oferecer a volta direta.
 * Fica no servidor (prefs) para valer entre aparelhos, com cópia local para
 * o Início aparecer na hora.
 */
import { getPref, setPref } from "./db.js";

const PREF = "ultima_atividade";
const CHAVE_LOCAL = "medconduta:ultima_atividade";

const TIPOS = [
  { prefixo: "/residencia/conteudo/", tipo: "Tema" },
  { prefixo: "/residencia/questoes", tipo: "Questões" },
  { prefixo: "/residencia/flashcards", tipo: "Flashcards" },
  { prefixo: "/residencia/erros", tipo: "Revisão de erros" },
  { prefixo: "/residencia/revisao-alto-rendimento", tipo: "Alto rendimento" },
  { prefixo: "/residencia/simulados", tipo: "Simulado" },
  { prefixo: "/residencia/curso", tipo: "Curso" },
];

let ultimaGravada = null;

export function tipoDaRota(path) {
  return TIPOS.find((t) => path === t.prefixo || path.startsWith(t.prefixo))?.tipo || null;
}

export async function registrarAtividade(path, hashCompleto, titulo) {
  const tipo = tipoDaRota(path);
  if (!tipo || !titulo) return;
  const atividade = { tipo, titulo, link: hashCompleto, em: new Date().toISOString() };
  try {
    localStorage.setItem(CHAVE_LOCAL, JSON.stringify(atividade));
  } catch {
    /* sem localStorage: segue só com o servidor */
  }
  if (ultimaGravada === hashCompleto) return;
  ultimaGravada = hashCompleto;
  await setPref(PREF, atividade);
}

export async function getUltimaAtividade() {
  let local = null;
  try {
    local = JSON.parse(localStorage.getItem(CHAVE_LOCAL) || "null");
  } catch {
    local = null;
  }
  const remota = await getPref(PREF, null);
  if (!local) return remota;
  if (!remota) return local;
  return local.em > remota.em ? local : remota;
}
