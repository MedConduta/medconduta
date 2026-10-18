# Progresso — banco particionado e importação de questões

Arquivo de retomada (atualizado a cada etapa). Regras combinadas:
- IDs de questões nunca mudam; cópias mescladas guardam os ids absorvidos em `aliases`.
- `origem` (MedCof/Medway/…) é só interno: sem filtro e sem aparecer na tela.
- Importação por instituição, **SES-PE por último**. Nenhum lote é publicado sem o usuário conferir a amostra (~30 questões, página HTML).
- Classificação: classificador TF-IDF (scikit-learn) treinado no banco; só os de baixa confiança vêm para revisão manual.
- Validação automática por script (gabarito, 4–5 alternativas, imagem citada encontrada, sem duplicata); reprovados → lista de revisão.
- Service worker: só o índice no pré-cache; especialidades e imagens entram no cache ao abrir. Versão atual: **v126**.
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
- [x] Lote 1 ENARE preparado; página de conferência: https://claude.ai/artifact/3a5WUUXF6Ci8ocv5KYAsm4 (veredictos na coleção `veredictos`)
- [ ] **Aguardando conferência do usuário** para `python aplicar_lote.py ENARE --publicar`

## Plataforma
- [x] Filtro por instituição (tela de Questões) e por ano (já existia)
- [x] Imagem dentro da questão com zoom (PR #120)
- [x] "Prova completa" em Simulados: provas reais com numeração (instituição + ano/edição), na ordem, anuladas fora da correção — `pw-test/test_prova_completa.js` (testado com o ENARE aplicado só localmente)
- [x] Foco no Curso: usa as questões novas automaticamente (filtra por tema via índice)
- [ ] Flashcards: são um baralho à parte (data/flashcards.json), não leem o banco. **Dúvida para o usuário**: link "praticar questões deste tema" no card, ou gerar cards a partir das questões?

## Lotes
| Lote | Instituição | Provas | Questões extraídas | Novas | Revisão | Status |
|---|---|---|---|---|---|---|
| 1 | ENARE | 2021, 2022, 2023, 2024, 2025 (10 simulados MedCof e 1 "FGV 2024" sem rótulo excluídos) | 500 (23 anuladas) | 382 novas + 116 já existiam (ganham instituição/ano/número) | 52 temas duvidosos; 2 conflitos de gabarito (2022 q91, 2023 q16) | aguardando conferência |
