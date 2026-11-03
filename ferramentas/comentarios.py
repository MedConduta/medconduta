"""MedConduta — fila de comentários das questões.

Muitas questões importadas vieram só com "Gabarito: alternativa X." no campo `comentario`.
Esta ferramenta lista essas questões na ordem de prioridade e grava os comentários escritos.

  python ferramentas/comentarios.py contar               quantas faltam, por ano
  python ferramentas/comentarios.py fila N [ANO] [INST]  mostra as próximas N questões sem comentário
  python ferramentas/comentarios.py aplicar ARQ.json     grava {id: comentário} nos arquivos do banco

Prioridade: ano mais recente primeiro; dentro do ano SES-PE, ENAMED, ENARE e depois as bancas
com mais questões; dentro da prova, pela ordem das questões.
"""
import collections, glob, json, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from banco_questoes import DIR, salvar_json  # noqa: E402

PLACEHOLDER = re.compile(r"^\s*(Gabarito( oficial)?:?\s*(a )?[Aa]lternativa\s*[A-E]\.?)?\s*$")
PRIORIDADE = ["SES-PE", "ENAMED", "ENARE"]


def arquivos():
    return sorted(f for f in glob.glob(os.path.join(DIR, "*.json")) if not f.endswith("indice.json"))


def sem_comentario(q):
    if q.get("repetidaDe") or q.get("anulada") or not q.get("gabarito"):
        return False
    return bool(PLACEHOLDER.match(q.get("comentario") or ""))


def pendentes(ano=None, inst=None):
    qs = []
    for f in arquivos():
        for q in json.load(open(f, encoding="utf-8")):
            if sem_comentario(q) and (ano is None or q.get("ano") == ano) and (inst is None or q.get("instituicao") == inst):
                qs.append(q)
    tam = collections.Counter((q.get("ano"), q.get("instituicao")) for q in qs)

    def chave(q):
        i = q.get("instituicao") or "~"
        p = PRIORIDADE.index(i) if i in PRIORIDADE else len(PRIORIDADE)
        return (-(q.get("ano") or 0), p, -tam[(q.get("ano"), q.get("instituicao"))], i,
                q.get("prova") or "", q.get("numero") or 0, q["id"])

    return sorted(qs, key=chave)


def mostrar(q):
    letras = "ABCDE"
    linhas = [f"### {q['id']} | {q.get('instituicao')} {q.get('ano')} | {q.get('tema')} | GABARITO {q['gabarito']}"]
    linhas.append(q["enunciado"].strip())
    for i, a in enumerate(q["alternativas"]):
        linhas.append(f"{letras[i]}) {a}")
    if q.get("imagens"):
        linhas.append("IMAGENS: " + ", ".join(q["imagens"]))
    return "\n".join(linhas)


def aplicar(caminho):
    novos = json.load(open(caminho, encoding="utf-8"))
    feitos = set()
    for f in arquivos():
        dados = json.load(open(f, encoding="utf-8"))
        mudou = False
        for q in dados:
            if q["id"] in novos:
                q["comentario"] = novos[q["id"]].strip()
                feitos.add(q["id"])
                mudou = True
        if mudou:
            salvar_json(f, dados)
    faltou = set(novos) - feitos
    print(f"{len(feitos)} comentários gravados" + (f"; ids não achados: {sorted(faltou)}" if faltou else ""))


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "contar"
    if cmd == "contar":
        c = collections.Counter(q.get("ano") for q in pendentes())
        for ano, n in sorted(c.items(), key=lambda x: -(x[0] or 0)):
            print(ano, n)
    elif cmd == "fila":
        n = int(sys.argv[2])
        ano = int(sys.argv[3]) if len(sys.argv) > 3 and sys.argv[3] != "-" else None
        inst = sys.argv[4] if len(sys.argv) > 4 else None
        print("\n\n".join(mostrar(q) for q in pendentes(ano, inst)[:n]))
    elif cmd == "aplicar":
        aplicar(sys.argv[2])
