# Progresso — banco particionado e importação de questões

Arquivo de retomada (atualizado a cada etapa). Regras combinadas:
- IDs de questões nunca mudam; cópias mescladas guardam os ids absorvidos em `aliases`.
- `origem` (MedCof/Medway/…) é só interno: sem filtro e sem aparecer na tela.
- Importação por instituição, **SES-PE por último**. Provas **R1/acesso direto e R+** (Cirurgia, Clínica, Pediatria, GO, Mastologia, Endoscopia); **sem** título de especialista, Revalida, certificados de área e "Autoral" (pedido do usuário, 18/10).
- Classificação **sem depender do usuário** (pedido de 18/10): classificador automático + a revisão das de baixa confiança feita por mim; o usuário não confere mais tema.
- Textos passam pelo corretor `ferramentas/ortografia.py` (ligaduras fi/fl perdidas, hifenização, marca-d'água vazada, quebras de linha no meio da frase). Nas questões que já existiam, o texto da prova oficial substitui o do banco.
- Número da questão não aparece no banco (só serve para ordenar a "Prova completa"); `fonte` não cita o número.
- Itens Certo/Errado entram como questões de 2 alternativas (decisão do usuário, 18/10).
- Validação automática por script (gabarito, 4–5 alternativas, imagem citada encontrada, sem duplicata); reprovados → lista de revisão.
- Service worker: só o índice no pré-cache; especialidades e imagens entram no cache ao abrir. Versão atual: **v128**.
- Limites: nenhum arquivo > 50 MB; repositório < 1 GB; se imagens passarem de algumas centenas de MB, avisar antes (Cloudflare R2).

## Etapa 0 — banco particionado (branch `claude/banco-particionado`)
- [x] `ferramentas/banco_questoes.py` (migrar / indice / validar) — formato da questão documentado no topo do arquivo
- [x] Migração: 29.405 → 27.867 questões (1.538 duplicatas exatas mescladas em `aliases`); 23 grupos com gabarito divergente → `ferramentas/revisao/migracao.json`
- [x] `data/questoes/indice.json` (1,2 MB) + 26 arquivos por especialidade; `data/questoes.json` removido
- [x] `app/bancoQuestoes.js` (índice, arquivos sob demanda, aliases); Questões, Erros, Simulados, planejador, currículo e Conteúdo adaptados; filtro "Instituição"
- [x] Testes: `pw-test/test_banco_particionado.js` (novo) ok; telas abertas baixam só índice + especialidade necessária (~3,7 MB vs 33 MB)
- [x] Bateria de regressão: mesmos resultados da `main` (falhas pré-existentes: test_fase5_erros, test_motivo_erro, test_hoje_curso, test_foco_curso). Busca sem filtro não baixa o banco inteiro (botão explícito "buscar no enunciado de todo o banco").
- [x] PR #122 mergeado (18/10)
- Qualidade (pré-existente, a revisar depois): 698 questões com só 2 alternativas, 2 com 3, 4 com alternativa vazia.

## Etapa 1 — importação por instituição
- [x] Inventário (`scratchpad/imp/inventario.py`): MedCof 6.850 PDFs (1.477 provas R1/acesso direto únicas, 229 instituições); Medway 1.774 (texto em imagem, sem OCR disponível)
- [x] Classificador (`scratchpad/imp/classificador.py`): holdout top-1 71,5%, top-3 90%; margem ≥ 0,5 cobre 56% com 84% de acerto
- Decisão: primeiro lote = ENARE (prova nacional; SES-PE por último)
- [x] Pipeline em `scratchpad/imp/`: `extrair.py` (formatos "1 -", "1)", número sozinho; alternativas "A)", "(A)", "A-"; páginas em 2 colunas; gabarito em grade) → `montar_lote.py` (cruza com o banco; novas/enriquecer/revisar; classificador) → `decidir.py` (temas manuais) → `aplicar_lote.py` (prévia; `--publicar` grava) → `amostra.py` (página de conferência)
- Regras: PDFs com "SIMULADO"/"AUTORAL" na capa são excluídos (MedCof mistura simulados próprios com provas reais)
- [x] Lote 1 ENARE conferido pelo usuário (84 marcações: 18 trocas de tema aplicadas com subtema; 2 conflitos → fica o gabarito do banco; anuladas novas não entram) e publicado
- [x] Extrator: detecção de 2 colunas pela margem real da coluna direita (corrigiu palavras soltas fora de ordem no ENARE 2024), linha visual reordenada por x, hifenização, ligaduras, palavra solta no fim
- [x] Corretor aplicado ao banco inteiro: 21.277 questões com alguma correção (3.187 tinham marca-d'água "venda proibida" vazada no texto); ids e demais campos intactos

## Plataforma
- [x] Filtro por instituição (tela de Questões) e por ano (já existia)
- [x] Imagem dentro da questão com zoom (PR #120)
- [x] "Prova completa" em Simulados: provas reais com numeração (instituição + ano/edição), na ordem, anuladas fora da correção — `pw-test/test_prova_completa.js` (testado com o ENARE aplicado só localmente)
- [x] Foco no Curso: usa as questões novas automaticamente (filtra por tema via índice)
- [x] Flashcards a partir das questões: botão "Criar flashcard" depois de responder (Questões e Meus Erros; usa a IA para um card enxuto, sem IA monta frente = caso, verso = resposta + comentário); em Flashcards, baralho "Das minhas questões" e "Gerar cards dos meus erros" / "Gerar cards deste tema" (até 20) — `pw-test/test_flashcards_questoes.js`
- [x] Enunciado respeita quebras de linha que sobraram (itens I, II, III)
- [x] Prova completa mostra "· R+ Cirurgia" etc. nas provas de R+

## Lotes
| Lote | Instituição | Provas | Questões extraídas | Novas | Revisão | Status |
|---|---|---|---|---|---|---|
| 1 | ENARE | 2021, 2022, 2023, 2024, 2025 (10 simulados MedCof e 1 "FGV 2024" sem rótulo excluídos) | 500 (23 anuladas) | 360 novas (q29516–q29875) + 118 já existiam (ganham instituição/ano/número e o texto oficial) | conferido pelo usuário | publicado |
| 2–6 | SES-RJ, SURCE, HIAE-SP, UERJ, UFRJ (R1 e R+) | — | — | PRs #126–#130 | sem conferência do usuário (filtro de qualidade + minha revisão) | publicado |
| 7 | UNESP | R1 e R+ | 2.511 | 2.225 novas, 279 enriquecidas | idem | publicado (#132) |
| 8 | ABC-SP | R1 e R+ | — | 3.128 novas (prévia), 283 enriquecidas | preparado por agente, revisado | publicado (#134) |
| 9 | FAMERP | R1 e R+ | — | 2.188 novas (prévia), 131 enriquecidas | idem | publicado (#135) |
| 10 | PSU-MG | R1 e R+ (inclui 2025.2) | — | 1.365 novas (prévia); 21 excluídas (caso compartilhado do formato 2025, gabaritos divergentes) | idem | publicado (#136) |
| 11 | SCM-SP | R1 e R+ | 3.390 | 2.396 novas, 248 enriquecidas | 757 de baixa confiança classificadas à mão | publicado (#137) |
| 12 | SUS-SP | R1 e R+ | 4.064 | 2.902 novas | 960 de baixa confiança à mão | publicado (#138) |
| 13 | IAMSPE-SP | R1 e R+ | 2.962 | 2.292 novas | 790 à mão | publicado (#139) |
| 14 | USP-RP | R1 e R+ | 4.275 | 3.793 novas (555 viraram `repetidaDe`) | 1.276 à mão | publicado (#140) |
| 15 | AMRIGS | R1 e R+ | 2.648 | 1.938 novas, 197 enriquecidas | 608 à mão; 11 reprovadas (7 lacunas perdidas) | publicado (#142) |
| 16 | UNIFESP | R1 e R+ (discursivas de fora) | 3.919 | 3.086 novas (138 cópias R1/R+ entram como novas e viram `repetidaDe`), 330 enriquecidas | 910 à mão; 8 reprovadas | publicado (#143) |
| 17 | SES-DF | R1 e R+ (Certo/Errado como 2 alternativas) | 6.056 | 4.800 novas (2.941 Certo/Errado), 189 enriquecidas | 1.635 à mão; 21 reprovadas | publicado (#144) |
| 18 | SUS-BA | R1 e R+ objetivas (provas discursivas de fora) | 2.097 | 1.467 novas, 45 enriquecidas | 532 à mão; 13 reprovadas | publicado (#145) |
| 19 | UNICAMP | R1 e R+ objetivas (2ª fase e provas discursivas de fora) | 3.788 | 3.036 novas, 360 enriquecidas | 1.036 à mão; 11 reprovadas | publicado (#146) |
| 20 | UNITAU | R1 e R+ | 1.105 | 831 novas, 64 enriquecidas | 265 à mão; 5 reprovadas | publicado (#147) |
| 21 | USP-SP | R1 e R+ (provas só de gabarito/discursivas de fora) | 7.150 | 5.088 novas, 211 enriquecidas | 1.908 à mão; 29 reprovadas; 26 excluídas na revisão (questão que depende de caso/lista ausente) | publicado (#148) |
| 22 | SES-PE | R1 e R+ | 3.871 | 2.239 novas, 1.039 enriquecidas | 662 à mão; 20 reprovadas; 2 excluídas na revisão; 63 com gabarito divergente do banco ficaram de fora | publicado (#149) |

### Reprocessamento dos lotes 1–13 com o extrator atual
Reextração + `montar_lote`; só entram as questões que ainda não estavam publicadas (falso positivo de parênteses, gabarito não lido, caso compartilhado). `atualizar_textos.py` corrige texto de publicadas apenas em casos inequívocos (caso compartilhado grudado).

| Lote | Recuperadas | Observação | Status |
|---|---|---|---|
| FAMERP | 39 novas | 14 itens que dependem da questão anterior entram só na prova completa; 1 excluída (texto duplicado no PDF) | publicado (#152) |
| ABC-SP | 24 novas | 2 com OCR corrigido (hepatite "6"→B; "1-1"→"1-I"); 1 excluída (lacunas perdidas) | publicado (#153) |
| UNESP | 21 novas | 1 excluída (depende do caso anterior, alternativa com lixo) | publicado (#154) |
| SCM-SP | 17 novas | — | publicado (#155) |
| SUS-SP | 16 novas | — | publicado (#156) |
| IAMSPE-SP | 17 novas | 120 itens de PDFs sem gabarito/alternativas legíveis continuam de fora | publicado (#157) |
| PSU-MG | ~148 novas (provas R+ 2019–2023 que tinham ficado de fora; 17 das 21 excluídas do formato 2025 agora vêm com o caso completo) | 4 seguem excluídas: gabarito divergente entre R1 e R+ (2), gabarito duvidoso (1), caso de outra questão colado (1); 134 das recuperadas são cópias entre provas e viraram `repetidaDe` | publicado (#158) |
| SURCE | 4 novas | — | publicado (#159) |
| UERJ | 7 novas | 111 itens de PDFs sem gabarito/alternativas legíveis continuam de fora | publicado (#160) |
| UFRJ | 21 novas | 1 excluída (alternativas embaralhadas) | publicado (#161) |
| HIAE-SP | 13 novas | — | publicado (#162) |
| SES-RJ | 31 novas | itens "analise as assertivas… Quais estão corretas?" que o filtro antigo reprovava | publicado (#163) |
| ENARE | ~3.225 novas: as provas R+ (2022–2026) nunca tinham sido importadas — o lote 1 só tinha R1 | 1.062 temas classificados à mão; rótulos de programa padronizados ("Neuro Pediatria" → "Neuropediatria" etc.); filtro passa a reprovar "preencha a lacuna" sem a lacuna | publicado (#164) |

### Instituições adicionais (as 10 maiores restantes do acervo MedCof)
Escolha do usuário: só as maiores. Corte: HCPA-RS, AMP, UEPA, PUC-SP Sorocaba, UFCSPA, CERMAM, Aliança Saúde (PUC-PR), SES-GO, GHC-RS, HC-UFPR.

| Instituição | Extraídas | Novas | À mão | Status |
|---|---|---|---|---|
| HCPA-RS | 2.094 | 1.507 novas, 233 enriquecidas | 484 | publicado (#166) |
| AMP-PR | 2.248 | 1.612 novas, 200 enriquecidas (25 conflitos para revisão; 373 duplicadas no próprio acervo) | 550 | publicado (#167) |
| UEPA | 2.439 | 1.863 novas, 99 enriquecidas (46 conflitos para revisão; 378 duplicadas no próprio acervo); 433 palavras grudadas do PDF separadas (`grudadas.py`) | 525 | publicado (#168) |
| PUC-SOROCABA | 1.181 | 829 novas, 62 enriquecidas (40 conflitos; 227 duplicadas no acervo). R1 2016–2020 são PDFs só de imagem (sem texto) e ficaram de fora; provas discursivas excluídas; reconhecimento de caso compartilhado "O caso 1 se refere às questões..." | 260 | publicado (#169) |
| UFCSPA | 1.286 | 804 novas, 75 enriquecidas (6 conflitos; 352 duplicadas no acervo). Leitor corrigido para alternativas em sequência Certo/Errado ("C - E - C"), que eram confundidas com rótulo de alternativa (21 recuperadas) | 222 | publicado (#170) |
| CERMAM | 1.299 | 1.063 novas, 103 enriquecidas (75 conflitos — muitas questões repetidas de outras bancas; 45 duplicadas). PDFs 2013–2019 só imagem (fora). **Revisão manual de TODOS os temas** (287 de baixa confiança + 704 automáticos revisados, 182 corrigidos) | 991 | publicado |

Decisão de qualidade (a partir do CERMAM): amostragem mostrou erro de ~40% na classificação automática com margem 0,2–0,4 e ~12% acima de 0,4 (ex.: TEA em "psicopatologia", Epley em "perda auditiva", citologia em "nódulo de mama"). Por isso os temas automáticos passam a ser revisados um a um (`rev_auto.py`/`fix_auto.py`). Lotes anteriores precisam de auditoria semelhante (pendente).

Revisão de temas junto com o lote UFCSPA: (1) 137 questões do banco (originais e importadas) com descolamento prematuro de placenta/placenta prévia/acretismo/rotura uterina estavam em "Hemorragias da 1ª metade" → movidas para "Hemorragias da 2ª metade"; (2) auditoria das decisões manuais dos lotes AMP-PR, UEPA e PUC-Sorocaba em que ficou o 1º palpite: 11 temas corrigidos; (3) 16 questões que dependiam do "caso da questão anterior" sem trazer o caso passaram a trazê-lo (`casos_anteriores.py`); as que não têm caso recuperável (q58456, q17319, q71870/q71871) ficaram como estão. Ferramentas novas: `corrigir_temas.py`, `regras_tema.py`, `pos_extrair.py`, `grudadas.py`.

Banco após o lote 11: 47.031 questões (789 marcadas como `repetidaDe`, fora do banco e mantidas na prova completa).

### Melhorias do pipeline (18/10)
- Revisão dos 89 conflitos de `marcar_repetidas` (mesma questão, gabarito diferente): 34 gabaritos corrigidos pela resposta clinicamente correta (ex.: von Willebrand com TTPa que corrige na mistura; profilaxia ARV de RN < 34 sem só com AZT; SHU por E. coli), 30 cópias marcadas manualmente como `repetidaDe` (texto quebrado ou equivalente), 22 pares de questões diferentes silenciados. 7 pares com gabarito oficial divergente e resposta discutível ficaram como estão. Arquivos: `scratchpad/imp/repetidas_manuais.json` e `conflitos_ignorados.json`.
- Limpeza de lixo de PDF nos lotes antigos: 537 alternativas com gabarito impresso, "Respostas:", cabeçalho de página ("GRUPO 01 / ESPECIALIDADES COM ACESSO DIRETO"), marca "v v a r e", instruções do caderno ou início da questão seguinte colados no fim; 41 cabeçalhos colados na mesma linha; 17 alternativas finais que só tinham lixo descartadas; 12 questões irrecuperáveis (alternativa vazia/embaralhada) removidas.
- Extrator remove o aviso da MedCof "Obs.: a foto apresentada também está com baixa resolução…" e a marca "MedCof" no fim do texto (11 publicadas corrigidas).
- Rótulos de prova padronizados (`rotulo_padrao` no extrator): "Prova Ii" → "(prova II)", "Pediatrica" → "Pediátrica", "Médula" → "Medula" etc.; 518 publicadas corrigidas.
- `repetidaDe`: questão da R+ que repete a da R1 da mesma instituição (às vezes com alternativas embaralhadas) sai do banco/sorteios e fica só na prova completa (PR #133). `scratchpad/imp/marcar_repetidas.py` roda a cada publicação; pares com resposta correta diferente ficam em `conflitos_repetidas.json` para revisão.
- Trava "adulto em tema pediátrico" no `aplicar_lote.py` (bloqueia a publicação até decidir com `forcar`); 24 questões já publicadas corrigidas (PR #132).
- `decisoes.json` aceita `"excluir": true` (+ `motivo`) para tirar uma questão específica do lote.
- Filtro de qualidade reprova "cita imagem/tabela que não veio"; o regex `CITA_IMAGEM` do extrator estava quebrado (`b(` em vez de `(`). 7 questões publicadas sem a imagem citada foram removidas.
- Corretor: "l" no lugar de "I" maiúsculo ("lsoimunização").
- `montar_lote.py`: com alternativas genéricas ("Apenas I", "I, II e III") só o enunciado decide o casamento (havia casado questões diferentes); 6 questões publicadas sobrescritas por engano restauradas.
- Filtro reprova "preencha as lacunas" sem a lacuna no texto (o "____" se perdeu); 8 publicadas removidas.
- `depende.py`: enunciado curto que só remete ao caso ("Em relação ao quadro clínico, qual a conduta?").
- `montar_lote.py`: questão do banco casada com várias do lote (mesmo caderno na R1 e na R+): se todas são cópias fiéis, a 1ª (R1, ano mais antigo) enriquece e as demais entram como novas com o tema do banco (`marcar_repetidas` as deixa só na prova completa); antes iam todas para revisão.
- Filtro: "mostrada em anexo" sem imagem; `depende.py`: "caso clínico anterior".
- Itens Certo/Errado (Cebraspe): alternativas "Certo." / "Errado." (formato dos 698 já existentes) e a assertiva em linha própria; no casamento com o banco, na deduplicação do lote e no `marcar_repetidas` o fim do enunciado (a assertiva) decide, porque vários itens dividem o mesmo caso.
- Extrator: caso compartilhado ("Atenção: Caso clínico para responder às questões de 6 a 8.") vai para o início de cada questão do grupo, em vez de grudar na última alternativa da anterior; quando o caso está escrito dentro da 1ª questão, as seguintes recebem esse texto sem a pergunta final. Resolve também o formato PSU-MG 2025 (reprocessar).
- Filtro: "dois casos no mesmo enunciado" e "trecho repetido" (PDFs da SES-DF 2024 com casos colados); `depende.py`: perguntas curtas que remetem a "caso clínico mencionado", "dessa paciente".
- SES-DF R+ Medicina Paliativa 2021/2022 (229 itens Certo/Errado sem alternativas impressas e com o caso deslocado) ficou de fora.
- Extrator: gabarito procurado também antes das páginas de respostas discursivas (SUS-BA); caso compartilhado no formato "Situação-Problema: Questões de 4 a 6".
- Filtro: "pergunta sem o caso" (caso perdido no próprio PDF, ex.: "Indique o diagnóstico desse caso.").
- `quase_dup`: itens Certo/Errado comparados pela assertiva — o `marcar_repetidas` travava (todos têm as mesmas alternativas).
- Extrator: grade de gabarito pequena (< 20 questões) aceita quando a página traz "GABARITO"; letra levemente acima da caixa do número (fontes grandes) reconhecida.
- Filtro: "tabela 1", "quadro 2" sem a imagem.
- Testes de navegador (`pw-test`): seletor de "Criar conta" atualizado para a tela de login nova (#141).
- `tipo_pela_capa` ignora a capa quando ela traz o começo da 1ª questão em vez do programa.

### Pendências
- O filtro "parênteses desbalanceados" tinha falso positivo ("(figura A)"); corrigido no lote 14. Nos lotes 1–13 algumas questões boas ficaram de fora por isso (ver `lotes/<SIGLA>/reprovadas.json`) — reprocessar.
- Questões que dependem da anterior: `soNaProva` (só na prova completa); detector em `scratchpad/imp/depende.py`.
- PSU-MG: reprocessar com o extrator novo (caso compartilhado do formato 2025) para recuperar as 21 excluídas.
- 43 pares "parecidos com resposta diferente" (`conflitos_repetidas.json`) para revisar.
- IA: a rota do Gemini no Worker não exige login. Proposta (adiada pelo usuário): login para usar a IA, cota diária por pessoa (~20), teto global (~800/dia) e cache compartilhado de respostas.
- Admin: ADMIN_EMAILS definido (2 contas); tabela `invites` criada no D1 — o cadastro agora exige convite.

## Pré-processamento (só automático, nada publicado) — 20 instituições
`scratchpad/imp/pre_lotes.py` → `scratchpad/imp/status.json` e `lotes/<SIGLA>/`. Total ≈ 19,9 mil extraídas; ≈ 14,6 mil novas; ≈ 4,3 mil já existiam.
| Instituição | Aprovadas | Revisão (formato) | Novas | Já existiam | Conflitos | Baixa confiança |
|---|---|---|---|---|---|---|
| UNICAMP | 1039 | 601 (provas em formato não suportado) | 658 | 360 | 21 | ~437 |
| SUS-SP | 1696 | 4 | 1362 | 318 | 16 | 861 |
| UNITAU | 320 | 240 (sem gabarito) | 270 | 44 | 6 | 143 |
| USP-SP | 879 | 205 (formato) | 665 | 207 | 7 | ~420 |
| UNIFESP | 1320 | 202 (formato) | 921 | 276 | 123 | ~570 |
| ABC-SP | 1393 | 7 | 1067 | 302 | 24 | ~660 |
| HIAE-SP | 925 | 0 | 725 | 171 | 29 | 470 |
| SES-RJ | 1099 | 1 | 860 | 212 | 27 | 524 |
| SUS-BA | 255 | 420 (formato) | 209 | 46 | 0 | 160 |
| SES-DF | 267 | 953 (itens Certo/Errado) | 260 | 0 | 7 | 145 |
| UERJ | 890 | 0 | 654 | 227 | 9 | 435 |
| UFRJ | 1199 | 1 | 868 | 326 | 5 | 562 |
| UNESP | 1008 | 2 | 699 | 300 | 9 | 409 |
| USP-RP | 1117 | 3 | 837 | 275 | 5 | 558 |
| AMRIGS | 1000 | 0 | 661 | 189 | 150 (86 gabaritos ≠: investigar alinhamento) | 444 |
| SURCE | 600 | 0 | 425 | 168 | 7 | 293 |
| IAMSPE-SP | 719 | 121 (formato) | 537 | 174 | 8 | 329 |
| PSU-MG | 810 | 0 | 612 | 185 | 13 | 412 |
| SCM-SP | 999 | 1 | 733 | 252 | 14 | 491 |
| FAMERP | 558 | 2 | 418 | 131 | 9 | 263 |

Pendências técnicas antes desses lotes: suportar os formatos que falharam (UNICAMP, SUS-BA, UNITAU, USP-SP, UNIFESP, IAMSPE); itens Certo/Errado (SES-DF); conferir gabarito da AMRIGS.

## Decisões do usuário (18/10)
1. Classificação: não depender dele → automático + minha revisão das de baixa confiança.
2. Flashcards: gerar cards a partir das questões (feito).
3. Certo/Errado: manter como 2 alternativas.
4. Conflitos ENARE: fica o gabarito do banco nos dois.
5. Sem número da questão no banco; incluir R+; sem título de especialista; atenção a erros de digitação/formatação.
