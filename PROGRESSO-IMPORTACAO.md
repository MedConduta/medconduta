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
- [ ] PR e merge
- Qualidade (pré-existente, a revisar depois): 698 questões com só 2 alternativas, 2 com 3, 4 com alternativa vazia.

## Etapa 1 — importação por instituição
- [x] Inventário (`scratchpad/imp/inventario.py`): MedCof 6.850 PDFs (1.477 provas R1/acesso direto únicas, 229 instituições); Medway 1.774 (texto em imagem, sem OCR disponível)
- [x] Classificador (`scratchpad/imp/classificador.py`): holdout top-1 71,5%, top-3 90%; margem ≥ 0,5 cobre 56% com 84% de acerto
- Decisão: primeiro lote = ENARE (prova nacional; SES-PE por último)
- [ ] Extrator genérico MedCof + validação automática + fila de revisão
- [ ] Classificador de temas
- [ ] Lote 1 (primeira instituição) preparado + página de amostra para o usuário

## Lotes
| Lote | Instituição | Provas | Questões extraídas | Novas | Revisão | Status |
|---|---|---|---|---|---|---|
