"""MedConduta — ferramenta do banco de questões particionado.

O banco fica em data/questoes/:
  - indice.json            índice leve (instituição, ano, prova, especialidade, tema...) de TODAS as questões
  - <especialidade>.json   questões completas daquela especialidade (campo `categoria` de data/temas.json)

Subcomandos:
  python ferramentas/banco_questoes.py migrar   converte o antigo data/questoes.json para o formato novo
  python ferramentas/banco_questoes.py indice   regenera indice.json a partir dos arquivos por especialidade
  python ferramentas/banco_questoes.py validar  confere integridade (ids/códigos únicos, temas, imagens, gabarito)

Formato de cada questão:
  id            "q123" (estável: o histórico de respostas dos usuários aponta para ele)
  codigo        chave única para não importar a mesma questão duas vezes (ver gerar_codigo)
  instituicao   padronizada ("SES-PE", "USP-SP", "ENARE"...) ou null quando a fonte não informa
  ano, prova    ex.: 2024, "R1 — Acesso Direto"; numero = número da questão na prova (para "Prova completa")
  origem        de onde o texto veio ("Prova oficial", "MedCof", "Medway", "Estratégia MED", "MedGustavo"...)
  enunciado, alternativas, gabarito ("A".."E"; null se anulada), imagens (lista de caminhos), comentario
  grandeArea, especialidade, temaId, tema, subtema, palavrasChave
  anulada       true quando a banca anulou a questão
  aliases       ids antigos de cópias que foram mescladas nesta questão
  repetidaDe    id da questão original quando esta é a mesma questão reaproveitada em outro caderno da
                instituição (R+ que repete a R1): fica fora do banco/sorteios, mas aparece na prova completa
  soNaProva     true quando a questão depende do caso da questão anterior ("paciente da questão anterior"):
                também fica fora do banco/sorteios e só aparece na prova completa, logo depois da anterior
  revisado, fonte
"""
import hashlib, json, os, re, sys, unicodedata

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIR = os.path.join(RAIZ, "data", "questoes")
LETRAS = "ABCDE"

AREA_POR_CATEGORIA = {
    "Cardiologia": "Clínica Médica", "Endocrinologia": "Clínica Médica", "Pneumologia": "Clínica Médica",
    "Nefrologia": "Clínica Médica", "Gastroenterologia": "Clínica Médica", "Hepatologia": "Clínica Médica",
    "Neurologia": "Clínica Médica", "Infectologia": "Clínica Médica", "Hematologia": "Clínica Médica",
    "Reumatologia": "Clínica Médica", "Medicina Intensiva": "Clínica Médica", "Emergência": "Clínica Médica",
    "Geriatria": "Clínica Médica", "Oncologia": "Clínica Médica", "Cirurgia Geral": "Cirurgia Geral",
    "Urologia": "Cirurgia Geral", "Ginecologia": "Ginecologia e Obstetrícia", "Obstetrícia": "Ginecologia e Obstetrícia",
    "Pediatria": "Pediatria", "Medicina Preventiva": "Medicina Preventiva", "Psiquiatria": "Saúde Mental",
    "Otorrinolaringologia": "Especialidades", "Oftalmologia": "Especialidades",
    "Ortopedia e Traumatologia": "Especialidades", "Dermatologia": "Especialidades", "Anestesiologia": "Especialidades",
}

# grafias encontradas -> sigla padronizada da instituição
INSTITUICAO_ALIAS = {
    "IAUPE / SES-PE": "SES-PE", "IAUPE/SES-PE": "SES-PE", "UFRJ-RJ": "UFRJ", "UNESP-SP": "UNESP",
    "FAMENE-PB": "FAMENE", "SURCE-CE": "SURCE", "IAMSPE": "IAMSPE-SP", "UNIFESPE": "UNIFESP",
    "USP-RP (HCFMRP)": "USP-RP", "UERJ (HUPE)": "UERJ", "UEPA Belém": "UEPA",
    "Santa Casa de Misericórdia de São Paulo — SCMSP": "SCM-SP", "SCMSP": "SCM-SP",
    "Santa Casa de Misericórdia de Ribeirão Preto — SCMRP": "SCM-RP",
    "Hospital Angelina Caron — HAC-PR": "HAC-PR", "Hospital Pequeno Príncipe — HPP-PR": "HPP-PR",
    "Universidade Estadual de Campinas — Unicamp (FCM/HC)": "UNICAMP", "INEP": "REVALIDA", "INEP Revalida": "REVALIDA",
}
# "bancas" que na verdade são a fonte do texto, não a instituição da prova
ORIGEM_SEM_INSTITUICAO = {
    "Estratégia MED": "Estratégia MED", "Banco de questões — Estratégia MED": "Estratégia MED",
    "Banco de questões — Eu Médico Residente (EMR)": "Eu Médico Residente", "MedGustavo": "MedGustavo",
    "Gerada por IA": "IA",
}
PROVA_R1 = "R1 — Acesso Direto"


def norm(s):
    s = unicodedata.normalize("NFKD", s or "")
    s = "".join(c for c in s if not unicodedata.combining(c)).lower()
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


def slug(s):
    return norm(s).replace(" ", "-")


def separar_banca(banca, ano):
    """'UNESP 2023 (Acesso Direto)' -> ('UNESP', 2023, 'R1 — Acesso Direto'). Ano/prova embutidos no texto têm prioridade."""
    texto = f"{banca} {ano if isinstance(ano, str) else ''}"
    prova = None
    if re.search(r"R3\s*(CM|Cl[ií]nica M[eé]dica)", texto, re.I):
        prova = "R3 — Clínica Médica"
    elif re.search(r"acesso direto", texto, re.I):
        prova = PROVA_R1
    elif re.search(r"revalida", texto, re.I):
        prova = "Revalida"
    m = re.search(r"\b(20\d\d|19\d\d)(?:\.\d)?\b", texto)
    ano_txt = int(m.group(1)) if m else None
    nome = re.sub(r"\(.*?\)", " ", banca)
    nome = re.sub(r"\b(20\d\d|19\d\d)(\.\d)?\b|ACESSO DIRETO|Acesso Direto|R3 CM|Revalida", " ", nome)
    nome = re.sub(r"\s+", " ", nome).strip(" ,-")
    nome = INSTITUICAO_ALIAS.get(nome, INSTITUICAO_ALIAS.get(banca, nome))
    if nome == "INEP" or banca.startswith("INEP"):
        nome = "REVALIDA"
    return nome, ano_txt, prova


def gerar_codigo(q):
    """Com instituição, ano e número da questão: 'SES-PE|2024|R1|026'. Sem isso: hash do enunciado + alternativas."""
    if q.get("instituicao") and q.get("ano") and q.get("numero"):
        prova = "R1" if (q.get("prova") or PROVA_R1) == PROVA_R1 else slug(q["prova"])
        edicao = q.get("edicao") or str(q["ano"])
        return f"{q['instituicao']}|{edicao}|{prova}|{int(q['numero']):03d}"
    base = norm(q["enunciado"]) + "|" + norm(" ".join(q["alternativas"]))
    return "h:" + hashlib.sha1(base.encode()).hexdigest()[:16]


def carregar_temas():
    return {t["id"]: t for t in json.load(open(os.path.join(RAIZ, "data", "temas.json"), encoding="utf-8"))}


def salvar_json(caminho, dados, indent=None):
    os.makedirs(os.path.dirname(caminho), exist_ok=True)
    with open(caminho, "w", encoding="utf-8", newline="\n") as f:
        json.dump(dados, f, ensure_ascii=False, indent=indent, separators=(",", ":") if indent is None else None)
        f.write("\n")


def arquivo_da_especialidade(especialidade):
    return f"{slug(especialidade)}.json"


def migrar():
    antigas = json.load(open(os.path.join(RAIZ, "data", "questoes.json"), encoding="utf-8"))
    temas = carregar_temas()
    novas = []
    for q in antigas:
        tema = temas[q["temaId"]]
        esp = tema["categoria"]
        banca = q.get("banca") or ""
        ano = q.get("ano")
        if banca in ORIGEM_SEM_INSTITUICAO:
            inst, ano_txt, prova, origem = None, None, None, ORIGEM_SEM_INSTITUICAO[banca]
        else:
            inst, ano_txt, prova = separar_banca(banca, ano)
            origem = "Prova oficial" if inst == "SES-PE" and banca == "IAUPE / SES-PE" else None
            if inst == "SES-PE" and banca == "IAUPE / SES-PE":
                prova = PROVA_R1
        ano_final = ano if isinstance(ano, int) else ano_txt
        edicao = None
        m = re.search(r"SES-PE (20\d\d\.\d)", q.get("fonte") or "")
        if m:
            edicao = m.group(1)
        nova = {
            "id": q["id"], "codigo": None, "instituicao": inst, "ano": ano_final, "edicao": edicao,
            "prova": prova, "numero": None, "origem": origem,
            "enunciado": q["enunciado"], "alternativas": q["alternativas"],
            "gabarito": LETRAS[q["correta"]] if 0 <= q["correta"] < len(q["alternativas"]) else None,
            "imagens": q.get("imagens", []), "comentario": q.get("comentario", ""),
            "grandeArea": AREA_POR_CATEGORIA.get(esp, "Outros"), "especialidade": esp,
            "temaId": q["temaId"], "tema": tema["titulo"], "subtema": None, "palavrasChave": [],
            "anulada": False, "aliases": [], "revisado": q.get("revisado", False), "fonte": q.get("fonte", ""),
        }
        nova["codigo"] = gerar_codigo(nova)
        novas.append(nova)
    novas, revisao = mesclar_duplicatas(novas)
    por_arquivo = {}
    for q in novas:
        por_arquivo.setdefault(arquivo_da_especialidade(q["especialidade"]), []).append(q)
    for nome, lista in por_arquivo.items():
        salvar_json(os.path.join(DIR, nome), lista)
    salvar_json(os.path.join(RAIZ, "ferramentas", "revisao", "migracao.json"), revisao, indent=1)
    print(f"{len(antigas)} questões antigas -> {len(novas)} após mesclar duplicatas, em {len(por_arquivo)} arquivos; "
          f"{len(revisao)} item(ns) para revisão")
    gerar_indice()


def prioridade(q):
    """Qual cópia vira a principal: instituição conhecida > com imagem > menor id."""
    return (0 if q.get("instituicao") else 1, 0 if q.get("imagens") else 1, int(re.sub(r"\D", "", q["id"]) or 0))


def mesclar_duplicatas(questoes):
    """Mescla cópias com o mesmo código: a principal fica, os ids das outras vão para `aliases`
    (o app redireciona respostas/favoritos antigos). Cópias com gabarito diferente não são mescladas:
    recebem código próprio e vão para a lista de revisão."""
    grupos = {}
    for q in questoes:
        grupos.setdefault(q["codigo"], []).append(q)
    saida, revisao = [], []
    for codigo, grupo in grupos.items():
        if len(grupo) == 1:
            saida.append(grupo[0])
            continue
        if len({q["gabarito"] for q in grupo}) > 1:
            for q in grupo:
                q["codigo"] = f"{codigo}~{q['id']}"
                saida.append(q)
            revisao.append({"motivo": "cópias da mesma questão com gabaritos diferentes",
                            "ids": [q["id"] for q in grupo], "gabaritos": [q["gabarito"] for q in grupo],
                            "enunciado": grupo[0]["enunciado"][:200]})
            continue
        grupo.sort(key=prioridade)
        principal = grupo[0]
        for outra in grupo[1:]:
            principal["aliases"] += [outra["id"]] + outra.get("aliases", [])
            if not principal["imagens"] and outra.get("imagens"):
                principal["imagens"] = outra["imagens"]
        saida.append(principal)
    return saida, revisao


def carregar_todas():
    todas = []
    for nome in sorted(os.listdir(DIR)):
        if nome.endswith(".json") and nome != "indice.json":
            for q in json.load(open(os.path.join(DIR, nome), encoding="utf-8")):
                todas.append((nome, q))
    return todas


def gerar_indice():
    """Índice colunar: strings repetidas viram posições em listas de dicionário, para ficar pequeno."""
    todas = carregar_todas()
    dic = {"arquivo": [], "instituicao": [], "prova": [], "temaId": [], "origem": []}

    def cod(campo, valor):
        if valor is None:
            return -1
        lista = dic[campo]
        try:
            return lista.index(valor)
        except ValueError:
            lista.append(valor)
            return len(lista) - 1

    linhas = []
    aliases = {}
    for nome, q in todas:
        linhas.append([
            q["id"], cod("arquivo", nome), cod("temaId", q["temaId"]), cod("instituicao", q.get("instituicao")),
            q.get("ano"), cod("prova", q.get("prova")), q.get("numero"), 1 if q.get("anulada") else 0,
            len(q.get("imagens") or []), cod("origem", q.get("origem")), q.get("edicao"),
            1 if q.get("repetidaDe") or q.get("soNaProva") else 0,
        ])
        for a in q.get("aliases") or []:
            aliases[a] = q["id"]
    indice = {
        "versao": 1, "total": len(linhas),
        "campos": ["id", "arquivo", "temaId", "instituicao", "ano", "prova", "numero", "anulada", "nImagens", "origem", "edicao", "repetida"],
        "dicionarios": dic, "linhas": linhas, "aliases": aliases,
    }
    salvar_json(os.path.join(DIR, "indice.json"), indice)
    tam = os.path.getsize(os.path.join(DIR, "indice.json"))
    print(f"índice: {len(linhas)} questões, {len(dic['arquivo'])} arquivos, {tam / 1024:.0f} KB")


def validar():
    temas = carregar_temas()
    todas = carregar_todas()
    ids, codigos, erros = set(), {}, []
    for nome, q in todas:
        if q["id"] in ids:
            erros.append(f"id duplicado {q['id']}")
        ids.add(q["id"])
        if q["codigo"] in codigos:
            erros.append(f"código duplicado {q['codigo']}: {codigos[q['codigo']]} e {q['id']}")
        codigos[q["codigo"]] = q["id"]
        t = temas.get(q["temaId"])
        if not t:
            erros.append(f"{q['id']}: tema inexistente {q['temaId']}")
        elif arquivo_da_especialidade(t["categoria"]) != nome:
            erros.append(f"{q['id']}: está em {nome}, mas o tema é de {t['categoria']}")
        if not q.get("anulada") and (q.get("gabarito") not in LETRAS[: len(q["alternativas"])]):
            erros.append(f"{q['id']}: gabarito inválido {q.get('gabarito')}")
        for u in q.get("imagens") or []:
            if not os.path.exists(os.path.join(RAIZ, u)):
                erros.append(f"{q['id']}: imagem não encontrada {u}")
    print(f"{len(todas)} questões verificadas; {len(erros)} problema(s)")
    for e in erros[:50]:
        print("  ", e)
    return not erros


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "migrar":
        migrar()
    elif cmd == "indice":
        gerar_indice()
    elif cmd == "validar":
        sys.exit(0 if validar() else 1)
    else:
        print(__doc__)
