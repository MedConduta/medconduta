"""Copia cada linha da tabela de divergências para uma nota dentro da seção correspondente.
Uso (raiz do repo): python3 inline.py mapa.json [--gravar]"""
import json, re, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from h import diverge
mapa = json.load(open(sys.argv[1], encoding="utf-8"))
temas = json.load(open("data/temas.json", encoding="utf-8"))
por_id = {t["id"]: t for t in temas}
for tid, regras in mapa.items():
    t = por_id[tid]
    tab = next(s for s in t["secoes"] if s["titulo"].startswith("Diverg"))["conteudo"]
    linhas = []
    for tr in re.findall(r"<tbody>(.*)</tbody>", tab, re.S)[0].split("<tr>")[1:]:
        tds = re.findall(r"<td>(.*?)</td>", tr, re.S)
        linhas.append(tds)
    usadas = 0
    for prefixo, secao in regras.items():
        row = [l for l in linhas if re.sub("<[^>]+>", "", l[0]).startswith(prefixo)]
        assert len(row) == 1, (tid, prefixo)
        sec = [s for s in t["secoes"] if s["titulo"] == secao]
        assert len(sec) == 1, (tid, secao)
        nota = diverge(*row[0])
        if nota not in sec[0]["conteudo"]:
            sec[0]["conteudo"] += nota
        usadas += 1
    print(tid, usadas, "de", len(linhas), "divergências levadas para as seções")
if "--gravar" in sys.argv:
    with open("data/temas.json", "w", encoding="utf-8") as f:
        json.dump(temas, f, ensure_ascii=False, indent=2); f.write("\n")
    print("gravado")
