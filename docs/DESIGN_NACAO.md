# República — Nação: economia industrial, leis e poder

> Especificação técnica da expansão "Nação" (inspirada em Victoria 3). Complementa o
> `GAME_DESIGN.md`. É o **contrato** entre os módulos: ids, unidades, fórmulas de referência,
> responsabilidades e regras. Tudo é MODELO DE JOGO, não previsão sobre o mundo real, e
> nenhuma ideologia é tratada como moralmente superior: toda opção tem ganhadores e perdedores.

## 0. Visão

O jogador deixa de "girar botões de um PIB abstrato" e passa a comandar (ou disputar) um
**motor econômico de verdade**: fazendas, minas, usinas, siderúrgicas, montadoras, bancos e polos
de tecnologia em cada um dos 27 estados, um **mercado nacional** com preços que nascem da oferta e
da demanda, **comércio exterior** com tarifas e câmbio, **investimento** privado/estatal/cooperativo
e uma **fila de obras**. Leis organizadas em ramos (Estado, Economia, Sociedade) permitem levar o
país do **liberalismo** à **economia planificada**, passando por desenvolvimentismo e socialismo
de mercado — mas cada mudança passa por um **Congresso bicameral vivo** (comissões, relator,
presidente da casa que controla a pauta, bancadas temáticas, PEC em dois turnos, Medida
Provisória, sanção, veto e derrubada de veto, plebiscito, impeachment).

Pilares:

1. **A política nasce da economia.** Industrializar cria operários; operários fortalecem sindicatos
   e a bancada sindical; o agro forte fortalece a bancada ruralista. Estatizar some com a classe
   empresarial; o livre comércio pode desindustrializar. O eleitorado (Pops) muda de profissão com
   o emprego — e vota diferente.
2. **Nada acontece com um clique.** Executivo propõe/edita/veta; Legislativo emenda/pauta/vota.
3. **O dilema brasileiro.** O país começa exportando commodities e importando alta tecnologia.
   Proteger a indústria encarece a vida; abrir barateia e desindustrializa; estatizar dá controle e
   espanta capital. O jogador escolhe o caminho e paga o preço.
4. **Determinismo e serialização.** Estado 100% JSON, RNG com seed, sem `Math.random`/`Date.now`.

## 1. Arquitetura e donos dos arquivos

```
packages/game-engine/src/
  economy/industry/   types, goods.data (pronto), buildings.data, resources.data, constants,
                      industry (bootstrap + tick), actions, selectors, mapLayers, ... (motor)
  economy/economy.ts  ponte macro (PIB, crescimento, inflação, juros, desemprego, renda, dívida)
  economy/budget.ts   orçamento (receita vem dos impostos do motor; categorias industry/science)
  laws/               types (contrato), laws.data (catálogo), laws.ts (tramitação legada → delega),
                      modifiers.ts (agregador de EconomyModifiers — PRONTO), federal.ts (PRONTO)
  legislature/        types (contrato), caucuses.data (pronto), legislature.ts, actions.ts,
                      voting, leadership, impeachment, npc, selectors...
  executive/          types (contrato), decrees.data (pronto), executive.ts, selectors
  nation/             types (contrato), nation.ts (legitimidade, greves, regime, identidade), selectors
  scenarios/          scenarios.ts, objectives.ts, startInOffice
  simulation/         state.ts, dispatch.ts, time.ts, nationalTick.ts (integração — orquestrador)
```

**Arquivos de integração (só o orquestrador reescreve; agentes fazem apenas `Edit` mínimo e
pontual quando indispensável, nunca reescrevem o arquivo):** `simulation/state.ts`,
`simulation/dispatch.ts`, `simulation/time.ts`, `simulation/nationalTick.ts`,
`government/government.ts`, `save/save.ts`, `config/constants.ts`, `src/index.ts`.

**API pública:** cada módulo exporta para a interface pelo seu barril (`economy/industry/public.ts`,
`legislature/public.ts`, `executive/public.ts`, `nation/public.ts`, `scenarios/public.ts`), que o
`src/index.ts` reexporta com `export *`. Nomes exportados devem ser únicos no pacote.

**Constantes:** cada módulo tem seu `constants.ts` (reexportado em `GameConstants.<módulo>`).
Nenhum número mágico de gameplay fora deles (ou de arquivos `*.data.ts`).

## 2. Tempo e ticks

- Mandato: o tempo anda por dia. A **virada de mês** roda `governmentMonthlyTick`:
  `updateEconomy` (→ `runIndustryMonth` primeiro) → orçamento → satisfação dos Pops → aprovação →
  capital político → grupos de interesse → `processLawsMonthly` → `processLegislatureMonth` →
  `nationalMonthlyTick` (decretos → Nação → objetivos) → eventos/alertas.
- **Todo dia** do mandato: `processLegislatureDay` (etapas com data vencida: fim de comissão,
  votação marcada, prazo de sanção, sessão de veto, MP caducando, plebiscito, impeachment).
- O tempo **para** (`blockingReason` → `legislatureBlockingReason`) quando há decisão obrigatória
  do jogador: votar em plenário (jogador parlamentar), sancionar/vetar (jogador Executivo),
  votar impeachment. Interrupção nova: `'decision'`.
- Campanha: a economia industrial roda na virada de mês (via `updateEconomy`). Pops mudam de
  profissão também em campanha, mas devagar (as unidades eleitorais já guardam o eleitorado).
- Subsistemas usam **RNG derivado** (`new Rng(hashSeed(state.meta.seed, '<módulo>', state.date))`)
  sempre que possível, para não alterar a sequência do RNG principal (estabilidade dos testes).

## 3. Economia industrial

### 3.1 Unidades

- Dinheiro: **R$ bilhões/ano** (fluxos, sempre anualizados mesmo no tick mensal) e R$ bi (estoques).
- Bens: **unidades = R$ bi/ano a preços-base**. Preço `p` é relativo (1 = base). Vender `q` unidades
  rende `q·p` R$ bi/ano. `displayPrice`/`displayUnit` são cosméticos.
- Pessoas/empregos: mesma escala dos Pops (eleitores × `population.scale`).
- Salários e renda: **R$/mês por pessoa** (como `Pop.income`). Conversão: massa salarial anual
  (R$ bi) = pessoas × salário × 12 / 1e9.

### 3.2 Bens (24) — `goods.data.ts` (pronto)

agro: `grain`, `soy`, `meat`, `cash_crops`, `wood` · mineral: `iron_ore` · energia: `oil`, `fuel`,
`electricity` (não comercializável) · industrial: `steel`, `chemicals`, `construction_materials`,
`machinery` · consumo: `textiles`, `processed_food`, `consumer_goods`, `vehicles` · alta tecnologia:
`electronics`, `pharmaceuticals`, `aircraft`, `software` · serviços (não comercializáveis):
`transport`, `services`, `finance`.

### 3.3 Edifícios (31) — `buildings.data.ts`

| Setor | Edifícios |
|---|---|
| agro | `farm_grain`, `farm_soy`, `ranch`, `plantation`, `forestry` |
| extraction | `mine`, `oil_field` |
| energy | `power_hydro`, `power_thermal`, `power_renewable` |
| heavy_industry | `refinery`, `steel_mill`, `chemical_plant`, `cement_plant` |
| manufacturing | `food_industry`, `textile_mill`, `consumer_factory`, `machinery_factory`, `auto_plant` |
| high_tech | `electronics_factory`, `pharma_plant`, `aerospace` |
| services | `construction_sector`, `logistics`, `commerce`, `bank`, `tech_hub` |
| public | `public_admin` (administration), `hospital` (health), `school` (education) |
| informal | `informal` |

Cada edifício: 2–3 **métodos de produção** (ex.: lavoura familiar → mecanizada → de precisão;
montagem manual → linha de montagem → robotizada), com empregos por tipo de Pop, insumos e
produção **por nível**. Métodos avançados poupam mão de obra e exigem insumos (máquinas,
eletrônicos, software) e/ou nível tecnológico (`minTech`) — compensam quando salários são altos.

Escala de referência: **~5.000 empregos por nível** no método padrão (varia 1.500–10.000).
Empregos `business` são de donos/diretores (ver propriedade). O primeiro método é o padrão.

Recursos (`resources.data.ts`): `arable`, `pasture`, `forest`, `iron`, `oil`, `hydro`,
`wind_solar` — potencial (níveis máximos) por estado, coerente com a geografia (pré-sal RJ/SP/ES;
Quadrilátero Ferrífero MG e Carajás PA; Cerrado MT/GO/MS/BA/TO; hidro PA/PR/MG/RO/AM...).
`STATE_SPECIALTIES`: Zona Franca de Manaus (eletrônicos AM), polo aeroespacial (SP), Camaçari
(químicos BA), siderurgia MG/ES/RJ, montadoras SP/PR/MG/RS, têxtil SC/CE, finanças SP/RJ,
Brasília (`public_admin` DF) etc.

**Regras de calibração dos dados (testadas):** no método padrão, com preços = 1 e salários de
referência (`POP_TYPES[t].income × fatorRegional`, com fator médio 1), a margem
`(receita − insumos − salários)/receita` deve ficar entre **5% e 35%** para edifícios produtivos
privados; setor público e informal são exceção (público é pago pelo orçamento; informal tem
produtividade baixa e sem insumos).

### 3.4 Propriedade

`ownership: { private, state, cooperative, foreign }` (soma 1) por edifício/estado.

- Lucro privado → **dividendos** aos Pops `business` (do estado, com parte nacional) e reinvestimento
  (`investmentPool`).
- Estatal → Tesouro (`taxes.stateCompanies`) e `statePool` (reinvestimento das estatais).
- Cooperativa → vira renda dos empregados do edifício.
- Estrangeira → **remessa de lucros** (sai do país; pressiona o câmbio); reinvestimento no `foreignPool`.
- Empregos `business` do método: são `business` na fatia privada/estrangeira, `middle_class`
  (gestores) na estatal e o tipo principal de trabalhador na cooperativa. **Por isso estatizar faz a
  classe empresarial encolher no eleitorado.**
- Leis movem a propriedade mensalmente (`nationalizationRate`, `cooperativizationRate`,
  `privatizationRate`, `expropriationRate`, `stateShareFloor`, `resourceStateShare`, `landReform`).

### 3.5 Tick mensal de referência (`runIndustryMonth`)

`M = aggregateEconomyModifiers(state,'national')`; `L = aggregateEconomyModifiers(state,'local')`
(aplicar só ao estado governado pelo jogador, com metade do peso).

1. **Mundo e câmbio.** Preço mundial de cada bem: passeio aleatório log com reversão à média
   (5%/mês). Câmbio `fx` aproxima um alvo: balança comercial/PIB (superávit valoriza), diferencial
   de juros, confiança e remessas. `fx` multiplica preços mundiais em reais.
2. **Produção.** `eficiência = nível × staffing × produtividade × (1 + M.productivity +
   M.productivityBySector[setor] + bônus tecnológico − poluição×M.pollutionPenalty) ×
   (1 − intensidade de greve no setor)`. Falta de insumo (escassez do mês anterior) reduz a
   produção proporcionalmente ao peso do insumo.
3. **Demanda dos Pops.** Renda nominal (salários + dividendos + transferências + informal) × tamanho,
   menos poupança (maior nos ricos), × `market.demandFactor`, dividida numa **cesta por faixa de
   renda** (pobres: comida, roupas, transporte, energia, serviços; classe média: + bens duráveis,
   eletrônicos, veículos, finanças, software; ricos: mais serviços, finanças, veículos). Quantidade =
   gasto / (preço × (1 + imposto sobre consumo)).
4. **Demanda do governo.** O orçamento compra bens: saúde → medicamentos/serviços; educação →
   bens de consumo/eletrônicos/serviços; segurança → veículos/combustível; administração →
   software/serviços; infraestrutura → materiais/aço/máquinas (obras). Os edifícios públicos têm
   seus insumos e salários pagos pela categoria do orçamento correspondente (staffing acompanha
   gasto/referência).
5. **Demanda da construção.** Pontos usados × cesta (cimento ~45%, aço ~30%, máquinas ~15%,
   transporte ~10%) — custo do ponto = soma a preços correntes (mais salários do setor).
6. **Mercado.** Para cada bem: `D` (pops+indústria+governo+construção) e `S` (produção).
   Preço autárquico `p* = 1 + 0,75 × clamp((D−S)/max(min(D,S),ε), −1, 1)`.
   Paridade de importação `pi = mundo×fx×(1+tarifa+frete)`; de exportação
   `pe = mundo×fx×(1−frete−imposto de exportação)`. Comercializável e aberto: preço-alvo =
   `clamp(p*, pe, pi)`; importações/exportações fecham o desequilíbrio até a capacidade de comércio
   (`tradeOpenness`). Proibição de exportação/congelamento/controle de preços: preço fixo e a
   diferença vira **escassez** (`shortage`) que corta consumo e produção. Preço anda
   `priceAdjustRate` em direção ao alvo, limitado a [0,25; 1,75].
   Tarifa efetiva = base (12%) + `M.tariff` + `M.tariffByCategory[cat]` (mín. 0).
7. **Finanças dos edifícios.** Receita, insumos, salários (`salárioRef × wageFactor ×
   M.wageMult`, nunca abaixo do piso `M.minimumWage × salário-base dos trabalhadores`), subsídios
   (`M.subsidies`), impostos sobre lucro. Margem suavizada. **Ajustes:** prejuízo → corta staffing
   (até 5%/mês × `laborFlexibility`) e salários até o piso; lucro → recontrata e paga mais.
   12+ meses de prejuízo grave → perde 1 nível (exceto público e estatal subsidiado).
   Empresas privadas trocam para o método mais lucrativo disponível (devagar); estatais seguem a
   escolha do jogador.
8. **Distribuição e impostos.** Ver 3.4. Impostos: renda (salários), corporativo (lucros), consumo,
   tarifas, exportação, dividendos, patrimônio (`wealthTax`), lucros de estatais. A soma é
   multiplicada por `taxScale` (calibrado no início: receita inicial = `economy.revenue`).
9. **Investimento privado.** `investmentPool += lucro privado × (base 0,35 + M.reinvestment) ×
   M.privateInvestmentMult` (× efeito de juros/confiança; 0 com `banPrivateInvestment`).
   Investidores escolhem (estado, edifício) pelo **retorno esperado**: margem atual/projetada,
   demanda não atendida ou importações a substituir, recurso disponível, mão de obra ociosa no
   estado, crédito subsidiado do setor (`creditSubsidy`). Com `newPrivateAsCooperative` os projetos
   de mercado nascem cooperativos. Estrangeiro idem com `foreignPool` (× `foreignInvestmentMult`).
10. **Investimento estatal.** Fila do jogador (Executivo federal ou estadual), paga pela categoria
    `industry` do orçamento (desconto `stateConstructionDiscount`; proibido para não públicos com
    `banStateIndustry`). Com plano (`executive.plan`) e em economia planificada/desenvolvimentista,
    o `statePool` constrói automaticamente seguindo os pesos setoriais. Governo federal NPC investe
    conforme a ideologia do partido no poder.
11. **Construção.** Capacidade = Σ pontos dos `construction_sector`. A fila consome pontos por
    ordem (obras estatais primeiro, até o limite de dinheiro do mês). Projeto concluído → +1 nível
    com propriedade do dono do projeto.
12. **Emprego e Pops.** Por estado: empregos por tipo (Σ níveis × staffing × empregos do método,
    com a regra de donos) → **composição-alvo** dos Pops de trabalho; força de trabalho
    `LF = Σ Pops de trabalho + desempregados`. Quem não tem emprego formal: fração `φ_s`
    (`informalAbsorption` calibrada + `M.informality`) vira trabalhador informal (`workers`), o resto
    **desempregado**. Pops migram para a composição-alvo a ~8–12%/mês do gap (preservando o total do
    estado). `region.unemployment = desempregados/LF`. Estudantes e aposentados não mudam.
    `pop.income` = (salários + dividendos + transferências + informal)/tamanho.
    `pop.sol` (padrão de vida) = poder de compra real relativo ao início (50 = início), com escassez
    penalizando.
13. **Transferências.** `M.transfers` (R$/mês por pessoa) pagas proporcionalmente à execução da
    categoria `social` do orçamento (cortar o orçamento corta o benefício); aposentadorias seguem a
    categoria `pensions`.
14. **Tecnologia.** Progresso mensal ∝ (orçamento `science` + educação + VA de alta tecnologia) ×
    `M.techRate`; cada nível dá +1–2% de produtividade e destrava métodos (`minTech`).
15. **Agregados.** Produto real (VA a preços-base), VA/emprego por setor, participação industrial
    (heavy_industry + manufacturing + high_tech), CPI (cesta dos Pops), exportações, importações,
    balança; histórico de 36 meses.

**Calibração inicial (`bootstrapEconomy`).** Gera níveis por estado a partir dos Pops (cada tipo
principal ocupa os edifícios do seu setor, ponderados por `profileWeights`, recursos e
especialidades), dimensiona não comercializáveis para atender a demanda, define preços iniciais
pelas paridades, calibra `φ_s` para reproduzir o desemprego inicial do estado, `gdpScale` para o
PIB inicial e `taxScale` para a receita inicial, e salários para que a renda inicial dos Pops ≈
`Pop.income` atual. O primeiro ano sem ações do jogador não pode ter saltos (desemprego varia
< 1 p.p., Pops mudam < 3%).

**Metas de estabilidade (testes):** 8 anos em situação "normal", sem ações: crescimento médio
1–3%, desemprego 4–13%, inflação 2–8%, preços em [0,25; 1,75], sem NaN/Infinity, totais de Pops
preservados por estado (±0,1%). Direcionais: `econ_planned` zera a propriedade privada em ~2 anos e
encolhe `business` ≥ 50% em 4; `econ_laissez_faire` + `trade_open` não aumenta a participação
industrial em 8 anos (tende a cair) e aumenta exportações agro/minerais; `trade_isi` + `ind_bndes`
eleva a participação industrial em ≥ 2 p.p. em 8 anos com inflação maior que a base.

### 3.6 Ponte macro (`economy/economy.ts`)

`updateEconomy` chama `runIndustryMonth` e então deriva os indicadores agregados existentes
(que o resto do jogo usa): crescimento = variação anualizada e suavizada do produto real;
desemprego = mercado de trabalho; renda = média dos Pops; inflação = componente monetário
(meta + superaquecimento + déficit + choques + `economy.inflation` das leis + expectativa) +
pressão de custos (variação de 12 meses do CPI do mercado); juros: regra de Taylor com BC
independente, mandato duplo (pondera desemprego) ou **definidos pelo Executivo**
(`executive.selicTarget`) com BC do governo; PIB nominal = `gdpScale × produto real × nível de
preços`; receita = impostos do motor; dívida/déficit como antes; confiança como antes + leis +
clima de investimento. Choques de eventos (`EconomyShock`) viram choques de produtividade/demanda.
Efeitos `economy` legados das leis: `growth` → produtividade, `unemployment` → informalidade/
contratação, `investment` → investimento privado, `revenue` → arrecadação.

### 3.7 Orçamento

Categorias novas: `industry` (Investimento e fomento: paga obras estatais e capitaliza estatais) e
`science` (Ciência e tecnologia). Para o Executivo federal, `revenueTaxes` passa a vir dos impostos do
motor (parcela federal); estados/municípios recebem parcelas proporcionais ao PIB do estado.

## 4. Catálogo de leis (federal) — ids FECHADOS

Instrumento mínimo: `pl` (maioria simples), `plp` (maioria absoluta), `pec` (3/5 em 2 turnos).
`★` = padrão. Ids existentes são mantidos (promessas, eventos e grupos dependem deles).

**Estado** (`branch: 'estado'`)
- `regime` (pec): `reg_presidential`★, `reg_semi_presidential`, `reg_parliamentary`, `reg_one_party`
  (todas não padrão com `plebiscite: true`; `special` correspondente; partido único com
  `legitimacyShock` muito negativo e tag `authoritarian`).
- `electoral_system` (pec): `elec_open_list`★, `elec_closed_list`, `elec_district`.
- `federalism` (pec): `fed_current`★, `fed_decentralized`, `fed_centralized`.
- `institutions` (pec): `inst_current`★, `inst_transparency`, `inst_strong_executive`, `inst_participatory`.
- `central_bank` (plp): `cb_independent`★ (`centralBank:'independent'`), `cb_dual_mandate` (`'dual'`), `cb_government` (`'government'`, confiança −).
- `media` (pl): `media_free`★, `media_regulated`, `media_state` (autoritária).
- `administration` (pl): `adm_current`★, `adm_lean`, `adm_digital`, `adm_expanded`.

**Economia** (`branch: 'economia'`)
- `economic_system` (pec): `econ_laissez_faire`, `econ_mixed`★, `econ_developmental`, `econ_cooperative`, `econ_planned`.
- `taxation` (pl): `tax_low`, `tax_mixed`★, `tax_progressive`, `tax_wealth`.
- `trade` (pl, MP): `trade_open`, `trade_mixed`★, `trade_protectionist`, `trade_isi`, `trade_autarky`.
- `industrial_policy` (pl, MP): `ind_neutral`, `ind_incentives`★, `ind_bndes`, `ind_local_content`, `ind_national_plan`.
- `resources` (pl): `res_concession`, `res_sharing`★, `res_monopoly`.
- `banking` (plp): `bank_liberal`, `bank_regulated`★, `bank_public`, `bank_nationalized`.
- `labor` (pl): `labor_deregulated`, `labor_flexible`, `labor_clt`★, `labor_protective`, `labor_councils`.
- `minimum_wage` (pl, MP): `mw_none`, `mw_low`, `mw_valorization`★, `mw_high`.
- `unions` (pl): `unions_banned`, `unions_restricted`, `unions_free`★, `unions_corporatist`.
- `land` (pl): `land_latifundio`, `land_current`★, `land_reform`, `land_collective`.
- `pensions` (pec): `pen_current`★, `pen_reform`, `pen_capitalization`, `pen_expanded`.
- `environment` (pl): `env_current`★, `env_strict`, `env_flexible`, `env_green_economy`.
- `infrastructure` (pl): `infra_public`★, `infra_concessions`, `infra_ppp`, `infra_big_plan`.

**Sociedade** (`branch: 'sociedade'`)
- `education` (pl): `edu_public`★, `edu_fulltime`, `edu_vouchers`, `edu_tech`.
- `healthcare` (pl): `health_universal`★, `health_expanded`, `health_mixed`, `health_private`.
- `security` (pl): `sec_balanced`★, `sec_punitive`, `sec_preventive`, `sec_intelligence`.
- `welfare` (pl, MP): `wel_none`, `wel_targeted`★, `wel_expanded`, `wel_universal_income`.
- `science` (pl): `sci_minimal`, `sci_current`★, `sci_innovation_state`.

Esferas subnacionais continuam legislando só nas categorias com `levels` estadual/municipal
(tributação, educação, saúde, segurança, administração, infraestrutura, meio ambiente).

### 4.1 Modificadores de referência (ajuste fino é do catálogo, mantendo a direção)

| Opção | `modifiers` (resumo) |
|---|---|
| `econ_laissez_faire` | reinvestment +0,15; privateInvestmentMult 1,3; banStateIndustry; privatizationRate 0,02; corporateTax −0,04; foreignInvestmentMult 1,3; productivity +0,02 |
| `econ_developmental` | stateConstructionDiscount 0,15; stateShareFloor {oil_field .5, refinery .5, power_hydro .5, mine .3, steel_mill .3}; creditSubsidy {heavy_industry 1,5, high_tech 1,5}; privateInvestmentMult 0,92 |
| `econ_cooperative` | newPrivateAsCooperative; cooperativizationRate 0,02; profitSharing 0,4; privateInvestmentMult 0,7; foreignInvestmentMult 0,6; dividendTax +0,15 |
| `econ_planned` | banPrivateInvestment; nationalizationRate 0,08; expropriationRate 0,1; priceControls; stateConstructionDiscount 0,25; productivity −0,06; foreignInvestmentMult 0; tradeOpenness 0,6 |
| `trade_open` / `protectionist` / `isi` / `autarky` | tariff −0,10 + openness 1,15 / tariff +0,18 + openness 0,85 / tariffByCategory {consumer +0,38, industrial +0,04 (insumos e bens de capital baratos), high_tech +0,35} + openness 0,75 + creditSubsidy {manufacturing 1} / openness 0,05 + tariff +0,5 |
| `tax_low` / `progressive` / `wealth` | income −0,03, corporate −0,07, consumption −0,02, reinvestment +0,05 / income +0,03, corporate +0,02, consumption −0,02, dividend +0,10 / income +0,03, corporate +0,03, dividend +0,15, wealthTax 0,02, privateInvestmentMult 0,9, foreignInvestmentMult 0,85 |
| `labor_deregulated` / `flexible` / `protective` / `councils` | laborFlexibility 1,8, wageMult 0,9, informality −0,05 / 1,4, 0,96, −0,04 / 0,7, 1,06, +0,05 / 0,6, profitSharing 0,3, wageMult 1,05, productivity −0,02 (requer cooperativa ou planificada) |
| `mw_none` / `low` / `valorization` / `high` | minimumWage 0 / 0,45 / 0,6 / 0,8 (+informality 0,04). O piso é o do modificador; `baseMinimumWage` só se nenhuma lei definir |
| `unions_*` | banned: wageMult 0,93, laborFlexibility 1,3 · restricted: 0,97, 1,15 · corporatist: 1,03, 0,9 |
| `land_*` | latifundio: productivityBySector {agro +0,03}, resourceExpansion 1,1 · reform: landReform 0,5, agro −0,02 · collective: landReform 1, agro −0,08 (requer cooperativa/planificada) |
| `res_*` | concession: foreignInvestmentMult 1,15 · sharing: resourceStateShare 0,3 · monopoly: resourceStateShare 1, foreignInvestmentMult 0,85 |
| `ind_*` | incentives: productivityBySector {high_tech +0,01} · bndes: creditSubsidy {heavy_industry, manufacturing, high_tech: 1,5}, interestRateOffset −0,5 · local_content: tariffByCategory {industrial +0,08, high_tech +0,08}, creditSubsidy {heavy_industry 1}, productivity −0,01 · national_plan: stateConstructionDiscount 0,1, creditSubsidy em todos os setores industriais 2 (requer desenvolvimentista/planificada) |
| `bank_*` | liberal: privateInvestmentMult 1,1 · public: interestRateOffset −1, creditSubsidy {agro .5}, privateInvestmentMult 1,05 · nationalized: interestRateOffset −1,5, stateShareFloor {bank 1}, foreignInvestmentMult 0,7 |
| `wel_*` | none: transfers {} · targeted: transfers {unemployed 300, workers 60} · expanded: {unemployed 500, workers 120, retirees 100, students 80} · universal: todos +600 (custo orçamentário enorme) |
| `sci_*` | minimal: techRate 0,6 · innovation_state: techRate 1,6 |
| `env_*` | strict: pollutionPenalty 0,15, resourceExpansion 0,85, agro −0,02 · flexible: resourceExpansion 1,2 · green: pollutionPenalty 0,08, productivityBySector {energy +0,04}, creditSubsidy {energy 1} |

Cada opção também define `ideology`, `pops`, `groups`, `issues`, `budget`, `caucuses` (pontos −10..10
para as 6 bancadas), `tags`, `politicalCost` (reformas profundas 60–100), `implementationMonths`
(até 24) e, quando cabível, `requires`, `plebiscite`, `legitimacyShock`, `special`.

## 5. Processo legislativo

### 5.1 Instrumentos e quóruns (federal)

| Instrumento | Quem propõe | Quórum por casa | Sanção |
|---|---|---|---|
| PL (lei ordinária) | Executivo, deputado, senador | maioria simples dos presentes (quórum de maioria absoluta) | sim |
| PLP (complementar) | idem | maioria absoluta dos membros (257 / 41) | sim |
| PEC | Executivo; 1/3 da casa (171 / 27 assinaturas) | 3/5 dos membros (308 / 49) em **2 turnos** | não (promulgação) |
| MP | só Executivo federal, categorias `allowsMP` | maioria simples; vigência imediata; caduca em 120 dias | conversão |
| Derrubada de veto | Congresso | maioria absoluta em cada casa | — |
| Impeachment | pedido aceito pelo presidente da Câmara | 2/3 na Câmara (342) e 2/3 no Senado (54) | — |

Estados e municípios: casa única (Assembleia/Câmara Municipal), sem MP, com sanção/veto do
governador/prefeito; emenda à constituição estadual/lei orgânica = 3/5.

### 5.2 Etapas (`Bill.status`)

`committee` (relator designado; prazo `committeeDays`, 7 com urgência) → parecer do relator
(favorável / com emendas = +1 concessão / contrário = penalidade no plenário) → `floor`: o
**presidente da casa** pauta (atraso maior se a relação com o autor é ruim; "engaveta" se muito
hostil, salvo urgência ou negociação) → votação nominal (dois turnos na PEC, com interstício) →
casa revisora (nova comissão + plenário) → `sanction` (Executivo: jogador decide, com prazo; sanção
tácita no prazo) → `passed` (implementação) ou `veto` (sessão do Congresso; derrubada → `passed`) →
`plebiscite` quando a opção exige (resultado pelo voto dos Pops) → `passed`.

**MP**: ao ser editada já muda `enacted` (guarda `previousOptionId`) e chama `onLawEnacted`;
comissão mista (30 dias) → Câmara → Senado → conversão. Rejeitada ou caducada (`mpExpires`) →
reverte. Pendente há mais de 45 dias, **tranca a pauta** da casa (o presidente da casa a pauta).

**PEC de parlamentar** precisa de assinaturas (1/3 da casa) antes de andar; `leg/signatures` coleta.

**`gov/rush` (legado)**: urgência urgentíssima — todas as votações restantes no mesmo dia (mantém
os testes antigos).

### 5.3 Voto (modelo)

Cada casa é dividida em segmentos partido × bancada (membros de `caucuses[c].members[casa][partido]`;
o resto sem bancada). Logit do segmento = logit do partido (afinidade ideológica com a mudança,
coalizão, relação, emendas, concessões, pressão popular, grupos de interesse, dificuldade, oposição)
com **pragmatismo** (partidos centristas ligam menos para ideologia e mais para cargos/emendas;
`pragmatismo = 1 − extremismo ideológico`) + `coesão × posição da bancada` (`option.caucuses`,
`preferredLaws`/`opposedLaws`, relação, `caucusBonus`) + parecer do relator + ruído. Votos por
partido e por bancada ficam em `BillVote`.

### 5.4 Atores

- **Mesas diretoras** (`leadership`): presidente de cada casa (NPC de partido grande/centrista),
  relação com o jogador, eleição em 1º de fevereiro dos anos ímpares. Jogador parlamentar pode
  concorrer (`leg/speaker`); jogador Executivo pode apoiar um aliado.
- **Bancadas** (`caucuses.data.ts`): ruralista, evangélica, segurança, sindical, empresarial,
  ambientalista. Membros calculados pela afinidade ideológica dos partidos nos eixos da bancada;
  força acompanha o peso (clout) dos grupos de interesse ligados. Jogador pode se reunir (Executivo)
  ou entrar/sair (parlamentar).
- **Base do governo NPC** (`governmentCoalition`) quando o jogador não é o Executivo.
- **Projetos NPC**: Executivo NPC propõe (PL/PEC/MP) conforme a ideologia do presidente; deputados e
  bancadas propõem pautas próprias (a maioria morre na comissão). O jogador Executivo sanciona ou
  veta o que passar.
- **Emendas parlamentares** (jogador parlamentar): verba anual executada pelo Executivo conforme a
  fidelidade do jogador ao governo; executar emendas aumenta a popularidade no estado de origem.

### 5.5 Impeachment e desconfiança

- Executivo federal jogador com aprovação < 30 e base fraca (ou escândalo alto) e relação ruim com o
  presidente da Câmara → chance mensal de o pedido ser aceito. Câmara vota (2/3), Senado julga
  (2/3). O jogador se defende (`leg/impeachment` `defend`: capital, cargos, emendas). Condenado →
  fim do mandato com marco histórico. Jogador parlamentar vota impeachments de Executivos NPC.
- **Parlamentarismo**: base < 50% da Câmara por 3 meses → moção de desconfiança; aprovada → o
  governo cai (fim do mandato). Semipresidencialismo: cai o gabinete (ministros exonerados).

## 6. Executivo (decretos)

`decrees.data.ts` (pronto): tarifa por categoria, IPI, proibição de exportação, congelamento,
subsídio setorial, linha de crédito, **Selic** (só com `cb_government`), estado de calamidade,
desapropriação e privatização (atos instantâneos por `${UF}:${edifício}` com indenização/receita).
Custam capital político; ficam em `executive.decrees` (convertidos em modificadores por
`decreeModifiers`); risco mensal de suspensão pelo STF quando extrapolam a lei (ex.: congelamento
sem calamidade nem controle de preços). `executive.plan` define os pesos do investimento estatal.

## 7. Nação

- **Peso dos grupos (clout)** por grupo de interesse: tamanho×renda dos Pops ligados + peso
  econômico do setor (agro, indústria, tecnologia, finanças, setor público), ajustado por leis
  (sindicatos proibidos derrubam o peso sindical). `influence` passa a acompanhar o clout.
- **Radicalismo** cresce com aprovação baixa do grupo; acima de ~70 → **greves** (sindicatos:
  indústria ou greve geral; trabalhadores: caminhoneiros/logística; agro: locaute; servidores:
  setor público; empresários: fuga de capitais — derruba fundos de investimento e desvaloriza o câmbio).
- **Legitimidade** (0–100): aprovação, instituições (tags democráticas/autoritárias), inquietação,
  escândalos, regime. Baixa → greves, eventos, impeachment.
- **Regime** (`special` das leis): partido único transfere ~95% das cadeiras da oposição ao partido
  governista, suspende eleições do Executivo (mandato prorrogado em `handleTermEnd`) e derruba a
  legitimidade; parlamentarismo/semi conforme 5.5.
- **Identidade do país** derivada das tags das leis federais: nome oficial (ex.: "República
  Federativa do Brasil", "República Popular do Brasil") e sistema ("Capitalismo liberal",
  "Social-democracia", "Desenvolvimentismo", "Socialismo de mercado", "Socialismo de Estado"...).

## 8. Cenários "no poder" e objetivos

`NewGameConfig.startInOffice` começa já empossado (eleição vencida simulada, posse, Congresso
formado), com `lawPreset` e `objectives` opcionais. Cenários: Presidente da República (2027),
O Sonho Industrial, Choque Liberal, Revolução pelo Voto, Crise da Dívida, Deputado do Baixo Clero,
Senador(a) da República. Objetivos avaliados mensalmente (`ScenarioObjective`).

## 9. Interface (estilo Victoria 3)

Mapa sempre ao fundo; barra superior de recursos (PIB, saldo do Tesouro, receita/gasto mensais,
aprovação, legitimidade, capital político, inflação, desemprego, data e velocidade); dock vertical
de ícones à esquerda abrindo **painéis** sobre o mapa (Governo, Leis, Congresso, Decretos, Economia,
Mercado, Indústria e obras, Comércio, Orçamento, População, Grupos e bancadas + telas de campanha);
**outliner** à direita (decisões pendentes, projetos em tramitação, obras, decretos, alertas,
notícias); controles de tempo com pausa e velocidades 1–5 (atalhos: espaço, 1–5); modos de mapa
econômicos (industrialização, renda, desemprego, informalidade, obras, recursos); painel do estado
ao clicar no mapa (edifícios, construir). Visual: azul-petróleo profundo, molduras douradas, títulos
com serifa clássica, tooltips ricos.

## 9.1 Contratos motor ↔ interface

- `Alert.link` (rota da interface): `map`, `polls`, `finance`, `party`, `events`, `debate`,
  `government`, `budget`, `laws`, `congress`, `economy`, `market`, `industry`, `trade`, `decrees`,
  `nation`. A interface mapeia para `/jogo/<rota em pt>` (`congress` → `congresso`, `industry` →
  `industria`, `market` → `mercado`, `trade` → `comercio`, `decrees` → `decretos`, `nation` → `nacao`).
- Modos de mapa novos (`MAP_MODES`): `industrialization`, `income`, `unemployment`, `informality`,
  `construction`, `resources`.
- Rotas novas em `/jogo`: `mercado`, `industria`, `comercio`, `decretos`, `nacao`, `regiao/:unitId`.

## 10. Regras para quem implementa

1. Textos de interface e comentários em **português do Brasil**, no estilo do código existente.
2. Motor puro: sem React, sem `Math.random`, sem `Date.now`/`new Date()` para lógica; estado só com
   dados JSON (sem `Map`, `Set`, classes, funções).
3. Sem números mágicos fora de `constants.ts` do módulo ou de `*.data.ts`.
4. Respeite os donos dos arquivos (seção 1). Precisa de algo em arquivo alheio? Use um adaptador no
   seu módulo ou registre no relatório final.
5. Typecheck: `npx tsc -p packages/game-engine/tsconfig.json`; testes: `npx vitest run
   --project game-engine tests/<arquivo>`; lint: `npx eslint <arquivos>`.
6. Testes antigos continuam passando; mudança intencional de comportamento → ajuste mínimo do teste
   com justificativa.
7. Desempenho: o tick mensal completo deve rodar em poucos milissegundos (evite O(n³)); históricos
   limitados.
8. Neutralidade: nenhuma opção domina; descrições factuais e sem juízo moral.
