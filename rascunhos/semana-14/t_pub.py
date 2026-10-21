import json
from h import tabela, quadro, fluxo, divergencias, img, img_q, PROPRIA

ID = "puberdade-normal-disturbios"
_t = next(t for t in json.load(open(__file__.rsplit("/", 1)[0] + "/old14.json", encoding="utf-8")) if t["id"] == ID)
_old = {s["titulo"]: s["conteudo"] for s in _t["secoes"]}

RESUMO = ("Fisiologia e sequência da puberdade, estadiamento de Tanner e relação com estirão e menarca, ginecomastia puberal, puberdade precoce central × periférica, "
          "variantes benignas (telarca, adrenarca e menarca precoces), investigação (LH basal, teste do GnRH, idade óssea, RM) e tratamento, e atraso puberal (ACCP, Kallmann, Turner, Klinefelter).")
FONTE = (_t["fonte"] + "; SBP — Documentos Científicos: Puberdade precoce (2023), Adrenarca precoce e telarca precoce (2023), Ginecomastia na adolescência (2022); "
         "Tratado de Pediatria SBP, 5ª ed. (Distúrbios puberais); Bangalore Krishna K, et al. Use of GnRH analogs in children: update by an international consortium. Horm Res Paediatr 2019;91:357-72; "
         "Palmert MR, Dunkel L. Delayed puberty. N Engl J Med 2012;366:443-53; ACOG Committee Opinion 651 (menstruação como sinal vital, reafirmada) e FEBRASGO — Amenorreia; "
         "Estratégia MED — Resumo Estratégico 2026: Puberdade")

SECOES = []

SECOES.append(("Fisiologia da puberdade",
    _old["Fisiologia da puberdade"]
    + "<p>O gatilho é a reativação dos <b>pulsos de GnRH</b> (mediada por <b>kisspeptina</b>, com influência genética, nutricional — leptina — e ambiental). Na criança pré-púbere o eixo está “freado”; no início da puberdade os pulsos de LH são <b>noturnos</b>, e o <b>LH passa a predominar sobre o FSH</b> (marca laboratorial de ativação central). "
      "<b>Mamas</b> dependem do <b>estrogênio ovariano</b>; <b>pelos pubianos e axilares, odor e acne</b> dependem sobretudo dos <b>androgênios adrenais</b> (SES-PE 2022). A adrenarca (↑ DHEA-S) começa por volta de 6–8 anos, antes da gonadarca. "
      "O <b>estirão</b> resulta da ação conjunta de esteroides sexuais e GH/IGF-1; o <b>estrogênio</b> (inclusive o derivado da aromatização da testosterona nos meninos) fecha as epífises.</p>"
    + quadro("Termos que caem", [
        "<b>Gonadarca</b>: ativação gonadal (telarca, aumento testicular). <b>Adrenarca</b>: maturação da zona reticular da adrenal. <b>Pubarca</b>: aparecimento dos pelos pubianos.",
        "<b>Isossexual</b>: caracteres do próprio sexo; <b>heterossexual</b>: do sexo oposto (virilização na menina, feminização no menino) — só ocorre na puberdade precoce <b>periférica</b>.",
        "Adolescência (OMS): 10–19 anos; ECA: 12–18 anos. O fim da adolescência é tão difícil de demarcar quanto o início (ENARE 2024).",
    ])))

SECOES.append(("Puberdade normal: sequência e estadiamento de Tanner",
    _old["Puberdade normal: sequência e estadiamento de Tanner"]
    + tabela(["Estágio", "Mamas (M)", "Pelos pubianos (P)", "Genitália masculina (G)"], [
        ["1 (pré-púbere)", "Só elevação da papila", "Ausentes (só velus)", "Infantil; testículo &lt; 4 mL (&lt; 2,5 cm — ENARE 2023)"],
        ["2", "<b>Broto mamário</b> (telarca)", "Pelos longos, finos, esparsos, na base do pênis/grandes lábios", "<b>Testículos ≥ 4 mL</b>, escroto aumentado e de pele mais fina e avermelhada; pênis ainda infantil"],
        ["3", "Mama e aréola aumentam <b>sem separação de contornos</b>", "Pelos mais escuros, grossos e encaracolados sobre a sínfise", "<b>Pênis cresce em comprimento</b>; testículos 8–10 mL"],
        ["4", "Aréola e papila formam <b>elevação secundária</b> (duplo contorno)", "Tipo adulto, mas sem atingir coxas", "Pênis cresce em diâmetro, glande; escroto escurece; 10–15 mL"],
        ["5", "Mama adulta (aréola volta ao contorno da mama)", "Adulto, estendendo-se às coxas", "Adulto; 15–25 mL"],
    ])
    + "<p><b>Não existe M0, P0 ou G0</b>: o estágio pré-púbere é 1. SES-PE 2017: pênis infantil, testículos de 4 mL e sem pelos → <b>G2P1</b>. ENARE 2025: “pelos espessos e esparsos e mamas aumentadas sem contorno definido” → <b>dados insuficientes</b> para estadiar (descrição imprecisa).</p>"
    + tabela(["Evento", "Meninas", "Meninos"], [
        ["Início (faixa normal)", "<b>8–13 anos</b> — telarca (pode ser <b>unilateral</b> por 6–12 meses)", "<b>9–14 anos</b> — volume testicular ≥ 4 mL"],
        ["Sequência", "Telarca → pubarca → estirão → menarca", "Testículos → pubarca → pênis → estirão → voz/barba"],
        ["Estirão", "<b>Precoce</b>: começa em M2, <b>pico em M3</b> (~8,5 cm/ano), termina em M4", "<b>Tardio</b>: começa em G3, <b>pico em G4</b> (~9,5 cm/ano), termina em G5"],
        ["Marco final", "<b>Menarca</b> 2–3 anos após a telarca, em <b>M4</b> (75%), média 12–13 anos; após a menarca crescem ~<b>7,5 cm</b> (3–17)", "Espermarca (~13–14 anos, G3–G4); mudança de voz ~1 ano após o pico; pelos axilares e faciais em P3–P4"],
        ["Fechamento epifisário", "IO de ~15–16 anos (ENARE 2023)", "IO de ~17 anos (SES-PE 2024 considerou errado “até IO de 15 anos” para meninos)"],
        ["Duração total", "~4 anos (puberdade que leva mais de 4–5 anos deve ser investigada)", "~4 anos"],
    ])
    + quadro("Casos de prova", [
        "SES-PE 2024: Henrique, 12 anos, “baixo perto das meninas” → o estirão feminino ocorre no <b>início</b> da puberdade (meninas da mesma idade estão no pico). A VC na puberdade sobe principalmente pelos <b>esteroides sexuais</b>.",
        "ENARE 2025: telarca aos 10a4m, pubarca aos 11, sem menarca aos 14a6m, exame normal → <b>desenvolvimento normal</b> (ver divergência sobre amenorreia primária).",
        "ENARE 2024: menina com broto aos 9 anos, odor axilar, LH e estradiol em faixa puberal e IO de 8 anos → <b>puberdade fisiológica</b> (começou depois dos 8 anos).",
        "ENARE 2024: orientar levar ao médico a menina <b>sem broto mamário após os 13 anos</b>.",
    ]),
    [img("imagens/resumos/ped/puberdade-sequencia.png",
         "Sequência dos eventos puberais e curva de velocidade de crescimento: nas meninas o estirão é precoce (pico em M3) e a menarca vem em M4; nos meninos o estirão é tardio (pico em G4), depois do aumento testicular e do crescimento peniano.",
         PROPRIA)]))

SECOES.append(("Ginecomastia puberal",
    "<p>Aumento palpável de tecido glandular mamário (&gt; 0,5 cm) em meninos, por <b>desequilíbrio estrogênio/androgênio</b> (aromatização periférica da testosterona). Ocorre em <b>40–65%</b> dos meninos, por volta de <b>13–14 anos</b>, em <b>Tanner G3–G4</b>; pode ser uni ou bilateral, dolorosa. Regride espontaneamente em <b>70–90%</b> em até 2–3 anos.</p>"
    + tabela(["Diferenciar de", "Pistas"], [
        ["<b>Lipomastia</b> (pseudoginecomastia)", "Obesidade, tecido gorduroso sem disco retroareolar firme"],
        ["<b>Fármacos e drogas</b>", "Estrogênios (cremes, cosméticos), espironolactona, cetoconazol, cimetidina, omeprazol, metronidazol, <b>inibidores da 5-alfa-redutase</b> (finasterida — ENARE 2024), antiandrogênicos, antirretrovirais, isoniazida, bloqueadores de canal de cálcio, risperidona/haloperidol, tricíclicos, <b>anabolizantes</b>, álcool, maconha"],
        ["<b>Klinefelter</b> (47,XXY)", "Alto, envergadura &gt; estatura, <b>testículos pequenos e firmes</b> (&lt; 4 mL na puberdade), dificuldade escolar, hipogonadismo hipergonadotrófico"],
        ["<b>Tumores</b>", "Testicular (Leydig, Sertoli, células germinativas com hCG), adrenal feminizante, hepático; massa unilateral endurecida, excêntrica, com fixação ou linfonodo → investigar"],
        ["Outras", "Hipertireoidismo, hepatopatia, DRC, desnutrição com realimentação, hipogonadismo"],
    ])
    + quadro("Conduta", [
        "Menino de 13–14 anos, G3–G4, sem medicações e exame testicular normal → <b>tranquilizar e observar</b> (reavaliar a cada 3–6 meses).",
        "Investigar (LH, FSH, testosterona, <b>estradiol</b>, β-hCG, TSH, prolactina, função hepática; US testicular) se: pré-puberal, &gt; 4 cm ou M3–M4, crescimento rápido, persistência &gt; 2 anos ou após 17 anos, testículos pequenos ou assimétricos (HCPA-RS 2023: além da mamografia, <b>LH e estradiol</b>).",
        "Tratamento clínico, se doloroso ou com impacto psicológico e duração &lt; 1–2 anos: <b>tamoxifeno</b> (antiestrogênio, off-label) — ENARE 2024: “medicamentoso na presença de sintomas, com androgênios ou antiestrogênios”. Anastrozol <b>não</b> é 1ª escolha (pouco eficaz).",
        "<b>Cirurgia</b> (mastectomia subcutânea/lipoaspiração) se volumosa, fibrótica e persistente após o fim da puberdade.",
    ]),
    [img_q("imagens/questoes/hcpa-rs/2023/2023-89c543b2-q009-1.webp",
           "Ginecomastia bilateral persistente em rapaz de 17 anos (início aos 13), com nódulos retroareolares fibroelásticos: por ter passado do período puberal, investiga-se com LH e estradiol (além de outros hormônios e US testicular).")]))

SECOES.append(("Puberdade precoce",
    _old["Puberdade precoce"]
    + tabela(["", "Central (PPC, verdadeira, GnRH-dependente)", "Periférica (PPP, pseudopuberdade, GnRH-independente)"], [
        ["Eixo HHG", "<b>Ativado</b>", "Suprimido (LH/FSH baixos)"],
        ["Caracteres", "Sempre <b>isossexuais</b>", "Iso ou <b>heterossexuais</b>"],
        ["Sequência", "<b>Fisiológica e completa</b> (telarca → pubarca → menarca)", "Fora de ordem, muitas vezes um só evento"],
        ["Testículos no menino", "<b>Aumento bilateral</b>", "Pequenos (adrenal, exógena, hCG) ou <b>assimétricos</b> (tumor de Leydig)"],
        ["Velocidade de crescimento e IO", "Aceleradas: alto na infância, <b>baixo no adulto</b>", "Aceleradas (exceto <b>hipotireoidismo</b>: IO atrasada)"],
        ["Epidemiologia", "5–10× mais em meninas; <b>meninas: 80–90% idiopática</b>; <b>meninos: até 60–70% lesão do SNC</b>", "Varia com a causa"],
    ])
    + tabela(["Causas centrais", "Causas periféricas"], [
        ["<b>Idiopática</b> (mutações MKRN3, DLK1, KISS1/KISS1R)", "Menina: <b>cisto folicular funcionante</b> (a mais comum; telarca e sangramento ao regredir); <b>tumor de células da granulosa</b> (ENARE 2024)"],
        ["<b>Hamartoma hipotalâmico</b> (causa orgânica mais comum; crises gelásticas — ENARE 2024)", "Menino: <b>tumor de células de Leydig</b> (assimetria testicular); <b>tumores secretores de hCG</b> (hepatoblastoma, germinoma, mediastino no Klinefelter) — testículos pouco aumentados; <b>testotoxicose</b> (mutação ativadora do receptor de LH)"],
        ["Tumores do SNC: astrocitoma, glioma óptico (NF1), ependimoma, germinoma", "Ambos: <b>síndrome de McCune-Albright</b> (manchas café com leite de bordas irregulares + displasia fibrosa poliostótica + PPP; mutação GNAS)"],
        ["Hidrocefalia, mielomeningocele, cistos aracnoides, displasia septo-óptica", "<b>Hiperplasia adrenal congênita</b> (não clássica ou mal tratada — virilização), <b>tumores adrenais</b> (virilização + Cushing; Sul do Brasil: TP53 R337H/Li-Fraumeni)"],
        ["Pós-infecção (meningite, encefalite), trauma, irradiação", "<b>Exógena</b>: cremes/géis de estradiol ou testosterona usados pelos pais (USP-RP 2024), anabolizantes"],
        ["Secundária: PPP de longa data que “acende” o eixo (HAC, McCune-Albright)", "<b>Hipotireoidismo primário grave</b> (Van Wyk-Grumbach): TSH age no receptor de FSH → telarca, galactorreia, sangramento; <b>IO atrasada</b>; regride com levotiroxina"],
    ])
    + quadro("Casos de prova (SES-PE adora menina de 6–8 anos que menstruou)", [
        "SES-PE 2020, 2022, 2023: menina de 6–7 anos com M2P2, menstruação e VC &gt; P90 → <b>puberdade precoce verdadeira (central)</b>.",
        "SES-PE 2022: LH/FSH = 2, IO +2,5 DP, US pélvico normal → <b>central, provavelmente idiopática</b>.",
        "SES-PE 2024 e 2026: GnRH positivo, IO avançada, RM normal → <b>PPC verdadeira</b> (idiopática).",
        "SES-PE 2026: 6a8m, M2P1, VC +2,5 DP, IO 8a4m, LH basal 0,3 e <b>pico 8,4</b> pós-GnRH, útero de 25 mL → <b>PPC</b>.",
        "SES-PE 2021: sequência mamas → pelos → menstruação aos 7 anos → <b>PPC completa</b>; propedêutica: RX de mãos, TSH/T4L, LH, 17-OH-progesterona, US abdominal/pélvico e <b>RM de crânio</b>.",
        "SES-PE 2020: PP pode ocorrer por <b>tumor de células de Leydig ou gonadoblastoma</b>; a causa mais frequente em meninas <b>não</b> é o hamartoma.",
        "ENARE 2025: menina de 8 anos com virilização, HAS, testosterona alta, LH suprimido e massa adrenal de 6,5 cm → <b>avaliar funcionalidade e operar (provável carcinoma)</b>.",
    ]),
    [img_q("imagens/questoes/usp-sp/2021/2021-d0a615b4-q101-1.webp",
           "Ultrassonografia de nódulo retroareolar unilateral em menina de 9 anos com leve pilificação: broto mamário (telarca) normal, ainda assimétrico — conduta é acompanhamento clínico, nunca punção ou biópsia (risco de lesar a mama em desenvolvimento).")]))

SECOES.append(("Variantes benignas da precocidade sexual",
    tabela(["", "Telarca precoce isolada", "Pubarca/adrenarca precoce", "Menarca precoce isolada"], [
        ["Definição", "Mamas antes dos 8 anos, sem outros sinais (uni ou bilateral, até M3)", "Pelos pubianos/axilares e odor antes dos 8 (♀) ou 9 anos (♂), sem gonadarca", "Sangramento vaginal antes dos 8 anos sem telarca/pubarca"],
        ["Picos", "<b>&lt; 2 anos</b> (minipuberdade) e 6–8 anos", "6–8 anos; mais em meninas, obesas, nascidas PIG", "Rara"],
        ["Hormônios", "LH pré-puberal, <b>FSH predomina</b>; estradiol baixo", "<b>DHEA-S ↑ discreto</b> (faixa puberal), 17-OHP e testosterona normais", "LH/FSH pré-puberais"],
        ["IO / VC", "Normais", "Normal ou levemente avançada", "Normais"],
        ["Evolução", "Regride ou não progride", "Progressão lenta; risco de SOP e síndrome metabólica", "Regride; excluir <b>corpo estranho, trauma, abuso sexual, tumor</b> (sarcoma botrioide)"],
        ["Conduta", "<b>Acompanhamento clínico</b> (a cada 3–6 meses)", "Acompanhar; dosar DHEA-S, androstenediona, 17-OHP, testosterona (<b>estradiol não</b> — ENARE 2024)", "Exame genital cuidadoso, US pélvico"],
    ])
    + quadro("Casos de prova", [
        "SES-PE 2025: 6 anos, <b>M2 só à direita</b>, VC normal, IO = IC → <b>acompanhamento clínico trimestral</b>. ENARE 2024: broto unilateral aos 6 anos há 9 meses → <b>seguimento</b> (nunca retirar o broto).",
        "SES-PE 2025: adrenarca precoce = <b>menino de 8,5 anos com odor e pelos axilares sem alteração genital</b>.",
        "ENARE 2025: 6 anos, M2P1, VC 4 cm/ano, IO = IC, mas <b>LH basal 1,2</b> → gabarito <b>puberdade precoce central</b> (LH basal ≥ 0,3 = eixo ativado; ver divergência).",
        "Pubarca precoce com clitoromegalia, acne, IO muito avançada → não é benigna: HAC não clássica (17-OHP ↑ basal ou após ACTH) ou tumor (DHEA-S/testosterona muito altos).",
    ])
    + tabela(["", "LH &gt; FSH", "Androgênios", "IO", "VC", "Virilização"], [
        ["Telarca precoce", "Não", "Normais", "= IC", "Normal", "Não"],
        ["PPC", "<b>Sim</b>", "Normais para o estágio", "&gt; IC", "Acelerada", "Não"],
        ["Adrenarca precoce", "Não", "DHEA-S moderadamente ↑", "= ou pouco &gt;", "Normal ou pouco ↑", "Não"],
        ["HAC não clássica", "Não", "<b>17-OHP</b> e testosterona ↑", "&gt; IC", "Moderadamente ↑", "Discreta (clitóris/pênis)"],
        ["Tumor adrenal", "Não (suprimido)", "<b>DHEA-S e testosterona muito ↑</b>", "&gt;&gt; IC", "Muito acelerada", "Intensa ± Cushing"],
    ])))

SECOES.append(("Avaliação e tratamento da puberdade precoce",
    _old["Avaliação e tratamento da puberdade precoce"]
    + fluxo("Investigação da precocidade sexual", [
        ("Anamnese e exame", "idade de início e velocidade de progressão, puberdade dos pais, medicamentos/cremes, sintomas neurológicos; Tanner, virilização, testículos (simetria, volume), manchas café com leite, curva de crescimento"),
        ("Idade óssea", "avanço &gt; 2 DP (≈ 2 anos) sugere puberdade precoce verdadeira ou periférica; variantes benignas têm IO normal"),
        ("LH basal (ICMA)", "<b>≥ 0,3 UI/L</b> = ativação central; se &lt; 0,3 e clínica sugestiva → <b>teste do GnRH/leuprorrelina</b>: pico de LH <b>≥ 5 UI/L</b> (ou ≥ 4–6 conforme o ensaio) e LH/FSH &gt; 0,6–1 = central"),
        {"ramos": [
            ("Central", "<b>RM de crânio/sela</b>: todos os meninos e meninas &lt; 6 anos (ou com sinais neurológicos ou progressão rápida); US pélvico (útero &gt; 3,5 cm ou &gt; 2–3 mL, endométrio visível = estímulo estrogênico)"),
            ("Periférica (LH suprimido)", "estradiol/testosterona, DHEA-S, 17-OHP, β-hCG, TSH/T4L; US pélvico/testicular, TC/RM de adrenais; cariótipo se massa mediastinal (Klinefelter)"),
        ]},
    ])
    + tabela(["Tratamento", "Detalhes"], [
        ["<b>PPC progressiva</b>", "<b>Análogos de GnRH de depósito</b>: leuprorrelina 3,75–7,5 mg mensal ou 11,25–22,5 mg trimestral, triptorrelina; implante de histrelina. Estímulo contínuo → dessensibilização e supressão reversível do eixo"],
        ["Objetivos", "Regressão/estabilização dos caracteres, <b>preservar a estatura final</b> (maior ganho se início &lt; 6 anos), evitar menarca precoce, proteção psicossocial"],
        ["Quando parar", "Na idade puberal normal: ~<b>11 anos</b> (meninas) e 12 (meninos) ou IO ~12–12,5 (USP-RP 2023 e 2025)"],
        ["Monitorar", "LH suprimido, regressão clínica, VC e IO desacelerando; efeitos: reação local, cefaleia, ganho de peso"],
        ["Quem <b>não</b> trata", "PPC lentamente progressiva, menina &gt; 7–8 anos sem prejuízo estatural, variantes benignas — acompanhar a cada 3–6 meses (USP-RP 2024)"],
        ["<b>PPP</b>", "Tratar a causa: cirurgia (tumores gonadais/adrenais), <b>conduta expectante no cisto folicular</b>, retirar a fonte exógena, <b>glicocorticoide na HAC</b>, levotiroxina no hipotireoidismo; McCune-Albright: inibidor de aromatase/tamoxifeno (meninas) e antiandrogênio + inibidor de aromatase (meninos); se o eixo central acender, associar análogo de GnRH"],
    ])
    + "<p>ENARE 2026: 7 anos, broto bilateral, pelos, altura de P50 → P90 em 1 ano, IO 10 anos, LH basal 2,4, RM normal → <b>PPC; pelo avanço da IO, beneficia-se de tratamento</b>. ENARE 2024: M2P2 com gonadotrofinas e estradiol ↑ → <b>PPC, bloqueio do eixo</b>. USP-RP 2022: leuprorrelina 3,75 mg mensal.</p>"))

SECOES.append(("Puberdade atrasada",
    _old["Puberdade atrasada"]
    + tabela(["Grupo", "Causas", "LH/FSH", "Pistas"], [
        ["<b>ACCP</b> (atraso constitucional) — causa mais comum, sobretudo em meninos", "Variante familiar (atraso puberal nos pais)", "Baixos (pré-puberais)", "Baixa estatura com <b>IO atrasada</b>, VC normal para a IO, alvo genético normal; puberdade chega espontaneamente"],
        ["<b>Hipogonadismo hipogonadotrófico funcional</b>", "Doença crônica (celíaca, DII, DRC, FC), desnutrição, <b>anorexia</b>, exercício intenso (bailarinas, atletas), hipotireoidismo, hiperprolactinemia, Cushing", "Baixos", "Corrige-se ao tratar a causa"],
        ["<b>Hipogonadismo hipogonadotrófico permanente</b>", "<b>Síndrome de Kallmann</b> (deficiência de GnRH + <b>anosmia/hiposmia</b>, bulbos olfatórios hipoplásicos — SES-PE 2024), deficiência isolada de gonadotrofinas, <b>craniofaringioma</b>, hipopituitarismo, irradiação", "Baixos", "Diferenciar do ACCP é difícil: teste do olfato, RM, inibina B/teste do GnRH; persistência após 18 anos"],
        ["<b>Hipogonadismo hipergonadotrófico</b> (falência gonadal)", "<b>Turner</b> (45,X — baixa estatura + amenorreia primária) na menina; <b>Klinefelter</b> (47,XXY — alto, testículos pequenos, ginecomastia) no menino; disgenesia gonadal, quimio/radioterapia, orquite, galactosemia, deficiência de 17-alfa-hidroxilase", "<b>Altos</b>", "<b>Cariótipo</b>"],
    ])
    + fluxo("Atraso puberal: investigação", [
        ("Definição", "sem broto mamário aos <b>13 anos</b> (meninas) ou testículos &lt; 4 mL aos <b>14 anos</b> (meninos) — SES-PE 2015; ou puberdade que não se completa em 4–5 anos"),
        ("Primeiros exames", "IO, LH, FSH, estradiol/testosterona, TSH/T4L, prolactina, IGF-1, hemograma, função renal e hepática, VHS, antitransglutaminase"),
        {"ramos": [
            ("LH/FSH altos", "<b>cariótipo</b> → Turner (45,X), Klinefelter (47,XXY), disgenesia; normal → falência gonadal primária"),
            ("LH/FSH baixos", "IO atrasada + VC normal + família → <b>ACCP</b>; anosmia → <b>Kallmann</b>; outros hormônios hipofisários baixos ou sinais neurológicos → <b>RM</b> (craniofaringioma, tumor)"),
        ]},
        ("Tratamento", "ACCP: observar; se sofrimento psicossocial, <b>testosterona</b> (enantato 50–100 mg/mês por 3–6 meses) ou estradiol em dose baixa; hipogonadismo permanente: reposição hormonal progressiva; Turner: GH + estrogênio a partir de 11–12 anos"),
    ])
    + quadro("Amenorreia primária", [
        "Estratégia: ausência de menarca aos <b>16 anos</b> com caracteres sexuais secundários, ou aos <b>14 anos</b> sem eles.",
        "FEBRASGO/ACOG atuais: aos <b>15 anos</b> com caracteres secundários, <b>3 anos após a telarca</b>, ou aos <b>13 anos</b> sem telarca (ver divergência).",
        "SES-PE 2024: 12 anos, telarca aos 10, <b>M2P3</b>, estatura P5 com alvo P25–50, IO 11 anos → <b>cariótipo (Turner)</b> — mosaicos podem ter puberdade parcial.",
        "SES-PE 2014: atraso puberal = ausência de telarca após 13 anos ou de menarca até 5 anos após a telarca.",
    ])))

SECOES.append(("Pontos de atenção",
    _old["Pontos de atenção"]
    + "<p><span class=\"red-flag\">Virilização em menina ou precocidade sexual em menino com testículos pequenos</span> → origem adrenal (HAC ou tumor) ou exógena; massa adrenal grande e heterogênea com HAS e Cushing = provável <b>carcinoma adrenal</b> (Li-Fraumeni/TP53).</p>"
    + "<p><span class=\"red-flag\">Assimetria testicular com precocidade</span> → US testicular (tumor de Leydig).</p>"
    + "<p><span class=\"red-flag\">Sangramento vaginal isolado na infância</span> → excluir corpo estranho, trauma, <b>abuso sexual</b> e tumor antes de rotular como menarca precoce isolada.</p>"
    + "<p><span class=\"red-flag\">Atraso puberal com cefaleia, alteração visual ou outras deficiências hipofisárias</span> → RM (craniofaringioma).</p>"))

SECOES.append(("Dicas de prova",
    _old["Dicas de prova"]
    + quadro("Top 12 de prova (SES-PE, ENARE/ENAMED)", [
        "1º sinal: <b>telarca</b> (8–13 anos) e <b>testículo ≥ 4 mL</b> (9–14 anos — ENARE 2024). Não existe Tanner 0.",
        "Estirão: meninas em M2–M3 (início da puberdade); meninos em G3–G4.",
        "Menarca em M4, 2–3 anos após a telarca; ainda crescem ~7,5 cm.",
        "Ginecomastia em G3–G4 aos 13–14 anos: observar; tamoxifeno se sintomática.",
        "PP: antes de 8 (♀) e 9 anos (♂).",
        "Menina de 6–8 anos com M2P2, menstruação e VC alta → <b>PPC verdadeira</b> (SES-PE 2020–2026).",
        "PPC: meninas idiopática; meninos lesão do SNC (hamartoma) → RM.",
        "PPP: cisto folicular (♀), Leydig com assimetria (♂), McCune-Albright (café com leite), hipotireoidismo com IO atrasada.",
        "Mamas = estrogênio ovariano; pelos = androgênio adrenal (SES-PE 2022).",
        "Telarca isolada (até unilateral) → seguimento trimestral (SES-PE 2025); adrenarca = pelos/odor sem alteração genital.",
        "Atraso: sem broto aos 13 ou testículo &lt; 4 mL aos 14 (SES-PE 2015; ENARE 2024).",
        "Anosmia + hipogonadismo = <b>Kallmann</b> (SES-PE 2024); baixa estatura + atraso puberal na menina = <b>cariótipo</b>.",
    ])))

SECOES.append(("Divergências: provas × evidência atual",
    divergencias([
        ["Amenorreia primária", "Estratégia: sem menarca aos 16 anos (com caracteres) ou 14 (sem); resumo antigo: até 15 anos", "ACOG/FEBRASGO: <b>15 anos</b>, ou <b>3 anos após a telarca</b>, ou 13 anos sem telarca", "ENARE 2025 considerou normal menarca ausente aos 14a6m com telarca aos 10a4m; em geral use <b>15 anos</b> (16 se a banca for clássica)"],
        ["LH basal na PPC", "Estratégia: LH e FSH elevados, LH &gt; FSH; teste de estímulo nos casos duvidosos", "SBP 2023/consenso: <b>LH basal ≥ 0,3 UI/L (ICMA)</b> já confirma ativação central; pico pós-estímulo ≥ 5 UI/L", "LH basal ≥ 0,3 = central, mesmo com IO normal (ENARE 2025)"],
        ["Telarca precoce: seguimento", "Estratégia: observar 6–12 meses", "SBP 2023: reavaliar a cada 3–6 meses (VC, Tanner, IO se progredir)", "SES-PE 2025: <b>acompanhamento trimestral</b>"],
        ["Idade de corte da PP", "Provas brasileiras: 8 anos (♀) e 9 anos (♂)", "Parte das diretrizes norte-americanas aceita 7 anos (meninas brancas) e 6 (negras) como limite para investigar", "Use <b>8 e 9 anos</b>"],
        ["Ginecomastia: tratamento", "Estratégia: sem tratamento, exceto M3–M4 com impacto psicológico (cirurgia)", "SBP 2022: tamoxifeno 10–20 mg/dia por 3–6 meses na fase dolorosa/ativa; anastrozol pouco eficaz; cirurgia se persistente após a puberdade", "Sintomática → antiestrogênio (ENARE 2024); fibrótica persistente → cirurgia"],
        ["Quando suspender o análogo", "Estratégia: “quando atingir a idade normal da puberdade”", "Consenso 2019: ~11 anos (♀)/12 anos (♂) ou IO 12–12,5/13–13,5, individualizando", "USP-RP 2025: <b>até 11 anos ou IO de 12 anos</b>"],
        ["RM na PPC feminina", "Estratégia: meninas &lt; 6 anos ou com sinais neurológicos", "Diretrizes divergem (algumas pedem RM em toda menina com PPC); achados relevantes caem muito após 6 anos", "Menino: sempre; menina &lt; 6 anos ou sinais neurológicos"],
    ])))

MNEMONICOS = [
    {"palavra": "8-9 / 13-14", "explicacao": "Puberdade normal: meninas 8–13 anos, meninos 9–14 anos. Antes disso = precoce; depois = atrasada."},
    {"palavra": "M3 PICO, G4 PICO", "explicacao": "Pico do estirão: meninas em M3 (início da puberdade); meninos em G4 (fim da puberdade)."},
    {"palavra": "PPC: ELA idiopática, ELE cabeça", "explicacao": "Puberdade precoce central: nas meninas, 80–90% idiopática; nos meninos, até 70% por lesão do SNC (RM obrigatória)."},
    {"palavra": "HIPOTIREOIDISMO ANDA PARA TRÁS", "explicacao": "Puberdade precoce com idade óssea ATRASADA = hipotireoidismo primário (Van Wyk-Grumbach); as demais causas aceleram a IO."},
]

COMO_CAI = (_t["comoCai"] + " Na SES-PE (mais de 20 questões), o caso clássico é a menina de 6–8 anos com M2P2, menstruação, VC alta, IO avançada e teste do GnRH positivo → puberdade precoce verdadeira idiopática (2020–2026); "
            "caem também telarca unilateral (seguimento trimestral), adrenarca precoce, estrogênio × androgênio adrenal, Kallmann, Turner na menina baixa com puberdade incompleta e o estadiamento G2P1. "
            "No ENARE: LH basal na PPC, tumor de granulosa, carcinoma adrenal virilizante, hamartoma, ginecomastia (inibidor da 5-alfa-redutase, tratamento medicamentoso), exames da pubarca precoce, definição de atraso puberal e amenorreia primária.")
PRIORIDADE = "alta"
