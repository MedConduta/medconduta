# Resumo — Tarefa 1: imagens das questões SES-PE

Data: 17–18/10/2026 · Branch: `claude/sespe-imagens-questoes`

## 1. Quantas questões SES-PE existiam no banco (antes) × provas

Banca no banco: `IAUPE / SES-PE` (1.923 questões antes; mais 19 avulsas com banca `SES-PE…`, não mexidas).
O extrator antigo gravou só o ano inteiro (`2019.2` → 2019), por isso 2019, 2020 e 2026 aparecem com ~194:
são duas provas no mesmo ano. A tabela usa o rótulo da prova (campo `fonte`).

"Válidas" = 100 − anuladas no gabarito definitivo oficial. "Faltam" = questões da prova sem
correspondente no banco (cruzamento por enunciado e por alternativas), só nas provas com PDF MedCof de texto;
"—" = nada faltando ou sem PDF para cruzar.

| Prova | No banco (antes) | Válidas na prova | No banco (depois) | Ainda faltam (sem imagem) |
|---|---|---|---|---|
| 2010 | 96 | 96 | 96 | — |
| 2011 | 95 | 96 | 95 | — |
| 2012 | 93 | 94 | 93 | — |
| 2013 | 96 | 97 | 96 | — |
| 2014 | 96 | 96 | 96 | — |
| 2015 | 97 | 97 | 97 | — |
| 2016 | 98 | 98 | 98 | 1 |
| 2017.2 | 99 | 99 | 99 | — |
| 2018 | 98 | 98 | 98 | 2 |
| 2019 | 97 | 97 | 97 | — |
| 2019.2 | 97 | 97 | 97 | — |
| 2020 | 95 | 96 | 96 | 2 |
| 2020.2 | 97 | 97 | 97 | 3 |
| 2021 | 93 | 95 | 93 | 1 |
| 2022 | 93 | 95 | 93 | 3 |
| 2023 | 97 | 98 | 97 | 1 |
| **2023.2** | **0** | 99 | 4 | **79** |
| **2024** | **0** | 97 | 11 | **72** |
| 2024.2 | 95 | 96 | 95 | 2 |
| **2025.1** | **0** | 98 | 12 | **74** |
| 2025.2 | 97 | 98 | 97 | 2 |
| 2026 | 96 | 96 | 96 | — |
| 2026.2 | 98 | 98 | 98 | — |

Principal achado: **três provas R1 inteiras não estavam no banco** — 2023.2, 2024 (o PDF oficial é
escaneado, sem texto, e o extrator antigo não conseguiu ler) e 2025.1. Pelas regras da tarefa, só entraram
as questões **com imagem** delas; as demais continuam faltando (ver pendências).

### Fontes usadas
- **Pasta oficial** (`OneDrive/Provas Residência SES - PE`): provas e gabaritos definitivos 2010–2026.
  Prevalecem para gabarito e imagem.
- **MedCof** (`11 - Bancos…/MedCof/Banco de Provas MedCof/SES-PE - R1*`): texto limpo e gabarito; usada para o
  texto das questões, para a prova 2023.2 (não existe na pasta oficial) e para 2024 (oficial escaneada).
  Os gabaritos MedCof batem 100% com os oficiais, exceto 2019 q45 (MedCof C; oficial D, que foi o usado).
- **Medway**: o texto vem renderizado como imagem (sem texto extraível); não foi usada.
- Nenhum PDF tem comentário das questões → comentário no padrão do banco: `Gabarito oficial: Alternativa X.`
- A origem MedCof/Medway não foi registrada em nenhum campo.

## 2. O que foi feito

**Dados (`data/questoes.json`)**
- Campo novo **`imagens`**: lista de caminhos, ex. `["imagens/questoes/sespe/2024-q026-1.webp"]`.
- **77 questões SES-PE existentes** receberam imagem.
- **28 questões novas** (q29488–q29515), todas com imagem, banca `IAUPE / SES-PE`, ano da prova,
  `fonte` "Processo Seletivo de Residência Médica SES-PE <prova>", gabarito oficial, `revisado: true`
  (padrão das demais SES-PE) e tema classificado entre os temas existentes:
  2020 (1), 2023.2 (4), 2024 (11), 2025.1 (12).
- **17 cópias "Estratégia MED"** de questões SES-PE com imagem também receberam a imagem (a mesma questão aparece
  com as duas bancas; não apaguei nenhuma, porque os IDs podem estar no histórico de respostas dos usuários).
- **Nenhuma questão nova duplicada**: antes de inserir, cruzei por enunciado normalizado **e** por alternativas.
  As 3 que eu tinha marcado para trocar de "Estratégia" para SES-PE (q13905, q17000, q17424) na verdade já tinham
  versão SES-PE no banco, com o enunciado truncado → em vez de duplicar/reclassificar, usei a versão SES-PE
  (q28541, q28789, q28984). O mesmo valeu para mais 4 que pareciam novas (q28788, q28828, q29264, q29411).
- **Correções nas questões tocadas** (texto quebrado pelo extrator antigo): 7 enunciados truncados completados com o
  texto da prova (q28336, q28788, q28789, q28828, q29264, q29265, q29411) e rodapés/cabeçalhos de página
  ("7 ACESSO DIRETO", "GRUPO 01…", a capa inteira da prova em q28196) removidos de alternativas em 13 questões.
- 2 questões com imagem ignoradas por estarem **anuladas** (2021 q52 e q88).

**Imagens (`imagens/questoes/sespe/`)**: 114 arquivos WebP (qualidade 80, no máx. 1000 px de largura), 1,8 MB.
Recortadas na resolução nativa da prova oficial; quando a oficial não tem o original (tabelas que o PDF oficial
traz como texto, 2023.2, 2024 escaneada) vêm do PDF MedCof. Logos e títulos de seção descartados; a curva de
Langfitt (2019.2 q25) foi recortada com os rótulos dos eixos.

**Interface**
- `renderImagensQuestao` (`app/utils.js`) mostra as imagens abaixo do enunciado nas telas de **Questões**,
  **Erros** e **Simulados**.
- **Zoom ao tocar**: a imagem abre em tela cheia; tocar nela dobra o tamanho (com rolagem e pinça); fecha com
  o ✕, Esc ou tocando fora. Funciona em tema claro/escuro.
- Service worker `medconduta-v124`.

## 3. Conferência
- Gabarito armazenado × gabarito oficial: **105/105** questões tocadas conferem (todas as provas, não só amostra).
- Revisão visual de todas as imagens extraídas (folhas de contato) e de uma amostra por prova (16 provas) com
  imagem + enunciado + alternativas + gabarito lado a lado.
- Integridade: IDs únicos, temas válidos, todos os caminhos de imagem existem.

## 4. Testes
Os testes de `pw-test/` são scripts Playwright escritos para o ambiente de nuvem (Chromium em `/opt/pw-browsers`,
Worker real com convites). Rodei localmente com um Worker simulado (auth + `/data` em memória) e comparei com a `main`:

| Teste | `main` | branch |
|---|---|---|
| **test_questoes_imagens_sespe** (novo) | — | ✅ 10/10 verificações |
| test_fase3_smoke, test_questoes_reforma, _status, _chips, _busca_ordenacao, _hierarquia, _estratificacao, _mobile_url, _fase7, test_favoritos, test_fase9_simulados | ✅ | ✅ |
| test_fase5_erros | 3 verificações falsas | as mesmas 3 (pré-existentes) |
| test_motivo_erro | timeout | o mesmo timeout (pré-existente) |

Nenhum erro de JavaScript em nenhum teste. O teste novo confere: todas as 122 questões com imagem apontam
para arquivos existentes; a imagem aparece no card e cabe na largura do celular; tocar abre o zoom; tocar de novo
dobra o tamanho; ✕ e Esc fecham; questões sem imagem não ganham bloco vazio. Conferi também capturas de tela no
celular em tema escuro. As falhas de `test_fase5_erros`/`test_motivo_erro` e de testes que dependem de admin/Gemini
real acontecem igualmente na `main` (testes desatualizados ou dependentes do ambiente de nuvem).

## 5. Decisões tomadas sem você (opção conservadora)
1. **Banca**: usei `IAUPE / SES-PE`, que é o padrão real do banco (você escreveu "IAUPE-SESPE").
2. **Ano 2016 × 2017**: a prova que a MedCof e a Medway chamam de "2017" é a `PROVA 2016` da sua pasta e já está no
   banco como 2016 → mantive 2016.
3. **Gabarito divergente** (2019 q45, POP-Q): segui o gabarito definitivo oficial (D), que também é o que a imagem indica.
4. **Questões sem imagem das provas que faltam** (2023.2, 2024, 2025.1): não inseri — a tarefa pedia só as com imagem.
5. **Duplicatas "Estratégia"**: não apaguei nem reclassifiquei; só adicionei a imagem.
6. **Tabelas que viraram imagem** no PDF MedCof (ex.: quadros de epidemiologia) também foram anexadas como imagem,
   mesmo quando o enunciado já tem a tabela achatada em texto — ajuda a ler.
7. **2020 q26** (alternativas são as próprias radiografias A–E): alternativas gravadas como "Radiografia A…E".

## 6. Pendências e dúvidas
- **~225 questões sem imagem** das provas 2023.2, 2024 e 2025.1 não estão no banco (algumas dessas provas repetem
  questões de anos anteriores, que já estão lá), além de 1–3 por prova nas demais (tabela acima). Posso inserir numa próxima tarefa.
- **q29263** (2025.2 q76, vacina HPV): está corrompida no banco (alternativas A e B misturadas com o texto da q77).
  Não tem imagem, então não mexi.
- **Duplicatas SES-PE × "Estratégia MED"**: ~150 questões SES-PE R1 também existem como "Estratégia MED" (ano 2024).
  Quer que eu unifique (apagar a cópia exigiria migrar o histórico de respostas)?
- **5 questões SES-PE existem só com banca Estratégia** (sem versão SES-PE): q20351 (2016 q44), q19617 (2018 q43),
  q24333 (2021 q69), q16552 (2023.2 q89), q1794 (2025.1 q3, "Banco de questões — Estratégia MED"). Quer reclassificar?
- **Outras inconsistências antigas** vistas de passagem (não mexidas): entradas SES-PE que não correspondem a nenhuma
  questão da prova, como q28396 (2018), q28772/q28793/q28794 (2020), q28662/q28663 (2020.2) e q29269 (2025.2) — provavelmente
  pedaços de questões que o extrator antigo partiu.
- As provas oficiais com texto em mais de uma prova por ano continuam com o campo `ano` inteiro (2019, 2020, 2026),
  como o resto do banco; a edição exata está no campo `fonte`.
