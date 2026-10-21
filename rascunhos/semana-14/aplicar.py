"""Aplica os resumos t_*.py em data/temas.json (rodar na raiz do repositório).
Uso: python3 aplicar.py t_kawasaki.py [t_outro.py ...] [--gravar]"""
import json, runpy, sys, os

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
gravar = "--gravar" in sys.argv
arqs = [a for a in sys.argv[1:] if a.endswith(".py")]
temas = json.load(open("data/temas.json", encoding="utf-8"))
por_id = {t["id"]: t for t in temas}

for arq in arqs:
    m = runpy.run_path(os.path.join(AQUI, arq))
    t = por_id[m["ID"]]
    bonus = [s for s in t["secoes"] if s["titulo"].startswith("Aulas bônus")]
    assert bonus, ("sem seção de aulas bônus", m["ID"])
    secoes = []
    for s in m["SECOES"]:
        titulo, conteudo = s[0], s[1]
        nova = {"titulo": titulo, "conteudo": conteudo}
        if len(s) > 2 and s[2]:
            for i in s[2]:
                assert os.path.exists(i["url"]), i["url"]
            nova["imagens"] = s[2]
        secoes.append(nova)
    t["secoes"] = secoes + bonus[-1:]
    t["resumo"] = m["RESUMO"]
    t["fonte"] = m["FONTE"]
    t["comoCai"] = m["COMO_CAI"]
    if m.get("MNEMONICOS"):
        antigos = {x["palavra"] for x in t.get("mnemonicos", [])}
        t["mnemonicos"] = t.get("mnemonicos", []) + [x for x in m["MNEMONICOS"] if x["palavra"] not in antigos]
    if m.get("PRIORIDADE"):
        t["prioridadeProva"] = m["PRIORIDADE"]
    t["revisado"] = True
    t["revisaoProvas"] = True
    n = sum(len(s["conteudo"]) for s in secoes)
    print(m["ID"], len(secoes), "seções", n, "caracteres", sum(len(s.get("imagens", [])) for s in secoes), "imagens")

if gravar:
    with open("data/temas.json", "w", encoding="utf-8") as f:
        json.dump(temas, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print("gravado")
