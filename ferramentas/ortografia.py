"""Correções automáticas de digitação/formatação vindas da extração de PDF.

- ligadura perdida: "pro ssional" -> "profissional", " nal" -> " final" (fi/fl/ff sumiram do PDF)
- hifenização: "diag- nóstico" -> "diagnóstico", mas "Notam- se" -> "Notam-se", "pré- eclâmpsia" -> "pré-eclâmpsia"
- marca-d'água vazada: sequência de linhas com 1 a 4 caracteres ("v li\\nvr e\\n ,\\nM...") é removida
- quebras de linha no meio da frase (texto colado do PDF com \\n a cada linha) viram espaço

python ferramentas/ortografia.py            -> conta o que seria corrigido no banco e mostra exemplos
python ferramentas/ortografia.py --gravar   -> grava as correções (ids e demais campos não mudam)
Uso como módulo: c = corretor_do_banco(B.carregar_todas()); c.corrigir(texto)
"""
import collections, json, os, re, sys

PAL = re.compile(r"[A-Za-zÀ-ÿ]+")
LIGS = ("fi", "fl", "ff", "ffi")


ENCLITICOS = {"se", "lo", "la", "los", "las", "me", "te", "lhe", "lhes", "nos", "vos", "o", "a", "os", "as"}


PREFIXOS = set("pré pós pre pos recém anti pronto alfa beta gama gram ex semi infra supra inter intra sub super auto "
               "contra extra hiper hipo neo pseudo micro macro multi co pan para peri trans ultra vice".split())


class Corretor:
    """`textos_limpos`: textos sem defeito de PDF (páginas de tema e comentários) — servem de dicionário."""
    def __init__(self, textos_limpos):
        self.vocab = collections.Counter()
        for t in textos_limpos:
            self.vocab.update(w.lower() for w in PAL.findall(t))

    def ok(self, w, minimo=1):
        return self.vocab[w.lower()] >= minimo

    def _juntar_lig(self, a, b):
        """Melhor palavra a+lig+b que existe no dicionário."""
        cands = [(self.vocab[(a + lig + b).lower()], a + lig + b) for lig in LIGS]
        n, w = max(cands)
        return w if n >= 2 else None

    def _ligadura_par(self, m):
        a, b = m.group(1), m.group(2)
        if self.ok(a) and self.ok(b):
            return m.group(0)
        return self._juntar_lig(a, b) or m.group(0)

    def _ligadura_inicio(self, m):
        w = m.group(2)
        if self.ok(w):
            return m.group(0)
        cand = self._juntar_lig("", w)
        return m.group(1) + cand if cand else m.group(0)

    def _hifen(self, m):
        a, b = m.group(1), m.group(2)
        if b.lower() in ENCLITICOS:
            return a + "-" + b
        if len(b) >= 3 and self.ok(a + b, 2) and not self.ok(a + "-" + b) and not self.ok(b, 3):
            return a + b
        if a.lower() in PREFIXOS or self.ok(a + "-" + b):
            return a + "-" + b
        return m.group(0)

    def _pares(self, t):
        """Junta pares "pro ssional" -> "profissional" (sem pular pares sobrepostos)."""
        partes = re.split(r"([A-Za-zÀ-ÿ]+)", t)
        i = 1
        while i + 2 < len(partes):
            a, sep, b = partes[i], partes[i + 1], partes[i + 2]
            if sep == " " and b[:1].islower() and not (self.ok(a) and self.ok(b)):
                w = self._juntar_lig(a, b)
                if w:
                    partes[i:i + 3] = [w]
                    continue
            i += 2
        return "".join(partes)

    def corrigir(self, t):
        if not t:
            return t
        orig = t
        # marca-d'água vertical ("v li", "vr e", "@", "proibida. pr"...): linhas soltas de até 5 caracteres
        # ou fragmentos curtos com "proibida"; itens legítimos curtos ("I", "II", "A)") ficam
        if "\n" in t:
            t = re.sub(r"\s*\bv li(?=\n\s*vr e\b)", "", t)  # 1º pedaço da marca-d'água colado no fim da linha
            linhas = t.split("\n")
            fica = [l for l in linhas if not (
                (len(l.strip()) <= 5 and not re.fullmatch(r"\s*(?:[IVX]{1,4}|[A-E]|\d{1,3})[.)\-–]?\s*", l))
                or (len(l.strip()) <= 16 and "proibida" in l))]
            t = "\n".join(fica)
        # restos da mesma marca-d'água já colados numa linha só ("v vr e", "n li vr e , M tw e it ...")
        if "vr e" in t:
            t = re.sub(r"(?:\s+[A-Za-z]{1,2}\b)*\s*\bvr e\b(?:\s*(?:,|@|proibida\.|\b(?:M|tw|e|it|d|te|ic|r|i|n|a|L|li|ci|pr|oi|di|m|v)\b))*",
                       "", t)
        # quebra de linha no meio da frase (minúscula/vírgula antes, minúscula depois)
        # (fica a quebra depois de ponto final/dois-pontos e antes de item de lista: "I -", "a)", "•", "1.")
        t = re.sub(r"(?<![.:;?!])\n(?!\s*(?:[IVX]{1,4}\s*[-–.)]|[a-eA-E]\)|\(?\d{1,2}[.)-]|[•\-–]))", " ", t)
        t = re.sub(r"(\w+)-\s+([a-zà-ú]\w*)", self._hifen, t)
        t = self._pares(t)
        t = re.sub(r"(^|[\s(“\"])([a-zà-ÿ]{3,})\b", self._ligadura_inicio, t)
        t = re.sub(r"[ \t]{2,}", " ", t)
        t = re.sub(r"(?<!\() +([,.;:?!)])", r"\1", t)
        return t.strip() if t != orig else orig


def textos_limpos(qs, temas):
    yield json.dumps(temas, ensure_ascii=False)
    for q in qs:
        yield q.get("comentario") or ""


def corretor_do_banco(todas):
    import banco_questoes as B
    temas = list(B.carregar_temas().values())
    return Corretor(textos_limpos([q for _, q in todas], temas))


def corrigir_questao(c, q):
    """Corrige enunciado e alternativas no lugar; devolve True se algo mudou."""
    novo_e = c.corrigir(q["enunciado"])
    novas_a = [c.corrigir(a) for a in q["alternativas"]]
    mudou = novo_e != q["enunciado"] or novas_a != q["alternativas"]
    q["enunciado"], q["alternativas"] = novo_e, novas_a
    return mudou


def main(gravar):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import banco_questoes as B
    todas = B.carregar_todas()
    c = corretor_do_banco(todas)
    n, ex = 0, []
    for _, q in todas:
        antes = [q["enunciado"]] + q["alternativas"]
        if corrigir_questao(c, q):
            n += 1
            if len(ex) < 12:
                t, novo = antes[0], q["enunciado"]
                i = next((k for k, (x, y) in enumerate(zip(t, novo)) if x != y), 0)
                ex.append(f"{q['id']}: {t[max(0, i - 25):i + 35]!r} -> {novo[max(0, i - 25):i + 35]!r}")
    print(f"questões com correção: {n} de {len(todas)}")
    for e in ex:
        print(" ", e)
    if not gravar:
        return
    por_arquivo = {}
    for nome, q in todas:
        por_arquivo.setdefault(nome, []).append(q)
    for nome, lista in por_arquivo.items():
        B.salvar_json(os.path.join(B.DIR, nome), lista)
    B.gerar_indice()
    print("gravado" if B.validar() else "ATENÇÃO: validação falhou")


if __name__ == "__main__":
    main("--gravar" in sys.argv)
