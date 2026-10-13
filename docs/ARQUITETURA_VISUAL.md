# República — Arquitetura visual (Atlas)

Documento de decisão da evolução visual e de interação do República. Complementa
`DESIGN_NACAO.md` (contratos do motor). Escrito em 13/10/2026, antes da implementação; a seção
"Estado" (§8) registra o que foi entregue e o que foi medido.

---

## 1. Auditoria do que existe

### 1.1 O que está bom e fica

| Parte | Por que fica |
| --- | --- |
| `packages/game-engine` (simulação, seletores, ações) | Determinístico, serializável, sem React. É a fonte de verdade de tudo que o mapa mostra. |
| Zustand (`gameStore`, `uiStore`, `settingsStore`) | Pequeno e correto: `GameState` imutável trocado por `dispatch`; seletores derivam o resto. |
| Casca de jogo (`GameLayout`, `TopBar`, `Dock`, `Outliner`, `PanelHost`, `TimeControls`) | Já segue a gramática de Victoria 3 (barra nacional, dock por sistemas, painel sobre o mapa, outliner, tempo). Testada (`shell.test.ts`, `e2e/shell.spec.ts`). |
| Tokens de tema (`styles/index.css`) e primitivas (`@republica/ui`: `Panel`, `Tooltip`, `Modal`, `Tabs`, `StatTile`, `Icon`…) | Sistema coerente (ardósia + latão + pergaminho). Todas as ~70 telas já o usam. |
| Conteúdo dos painéis (Economia, Mercado, Indústria, Leis, Congresso, Campanha, Eleição…) | Funcional e rico. Reescrever seria risco de regressão sem ganho para o jogador. |

### 1.2 O que está fraco

Capturas da versão 0.8.0 (`e2e/nation.spec.ts` com `SHOTS=`) mostram:

1. **O mapa é um cenário, não um instrumento.** Um coroplético de 27 polígonos em tons quase iguais: os
   valores do modo "Popularidade" ficam entre 0,45 e 0,6, e a rampa fixa de 0 a 1 pinta tudo do mesmo
   teal. Não há capitais, rios, países vizinhos, graticulado nem números sobre o mapa.
2. **Painel e mapa não conversam.** Abrir *Economia* ou *Mercado* não muda nada no mapa; escolher o Aço
   no mercado não mostra onde se produz aço. Os sistemas parecem telas separadas sobre um fundo.
3. **A câmera ignora o painel.** Com um painel aberto, metade do Brasil fica escondida embaixo dele e o
   mapa continua centralizado na janela inteira.
4. **Defeito de layout:** a legenda do mapa (canto inferior esquerdo) aparece por baixo do painel da
   região, e a rosa dos ventos vaza pelo cabeçalho translúcido.
5. **Pan e zoom re-renderizam o React a cada evento** (`useZoomPan` guarda o `viewBox` em estado) e o
   mapa usa `feDropShadow` sobre o grupo inteiro, rasterizado de novo a cada quadro de arrasto. O
   balão de dica também re-renderiza o mapa a cada movimento do mouse.
6. **Um único bundle JS de 1,9 MB** (sem divisão por rota): o Manual, o editor de avatar e o assistente
   de novo jogo são baixados mesmo por quem só quer continuar a partida.

### 1.3 Decisão por parte

| Parte | Decisão |
| --- | --- |
| `BrazilMap` + `useZoomPan` + `MapStage` + legenda | **Substituir** pelo Atlas (seção 3). `BrazilMap` continua exportado para o menu e a tela de eleição até migrarem. |
| `ZoneMap` (zonas eleitorais de cidade/estado) | **Migrado** para o Atlas (etapa 8, §8). |
| Paleta do mapa (`mapPalette.ts`, `lib/mapColors.ts`) | **Reconstruir** em `atlas/scales.ts`: escala esticada ao domínio real, com a legenda mostrando os extremos reais. |
| Modos de mapa | **Estender** no motor (governadores, ideologia, produção por bem, níveis por edifício) e criar o vínculo painel → modo. |
| Seletor de modos, legenda | **Reconstruir** (cartela com escala real, distribuição e ranking clicável). |
| Painéis (Economia, Mercado, Indústria, Campanha, Eleição, Leis, Congresso) | **Integrar** ao mapa (seção 5), sem reescrever a lógica. |
| Roteamento | **Dividir** o bundle com `React.lazy` nas rotas pesadas. |

---

## 2. Tecnologias avaliadas

### 2.1 PixiJS (WebGL) — **não adotar agora**

O que o mapa desenha hoje: 27 UFs com cerca de 4 mil vértices (geometria IBGE simplificada), mais
zonas eleitorais na casa das dezenas. Para esse volume, o SVG do navegador cabe folgado em 16 ms
por quadro **desde que** o pan/zoom não passe pelo React e os filtros fiquem desligados durante o
gesto — os dois pontos que pesam hoje. A hipótese é medida na etapa 6 (seção 8).

Custos do PixiJS para este jogo:

- ~450 KB minificados (~130 KB gzip) a mais, num bundle que já é grande.
- Perde a acessibilidade do DOM: hoje cada UF é focável por teclado, tem `aria-label` e responde a
  Enter/Espaço; os testes e2e localizam estados por `data-uf`. No canvas, tudo isso vira código próprio.
- Texto (siglas, capitais, valores) precisa de `BitmapText` ou atlas de fonte; Cinzel e Source Serif
  em SVG saem prontos e nítidos em qualquer zoom.
- Contexto WebGL pode ser perdido (abas em segundo plano, GPU fraca) e pede código de recuperação.

**Quando reavaliar:** se o jogo passar a desenhar municípios (5.570 polígonos, ~200 mil vértices) ou
milhares de marcadores animados. O Atlas separa câmera, geometria e camadas justamente para permitir
trocar o desenho das camadas de preenchimento por um backend WebGL sem mexer em quem as usa.

### 2.2 D3 — **não adotar em tempo de execução**

- `d3-geo`: a geometria já vem projetada por script (`scripts/generate-map.mjs`); projetar no
  navegador seria trabalho repetido a cada carga.
- `d3-scale`/`d3-scale-chromatic`: as escalas de que o mapa precisa (linear esticada, divergente com
  centro, categórica) cabem em ~60 linhas testáveis (`atlas/scales.ts`).
- `d3-zoom`: a câmera própria (seção 3.2) é menor, tipada e integrada à área segura dos painéis.
- Gráficos de série temporal continuam no **Recharts**, que já está no projeto e funciona.

### 2.3 Dados cartográficos — **Natural Earth 1:50m (domínio público)**

Países vizinhos, rios principais (Amazonas, Negro, Madeira, Tapajós, Xingu, Tocantins, Araguaia,
São Francisco, Paraná…) e grandes represas, recortados na América do Sul e simplificados por script
(`scripts/generate-context-map.mjs`) para um módulo TypeScript gerado. Nenhum acesso à rede em tempo
de execução: continua funcionando offline e no GitHub Pages.

### 2.4 Dependências novas

**Nenhuma em tempo de execução.** O ganho vem de arquitetura, não de bibliotecas.

---

## 3. Arquitetura de destino

```
packages/game-engine            (sem React, sem DOM)
  simulation/selectors.ts       mapLayer(): + modos 'governors' e 'ideology'; MapCell.short
  simulation/focusLayers.ts     goodLayer(goodId), buildingLayer(buildingId)  ← camadas pedidas por painéis

packages/ui/src/atlas           (sem dependência do estado do jogo: recebe geometria + cores)
  camera.ts                     câmera pura: {x, y, k}, zoomAt, clamp, fitBounds(bbox, viewport, insets), easing
  useCamera.ts                  gestos (roda, arrasto, pinça, duplo clique) aplicados via ref + rAF
  scales.ts                     rampas sequencial/divergente/categórica esticadas ao domínio real
  contextGeometry.generated.ts  vizinhos, rios, lagos (Natural Earth, gerado)
  Atlas.tsx                     <svg> em camadas (abaixo)

apps/web/src/features/map
  MapStage.tsx                  orquestra: store → seletor do motor → escalas → Atlas; área segura
  mapModes.ts                   registro de modos + modo sugerido por painel
  MapLegend.tsx                 legenda no HUD: escala com extremos reais, faixa por UF, ranking
  useMapLink.ts                 useMapFocus / useMapPick / useMapAxis (painel → mapa)
  mapMarkers.ts                 marcadores reais por UF (obras públicas, canteiros industriais, sua base)
  useChangePulse.ts             compara a camada do mês anterior → pulsos nas UFs que mudaram
```

### 3.1 Camadas do Atlas (de baixo para cima)

1. **Oceano** — gradiente + graticulado de 5° com rótulos de latitude/longitude nas bordas.
2. **Contexto** — países vizinhos em tom neutro com nome em itálico; Atlântico rotulado.
3. **Sombra da costa** — silhueta do Brasil deslocada, sem filtro durante o gesto.
4. **Preenchimento das UFs** — cor do modo ativo; transição de cor de 300 ms ao mudar de modo/mês.
5. **Textura** — grão de papel (padrão SVG gerado uma vez) recortado na terra.
6. **Hidrografia** — rios com espessura por importância, represas.
7. **Fronteiras** — internas finas; contorno nacional duplo (escuro + filete de latão).
8. **Marcadores** — capitais (Brasília em estrela), selos de obras/canteiros, sua base eleitoral.
9. **Rótulos** — nível de detalhe por zoom: sigla → nome → nome + capital; valor do modo opcional
   ("números no mapa"). Rótulos escalam ao contrário da câmera (`--atlas-ik`), sempre legíveis.
10. **Realces** — hover, foco de teclado, seleção, pulsos de mudança.

### 3.2 Câmera e área segura

- A câmera vive **fora do React** (ref). Um gesto escreve `transform` no grupo do mapa a cada quadro de
  animação; o React só re-renderiza quando o nível de detalhe muda.
- Durante o gesto, a classe `atlas-moving` desliga filtros e transições.
- `insets` (px ocupados por painel, outliner e barra) entram na câmera: ao abrir um painel, o Brasil
  desliza para a área visível; ao clicar numa UF, a câmera voa até ela dentro dessa área. Se o jogador
  mexeu na câmera à mão, o reenquadramento automático espera o próximo "Recentralizar".

### 3.3 Fluxo de dados

```
dispatch(action) ─► gameStore.game (GameState imutável)
                         │
uiStore: mapMode, mapFocus, mapAuto, mapNumbers, selectedUnit
                         │
MapStage ─ useMemo(game, modo/foco) ─► engine.mapLayer | goodLayer | buildingLayer  (MapLayer)
        ─ useMemo(layer) ─► atlas/scales ─► cores por UF + domínio real
        ─ useMemo(game) ─► mapMarkers
                         ▼
                      <Atlas>  (camadas, câmera, gestos, dica)
```

- Painéis **não falam com o Atlas**. Eles declaram intenção no `uiStore` (`useMapFocus({ kind: 'good',
  id: 'steel' })` ao montar, limpa ao desmontar; `useMapPick` quando o mapa vira seletor). O `MapStage` resolve a intenção num seletor do motor a
  cada estado novo; nada derivado do jogo fica guardado na store.
- O motor continua sem React: só ganha seletores puros, cobertos por testes.

---

## 4. Direção de arte

**"Carta do Império ao Atlas da República."** Inspirada na cartografia oficial brasileira dos séculos
XIX–XX (cartas do Instituto Histórico, atlas escolares do IBGE dos anos 1950) e na moldura institucional
dos documentos republicanos.

- **Mapa:** mar escuro de ardósia com graticulado fino; terras vizinhas em sépia apagada; o Brasil é a
  única terra a cores. Rios em azul-acinzentado. Contorno nacional com filete de latão.
- **Tipografia:** Cinzel (títulos e siglas, gravura), Source Serif itálico (água, países, capitais),
  Source Sans (números e interface).
- **Moldura:** cartelas com cantoneiras de latão; o painel é uma "prancha" sobre a mesa do mapa.
- **Movimento com significado:** a câmera desliza para o que o painel discute; cores mudam em
  transição quando o mês vira; UFs que mudaram de verdade pulsam (verde/vermelho conforme o sentido
  "bom" do indicador); nenhuma animação decorativa em laço.

---

## 5. Integração painel ↔ mapa (fase 4)

| Painel | O mapa passa a mostrar |
| --- | --- |
| Economia | Desemprego por UF (ou renda, na esfera local) |
| Mercado nacional | Recursos; ao escolher um bem: **produção desse bem por UF** |
| Indústria | Industrialização; ao escolher um edifício: **níveis desse edifício por UF** |
| Obras públicas | Obras em andamento |
| Campanha, Agenda | Sua presença de campanha |
| Pesquisas, Propaganda, Impacto | Intenção de voto |
| Eleição | Resultado (ou intenção, antes da apuração) |
| Leis, Nação | Ideologia do eleitorado (eixo econômico) |
| Congresso, Partido | Influência partidária |
| Gabinete, Grupos, Decretos | Satisfação/popularidade |

O jogador pode desligar o vínculo ("Mapa acompanha os painéis") e fixar um modo.

---

## 6. Riscos e custos

| Risco | Mitigação |
| --- | --- |
| Regressão em e2e que clicam no mapa (`data-uf`, `map-mode-*`, `map`) | Manter os mesmos atributos e testids no Atlas. |
| Desempenho em máquinas fracas (filtros SVG, muitos rótulos) | Filtros desligados no gesto; rótulos com nível de detalhe; overlay de medição (`?perf`) e teste e2e de pan. |
| Tamanho da geometria de contexto | Recorte na América do Sul + Douglas-Peucker; meta < 80 KB gerados. |
| Escala esticada exagerar diferenças pequenas | A legenda mostra sempre os extremos reais e a distribuição; a dica traz o valor do motor. |
| Saves antigos | Nenhuma mudança no formato do save: tudo novo é seletor ou estado de interface. |

Custo de migração: concentrado em `packages/ui/src/atlas` e `apps/web/src/features/map`. Os painéis
recebem uma ou duas linhas (`useMapFocus`, `useMapPick`, `useMapAxis`).

**Mudança em relação ao plano:** a legenda foi desenhada no canto do mapa, mas quase todos os
painéis são largos e ela sumia justamente quando o mapa conversa com o painel. Ela foi para o bloco
HUD da direita (acima do tempo), sempre visível.

## 7. Etapas (cada uma verificável e num commit próprio)

1. Motor: modos `governors` e `ideology`, `MapCell.short`, camadas de foco + testes.
2. Dados: `generate-context-map.mjs` + geometria gerada.
3. Atlas: câmera pura (testes), escalas (testes), componente em camadas.
4. Fatia vertical: `MapStage` novo com área segura, legenda/ranking, números, marcadores, pulsos;
   painel da região com a leitura do modo ativo.
5. Vínculo painel → modo; foco do Mercado e da Indústria.
6. Divisão do bundle e medição de desempenho.
7. Migração das telas restantes (Campanha, Eleição, Leis, Congresso) para a leitura integrada.

## 8. Estado

Entregue em 13/10/2026 (v0.9.0, branch `atlas`, um commit por etapa):

| Etapa | Entregue |
| --- | --- |
| 1. Motor | Modos `governors` e `ideology`, `MapCell.short` (pt-BR), camadas de foco `goodLayer`/`buildingLayer`, `lawCategoryAxis` derivado dos vetores das opções. |
| 2. Dados | Natural Earth 1:50m recortado: 13 países, 47 rios, 14 lagos/represas, 53 KB gerados. |
| 3. Atlas | Câmera pura, escalas OKLab esticadas ao domínio real, SVG em camadas, rótulos/marcadores em pixels de tela com nível de detalhe, barra de escala. |
| 4. Fatia vertical | `MapStage` com área livre e voo até o estado, legenda no HUD (escala real, faixa por UF, ranking, números, marcadores), pulsos de mudança, "Neste mapa" no painel da região. |
| 5. Integração | `useMapFocus` (Mercado → produção do bem; Indústria → polos do edifício) e `useMapPick` (Indústria → onde construir; Propaganda → regiões do anúncio). |
| 6. Desempenho | Rotas preguiçosas + pré-carregamento ocioso em produção; camadas memoizadas; `npm run test:perf`. |
| 7. Telas | Eleição (Atlas + apuração por estado), Leis (eixo da categoria), Congresso (partido no mapa), Campanha (marcadores de agenda e propaganda), menu (Atlas decorativo). `BrazilMap` removido. |
| 8. Zonas | Mapas de zonas (prefeito, vereador, governador) no Atlas: `map/zoneGeometry.ts` gera cunhas, anel metropolitano e círculos recortados pelo contorno real (`outline`), os outros estados como fundo (`backdrop`) e a escala em km de cada cidade (`kmPerUnit`, gerado). `ZoneMap`, `useZoomPan` e `MapControls` removidos. |

### Medições (Chrome, 1600×960, `npm run test:perf`, máquina de desenvolvimento)

| Gesto | Mediana do quadro | p95 |
| --- | --- | --- |
| Zoom pela roda (números e marcadores ligados) | 13,4 ms (≈75 fps, teto do headless) | 40 ms |
| Arrasto | 13,4 ms | 26,7 ms |
| Voo "Enquadrar" | 13,4 ms | 40 ms |
| Voo até um estado + montagem do painel da região | 26,6 ms | 67 ms (picos = render do painel) |

A hipótese da seção 2.1 se confirmou: com a câmera fora do React e filtros desligados no gesto,
o SVG sustenta a taxa de quadros máxima para 27 UFs + contexto. PixiJS continua desnecessário.

Bundle (`vite build`): antes, um chunk de 2,5 MB (763 KB gzip). Depois, carga inicial ≈ 1,69 MB
(≈ 535 KB gzip: casca 348 KB + motor 1,34 MB), gráficos (381 KB) e ~50 telas sob demanda.

### Próximos passos

- **Motor em pedaços:** o maior bloco da carga inicial é o motor (textos de eventos, perguntas).
  Carregar os pacotes de eventos sob demanda exige `import()` dinâmico dentro do motor.
- **Prefeito/governador no mandato:** sem eleição em curso, o mapa mostra as 27 UFs com o estado
  do jogador em destaque (comportamento anterior ao Atlas). Mostrar as zonas da própria cidade ou
  do estado exige o motor produzir unidades de zona fora da eleição.
- **Por que mudou, no mapa:** os pulsos dizem *que* um estado mudou; a dica poderia dizer *por quê*
  (as causas já existem no motor para intenção de voto e aprovação).
- **Painéis largos:** com painel largo a faixa do mapa fica estreita; um botão "recolher painel"
  (painel vira barra lateral) deixaria o mapa inteiro visível sem fechar a tela.
