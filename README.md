# República

**▶ Jogue online: https://joaomasc.github.io/republica-jogo/**

Simulador político e eleitoral jogável no navegador. Você cria um político cartoon, escolhe (ou funda) um partido, disputa eleições do município à Presidência, faz campanha com dinheiro, equipe, propaganda, entrevistas e debates — e, se vencer, governa um país com economia de verdade: mercado nacional, indústrias em 27 estados, comércio exterior, leis no estilo Victoria 3 (do liberalismo à economia planificada), decretos e um Congresso que tramita, engaveta, vota, veta e até abre impeachment. Cada partida conta uma história diferente.

> No mundo **Brasil real** (padrão), os partidos são os 30 registrados no TSE, com sigla, número e logo oficiais ([fontes e créditos](docs/PARTIDOS_REAIS.md)). Suas posições e forças são aproximações do modelo. Políticos, eventos, veículos de imprensa e institutos de pesquisa são **fictícios** em todos os mundos, e os mundos Fictício e Paródia também têm partidos inventados. Estados e cidades usam dados públicos do IBGE: malha territorial, população do Censo 2022 e as cidades-polo da REGIC 2018. Os efeitos de leis e da economia são de um **modelo simplificado de jogo**, não previsões sobre o mundo real, e nenhuma ideologia é tratada como moralmente superior.

## Sumário

- [Stack](#stack)
- [Como rodar](#como-rodar)
- [Publicação (GitHub Pages)](#publicação-github-pages)
- [Testes](#testes)
- [Arquitetura](#arquitetura)
- [Economia, leis e Congresso](#economia-leis-e-congresso)
- [Dinamismo: eventos, gabinete, rivais e carreira](#dinamismo-eventos-gabinete-rivais-e-carreira)
- [Estrutura de pastas](#estrutura-de-pastas)
- [Como estender o jogo](#como-estender-o-jogo)
- [IA generativa](#ia-generativa)
- [Banco de dados e saves](#banco-de-dados-e-saves)
- [Documentação de game design](docs/GAME_DESIGN.md) · [Nação: economia, leis e Legislativo](docs/DESIGN_NACAO.md) · [Roteiro de dinamismo](docs/ROADMAP_DINAMISMO.md) · [Banco de conteúdo](docs/BANCO_DE_CONTEUDO.md)

## Stack

| Camada        | Tecnologias                                                                             |
| ------------- | --------------------------------------------------------------------------------------- |
| Front-end     | React 19, TypeScript, Vite 8, Tailwind CSS 4, Zustand, React Router 8, Recharts, Lucide |
| Motor do jogo | TypeScript puro (sem dependências), determinístico por seed                             |
| Back-end      | Node.js, Fastify 5, API REST, Prisma 7 (PostgreSQL), SDK da Anthropic (opcional)        |
| Testes        | Vitest (unidade), Playwright (E2E)                                                      |
| Ferramentas   | ESLint 10, Prettier, Docker / Docker Compose, npm workspaces                            |

## Como rodar

Requisitos: **Node.js 20.19+** (testado com Node 24) e npm 10+. Docker é opcional.

```bash
npm install          # instala tudo e gera o cliente Prisma
npm run dev:web      # só o jogo (http://localhost:5173) — funciona 100% offline
npm run dev          # jogo + API (http://localhost:3333), com proxy /api
```

O jogo **não depende** do servidor, do banco nem de IA externa: sem eles, os saves ficam no `localStorage` e os textos são gerados proceduralmente.

### Com PostgreSQL

```bash
cp apps/server/.env.example apps/server/.env
docker compose up -d postgres      # sobe o banco
npm run db:migrate                 # aplica as migrações (Prisma)
npm run dev
```

Sem `DATABASE_URL` (ou com o banco fora do ar) o servidor usa armazenamento em memória e avisa no log.

### Tudo em contêineres

```bash
docker compose --profile full up --build   # web em http://localhost:8080, API em :3333
```

### Build de produção

```bash
npm run build        # web (apps/web/dist) + servidor (apps/server/dist)
npm run preview      # serve o build do front em http://localhost:4173
```

## Publicação (GitHub Pages)

O site é estático (a IA usa textos procedurais e os saves ficam no navegador de cada jogador), então pode ser publicado no GitHub Pages:

- `npm run deploy:pages` — faz o build com o caminho do repositório (`/republica-jogo/`) e envia para a branch `gh-pages`. Não depende do GitHub Actions.
- `.github/workflows/deploy.yml` faz o mesmo automaticamente a cada push na `main` (quando o GitHub Actions estiver disponível na conta; aí basta mudar a origem do Pages para "GitHub Actions").

A IA generativa e os saves na nuvem precisam do servidor (`apps/server`), que não vai junto para o Pages.

## Testes

```bash
npm test                         # Vitest: motor (eleição, população, campanha, dinheiro, eventos, leis, economia, save) + API
npm run test:e2e                 # Playwright: criar candidato → campanha → eleição → resultado → salvar → carregar
PW_CHANNEL=chrome npm run test:e2e   # usa o Chrome instalado (se `npx playwright install chromium` não for possível)
npm run test:perf                # tempo de quadro do mapa (zoom, arrasto, voo) e abertura de painéis, isolado
npm run typecheck && npm run lint
npm run check                    # typecheck + lint + testes + build
npm run simulate -- presidente SP 10   # ferramenta de balanceamento: bots jogam N campanhas
```

## Arquitetura

```
apps/web  ──usa──▶  packages/ui  ──usa──▶  packages/game-engine  ◀──usa──  apps/server
   │                                              ▲                           │
   └──────────────── packages/shared (rotas e DTOs da API) ───────────────────┘
```

- **`packages/game-engine` é o coração.** TypeScript puro, sem React e sem acesso a navegador ou rede. Todo o estado do jogo (`GameState`) é um objeto JSON serializável. A API é funcional: `dispatch(state, action) → { state, result }` devolve um **novo** estado e nunca altera o original (falhas devolvem o estado intacto). Isso permite reaproveitar o motor em multiplayer, bots, ferramentas de balanceamento ou no servidor sem reescrever nada.
- **Determinismo:** todo sorteio passa por um RNG com seed (`mulberry32`) guardado no estado. A mesma seed + as mesmas ações produzem a mesma partida; `simulateElection(state, { seed })` é pura e reprodutível.
- **Balanceamento centralizado:** todos os números de gameplay ficam em `packages/game-engine/src/config/constants.ts` (`GameConstants`) e `config/difficulty.ts`.
- **Dados como dados:** partidos, Pops, estados, leis, eventos, propostas, cargos e cenários são arquivos `*.data.ts` / tabelas tipadas.
- **Front-end só representa e envia ações.** As telas leem o estado via seletores do motor (`mapLayer`, `unitDetails`, `popTypeSummaries`, `topBarMetrics`...) e despacham `GameAction`s pelo store do Zustand. Não há regra de negócio no JSX.
- **IA só escreve texto.** Votos, efeitos e resultados são sempre calculados pelo motor (ver [IA generativa](#ia-generativa)).

Funções principais do motor (`packages/game-engine/src/simulation/api.ts`): `startGame`, `advanceTime`, `campaignAction`, `launchAd`, `runPoll`, `simulateElection`, `proposeLaw`, `passLaw` (só ferramentas), `generateEvent`, `resolveEvent`, `updateEconomy`, `updatePopulation`, `updatePopularity`, `saveGame`, `loadGame`, `deleteSave`.

## Economia, leis e Congresso

O desenho completo (ids, unidades, fórmulas) está em [docs/DESIGN_NACAO.md](docs/DESIGN_NACAO.md). Em resumo:

- **Economia industrial** (`src/economy/industry/`): 31 tipos de edifício × 27 estados, com métodos de produção, propriedade (privada, estatal, cooperativa, estrangeira), salários por tipo de Pop, mercado nacional de 27 bens com preços relativos, comércio exterior com tarifas e câmbio, fundos de investimento que escolhem obras pela rentabilidade e fila de construção limitada pelo setor de construção civil. O PIB, o emprego, a arrecadação e a renda dos Pops saem desse motor; `updateEconomy` faz a ponte com os indicadores macro.
- **Leis** (`src/laws/`): categorias no estilo Victoria 3. Os efeitos econômicos são `EconomyModifiers` (vocabulário único entre leis, decretos e o motor, agregado em `laws/modifiers.ts`); `describeModifiers` gera o texto das cartas.
- **Processo legislativo** (`src/legislature/`): PL, PLP, PEC (dois turnos) e MP (vigência imediata, caduca em 120 dias), comissões e relator, presidentes das casas que controlam a pauta, bancadas temáticas que votam junto, sanção/veto/derrubada, plebiscito, impeachment, moção de desconfiança no parlamentarismo e projetos apresentados pelo próprio Congresso. Votações da casa do jogador param o tempo até ele votar.
- **Executivo** (`src/executive/`): decretos com risco de suspensão pelo STF e plano nacional de investimento.
- **Nação** (`src/nation/`): legitimidade, regime e identidade do país, peso político dos grupos de interesse, radicalismo e greves, objetivos de cenário.
- **Interface**: telas Economia, Mercado nacional, Indústria e obras, Comércio exterior, Leis, Congresso (proposições, plenário, bancadas, mesa e impeachment), Decretos, Nação e a seção econômica no painel de cada estado. O Centro de Decisões abre as votações obrigatórias.
- **Balanceamento**: `npx tsx packages/game-engine/scripts/governance-sim.ts` simula quatro anos sob seis pacotes de leis (padrão, liberal, desenvolvimentista, social-democrata, socialista e planificado) e imprime crescimento, inflação, industrialização, comércio, peso dos grupos e satisfação dos Pops.

## Atlas: o mapa no centro do jogo

O mapa ([docs/ARQUITETURA_VISUAL.md](docs/ARQUITETURA_VISUAL.md)) é um renderizador próprio em SVG (`packages/ui/src/atlas`), com uma versão 3D em three.js (a única dependência nova, carregada só com o mapa 3D):

- **Carta em camadas:** o Brasil dentro da América do Sul (países vizinhos, rios, represas, graticulado, Equador e Trópico — Natural Earth 1:50m, gerado por `npm run generate:context-map`), capitais, barra de escala em km e rótulos com nível de detalhe por zoom.
- **Câmera fora do React:** zoom no cursor, arrasto e voos escrevem o `transform` direto no SVG; o mapa desliza para a área livre quando um painel abre e voa até o estado aberto.
- **Leitura honesta:** escala esticada do menor ao maior estado, com os valores reais nas pontas da legenda; "sem dados" é hachurado, nunca uma cor da escala.
- **Mapa em 3D** (`packages/ui/src/atlas3d`, three.js num pedaço carregado sob demanda): estados como prismas com altura = valor do modo, luz e sombra, rótulos em HTML (focáveis por teclado). O 2D segue como opção e fallback sem WebGL.
- **Mapa e painéis conversam** pelo `uiStore`: o painel sugere o modo (Economia → desemprego), pede um recorte (`useMapFocus`: produção de um bem, polos de um edifício) ou usa o mapa como seletor (`useMapPick`: onde construir, regiões da propaganda). O motor resolve tudo em seletores puros (`mapLayer`, `goodLayer`, `buildingLayer`, `lawCategoryAxis`).

## Dinamismo: eventos, gabinete, rivais e carreira

Implementação do [roteiro de dinamismo](docs/ROADMAP_DINAMISMO.md) com o conteúdo do [banco](docs/BANCO_DE_CONTEUDO.md):

- **Cerca de 1.100 eventos** em pacotes por esfera (`src/events/packs/`): prefeitura, governo estadual, Presidência, mandato legislativo, campanha, 6 por estado, um gancho por cidade-polo, arcos narrativos em etapas, entressafra e Justiça Eleitoral. Cada evento declara esfera, estados, regiões ou cidades, e o calendário (`events/seasons.ts`: chuvas de verão, seca e queimadas, frio no Sul, Carnaval, São João, Círio...). Anti-repetição: peso cai a cada repetição, recarga por categoria e nenhum evento sorteável volta em menos de 18 meses de mandato.
- **Gabinete mensal** (`government/cabinet.ts`): todo mês, balanço, pauta do mês, oposição e 3 cartas de decisão. **Desgaste**: a aprovação-alvo cai depois da lua de mel (mais rápido em crise e em cargos maiores); pauta, inaugurações e renovação da equipe reduzem o desgaste. **Repasses federativos** dependem do alinhamento com governador e presidente. **Ministros** têm lealdade, ambição e escândalo latente. **Objetivos de mandato**: até 3, avaliados no fim.
- **Campanha**: 60 cartas extras na reunião semanal, 255 perguntas novas de entrevista, **vice** na chapa (próprio partido ou aliado), **2º turno negociado** (apoios dos derrotados com preço e afinidade; o rival também negocia), **bolha das redes** na propaganda digital, convenção partidária, memes de gafes com ciclo de vida.
- **Rivais recorrentes** (`world/rivals.ts`): adversários persistem entre eleições com memória e carreira; o **nêmesis** volta e tem eventos próprios.
- **Entressafra** (`career/occupations.ts`): 10 ocupações fora do cargo, com efeitos mensais e eventos a cada bloco de 6 meses.
- **Justiça e dinheiro**: caixa 2 registrado, auditoria da prestação de contas, cassação, Ficha Limpa (inelegibilidade de 8 anos), fundo partidário ligado à unidade do partido.
- **Qualidade de vida**: "Por que perdi?" no resultado, dicas da primeira partida (desligáveis), selo de porte do partido, prazos das promessas, 60 conquistas com perfil local, placar de legado e desafio da semana (mesma semente para todos).
- **Balanceamento automatizado** (`tests/balance.test.ts`): o CI falha se o bot passivo terminar o mandato de prefeito acima de 50% de aprovação média ou se um evento repetir em menos de 18 meses. O teste `event-content.test.ts` garante integridade do catálogo e que nenhuma opção ativa seja só ganho.

## Estrutura de pastas

```
apps/
  web/                    Front-end (Vite + React)
    src/app/              Roteador e layout raiz
    src/features/         Telas: menu, newgame, map, campaign, polls, pops, election, government, career...
    src/store/            Zustand (jogo e configurações)
    src/services/         Saves (localStorage / servidor) e cliente de IA
  server/                 API Fastify
    prisma/               Schema e migrações (PostgreSQL)
    src/ai/               Provedores de IA (Anthropic, compatível com OpenAI) + fallback procedural
    src/repositories/     Saves em PostgreSQL ou memória
packages/
  game-engine/
    src/core/             RNG com seed, datas, matemática, ids
    src/config/           GameConstants e dificuldades
    src/ideology/         9 eixos ideológicos e temas (issues)
    src/map/              27 UFs (Censo 2022), regiões, unidades eleitorais (estados / zonas)
    src/population/       Pops (tipo × estado), satisfação
    src/parties/          Partidos reais (TSE) e fictícios, facções, compatibilidade, criação de partido
    src/candidate/        Atributos, aparência (avatar), origens, nomes
    src/campaign/         Ações, propaganda, finanças, equipe, propostas/promessas, IA dos adversários
    src/election/         Cargos, modelo de voto, pesquisas, simulateElection, proporcional (D'Hondt), fluxo
    src/events/           Catálogo de eventos, efeitos, gatilhos e encadeamento
    src/media/            Notícias, alertas, entrevistas, debates
    src/economy/          Economia macro, orçamento e economia industrial (industry/: edifícios, mercado, comércio, obras)
    src/laws/             Categorias de leis, modificadores econômicos e projeção de votos
    src/legislature/      Processo legislativo: tramitação, mesas, bancadas, MP, veto, plebiscito, impeachment
    src/executive/        Decretos e plano de investimento
    src/nation/           Legitimidade, regime, grupos de interesse, greves
    src/scenarios/        Cenários, objetivos e início já no cargo
    src/politics/         Congresso, negociação, grupos de interesse
    src/government/       Mandato, aprovação, avaliação de promessas
    src/career/           Carreira, troca/fundação de partido, avanço de anos
    src/history/          Memória política
    src/simulation/       GameState, dispatch, tempo, seletores, API
    src/save/             Serialização versionada e contrato de armazenamento
    src/ai/               Interface AIProvider + provedor procedural
    tests/                Testes Vitest
    scripts/              Bots e simulação em lote (balanceamento)
  ui/                     Componentes visuais: Atlas (mapa do Brasil e das zonas eleitorais), avatar SVG, painéis, barras
  shared/                 Rotas e DTOs da API
data/geo/                 Malhas das UFs e das cidades jogáveis (IBGE) e recorte sul-americano (Natural Earth)
data/cidades-ibge.json    Cidades jogáveis: código IBGE, população (Censo 2022), nível REGIC
scripts/fetch-cities.mjs  Baixa do IBGE os dados e contornos das cidades (npm run fetch:cities)
scripts/generate-map.mjs  Converte as malhas em paths SVG e gera o cadastro de cidades do motor
scripts/generate-context-map.mjs  Países vizinhos, rios e lagos na projeção do mapa (npm run generate:context-map)
e2e/                      Testes Playwright
docs/GAME_DESIGN.md       Mecânicas e fórmulas
docs/ARQUITETURA_VISUAL.md  Atlas: auditoria, decisões (PixiJS/D3), arquitetura, medições
docs/ROADMAP_DINAMISMO.md Diagnóstico e blocos de melhoria (eventos, tensão, mundo vivo, modos)
docs/BANCO_DE_CONTEUDO.md 2.805 ideias de conteúdo: cenários, arcos, eventos, cartas, perguntas
```

## Como estender o jogo

### Adicionar um partido

Edite `packages/game-engine/src/parties/parties.data.ts` e acrescente um objeto com `id`, nome, sigla, cor, símbolo (`PARTY_SYMBOLS`), vetor ideológico (9 eixos de 0 a 100), popularidade, influência, dinheiro, militância, regiões fortes/fracas, prioridades, grupos prioritários e facções. Para dados reais, use `provenance: { kind: 'historical', source, sourceDate }` — o banco tem tabelas `Reference*` com fonte e data para manter dados históricos separados dos fictícios. Os partidos reais ficam em `realParties.data.ts`; veja [docs/PARTIDOS_REAIS.md](docs/PARTIDOS_REAIS.md) para atualizá-los após fusões ou novos registros.

### Adicionar uma lei

Em `packages/game-engine/src/laws/laws.data.ts`, adicione uma opção a uma categoria (ou uma categoria nova) com: posição ideológica, efeitos econômicos (`growth`, `inflation`, `unemployment`, `investment`, `confidence`, `revenue`), efeitos no orçamento, na satisfação dos Pops e na aprovação dos grupos, custo político e meses de implementação. Toda opção deve ter ganhadores e perdedores. Partidos votam pela afinidade ideológica automaticamente (`partyPreferredOption`), sem configuração extra.

### Adicionar um evento

Eventos novos vão nos pacotes de `packages/game-engine/src/events/packs/`, escritos com a linguagem compacta de `events/dsl.ts` (`ev({ id, cat, title, text, phases, scope, opts: [[rótulo, [efeitos]], ...] })`, com atalhos como `apr`, `cap`, `gasto`, `gi`, `cred`, `chain`, `flag`). Filtros de território: `scope` (municipal/estadual/federal), `states`, `regions`, `cities`; calendário em `events/seasons.ts`. Toda opção ativa precisa de algum custo (o teste de conteúdo cobra). O formato completo de um `EventDefinition` tem: categoria, fases em que pode ocorrer, peso (probabilidade relativa), gatilho (`condition`), recarga (`cooldownDays`), contexto (`unit`, `opponent`, `party`, `group`) e opções com efeitos declarativos (`money`, `popMomentum`, `rejection`, `economyShock`, `approval`, `chain` para encadear eventos, `modifier` para efeitos com duração...). O texto aceita `{playerName}`, `{unitName}`, `{opponentName}` etc.

### Adicionar um cargo

Em `packages/game-engine/src/election/offices.ts`, inclua o id em `OFFICE_IDS` e a definição em `OFFICES` (nível, Executivo/Legislativo, sistema majoritário/proporcional, 2º turno, duração, ciclo, idade mínima, dias de campanha, fator de custo, tipo de unidade eleitoral). Para eleições proporcionais, ajuste `officeSeats`.

### Adicionar uma região

Os estados ficam em `packages/game-engine/src/map/states.ts` (população, capital, coordenadas, perfil econômico, problemas). A geometria vem de `data/geo/br-uf-ibge.geojson`; depois de trocar a malha, rode `npm run generate:map`. Zonas dentro de estados e cidades são geradas em `map/units.ts`.

### Cidades jogáveis

As eleições municipais (prefeito e vereador) podem ser disputadas em 123 cidades: as capitais, as metrópoles e as capitais regionais da [REGIC 2018](https://www.ibge.gov.br/geociencias/organizacao-do-territorio/redes-e-fluxos-geograficos/15798-regioes-de-influencia-das-cidades.html) do IBGE (as cidades-polo de cada estado, como Caxias do Sul, Santa Maria e Passo Fundo no RS), mais os municípios com 500 mil habitantes ou mais que a REGIC agrupa no arranjo da capital (Guarulhos, São Gonçalo, Contagem...). Cada cidade tem o contorno real do município no mapa, eleitorado proporcional à população do Censo 2022 e câmara municipal no teto constitucional de vereadores.

Para mudar a lista, edite `CITIES` em `scripts/fetch-cities.mjs` e rode `npm run fetch:cities` (com internet) e depois `npm run generate:map`. O jogo em si nunca acessa a internet: os contornos (cerca de 165 KB) ficam num módulo carregado só quando um mapa de cidade aparece.

## IA generativa

A interface `AIProvider` (`packages/game-engine/src/ai/provider.ts`) define `generateInterviewQuestion`, `generateNews`, `generateDebateQuestion`, `generateEventDescription`, `generateSpeechFeedback` e `classifyFreeAnswer`. Implementações:

- **Procedural** (padrão, no motor): textos a partir de modelos — o jogo funciona sem nenhuma API.
- **Anthropic** (`apps/server/src/ai/anthropic.ts`): SDK oficial, modelo padrão `claude-opus-5-5`, esforço baixo para textos curtos, saídas estruturadas para classificar respostas livres e fallback do lado do servidor em caso de recusa.
- **Compatível com OpenAI** (`apps/server/src/ai/openaiCompatible.ts`): OpenAI ou modelos locais (Ollama, LM Studio) via `/chat/completions`.

Configuração em `apps/server/.env`:

```ini
AI_PROVIDER=auto              # auto | procedural | anthropic | openai-compatible
ANTHROPIC_API_KEY=sk-ant-...  # com auto, ativa a Anthropic automaticamente
ANTHROPIC_MODEL=claude-opus-5-5
OPENAI_BASE_URL=http://localhost:11434/v1
OPENAI_MODEL=llama3.1
```

No jogo: **Configurações → Textos gerados por IA → IA do servidor**. As chaves ficam só no servidor. Qualquer erro, recusa ou indisponibilidade cai automaticamente no texto procedural. A IA **nunca decide resultado**: para respostas livres em entrevistas, ela apenas classifica o estilo (firme, técnica, evasiva...) e o motor calcula a repercussão.

## Banco de dados e saves

- **Navegador:** `localStorage` (salvamento automático a cada ação + saves manuais; exportar/importar `.json`).
- **Servidor:** `GET/PUT/DELETE /api/saves/:slotId` gravam no PostgreSQL (tabela `SaveGame`). Escolha em **Configurações → Onde salvar**.
- O formato do save é versionado (`GameConstants.save.version`) com espaço para migrações em `save/save.ts`.

### API REST

| Método         | Rota                                                                                                                    | Descrição                           |
| -------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| GET            | `/api/health`                                                                                                           | Status, banco e provedor de IA      |
| GET            | `/api/saves`                                                                                                            | Lista saves                         |
| GET/PUT/DELETE | `/api/saves/:slotId`                                                                                                    | Lê, grava ou apaga um save          |
| GET            | `/api/ai/status`                                                                                                        | Provedor de IA ativo                |
| POST           | `/api/ai/interview-question`, `/news`, `/debate-question`, `/event-description`, `/speech-feedback`, `/classify-answer` | Textos (com fallback procedural)    |
| GET            | `/api/reference`                                                                                                        | Partidos, estados e fontes de dados |
