import json
from h import tabela, quadro, fluxo, divergencias, img, img_q, PROPRIA

ID = "desenvolvimento-neuropsicomotor-crescimento"
_t = next(t for t in json.load(open(__file__.rsplit("/", 1)[0] + "/old14.json", encoding="utf-8")) if t["id"] == ID)
_old = {s["titulo"]: s["conteudo"] for s in _t["secoes"]}

RESUMO = ("Crescimento normal (peso, comprimento, perímetro cefálico), curvas da OMS e diagnóstico nutricional, alvo genético, velocidade de crescimento e idade óssea, "
          "baixa e alta estatura; marcos do DNPM pela Caderneta/AIDPI, reflexos primitivos, idade corrigida, sinais de alerta, M-CHAT, estresse tóxico e puericultura.")
FONTE = (_t["fonte"] + "; Ministério da Saúde/OPAS — Manual para Vigilância do Desenvolvimento Infantil no contexto da AIDPI (2ª ed.); Caderneta da Criança (MS, 2024); "
         "SBP — Tratado de Pediatria, 5ª ed. (Vigilância do desenvolvimento; Crescimento normal e alterado); SBP — Manual de Orientação #MenosTelas #MaisSaúde (2019, atualização 2024); "
         "SBP — Manual de Orientação Transtorno do Espectro do Autismo (2019) e Lei 13.438/2017; Robins DL, et al. M-CHAT-R/F (2014); "
         "Center on the Developing Child (Harvard) / Núcleo Ciência pela Infância — estresse positivo, tolerável e tóxico; OMS — Guidelines on physical activity (2020); "
         "Collett-Solberg PF, et al. Diagnosis, genetics, and therapy of short stature in children: GH Research Society international perspective. Horm Res Paediatr 2019; "
         "Ministério da Saúde — PCDT Deficiência do Hormônio de Crescimento e Síndrome de Turner; "
         "Estratégia MED — Resumos Estratégicos 2026: Desenvolvimento Neuropsicomotor (DNPM); Crescimento")

SECOES = []

SECOES.append(("Crescimento e curvas da OMS",
    _old["Crescimento e curvas da OMS"]
    + tabela(["Parâmetro", "Números que caem"], [
        ["Peso ao nascer", "Média ~3.300 g; perda de até <b>10%</b> (prematuro até 15%), recuperada até o <b>10º dia</b> (MS aceita até 15 dias)"],
        ["Ganho de peso no 1º ano", "1º trimestre <b>25–30 g/dia</b>; 2º trimestre 20 g/dia; 3º 15 g/dia; 4º 12 g/dia → <b>dobra aos 4–5 meses, triplica com 1 ano</b> (quadruplica aos 2 anos)"],
        ["Comprimento", "Ao nascer ~50 cm (menino) e 49 cm (menina); <b>1º semestre 15 cm, 2º semestre 10 cm</b> (25 cm no 1º ano); 2º ano 10–12 cm; pré-escolar e escolar <b>5–7 cm/ano</b> (média 6); estirão: meninas ~8,5 cm/ano, meninos ~9,5 cm/ano"],
        ["Perímetro cefálico", "33–36 cm ao nascer; <b>2 cm/mês no 1º trimestre, 1 cm/mês no 2º, 0,5 cm/mês no 2º semestre</b> (≈ 12 cm no 1º ano); ~47–51 cm aos 2 anos"],
        ["Puberdade", "Adquire ~<b>20% da estatura final e 50% do peso</b> adulto"],
    ])
    + "<p><b>Percentil × escore z</b>: o percentil mostra a <b>posição</b> da criança em relação a 100 crianças de mesma idade e sexo (P25 = 25% são menores); o escore z mede a <b>distância em desvios-padrão</b> da mediana: <b>z = (valor da criança − mediana) ÷ DP</b> (ENARE 2022). z 0 = P50; z −2 ≈ P2,3 (na prática, P3); z +2 ≈ P97. "
      "A afirmação da SES-PE 2013 que define percentil como “distância em unidades da mediana” é a INCORRETA (essa é a definição do escore z). "
      "Curvas da OMS: <b>0–5 anos</b> = padrão (estudo multicêntrico com Brasil, Gana, Índia, Noruega, Omã e EUA, crianças amamentadas); <b>5–19 anos</b> = referência (2007).</p>"
    + tabela(["Índice", "Ponto de corte (escore z)", "Diagnóstico"], [
        ["<b>Estatura/idade</b>", "&lt; −3", "Muito baixa estatura"],
        ["", "≥ −3 e &lt; −2", "<b>Baixa estatura</b> (&lt; P3)"],
        ["", "≥ −2", "Estatura adequada"],
        ["<b>Peso/idade</b> (0–10 anos)", "&lt; −3 / −3 a −2 / −2 a +2 / &gt; +2", "Muito baixo peso / baixo peso / adequado / <b>peso elevado</b>"],
        ["<b>Peso/estatura</b> (0–5 anos)", "&lt; −3 / −3 a −2 / −2 a +1 / +1 a +2 / +2 a +3 / &gt; +3", "Magreza acentuada / magreza / eutrofia / risco de sobrepeso / sobrepeso / obesidade"],
        ["<b>IMC/idade 0–5 anos</b>", "+1 a +2 / +2 a +3 / &gt; +3", "Risco de sobrepeso / sobrepeso / <b>obesidade</b>"],
        ["<b>IMC/idade 5–19 anos</b>", "+1 a +2 / +2 a +3 / &gt; +3", "Sobrepeso / <b>obesidade</b> / obesidade grave"],
        ["IMC/idade (ambas)", "&lt; −3 / −3 a −2 / −2 a +1", "Magreza acentuada / magreza / eutrofia"],
    ])
    + quadro("Pegadinhas", [
        "Obesidade: &gt; z +3 em menores de 5 anos, mas &gt; z +2 a partir de 5 anos.",
        "Baixa estatura: <b>&lt; z −2 ou &lt; P3</b> (ENARE 2024: “comprimento abaixo do P3 para a idade”). ENARE 2022 citou P2,5 — mesma ideia.",
        "Um ponto isolado vale menos que a <b>tendência</b>: queda de canal (cruzar 2 linhas de z) é mais preocupante que estar baixo e paralelo.",
        "SES-PE 2011: lactente de 6 meses com estatura e PC no P5 na primeira consulta → <b>pedir as medidas anteriores</b> (velocidade) antes de concluir.",
        "SES-PE 2020: lactente de 7 meses com peso e comprimento entre −1 e −2 DP → ambos <b>adequados</b>; PC esperado ≈ 34 + 6 + 3 + 0,5 ≈ 43–44 cm (não 40).",
    ]),
    [img_q("imagens/questoes/sespe/2023-2-q072-1.webp",
           "SES-PE 2023: menina de 6 anos, “a mais baixa da sala”, com estatura entre z −1 e z −2 na curva da OMS: não tem baixa estatura, mas é preciso avaliar velocidade de crescimento e alvo genético."),
     img_q("imagens/questoes/hiae-sp/2023/2023-d2b7a967-q038-1.webp",
           "Curva de comprimento/estatura com queda progressiva de canal (de z 0 para abaixo de z −2): crescimento patológico → iniciar investigação com velocidade de crescimento e idade óssea.")]))

SECOES.append(("Alvo genético, velocidade de crescimento e idade óssea",
    "<p><b>Alvo genético (estatura-alvo familiar)</b> — avalia o potencial genético; <b>não é previsão</b> de altura individual (ENARE 2022):</p>"
    + tabela(["Sexo", "Fórmula", "Faixa"], [
        ["Menino", "(altura do pai + altura da mãe <b>+ 13</b>) ÷ 2", "± 5 cm (alguns autores ± 8,5 cm = 2 DP)"],
        ["Menina", "(altura do pai + altura da mãe <b>− 13</b>) ÷ 2", "± 5 cm"],
    ])
    + "<p>Exemplos: menina com mãe de 155 e pai de 170 cm → (170 + 155 − 13) ÷ 2 = 156 cm (151–161). ENARE 2022: Felipe, mãe 1,56 m e pai 1,88 m → (188 + 156 + 13) ÷ 2 = <b>178,5 ≈ 1,78 m</b>. "
      "A conta é equivalente a “média dos pais ± 6,5 cm”.</p>"
    + "<p><b>Velocidade de crescimento (VC)</b>: o dado mais importante na baixa estatura. Normal no pré-púbere: <b>5–7 cm/ano</b> (abaixo de 4–5 cm/ano é patológica). Calcule sempre para 1 ano: 143 → 145 cm em 6 meses = 4 cm/ano → provável causa hormonal. "
      "VC normal praticamente afasta causa hormonal ou sistêmica.</p>"
    + "<p><b>Idade óssea (IO)</b>: radiografia de <b>mão e punho esquerdos</b> (Greulich-Pyle); diferença de até <b>1–2 anos</b> da idade cronológica é aceitável. IO atrasada = potencial de crescimento preservado (ACCP, deficiência de GH, hipotireoidismo, desnutrição, doença crônica); IO avançada = puberdade precoce, obesidade, hiperplasia adrenal, hipertireoidismo.</p>"
    + quadro("Casos de prova", [
        "SES-PE 2022: menino de 11 anos no z −2, mantendo o canal, sem puberdade → <b>é necessário comparar com o alvo genético</b> (não concluir ACCP só pela ausência de puberdade, nem investigar GH só pelo z −2).",
        "SES-PE 2019: menina com estatura estável em −1,5 DP e puberdade iniciando (M2) → crescimento adequado para o alvo.",
        "ENARE 2026: VC 3,5 cm/ano com IO atrasada 2 anos e exames iniciais normais → <b>IGF-1 e IGFBP-3</b> (+ testes de estímulo de GH se baixos).",
    ])))

SECOES.append(("Baixa estatura e alta estatura",
    tabela(["", "Baixa estatura familiar (BEF)", "Atraso constitucional do crescimento e da puberdade (ACCP)"], [
        ["Estatura", "&lt; z −2", "&lt; z −2"],
        ["Velocidade de crescimento", "Normal (mantém o canal)", "Normal (desacelera na idade da puberdade dos colegas)"],
        ["Pais", "Um ou ambos baixos (alvo genético baixo)", "Estatura normal; <b>história familiar de puberdade tardia</b>"],
        ["Idade óssea", "<b>Compatível</b> com a idade cronológica", "<b>Atrasada</b> (compatível com a idade-estatura)"],
        ["Puberdade", "Na idade habitual", "<b>Atrasada</b>"],
        ["Estatura final", "Baixa (dentro do alvo)", "<b>Normal</b> (dentro do alvo)"],
        ["Conduta", "Orientar e acompanhar", "Orientar; em meninos com sofrimento psicossocial, ciclo curto de testosterona em baixa dose"],
    ])
    + "<p><b>Baixa estatura idiopática (BEI)</b>: &lt; z −2 sem causa identificada — peso e comprimento de nascimento adequados (<b>RCIU/PIG exclui</b> — SES-PE 2021), proporções corporais normais, sem doença crônica, endócrina ou cromossômica, nutrição adequada e VC normal. Inclui BEF e ACCP em algumas classificações. A afirmação “altura &gt; −2 DP” não é critério (ENARE 2024).</p>"
    + tabela(["Grupo patológico", "Exemplos e pistas"], [
        ["<b>Genéticas/sindrômicas</b>", "<b>Turner</b> (45,X — principal causa patológica em meninas: pescoço alado, cúbito valgo, 4º metacarpo curto, mamilos afastados, linfedema, coarctação/valva aórtica bicúspide, hipogonadismo hipergonadotrófico; <b>cariótipo em toda menina com baixa estatura sem causa</b>), Down, Noonan, Prader-Willi, Russell-Silver, <b>SHOX</b>, Seckel, Bloom"],
        ["<b>Esqueléticas (desproporcionadas)</b>", "<b>Acondroplasia</b> (FGFR3, membros curtos, macrocrania, fronte proeminente, lordose, otites); raquitismo (ENARE 2023: pedir cálcio, fósforo e fosfatase alcalina)"],
        ["<b>PIG sem catch-up</b>", "~10% não recuperam até 2–4 anos → candidato a GH"],
        ["<b>Endócrinas</b> (~10%)", "<b>Hipotireoidismo</b> e <b>deficiência de GH</b> (VC baixa + IO atrasada + <b>tendência a sobrepeso</b>; GH é lipolítico), Cushing (obeso e baixo — o obeso exógeno é alto), DM mal controlado, raquitismo, pseudo-hipoparatireoidismo"],
        ["<b>Doenças crônicas</b>", "<b>Doença celíaca</b> (8–10% das baixas estaturas “idiopáticas” têm anticorpos), DII, DRC, <b>acidose tubular renal</b> (ENARE 2022), cardiopatias, fibrose cística, asma grave"],
        ["<b>Psicossocial e nutricional</b>", "Desnutrição, privação afetiva (nanismo psicossocial, reversível)"],
        ["<b>Fármacos</b>", "Glicocorticoides, metilfenidato (leve), anticonvulsivantes, hormônios sexuais"],
    ])
    + fluxo("Investigação da baixa estatura", [
        ("Anamnese e antropometria", "nascimento (PIG?), alvo genético, puberdade dos pais, doenças crônicas, medicações, proporções (segmento superior/inferior, envergadura), estigmas"),
        ("Velocidade de crescimento e idade óssea", ""),
        {"ramos": [
            ("VC ≥ 5 cm/ano", "variante da normalidade: <b>BEF</b> (IO normal, alvo baixo) ou <b>ACCP</b> (IO atrasada, alvo normal, atraso puberal familiar)"),
            ("VC &lt; 5 cm/ano ou queda de canal", "patológica → laboratório"),
        ]},
        ("Exames iniciais", "hemograma, VHS, função renal, eletrólitos, <b>gasometria venosa</b>, Ca/P/fosfatase alcalina, EAS, parasitológico, glicemia, albumina, <b>TSH e T4 livre</b>, <b>IGF-1 e IGFBP-3</b>, <b>antitransglutaminase IgA + IgA total</b>, <b>cariótipo em meninas</b>"),
        ("IGF-1 baixo", "2 testes de estímulo de GH (clonidina, insulina, glucagon) + RM de sela; exoma/painel se suspeita genética (USP-RP 2024)"),
    ])
    + "<p><b>Tratamento</b>: tratar a causa (levotiroxina, dieta sem glúten etc.). <b>GH recombinante</b>: deficiência de GH, <b>Turner</b> (ENARE 2024), PIG sem catch-up, Prader-Willi, DRC, haploinsuficiência do SHOX, Noonan, BEI (FDA). O <b>SUS</b> dispensa GH pelo PCDT apenas para <b>deficiência de GH e síndrome de Turner</b> (ENARE 2024). Acondroplasia: cirurgia de alongamento e, hoje, vosoritida. Variantes da normalidade: orientação e acompanhamento.</p>"
    + "<p><b>Alta estatura</b> (&gt; z +2; muito alta &gt; z +3): variantes — <b>alta estatura familiar</b>, aceleração constitucional, <b>obesidade exógena</b> (alta e com IO avançada); endócrinas — <b>puberdade precoce</b> (alta na infância e baixa no adulto), gigantismo por adenoma de GH, hipertireoidismo, hiperplasia adrenal; genéticas — <b>Marfan</b> (fibrilina-1, cromossomo 15, envergadura &gt; estatura, aracnodactilia, ectopia do cristalino, dilatação da raiz da aorta; ENARE 2024: Marfan <b>não</b> é causa de baixa estatura), <b>Klinefelter</b> (47,XXY: alto, eunucoide, ginecomastia, testículos pequenos e firmes, hipogonadismo hipergonadotrófico), homocistinúria, Sotos, Beckwith-Wiedemann.</p>",
    [img("imagens/resumos/ped/baixa-estatura-padroes.png",
         "Três padrões na curva de estatura: baixa estatura familiar (canal baixo e paralelo), atraso constitucional (queda transitória na idade puberal e estirão tardio) e causa patológica (cruza canais com velocidade baixa).",
         PROPRIA)]))

SECOES.append(("Marcos do desenvolvimento neuropsicomotor",
    _old["Marcos do desenvolvimento neuropsicomotor"]
    + "<p><b>Princípios</b>: tônus e controle <b>craniocaudal</b> (cabeça → tronco → membros); motor fino <b>próximo-distal</b>; a <b>sequência</b> é a mesma em todas as crianças, mas a <b>velocidade</b> varia com os estímulos; mielinização ~90% aos 3–4 anos; janela crítica dos <b>primeiros 1.000 dias</b>. "
      "No 2º trimestre ocorre a <b>reviravolta fisiológica do tônus</b>: o RN (hipertonia flexora de membros e hipotonia axial) passa a ter tônus de tronco e membros mais soltos (leva os pés à boca, senta, engatinha). "
      "A atitude do RN a termo é de <b>flexão dos quatro membros</b> (SES-PE 2023), com mãos fechadas e cabeça lateralizada.</p>"
    + tabela(["Idade", "Motor grosso", "Motor fino / adaptativo", "Linguagem", "Pessoal-social"], [
        ["RN–1 mês", "Flexão; de bruços eleva a cabeça segundos", "Fixa rosto a 20–30 cm", "Choro; reage ao som", "Observa um rosto"],
        ["2 meses", "Sustenta a cabeça a 45° em prono", "<b>Abre as mãos</b>; segue além da linha média", "Sons além do choro", "<b>Sorriso social</b> (1–2 meses)"],
        ["3–4 meses", "<b>Sustento cefálico</b>; prono apoiado nos antebraços (90°); cabeça acompanha ao puxar para sentar", "Mãos na linha média; <b>segura objetos</b>; segue 180°", "Ri, <b>gargalhadas</b> (4 m)", "Resposta ativa ao contato social"],
        ["5–6 meses", "<b>Rola</b>; senta com apoio (tripé)", "Busca ativa; <b>leva à boca</b>; <b>transfere</b> objetos (6 m)", "Localiza o som; sílabas “ba”, “da”", "Reconhece família; estranha (6–8 m)"],
        ["6–9 meses", "<b>Senta sem apoio</b>; engatinha (não é obrigatório)", "Pinça inferior (polpa) ~9 m; bate objetos", "<b>Lalação/duplica sílabas</b> (7–9 m); entende o “não” (9 m)", "<b>Esconde-achou</b>, permanência do objeto, angústia de separação"],
        ["9–12 meses", "Fica em pé com apoio (9–10 m); <b>anda com apoio</b>", "<b>Pinça superior</b> (pontas, 12 m); combina 2 cubos (10 m)", "“Mama/papa” (10 m); jargão; <b>1–2 palavras</b> com sentido (12 m)", "<b>Imita gestos</b>, dá tchau, bate palmas"],
        ["12–15 meses", "<b>Anda sem apoio</b> (base alargada, braços fletidos)", "Torre de 2–3 cubos; coloca blocos na caneca", "Diz uma palavra; nomeia objetos simples", "<b>Aponta</b> o que quer; obedece comando simples"],
        ["15–18 meses", "Corre (cai muito); anda para trás; sobe escada com ajuda", "Usa colher; torre de 3–4 cubos; rabisca", "<b>10–25 palavras</b>; aponta partes do corpo", "Come sozinho; “não” e “meu”; jogo simbólico inicial"],
        ["2 anos", "Corre bem; sobe e desce escada <b>sem alternar</b> com corrimão; chuta bola; pula com os 2 pés", "Torre de 6 cubos; imita traço; vira páginas uma a uma", "<b>Frases de 2 palavras</b>; 50–200 palavras", "Tira a roupa; brincadeira paralela; birras"],
        ["3 anos", "<b>Sobe escada alternando os pés</b>; triciclo", "Copia <b>círculo</b>; torre de 8–9 cubos", "Frases de 3 palavras; diz idade; fala compreendida", "Brinca com outras crianças; controle vesical diurno; veste-se com supervisão"],
        ["4 anos", "<b>Pula num pé só</b>; equilibra-se em um pé", "Copia <b>cruz</b>; desenha pessoa com 2–4 partes; usa tesoura", "Conta histórias; conjunções", "Usa o banheiro sozinho; jogos de tabuleiro"],
        ["5–6 anos", "Pula alternando; marcha ponta-calcanhar", "Copia <b>quadrado</b> (5) e triângulo (6); pessoa com 6 partes", "“Fase dos porquês”; frases complexas; sem trocas fonológicas", "Veste-se sozinho; controle vesical noturno (5 anos)"],
    ])
    + quadro("Frases de prova", [
        "SES-PE 2026 (18 meses): anda sem apoio, torre de 3 cubos, <b>10 a 25 palavras</b>, aponta partes do corpo.",
        "ENARE 2022: sorri, copia expressões, balbucia, alcança brinquedo e sustenta a cabeça → <b>4 meses</b>; desenha pessoa com 2–4 partes, usa tesoura, fica em um pé → <b>4 anos</b>; frases de 2–4 palavras, torre de 4, ponta dos pés, brincadeira paralela → <b>2 anos</b>; entende a finalidade da morte → <b>6–9 anos</b>.",
        "ENARE 2024: aos 9 meses apoia-se para levantar; ENARE 2025: lactente de 5 meses para de chorar diante de voz conhecida.",
        "SES-PE 2025: 12 meses com pinça e passos com apoio, 18 meses sem frases e 3 anos desenhando 4 partes do corpo → <b>todas adequadas</b>.",
    ])))

SECOES.append(("Reflexos primitivos",
    _old["Reflexos primitivos"]
    + tabela(["Reflexo/reação", "Como pesquisar", "Presença"], [
        ["<b>Moro</b>", "Queda brusca da cabeça/som: extensão e abdução dos braços, depois flexão (“abraço”). Aferência proprioceptiva cervical, acústica ou vestibular", "A partir de 28–32 sem; some até o <b>6º mês</b> (assimetria = lesão de plexo braquial ou fratura de clavícula)"],
        ["<b>Tônico-cervical assimétrico</b> (Magnus-de Kleijn, “esgrimista”)", "Rodar a cabeça 90°: extensão dos membros do lado da face, flexão do lado occipital", "Some no <b>2º–3º mês</b>; presente aos 100 dias = <b>preocupação</b> (SES-PE 2022)"],
        ["<b>Sucção</b>", "Estimular lábios", "Desde 32–34 sem; ausência no RN = lesão grave do SNC"],
        ["<b>Galant</b> (encurvamento do tronco)", "Prono, estímulo paravertebral → curva o tronco para o lado", "Até 2–4 meses"],
        ["<b>Colocação</b> (placing)", "Dorso do pé na borda da mesa → “sobe o degrau”", "Até 2 meses"],
        ["Olhos de boneca", "Rodar a cabeça: olhos não acompanham", "Só no período neonatal; persistência aos 2 meses = alerta"],
        ["<b>Landau</b>", "Suspensão ventral: estende cabeça, tronco e pernas", "Surge aos <b>3 meses</b> (2–3 m), some ~2 anos"],
        ["<b>Proteção lateral</b>", "Sentado, empurrar lateralmente: estende o braço", "Surge aos <b>6–8 meses</b>"],
        ["<b>Paraquedas</b>", "Simular queda para frente: estende os braços", "Surge aos <b>8–9 meses</b> (UFCSPA 2022: 7º–8º mês) e <b>persiste por toda a vida</b>"],
    ])
    + quadro("Exame neurológico do lactente (pegadinhas)", [
        "Cutâneo-plantar em <b>extensão</b> é normal até 12–18 meses (mielinização do trato corticoespinhal); reflexos profundos podem estar vivos.",
        "Reflexos <b>cutâneo-abdominais</b> estão <b>ausentes</b> no RN (SES-PE 2021, 2023).",
        "<b>Clônus</b> esgotável é aceitável no RN; clônus mantido após os primeiros meses é patológico — “clônus simétrico normal até o 3º–4º ano” é falso (SES-PE 2021).",
        "Reflexos primitivos persistentes após 6 meses (Moro, RTCA, preensão, voracidade) sugerem disfunção cerebral (paralisia cerebral).",
    ]),
    [img_q("imagens/questoes/ses-rj/2025/2025-9829b4c7-q032-1.webp",
           "Reflexo tônico-cervical assimétrico (postura do esgrimista): com a cabeça rodada, extensão dos membros do lado da face e flexão do lado occipital — deve desaparecer até o 3º mês."),
     img_q("imagens/questoes/ufcspa/2022/2022-7d921289-q011-1.webp",
           "Reação de paraquedas: ao simular queda para a frente, o lactente estende os braços e apoia as mãos — surge aos 7–9 meses e permanece por toda a vida.")]))

SECOES.append(("Triagem do desenvolvimento e sinais de alerta",
    _old["Triagem do desenvolvimento e sinais de alerta"]
    + "<h4>Classificação da Caderneta/AIDPI (cai na SES-PE)</h4>"
    + tabela(["Avaliação", "Classificação", "Conduta"], [
        ["Todos os marcos da faixa etária presentes, sem fatores de risco", "<b>Desenvolvimento normal</b>", "Elogiar, orientar estimulação, retorno de rotina e sinais de alerta"],
        ["Todos os marcos presentes + ≥ 1 fator de risco", "<b>Normal com fatores de risco</b>", "Orientar estimulação; retorno em <b>30 dias</b>"],
        ["Ausência de ≥ 1 marco da <b>sua</b> faixa etária", "<b>Alerta para o desenvolvimento</b>", "Orientar estimulação; retorno em <b>30 dias</b>"],
        ["Ausência de ≥ 1 marco da <b>faixa anterior</b> <b>ou</b> PC &lt; z −2 ou &gt; z +2 <b>ou</b> ≥ 3 alterações fenotípicas", "<b>Provável atraso</b>", "<b>Referir</b> para avaliação neuropsicomotora (equipe multiprofissional/especializada)"],
    ])
    + tabela(["Faixa (AIDPI)", "Marcos avaliados"], [
        ["&lt; 1 mês", "Postura em flexão; observa um rosto; reage ao som; eleva a cabeça"],
        ["1–2 meses", "Sorriso social quando estimulada; <b>abre as mãos</b>; emite sons; movimenta ativamente os membros"],
        ["2–4 meses", "Resposta ativa ao contato social; <b>segura objetos</b>; emite sons; de bruços levanta a cabeça apoiando-se nos antebraços"],
        ["4–6 meses", "Busca ativa de objetos; <b>leva objetos à boca</b>; localiza o som; muda de posição (rola)"],
        ["6–9 meses", "Brinca de esconde-achou; transfere objetos; <b>duplica sílabas</b>; senta sem apoio"],
        ["9–12 meses", "Imita gestos; faz pinça; produz jargão; anda com apoio"],
        ["12–15 meses", "Mostra o que quer; coloca blocos na caneca; diz uma palavra; anda sem apoio"],
        ["15–18 meses", "Usa colher ou garfo; torre de 2 cubos; fala 3 palavras; anda para trás"],
        ["18–24 meses", "Tira a roupa; torre de 3 cubos; aponta 2 figuras; chuta a bola"],
    ])
    + quadro("Casos da SES-PE", [
        "2026: criança de 3 meses que <b>não abre as mãos</b> (marco de 1–2 m) e não segura objetos → marco da faixa anterior ausente → <b>provável atraso: encaminhar de imediato</b> (criança 3). Crianças com falha só na faixa atual = alerta.",
        "2025: prematura com 6 meses cronológicos e <b>4 de idade corrigida</b> classificada como alerta → faltava <b>levar objetos à boca</b> (faixa 4–6 m pela idade corrigida).",
        "2025: lactente de 10 meses com marcos adequados mas <b>PC 41 cm</b> (&lt; z −2) → <b>provável atraso</b>.",
        "2024: prematuro de 35 semanas, 9 meses (idade corrigida 8 m), senta, transfere, brinca de esconde-achou, mas <b>não duplica sílabas</b> → <b>alerta</b>, estimular e reavaliar em 30 dias (idade corrigida vale para todo prematuro &lt; 37 semanas).",
    ])
    + "<p><b>Idade corrigida</b> = idade cronológica − (40 − IG em semanas); usar <b>até 2 anos</b> (alguns autores: até 3 anos no prematuro extremo). Ex.: 16 semanas de vida, nascido com 35 → 16 − 5 = <b>11 semanas</b>.</p>"
    + "<p><b>Fatores de risco para o DNPM</b>: pré-natal ausente/incompleto, prematuridade, baixo peso, RCIU, consanguinidade, infecções congênitas, asfixia, icterícia grave, meningite, convulsões, ventilação prolongada, mãe adolescente, <b>depressão materna</b>, violência doméstica, drogas/álcool em casa, baixo nível socioeconômico. <b>Utilizar saúde suplementar não é fator de risco</b> (ENARE 2021).</p>"
    + "<h4>Autismo (TEA) e M-CHAT-R/F</h4>"
    + tabela(["Pontuação no M-CHAT-R (16–30 meses)", "Conduta"], [
        ["0–2: baixo risco", "Triagem negativa; se &lt; 24 meses, repetir aos 24 meses; manter vigilância"],
        ["<b>3–7: risco moderado</b>", "Aplicar a <b>entrevista de seguimento (Follow-Up)</b>; se ≥ <b>2</b> itens continuam positivos → triagem positiva → avaliação diagnóstica e intervenção precoce (SES-PE 2026)"],
        ["8–20: alto risco", "Encaminhar direto para avaliação diagnóstica e intervenção precoce (pode dispensar o seguimento)"],
    ])
    + "<p>A Lei 13.438/2017 obriga a aplicação de protocolo de risco para o desenvolvimento psíquico nos primeiros 18 meses; a SBP recomenda M-CHAT aos <b>18 e 24 meses</b>. "
      "Sinais de TEA: não responde ao nome, pouco contato visual, não aponta nem mostra (atenção compartilhada), atraso de linguagem, ecolalia, movimentos repetitivos, interesses restritos, seletividade alimentar (ENARE 2025: aplicar M-CHAT-R/F). "
      "Prevalência citada pela SES-PE 2020: 1 em 59 (CDC 2018) — hoje <b>1 em 31</b> (CDC 2025). Insônia no TEA: <b>melatonina</b> (SES-PE 2024). "
      "M-CHAT não serve aos 5 anos: SES-PE 2026 (5 anos, tela 4 h/dia desde bebê, audição normal) → conduta inicial: <b>laudo completo da escola</b> (o diagnóstico de TEA exige prejuízo em mais de um ambiente).</p>"
    + "<h4>Atraso global e causas neurológicas</h4>"
    + quadro("O que a SES-PE já cobrou", [
        "Lactente de 4 meses sem sustento cefálico, <b>hipotonia e arreflexia globais, fasciculações de língua e boa interação</b> → <b>AME tipo 1</b> (doença do neurônio motor inferior) → <b>eletroneuromiografia e CPK</b> + teste genético (SMN1). Há terapias modificadoras: nusinersena, risdiplam, onasemnogene (incluída na triagem neonatal ampliada).",
        "Atraso do desenvolvimento: etiologia genética predomina nos países desenvolvidos; eventos intraútero e perinatais nos em desenvolvimento; avaliar <b>visão e audição antes da RM</b>; EEG se espasmos; buscar a etiologia mesmo sem tratamento (aconselhamento genético).",
        "Sinais que sugerem doença que <b>simula paralisia cerebral</b> (SES-PE 2023): RM normal, quadro motor simétrico restrito aos membros inferiores, <b>regressão</b> de marcos, arreflexia, flutuação, história familiar. Epilepsia e TEA associados são comuns na própria PC (não é sinal de alerta).",
        "ENARE 2026: PC por prematuridade/asfixia — paralisia cerebral; vigilância de quadril e coluna (radiografias seriadas).",
        "Plagiocefalia posicional: achatamento parieto-occipital unilateral com DNPM normal (SES-PE 2021) → reposicionamento; diferenciar de craniossinostose (crista óssea, formato fixo).",
    ])
    + "<h4>Estresse e desenvolvimento</h4>"
    + tabela(["Tipo de estresse", "Definição", "Exemplo (SES-PE 2026)"], [
        ["<b>Positivo</b>", "Breve, leve, com apoio — parte do desenvolvimento saudável", "Adaptação escolar (3 anos)"],
        ["<b>Tolerável</b>", "Mais intenso/duradouro, mas <b>amortecido por relações de apoio</b>", "Divórcio dos pais com apoio familiar (5 anos)"],
        ["<b>Tóxico</b>", "Adversidade intensa, frequente e prolongada <b>sem</b> apoio adulto (negligência, violência, pais com abuso de álcool, prisão de um dos pais)", "Pai preso, criança agressiva (8 anos)"],
    ])
    + "<p>O estresse tóxico ativa cronicamente o eixo do cortisol e altera a arquitetura cerebral (↓ neurogênese e sinapses no hipocampo e córtex pré-frontal), elevando o risco futuro de doenças crônicas — <b>DPOC</b>, cardiopatia, diabetes, depressão, abuso de substâncias (estudo ACE). SES-PE 2025: criança com abandono, alcoolismo paterno e morte da cuidadora → <b>risco aumentado de DPOC e alteração da neurogênese</b>.</p>"))

SECOES.append(("Puericultura: consultas e acompanhamento da criança",
    _old["Puericultura: consultas e acompanhamento da criança"]
    + quadro("Atualizações e números de prova", [
        "Telas (SBP): <b>evitar antes dos 2 anos</b> (a SES-PE 2026 considerou INCORRETO “até os 16 meses”); <b>2–5 anos: até 1 h/dia</b> (SES-PE 2020); 6–10 anos: 1–2 h/dia; 11–18 anos: 2–3 h/dia; nunca durante refeições ou 1–2 h antes de dormir; sem telas no quarto.",
        "Atividade física (OMS 2020): &lt; 1 ano várias vezes ao dia, incluindo 30 min de bruços (<i>tummy time</i>); 1–4 anos ≥ 180 min/dia; <b>5–17 anos ≥ 60 min/dia</b> moderada a vigorosa (ENARE 2024) + fortalecimento 3×/semana.",
        "Fatores de alto risco na puericultura: prematuridade, baixo peso, internação neonatal, mãe adolescente/sem pré-natal, desnutrição, irmão falecido &lt; 5 anos, vulnerabilidade social (ENARE 2021).",
        "Na anamnese do déficit de crescimento, “hábitos de higiene familiar” <b>não</b> é ponto relevante (ENARE 2022).",
    ])))

SECOES.append(("Dicas de prova",
    _old["Dicas de prova"]
    + quadro("Top 12 de prova (SES-PE, ENARE/ENAMED)", [
        "Baixa estatura: <b>&lt; z −2 / P3</b>; compare com o <b>alvo genético</b> e calcule a <b>velocidade</b> (SES-PE 2022 e 2023).",
        "Alvo: (pai + mãe ± 13) ÷ 2 ± 5 cm (ENARE 2022: 1,78 m).",
        "BEF × ACCP: idade óssea normal × atrasada; pais baixos × atraso puberal familiar.",
        "Menina com baixa estatura e atraso puberal → <b>cariótipo (Turner)</b> (SES-PE 2024).",
        "VC baixa + IO atrasada → IGF-1/IGFBP-3, TSH; GH no SUS: deficiência de GH e Turner.",
        "RCIU/PIG exclui baixa estatura idiopática (SES-PE 2021).",
        "18 meses: anda só, torre de 3, 10–25 palavras, aponta partes do corpo (SES-PE 2026).",
        "RTCA presente aos 100 dias = preocupação (SES-PE 2022); Moro some até 6 meses; paraquedas surge aos 8–9 m e fica.",
        "Caderneta: marco da faixa anterior ausente ou PC alterado → <b>provável atraso</b> → encaminhar; marco da faixa atual ausente → alerta → 30 dias.",
        "Prematuro: <b>idade corrigida</b> até 2 anos.",
        "M-CHAT-R 3–7 → entrevista de seguimento; ≥ 2 positivos → encaminhar (SES-PE 2026).",
        "Hipotonia + arreflexia + fasciculação de língua com boa interação → AME → ENMG e CPK (SES-PE 2026).",
    ])))

SECOES.append(("Divergências: provas × evidência atual",
    divergencias([
        ["Pinça e transferência", "Resumo antigo: “pinça inferior e transferência com 6 meses”", "Estratégia/AIDPI: <b>transfere aos 6 m</b>; pinça inferior (polpa) aos <b>9 m</b>; pinça superior (pontas) aos 12 m", "Pinça = 9 meses (faixa 9–12 m da Caderneta); transferência = 6–9 m"],
        ["Paraquedas", "Resumo antigo: 9 meses; Estratégia: 8 meses", "Surge entre 7 e 9 meses (UFCSPA 2022: 7º–8º mês) e persiste por toda a vida", "Responda <b>8–9 meses</b> e “permanece a vida toda”"],
        ["Faixa do alvo genético", "Estratégia e provas: ± 5 cm", "Endocrinologia pediátrica usa ± 8,5 cm (≈ 2 DP) para considerar o canal compatível", "Use <b>± 5 cm</b>"],
        ["Ferramentas de triagem", "Estratégia: Denver II, Gesell, Bayley e Caderneta", "Caderneta 2024 e SBP incorporaram o <b>M-CHAT-R/F</b> e ênfase em vigilância contínua; Denver II só triagem, não diagnóstico", "SES-PE cobra a <b>Caderneta/AIDPI</b> e o M-CHAT-R/F"],
        ["Telas", "SES-PE 2026 cobrou “evitar até 2 anos” (16 meses estava errado)", "SBP 2019/2024 mantém: zero antes de 2 anos; OMS: nada antes de 1 ano e ≤ 1 h aos 2–4 anos", "Siga a <b>SBP</b>: 0 antes de 2 anos; 1 h de 2–5 anos"],
        ["Indicações de GH", "ENARE 2024: SUS dispensa só para deficiência de GH e Turner", "Evidência e bula (FDA/Anvisa): também PIG sem catch-up, Prader-Willi, DRC, SHOX, Noonan e BEI", "SUS → deficiência de GH e Turner; “indicação aprovada” → lista ampla"],
        ["Hipotireoidismo e GH: peso", "Estratégia: deficiência de GH tende à obesidade", "Correto — e o mesmo vale para hipotireoidismo e Cushing (baixo e gordo); obesidade exógena cursa com estatura alta e IO avançada", "Baixo + gordo = endócrino; alto + gordo = exógeno"],
    ])))

MNEMONICOS = [
    {"palavra": "ALVO ±13", "explicacao": "Alvo genético: (pai + mãe + 13) ÷ 2 para meninos; (pai + mãe − 13) ÷ 2 para meninas; faixa de ± 5 cm."},
    {"palavra": "BEF NORMAL, ACCP ATRASA", "explicacao": "Baixa estatura familiar: idade óssea e puberdade normais, pais baixos. Atraso constitucional: idade óssea e puberdade atrasadas, pais normais com atraso puberal."},
    {"palavra": "CÍRCULO 3, CRUZ 4, QUADRADO 5, TRIÂNGULO 6", "explicacao": "Idades em que a criança copia cada figura geométrica."},
    {"palavra": "ANTERIOR = ENCAMINHA", "explicacao": "Na Caderneta/AIDPI: falta marco da faixa atual = alerta (retorno em 30 dias); falta marco da faixa anterior ou PC alterado = provável atraso (encaminhar)."},
]

COMO_CAI = (_t["comoCai"] + " Na SES-PE (mais de 35 questões) caem a classificação da Caderneta/AIDPI (normal, alerta, provável atraso — casos de 2024–2026 com idade corrigida e PC), "
            "marcos de 18 meses, RTCA aos 100 dias, M-CHAT-R/F, AME (ENMG e CPK), estresse positivo/tolerável/tóxico, telas, baixa estatura (z −2, alvo genético, BEI excluída por RCIU, cariótipo para Turner). "
            "No ENARE: alvo genético (1,78 m), z-score, exames e indicações de GH, critérios de BEI, marcos de 4 meses, 2 e 4 anos, atividade física de 60 min/dia.")
PRIORIDADE = "alta"
