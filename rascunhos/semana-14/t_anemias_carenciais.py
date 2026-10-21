import json
from h import tabela, quadro, fluxo, divergencias, img, img_q, PROPRIA

ID = "anemias-carenciais"
_t = next(t for t in json.load(open(__file__.rsplit("/", 1)[0] + "/old14.json", encoding="utf-8")) if t["id"] == ID)
_old = {s["titulo"]: s["conteudo"] for s in _t["secoes"]}
_img_diag = next(s for s in _t["secoes"] if s["titulo"] == "Diagnóstico")["imagens"]

RESUMO = ("Metabolismo do ferro e hepcidina, anemia ferropriva (estágios, perfil de ferro, investigação digestiva, dose e resposta ao ferro oral, ferro EV), "
          "anemia de doença crônica, talassemias e sideroblástica no diferencial, e anemia megaloblástica por B12 e folato (causas, anemia perniciosa, quadro neurológico e reposição).")
FONTE = (_t["fonte"] + "; "
         "WHO — Guideline on use of ferritin concentrations to assess iron status (2020); Ko CW, et al. AGA Clinical Practice Guidelines on the Gastrointestinal Evaluation of Iron Deficiency Anemia. Gastroenterology 2020;159:1085-94; "
         "Snook J, et al. British Society of Gastroenterology guidelines for the management of iron deficiency anaemia in adults. Gut 2021;70:2030-51; "
         "Stoffel NU, et al. Iron absorption from oral iron supplements given on consecutive versus alternate days. Lancet Haematol 2017;4:e524-33; "
         "McDonagh TA, et al. ESC Heart Failure Guidelines 2023 focused update (ferro EV na IC); Sociedade Brasileira de Pediatria — Consenso sobre anemia ferropriva (2018/2021); "
         "Ministério da Saúde — Programa Nacional de Suplementação de Ferro (2022); Devalia V, et al. BSH guidelines for cobalamin and folate disorders (2014); "
         "Estratégia MED — Resumos Estratégicos 2026: Anemias Microcíticas; Anemias Macrocíticas")

SECOES = []

SECOES.append(("Fisiopatologia",
    _old["Fisiopatologia"]
    + tabela(["Etapa do ferro", "O que saber"], [
        ["Absorção", "<b>Duodeno e jejuno proximal</b>; ferro <b>heme</b> (carnes) é bem absorvido; ferro <b>não heme</b> (vegetais) precisa ser reduzido a Fe²⁺ (DMT1) — baixa biodisponibilidade"],
        ["Facilitam", "<b>Vitamina C</b>, acidez gástrica, carnes (fator carne)"],
        ["Inibem", "<b>Fitatos</b> (cereais, leguminosas), <b>cálcio</b> (leite e derivados), <b>polifenóis/taninos</b> (chá, café, chimarrão), antiácidos/IBP, gastrectomia, celíaca, H. pylori — a <b>carne bovina não inibe</b> (SES-PE 2011)"],
        ["Exportação", "<b>Ferroportina</b> (enterócito e macrófago) → transferrina no plasma"],
        ["Regulação", "<b>Hepcidina</b> (hepática) degrada a ferroportina: <b>↓ absorção intestinal e ↓ liberação pelos macrófagos</b>. Sobe na inflamação (IL-6) e na sobrecarga; cai na ferropenia, hipóxia e eritropoese ativa"],
        ["Estoque", "Ferritina e hemossiderina (fígado, baço, medula)"],
    ])
    + "<p><b>Causas de ferropenia por faixa etária</b>: lactentes e pré-escolares — dieta pobre em ferro, <b>leite de vaca</b> antes de 1 ano (pobre em ferro, inibe absorção e causa micro-hemorragia intestinal), prematuridade, clampeamento precoce do cordão; "
      "adolescentes — estirão, menarca; mulheres em idade fértil — <b>perda menstrual</b> e gestação; homens e mulheres pós-menopausa — <b>perda digestiva crônica</b> (neoplasia de cólon, úlcera, angiodisplasia, AINE/AAS), além de celíaca, gastrectomia/bariátrica, <i>H. pylori</i>, gastrite atrófica, ancilostomíase, doação de sangue frequente e hemoglobinúria (HPN).</p>"
    + "<p><b>Megaloblástica</b>: B12 (cobalamina) e folato são cofatores da síntese de timidina (DNA). Sem eles, o núcleo amadurece mais devagar que o citoplasma (<b>assincronia núcleo-citoplasma</b>) e os precursores morrem na medula (<b>eritropoese ineficaz</b> → LDH e bilirrubina indireta altas, pancitopenia, reticulócitos baixos). "
      "B12 participa também da conversão de <b>metilmalonil-CoA em succinil-CoA</b> — por isso só a B12 eleva o <b>ácido metilmalônico</b> e só ela dá <b>lesão neurológica</b>.</p>"
    + tabela(["", "Folato", "Vitamina B12"], [
        ["Fontes", "Folhas verdes, frutas, leguminosas, fígado (destruído pelo cozimento)", "<b>Só alimentos de origem animal</b> (veganos precisam suplementar)"],
        ["Absorção", "<b>Duodeno e jejuno</b>", "Liga-se ao <b>fator intrínseco</b> (células parietais) → absorvida no <b>íleo terminal</b>"],
        ["Estoques", "Duram <b>3–6 meses</b>", "Duram <b>3–5 anos</b> (deficiência demora a aparecer)"],
        ["Homocisteína", "↑", "↑"],
        ["Ácido metilmalônico", "Normal", "<b>↑</b>"],
        ["Neurológico", "Não", "<b>Sim</b>"],
    ])))

SECOES.append(("Quadro clínico",
    _old["Quadro clínico"]
    + quadro("Específicos da ferropenia", [
        "<b>Pica</b> — sobretudo <b>pagofagia</b> (vontade compulsiva de comer gelo), geofagia.",
        "<b>Síndrome das pernas inquietas</b>.",
        "<b>Disfagia</b> por membranas esofágicas (<b>Plummer-Vinson</b>: disfagia + anemia ferropriva + glossite; risco de carcinoma escamoso).",
        "Queda de cabelo, unhas frágeis, alteração cognitiva e de desenvolvimento em lactentes (déficit nem sempre reversível).",
        "Beturia (urina avermelhada após beterraba) é mais frequente na ferropenia (SES-PE 2023).",
    ])
    + quadro("Específicos da deficiência de B12", [
        "<b>Degeneração combinada subaguda da medula</b>: cordões <b>posteriores</b> (perda da sensibilidade vibratória — <b>palestesia</b> — e da posição segmentar — <b>batiestesia/abatiestesia</b>, ataxia sensitiva, Romberg +) e <b>laterais</b> (fraqueza, espasticidade, Babinski).",
        "Neuropatia periférica (parestesias em bota e luva, hiporreflexia), <b>demência reversível</b>, depressão, psicose (“loucura megaloblástica”).",
        "Os sinais neurológicos podem existir <b>sem anemia</b> e não regridem por completo se o tratamento atrasar.",
        "Icterícia leve “cor de limão” (palidez + BI alta), glossite, infertilidade, hiperpigmentação cutânea.",
        "Folato: mesma anemia, <b>sem</b> neurológico; na gestação → defeitos do tubo neural.",
    ])))

SECOES.append(("Exame físico",
    _old["Exame físico"]
    + "<p>Na prova da SES-PE 2023, a figura de <b>coiloníquia</b> (unha em colher) pedia o sinal <b>não</b> relacionado à ferropenia: <b>abatiestesia</b> (que é da B12); pagofagia, disfagia, pernas inquietas e beturia são da ferropenia. "
      "A <b>glossite atrófica de Hunter</b> (língua lisa, vermelha e dolorosa) aparece nas duas, mas é clássica da <b>anemia perniciosa</b> (SES-PE 2021). Esplenomegalia discreta pode ocorrer na megaloblástica; esplenomegalia importante sugere talassemia ou hemólise.</p>",
    [img_q("imagens/questoes/sespe/2023-q008-1.webp",
           "Coiloníquia (unha côncava, “em colher”) — ferropenia de longa duração. Na SES-PE 2023, o sinal NÃO relacionado era a abatiestesia (deficiência de B12)."),
     img_q("imagens/questoes/usp-rp/2022/2022-96dba2d4-q066-1.webp",
           "Glossite atrófica (língua lisa, despapilada) e esfregaço com neutrófilo hipersegmentado entre macro-ovalócitos: deficiência de vitamina B12.")]))

SECOES.append(("Diagnóstico",
    _old["Diagnóstico"]
    + "<h4>Perfil de ferro no diagnóstico diferencial</h4>"
    + tabela(["Exame", "Ferropriva", "Doença crônica", "Traço talassêmico", "Sideroblástica"], [
        ["Ferro sérico", "↓", "↓", "Normal", "<b>↑</b>"],
        ["<b>Ferritina</b>", "<b>↓</b> (mais precoce, mais sensível e específica)", "<b>Normal ou ↑</b>", "Normal", "↑"],
        ["CTLF / transferrina", "<b>↑</b>", "<b>↓</b>", "Normal", "Normal/↓"],
        ["Saturação de transferrina", "↓ (&lt; 16–20%)", "↓ ou normal", "Normal", "↑"],
        ["Receptor solúvel da transferrina", "<b>↑</b>", "Normal", "↑ discreto", "Normal"],
        ["Protoporfirina livre eritrocitária", "↑", "↑", "Normal", "Variável (↑ no chumbo — protoporfirina-zinco)"],
        ["RDW", "<b>↑</b>", "Normal", "Normal", "↑ (dimorfismo)"],
        ["Ferro medular (Perls)", "<b>Ausente</b> — padrão-ouro", "Presente/↑ nos macrófagos", "Presente", "<b>Sideroblastos em anel</b>"],
    ])
    + quadro("Pegadinhas do perfil", [
        "A alteração laboratorial <b>mais precoce</b> da ferropenia é a <b>queda da ferritina</b> (SES-PE 2017).",
        "Na ferropenia a CTLF está <b>aumentada</b> — “CTLF diminuída” é o EXCETO (SES-PE 2022).",
        "“RDW abaixo de 14% com VCM baixo sugere ferropriva” é falso — RDW <b>alto</b> é da ferropriva; RDW normal sugere traço talassêmico (SES-PE 2013).",
        "<b>Plaquetose</b> reativa é comum na ferropenia (plaquetas 520 mil na SES-PE 2017 e 2026).",
        "Ferritina é proteína de fase aguda: com PCR alta, ferritina até ~100 ng/mL ainda pode significar ferropenia (com saturação &lt; 20%).",
        "<b>Hemocromatose</b> (ENARE 2026): o marcador mais sensível é a <b>saturação de transferrina</b> (&gt; 45%); a ferritina reflete a carga.",
    ])
    + "<h4>Investigação da ferropenia no adulto</h4>"
    + fluxo("Ferropenia confirmada no adulto", [
        ("Homem ou mulher pós-menopausa", "<b>EDA + colonoscopia</b> (bidirecional) mesmo sem sintomas (SES-PE 2025, SES-PE 2026) + sorologia para celíaca (antitransglutaminase IgA) + urina tipo 1"),
        ("Mulher pré-menopausa", "avaliar perda menstrual e gestação; endoscopia se ≥ 50 anos, sintomas digestivos, sangue oculto ou ausência de resposta"),
        ("EDA e colonoscopia normais", "biópsias duodenais (celíaca) e gástricas (H. pylori, gastrite atrófica); cápsula endoscópica se anemia persistente/recorrente (sangramento de delgado)"),
        ("Pesquisa de sangue oculto nas fezes", "<b>não</b> substitui a endoscopia (AGA/BSG); ENARE 2026 aceitou como “exame para tentar identificar a etiologia” após parasitológicos negativos"),
    ])
    + "<h4>Investigação da megaloblástica</h4>"
    + fluxo("Macrocitose com reticulócitos baixos", [
        ("Dosar B12 e folato", "B12 &lt; 200 pg/mL baixa; 200–300 limítrofe"),
        ("Limítrofe ou discordante", "<b>ácido metilmalônico</b> (↑ só na B12) e <b>homocisteína</b> (↑ nas duas). SES-PE 2024: MMA ↑ com B12 normal → a banca respondeu folato (atenção: MMA ↑ isolado aponta B12 — ver divergências)"),
        ("Deficiência de B12 confirmada", "<b>anticorpo antifator intrínseco</b> (muito específico) e <b>anticélula parietal</b> (sensível, pouco específico) + gastrina ↑ + <b>EDA</b> com biópsia (gastrite atrófica de corpo; rastreio de adenocarcinoma e tumor carcinoide) — ENARE 2026, SES-PE 2022 e 2023"),
        ("Sem anemia perniciosa", "dieta vegana, bariátrica/gastrectomia, ressecção ileal/Crohn, metformina, IBP, supercrescimento bacteriano, <i>Diphyllobothrium latum</i>, insuficiência pancreática, óxido nitroso"),
    ]),
    _img_diag + [img("imagens/resumos/hemato/ferro-estagios-resposta.png",
                     "À esquerda, os três estágios da deficiência de ferro: a ferritina cai primeiro e a hemoglobina por último. À direita, a resposta esperada ao ferro oral: pico de reticulócitos em 5–10 dias, Hb sobe ≥ 1–2 g/dL em 3–4 semanas e normaliza em cerca de 2 meses.",
                     PROPRIA)]))

SECOES.append(("Anemia de doença crônica (anemia da inflamação)",
    "<p>Segunda anemia mais comum, típica de <b>infecções crônicas, doenças autoimunes (artrite reumatoide, LES), neoplasias, DRC e ICC</b>. "
    "Mecanismo: <b>IL-6 → ↑ hepcidina → degradação da ferroportina</b> → ferro “preso” nos macrófagos e menos absorção intestinal (ferro existe, mas não chega à medula); "
    "somam-se ↓ resposta à EPO (TNF, IFN-γ, IL-1) e ↓ sobrevida das hemácias.</p>"
    + tabela(["Característica", "Anemia de doença crônica"], [
        ["Morfologia", "<b>Normocítica normocrômica</b> (70%); microcítica em ~25–30% (doença longa)"],
        ["Intensidade", "Leve a moderada (Hb raramente &lt; 8)"],
        ["Ferro sérico", "↓"],
        ["CTLF", "<b>↓</b> (transferrina é reagente de fase aguda negativa)"],
        ["Ferritina", "<b>Normal ou ↑</b> (&gt; 100 ng/mL)"],
        ["Saturação de transferrina", "↓ ou normal-baixa"],
        ["RDW / reticulócitos", "Normal / baixos"],
        ["PCR/VHS", "Elevados"],
    ])
    + quadro("Como cai", [
        "SES-PE 2023: “microcítica com ferro e saturação baixos e ferritina elevada” → <b>artrite reumatoide refratária</b>.",
        "SES-PE 2025: ferritina alta, TIBC baixa, PCR 30 → doença crônica; SES-PE 2022: CTLF 123 e ferritina 342 → doença crônica; ENARE 2023: ferro 45, ferritina 170, TIBC 200 → doença crônica.",
        "SES-GO 2020: ferritina 240 + saturação 14% + PCR 50 → mecanismo: <b>hepcidina</b> bloqueando a liberação de ferro.",
        "Tratamento: <b>tratar a doença de base</b>; ferro EV se houver ferropenia associada (ferritina &lt; 100 e saturação &lt; 20%); AEE na DRC e em casos selecionados de câncer; transfusão se sintomática grave.",
    ])))

SECOES.append(("Talassemias e anemia sideroblástica (diagnóstico diferencial)",
    tabela(["Forma", "Genética e laboratório", "Clínica"], [
        ["<b>β-talassemia menor (traço)</b>", "1 gene β alterado; <b>HbA2 &gt; 3,5%</b> (ex.: 3,8% — SES-PE 2023) ± HbF discretamente ↑; microcitose acentuada com Hb quase normal, <b>hemácias normais ou ↑</b>, RDW normal, ferritina normal", "Assintomática; <b>não</b> dar ferro sem ferropenia comprovada"],
        ["<b>β-talassemia intermédia</b>", "Hb 7–10, independente de transfusão na maior parte do tempo", "Esplenomegalia, sobrecarga de ferro por absorção"],
        ["<b>β-talassemia maior (anemia de Cooley)</b>", "Ausência de cadeia β: HbA ausente/↓↓, <b>HbF muito ↑</b>; hemácias em alvo, eritroblastos", "Anemia grave a partir dos <b>6 meses</b> (queda da HbF), hepatoesplenomegalia, <b>fácies de esquilo/fronte olímpica</b>, “cabelo em escova” no RX de crânio; transfusão crônica + quelação de ferro; TMO"],
        ["α-talassemia: portador silencioso", "1 gene α deletado", "Normal"],
        ["α-talassemia: traço", "2 genes", "Microcitose leve; eletroforese do adulto normal (diagnóstico por exclusão/genético)"],
        ["<b>Doença da HbH</b>", "3 genes; <b>HbH (β4)</b>, corpúsculos de inclusão", "Anemia hemolítica moderada, esplenomegalia"],
        ["<b>Hidropsia fetal (Hb Bart's, γ4)</b>", "4 genes", "Incompatível com a vida"],
    ])
    + "<p><b>Anemia sideroblástica</b>: defeito na síntese do heme dentro da mitocôndria do eritroblasto → ferro se acumula em volta do núcleo (<b>sideroblastos em anel</b> na coloração de Perls), ferro sérico e ferritina <b>altos</b>, pode haver <b>corpúsculos de Pappenheimer</b> e pontilhado basofílico. "
      "Causas: <b>congênita ligada ao X</b> (ALA-sintase 2 — responde à <b>piridoxina/B6</b>), <b>álcool</b>, <b>isoniazida</b> (antagonista da B6), linezolida, cloranfenicol, <b>chumbo</b>, <b>deficiência de cobre</b> (excesso de zinco, bariátrica), mielodisplasia (SMD com sideroblastos em anel). "
      "<b>Saturnismo</b>: anemia microcítica com pontilhado basofílico, cólica abdominal, neuropatia motora (punho caído), linha gengival de Burton, protoporfirina-zinco alta; tratamento: afastar a exposição e quelar (succímero/DMSA, EDTA cálcico) — SCM-SP 2023, ABC-SP 2023.</p>"
    + quadro("Pistas de prova", [
        "Ferropriva que <b>não responde</b> ao sulfato ferroso → pensar em talassemia (eletroforese), má adesão, má absorção (celíaca, H. pylori, IBP), perda contínua ou diagnóstico errado (doença crônica, sideroblástica).",
        "ENARE 2023: microcitose com ferritina 58, saturação 34% e reticulócitos 4,8% → anemia microcítica <b>de causa a esclarecer → eletroforese de hemoglobina</b>.",
        "SES-PE 2019: lactente com queilite, hepatoesplenomegalia e fronte proeminente → diferencial entre ferropenia, talassemias e sideroblástica.",
    ]),
    [img_q("imagens/questoes/usp-rp/2011/2011-c8b418c7-q090-1.webp",
           "Criança de 2 anos com diarreia crônica e desnutrição (provável doença celíaca): Hb 7,2, VCM 68, RDW 12, ferro baixo, CTLF baixa (80) e ferritina alta (417), eletroforese normal. A USP-RP 2011 deu anemia ferropriva (má absorção), mas o perfil isolado é de doença crônica/inflamação — ver Divergências.")]))

SECOES.append(("Megaloblástica: causas e anemia perniciosa",
    tabela(["Deficiência de folato", "Deficiência de B12"], [
        ["Dieta pobre (idosos, etilistas, “chá e torradas”), <b>leite de cabra</b> em lactentes", "<b>Anemia perniciosa</b> (causa mais comum; gastrite atrófica autoimune)"],
        ["<b>Etilismo</b> (↓ ingestão, absorção e metabolismo)", "<b>Gastrectomia e bypass gástrico</b> (SES-PE 2022), IBP, anti-H2 crônicos"],
        ["↑ necessidade: <b>gestação</b>, lactação, hemólise crônica, psoríase esfoliativa, <b>hemodiálise</b>", "<b>Ressecção ou doença do íleo terminal</b> (Crohn, tuberculose)"],
        ["Má absorção: celíaca, espru tropical", "<b>Metformina</b>, colchicina, óxido nitroso (inativa a B12)"],
        ["Fármacos antifolato: <b>metotrexato</b>, trimetoprima, pirimetamina; <b>anticonvulsivantes</b> (fenitoína, fenobarbital, primidona)", "Supercrescimento bacteriano (alça cega), <i>Diphyllobothrium latum</i>, insuficiência pancreática (não cliva a proteína R), Zollinger-Ellison"],
        ["", "<b>Dieta vegana</b> estrita (e lactentes amamentados por mães veganas)"],
    ])
    + "<p><b>Anemia perniciosa</b>: gastrite crônica atrófica autoimune do <b>corpo e fundo</b> (tipo A) com destruição das células parietais → <b>sem fator intrínseco e acloridria</b> → hipergastrinemia. Mais em mulheres &gt; 60 anos, associada a outras autoimunes (tireoidite de Hashimoto, vitiligo, DM1, Addison). "
      "Risco de <b>adenocarcinoma gástrico e tumor carcinoide</b> → EDA ao diagnóstico. Laboratório: macrocitose (pode ser muito alta, VCM &gt; 110–120), <b>pancitopenia</b>, reticulócitos baixos, <b>LDH muito alta</b> e BI alta (eritropoese ineficaz), ferritina pode estar alta. "
      "<b>Trombocitose não faz parte</b> do quadro (SES-PE 2018). Metotrexato não causa deficiência de B12, e sim de folato (SES-PE 2016/2017).</p>"
    + quadro("Casos de prova", [
        "SES-PE 2020: atrofia de papilas + hipoestesia com perda da posição segmentar + macrocitose e plurissegmentados → causa: <b>gastrite atrófica</b>.",
        "SES-PE 2023: idosa em sonda enteral, VCM 110, hipersegmentação, B12 182, ferritina 512 → <b>anemia perniciosa</b> (gabarito).",
        "SES-PE 2024: B12 &lt; 100 e anticorpo anticélula parietal positivo → anemia perniciosa.",
        "SES-PE 2014: pancitopenia, LDH 1.500, BI ↑, homocisteína e MMA ↑ → <b>deficiência de B12</b>.",
        "ENARE 2026: pancitopenia com macrocitose em etilista com hepatopatia → dosar B12, folato e sorologias (HIV, hepatites, parvovírus, CMV, EBV).",
        "ENARE 2026: leucemia em quimioterapia com metotrexato e folato baixo → <b>resgate com ácido folínico</b> (leucovorina).",
        "Gestante com macrocitose e reticulopenia → <b>anemia megaloblástica</b> (ENARE 2024).",
    ])))

SECOES.append(("Tratamento",
    _old["Tratamento"]
    + "<h4>Ferro oral na prática (adulto)</h4>"
    + tabela(["Item", "Recomendação"], [
        ["Dose", "Clássica: <b>120–200 mg/dia de ferro elementar</b> em 2–3 tomadas (Estratégia); atual: <b>60–120 mg em dose única diária ou em dias alternados</b> (ver divergência)"],
        ["Conversão", "Sulfato ferroso 300 mg (comprimido) ≈ <b>60 mg de ferro elementar</b> (40 mg nos comprimidos de 200 mg do SUS)"],
        ["Como tomar", "<b>Longe das refeições</b> (30–60 min antes), com suco de frutas cítricas/vitamina C; evitar leite, chá, café e antiácidos próximos à dose"],
        ["Efeitos adversos", "Náusea, epigastralgia, constipação, <b>fezes escuras</b> — tomar com alimento ou trocar o sal se intolerância"],
        ["Resposta", "<b>Reticulocitose em 4–7 dias, pico em ~10 dias</b>; Hb sobe <b>≥ 1–2 g/dL em 3–4 semanas</b> (SES-PE 2026); normaliza em ~2 meses"],
        ["Duração", "Até normalizar a Hb e depois <b>mais 3 meses</b> (ou até ferritina &gt; 50 ng/mL) para repor os estoques; Estratégia: tratamento total de 6 meses ou mais"],
        ["Criança", "<b>3–6 mg/kg/dia de ferro elementar</b> (SES-PE 2026: lactente de 11 meses) por 3–4 meses após normalizar a Hb; tratar leite de vaca excessivo"],
        ["Refratariedade", "Má adesão, dose/sal inadequados, má absorção (celíaca, H. pylori, gastrite atrófica, IBP), <b>perda persistente</b>, diagnóstico errado (talassemia, doença crônica, sideroblástica)"],
    ])
    + tabela(["Indicações de ferro EV", "Observações"], [
        ["Intolerância ou falha do ferro oral, má absorção (bariátrica, DII ativa, celíaca)", "Sacarato de hidróxido férrico (SUS), carboximaltose, derisomaltose"],
        ["Necessidade de correção rápida: <b>pré-operatório</b> com cirurgia em &lt; 6 semanas, gestação no 2º/3º trimestre com anemia moderada/grave", "SES-PE 2023: ferro EV e oral <b>não</b> têm eficácia semelhante em 1–2 meses — o EV é superior"],
        ["DRC (sobretudo diálise), <b>insuficiência cardíaca</b> com ferritina &lt; 100 ou 100–299 com saturação &lt; 20%", "Melhora sintomas e reduz hospitalização (ESC 2023)"],
        ["Perdas contínuas que superam a absorção oral (angiodisplasias, HHT)", "Reação de hipersensibilidade é rara com as formulações atuais; carboximaltose pode causar hipofosfatemia"],
    ])
    + "<p><b>Transfusão</b> fica reservada para instabilidade, isquemia (angina) ou Hb muito baixa sintomática; não corrige a causa nem os estoques. Na megaloblástica, transfusão corrige só parcialmente e há risco de sobrecarga volêmica (IAMSPE-SP 2020).</p>"
    + "<h4>Reposição de vitamina B12 e folato</h4>"
    + fluxo("Deficiência de vitamina B12", [
        ("Clássico (Brasil)", "<b>cianocobalamina 1.000 µg IM</b> diariamente por 1 semana → semanal por 4 semanas → <b>mensal por toda a vida</b> na anemia perniciosa (ENARE 2025: IM diária e depois semanal)"),
        ("Alternativa", "<b>1.000–2.000 µg VO/dia</b> (absorção passiva ~1%), inclusive na perniciosa em pacientes sem quadro neurológico grave; SES-PE 2026: parenteral, seguida de oral ou sublingual"),
        ("Monitorar nos primeiros dias", "<b>hipocalemia</b> (o K⁺ entra nas células em proliferação — pode causar arritmia), trombocitose de rebote, ↑ necessidade de ferro e folato; reticulócitos sobem em 3–5 dias"),
        ("Neurológico", "melhora em semanas a meses; sequelas se tratamento tardio"),
    ])
    + "<p><b>Folato</b>: ácido fólico <b>1–5 mg/dia VO por 4 meses</b> (ou enquanto durar a causa); sempre excluir ou tratar B12 antes. "
      "Profilaxia: <b>0,4 mg/dia</b> pelo menos 1 mês antes da concepção até o fim do 1º trimestre; <b>4–5 mg/dia</b> se filho prévio com defeito do tubo neural, uso de anticonvulsivantes, obesidade ou diabetes. "
      "Hemólise crônica (falciforme) e metotrexato em baixas doses: ácido fólico contínuo; quimioterapia com MTX em alta dose: <b>ácido folínico</b>.</p>"
    + "<h4>Profilaxia de ferro</h4>"
    + tabela(["Grupo", "Esquema"], [
        ["Lactente a termo, peso adequado (SBP)", "<b>1 mg/kg/dia de ferro elementar dos 3 aos 24 meses</b>, com ou sem aleitamento exclusivo (PUC-PR 2021)"],
        ["Lactente (MS — PNSF)", "Dos 6 aos 24 meses"],
        ["Prematuro ou baixo peso (SBP)", "A partir do <b>30º dia</b>: 2 mg/kg/dia (&lt; 1.500 g: 3 mg/kg; &lt; 1.000 g: 4 mg/kg) até 1 ano, depois 1 mg/kg/dia até 2 anos (HCPA-RS 2020: prematuro de 34 semanas sem ferro → anemia)"],
        ["Gestante (MS)", "<b>40 mg de ferro elementar + 400 µg de ácido fólico</b> ao dia durante a gestação (ferro até o 3º mês pós-parto)"],
    ])))

SECOES.append(("Sinais de alerta",
    _old["Sinais de alerta"]
    + "<p><span class=\"red-flag\">Deficiência de B12 com sinais neurológicos</span> (ataxia, perda de propriocepção, demência) é urgência relativa: repor por via parenteral e não usar ácido fólico isolado.</p>"
    + "<p><span class=\"red-flag\">Anemia carencial com bicitopenia/pancitopenia sem resposta ao tratamento</span> → mielograma (mielodisplasia, aplasia, infiltração).</p>"
    + "<p><span class=\"red-flag\">Anemia grave com angina, dispneia em repouso ou instabilidade</span> → transfusão lenta e monitorada (risco de congestão), coleta de exames <b>antes</b> de transfundir.</p>"))

SECOES.append(("Dicas de prova",
    _old["Dicas de prova"]
    + quadro("Top 12 de prova (SES-PE, ENARE/ENAMED)", [
        "Ferropenia no adulto: <b>sulfato ferroso + EDA e colonoscopia</b> (SES-PE 2025 e 2026).",
        "Resposta ao ferro: Hb ↑ ≥ 1 g/dL em 3–4 semanas (SES-PE 2026); pico de reticulócitos em 5–10 dias.",
        "Lactente: <b>3–6 mg/kg/dia</b> de ferro elementar (SES-PE 2026).",
        "Primeira alteração: <b>ferritina ↓</b>; CTLF <b>↑</b>; RDW <b>↑</b>; plaquetose.",
        "Doença crônica: ferritina normal/alta, CTLF baixa (AR refratária — SES-PE 2023).",
        "β-traço: HbA2 &gt; 3,5% (3,8% — SES-PE 2023).",
        "Inibem o ferro: cálcio, fitatos, chá/café; carne <b>não</b> inibe (SES-PE 2011).",
        "Ferro EV supera o oral em correção rápida pré-operatória (SES-PE 2023).",
        "B12: neurológico (abatiestesia, ataxia), MMA ↑, antifator intrínseco, EDA (ENARE 2026).",
        "Perniciosa: <b>sem trombocitose</b> (SES-PE 2018); MTX causa deficiência de folato, não de B12 (SES-PE 2016/2017).",
        "Bypass gástrico + ataxia → macrocitose com hipersegmentados (SES-PE 2022).",
        "Reposição de B12: parenteral (IM), depois oral/sublingual possível (SES-PE 2026; ENARE 2025).",
    ])))

SECOES.append(("Divergências: provas × evidência atual",
    divergencias([
        ["Dose do ferro oral", "Estratégia: 120–200 mg/dia de ferro elementar em 2–3 tomadas", "Hepcidina sobe por ~24 h após cada dose: <b>60–120 mg 1×/dia ou em dias alternados</b> absorve igual ou melhor, com menos efeitos adversos (Stoffel 2017/2020; BSG 2021)", "ENARE 2024 já deu como correta “ferro elementar em <b>dose única</b> por 3 meses”; se a questão for clássica, aceite 2–3 tomadas longe das refeições"],
        ["Corte de ferritina", "Estratégia: ferritina &lt; 15–20 ng/mL confirma ferropenia", "OMS 2020: &lt; 15 (adulto) e <b>&lt; 70 com inflamação</b>; AGA 2020: <b>&lt; 45</b> para indicar investigação; &lt; 100 com PCR alta, DRC ou IC", "Ferritina baixa = ferropenia; com inflamação, até 100 com saturação &lt; 20% ainda é ferropenia"],
        ["Duração do tratamento", "Estratégia: manter 6 meses ou mais (6–12 meses) para repor estoques", "BSG 2021: <b>3 meses após normalizar a Hb</b> (ou até ferritina &gt; 50) e monitorar a cada 3 meses no 1º ano", "Responda “manter após normalizar a Hb para repor os estoques”; ENARE 2024 aceitou 3 meses até reavaliação"],
        ["Neutrófilo hipersegmentado", "Estratégia chama de “patognomônico” da megaloblástica", "É <b>muito sugestivo, não patognomônico</b>: também ocorre em uremia, ferropenia grave, uso de G-CSF, hipersegmentação hereditária", "Se a banca disser “patognomônico”, aceite; se perguntar “qual não deve ser considerada”, lembre que chumbo não causa"],
        ["B12 oral × IM", "Provas (ENARE 2025) e Estratégia: anemia perniciosa = IM por toda a vida", "NICE 2024/BSH: <b>oral 1.000–2.000 µg/dia</b> é eficaz mesmo na perniciosa; IM preferida se quadro neurológico ou adesão duvidosa", "Neurológico ou perniciosa grave → IM; SES-PE 2026 aceita parenteral seguida de oral/sublingual"],
        ["Ácido metilmalônico com B12 normal", "SES-PE 2024 deu “deficiência de folato” para MMA ↑ com B12 normal", "MMA ↑ é o marcador <b>mais específico de deficiência tecidual de B12</b> (a B12 sérica pode ser falsamente normal); folato isolado não eleva MMA", "Na SES-PE, siga o gabarito da banca; nas demais, MMA ↑ = B12 (vale recurso)"],
        ["Indicação de ferro EV", "Provas clássicas: apenas intolerância, má absorção ou refratariedade ao oral", "Indicado também no pré-operatório &lt; 6 semanas, gestação no 2º/3º trimestre, DRC, IC com ferropenia, DII ativa (ESC 2023, BSG 2021)", "Em pré-operatório, EV é superior (SES-PE 2023)"],
        ["USP-RP 2011 (ferritina 417)", "Gabarito: anemia ferropriva em criança desnutrida com provável celíaca, ferritina 417 e CTLF baixa", "Ferritina 417 com CTLF 80 é perfil de <b>doença crônica</b> (ou ferropenia + inflamação); ferropriva isolada teria ferritina baixa e CTLF alta", "Contexto de má absorção grave puxa para ferropriva; sem contexto, ferritina alta + CTLF baixa = doença crônica"],
    ])))

MNEMONICOS = [
    {"palavra": "FERRO NA ALTA, CTLF NA BAIXA", "explicacao": "Ferropriva: ferritina baixa e CTLF alta. Doença crônica: ferritina alta e CTLF baixa. As duas têm ferro sérico baixo."},
    {"palavra": "B12 = NEURO + MMA", "explicacao": "Só a deficiência de B12 tem lesão neurológica (cordões posteriores e laterais) e ácido metilmalônico elevado; a homocisteína sobe nas duas."},
    {"palavra": "4-10-30", "explicacao": "Resposta ao ferro oral: reticulócitos sobem em 4–7 dias, pico no 10º dia, Hb sobe 1–2 g/dL em 30 dias."},
]

COMO_CAI = (_t["comoCai"] + " Na SES-PE (mais de 30 questões) caem: conduta na ferropenia do adulto (sulfato ferroso + EDA e colonoscopia, 2025–2026), "
            "resposta esperada ao ferro (Hb ↑ ≥ 1 g/dL em 3–4 semanas), dose pediátrica (3–6 mg/kg/dia), perfil de ferro (ferritina como alteração mais precoce, CTLF alta na ferropenia, doença crônica com ferritina alta), "
            "β-talassemia (HbA2 3,8%), coiloníquia × abatiestesia, glossite na perniciosa, anticorpos antifator intrínseco e anticélula parietal, bypass gástrico e B12, "
            "metotrexato × folato e reposição parenteral seguida de oral. No ENARE: dose única de ferro por 3 meses, B12 IM, investigação etiológica com EDA e anticorpos, ácido folínico no MTX.")
PRIORIDADE = "alta"
