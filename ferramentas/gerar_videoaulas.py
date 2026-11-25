"""Gera data/videoaulas.json: as videoaulas (MedEstudo) de cada aula do cronograma, com a duração.

Uso: python ferramentas/gerar_videoaulas.py <_upload_manifest.json> <_duracoes.csv>
Os dois arquivos ficam na pasta Desktop\\Vídeos do PC do Guilherme (a mesma enviada ao canal do
Telegram). _duracoes.csv foi medido com ffprobe (caminho_relativo,segundos,tamanho_bytes).

MAPA liga cada aula do cronograma (aulaOrdem em data/curriculo.json) às pastas de vídeo
(índice na ordem do manifesto) e aos números dos vídeos daquela pasta que cobrem a aula.
"""
import collections
import csv
import json
import sys
from pathlib import Path

A = "all"
MAPA = {
    1: {62: [1, 2, 3, 4, 9, 11, 13]}, 2: {1: A}, 3: {62: [5, 6, 7, 8, 10, 12, 14]}, 4: {2: A},
    5: {19: [1, 2, 3, 8, 10, 12]}, 6: {19: [4, 5, 6, 7, 9, 11, 13]}, 7: {59: A}, 8: {8: A}, 9: {61: A, 64: A}, 10: {60: A},
    11: {96: A}, 12: {84: A}, 13: {85: A, 86: A}, 14: {24: A}, 15: {78: A}, 16: {97: A}, 17: {79: A}, 18: {87: A},
    19: {20: A}, 20: {12: A, 13: A}, 21: {88: A}, 22: {80: A}, 23: {91: A}, 24: {25: A}, 25: {81: A},
    26: {94: [1, 2, 3, 4, 5, 9, 10, 11]}, 27: {72: A}, 28: {92: [2, 3, 4, 6, 7, 8], 93: A}, 29: {73: A}, 30: {75: A}, 31: {76: A},
    32: {18: A}, 33: {74: A}, 34: {21: A}, 35: {46: A}, 36: {3: A}, 37: {47: A, 48: A}, 38: {50: A, 49: A},
    39: {51: [4, 5, 8, 10, 11]}, 40: {9: [1, 2, 3, 8, 10, 12]}, 41: {51: [1, 2, 3, 6, 7, 9, 12]}, 42: {9: [4, 5, 6, 7, 9, 11, 13]},
    43: {54: A}, 44: {53: A}, 45: {55: A}, 46: {56: [1, 4, 6, 8], 57: A}, 47: {56: [2, 3, 5, 7, 9]}, 48: {5: A},
    49: {30: [2, 3, 4, 5, 6, 9, 10]}, 50: {92: [1, 5, 9], 94: [6, 7, 8]}, 51: {30: [1, 7, 8, 11], 29: A}, 52: {95: A}, 53: {32: A},
    54: {6: [1, 2, 3, 7, 10, 11]}, 55: {34: A}, 56: {35: A}, 57: {31: A}, 58: {101: A}, 59: {89: A}, 60: {6: [4, 5, 6, 8, 9, 12]},
    61: {68: A}, 62: {90: A}, 63: {99: A}, 64: {69: A}, 65: {66: A, 67: A}, 66: {100: A}, 67: {36: A}, 68: {10: A},
    69: {43: A, 41: A}, 70: {102: A}, 71: {39: A}, 72: {37: A, 38: A}, 73: {121: A}, 74: {126: A}, 75: {123: A}, 76: {14: A},
    77: {122: A, 124: A, 125: A, 127: A}, 78: {4: A}, 79: {130: A}, 80: {128: A, 129: A}, 81: {131: A, 132: A}, 82: {98: A},
    83: {116: [1, 2, 3, 7, 9, 11]}, 84: {116: [4, 5, 6, 8, 10, 12, 13], 117: A}, 85: {118: A, 119: A}, 86: {23: A},
    87: {26: A, 113: A, 112: A}, 88: {108: [1, 2, 3, 4, 6, 7], 111: A}, 89: {108: [5], 109: A, 110: A},
    90: {114: [1, 2, 3, 4, 6, 8, 9, 10, 11]}, 91: {114: [5, 7], 115: A},
}


def tipo(titulo):
    t = titulo.upper()
    if t.startswith("MINIAULA"):
        return "miniaula"
    if t.startswith("PODCAST"):
        return "podcast"
    if t.startswith("EXTRA"):
        return "extra"
    if "ATUALIZA" in t:
        return "atualizacao"
    return "aula"


def main(manifesto, duracoes):
    dur = {r["caminho_relativo"].replace("/", "\\"): float(r["segundos"]) for r in csv.DictReader(open(duracoes, encoding="utf-8-sig"))}
    itens = json.load(open(manifesto, encoding="utf-8"))["itens"]
    pastas = collections.OrderedDict()
    for x in itens:
        pastas.setdefault("\\".join(x["rel"].split("\\")[:-1]), []).append(x)
    pastas = list(pastas.values())
    usados = set()
    aulas = {}
    for aula, fontes in MAPA.items():
        lista = []
        for pasta, nums in fontes.items():
            for x in pastas[pasta]:
                if nums != A and int(x["num"]) not in nums:
                    continue
                assert x["rel"] not in usados, x["rel"]
                usados.add(x["rel"])
                lista.append({"titulo": x["titulo"], "tipo": tipo(x["titulo"]), "min": round(dur[x["rel"]] / 60, 1)})
        aulas[str(aula)] = lista
    saida = Path(__file__).resolve().parent.parent / "data" / "videoaulas.json"
    json.dump({"fonte": "Videoaulas do MedEstudo (canal do Telegram), duração medida com ffprobe", "aulas": aulas}, open(saida, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print(f"{len(usados)} vídeos em {len(aulas)} aulas -> {saida}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
