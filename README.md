# MedConduta

Plataforma web pessoal para estudo estruturado voltado à residência médica (R1).
**Não é gamificada** — sem pontos, níveis, rankings ou badges. O foco é rigor
acadêmico e utilidade clínica prática.

> A área de consulta rápida à beira do leito ("guia de bolso" — Atenção Básica,
> Urgência/Emergência e Condutas rápidas) foi removida intencionalmente e será
> reconstruída do zero em uma etapa futura.

PWA instalável, funciona offline, sem necessidade de login. HTML5 + CSS3 + JavaScript
vanilla (ES modules) — sem framework.

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

O banner de aviso em tela foi removido da interface a pedido do mantenedor do projeto
(médico), que já tem ciência da necessidade de validação. Os campos `revisado`/`fonte`
permanecem no JSON para quem quiser controlar o que já foi conferido. **Antes de usar
este projeto para fins reais, revise e valide cada item um a um.**

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
│   ├── ai.js                     # cliente do assistente de IA (fala com o Worker)
│   ├── rag.js                     # busca de contexto por palavra-chave (RAG simples)
│   ├── areas.js                   # mapa subespecialidade → grande área (Conteúdo + IA)
│   ├── iaConteudo.js               # geração de temas/flashcards/questões por IA (com autocrítica)
│   ├── components/
│   │   ├── sidebar.js            # navegação lateral e bottom-nav mobile
│   │   ├── icons.js               # ícones SVG inline
│   │   └── flowchart.js             # renderização de fluxogramas a partir de JSON
│   └── views/                        # uma view por seção da navegação
│       └── conteudo.js (mostra também flashcards e fluxogramas do tema,
│           via components/flowchart.js), assistente.js, revisao.js,
│           flashcards.js, questoes.js, planejador.js  → Residência
├── data/                    # todo o conteúdo em JSON, separado do código
│   ├── temas.json             # resumos de residência + mnemônicos
│   ├── flashcards.json          # baralhos frente/verso
│   ├── fluxogramas.json           # fluxos de diagnóstico e tratamento
│   └── questoes.json                # banco de questões com comentário
├── styles/
│   ├── tokens.css   # cores, tipografia, espaçamento, forma (claro + escuro)
│   ├── base.css      # reset e tipografia base
│   ├── layout.css     # sidebar, topbar, bottom-nav, grids responsivos
│   └── components.css  # cards, badges, flashcards, fluxogramas, etc.
├── icons/
│   ├── icon.svg           # ícone padrão do PWA
│   └── icon-maskable.svg    # variante com área de segurança para ícones "maskable"
└── worker/                   # Worker Cloudflare (proxy gratuito para o Gemini)
    ├── src/index.js            # código do Worker
    ├── wrangler.toml             # configuração de deploy
    └── package.json               # scripts (login, dev, deploy, secret)
```

## Assistente de IA (opcional, gratuito)

O MedConduta é um site estático — não tem servidor próprio para guardar uma chave de
API com segurança. Por isso o assistente de IA usa um **Worker da Cloudflare**
(hospedagem serverless com plano gratuito) como intermediário: ele guarda a chave do
Gemini do lado do servidor e só repassa pergunta + contexto, sem nunca expor a chave
no navegador. Essa arquitetura é o padrão chamado **RAG** (Retrieval-Augmented
Generation): em vez de depender do que o modelo "sabe" do treinamento (que fica
desatualizado), o app manda o conteúdo relevante (temas do MedConduta, e no futuro
PDFs de prescrição/resumos que você adicionar) junto com a pergunta — o modelo responde
com base nisso, então a atualidade da informação depende do seu conteúdo, não do
treino do modelo.

**O assistente é opcional** para quem clonar o projeto: se você não publicar seu
próprio Worker, os botões de IA simplesmente vão falhar com um erro de conexão — o
resto do app funciona normalmente. Não há mais tela de configuração — a URL do Worker
fica fixa em `app/ai.js` (`ENDPOINT_PADRAO`); para trocar de Worker, edite essa
constante.

### O que a IA faz hoje

- **Assistente de perguntas** (chat, tela "Assistente IA"): responde com base no
  conteúdo do MedConduta (RAG por busca de palavra-chave em `data/temas.json`).
- **Por tema** (botões na tela de cada tema): "Explicar mais / dar exemplo clínico",
  "Avaliar tema com IA" (crítica do conteúdo existente, aponta desatualizações), "Gerar
  flashcards com IA" e "Gerar questão de treino".
- **Criar tema novo com IA** (botão no topo da lista de Conteúdo): gera um tema
  completo (seções, mnemônico, fonte sugerida) a partir de um tópico livre.

Os três últimos (criar tema, gerar flashcards, gerar questão) fazem **duas chamadas**
à IA: um rascunho, e uma segunda chamada pedindo que a própria IA revise/corrija
criticamente o rascunho antes de salvar — por isso demoram uns 10-25 segundos. O
resultado final é salvo no **IndexedDB do navegador** (não no repositório) e aparece
mesclado com o conteúdo curado nas telas de Conteúdo/Flashcards/Questões, sempre com
uma etiqueta **"✨ IA"** e, quando houver, a nota da autocrítica. Como fica só no
IndexedDB, esse conteúdo é local a cada navegador/dispositivo — não é sincronizado nem
vai para o GitHub Pages automaticamente.

### Passo a passo para ativar (gratuito)

1. **Gerar uma chave de API do Gemini** (gratuita): acesse
   [aistudio.google.com/apikey](https://aistudio.google.com/apikey), faça login com
   uma conta Google e crie uma chave. Guarde-a — ela não deve ir para o repositório.
2. **Criar uma conta gratuita na Cloudflare**: [dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up).
3. **Ajustar a origem permitida**: abra `worker/src/index.js` e edite a constante
   `ALLOWED_ORIGINS` no topo do arquivo, colocando a URL real onde o MedConduta está
   publicado (ex.: `https://medconduta.github.io` ou seu domínio do GitHub Pages).
4. No terminal, dentro da pasta `worker/`, rode (cada comando abre o navegador ou pede
   input — precisa ser rodado por você, interativamente):
   ```bash
   npx wrangler login
   npx wrangler secret put GEMINI_API_KEY
   npx wrangler deploy
   ```
   O último comando imprime uma URL do tipo
   `https://medconduta-ai.SEUUSUARIO.workers.dev`.
5. Cole essa URL em `ENDPOINT_PADRAO`, no topo de `app/ai.js`, e publique o app.

### Limites do plano gratuito

O modelo padrão configurado é o `gemini-3.5-flash-lite` (o `gemini-2.5-flash-lite` foi
descontinuado para novos usuários em 2026), que no plano gratuito do Google permite
~1.000 requisições/dia e 15/minuto — suficiente para uso pessoal mesmo com os fluxos
de 2 chamadas. O Worker já tenta de novo automaticamente (até 2 vezes, com espera
curta) se o Gemini responder 503/429, que é comum e transitório no tier gratuito. Se a
Google mudar esses limites ou nomes de modelo no futuro, ajuste a constante
`MODELO_PADRAO` em `worker/src/index.js` (ou defina `GEMINI_MODEL` em
`wrangler.toml`), sem precisar mexer no restante do app.

### Segurança

O Worker só aceita requisições da origem configurada em `ALLOWED_ORIGINS` (protege
contra uso casual por outros sites), mas como o código é público (repositório aberto),
alguém determinado poderia inspecionar a rede do seu site publicado e chamar o Worker
diretamente. Para um projeto de uso pessoal isso é um risco aceitável — se algum dia
virar um problema (a chave do Gemini estourar a cota), a mitigação mais simples é
adicionar um limite de requisições por IP usando o Cloudflare Workers KV (gratuito),
não implementado nesta primeira versão para manter o setup simples.

### Próximas funcionalidades planejadas (mesma infraestrutura)

Ainda não implementados, usando a mesma base: montar simulados por IA e indexar PDFs
de prescrição/resumos de cursinho que você adicionar (hoje o RAG busca só em
`data/temas.json`).

## Backend e login (Cloudflare D1)

A partir desta versão, o MedConduta exige uma conta (e-mail + senha) para usar o app —
os dados de estudo (progresso, respostas, flashcards, preferências, conteúdo gerado por
IA) deixaram de ficar só no IndexedDB do navegador e passaram a ser salvos num banco
compartilhado, acessível de qualquer aparelho. Isso usa o mesmo Worker Cloudflare do
assistente de IA, agora também com um banco **D1** (SQLite gerenciado, plano gratuito) e
rotas de autenticação (`/auth/register`, `/auth/login`, `/auth/logout`) e dados
(`/data/:store[/:id]`), protegidas por um token de sessão opaco.

### Passo a passo para ativar

1. Siga primeiro os passos 1-4 da seção "Assistente de IA" acima (conta Cloudflare,
   `npx wrangler login`, chave do Gemini) — o mesmo Worker atende as duas funções.
2. Dentro de `worker/`, crie o banco D1:
   ```bash
   npx wrangler d1 create medconduta
   ```
   O comando imprime um bloco com `database_id`. Cole esse valor em
   `worker/wrangler.toml`, no lugar de `COLOQUE_AQUI_O_ID_RETORNADO_POR_WRANGLER_D1_CREATE`.
3. Aplique o schema (`worker/schema.sql`) no banco remoto:
   ```bash
   npx wrangler d1 execute medconduta --remote --file=schema.sql
   ```
4. Publique o Worker novamente para ele passar a enxergar o banco:
   ```bash
   npx wrangler deploy
   ```

**Sem esses passos, a tela de login aparece mas registrar/entrar falha** com erro de
conexão — o app não abre além dela, já que agora a autenticação é obrigatória.

### O que fica salvo e como

Cada usuário tem sua própria senha (hash PBKDF2 com salt aleatório, nunca salva em
texto puro) e seus próprios dados — os mesmos "compartimentos" que já existiam no
IndexedDB (`srs`, `prefs`, `progresso`, `respostas`, `ia_temas`, `ia_flashcards`,
`ia_questoes`) viraram linhas de uma tabela `records` no D1, uma por usuário. O
restante do app (telas de Conteúdo, Flashcards, Questões, Revisão, IA) não muda: continua
chamando as mesmas funções de `app/db.js`, que por baixo agora fala com o Worker em vez
do IndexedDB.

### Limitações desta primeira versão

- Sem cache local/fila offline: cada leitura/escrita é uma chamada de rede — sem
  internet, o app para de salvar (mas não trava; ver `app/db.js`).
- Sessão expira em 30 dias (token opaco em `sessions`, sem renovação automática ainda).

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
adicionar um tema, flashcard, fluxograma ou questão.

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
