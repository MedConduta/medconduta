# MedConduta

Plataforma web pessoal para (1) estudo estruturado voltado à residência médica (R1) e
(2) consulta rápida à beira do leito ("guia de bolso"). **Não é gamificada** — sem
pontos, níveis, rankings ou badges. O foco é rigor acadêmico e utilidade clínica prática.

PWA instalável, funciona offline (o guia de bolso precisa estar disponível sem
internet), sem necessidade de login. HTML5 + CSS3 + JavaScript vanilla (ES modules) —
sem framework.

## ⚠️ Aviso clínico — leia antes de usar ou adaptar

**Todo o conteúdo clínico deste projeto (doses, posologias, fluxos diagnósticos e
terapêuticos, contraindicações) é PLACEHOLDER de estudo, escrito para demonstrar a
estrutura da plataforma.** Não foi validado por nenhuma fonte oficial nem revisado por
médico responsável, e **não deve ser usado para decisões assistenciais reais**.

Cada item clínico no JSON carrega os campos:

```json
{
  "revisado": false,
  "fonte": ""
}
```

- `revisado`: `true` somente depois que o conteúdo for de fato conferido em fonte
  oficial (diretriz de sociedade médica, protocolo institucional, bula) e revisado por
  um médico responsável.
- `fonte`: referência da fonte usada na validação (ex.: "Diretriz Brasileira de
  Hipertensão 2020, SBC").

Toda tela que exibe conteúdo clínico (temas de conteúdo, fluxogramas, guia de bolso,
prescrições) mostra um banner de aviso (`app/components/clinicalWarning.js`) reforçando
esse ponto e indicando se o item já foi marcado como revisado. **Antes de usar este
projeto para fins reais, revise e valide cada item um a um.**

## Estrutura de pastas

```
MedConduta/
├── index.html            # shell da SPA (sidebar + topbar + <main>)
├── manifest.json          # manifesto do PWA
├── sw.js                  # service worker (cache offline)
├── app/
│   ├── main.js             # bootstrap: rotas, sidebar, tema, registro do SW
│   ├── router.js           # roteador hash (#/area/secao/:id)
│   ├── db.js                # IndexedDB (fallback localStorage) — progresso, SM-2, prefs
│   ├── sm2.js                # algoritmo de repetição espaçada (SM-2)
│   ├── planner.js             # geração da fila do planejador de estudo do dia
│   ├── theme.js                # alternância de tema claro/escuro/automático
│   ├── utils.js                 # helpers (escape HTML, fetch com cache, etc.)
│   ├── components/
│   │   ├── sidebar.js            # navegação lateral e bottom-nav mobile
│   │   ├── icons.js               # ícones SVG inline
│   │   ├── clinicalWarning.js      # banner obrigatório de aviso clínico
│   │   └── flowchart.js             # renderização de fluxogramas a partir de JSON
│   └── views/                        # uma view por seção da navegação
│       ├── conteudo.js, revisao.js, flashcards.js, fluxogramas.js,
│       │   questoes.js, planejador.js  → Área 1 (Residência)
│       └── guiaClinico.js (compartilhado), guiaAB.js, guiaUrgencia.js,
│           prescricoes.js               → Área 2 (Guia de bolso)
├── data/                    # todo o conteúdo em JSON, separado do código
│   ├── temas.json             # resumos de residência + mnemônicos
│   ├── flashcards.json          # baralhos frente/verso
│   ├── fluxogramas.json           # fluxos de diagnóstico e tratamento
│   ├── questoes.json                # banco de questões com comentário
│   ├── guia_ab.json                   # atenção básica
│   ├── guia_urgencia.json               # urgência/emergência
│   └── prescricoes.json                   # condutas rápidas / modelos de prescrição
├── styles/
│   ├── tokens.css   # cores, tipografia, espaçamento, forma (claro + escuro)
│   ├── base.css      # reset e tipografia base
│   ├── layout.css     # sidebar, topbar, bottom-nav, grids responsivos
│   └── components.css  # cards, badges, flashcards, fluxogramas, prescrições, etc.
└── icons/
    ├── icon.svg           # ícone padrão do PWA
    └── icon-maskable.svg    # variante com área de segurança para ícones "maskable"
```

## Como rodar localmente

Como o app usa `fetch()` para carregar os JSONs de `/data`, é preciso servir os
arquivos por HTTP (abrir `index.html` direto como `file://` não funciona por causa de
CORS). Qualquer servidor estático resolve, por exemplo:

```bash
npx serve .
```

ou

```bash
python -m http.server 8080
```

Depois acesse `http://localhost:PORTA/`.

## Deploy no GitHub Pages

1. Suba o conteúdo desta pasta para um repositório no GitHub.
2. Em **Settings → Pages**, selecione a branch (ex.: `main`) e a pasta raiz (`/`).
3. Como o projeto usa apenas caminhos relativos (`./`), funciona tanto na raiz do
   domínio quanto em um subcaminho de projeto (`usuario.github.io/repo/`).

## Como adicionar conteúdo novo

Todo o conteúdo vive em `/data/*.json` — não é necessário mexer em JavaScript para
adicionar um tema, flashcard, fluxograma, questão ou item do guia de bolso.

- **Novo tema de residência**: adicione um objeto em `data/temas.json` seguindo o
  formato existente (`secoes`, `mnemonicos`, `revisado`, `fonte`).
- **Novo baralho/flashcards**: adicione em `data/flashcards.json`, associando
  `temaId` ao tema correspondente quando fizer sentido.
- **Novo fluxograma**: em `data/fluxogramas.json`. Cada nó tem um `tipo`
  (`start`, `action`, `decisao`, `alerta`, `end`); nós do tipo `decisao` têm um
  array `ramos`, cada ramo com seu próprio sub-fluxo (`fluxo`), permitindo
  ramificações aninhadas.
- **Nova questão**: em `data/questoes.json`, com `alternativas` (array de strings) e
  `correta` (índice da alternativa correta, começando em 0).
- **Novo item de guia de bolso**: em `data/guia_ab.json` ou `data/guia_urgencia.json`,
  com `pontos` (lista de condutas) e `red_flags` (sinais de alerta).
- **Nova prescrição**: em `data/prescricoes.json`, com `posologia`,
  `orientacao_paciente` e `contraindicacoes`.

Em todos os casos com relevância clínica, **sempre inclua `"revisado": false` e
`"fonte": ""` até que o conteúdo seja de fato validado.**

## Persistência local

Todo o progresso do usuário (estado de repetição espaçada por flashcard, temas
marcados como estudados, respostas de questões, preferência de tema) é salvo
localmente via IndexedDB (com fallback automático em `localStorage` caso o navegador
não suporte). Nada é enviado a servidor algum — o app funciona 100% no dispositivo do
usuário, sem exigir conta ou login.

## Limitações conhecidas

- O conteúdo clínico é de demonstração/estudo pessoal, não uma base médica validada
  (ver aviso no topo deste README).
- O algoritmo de repetição espaçada é uma implementação própria inspirada no SM-2
  clássico, não uma cópia de nenhuma implementação de terceiros.
- Ícones do PWA estão em SVG; alguns navegadores/plataformas (principalmente iOS mais
  antigo) preferem PNG para o ícone de tela inicial — considere gerar PNGs a partir
  de `icons/icon.svg` se notar problemas de exibição em um dispositivo específico.
- Não há sincronização entre dispositivos — o progresso é local a cada navegador.
