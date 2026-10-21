# Helpers de HTML para os resumos (mesmas classes dos resumos revisados).

def tabela(cab, linhas):
    th = "".join(f"<th>{c}</th>" for c in cab)
    tr = "".join("<tr>" + "".join(f"<td>{c}</td>" for c in l) + "</tr>" for l in linhas)
    return f'<div class="table-wrap"><table><thead><tr>{th}</tr></thead><tbody>{tr}</tbody></table></div>'


def quadro(titulo, itens):
    li = "".join(f"<li>{i}</li>" for i in itens)
    return f'<div class="quadro-chave"><span class="quadro-chave__titulo">{titulo}</span><ul>{li}</ul></div>'


def _passo(p):
    if isinstance(p, (tuple, list)):
        return f'<div class="fluxo-resumo__passo"><b>{p[0]}</b>: {p[1]}</div>'
    return f'<div class="fluxo-resumo__passo">{p}</div>'


def fluxo(titulo, etapas):
    """etapas: lista; cada item é texto, (titulo, texto) ou lista de ramos [(t, x), ...] (usar dict {'ramos': [...]})."""
    partes = []
    for e in etapas:
        if isinstance(e, dict):
            partes.append('<div class="fluxo-resumo__ramos">' + "".join(_passo(r) for r in e["ramos"]) + "</div>")
        else:
            partes.append(_passo(e))
    seta = '<div class="fluxo-resumo__seta">↓</div>'
    return f'<div class="fluxo-resumo"><div class="fluxo-resumo__titulo">{titulo}</div>' + seta.join(partes) + "</div>"


def divergencias(linhas):
    """linhas: (ponto, estrategia/provas, diretriz atual, como responder)."""
    return tabela(["Ponto", "Estratégia / provas", "Evidência atual", "Na prova"], linhas)


def img(url, legenda, fonte):
    return {"url": url, "legenda": legenda, "fonte": fonte}


def img_q(url, legenda):
    inst = url.split("/")[2].upper()
    ano = url.split("/")[3] if url.split("/")[3].isdigit() else url.split("/")[3][:4]
    nomes = {"HIAE-SP": "HIAE-SP", "USP-RP": "USP-RP", "SES-PE": "SES-PE", "SESPE": "SES-PE"}
    return img(url, legenda, f"Imagem de questão de prova — {nomes.get(inst, inst)} {ano}")


PROPRIA = "Esquema elaborado para o MedConduta"


def diverge(ponto, fonte_prova, evidencia, na_prova):
    """Nota de divergência dentro da seção: o que a prova/Estratégia diz, o que a evidência atual diz e como responder."""
    return ('<div class="divergencia-nota"><span class="divergencia-nota__titulo">⚖️ Divergência — ' + ponto + '</span>'
            f'<p><b>Provas/Estratégia:</b> {fonte_prova}</p><p><b>Evidência atual:</b> {evidencia}</p><p><b>Na prova:</b> {na_prova}</p></div>')
