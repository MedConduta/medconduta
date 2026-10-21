import json
from h import tabela, quadro, fluxo, divergencias, img, img_q, PROPRIA

ID = "abordagem-anemias"
_t = next(t for t in json.load(open(__file__.rsplit("/", 1)[0] + "/old14.json", encoding="utf-8")) if t["id"] == ID)
_old = {s["titulo"]: s["conteudo"] for s in _t["secoes"]}

RESUMO = ("Definição de anemia (cortes da OMS 2024), hemograma e reticulócitos, classificação morfológica (VCM, HCM, RDW) e funcional "
          "(hipo × hiperproliferativa), hematoscopia, anemia da DRC e das endocrinopatias, mieloftise, metemoglobinemia, porfiria aguda intermitente e anemia aplásica.")
FONTE = ("WHO — Guideline on haemoglobin cutoffs to define anaemia in individuals and populations (2024); WHO — Guideline on use of ferritin concentrations (2020); "
         "Harrison's Principles of Internal Medicine, 21ª ed.; Hoffbrand, Hematologia Clínica; Williams Hematology, 10ª ed.; "
         "KDIGO 2012 Clinical Practice Guideline for Anemia in CKD e KDIGO 2025 (atualização em consulta pública); Ministério da Saúde — PCDT Anemia na Doença Renal Crônica (alfaepoetina e reposição de ferro); "
         "Peffault de Latour R, et al. Eltrombopag added to immunosuppression in severe aplastic anemia (RACE). N Engl J Med 2022;386:11-23; "
         "Kulasekararaj A, et al. BSH Guideline on the diagnosis and management of adult aplastic anaemia (2024); "
         "Balwani M, et al. Givosiran for acute intermittent porphyria (ENVISION). N Engl J Med 2020;382:2289-301; "
         "Iolascon A, et al. Recommendations for diagnosis and treatment of methemoglobinemia. Am J Hematol 2021;96:1666-78; "
         "Estratégia MED — Resumos Estratégicos 2026: Introdução ao Estudo das Anemias; Anemia Associada a Condições Não Hematológicas")

SECOES = []

# 1. Definição
SECOES.append(("Definição e primeira abordagem",
    _old["Definição e primeira abordagem"]
    + "<p>Os <b>exames iniciais</b> de toda anemia são o <b>hemograma completo (com índices hematimétricos e RDW) + contagem de reticulócitos</b> — resposta literal de várias provas. "
      "A partir deles respondemos duas perguntas: <b>qual o tamanho/cor da hemácia</b> (classificação morfológica) e <b>a medula está respondendo?</b> (classificação funcional). "
      "O esfregaço de sangue periférico (hematoscopia) completa a primeira avaliação.</p>"
    + tabela(["Grupo (OMS)", "Anemia se Hb abaixo de (g/dL)", "Observação"], [
        ["Crianças 6–23 meses", "<b>10,5</b>", "Corte novo da OMS 2024 (antes: &lt; 11 para 6–59 meses)"],
        ["Crianças 24–59 meses", "<b>11</b>", "As provas ainda usam “&lt; 11 de 6 meses a 5 anos”"],
        ["Crianças 5–11 anos", "<b>11,5</b>", "Cobrado literalmente (questão de 2024)"],
        ["Adolescentes 12–14 anos", "<b>12</b>", ""],
        ["Mulheres não gestantes ≥ 15 anos", "<b>12</b>", ""],
        ["Gestantes", "<b>11</b> (1º e 3º trimestres); <b>10,5</b> no 2º trimestre", "Provas: “&lt; 11 na gestação” (ENARE 2024)"],
        ["Homens ≥ 15 anos", "<b>13</b>", ""],
    ])
    + tabela(["Índice do hemograma", "Valor de referência (adulto)", "O que mede"], [
        ["Hemoglobina (Hb)", "H 13–17 g/dL; M 12–15,5 g/dL", "Define anemia"],
        ["<b>VCM</b>", "<b>80–100 fL</b>", "Tamanho médio da hemácia: micro, normo ou macrocitose"],
        ["<b>HCM</b>", "26–34 pg (≈ 28–32)", "Conteúdo de Hb por hemácia: hipocromia &lt; 26–27"],
        ["<b>CHCM</b>", "31–36 g/dL", "Concentração de Hb: ↑ (&gt; 36) = <b>hipercromia → esferocitose</b>"],
        ["<b>RDW</b>", "<b>11–15%</b>", "Variação do tamanho (<b>anisocitose</b>) — ↑ na ferropriva e na megaloblástica; normal no traço talassêmico e na anemia de doença crônica"],
        ["Reticulócitos", "0,5–2% (25–75 mil/mm³)", "Produção medular recente"],
    ])
    + quadro("Pegadinhas da definição", [
        "<b>Hemodiluição</b> (gestação, hiper-hidratação) dá anemia “relativa”; a perda aguda de sangue, nas primeiras horas, <b>não</b> baixa a Hb/Ht (perde-se sangue total) — a queda aparece após reposição volêmica (SES-DF 2022).",
        "Policitemia relativa (desidratação) mascara anemia.",
        "Tabagistas e moradores de altitude têm Hb basal mais alta (a OMS 2024 recomenda ajuste).",
        "Anemia fisiológica do lactente (8–12 semanas, Hb ~9–11 no termo): ↓ eritropoese (queda da EPO com o aumento da oxigenação) + ↓ vida média da hemácia fetal; <b>não</b> se trata e o ferro <b>não</b> a abrevia (SUS-SP 2015, USP-SP 2020).",
    ])))

# 2. VCM
SECOES.append(("Classificação pelo VCM",
    _old["Classificação pelo VCM"]
    + tabela(["Microcíticas (VCM &lt; 80)", "Normocíticas (80–100)", "Macrocíticas (VCM &gt; 100)"], [
        ["<b>Ferropriva</b> (a mais comum)", "<b>Anemia de doença crônica</b> (1ª hipótese diante de normo/normo — SUS-SP 2015)", "<b>Megaloblásticas</b>: B12 e folato (neutrófilos hipersegmentados)"],
        ["<b>Talassemias</b> (traço: microcitose acentuada com Hb quase normal e RDW normal)", "<b>Doença renal crônica</b> (deficiência de EPO)", "<b>Álcool</b> (causa mais comum de macrocitose) e <b>hepatopatia</b> (macrocítica <b>não</b> megaloblástica)"],
        ["<b>Anemia de doença crônica</b> (≈ 25–30% são microcíticas)", "Perda aguda de sangue, hemólise (exceto se reticulocitose intensa)", "<b>Hipotireoidismo</b> (cobrado como “macrocítica”; na prática costuma ser normocítica)"],
        ["<b>Sideroblástica</b> (congênita, álcool, isoniazida, chumbo, cobre)", "Aplasia, mieloftise, endocrinopatias, deficiências mistas (ferro + B12)", "<b>Mielodisplasia</b>, drogas (MTX, hidroxiureia, zidovudina, azatioprina)"],
        ["<b>Intoxicação por chumbo</b> (pontilhado basofílico)", "Fase inicial da ferropriva", "<b>Reticulocitose</b> intensa (hemólise, sangramento) — reticulócito é maior"],
    ])
    + fluxo("Anemia microcítica: o raciocínio da prova", [
        ("Microcitose + hipocromia", "pedir <b>ferritina</b> (e ferro, CTLF, saturação de transferrina)"),
        {"ramos": [
            ("Ferritina baixa", "<b>ferropriva</b> → investigar a causa (EDA + colonoscopia no homem e na mulher pós-menopausa)"),
            ("Ferritina normal/alta + CTLF baixa", "<b>doença crônica</b> (inflamação, PCR alta) — ou ferropriva + inflamação se ferritina &lt; 100 e sat &lt; 20%"),
            ("Ferro e ferritina normais/altos, RDW normal, hemácias muito pequenas e numerosas", "<b>talassemia</b> → eletroforese (HbA2 &gt; 3,5% = β-traço)"),
            ("Ferro alto, sideroblastos em anel", "<b>sideroblástica</b> (mielograma com coloração de Perls)"),
        ]},
    ])
    + "<p><b>Índice de Mentzer</b> (VCM ÷ nº de hemácias em milhões): <b>&lt; 13 sugere talassemia</b> (muitas hemácias pequenas), <b>&gt; 13 sugere ferropriva</b>. "
      "Exemplo de prova (SES-PE 2019): “hemácias 4,16 milhões, Hb 8,5, RDW 13%, hemácias em alvo e dacriócitos, esplenomegalia e fronte proeminente” → talassemia (diferencial com ferropriva e sideroblástica).</p>",
    [img_q("imagens/questoes/usp-rp/2024/2024-96c6400f-q002-1.webp",
           "Hb 11,7 com VCM 75, HCM 25 e RDW 13% (normal): anemia leve, microcitose e RDW normal — gabarito talassemia (USP-RP 2024). O índice de Mentzer (75 ÷ 4,6 ≈ 16) não ajudou aqui: os índices são triagem; quem confirma é a eletroforese de hemoglobina."),
     img_q("imagens/questoes/abc-sp/2023/2023-30033984-q015-1.webp",
           "Criança com Hb 5,6, VCM 78, reticulócitos 0,2% e eletroforese normal (HbA 92%, A2 2%, F 3%): anemia hipoproliferativa sem hemoglobinopatia — o raciocínio parte do VCM e dos reticulócitos.")]))

# 3. Reticulócitos
SECOES.append(("Índice de reticulócitos",
    _old["Índice de reticulócitos"]
    + "<p>O percentual cru engana na anemia (o denominador, nº de hemácias, caiu). Por isso corrigimos:</p>"
    + tabela(["Cálculo", "Fórmula", "Interpretação"], [
        ["<b>Reticulócitos corrigidos</b>", "% reticulócitos × (Ht do paciente ÷ 45)", "&lt; 2% = hipoproliferativa; &gt; 2% = hiperproliferativa"],
        ["<b>Índice de produção reticulocitária (IPR)</b>", "Reticulócitos corrigidos ÷ fator de maturação (1 se Ht 45%; 1,5 se 35%; 2 se 25%; 2,5 se 15%)", "<b>&lt; 2</b> = medula não responde; <b>&gt; 2–3</b> = resposta adequada (hemólise/sangramento)"],
        ["Contagem absoluta", "% × nº de hemácias", "&lt; 75–100 mil/mm³ = hipoproliferativa"],
    ])
    + tabela(["Hipoproliferativas (reticulócitos baixos)", "Hiperproliferativas (reticulócitos altos)"], [
        ["Ferropriva, doença crônica, DRC, endocrinopatias", "<b>Hemólise</b>: ↑ bilirrubina indireta, ↑ LDH, ↓ haptoglobina (o achado laboratorial “mais indicativo” é ↑ BI — AMRIGS 2025)"],
        ["Megaloblástica (com eritropoese <b>ineficaz</b>: LDH e BI altos, mas reticulócitos baixos)", "<b>Sangramento agudo</b> (reticulocitose após 3–5 dias)"],
        ["<b>Aplasia</b>, <b>aplasia pura eritroide</b> (parvovírus B19), mieloftise, mielodisplasia", "Resposta ao tratamento (ferro, B12): pico de reticulócitos em 5–10 dias"],
    ])
    + quadro("Frases que caem", [
        "“Anemia com reticulocitose — exceto?” → <b>anemia aplásica</b> e <b>deficiência de ferro</b> (são hipoproliferativas).",
        "“Reticulocitopenia — exceto?” → <b>esferocitose</b> (hemolítica, hiperproliferativa).",
        "<b>AHAI é hiperproliferativa</b> (“AHAI é considerada hipoproliferativa” é a INCORRETA).",
        "Crise aplásica (Hb 4,5 e reticulócitos 0,1% em paciente com hemólise crônica, ou anemia normocítica isolada em adulto) → <b>parvovírus B19</b> (ENARE 2022, USP-SP 2025).",
        "AMRIGS 2026: o percentual de reticulócitos <b>precisa</b> de ajuste ao grau de anemia (a afirmação de que não precisa é falsa).",
    ])))

# 4. Hematoscopia
SECOES.append(("Hematoscopia: achados do esfregaço de sangue periférico",
    tabela(["Achado", "Significado clássico de prova"], [
        ["<b>Esferócitos</b> (sem halo central)", "Esferocitose hereditária, AHAI a quente; CHCM ↑"],
        ["<b>Esquizócitos</b> (hemácias fragmentadas)", "<b>Hemólise microangiopática</b>: SHU, PTT, CIVD, prótese valvar"],
        ["<b>Drepanócitos</b> (em foice)", "Anemia falciforme (drepanocitose)"],
        ["<b>Dacriócitos</b> (em gota/lágrima)", "<b>Mielofibrose</b>, infiltração medular, talassemia"],
        ["<b>Leptócitos / hemácias em alvo</b>", "<b>Hemoglobinopatia C</b>, talassemias, hepatopatia, pós-esplenectomia (questões ligam alvo a doença falciforme/HbSC)"],
        ["<b>Corpúsculos de Howell-Jolly</b>", "<b>Asplenia/hipoesplenismo</b> (esplenectomia, autoesplenectomia da falciforme)"],
        ["<b>Corpúsculos de Heinz</b>", "Hemoglobina desnaturada: <b>deficiência de G6PD</b> (dapsona, sulfas, primaquina, fava) — SES-PE 2024"],
        ["<b>Pontilhado basofílico</b>", "<b>Intoxicação por chumbo</b>, talassemia, sideroblástica"],
        ["<b>Corpúsculos de Pappenheimer</b>", "Anemia sideroblástica, asplenia"],
        ["<b>Rouleaux</b> (hemácias empilhadas)", "<b>Hipergamaglobulinemia — mieloma múltiplo</b> (com hipercalcemia, insuficiência renal)"],
        ["<b>Acantócitos</b>", "Hepatopatia grave, abetalipoproteinemia"],
        ["<b>Neutrófilos hipersegmentados</b> (≥ 6 lobos ou &gt; 5% com 5 lobos) e macro-ovalócitos", "Anemia megaloblástica (B12/folato)"],
        ["<b>Eritroblastos + formas mieloides jovens</b> (leucoeritroblastose)", "<b>Mieloftise</b>, mielofibrose, hemólise grave"],
        ["Policromatofilia", "Reticulocitose"],
    ])
    + quadro("Associações pedidas em “correlacione”", [
        "Alvo → hemoglobinopatia C; rouleaux → mieloma; esquizócitos → SHU; dacriócitos → mielofibrose (questão de 2024).",
        "Gota → fibrose medular; alvo → hepatopatia/hemoglobinopatia; acantócitos → hepatopatia; Howell-Jolly → asplenia (SUS-SP 2016).",
        "Pós-esplenectomia: Howell-Jolly, leucocitose transitória, <b>trombocitose</b> e linfocitose persistente (IAMSPE-SP 2024).",
        "Leucemia de células pilosas com Howell-Jolly, Heinz e hemácias nucleadas → infiltração esplênica (hipoesplenismo funcional).",
    ]),
    [img_q("imagens/questoes/usp-sp/2021/2021-d62d5aa0-q095-1.webp",
           "Hemácias empilhadas em “pilhas de moedas” (rouleaux) em homem de 60 anos com anemia: hipergamaglobulinemia monoclonal — mieloma múltiplo; o achado associado pedido foi hipercalcemia.")]))

# 5. Sinais e sintomas
SECOES.append(("Sinais e sintomas gerais",
    _old["Sinais e sintomas gerais"]
    + "<p>Os sinais e sintomas refletem a <b>hipóxia tecidual</b> (cefaleia, zumbido, tontura, lipotimia, angina em coronariopata, claudicação) e os <b>mecanismos compensatórios</b> (taquicardia, sopro sistólico, aumento do débito cardíaco, desvio da curva de dissociação da Hb para a direita por ↑ 2,3-DPG). "
      "A presença de <b>icterícia</b> (bilirrubina indireta) aponta hemólise; <b>sangramentos e infecções</b> associados indicam acometimento de outras linhagens (aplasia, leucemia, mieloftise); "
      "<b>sinais neurológicos</b> (parestesia, ataxia, demência) apontam B12; <b>esplenomegalia</b> sugere hemólise crônica, hiperesplenismo ou doença infiltrativa.</p>"
    + quadro("Achados específicos que “entregam” a causa", [
        "Coiloníquia, pica (pagofagia), queilite angular, pernas inquietas, disfagia (Plummer-Vinson) → <b>ferro</b>.",
        "Glossite de Hunter, parestesias, perda de propriocepção/vibratória, demência → <b>B12</b>.",
        "Úlceras de perna, priapismo, colelitíase pigmentar, crises de dor → <b>falciforme</b>.",
        "Fronte olímpica/“facies de esquilo”, hepatoesplenomegalia → <b>talassemia maior</b>.",
    ])))

# 6. DRC e endocrinopatias
SECOES.append(("Anemia da doença renal crônica, endocrinopatias e hepatopatia",
    "<p>A DRC é uma das causas mais comuns de anemia, que surge quando a TFG cai abaixo de <b>60 mL/min/1,73 m²</b> (estágios 3–5) e piora com a progressão. "
    "<b>Mecanismo principal (o mais cobrado): deficiência relativa de eritropoetina</b>. Contribuem: <b>redução da sobrevida das hemácias pela uremia</b>, ferropenia (sangramento digestivo urêmico, perdas na hemodiálise, coletas), perda de folato na diálise, inflamação (↑ hepcidina) e hiperparatireoidismo (fibrose medular). "
    "A EPO é produzida principalmente pelas <b>células peritubulares intersticiais do córtex renal</b> e, em segundo lugar, pelo <b>fígado</b> (SES-PE 2022).</p>"
    + tabela(["Quadro laboratorial", "Achado"], [
        ["Morfologia", "<b>Normocítica e normocrômica</b>"],
        ["Intensidade", "Leve a moderada (Hb ~8–10 g/dL)"],
        ["Reticulócitos", "<b>Baixos</b> (hipoproliferativa)"],
        ["Leucócitos, plaquetas e esfregaço", "Normais (podem aparecer equinócitos/“burr cells” na uremia)"],
        ["Ferro", "Avaliar sempre: ferritina e saturação de transferrina"],
    ])
    + fluxo("Tratamento da anemia da DRC", [
        ("1º passo", "investigar e <b>corrigir ferropenia e outras causas</b> (B12, folato, sangramento, hipotireoidismo, hemólise)"),
        ("Repor ferro", "meta de <b>ferritina &gt; 100 ng/mL (&gt; 200 na hemodiálise) e saturação de transferrina &gt; 20%</b>; na hemodiálise, ferro <b>EV</b> (sacarato) é a regra"),
        ("Agente estimulador da eritropoese (AEE)", "alfaepoetina SC/EV <b>50–100 UI/kg 1–3×/semana</b> se Hb persistir &lt; 10 g/dL com estoques de ferro adequados"),
        ("Alvo", "Hb <b>10–11,5 g/dL</b>; reduzir se ultrapassar o alvo; <b>não visar Hb ≥ 13</b> (mais AVC, HAS, trombose de fístula, eventos CV — estudos CHOIR, TREAT, CREATE)"),
    ])
    + quadro("Frases que caem", [
        "“Antes de iniciar eritropoetina deveria ter sido assegurada a normalidade dos estoques de ferro” (SES-RJ 2020; questão de 2024 com TFG 30: conduta equivocada por prescrever EPO antes de repor ferro).",
        "Anemia <b>desproporcional</b> ao grau de DRC (Hb 5 com creatinina 3,2) → pensar em causa concomitante, como <b>mieloma múltiplo</b> (confusão = hipercalcemia).",
        "“Antagonismo periférico à ação da EPO” <b>não</b> é mecanismo clássico da anemia da DRC.",
        "Efeitos adversos do AEE: <b>hipertensão</b>, trombose (inclusive da fístula), aplasia pura eritroide por anticorpo anti-EPO (rara), crises convulsivas.",
        "DRC <b>não</b> é causa de anemia macrocítica não megaloblástica.",
    ])
    + "<p><b>Endocrinopatias</b>: anemia é a alteração hematológica mais comum em hipotireoidismo, hipertireoidismo, insuficiência adrenal e hipopituitarismo — em geral <b>normocítica, normocrômica e hipoproliferativa</b>. "
      "O ponto de prova: <b>hipotireoidismo → anemia macrocítica</b> (questão de 2024: “hipotireoidismo e hipopituitarismo” associam-se a anemia; SUS-SP 2025: hipotireoidismo é a etiologia que <b>não</b> cursa com microcitose). "
      "Anemia perniciosa se associa a outras autoimunes, inclusive <b>tireoidite de Hashimoto</b> (SES-PE 2024: “a anemia perniciosa é incomum em associação com hipotireoidismo” é INCORRETA).</p>"
    + "<p><b>Hepatopatia crônica</b>: causa mais comum de <b>macrocitose não megaloblástica</b>; multifatorial — sangramento de varizes, hemólise por alteração lipídica da membrana (acantócitos, <i>spur cells</i>), deficiência de folato pelo etilismo, efeito tóxico direto do álcool na medula, hiperesplenismo.</p>"))

# 7. Mieloftise
SECOES.append(("Mieloftise",
    "<p><b>Infiltração da medula óssea</b> por células estranhas a ela — <b>metástases</b> (mama, próstata, pulmão), leucemias/linfomas, mieloma, granulomas (tuberculose, fungos), doenças de depósito (Gaucher), <b>mielofibrose</b> — que deslocam a hematopoese normal: <b>pancitopenia</b> e anemia hipoproliferativa.</p>"
    + quadro("Como reconhecer", [
        "<b>Leucoeritroblastose</b>: eritroblastos (hemácias nucleadas) + formas mieloides jovens (mielócitos, metamielócitos) no sangue periférico — o principal indicativo.",
        "<b>Dacriócitos</b> (hemácias em lágrima).",
        "Mielograma frequentemente “seco” (<i>dry tap</i>) → <b>biópsia de medula óssea</b> é o exame diagnóstico.",
        "Tratamento: o da doença de base.",
    ])
    + "<p>Questão de 2024: pancitopenia com eritroblastos e granulócitos imaturos na lâmina → <b>mieloftise</b>. Anemias hipoproliferativas incluem “a ocupação medular por células anormais, as leucemias e as metástases”.</p>"))

# 8. Metemoglobinemia
SECOES.append(("Metemoglobinemia",
    "<p>Metemoglobina (MetHb) é a Hb com o ferro <b>oxidado à forma férrica (Fe³⁺)</b>, incapaz de transportar O₂, que ainda <b>desvia a curva de dissociação para a esquerda</b> (a Hb restante segura o O₂). Normalmente &lt; 1–2%, mantida pela <b>NADH-citocromo b5 redutase</b>. "
    "Causas: <b>adquirida (a mais comum) por fármacos oxidantes</b> — <b>dapsona</b> (hanseníase, pneumocistose), <b>anestésicos locais</b> (benzocaína, prilocaína, lidocaína), <b>nitratos/nitritos</b> (nitroglicerina, água de poço contaminada em lactentes), nitroprussiato, sulfonamidas, primaquina, rasburicase, anilinas; "
    "congênita: deficiência de citocromo b5 redutase ou <b>HbM</b>. Lactentes &lt; 6 meses são mais suscetíveis (menor atividade da redutase, HbF).</p>"
    + tabela(["MetHb (%)", "Clínica"], [
        ["&lt; 10–15%", "Assintomático; acima de ~1,5 g/dL de MetHb já há <b>cianose</b>"],
        ["15–30%", "<b>Cianose “cinza-azulada”</b>, sangue “cor de chocolate” que não fica vermelho ao ar"],
        ["30–50%", "Cefaleia, tontura, dispneia, taquicardia, fadiga"],
        ["50–70%", "Arritmia, convulsão, coma, acidose láctica"],
        ["&gt; 70%", "Potencialmente fatal"],
    ])
    + quadro("Pistas e tratamento", [
        "<b>Cianose central que não melhora com O₂, com PaO₂ normal na gasometria</b> — e “gap” de saturação: oxímetro de pulso ~85% fixo × SaO₂ calculada normal.",
        "Diagnóstico: <b>co-oximetria</b> (padrão-ouro).",
        "Tratamento: suspender o agente + O₂; <b>azul de metileno 1–2 mg/kg EV em 5 min</b> se sintomático ou MetHb &gt; 20–30% (repetir em 1 h se preciso). Melhora em 30–60 min.",
        "<b>Contraindicado na deficiência de G6PD</b> (não gera NADPH → ineficaz e causa hemólise) e com serotoninérgicos (síndrome serotoninérgica) → alternativas: <b>vitamina C</b> em altas doses, exsanguineotransfusão, oxigênio hiperbárico.",
        "Cianose <b>periférica</b> (baixo débito, frio, Raynaud) é diferente: MetHb causa cianose <b>central</b> (questão de 2024: meta-hemoglobinemia não é causa de cianose periférica).",
    ])
    + "<p>Questão de 2024: paciente em tratamento de hanseníase com <b>dapsona</b>, cianose labial e de extremidades, ausculta normal e gasometria normal → <b>meta-hemoglobinemia</b>. A afirmação “cianose só aparece se MetHb &gt; 40%” é INCORRETA (aparece a partir de ~10–15%).</p>"))

# 9. Porfiria
SECOES.append(("Porfiria aguda intermitente",
    "<p>As porfirias são defeitos enzimáticos da síntese do <b>heme</b>, com acúmulo de precursores. A única cobrada com frequência é a <b>porfiria aguda intermitente (PAI)</b>: deficiência <b>autossômica dominante</b> da <b>porfobilinogênio-desaminase (PBG-D, ou hidroximetilbilano-sintase)</b>, 3ª enzima da via, com acúmulo de <b>ALA e PBG</b>. "
    "É uma porfiria <b>hepática</b>: <b>não há anemia nem fotossensibilidade</b>. A maioria dos portadores nunca tem crise; elas são desencadeadas por fatores que induzem a ALA-sintase hepática.</p>"
    + tabela(["Elemento", "O que saber"], [
        ["Perfil", "<b>Mulher jovem (20–40 anos)</b>, crises relacionadas à fase lútea do ciclo menstrual"],
        ["Desencadeantes", "<b>Drogas indutoras do citocromo P450</b> (barbitúricos, fenitoína, carbamazepina, ácido valproico, sulfonamidas, progestágenos), <b>jejum/dieta hipocalórica</b>, álcool, tabagismo, infecção, estresse"],
        ["Sintoma mais comum", "<b>Dor abdominal intensa, difusa, sem peritonite</b>, refratária, muitas vezes com laparotomia “branca” (AMP-PR 2025: “dor abdominal cíclica”)"],
        ["Sinal mais comum", "<b>Taquicardia</b> (hiperatividade autonômica), hipertensão, constipação, vômitos"],
        ["Neurológico", "<b>Neuropatia motora</b> proximal ascendente até <b>tetraparesia arreflexa</b> (diferencial com Guillain-Barré), convulsões, insuficiência respiratória"],
        ["Psiquiátrico", "Ansiedade, confusão, alucinações, psicose (“surto psicótico prévio”)"],
        ["Laboratório", "<b>Hiponatremia</b> (SIADH) — também hipomagnesemia; <b>urina escura/avermelhada</b> que escurece à luz (porfobilina), sem hematúria/mioglobinúria"],
        ["Diagnóstico", "<b>PBG urinário elevado</b> (≥ 4–10× o normal) na crise — teste de triagem e confirmação; depois teste genético"],
    ])
    + fluxo("Crise aguda de porfiria", [
        ("Suspender desencadeantes", "rever todas as drogas (listas de drogas seguras), tratar infecção"),
        ("Suporte", "<b>analgesia com opioides</b> (seguros), antieméticos (ondansetrona/prometazina), betabloqueador para taquicardia/HAS, corrigir sódio <b>lentamente</b>; convulsão: gabapentina/levetiracetam (evitar fenitoína, barbitúricos, valproato)"),
        ("Carboidrato", "<b>glicose 10% EV</b> (≈ 300 g/dia) — inibe a ALA-sintase; <b>nunca deixar em jejum</b> (questão de 2024: a INCORRETA era “deixar em jejum até as provas hepáticas melhorarem”)"),
        ("Hemina EV", "3–4 mg/kg/dia por 4 dias — tratamento <b>específico</b> das crises moderadas/graves (feedback negativo na ALA-sintase)"),
        ("Profilaxia de crises recorrentes", "<b>givosiran</b> SC mensal (siRNA contra ALA-sintase 1; ENVISION 2020 — redução de ~74% das crises); análogos de GnRH nas crises catameniais; transplante hepático em casos refratários"),
    ])
    + "<p>Clássicos: USP-SP 2021 (abdome agudo com laparotomia branca + convulsão no pós-operatório + surto psicótico prévio); questão de 2024 (confusa, agitada, tetraparesia, hiponatremia grave, urina escura sem hematúria). "
      "A <b>intoxicação por chumbo</b> é o grande diferencial: também inibe enzimas do heme (ALA-desidratase e ferroquelatase), dá cólica abdominal, neuropatia motora (“mão caída”) — mas <b>tem anemia</b> microcítica com <b>pontilhado basofílico</b> e protoporfirina-zinco alta (UNESP 2019: cólica intensa + anemia hemolítica → chumbo).</p>"))

# 10. Anemia aplásica
SECOES.append(("Anemia aplásica e aplasia pura eritroide",
    "<p><b>Anemia aplásica</b>: <b>pancitopenia</b> com <b>medula hipocelular</b> (celularidade &lt; 25–30%) <b>sem infiltração</b> nem displasia significativa. "
    "Mecanismo predominante: <b>destruição imunomediada (linfócitos T)</b> das células-tronco. Reticulócitos muito baixos, VCM normal ou discretamente alto, <b>sem esplenomegalia</b> (esplenomegalia sugere outro diagnóstico). "
    "Pode coexistir com clone de <b>HPN</b> (USP-SP 2025: celularidade 20%, sem blastos, clone HPN 2% → anemia aplástica).</p>"
    + tabela(["Causas adquiridas", "Causas congênitas (síndromes de falência medular)"], [
        ["<b>Idiopática</b> (maioria, autoimune)", "<b>Anemia de Fanconi</b> (a mais comum): baixa estatura, anomalias de polegar/rádio, manchas café com leite, ↑ fragilidade cromossômica (teste do diepoxibutano), risco de LMA e carcinoma"],
        ["Fármacos: <b>cloranfenicol</b>, carbamazepina, fenitoína, sulfas, sais de ouro, AINE, metimazol (UFCSPA 2024: furosemida, carbamazepina e enalapril)", "<b>Disqueratose congênita</b>: tríade <b>distrofia ungueal + leucoplasia oral + hiperpigmentação reticulada</b> (telomeropatia) — UNIFESP 2026"],
        ["Tóxicos: <b>benzeno</b>, pesticidas; radiação; quimioterapia (dose-dependente)", "<b>Shwachman-Diamond</b>: insuficiência pancreática exócrina + neutropenia"],
        ["Vírus: <b>hepatite soronegativa</b> (pós-hepatite), EBV, HIV", "<b>Diamond-Blackfan</b>: aplasia pura eritroide congênita, macrocitose, anomalias de polegar"],
        ["Gestação, HPN, timoma (aplasia eritroide)", ""],
    ])
    + tabela(["Gravidade (critérios de Camitta)", "Definição"], [
        ["Grave", "Celularidade &lt; 25% (ou 25–50% com &lt; 30% de células hematopoéticas) + ≥ 2 de: <b>neutrófilos &lt; 500</b>, <b>plaquetas &lt; 20 mil</b>, <b>reticulócitos &lt; 20 mil</b> (ou &lt; 60 mil por contagem automática)"],
        ["Muito grave", "Os critérios de grave + <b>neutrófilos &lt; 200</b>"],
        ["Não grave", "Não preenche os critérios acima"],
    ])
    + fluxo("Tratamento da anemia aplásica grave", [
        ("Suporte", "transfusão de hemácias e plaquetas (filtradas e irradiadas; evitar doadores familiares se há chance de transplante), antibiótico precoce na neutropenia febril, quelação de ferro"),
        {"ramos": [
            ("Jovem (&lt; 40 anos na regra clássica) com <b>irmão HLA-idêntico</b>", "<b>Transplante alogênico de medula óssea</b> — 1ª linha (IAMSPE-SP 2020)"),
            ("Sem doador aparentado ou mais velho", "<b>Imunossupressão: globulina antitimócito (ATG) de cavalo + ciclosporina + eltrombopag</b> (RACE 2022: mais respostas completas); transplante não aparentado se falhar"),
        ]},
    ])
    + "<p><b>Aplasia pura eritroide</b>: só a série vermelha (anemia normocítica com reticulócitos ~0 e medula sem precursores eritroides). Causas: <b>parvovírus B19</b> (infecta o pró-eritroblasto via antígeno P — crise aplásica em quem tem hemólise crônica, como falciforme e esferocitose; aplasia crônica em imunossuprimidos, tratada com <b>imunoglobulina EV</b>), <b>timoma</b>, LLC de grandes linfócitos granulares, anticorpo anti-EPO, Diamond-Blackfan.</p>"
    + quadro("Frases que caem", [
        "15 anos, pancitopenia, celularidade &lt; 30% (ENARE 2026) — tratamento inicial: ver divergência abaixo (o gabarito registrado foi “imunoglobulina poliespecífica”).",
        "Mielodisplasia: reticulócitos <b>baixos</b> (a afirmação de que são aumentados é a INCORRETA — CERMAM 2020).",
        "Aplasia com clone HPN 5% sem candidato a TMO: <b>ATG + ciclosporina</b> (USP-SP 2021).",
    ])))

# 11. Dicas
SECOES.append(("Dicas de prova",
    _old["Dicas de prova"]
    + quadro("Top 12 de prova (SES-PE, ENARE/ENAMED)", [
        "Exames iniciais: <b>hemograma + reticulócitos</b>.",
        "Cortes da OMS: H &lt; 13, M &lt; 12, gestante &lt; 11, 5–11 anos &lt; 11,5 (ENARE 2024).",
        "<b>Hepcidina</b> diminui a absorção intestinal de ferro <b>e diminui</b> (não aumenta) a liberação de ferro dos macrófagos — SES-PE 2021.",
        "Anemia de doença crônica: ferritina <b>normal/alta</b> (“ferritina baixa” é o EXCETO — SES-PE 2017).",
        "Principal causa de ferropriva no adulto: <b>perda sanguínea crônica</b>, não dieta (SES-PE 2010; atenção básica: vegetarianismo não é a principal).",
        "Lesão mais encontrada na investigação digestiva da ferropenia: ENARE 2022 deu <b>câncer colônico</b>.",
        "Na pediatria, causas de VCM baixo: ferropriva, talassemia, doença crônica, chumbo — <b>não</b> as hemolíticas (SES-PE 2022).",
        "G6PD: <b>corpúsculos de Heinz</b> e “bite cells” (SES-PE 2024).",
        "EPO: rim e, em 2º lugar, <b>fígado</b> (SES-PE 2022).",
        "DRC: deficiência de EPO + menor sobrevida das hemácias; repor ferro <b>antes</b> do AEE.",
        "Metemoglobinemia: dapsona, cianose sem resposta ao O₂ com PaO₂ normal, <b>azul de metileno</b>.",
        "Porfiria: dor abdominal + neuropatia + hiponatremia + urina escura; glicose e hemina; jejum piora.",
    ])))

# 12. Divergências
SECOES.append(("Divergências: provas × evidência atual",
    divergencias([
        ["Corte de Hb na criança pequena", "Provas e Estratégia: anemia se Hb &lt; 11 g/dL de 6 meses a 5 anos", "OMS 2024 separou: <b>&lt; 10,5 de 6–23 meses</b> e &lt; 11 de 24–59 meses; gestante no 2º trimestre &lt; 10,5", "Use <b>&lt; 11</b> quando a questão falar de “6 meses a 5 anos” sem detalhar; cite 10,5 apenas se a banca trouxer a OMS 2024"],
        ["Hipotireoidismo e VCM", "Estratégia/provas: anemia do hipotireoidismo é tipicamente <b>macrocítica</b>", "Na prática é mais vezes <b>normocítica</b>; a macrocitose ocorre em parte dos casos e pode refletir anemia perniciosa associada", "Em “classifique” ou “qual não causa microcitose”, marque <b>macrocítica</b>"],
        ["Alvo de Hb na DRC", "Estratégia: reduzir AEE se Hb &gt; 12 e suspender se &gt; 13 g/dL", "KDIGO: iniciar se Hb &lt; 10 e <b>não ultrapassar 11,5 g/dL</b> (CHOIR/TREAT: mais AVC e eventos com alvos altos); inibidores da HIF-PH (roxadustate, daprodustate) são alternativa oral", "Alvo <b>10–11,5</b>; Hb ≥ 13 é sempre errado; ferro antes do AEE"],
        ["Ferro antes do AEE", "Estratégia: ferritina &gt; 100–200 e saturação ≥ 20%", "KDIGO/PCDT: repor ferro se ferritina ≤ 500 e saturação ≤ 30% quando se deseja elevar a Hb ou poupar AEE", "Responda <b>ferritina &gt; 100 (HD &gt; 200) e saturação &gt; 20%</b> como pré-requisito"],
        ["Tratamento da aplasia grave", "ENARE 2026 registrou “imunoglobulina poliespecífica”; provas clássicas: TMO se &lt; 40 anos com irmão HLA-idêntico, senão ATG + ciclosporina", "RACE 2022 e BSH 2024: <b>ATG de cavalo + ciclosporina + eltrombopag</b> sem doador; TMO aparentado é 1ª linha no jovem (alguns centros estendem até 40–50 anos)", "Com irmão compatível e jovem → <b>TMO</b>; sem doador → <b>ATG + ciclosporina (+ eltrombopag)</b>; recorra se o gabarito oficial divergir"],
        ["Porfiria: tratamento específico", "Estratégia: carboidrato + hemina", "Hemina continua 1ª linha na crise; <b>givosiran</b> (ENVISION) para prevenção de crises recorrentes; hemina tem acesso restrito no Brasil", "Crise: <b>glicose + hemina</b>; prevenção: evitar desencadeantes (givosiran se a questão for de atualização)"],
        ["Azul de metileno: limiar", "Estratégia: sintomático ou MetHb &gt; 25–30%", "Recomendações internacionais (2021): sintomático ou <b>&gt; 20%</b>; contraindicado na deficiência de G6PD", "Tratar sintomático ou MetHb ≥ 20–30%; lembrar da G6PD"],
    ])))

MNEMONICOS = [
    {"palavra": "MENTZER 13", "explicacao": "VCM ÷ hemácias (milhões): abaixo de 13 = talassemia (muitas hemácias pequenas); acima de 13 = ferropriva."},
    {"palavra": "DAPSONA AZUL", "explicacao": "Dapsona (e anestésicos locais, nitratos) → metemoglobinemia → cianose com PaO₂ normal → azul de metileno (exceto na G6PD)."},
    {"palavra": "PAI: 5 P", "explicacao": "Porfiria aguda intermitente: Pain (dor abdominal), Polineuropatia, Psicose, Pee escura (urina) e Precipitada por drogas/jejum."},
]

COMO_CAI = ("SES-PE e ENARE/ENAMED cobram o raciocínio inicial: exames de entrada (hemograma + reticulócitos), cortes de Hb da OMS (ENARE 2024; 5–11 anos &lt; 11,5), "
            "classificação morfológica (micro, normo e macrocíticas — hipotireoidismo e álcool na macro; hemolíticas não dão VCM baixo, SES-PE 2022) e funcional (reticulócitos), "
            "hepcidina (SES-PE 2021), perfil de ferro da anemia de doença crônica (SES-PE 2017), achados de hematoscopia (Heinz na G6PD — SES-PE 2024; Howell-Jolly na asplenia; rouleaux no mieloma; esquizócitos na microangiopatia). "
            "Do resumo de condições não hematológicas caem a fisiopatologia da anemia da DRC (deficiência de EPO, repor ferro antes do AEE), o hipotireoidismo macrocítico, "
            "mieloftise (eritroblastos e formas jovens), metemoglobinemia por dapsona com azul de metileno e o quadro da porfiria aguda intermitente. Aplasia: Camitta, TMO × ATG + ciclosporina, parvovírus B19.")
PRIORIDADE = "alta"
