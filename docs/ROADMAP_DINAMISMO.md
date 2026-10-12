# Roteiro: um jogo mais dinâmico, com mais eventos e mais jogável

Este documento organiza as melhorias propostas para o República em blocos, do conteúdo (mais rápido de fazer e de maior impacto) às mecânicas e aos modos de jogo. O catálogo de conteúdo (cenários, arcos, eventos, cartas, perguntas, manchetes, personagens e conquistas) está em [BANCO_DE_CONTEUDO.md](BANCO_DE_CONTEUDO.md).

## Diagnóstico (outubro de 2026)

Medido com o motor e cerca de 60 partidas simuladas por bots (`npm run simulate` e scripts de medição). Os números são indicativos: os bots são simples.

| Ponto                           | Medida                                                                                                                                               |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Catálogo de eventos             | 56 eventos; 26 sorteáveis na campanha, ~31 no governo, 10 no mandato legislativo, 1 fora de cargo                                                    |
| Variedade percebida na campanha | ~11 eventos por campanha de 55 dias; em 6 campanhas o jogador vê ~24 eventos distintos (quase o catálogo inteiro)                                    |
| Variedade no governo            | ~37 eventos por mandato de 44 meses, mas só **12,5 distintos para prefeito** e 17,5 para presidente; o mesmo evento chega a sair 5 vezes num mandato |
| Eventos por esfera              | 12 eventos de economia nacional são só do presidente; prefeitos e governadores ficam com ~15 genéricos e nenhum típico da prefeitura                 |
| Consequências                   | 3 eventos de continuação (`chain`) em todo o jogo                                                                                                    |
| Tensão no governo               | Bot que não propõe nada e sempre escolhe a 1ª opção termina com 61% (prefeito) e 70% (presidente) de aprovação                                       |
| Falas                           | 31 perguntas de entrevista para 17 temas; 12 tipos de carta da reunião semanal                                                                       |
| Memória do mundo                | Adversários apagados a cada eleição; sem vice, sem apoio no 2º turno, sem rivais recorrentes                                                         |
| Fora do cargo                   | Anos passam sem jogo (1 evento possível)                                                                                                             |
| Dificuldade no Brasil real      | Prefeito de SP (centrista, bot ativo): fictício UDC 6/8 vitórias; MDB 4/8; Novo 0/8, sem aviso ao jogador                                            |
| Ganchos                         | Sem tutorial interativo, sem conquistas, objetivos só nos cenários                                                                                   |

**Leitura:** os sistemas são profundos; o que falta é conteúdo para alimentá-los, consequências que voltem mais tarde e pressão constante no governo.

## Princípios para todo conteúdo novo

1. **Neutralidade:** toda escolha tem ganhadores e perdedores; nenhum campo político é o "certo". Eventos que acusam alguém nunca usam pessoas reais.
2. **Pessoas fictícias, instituições reais:** partidos reais (mundo Brasil real), TSE, STF, PF, MP, TCU/TCE, Câmara e Senado podem aparecer; políticos, empresários, jornalistas e celebridades são sempre inventados.
3. **Dilema, não armadilha:** a prévia mostra os efeitos; a surpresa fica na continuação (`chain`) e no ruído, não em esconder custos.
4. **Escala certa:** cada evento declara a esfera (municipal, estadual, federal, legislativa) e, quando faz sentido, a região, o estado ou a cidade.
5. **Vocabulário do motor:** efeitos descritos com os tipos que o motor já tem (`approval`, `knowledge`, `rejection`, `scandal`, `politicalCapital`, `popSatisfaction`, `interestGroup`, `economyShock`, `chain`…), para que o catálogo vire dados com pouco trabalho.

---

## Bloco 1 — Mais eventos e variedade

**Objetivo:** triplicar o catálogo e eliminar a sensação de repetição.

### 1A. Pacote de eventos por esfera e região (M)

- Separar os eventos em pacotes: campanha, prefeitura, governo estadual, Presidência, mandato legislativo, entressafra, regionais (por estado) e por cidade-polo.
- Meta da primeira leva: +60 eventos (15 de prefeitura, 12 estaduais, 10 federais, 15 de campanha, 8 regionais). Meta final: 300+ (o banco de conteúdo tem mais de mil ideias prontas).
- Motor: nova propriedade `scope` no `EventDefinition` (`municipal | estadual | federal | legislativo | qualquer`) e filtros opcionais `regions`, `states`, `cities`, `regic` (porte da cidade). O sorteio filtra por esfera do jogador.
- Interface: o selo da categoria ganha a esfera ("Prefeitura", "Estado", "União").

### 1B. Arcos com continuação (M)

- Histórias de 2 a 5 etapas que voltam semanas ou meses depois, com variáveis próprias (quem é o aliado, qual obra, quanto dinheiro).
- Motor: `chain` já existe; falta guardar **estado do arco** (`events.arcs: Record<arcId, { step, vars, startedOn }>`) para a continuação lembrar das escolhas anteriores e mudar o texto e as opções.
- Meta: 1 em cada 3 eventos com continuação possível; 40 arcos na primeira leva.

### 1C. Mais falas (P)

- Entrevistas: no mínimo 5 perguntas por tema, perguntas por cargo ("como prefeito, o senhor...") e com variáveis da cidade, do bairro e do adversário.
- Reunião semanal: de 12 para ~30 cartas, incluindo cartas de contexto (feriado, pauta do dia, rival em crise, chuva forte, jogo do Brasil).
- Debates: banco de "pegadinhas" e perguntas cruzadas por tema.

### 1D. Anti-repetição (P)

- Sorteio em "baralho": cada evento elegível entra uma vez; só reembaralha quando todos saíram (por esfera).
- Recarga por categoria (não sair dois escândalos seguidos) e peso decrescente para eventos já vistos nesta partida.
- Métrica: nenhum evento comum repetido em menos de 18 meses de mandato.

## Bloco 2 — Mais tensão e escolhas

### 2A. Reunião de gabinete mensal (M)

- No governo, a cada mês: balanço (aprovação, caixa, obras, Congresso), **pauta do mês** (tema em alta), o que a oposição vai fazer e **3 cartas de decisão** (uma vem do banco de cartas de gabinete). Mesma linguagem visual da reunião semanal da campanha.
- Dá ritmo ao mandato e substitui o "avançar mês sem fazer nada".

### 2B. Desgaste e crises que escalam (M)

- Desgaste natural: −0,3 a −0,8 ponto de aprovação por mês depois da lua de mel, maior em crise econômica.
- Crises têm estágio (sinal → problema → crise → colapso). Ignorar faz subir de estágio; responder cedo custa menos.
- Promessas com prazo visível no painel: "Creche no bairro X — faltam 8 meses".
- Meta: bot passivo termina o mandato com 35–45% de aprovação; bot ativo, 50–65%.

### 2C. Dilemas sem opção dominante (P)

- Revisão dos eventos atuais: toda opção custa algo (dinheiro, capital político, grupo de interesse, credibilidade).
- Prévia mostra "quem gosta / quem não gosta" igual às propostas.

### 2D. 2º turno de verdade (M)

- Após o 1º turno: cada derrotado tem preço (cargo, pauta, promessa) e afinidade. Negociar apoio custa e pode irritar a base.
- Debates do 2º turno com os dois finalistas; pesquisas diárias; "efeito manada".

### 2E. Vice e chapa (M)

- Escolher vice (do próprio partido ou de aliado): aliado amplia base e tempo de TV; vice pode virar escândalo ou rival.
- No governo: vice com ambição própria (assume se houver afastamento; pode conspirar).

### 2F. Orçamento com escolhas duras (P)

- "Emendas": deputados e vereadores pedem recursos para suas bases em troca de votos.
- Contingenciamento obrigatório quando a arrecadação cai: escolher onde cortar.

## Bloco 3 — Mundo vivo e memória

### 3A. Rivais recorrentes (G)

- Adversários persistem entre eleições (não são apagados), com carreira própria (vereador → prefeito → deputado → governador), ideologia, estilo, atributos e **memória**: quem atacou quem, quem traiu, quem apoiou.
- Arqui-inimigo: o rival com mais confrontos ganha selo e eventos próprios (dossiês, provocações, revanche).
- Aliados também persistem: o padrinho político, o pupilo, o ex-aliado ressentido.

### 3B. Entressafra jogável (M)

- Depois de perder ou terminar o mandato, escolher uma ocupação até a próxima eleição: secretário estadual, comentarista de TV, presidente do partido, consultor, ONG, professor universitário, voltar à profissão.
- Cada ocupação tem eventos próprios (ver banco de conteúdo) e efeitos em fama, rede de contatos, dinheiro e reputação. O tempo avança em blocos de meses com 1 decisão por bloco.

### 3C. O país acontece sem você (P)

- Notícias de outras eleições, escândalos de NPCs, crises regionais e resultados nacionais a cada ciclo; o mapa de partidos muda e isso aparece no Panorama.

### 3D. Linha do tempo pessoal (P)

- Diário de carreira com marcos (primeiro mandato, maior crise, maior vitória) e um "jornal" retrospectivo no fim de cada mandato.

## Bloco 4 — Ganchos e primeira partida

### 4A. Tutorial na primeira campanha (P)

- Dicas contextuais (não um texto longo): primeira reunião semanal, primeira propaganda, primeira pesquisa, primeiro debate.
- Pode ser desligado nas configurações.

### 4B. Partido recomendado e dificuldade visível (P)

- Na escolha do partido: selo "partido grande / médio / pequeno" e aviso "partido pequeno: modo difícil para cargos majoritários".
- Recomendação por afinidade e tamanho.

### 4C. Conquistas e legado (M)

- 150 conquistas (banco de conteúdo), divididas em campanha, governo, carreira, desafios e curiosidades.
- Placar de legado no fim da carreira: cargos, mandatos, leis, promessas cumpridas, aprovação média, escândalos.

### 4D. Cenários com partidos reais (P)

- Mais de 100 cenários no banco de conteúdo (campanhas, mandatos, crises, "e se", desafios regionais nas cidades-polo).

---

## Blocos novos

### Bloco 5 — Dinheiro e máquina política

- **Fundo eleitoral e partidário** visíveis: quanto o partido repassa depende da sua força e da sua relação com a direção.
- **Prestação de contas:** gastos acima do declarado geram risco de multa e de rejeição de contas pelo TSE.
- **Caixa 2 como tentação:** ofertas de dinheiro não declarado (mais recursos agora, risco alto de arco de investigação depois).
- **Cabos eleitorais e lideranças comunitárias** como recurso regional (contratar, perder, ser disputado por rivais).

### Bloco 6 — Mídia e redes

- **Bolhas e algoritmo:** conteúdo nas redes alcança mais quem já concorda; viralizar fora da bolha é raro e valioso.
- **Fake news e checagem:** boatos sobre o jogador e sobre rivais; responder, ignorar, processar ou contra-atacar (com riscos).
- **Crise de imagem:** gafes viram memes com ciclo de vida (pico, eco, esquecimento).
- **Horário eleitoral com peças:** escolher o roteiro da semana (biografia, ataque, proposta, depoimento) em vez de só "intensidade".
- **Veículos com linha editorial** (já existem): entrevistas hostis ou amigáveis conforme o veículo e a relação.

### Bloco 7 — Justiça e instituições

- **TSE:** impugnação de candidatura, direito de resposta, multas por propaganda irregular, cassação de registro ou de mandato.
- **Ficha Limpa:** condenações em segunda instância tornam inelegível (arco longo e decisivo).
- **MP, PF, TCU/TCE:** investigações com fases e chances; delação premiada como reviravolta.
- **STF:** decisões que derrubam leis do jogador ou de rivais; "pauta" do tribunal como evento.

### Bloco 8 — Partido por dentro

- **Convenção e prévias:** disputar a vaga de candidato dentro do partido (contra um rival interno).
- **Disputa pela direção:** alas e facções (já existem) ganham líderes e eventos; vencer a direção dá controle do fundo.
- **Federações e chapas proporcionais:** "puxadores de voto", divisão do tempo de TV, brigas por cabeça de chapa.
- **Janela partidária:** a cada ciclo, deputados trocam de partido e mudam a força das bancadas.

### Bloco 9 — Território vivo

- **Perfil das cidades-polo:** agro, indústria, universidade, porto, turismo, fronteira; eventos e eleitores seguem o perfil.
- **Obras visíveis no mapa** (pinos de obra; concluídas mudam a cor da região).
- **Calendário:** Carnaval, festas juninas, Círio de Nazaré, Oktoberfest, Copa do Mundo, Natal, volta às aulas; estações (chuva no Sudeste, seca no Nordeste, queimadas no Centro-Oeste e Norte, frio no Sul).

### Bloco 10 — Gabinete com personalidades

- Secretários e ministros com **lealdade, ambição, competência e escândalo latente**; podem pedir demissão, vazar informação, virar candidatos contra você.
- Chefe de gabinete e líder do governo no Legislativo como cargos-chave.

### Bloco 11 — Relações federativas

- Prefeito ↔ governador ↔ presidente: convênios, repasses voluntários e obras dependem de alinhamento partidário e relação pessoal.
- Consórcios de cidades e frentes de governadores; disputa por verbas.

### Bloco 12 — Modos de jogo

- **Desafio semanal:** mesma semente para todos, com placar local.
- **Carreira de 30 anos:** de vereador a presidente, com envelhecimento, sucessão e herdeiro político.
- **Modo "presidente por um mandato":** começa empossado, foco em governo e Congresso.
- **Editor de eventos e cenários (modding):** eventos em JSON validado; pasta `mods/` carregada pelo menu.

### Bloco 13 — Qualidade de vida

- **"Por que perdi?":** relatório pós-eleição com os 5 fatores que mais pesaram (medidor de impacto já tem os dados).
- **Comparativo de rivais** (gastos, presença por região, temas).
- **Resumo do mês/semana** ao avançar o tempo em blocos.
- **Atalhos e avanço inteligente:** "avançar até o próximo evento importante".

### Bloco 14 — Texto gerado (opcional, com IA)

- O motor já aceita provedores de IA para texto. Ampliar para: manchetes contextuais, falas de rivais nos debates e perguntas de entrevista com o histórico do jogador, sempre só texto, nunca resultado, e com filtro de pessoas reais.

### Bloco 15 — Balanceamento e telemetria

- Painel de calibração com as métricas deste documento (eventos/mês, repetição, vitórias por partido e cargo, aprovação passiva × ativa).
- Testes de regressão de balanceamento: o CI falha se, por exemplo, o bot passivo passar de 50% de aprovação ou se algum evento repetir em menos de 18 meses.

---

## Fases sugeridas

| Fase | Conteúdo                                                   | Por quê                                        |
| ---- | ---------------------------------------------------------- | ---------------------------------------------- |
| 1    | 1A (60 eventos) + 1B (motor de arcos + 15 arcos) + 1D + 2A | Maior ganho de dinamismo com risco baixo       |
| 2    | 2B + 2C + 2D + 4A + 4B                                     | Tensão no governo, 2º turno e primeira partida |
| 3    | 3A + 3B + 2E                                               | Mundo com memória e jogo entre mandatos        |
| 4    | Blocos 5 a 8                                               | Profundidade política brasileira               |
| 5    | Blocos 9 a 15                                              | Território, modos e ferramentas                |

## Metas de qualidade (para medir com os bots)

| Métrica                                                         | Hoje   | Meta                          |
| --------------------------------------------------------------- | ------ | ----------------------------- |
| Eventos distintos vistos em 6 campanhas                         | ~24    | 60+                           |
| Eventos distintos num mandato de prefeito                       | 12,5   | 30+                           |
| Maior repetição de um evento num mandato                        | 5      | 2                             |
| Eventos com continuação                                         | 3      | 1 em cada 3                   |
| Aprovação final do bot passivo                                  | 61–70% | 35–45%                        |
| Decisões significativas por mês de governo                      | ~0,9   | 2–3                           |
| Vitórias do bot ativo com partido pequeno (prefeito de capital) | 0/8    | 1–2/8 (difícil, mas possível) |

## Status de implementação (outubro de 2026)

| Bloco                                       | Situação                                                                                            | Onde                                                            |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| 1A–1D Eventos, arcos, falas, anti-repetição | Feito: ~1.100 eventos em pacotes, ~50 arcos, 255 perguntas, calendário e recarga mínima de 18 meses | `events/packs/`, `events/seasons.ts`, `media/questions.data.ts` |
| 2A Gabinete mensal                          | Feito (motor, interface e e2e)                                                                      | `government/cabinet.ts`, `CabinetModal`                         |
| 2B Desgaste e crises                        | Feito: desgaste mensal, crises em etapas pelos arcos, prazos das promessas                          | `government/government.ts`                                      |
| 2C Dilemas                                  | Feito: 230 opções dominantes ganharam custo; teste impede regressão                                 | `tests/event-content.test.ts`                                   |
| 2D 2º turno                                 | Feito: negociação de apoios com o rival competindo                                                  | `election/runoff.ts`                                            |
| 2E Vice                                     | Feito: escolha na campanha, vice real no governo                                                    | `campaign/runningMate.ts`                                       |
| 2F Orçamento duro                           | Parcial: cartas de contingenciamento, emendas e empréstimo no gabinete                              | `government/cabinetCards.data.ts`                               |
| 3A Rivais recorrentes                       | Feito: elenco persistente, memória, nêmesis com eventos                                             | `world/rivals.ts`                                               |
| 3B Entressafra                              | Feito: 10 ocupações e eventos                                                                       | `career/occupations.ts`, `packs/career.ts`                      |
| 3C/3D Mundo e linha do tempo                | Já existentes (paisagem política e histórico); "Por que perdi?" adicionado                          | `campaign/postMortem.ts`                                        |
| 4A Tutorial                                 | Feito: dicas contextuais desligáveis                                                                | `TutorialTip`                                                   |
| 4B Porte do partido                         | Feito: selo e aviso no assistente                                                                   | `parties/parties.ts`                                            |
| 4C Conquistas e legado                      | Feito: 60 conquistas (perfil local) e placar de legado                                              | `career/achievements.ts`                                        |
| 5 Dinheiro e máquina                        | Feito: caixa 2, auditoria, fundo partidário x unidade                                               | `packs/justice.ts`, `campaign/finance.ts`                       |
| 6 Mídia e redes                             | Feito: bolha do algoritmo, memes com ciclo de vida, manchetes de pesquisa                           | `campaign/ads.ts`, `media/headlines.ts`                         |
| 7 Justiça                                   | Feito: cassação, Ficha Limpa, improbidade                                                           | `packs/justice.ts`                                              |
| 8 Partido por dentro                        | Parcial: convenção, ala rebelde, janela partidária como eventos                                     | `packs/arcs.ts`                                                 |
| 9 Território vivo                           | Parcial: calendário e eventos por cidade/estado; obras no mapa ainda não                            | `events/seasons.ts`                                             |
| 10 Gabinete com personalidades              | Feito: lealdade, ambição, escândalo latente                                                         | `government/ministers.ts`                                       |
| 11 Relações federativas                     | Feito: repasses por alinhamento                                                                     | `government/federative.ts`                                      |
| 12 Modos                                    | Parcial: desafio da semana; editor de eventos (mods) não feito                                      | `lib/weeklyChallenge.ts`                                        |
| 13 Qualidade de vida                        | Feito: "Por que perdi?", prazos, dicas                                                              | `PostMortemPanel`                                               |
| 14 Texto com IA                             | Não feito (opcional)                                                                                | —                                                               |
| 15 Balanceamento                            | Feito: testes de regressão no CI                                                                    | `tests/balance.test.ts`                                         |

Medições com bots (média de sementes): prefeito passivo termina com ~36–42% de aprovação, governador ~37–43%, presidente ~43–48%; jogando as cartas do gabinete, 62–68%. Mandato de prefeito: ~34 eventos, ~33 distintos (antes: 12,5). Campanha: ~11 eventos, sem repetição, 30–36 distintos em 3–4 partidas.
