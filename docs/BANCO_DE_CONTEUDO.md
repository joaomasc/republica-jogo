# Banco de conteúdo do República

Catálogo de ideias prontas para transformar em dados do jogo: **2.805 itens** entre cenários, arcos narrativos, eventos por esfera, por estado e por cidade, cartas, perguntas de entrevista, temas de debate, manchetes, personagens, conquistas e objetivos. O plano de implementação está no [roteiro de dinamismo](ROADMAP_DINAMISMO.md).

**Regras de uso**

- **Pessoas fictícias, instituições reais.** Nenhum item cita político, empresário, jornalista ou celebridade real. Partidos reais aparecem só no mundo Brasil real; TSE, STF, PF, MP, Tribunais de Contas, Câmara e Senado podem aparecer.
- **Neutralidade.** Toda opção tem ganhadores e perdedores; o mesmo tema aparece pelos dois lados (ex.: escola cívico-militar, armas, aborto, privatização).
- **Rascunho de design.** Os números são sugestões de grandeza para balancear com os bots (`npm run simulate`), não valores finais.

## Legenda

| Abreviação                            | Significado                                                              | Tipo de efeito no motor         |
| ------------------------------------- | ------------------------------------------------------------------------ | ------------------------------- |
| Apr                                   | aprovação do governo                                                     | `approval`                      |
| Con                                   | conhecimento do candidato                                                | `knowledge`                     |
| Rej                                   | rejeição                                                                 | `rejection`                     |
| Cred                                  | credibilidade                                                            | `attribute` (credibilidade)     |
| Esc                                   | escândalo (latente = pode estourar depois)                               | `scandal`                       |
| $                                     | dinheiro da campanha ou caixa do governo                                 | `money` / `budgetSpend`         |
| Ene                                   | energia da campanha                                                      | `energy`                        |
| Ent                                   | entusiasmo da base                                                       | `enthusiasm`                    |
| Mil                                   | militância                                                               | `militants`                     |
| Mom[grupo]                            | momentum de um grupo de eleitores                                        | `popMomentum`                   |
| Pres                                  | presença regional                                                        | `presence` / `regionalMomentum` |
| Foco[tema]                            | ênfase no tema                                                           | `issueFocus`                    |
| Sat[grupo]                            | satisfação de um grupo (governo)                                         | `popSatisfaction`               |
| GI[grupo]                             | apoio de grupo de interesse                                              | `interestGroup`                 |
| Cap                                   | capital político                                                         | `politicalCapital`              |
| Est                                   | estabilidade                                                             | `modifier` (estabilidade)       |
| Leg                                   | legitimidade (Nação)                                                     | `legitimacy`                    |
| Uni                                   | unidade do partido                                                       | `partyUnity`                    |
| Rel[x] / Câm / Ass / Pref / Lid / Exe | relação com partido, Câmara, Assembleia, prefeitos, liderança, Executivo | `relation`                      |
| Fama                                  | fama do político                                                         | `fame`                          |
| Prep                                  | preparo para debate                                                      | `prep`                          |
| Obra                                  | cria obra pública                                                        | `buildingLevels` / obras        |
| ↪                                     | continuação (evento encadeado ou arco)                                   | `chain`                         |

Grupos de eleitores do motor: trabalhadores, operários, agricultores, empresários, comerciantes, classe média, servidores, saúde, tecnologia, estudantes, aposentados, desempregados. Grupos de interesse: empresariado, trabalhadores, agro, sindicatos, servidores, juventude, aposentados, movimentos sociais, indústria, tecnologia, comércio (grupos novos citados, como "segurança" ou "religiosos", seriam criados).

## Sumário

| Seção                                         | Itens              |
| --------------------------------------------- | ------------------ |
| 1. Cenários jogáveis                          | 160                |
| 2. Arcos narrativos                           | 100                |
| 3. Eventos de campanha                        | 250                |
| 4. Eventos de prefeitura                      | 250                |
| 5. Eventos de governo estadual                | 200                |
| 6. Eventos federais                           | 200                |
| 7. Eventos de mandato legislativo             | 100                |
| 8. Eventos de entressafra                     | 50 (+10 ocupações) |
| 9. Eventos regionais por estado               | 162                |
| 10. Ganchos por cidade jogável                | 123                |
| 11. Cartas (reunião semanal e gabinete)       | 200                |
| 12. Perguntas de entrevista e temas de debate | 380                |
| 13. Manchetes                                 | 200                |
| 14. Personagens recorrentes                   | 120                |
| 15. Conquistas                                | 150                |
| 16. Objetivos de mandato                      | 80                 |
| 17. Ideias soltas de mecânicas                | 80                 |
| **Total**                                     | **2.805**          |

## 1. Cenários jogáveis

Formato: **Nome** · cargo · local · ano · situação inicial · objetivos · reviravolta prevista. Partidos sugeridos são ponto de partida (o jogador pode trocar). Todos os personagens são fictícios.

### 1.1 Campanhas em cidades-polo

1. **Serra em Movimento** · prefeito · Caxias do Sul (RS) · 2028 · Metalúrgicas demitindo, prefeito atual sem reeleição. Objetivos: vencer; chegar com 20% de apoio entre operários. Reviravolta: grande montadora anuncia fábrica nova se a cidade ceder terreno.
2. **Cidade Universitária** · prefeito · Santa Maria (RS) · 2028 · Universidade federal em greve, comércio depende dos estudantes. Objetivos: vencer com maioria entre estudantes e comerciantes. Reviravolta: incêndio em casa noturna reacende debate sobre fiscalização.
3. **Capital do Planalto** · prefeito · Passo Fundo (RS) · 2028 · Polo médico regional lotado por pacientes de 100 cidades. Objetivos: vencer; prometer consórcio regional de saúde. Reviravolta: governo estadual corta repasse ao hospital.
4. **Doce Disputa** · prefeito · Pelotas (RS) · 2028 · Porto ocioso, desemprego acima da média gaúcha. Objetivos: vencer no 1º turno. Reviravolta: chuvas fecham a ponte da BR-116.
5. **Folha de Fumo** · prefeito · Santa Cruz do Sul (RS) · 2028 · Tratado antitabagismo ameaça a principal indústria. Objetivos: vencer sem perder agricultores. Reviravolta: multinacional ameaça fechar a planta.
6. **Depois da Água** · prefeito · Lajeado (RS) · 2028 · Cidade reconstruindo bairros após enchente histórica. Objetivos: vencer; aprovar plano de realocação de áreas de risco. Reviravolta: nova cheia em plena campanha.
7. **Manchester Catarinense** · prefeito · Joinville (SC) · 2028 · Indústria forte, trânsito caótico. Objetivos: vencer com apoio da indústria. Reviravolta: greve geral dos metalúrgicos.
8. **Chope e Enchente** · prefeito · Blumenau (SC) · 2028 · Oktoberfest bate recorde, mas encostas cedem. Objetivos: vencer; zerar famílias em área de risco. Reviravolta: deslizamento durante a festa.
9. **Capital do Oeste** · prefeito · Chapecó (SC) · 2028 · Agroindústria cresce, faltam moradias para migrantes. Objetivos: vencer; manter apoio do agro. Reviravolta: gripe aviária ameaça exportações.
10. **Carvão e Cerâmica** · prefeito · Criciúma (SC) · 2028 · Fim da mineração de carvão em debate. Objetivos: vencer com apoio sindical e empresarial. Reviravolta: usina térmica anuncia desligamento.
11. **Porto Vivo** · prefeito · Itajaí (SC) · 2028 · Concessão do porto divide a cidade. Objetivos: vencer; definir futuro do porto. Reviravolta: armadores ameaçam migrar para outro terminal.
12. **Frio da Serra** · prefeito · Lages (SC) · 2028 · Inverno rigoroso, pobreza rural alta. Objetivos: vencer; plano de aquecimento para escolas. Reviravolta: nevasca isola distritos.
13. **Norte Pé-Vermelho** · prefeito · Londrina (PR) · 2028 · Universidade, agro e um escândalo na Câmara. Objetivos: vencer com discurso anticorrupção crível. Reviravolta: seu partido aparece na lista da investigação.
14. **Cidade Canção** · prefeito · Maringá (PR) · 2028 · Cidade planejada, classe média exigente. Objetivos: vencer com menos de 2% de rejeição a mais. Reviravolta: aeroporto regional perde voos.
15. **Capital do Agronegócio** · prefeito · Cascavel (PR) · 2028 · Feira agrícola gigante, pressão por anel viário. Objetivos: vencer; atrair o Show Rural. Reviravolta: geada destrói safra de milho.
16. **Três Fronteiras** · prefeito · Foz do Iguaçu (PR) · 2028 · Turismo, Itaipu e contrabando. Objetivos: vencer; reduzir violência na fronteira. Reviravolta: crise cambial no país vizinho esvazia o comércio.
17. **Princesa dos Campos** · prefeito · Ponta Grossa (PR) · 2028 · Polo industrial e agrícola, ferrovia parada. Objetivos: vencer; reativar a ferrovia. Reviravolta: acidente com trem de cargas.
18. **Vale do Silício Caipira** · prefeito · Campinas (SP) · 2028 · Startups crescem, periferia sem saneamento. Objetivos: vencer em todas as zonas. Reviravolta: aeroporto de Viracopos anuncia expansão.
19. **Califórnia Brasileira** · prefeito · Ribeirão Preto (SP) · 2028 · Cana, calor recorde e falta d'água. Objetivos: vencer; plano hídrico. Reviravolta: queimadas em canaviais.
20. **Cidade Aeroespacial** · prefeito · São José dos Campos (SP) · 2028 · Indústria aeronáutica demite. Objetivos: vencer; manter empregos qualificados. Reviravolta: contrato bilionário de exportação de aviões.
21. **Manchester Paulista** · prefeito · Sorocaba (SP) · 2028 · Indústria automotiva e trânsito. Objetivos: vencer. Reviravolta: montadora suspende turno.
22. **Interior Forte** · prefeito · São José do Rio Preto (SP) · 2028 · Cidade rica, epidemia de dengue. Objetivos: vencer; reduzir casos em 50%. Reviravolta: novo sorotipo do vírus.
23. **Coração do Estado** · prefeito · Bauru (SP) · 2028 · Crise hídrica e universidade estadual. Objetivos: vencer. Reviravolta: rodízio de água no meio da campanha.
24. **Porta do Brasil** · prefeito · Santos (SP) · 2028 · Maior porto do país, palafitas e VLT parado. Objetivos: vencer; urbanizar palafitas. Reviravolta: navio encalha no canal.
25. **Terra da Uva** · prefeito · Jundiaí (SP) · 2028 · Cidade cobiçada por condomínios de luxo. Objetivos: vencer protegendo a Serra do Japi. Reviravolta: incorporadora oferece doação de campanha.
26. **Rio e Cana** · prefeito · Piracicaba (SP) · 2028 · Rio poluído, universidade de agronomia. Objetivos: vencer com plano de despoluição. Reviravolta: mortandade de peixes.
27. **Capital do Calçado** · prefeito · Franca (SP) · 2028 · Fábricas de sapato perdem para importados. Objetivos: vencer com apoio de operários e donos de fábrica. Reviravolta: tarifa sobre calçados chineses.
28. **Pontal em Chamas** · prefeito · Presidente Prudente (SP) · 2028 · Conflitos fundiários na região. Objetivos: vencer sem perder agro nem movimentos. Reviravolta: ocupação de fazenda vizinha.
29. **Capital Nacional do Alimento** · prefeito · Marília (SP) · 2028 · Indústrias de alimentos e universidade. Objetivos: vencer. Reviravolta: recall de alimentos de uma fábrica local.
30. **Laranja Doce** · prefeito · Araraquara (SP) · 2028 · Greening ataca pomares. Objetivos: vencer; plano para citricultores. Reviravolta: exportadora fecha.
31. **Capital da Tecnologia** · prefeito · São Carlos (SP) · 2028 · Duas universidades e pouca indústria. Objetivos: vencer; criar parque tecnológico. Reviravolta: fuga de cérebros para o exterior.
32. **Festa do Peão** · prefeito · Barretos (SP) · 2028 · Festa gigante e hospital de câncer referência. Objetivos: vencer. Reviravolta: polêmica sobre rodeios.
33. **Cidade do Aeroporto** · prefeito · Guarulhos (SP) · 2028 · 1,3 milhão de habitantes, transporte precário. Objetivos: vencer em todas as zonas. Reviravolta: apagão no aeroporto.
34. **ABC Operário** · prefeito · São Bernardo do Campo (SP) · 2028 · Montadoras saem, galpões vazios. Objetivos: vencer com apoio sindical. Reviravolta: última montadora anuncia fechamento.
35. **Triângulo Logístico** · prefeito · Uberlândia (MG) · 2028 · Cresce rápido, periferia sem asfalto. Objetivos: vencer. Reviravolta: polo atacadista ameaça mudar para GO.
36. **Manchester Mineira** · prefeito · Juiz de Fora (MG) · 2028 · Indústria em declínio, universidade forte. Objetivos: vencer. Reviravolta: tragédia em barragem de outra cidade muda o debate.
37. **Sertão Mineiro** · prefeito · Montes Claros (MG) · 2028 · Seca, polo de saúde do norte de Minas. Objetivos: vencer; garantir água nos bairros altos. Reviravolta: barragem do rio Verde Grande seca.
38. **Vale do Aço** · prefeito · Ipatinga (MG) · 2028 · Usina siderúrgica dita o emprego. Objetivos: vencer. Reviravolta: usina anuncia desligamento de alto-forno.
39. **Capital do Zebu** · prefeito · Uberaba (MG) · 2028 · Pecuária de elite, exposição anual. Objetivos: vencer com o agro. Reviravolta: febre aftosa em município vizinho.
40. **Emigrantes** · prefeito · Governador Valadares (MG) · 2028 · Metade das famílias com parente nos EUA. Objetivos: vencer; programa para quem volta. Reviravolta: deportações em massa.
41. **Petróleo e Planície** · prefeito · Campos dos Goytacazes (RJ) · 2028 · Royalties caindo, prefeitura inchada. Objetivos: vencer; equilibrar as contas. Reviravolta: STF muda regra dos royalties.
42. **Capital do Petróleo** · prefeito · Macaé (RJ) · 2028 · Offshore traz renda e favelização. Objetivos: vencer. Reviravolta: plataforma anuncia descomissionamento.
43. **Cidade do Aço** · prefeito · Volta Redonda (RJ) · 2028 · Siderúrgica e greves históricas. Objetivos: vencer. Reviravolta: venda da usina para grupo estrangeiro.
44. **Cidade Imperial** · prefeito · Petrópolis (RJ) · 2028 · Encostas habitadas, turismo de serra. Objetivos: vencer; zerar mortes por deslizamento. Reviravolta: tempestade recorde em fevereiro.
45. **Princesa do Sertão** · prefeito · Feira de Santana (BA) · 2028 · Maior entroncamento rodoviário do Nordeste. Objetivos: vencer. Reviravolta: greve de caminhoneiros paralisa a cidade.
46. **Planalto do Café** · prefeito · Vitória da Conquista (BA) · 2028 · Frio do sertão, universidade e café. Objetivos: vencer. Reviravolta: geada histórica.
47. **Terra do Cacau** · prefeito · Ilhéus (BA) · 2028 · Turismo literário, cacau em recuperação. Objetivos: vencer. Reviravolta: preço do cacau dispara no mundo.
48. **Oeste Baiano** · prefeito · Barreiras (BA) · 2028 · Fronteira agrícola da soja, conflito por água. Objetivos: vencer; mediar disputa por outorgas. Reviravolta: rio seca na safra.
49. **Romeiros** · prefeito · Juazeiro do Norte (CE) · 2028 · Milhões de romeiros por ano, infraestrutura frágil. Objetivos: vencer; preparar a romaria. Reviravolta: acidente com ônibus de romeiros.
50. **Capital do Agreste** · prefeito · Caruaru (PE) · 2028 · Feira gigante e maior São João do mundo. Objetivos: vencer. Reviravolta: chuva cancela a abertura do São João.
51. **Oásis do São Francisco** · prefeito · Petrolina (PE) · 2028 · Fruticultura irrigada exporta para o mundo. Objetivos: vencer. Reviravolta: tarifa europeia sobre uvas.
52. **Rainha da Borborema** · prefeito · Campina Grande (PB) · 2028 · São João e polo de tecnologia. Objetivos: vencer com estudantes e comerciantes. Reviravolta: açude que abastece a cidade em nível crítico.
53. **Terra do Sal** · prefeito · Mossoró (RN) · 2028 · Sal, petróleo em terra e fruticultura. Objetivos: vencer. Reviravolta: estatal vende campos de petróleo.
54. **Capital do Fumo** · prefeito · Arapiraca (AL) · 2028 · Agreste alagoano em transição econômica. Objetivos: vencer. Reviravolta: fábrica de calçados chega.
55. **Portal da Amazônia** · prefeito · Imperatriz (MA) · 2028 · Entroncamento, celulose e violência. Objetivos: vencer. Reviravolta: fábrica de celulose amplia e demanda água.
56. **Carajás** · prefeito · Marabá (PA) · 2028 · Mineração, siderurgia e conflitos agrários. Objetivos: vencer. Reviravolta: chacina no campo ganha manchetes nacionais.
57. **Pérola do Tapajós** · prefeito · Santarém (PA) · 2028 · Porto graneleiro e garimpo ilegal nos rios. Objetivos: vencer; mercúrio fora da água. Reviravolta: rio fica marrom de lama de garimpo.
58. **Capital do Boi** · prefeito · Araguaína (TO) · 2028 · Pecuária e frigoríficos. Objetivos: vencer. Reviravolta: embargo à carne bovina.
59. **Rota da Soja** · prefeito · Rondonópolis (MT) · 2028 · Terminal ferroviário de grãos. Objetivos: vencer. Reviravolta: ferrovia estende linha para outra cidade.
60. **BR-163** · prefeito · Sinop (MT) · 2028 · Cidade jovem, agro bilionário, ar seco e fumaça. Objetivos: vencer. Reviravolta: queimadas fecham o aeroporto.
61. **Fronteira Guarani** · prefeito · Dourados (MS) · 2028 · Agro, universidade e conflito indígena. Objetivos: vencer sem violência no campo. Reviravolta: retomada de terra indígena.
62. **Polo Farmacêutico** · prefeito · Anápolis (GO) · 2028 · Indústria de remédios e base aérea. Objetivos: vencer. Reviravolta: crise de medicamentos no país.
63. **Rio Madeira** · prefeito · Ji-Paraná (RO) · 2028 · Cidade do interior de Rondônia, desmatamento em alta. Objetivos: vencer. Reviravolta: fiscalização federal fecha serrarias.
64. **Mármore e Granito** · prefeito · Cachoeiro de Itapemirim (ES) · 2028 · Pedreiras e poeira. Objetivos: vencer. Reviravolta: acidente em pedreira.
65. **Vale da Serra Capixaba** · prefeito · Serra (ES) · 2028 · Indústria e portos, crescimento desordenado. Objetivos: vencer. Reviravolta: vazamento de minério na praia.

### 1.2 Uma campanha por estado (governador)

66. **Acre Verde** · governador · AC · 2026 · Floresta, fronteira com Peru e Bolívia e cheia do rio Acre. Reviravolta: crise migratória na fronteira.
67. **Lagoas e Canaviais** · governador · AL · 2026 · Afundamento de bairros em Maceió por mineração. Reviravolta: nova rachadura em bairro populoso.
68. **Amazônia Urbana** · governador · AM · 2026 · Zona Franca ameaçada pela reforma tributária. Reviravolta: seca histórica isola municípios.
69. **Linha do Equador** · governador · AP · 2026 · Petróleo na margem equatorial divide o estado. Reviravolta: licença ambiental negada.
70. **Bahia de Todos** · governador · BA · 2026 · Violência policial no topo do debate. Reviravolta: operação com mortes ganha repercussão.
71. **Ceará Conectado** · governador · CE · 2026 · Hub de cabos submarinos e hidrogênio verde. Reviravolta: facções disputam presídios.
72. **Capital Federal** · governador · DF · 2026 · Servidores, entorno pobre e metrô parado. Reviravolta: greve de professores.
73. **Espírito Santo Equilibrado** · governador · ES · 2026 · Contas em ordem, mas litoral sofre com lama de mineração. Reviravolta: acordo de reparação sai do papel.
74. **Goiás Agro** · governador · GO · 2026 · Soja, segurança pública dura e pressão por obras. Reviravolta: rebelião em presídio.
75. **Maranhão das Bases** · governador · MA · 2026 · Base de lançamentos e pobreza extrema. Reviravolta: contrato internacional de lançamentos.
76. **Minas de Todos** · governador · MG · 2026 · Dívida com a União, barragens e 853 municípios. Reviravolta: STF suspende pagamento da dívida.
77. **Pantanal em Chamas** · governador · MS · 2026 · Queimadas e fronteira seca. Reviravolta: incêndio recorde no Pantanal.
78. **Celeiro do Mundo** · governador · MT · 2026 · Maior produtor de grãos, logística cara. Reviravolta: moratória da soja derrubada.
79. **Pará Grande** · governador · PA · 2026 · Conferência do clima deixou legado e dívidas. Reviravolta: garimpo invade terra indígena.
80. **Paraíba Junina** · governador · PB · 2026 · Transposição do São Francisco chega a mais cidades. Reviravolta: canal da transposição rompe.
81. **Leão do Norte** · governador · PE · 2026 · Porto de Suape, Recife alagado. Reviravolta: chuvas matam dezenas na região metropolitana.
82. **Piauí em Alta** · governador · PI · 2026 · Energia eólica e solar mudam o sertão. Reviravolta: comunidades reclamam de parques eólicos.
83. **Paraná Industrial** · governador · PR · 2026 · Pedágios novos e ferrovia. Reviravolta: praça de pedágio ocupada.
84. **Rio em Crise** · governador · RJ · 2026 · Regime de recuperação fiscal e milícias. Reviravolta: governador anterior é preso (personagem fictício).
85. **Potiguar** · governador · RN · 2026 · Ataques de facção a ônibus. Reviravolta: onda de ataques na véspera do debate.
86. **Rondônia Rodoviária** · governador · RO · 2026 · BR-364 e desmatamento. Reviravolta: ponte cai na BR.
87. **Roraima de Fronteira** · governador · RR · 2026 · Imigrantes venezuelanos e garimpo. Reviravolta: fluxo migratório dobra.
88. **Rio Grande Reconstruído** · governador · RS · 2026 · Reconstrução após enchentes e dívida com a União. Reviravolta: nova cheia no Guaíba.
89. **Santa Catarina Industrial** · governador · SC · 2026 · Pleno emprego e falta de mão de obra. Reviravolta: debate sobre migrantes nordestinos e haitianos.
90. **Sergipe Petrolífero** · governador · SE · 2026 · Gás em águas profundas. Reviravolta: estatal adia investimentos.
91. **São Paulo Locomotiva** · governador · SP · 2026 · Privatizações de saneamento e metrô. Reviravolta: apagão de energia em plena onda de calor.
92. **Tocantins Novo** · governador · TO · 2026 · Estado mais jovem, fronteira do Matopiba. Reviravolta: crise hídrica no rio Tocantins.

### 1.3 Disputas nacionais

93. **2026 Polarizado** · presidente · Brasil · 2026 · Dois polos com 35% cada; centro dividido em cinco nomes. Objetivo: chegar ao 2º turno por fora da polarização.
94. **Terceira Via** · presidente · Brasil · 2026 · Você é o nome de centro com 6% e muito dinheiro. Objetivo: unificar o centro até agosto.
95. **Outsider Digital** · presidente · Brasil · 2026 · Influenciador sem partido grande, 15 milhões de seguidores. Objetivo: superar 20%. Reviravolta: TSE investiga disparos em massa.
96. **Reeleição Difícil** · presidente · Brasil · 2030 · Presidente com 38% de aprovação e inflação em alta. Objetivo: reeleger-se.
97. **Herdeiro** · presidente · Brasil · 2030 · Candidato do governo, desconhecido, apadrinhado por um presidente popular. Objetivo: transferir votos.
98. **Senado ou Nada** · senador · SP · 2026 · Uma vaga, dez candidatos. Objetivo: vencer com voto em todas as regiões.
99. **Puxador de Votos** · deputado federal · RJ · 2026 · Celebridade do esporte filiada. Objetivo: eleger mais três da chapa.
100.  **Bancada Evangélica** · deputado federal · GO · 2026 · Pastor fictício com rede de templos. Objetivo: maior votação do estado sem escândalo.
101.  **Voz da Periferia** · deputado estadual · BA · 2026 · Liderança comunitária sem dinheiro. Objetivo: ser eleito com militância.
102.  **Vereador de Primeira Viagem** · vereador · Caxias do Sul (RS) · 2028 · Jovem professor, partido pequeno. Objetivo: entrar pela sobra de vagas.
103.  **Vereador Influencer** · vereador · São Paulo (SP) · 2028 · 2 milhões de seguidores, zero experiência. Objetivo: ser o mais votado do país.
104.  **Prefeito de Capital** · prefeito · Salvador (BA) · 2028 · Polarização nacional invade a disputa local. Objetivo: vencer sem nacionalizar a campanha.
105.  **Rio sem Dono** · prefeito · Rio de Janeiro (RJ) · 2028 · Sete candidatos competitivos. Objetivo: chegar ao 2º turno.

### 1.4 Mandatos em andamento (começa empossado)

106. **Os Primeiros 100 Dias** · presidente · 2027 · Coalizão frágil, mercado desconfiado. Objetivo: aprovar 2 leis em 100 dias.
107. **Herança Maldita** · governador · RJ · 2027 · Rombo de 20% no orçamento. Objetivo: fechar as contas sem greve geral.
108. **Prefeitura Quebrada** · prefeito · Campos dos Goytacazes (RJ) · 2029 · Folha atrasada dois meses. Objetivo: pagar em dia em 6 meses.
109. **Cidade Submersa** · prefeito · Lajeado (RS) · 2029 · Enchente em janeiro, metade da cidade sem casa. Objetivo: reassentar 5 mil famílias.
110. **Crise Hídrica** · governador · SP · 2027 · Reservatórios em 8%. Objetivo: evitar rodízio na capital.
111. **Impeachment à Vista** · presidente · 2028 · CPI aberta, base rachada, 30% de aprovação. Objetivo: terminar o mandato.
112. **Greve dos Professores** · governador · PR · 2027 · Rede parada há 40 dias. Objetivo: encerrar a greve sem estourar o orçamento.
113. **Choque do Petróleo** · presidente · 2027 · Barril dobra de preço. Objetivo: segurar a inflação abaixo de 8%.
114. **Prefeito do Carnaval** · prefeito · Salvador (BA) · 2029 · Carnaval em 40 dias e caixa vazio. Objetivo: fazer a festa sem dívida.
115. **Câmara Hostil** · prefeito · Curitiba (PR) · 2029 · Só 9 de 38 vereadores na base. Objetivo: aprovar o plano diretor.
116. **Ponte Caiu** · governador · PA · 2027 · Ponte principal da capital desaba. Objetivo: reconstruir em 18 meses.
117. **Fronteira Fechada** · governador · RR · 2027 · Crise humanitária na fronteira. Objetivo: acolher sem colapsar serviços.
118. **Royalties Zero** · prefeito · Macaé (RJ) · 2029 · Arrecadação cai 40%. Objetivo: diversificar a economia.
119. **Pandemia Nova** · presidente · 2028 · Vírus respiratório se espalha. Objetivo: aprovação acima de 40% e mortes abaixo da meta.
120. **Reforma da Previdência** · presidente · 2027 · Déficit explode. Objetivo: aprovar PEC em 18 meses.
121. **Teto de Gastos** · presidente · 2027 · Mercado exige âncora fiscal. Objetivo: aprovar regra fiscal sem perder a base.
122. **Prefeito Interino** · prefeito · Natal (RN) · 2029 · Vice assume após cassação do titular. Objetivo: provar-se e disputar a reeleição.
123. **Vereador Fiscal** · vereador · Belo Horizonte (MG) · 2029 · Você descobre contrato superfaturado do prefeito. Objetivo: abrir CPI municipal.
124. **Senador Decisivo** · senador · AM · 2027 · Seu voto define a reforma tributária. Objetivo: arrancar vantagens para a Zona Franca.
125. **Deputado Relator** · deputado federal · MG · 2027 · Relator do orçamento. Objetivo: aprovar com suas emendas sem escândalo.

### 1.5 Carreiras longas

126. **De Vereador a Presidente** · vereador · cidade-polo à escolha · 2028 → 2046 · Objetivo: chegar à Presidência em até 18 anos.
127. **Dinastia** · prefeito · Juazeiro do Norte (CE) · 2028 · Família com três gerações na política. Objetivo: eleger seu herdeiro.
128. **Ficha Limpa** · deputado estadual · MA · 2026 · Nunca ter um escândalo acima de 10 em toda a carreira.
129. **O Partido Sou Eu** · vereador · Florianópolis (SC) · 2028 · Fundar partido e elegê-lo para governar o estado.
130. **Volta por Cima** · ex-prefeito · Recife (PE) · 2030 · Derrotado e investigado; absolvição e retorno.
131. **Sempre Oposição** · deputado federal · RS · 2026 · Nunca entrar em base de governo e ainda assim aprovar 3 leis.
132. **Camaleão** · vereador · Manaus (AM) · 2028 · Trocar de partido 3 vezes e ainda ganhar todas as eleições.
133. **Prefeito Recordista** · prefeito · Maringá (PR) · 2028 · Dois mandatos com aprovação média acima de 65%.
134. **Do Sindicato ao Planalto** · vereador · São Bernardo do Campo (SP) · 2028 · Começar como líder sindical.
135. **Do Agro ao Senado** · prefeito · Sinop (MT) · 2028 · Chegar ao Senado com apoio do agronegócio.

### 1.6 E se...?

136. **Parlamentarismo** · deputado federal · 2026 · Plebiscito aprovou parlamentarismo; o primeiro-ministro sai da Câmara.
137. **Voto Distrital** · deputado federal · 2026 · Eleição por distritos: você disputa só a sua região.
138. **Fim da Reeleição** · prefeito · 2028 · Mandato único de 5 anos, sem reeleição.
139. **Voto Facultativo** · presidente · 2026 · Comparecimento cai para 55%: mobilizar a base vale ouro.
140. **Financiamento Empresarial de Volta** · prefeito · 2028 · Empresas podem doar de novo.
141. **Recall** · governador · 2027 · Eleitores podem revogar seu mandato com abaixo-assinado.
142. **Candidaturas Avulsas** · prefeito · 2028 · Pode concorrer sem partido.
143. **Federação Única** · presidente · 2026 · Dois blocos de partidos obrigatórios.
144. **Capital no Planalto Central... de Novo** · governador · GO · 2026 · Proposta de mudar órgãos federais para Goiânia.
145. **Monarquia em Plebiscito** · presidente · 2027 · Plebiscito sobre forma de governo marcado.
146. **Estado Novo** · governador · PA · 2026 · Plebiscito para dividir o Pará em três estados.
147. **Moeda Digital** · presidente · 2027 · Real digital substitui cédulas.
148. **Semana de 4 Dias** · governador · SP · 2027 · Lei federal reduz jornada.
149. **Renda Básica Universal** · presidente · 2027 · Programa aprovado; o desafio é pagar.
150. **Sem Fundo Eleitoral** · prefeito · 2028 · Fundo público extinto; campanha só com doações de pessoas.

### 1.7 Desafios

151. **Sem Dinheiro** · prefeito · cidade-polo · 2028 · Começa com 10% do caixa normal.
152. **Sem Militância** · governador · 2026 · Militância zerada; só mídia paga.
153. **Contra Todos** · presidente · 2026 · Partido pequeno, 1% nas pesquisas.
154. **Modo Imprensa Hostil** · prefeito · 2028 · Todos os veículos começam contra você.
155. **Sem Debates** · prefeito · 2028 · Faltou a todos os debates: vença mesmo assim.
156. **Só Redes Sociais** · vereador · 2028 · Proibido TV e rádio.
157. **Coalizão de Arco-Íris** · presidente · 2027 · Base com partidos da esquerda à direita: manter todos por 2 anos.
158. **Sem Promessas** · prefeito · 2028 · Vencer sem fazer nenhuma promessa.
159. **Cumpra Tudo** · prefeito · 2029 · Cumprir 100% das promessas.
160. **Crise Permanente** · presidente · 2027 · Um choque econômico a cada 6 meses.

## 2. Arcos narrativos (eventos encadeados)

Formato: **Nome** · esfera · gatilho · etapas (→ intervalo) · desfechos. As variáveis entre colchetes vêm do arco (aliado, obra, empresa, bairro) e se mantêm entre as etapas.

### 2.1 Dinheiro e corrupção

1. **A Doação Generosa** · campanha · caixa abaixo de 30% · 1) Empresário [nome] oferece doação alta "sem recibo". → 10–20 dias · 2) Repórter pergunta sobre o empresário. → 2 meses · 3) PF faz busca na empresa. → 4 meses · 4) Empresário negocia delação. Desfechos: recusou (nada acontece; o empresário apoia o rival); aceitou e declarou (multa pequena); aceitou por fora (escândalo +25, risco de inelegibilidade).
2. **Obra Superfaturada** · prefeitura/estado · obra grande iniciada · 1) Engenheiro da secretaria alerta para aditivos de 40%. → 3 meses · 2) Tribunal de Contas abre auditoria. → 3 meses · 3) MP pede afastamento do secretário [nome]. → 2 meses · 4) Secretário ameaça "contar tudo". Desfechos: cancelar o aditivo cedo (obra atrasa, Cred +); defender o secretário (Est +, Esc +20 se ele cair); demitir e colaborar (Cap −10, Cred +10).
3. **O Primo do Vice** · governo · vice de outro partido · 1) Primo do vice ganha contrato de merenda. → 2 meses · 2) Merenda estragada em escola. → 1 mês · 3) Vice exige silêncio em troca de apoio. Desfechos: romper com o vice (base −1 partido); abafar (Esc latente +15); denunciar publicamente (Rel[partido do vice] −40, Cred +12).
4. **Rachadinha no Gabinete** · legislativo · equipe com 5+ assessores · 1) Assessor [nome] devolve parte do salário ao chefe de gabinete. → 2 meses · 2) Ex-assessor procura a imprensa. → 1 mês · 3) Conselho de Ética. Desfechos: afastar o chefe de gabinete na etapa 1 (sem escândalo); negar (Esc +20, Rej +3); assumir e devolver (Esc +8, Cred +5).
5. **Licitação Dirigida** · prefeitura · contrato de lixo vencendo · 1) Empresa sugere edital "sob medida". → 3 meses · 2) Concorrente perdedora entra na Justiça. → 4 meses · 3) Liminar suspende a coleta. Desfechos: edital aberto (preço maior, sem risco); edital dirigido (lixo nas ruas, Esc +18).
6. **Emenda Pix** · legislativo federal · relator de orçamento · 1) Prefeito aliado pede emenda direta. → 3 meses · 2) Dinheiro some em obra fantasma. → 2 meses · 3) TCU cita seu nome. Desfechos: emenda com convênio (lenta, segura); emenda direta (rápida, Esc +15 na etapa 3).
7. **Caixa da Campanha Passada** · governo · venceu com dívida de campanha · 1) Fornecedor cobra R$ 2 mi não pagos. → 1 mês · 2) Fornecedor ameaça processar. → 2 meses · 3) Proposta: pagar com contrato público. Desfechos: pagar com recursos próprios (Fama −, $ −); contrato público (Esc +30 se descoberto, chance 50%).
8. **O Lobista Simpático** · legislativo · comissão estratégica · 1) Jantar com lobista do setor [setor]. → 1 mês · 2) Viagem paga ao exterior. → 2 meses · 3) Foto da viagem vaza. Desfechos: recusar a viagem (GI[setor] −10); ir e declarar (Rej +2); ir sem declarar (Esc +15).
9. **Venda de Cargo** · governo · loteamento de secretarias · 1) Partido aliado indica [nome] com ficha suja. → 2 meses · 2) Indicado nomeia parentes. → 1 mês · 3) Reportagem nacional. Desfechos: vetar o indicado (Rel −25, base perde votos); aceitar e fiscalizar (custo de Cap mensal); aceitar sem olhar (Esc +20).
10. **Delação Premiada** · qualquer · escândalo latente ≥ 20 · 1) Ex-aliado preso negocia delação. → 3 meses · 2) Trechos vazam. → 1 mês · 3) STF homologa. Desfechos: jogador citado com provas (Esc +35, risco de inelegibilidade); citado sem provas (Esc +10, Cred −5); não citado (rival citado: Mom +).

### 2.2 Campanha e mídia

11. **O Vídeo Antigo** · campanha · fama ≥ 30 · 1) Vídeo de 10 anos atrás com fala polêmica reaparece. → 3 dias · 2) Viraliza em [grupo]. → 1 semana · 3) Rival usa no horário eleitoral. Desfechos: pedir desculpas (Rej −, Ent −); contextualizar (50% de sucesso); atacar o vazador (Ent +, Rej +).
12. **Deepfake** · campanha · últimos 20 dias · 1) Áudio falso com sua voz circula no WhatsApp. → 2 dias · 2) Pedido de remoção ao TSE. → 3 dias · 3) Perícia confirma montagem. Desfechos: ação rápida no TSE ($ −, remove em 3 dias); campanha de checagem (Con +, Rej −2); ignorar (Rej +4 até o fim).
13. **A Pesquisa Encomendada** · campanha · rival com mais dinheiro · 1) Instituto pouco conhecido mostra rival 15 pontos à frente. → 1 semana · 2) Efeito manada nas doações. → 1 semana · 3) Instituto é registrado com irregularidade no TSE. Desfechos: denunciar (Cred + se confirmado); ignorar (doações −20%).
14. **Influenciador Contratado** · campanha · gastou com influenciadores · 1) Influenciador [nome] faz post com erro grave sobre seu programa. → 2 dias · 2) Seguidores dele se dividem. → 1 semana · 3) Ele é "cancelado" por outro motivo. Desfechos: romper (Con −, sem risco); manter (Esc +5 por associação).
15. **Debate Pegadinha** · campanha · debate agendado · 1) Assessor recebe vazamento das perguntas. → até o debate · 2) Usar ou não. Desfechos: usar (Debate +20, 30% de chance de vazar: Esc +25); recusar e denunciar (Cred +8, emissora te favorece no próximo convite).
16. **Militante Exaltado** · campanha · entusiasmo ≥ 70 · 1) Militante agride apoiador do rival. → 1 dia · 2) Vídeo viraliza. Desfechos: expulsar e condenar (Ent −8, Rej −); minimizar (Rej +3, Mil +).
17. **Biografia Não Autorizada** · campanha/governo · fama ≥ 50 · 1) Jornalista anuncia livro sobre sua vida. → 2 meses · 2) Capítulo sobre sua família vaza. → 1 mês · 3) Livro vira best-seller. Desfechos: dar entrevista ao autor (texto equilibrado); processar (Efeito Streisand: Con +, Rej +); ignorar (texto hostil).
18. **Cadeira Vazia** · campanha · faltou a um debate · 1) Emissora mantém sua cadeira vazia no palco. → próximo debate · 2) Memes. Desfechos: ir ao próximo (Debate exige nota alta); faltar de novo (Rej +3, Ent −).
19. **Apoio do Ídolo** · campanha · grupo jovem baixo · 1) Cantor famoso [nome] oferece apoio. → 1 semana · 2) Show-comício. → 1 semana · 3) Cantor faz declaração polêmica. Desfechos: aceitar (Con +8 entre jovens; risco de associação); recusar (nada).
20. **Hacker da Campanha** · campanha · usa redes intensamente · 1) Conta oficial invadida, posts falsos. → 1 dia · 2) Dados de doadores vazam. → 1 semana · 3) ANPD abre processo. Desfechos: investir em segurança na etapa 1 ($ −, encerra o arco); ignorar (Esc +10, doações −).

### 2.3 Partido e alianças

21. **A Convenção** · campanha · 30 dias antes da campanha · 1) Rival interno [nome] quer a vaga. → 1 semana · 2) Votação dos delegados. Desfechos: negociar (vice ou secretaria para ele); disputar (Uni −15 se vencer apertado); desistir (candidatura cai).
22. **Federação Quebrada** · campanha/governo · partido federado · 1) Partido parceiro da federação exige cabeça de chapa. → 1 mês · 2) Ameaça romper. Desfechos: ceder (Ent −); romper (tempo de TV −30%).
23. **O Padrinho** · carreira · primeira candidatura · 1) Veterano [nome] oferece apadrinhamento. → eleição · 2) Padrinho cobra cargo para o filho. → mandato · 3) Padrinho é investigado. Desfechos: aceitar (Con +, Fama +, dívida política); recusar (sem bônus, sem risco).
24. **A Janela Partidária** · legislativo · ano eleitoral · 1) Três colegas de bancada anunciam saída. → 1 mês · 2) Seu partido perde tempo de TV. Desfechos: segurar com cargos (Cap −); deixar sair (Uni +, força −).
25. **Ala Rebelde** · qualquer · unidade < 50 · 1) Ala [nome] publica manifesto contra você. → 1 mês · 2) Ameaça lançar candidato próprio. → 2 meses · 3) Expulsão ou acordo. Desfechos: incorporar pauta da ala (posição muda); expulsar (Uni +10, Mil −20%).
26. **Troca de Partido** · carreira · relação com direção < −30 · 1) Outro partido oferece legenda e fundo. → 2 meses · 2) Antigo partido ameaça pedir o mandato na Justiça. Desfechos: trocar na janela (seguro); trocar fora da janela (risco de perder mandato).
27. **Coligação Proibida** · campanha · alinhamento ideológico baixo com aliado · 1) Aliado improvável oferece apoio. → 1 semana · 2) Base reclama. → 2 semanas · 3) Aliado exige cargo. Desfechos: aceitar (TV +, Ent −10); recusar.
28. **O Vice Ambicioso** · governo · vice de outro partido · 1) Vice dá entrevistas como "alternativa". → 3 meses · 2) Vice articula com a oposição. → 3 meses · 3) Pedido de impeachment com apoio do vice. Desfechos: dar ao vice uma pasta (neutraliza); isolar o vice (Est −); expor a conspiração (Cred +, Esc + se não tiver provas).

### 2.4 Governo e gestão

29. **A Greve que Cresce** · governo · servidores insatisfeitos · 1) Professores fazem assembleia. → 1 mês · 2) Greve parcial. → 1 mês · 3) Greve geral do funcionalismo. → 1 mês · 4) Justiça manda cortar ponto. Desfechos por etapa: negociar cedo (custo menor); endurecer (GI[servidores] −30, Est −).
30. **Concessão do Saneamento** · governo · cobertura de esgoto < 60% · 1) Proposta de concessão privada. → 4 meses · 2) Leilão com um único interessado. → 2 meses · 3) Tarifa sobe 20%. Desfechos: concessão (investimento +, Sat[pobres] − no curto prazo); manter público (orçamento −).
31. **O Viaduto** · prefeitura · obra de mobilidade · 1) Viaduto fica pronto 6 meses antes da eleição. → 1 mês · 2) Rachadura aparece. → 2 meses · 3) Interdição. Desfechos: inaugurar logo (Apr +6, risco); esperar laudo (Apr menor, sem risco).
32. **Hospital Fantasma** · estado · hospital regional prometido · 1) Obra parada por falta de verba. → 6 meses · 2) Mutirão de doentes na porta. → 2 meses · 3) MP cobra. Desfechos: remanejar verba (outra área cai); parceria com OS (debate ideológico).
33. **Surto de Dengue** · prefeitura · verão e chuva · 1) Casos sobem 300%. → 1 mês · 2) Hospitais lotam. → 1 mês · 3) Morte de criança vira manchete. Desfechos: mutirão cedo ($ −, sem crise); esperar ajuda do estado (Apr −8).
34. **Apagão** · estado/União · déficit de energia · 1) Bandeira tarifária vermelha. → 2 meses · 2) Apagão regional. → 1 mês · 3) CPI do setor elétrico. Desfechos: térmicas caras (inflação +); racionamento (Apr −10).
35. **Crise Hídrica** · estado · reservatórios < 20% · 1) Pressão reduzida à noite. → 2 meses · 2) Rodízio. → 2 meses · 3) Saques a caminhões-pipa. Desfechos: obras emergenciais caras; campanha de economia (Sat +, eficaz se feita cedo).
36. **O Presídio** · estado · superlotação > 150% · 1) Fuga em massa. → 1 mês · 2) Rebelião com reféns. → 2 semanas · 3) Massacre ou acordo. Desfechos: negociar (Sat[segurança] −); invadir (risco de mortes, Esc +).
37. **Contas Rejeitadas** · prefeitura · déficit dois anos seguidos · 1) TCE recomenda rejeição das contas. → 3 meses · 2) Câmara vota. Desfechos: articular a Câmara (Cap −15); aceitar (inelegibilidade em risco).
38. **A Universidade Nova** · União/estado · região sem campus · 1) Prefeitos disputam o campus. → 3 meses · 2) Você escolhe a cidade. → 2 anos · 3) Inauguração. Desfechos: cidade aliada (Rel +, Cred −); cidade técnica (Cred +).
39. **Calote do Estado** · prefeitura · repasses atrasados · 1) Estado atrasa saúde. → 2 meses · 2) Postos fecham à tarde. → 1 mês · 3) Prefeitos fazem frente. Desfechos: liderar a frente (Fama +, Rel[governador] −); negociar sozinho.
40. **Privatização Polêmica** · União · estatal deficitária · 1) Proposta de venda. → 6 meses · 2) Greve dos empregados. → 2 meses · 3) Leilão. Desfechos: vender (caixa +, GI[sindicatos] −); reestruturar (Cap −).

### 2.5 Segurança e crises

41. **A Facção** · estado · violência alta · 1) Facção ataca ônibus. → 1 semana · 2) Toque de recolher informal. → 2 semanas · 3) Pedido de Força Nacional. Desfechos: pedir ajuda federal (Rel[presidente] importa); operação própria (risco de mortes).
42. **Milícia no Bairro** · prefeitura/estado · capital grande · 1) Moradores denunciam cobrança de "taxa". → 2 meses · 2) Vereador ligado à milícia pede cargo. → 1 mês · 3) Investigação. Desfechos: confrontar (Sat[segurança] +, risco pessoal); ignorar (Esc + se o vereador cair).
43. **Chacina** · estado · operação policial · 1) Operação deixa 15 mortos. → 1 semana · 2) Protestos e versões em conflito. → 1 mês · 3) Inquérito. Desfechos: afastar comando (GI[polícia] −); defender a operação (Sat[segurança] +, Rej[jovens] +).
44. **Enchente** · qualquer · chuva extrema · 1) Alerta da Defesa Civil. → 3 dias · 2) Cheia histórica. → 1 semana · 3) Reconstrução. Desfechos: evacuar cedo ($ −, vidas salvas); esperar (risco de tragédia, Apr −20).
45. **Barragem** · estado · mineração ativa · 1) Fiscal aponta risco. → 6 meses · 2) Sirene toca por engano. → 3 meses · 3) Rompimento ou não. Desfechos: interditar (GI[indústria] −); confiar no laudo da empresa (risco catastrófico).
46. **Queimadas** · Norte/Centro-Oeste · seca · 1) Focos dobram. → 2 semanas · 2) Fumaça fecha aeroporto. → 2 semanas · 3) Pressão internacional. Desfechos: brigadas e multas (GI[agro] −); deixar com o estado/União (Sat[saúde] −).
47. **Epidemia** · União · surto respiratório · 1) Casos no exterior. → 1 mês · 2) Primeiros casos. → 1 mês · 3) Pico. Desfechos: fechar fronteiras cedo (economia −); esperar (mortes +).
48. **Seca no Sertão** · Nordeste · chuva abaixo da média · 1) Açudes em 10%. → 2 meses · 2) Carros-pipa. → 3 meses · 3) Êxodo para a capital. Desfechos: obras hídricas ($ −−); auxílio emergencial (Sat +, orçamento −).
49. **Crise Migratória** · fronteira · país vizinho em crise · 1) Fluxo dobra. → 1 mês · 2) Abrigos lotados. → 2 meses · 3) Conflitos com moradores. Desfechos: interiorização com a União; fechar a fronteira (inconstitucional: STF derruba).
50. **Ataque Hacker ao Governo** · estado/União · digitalização alta · 1) Sistema de saúde fora do ar. → 1 semana · 2) Pedido de resgate. Desfechos: pagar (Esc +10); não pagar (serviços −1 mês).

### 2.6 Justiça e instituições

51. **Ficha Suja** · carreira · condenação em 1ª instância · 1) Recurso no tribunal. → 1 ano · 2) Julgamento em 2ª instância. Desfechos: absolvição (Cred +15); condenação (inelegível 8 anos: troca de cargo, herdeiro, ou recurso ao STF).
52. **Cassação** · governo · abuso de poder na campanha · 1) Ação no TRE. → 6 meses · 2) Julgamento. → 3 meses · 3) TSE. Desfechos: absolvição; cassação (vice assume, nova eleição).
53. **STF Derruba Lei** · governo · lei polêmica aprovada · 1) ADI no STF. → 3 meses · 2) Liminar. → 6 meses · 3) Plenário. Desfechos: lei mantida (Cap +); derrubada (Cap −10; promessa vira "parcial").
54. **CPI** · governo · escândalo ≥ 20 ou aprovação < 35 · 1) Assinaturas para CPI. → 1 mês · 2) Instalação. → 3 meses · 3) Relatório final. Desfechos: barrar as assinaturas (Cap −20); controlar a relatoria (Cap −10, Cred −); colaborar (Cred +).
55. **Mandado na Madrugada** · qualquer · escândalo latente · 1) PF em casa de aliado. → 1 dia · 2) Imagens na TV. → 1 semana · 3) Prisão preventiva. Desfechos: defender o aliado (Esc +); "confio na Justiça" (neutro); romper (Rel −).
56. **Direito de Resposta** · campanha · ataque recebido · 1) Rival te acusa no horário eleitoral. → 2 dias · 2) Pedido ao TSE. Desfechos: TSE concede (Rej[rival] +, você ganha tempo de TV); nega (Rej +2).
57. **Impeachment** · União/estado · aprovação < 25 e base < 1/3 · 1) Pedido aceito pela Mesa. → 1 mês · 2) Comissão especial. → 2 meses · 3) Plenário. → 1 mês · 4) Senado/Assembleia. Desfechos: barrar com negociação (Cap −40); afastamento.
58. **Indulto Polêmico** · União · aliado condenado · 1) Pedido de indulto. → 1 mês · 2) Reação. Desfechos: conceder (Ent +, Rej +6, ADI); negar (Rel[partido] −).
59. **Juiz Midiático** · qualquer · investigação aberta · 1) Juiz [nome] dá entrevistas sobre o caso. → 2 meses · 2) Vazamentos seletivos. → 2 meses · 3) Juiz anuncia candidatura. Desfechos: pedir suspeição (Cred depende das provas); entrar no jogo da mídia.
60. **Plebiscito** · estado/União · tema dividido · 1) Proposta de consulta. → 4 meses · 2) Campanha do sim e do não. → 1 mês · 3) Resultado. Desfechos: vitória da sua posição (Cap +20); derrota (Cap −20, posição muda).

### 2.7 Economia e empresas

61. **A Fábrica Vai Embora** · prefeitura/estado · indústria relevante · 1) Empresa ameaça mudar para outro estado. → 2 meses · 2) Oferta do estado vizinho. → 1 mês · 3) Decisão. Desfechos: incentivo fiscal (receita −); deixar ir (desemprego +2 p.p. local).
62. **Guerra Fiscal** · estado · vizinho dá incentivos · 1) Três empresas migram. → 3 meses · 2) Retaliação? Desfechos: cobrir a oferta (receita −); ação no STF (lenta).
63. **Montadora Nova** · estado · logística boa · 1) Montadora estrangeira visita. → 2 meses · 2) Exige terreno e 15 anos sem ICMS. → 1 mês · 3) Inauguração ou desistência. Desfechos: aceitar (empregos +, receita −); contraproposta (50%).
64. **Frigorífico Fechado** · interior · embargo à carne · 1) Mercado externo suspende compras. → 1 mês · 2) Férias coletivas. → 2 meses · 3) Demissões. Desfechos: missão comercial; auxílio aos trabalhadores.
65. **Bolha Imobiliária** · cidade grande · juros baixos · 1) Aluguéis sobem 30%. → 6 meses · 2) Despejos. → 3 meses · 3) Ocupações. Desfechos: controle de aluguéis (polêmico); moradia popular ($ −).
66. **Startup Unicórnio** · cidade com universidade · 1) Startup local vale US$ 1 bi. → 6 meses · 2) Ameaça mudar sede para SP. Desfechos: parque tecnológico; isenção de ISS.
67. **Calote do Fornecedor** · governo · obra grande · 1) Construtora pede recuperação judicial. → 1 mês · 2) Obra para. → 6 meses · 3) Nova licitação. Desfechos: assumir a obra (orçamento −); esperar (obra parada até a eleição).
68. **Commodity em Alta** · agro · preço internacional sobe · 1) Receita do estado dispara. → 6 meses · 2) Pressão para gastar. → 6 meses · 3) Preço despenca. Desfechos: poupar (fundo soberano); gastar (Apr +, crise depois).
69. **Pedágio** · estado · rodovia concedida · 1) Nova praça de pedágio. → 1 mês · 2) Caminhoneiros bloqueiam. → 2 semanas · 3) Justiça. Desfechos: reduzir tarifa (contrato renegociado); manter.
70. **Porto Privado** · litoral · 1) Grupo propõe porto em área de mangue. → 6 meses · 2) Licença ambiental. → 6 meses · 3) Protestos. Desfechos: aprovar (empregos +, GI[ambientalistas] −); negar.

### 2.8 Pessoal e família

71. **Filho na Política** · carreira · idade ≥ 55 · 1) Filho quer se candidatar a vereador. → eleição · 2) Imprensa fala em nepotismo. Desfechos: apoiar (Fama + para o herdeiro, Rej +2); desencorajar.
72. **Problema de Saúde** · qualquer · idade ≥ 60 · 1) Exame preocupante. → 1 mês · 2) Cirurgia. Desfechos: tornar público (solidariedade, Con +); esconder (risco de escândalo se vazar).
73. **Casamento em Crise** · qualquer · fama ≥ 40 · 1) Boatos de separação. → 2 meses · 2) Foto em revista. Desfechos: nota pública (Rej neutro); silêncio (fofoca dura mais).
74. **Ameaça de Morte** · qualquer · enfrentou crime organizado · 1) Ameaça anônima. → 1 semana · 2) Escolta. Desfechos: aceitar escolta (contato com eleitores −); recusar (risco).
75. **Atentado** · campanha · polarização alta · 1) Agressão em comício. → 1 dia · 2) Hospital. → 2 semanas · 3) Volta à campanha. Desfechos: solidariedade (Con +15, Rej −); acusações sobre o agressor dividem o país.
76. **Herança** · carreira · 1) Você herda uma fazenda com conflito de terra. → 3 meses · 2) Ocupação. Desfechos: doar para reforma agrária; vender; manter (Esc + se houver trabalho irregular).
77. **Amigo de Infância** · prefeitura · 1) Amigo pede emprego na prefeitura. → 1 mês · 2) Amigo é incompetente. Desfechos: nomear (Esc baixo, eficiência −); negar (relação pessoal).
78. **Livro de Memórias** · aposentadoria · 1) Editora propõe livro. → 1 ano · 2) Revelações sobre ex-aliados. Desfechos: contar tudo (Fama +, inimigos); versão leve.
79. **Diploma** · campanha · 1) Rival questiona seu diploma. → 1 semana · 2) Universidade confirma ou não. Desfechos: mostrar o diploma (encerra); "foi engano no currículo" (Esc +8).
80. **Viagem de Férias** · governo · em plena crise · 1) Foto sua em praia durante enchente. → 1 dia · 2) Repercussão. Desfechos: voltar e assumir (Apr −3); justificar (Apr −8).

### 2.9 Rivais e personagens recorrentes

81. **Arqui-Inimigo** · carreira · 3+ confrontos com o mesmo rival · 1) Rival [nome] anuncia que vai disputar contra você de novo. → eleição · 2) Dossiê sobre seu passado. → campanha · 3) Debate final só entre vocês. Desfechos: vencer (selo "Nêmesis derrotado"); perder (rival ganha cargo e passa a te atacar de lá).
82. **O Pupilo** · carreira · mandato com secretário jovem competente · 1) Secretário [nome] cresce nas pesquisas. → 1 ano · 2) Ele quer ser candidato no seu lugar. Desfechos: apoiá-lo (aliado fiel por anos); bloqueá-lo (vira rival).
83. **Ex-Aliado Ressentido** · carreira · rompeu com aliado · 1) Ex-aliado dá entrevista contra você. → 3 meses · 2) Ele se aproxima do seu rival. → eleição · 3) Ele revela bastidores no debate. Desfechos: reconciliar (cargo); processar; ignorar.
84. **Jornalista Obstinado** · governo · escândalo latente · 1) Repórter [nome] faz pedidos via Lei de Acesso. → 3 meses · 2) Série de reportagens. → 3 meses · 3) Prêmio de jornalismo para a série. Desfechos: transparência (Cred +); negar dados (Esc +).
85. **A Velha Raposa** · legislativo · presidente da Casa · 1) Presidente da Câmara [nome] engaveta seu projeto. → 3 meses · 2) Ele propõe troca: seu voto no projeto dele. Desfechos: aceitar (seu projeto anda); recusar (projeto morre).
86. **O Empresário Candidato** · campanha · rival rico · 1) Rival milionário [nome] anuncia gastos recorde. → campanha · 2) Ele compra espaço em todos os veículos. Desfechos: campanha de rua (Mil vale mais); denunciar abuso econômico ao TSE.
87. **A Herdeira** · campanha · rival de família política · 1) Filha de ex-governador [nome] lidera as pesquisas. → campanha · 2) Escândalo antigo do pai. Desfechos: usar o escândalo (Rej + para ambos); ignorar.
88. **O Coach** · campanha · candidato outsider forte · 1) Coach [nome] cresce com lives. → campanha · 2) Ele não vai aos debates. → campanha · 3) Ele é processado por estelionato. Desfechos: atacar (Ent +); ignorar (ele perde fôlego sozinho, 50%).
89. **O General** · campanha · segurança em alta · 1) Militar da reserva [nome] entra na disputa. → campanha · 2) Ele defende intervenção. Desfechos: disputar o voto da segurança; defender as instituições (Cred +).
90. **A Pastora** · campanha · eleitorado religioso alto · 1) Pastora [nome] declara apoio ao rival. → 1 semana · 2) Templos viram comitês. Desfechos: buscar outras igrejas; denunciar abuso religioso no TSE.

### 2.10 Território e cidade

91. **O Morro** · prefeitura · encosta ocupada · 1) Defesa Civil interdita 200 casas. → 1 mês · 2) Moradores resistem. → chuva · 3) Deslizamento ou realocação. Desfechos: realocar com aluguel social ($ −); deixar (risco de tragédia).
92. **Plano Diretor** · prefeitura · 1) Incorporadoras querem prédios na orla. → 3 meses · 2) Audiências públicas lotadas. → 3 meses · 3) Votação. Desfechos: verticalizar (receita +, GI[ambientalistas] −); preservar.
93. **Tarifa de Ônibus** · prefeitura · inflação alta · 1) Empresas pedem reajuste de 15%. → 1 mês · 2) Protestos estudantis. → 2 semanas · 3) Ocupação da Câmara. Desfechos: subsidiar (orçamento −); reajustar (Apr −6, Sat[estudantes] −).
94. **Ciclovia** · cidade média · 1) Ciclovia tira vagas de carro. → 1 mês · 2) Comerciantes protestam. → 3 meses · 3) Uso dobra. Desfechos: manter (Sat[classe média] dividido); recuar.
95. **Cracolândia** · capital · 1) Concentração de usuários no centro. → 2 meses · 2) Comerciantes fecham lojas. → 2 meses · 3) Operação ou acolhimento. Desfechos: internação (polêmico); redução de danos (polêmico).
96. **Feira Livre** · cidade-polo · 1) Prefeitura quer tirar a feira histórica do centro. → 3 meses · 2) Feirantes protestam. Desfechos: manter; transferir com estrutura.
97. **Estádio** · capital · Copa ou Olimpíada regional · 1) Proposta de estádio novo. → 1 ano · 2) Custos dobram. → 1 ano · 3) Elefante branco? Desfechos: parceria privada; desistir.
98. **Shopping no Centro Histórico** · cidade histórica · 1) Proposta de shopping em casarão tombado. → 6 meses · 2) Iphan se manifesta. Desfechos: aprovar com contrapartidas; vetar.
99. **Aterro Sanitário** · região metropolitana · 1) Lixão precisa fechar por lei. → 1 ano · 2) Nenhuma cidade aceita o aterro. → 6 meses · 3) Crise do lixo. Desfechos: consórcio regional; aterro na sua cidade (Sat[bairro] −).
100.  **Metrô** · capital · 1) Projeto de nova linha. → 2 anos · 2) Desapropriações. → 2 anos · 3) Inauguração (só no próximo mandato). Desfechos: começar (legado, Apr no futuro); adiar.

## 3. Eventos de campanha

Formato: **Título** — gatilho. Opções com efeitos (abreviações na legenda do início). ↪ indica continuação possível.

### 3.1 Rua e corpo a corpo

1. **Comício esvaziado** — comício em região com Pres < 20. A) Discursar mesmo assim: Con +1, Ent −3. B) Cancelar e culpar o tempo: Cred −2. C) Transformar em conversa na praça: Pres +6, Ene −10.
2. **Chuva no comício** — comício em mês chuvoso. A) Discursar na chuva: Ent +6, Con +2 (vídeo viraliza 30%). B) Adiar: $ −30% do custo.
3. **Carreata travada** — carreata em capital. A) Seguir: trânsito irrita, Rej +1 na classe média. B) Desviar para bairros: Pres +4.
4. **Pastel na feira** — caminhada em feira. A) Comer e conversar: Mom[comerciantes] +3. B) Foto rápida: Con +1.
5. **Morador desabafa** — caminhada em bairro pobre. A) Ouvir 20 minutos: Mom[desempregados] +4, Ene −8. B) Prometer resolver: vira promessa local.
6. **Criança no colo** — porta a porta. A) Foto: Con +2. B) Evitar: nada. (5%: mãe é apoiadora do rival e reclama: Rej +1.)
7. **Vaias no estádio** — visita a jogo de futebol. A) Acenar sorrindo: Rej +1, Con +3. B) Sair antes do fim: nada.
8. **Benzedeira** — interior religioso. A) Aceitar a bênção: Mom[aposentados] +3. B) Recusar educadamente: nada.
9. **Motoboys** — capital, desemprego alto. A) Reunião com entregadores: Mom[trabalhadores] +4, Foco[jobs] +5. B) Mandar assessor: Mom +1.
10. **Pneu furado na estrada** — caravana no interior. A) Trocar o pneu você mesmo e filmar: Con +2 (viral 20%). B) Esperar o socorro: Ene −5.
11. **Cachorro caramelo** — qualquer. A) Adotar um cachorro de rua com câmeras: Con +3, Ent +2. B) Não: nada.
12. **Mercado municipal** — cidade-polo. A) Café com comerciantes: GI[comércio] +5. B) Discurso rápido: Con +1.
13. **Sindicato fecha a porta** — visita a fábrica. A) Falar no portão: Mom[operários] +2, Rel com sindicato −. B) Ir embora: nada.
14. **Escola em reforma** — caminhada. A) Denunciar abandono: Foco[education] +8, rival governista Rej +1. B) Ficar em silêncio: nada.
15. **Ônibus lotado** — capital. A) Andar de ônibus na hora do rush e filmar: Con +3, Mom[trabalhadores] +2 (5%: soa forçado, Rej +1). B) Não.
16. **Moradores de rua** — centro de capital. A) Visita com proposta: Foco[welfare] +6. B) Evitar a região: nada.
17. **Ribeirinhos** — Norte, Pres baixa. A) Viagem de barco de 2 dias: Pres +10, Ene −25. B) Live com lideranças: Pres +3.
18. **Assentamento** — interior. A) Visitar: Mom[agricultores familiares] +4, GI[agro] −3. B) Não: nada.
19. **Romaria** — Nordeste religioso. A) Caminhar com romeiros: Mom[aposentados] +5, Ene −15. B) Mensagem em vídeo: +1.
20. **Universidade** — cidade universitária. A) Debate com estudantes: Mom[estudantes] +5, risco de vaia 25% (Rej +1). B) Palestra fechada: +2.

### 3.2 Mídia e redes

21. **Meme favorável** — Con ≥ 30. A) Repostar: Con +4, Mom[jovens] +3. B) Ignorar: Con +1.
22. **Meme contra** — gafe recente. A) Rir de si mesmo: Rej −1, Con +2. B) Mandar remover: Efeito Streisand, Rej +2.
23. **Live com recorde** — gastou com redes. A) Live de 3 horas: Con +3, Ene −15. B) Live curta: Con +1.
24. **Podcast famoso convida** — Con < 40. A) Ir: Con +6, risco de pergunta difícil (entrevista hostil 40%). B) Recusar: nada.
25. **TikTok viral** — jovem da equipe sugere dancinha. A) Dançar: Mom[estudantes] +4, Cred −2. B) Recusar: nada.
26. **Jornal regional faz série** — interior. A) Entrevista exclusiva: Pres +4 na região. B) Recusar: série vira crítica.
27. **Âncora de TV provoca** — entrevista de TV. A) Responder à altura: Ent +5, Rej +2. B) Manter a calma: Cred +2.
28. **Fake news sobre saúde** — rival agressivo. A) Desmentir com documento: Rej −1, $ −. B) Ignorar: Rej +2 em 10 dias.
29. **Robôs no Twitter** — rede social. A) Denunciar perfis falsos: Cred +2. B) Contratar robôs também: Con +3, risco Esc +15 (30%). ↪ investigação do TSE.
30. **Grupo de WhatsApp vazado** — campanha usa grupos. A) Pedir desculpas pelos áudios: Rej +1. B) Negar autenticidade: Esc +5 se provado.
31. **Rádio comunitária** — interior pobre. A) Programa semanal: Pres +5, Mom[aposentados] +3. B) Não.
32. **Revista de fofoca** — fama ≥ 40. A) Capa com a família: Con +4, Cred −1. B) Recusar: nada.
33. **Entrevista ao vivo cai** — falha técnica. A) Refazer: Con +1. B) Desistir: nada.
34. **Jornalista exige resposta** — escândalo latente. A) Responder por nota: Esc −2. B) Ligar para o dono do jornal: Esc +6 se vazar.
35. **Checagem de fatos** — fez proposta numérica. A) Corrigir o número: Cred +2. B) Insistir: Cred −4.
36. **Documentário** — fama ≥ 50. A) Liberar bastidores: Con +5, risco de cena ruim 20%. B) Negar: nada.
37. **Celebridade critica** — qualquer. A) Responder: Ent +3, Rej +1. B) Convidar para conversar: 40% vira apoio.
38. **Anúncio impulsionado barrado** — redes. A) Recorrer: $ −. B) Trocar a peça: nada.
39. **Horóscopo político** — jornal popular. A) Fazer piada: Con +1. B) Ignorar.
40. **Trend da comida** — redes. A) Postar comendo prato regional: Mom[região] +2. B) Não.

### 3.3 Pesquisas

41. **Pesquisa surpresa** — 1ª pesquisa registrada. Notícia: sua posição mexe nas doações (+/−).
42. **Empate técnico** — diferença < 3 p.p. A) Explorar "voto útil": Mom +3, Rej +1. B) Manter o tom: nada.
43. **Queda brusca** — perdeu 5 p.p. em uma semana. A) Trocar o marqueteiro: $ −, Mom +2 após 1 semana. B) Manter a estratégia: Ent −5.
44. **Instituto amigo** — instituto simpático oferece pesquisa "boa". A) Divulgar: Mom +2, Cred −3 se contestada. B) Recusar.
45. **Pesquisa interna vaza** — fez pesquisa interna. A) Confirmar: Mom depende do resultado. B) Negar: Cred −1.
46. **Rejeição alta** — Rej ≥ 40. A) Campanha de desconstrução da rejeição: $ −−, Rej −3. B) Atacar quem lidera: Rej +1, rival Rej +3.
47. **Liderança folgada** — 15 p.p. à frente. A) Faltar a debates: Rej +1. B) Manter o ritmo: nada.
48. **Indecisos em alta** — indecisos ≥ 30%. A) Campanha de propostas: Foco[tema] +5. B) Atacar: polariza.
49. **Pesquisa por segmento** — estatístico na equipe. A) Mirar o segmento mais volátil: Mom[grupo] +4. B) Reforçar a base: Ent +3.
50. **Instituto erra feio** — pesquisa contestada. A) Atacar institutos: Ent +3, Cred −1. B) Silêncio.

### 3.4 Dinheiro

51. **Doador misterioso** — caixa < 30%. A) Aceitar e declarar: $ +, Esc +2. B) Recusar: nada. C) Aceitar por fora: $ ++, Esc latente +20. ↪ investigação.
52. **Vaquinha bomba** — Ent ≥ 60. A) Campanha de doações: $ + proporcional à militância. B) Não.
53. **Jantar de R$ 5 mil** — empresariado. A) Fazer: $ +, Mom[trabalhadores] −2. B) Jantar popular: $ pequeno, Ent +3.
54. **Fundo partidário atrasado** — relação com direção < 0. A) Ligar para o presidente do partido: Uni −, $ chega. B) Esperar 10 dias.
55. **Fornecedor caro** — gráfica cobra o dobro. A) Pagar: $ −. B) Trocar: material atrasa 5 dias.
56. **Multa da Justiça Eleitoral** — propaganda irregular. A) Pagar e corrigir: $ −. B) Recorrer: 50%.
57. **Prestação de contas parcial** — meio da campanha. A) Publicar detalhado: Cred +2. B) Mínimo legal: nada.
58. **Empresa oferece avião** — campanha nacional. A) Aceitar como doação declarada: Ene +20 por semana, Rej +1. B) Recusar.
59. **Cabos eleitorais pedem aumento** — militância paga. A) Pagar: $ −, Pres mantém. B) Negar: Pres −5.
60. **Crowdfunding internacional** — brasileiros no exterior. A) Aceitar (só pessoa física brasileira): $ +. B) Cuidado: nada.

### 3.5 Equipe

61. **Marqueteiro estrela** — caixa ≥ 60%. A) Contratar: $ −−, Mom +. B) Manter o atual.
62. **Coordenador briga com marqueteiro** — equipe ≥ 4. A) Ficar com o coordenador: Mil +, mídia −. B) Ficar com o marqueteiro: mídia +, Mil −.
63. **Assessor vaza estratégia** — equipe grande. A) Demitir: Uni +. B) Usar como contrainformação: 50%.
64. **Estagiário posta errado** — redes. A) Assumir o erro: Rej neutro. B) Culpar o estagiário: Rej +1.
65. **Equipe exausta** — Ene < 20 por 5 dias. A) Folga geral: Ene +30, perde 2 dias. B) Seguir: risco de demissão.
66. **Preparador de debate exige exclusividade** — debate próximo. A) Aceitar: Prep +20. B) Negar.
67. **Social media pede demissão** — redes. A) Contraproposta: $ −. B) Aceitar: redes −1 nível.
68. **Coordenador regional some** — interior. A) Substituir: $ −. B) Esperar: Pres −3.
69. **Ex-assessor do rival oferece dossiê** — rival forte. A) Contratar: Esc latente +10, rival Rej +4. B) Recusar.
70. **Motorista dá entrevista** — fama ≥ 30. A) Ignorar: fofoca. B) Processar: Rej +1.

### 3.6 Partido e alianças

71. **Direção impõe vice** — eleição majoritária. A) Aceitar: Uni +10. B) Recusar: Uni −15, $ partidário −.
72. **Aliado pede secretaria** — coligação. A) Prometer: vira promessa. B) Recusar: aliado esfria.
73. **Ex-presidente do partido em desgraça** — escândalo no partido. A) Distanciar-se: Uni −5, Rej −1. B) Defender: Esc +3.
74. **Prévia interna** — partido grande. A) Disputar: Uni em jogo. B) Acordo: vice para o rival interno.
75. **Federação briga** — partido federado. A) Mediar: Ene −10. B) Deixar pra lá: TV −.
76. **Puxador desiste** — eleição proporcional. A) Buscar novo puxador: $ −. B) Investir em você: Con +.
77. **Convite de outro partido** — relação com direção baixa. A) Trocar (só na janela). B) Negar.
78. **Liderança nacional visita** — partido grande. A) Comício juntos: Con +4, nacionaliza a eleição. B) Recusar a visita: Uni −5.
79. **Partido aliado rompe** — você caiu nas pesquisas. A) Reconquistar: promessa. B) Seguir sem eles.
80. **Militância racha** — Uni < 40. A) Reunião de reconciliação: Ene −15, Uni +8. B) Ignorar: Mil −10%.

### 3.7 Adversários

81. **Rival em escândalo** — rival com Esc latente. A) Explorar: rival Rej +4, sua Rej +1. B) Silêncio elegante: Cred +2.
82. **Rival copia proposta** — proposta lançada. A) Denunciar plágio: Con +2. B) Elogiar: Cred +1.
83. **Rival desiste e apoia outro** — rival com < 3%. A) Disputar o apoio dele: promessa. B) Nada.
84. **Rival pede debate extra** — rival atrás. A) Aceitar: debate extra. B) Recusar: Rej +1.
85. **Rival faz ataque pessoal** — rival agressivo. A) Responder: Ent +, Rej +. B) Direito de resposta: 50%.
86. **Rival adoece** — qualquer. A) Mensagem de solidariedade: Cred +2. B) Nada.
87. **Rival tem apoio do governo** — governista. A) Denunciar uso da máquina: Cred +, risco de prova fraca. B) Ignorar.
88. **Rival milionário** — rival com $ alto. A) Discurso contra o dinheiro: Mom[trabalhadores] +2. B) Ignorar.
89. **Rival é celebridade** — fama alta. A) Debate de propostas: Cred +. B) Ataque à inexperiência: Rej +1.
90. **Dois rivais se unem** — rivais próximos ideologicamente. Notícia: rival forte cresce 5 p.p.
91. **Rival sobe com a pauta do dia** — pauta semanal. A) Disputar a pauta: Foco +. B) Mudar de assunto.
92. **Rival anuncia economista famoso** — eleição majoritária. A) Anunciar o seu: Cred +3. B) Ironizar.
93. **Rival propõe pacto de não agressão** — rivais próximos. A) Aceitar: ambos Rej −1. B) Recusar.
94. **Rival faz carreata maior** — mesma cidade. A) Maior carreata no fim de semana: $ −, Ent +. B) Ignorar.
95. **Rival processa você** — ataque recente. A) Retratação: Rej −. B) Ir até o fim: 50%.

### 3.8 Justiça Eleitoral

96. **Impugnação de registro** — rival contesta seu registro. A) Defesa forte: $ −, 85% de sucesso. B) Defesa barata: 60%.
97. **Propaganda antecipada** — antes do prazo. Multa e Rej +1.
98. **Abuso de poder religioso** — apoio de igreja. A) Recusar púlpito: Mom[religiosos] −. B) Aceitar: risco no TSE.
99. **Pesquisa irregular** — instituto rival. A) Pedir impugnação: 60%. B) Ignorar.
100.  **Boca de urna** — dia da eleição. A) Proibir militantes: nada. B) Fazer: multa e Esc +5.
101.  **Showmício** — artista quer cantar no comício. Proibido: A) Show sem discurso no mesmo dia: Con +. B) Cancelar.
102.  **Outdoor irregular** — propaganda proibida. Multa automática.
103.  **Doação de empresa disfarçada** — doação de laranja. ↪ investigação.
104.  **Live com recurso público** — candidato no cargo. A) Fazer só no comitê: nada. B) No gabinete: risco de cassação.
105.  **Direito de resposta concedido ao rival** — você atacou. Perde 1 minuto de TV.

### 3.9 Grupos sociais e de interesse

106. **Carta dos empresários** — GI[empresariado] ≥ 60. A) Assinar compromissos: GI +10, Mom[trabalhadores] −2. B) Recusar.
107. **Central sindical quer compromisso** — trabalhista. A) Assinar: GI[sindicatos] +10. B) Recusar.
108. **Frente do agro** — interior agrícola. A) Assinar agenda: GI[agro] +10, GI[ambientalistas] −. B) Agenda própria.
109. **Movimento de moradia** — capital. A) Visitar ocupação: GI[movimentos] +8, GI[empresariado] −3. B) Recusar.
110. **Servidores pedem reajuste** — muitos servidores. A) Prometer: promessa cara. B) Prometer revisar: neutro.
111. **Juventude pede passe livre** — estudantes. A) Prometer: promessa. B) Meia-passagem ampliada.
112. **Aposentados pedem remédio grátis** — muitos idosos. A) Prometer farmácia popular: promessa. B) Não.
113. **Associação comercial reclama de impostos** — comércio. A) Prometer revisão do ISS: GI[comércio] +6. B) Não.
114. **Indústria quer incentivo** — polo industrial. A) Prometer: receita futura −. B) Não.
115. **Tecnologia pede internet** — polo tecnológico. A) Prometer cidade conectada: GI[tecnologia] +6. B) Não.
116. **Movimento negro** — pauta racial. A) Compromisso com cotas e segurança: Mom[jovens] +. B) Genérico.
117. **Mulheres cobram creches** — qualquer. A) Prometer vagas: promessa. B) Prometer estudo.
118. **Pessoas com deficiência** — acessibilidade. A) Compromisso: Cred +2. B) Genérico.
119. **Policiais pedem reajuste** — segurança em alta. A) Prometer: GI[segurança] +. B) Não.
120. **Ambientalistas** — tema ambiental. A) Assinar carta: GI +, GI[agro] −. B) Não.

### 3.10 Calendário e regionais

121. **Feriado prolongado** — feriado. A) Campanha no litoral: Pres +3 entre veranistas. B) Descansar: Ene +20.
122. **São João** — junho/julho no Nordeste (municipais de cidade-polo). A) Dançar quadrilha: Con +3. B) Visitar barracas: Mom[comerciantes] +.
123. **Festa do Peão** — interior agro. A) Ir: Mom[agricultores] +4. B) Não ir: nada.
124. **Oktoberfest** — Blumenau/SC. A) Visitar: Con +2. B) Não.
125. **Círio de Nazaré** — Belém, outubro. A) Acompanhar a procissão: Mom[religiosos] +5. B) Mensagem.
126. **Jogo do Brasil** — Copa do Mundo. A) Assistir com eleitores: Con +2. B) Ignorar: nada.
127. **Final de campeonato local** — cidade com time grande. A) Torcer publicamente: Mom[torcedores] +, Rej[rivais] +. B) Neutro.
128. **Onda de calor** — verão. A) Distribuir água em comício: Con +1. B) Cancelar comícios: Ene +.
129. **Frente fria** — Sul, inverno. A) Campanha do agasalho: Cred +2. B) Nada.
130. **Enchente na cidade** — chuva extrema. A) Suspender campanha e ajudar: Cred +5, Con +3. B) Seguir campanha: Rej +3.
131. **Seca** — Nordeste. A) Prometer adutora: promessa cara. B) Carros-pipa: Mom +2.
132. **Fumaça das queimadas** — Norte/CO. A) Proposta de brigadas: Foco[environment] +. B) Silêncio.
133. **Greve de caminhoneiros** — combustível caro. A) Apoiar: GI[transporte] +, inflação temida. B) Pedir fim: neutro.
134. **Apagão na cidade** — qualquer. A) Culpar o governo: Mom +2 se oposição. B) Ajudar: Cred +.
135. **Ataque de facção** — capital violenta. A) Discurso duro: Mom[segurança] +4. B) Plano preventivo: Cred +2.

### 3.11 Debates

136. **Debate com cadeira vazia** — rival falta. A) Dialogar com a cadeira: Con +3. B) Ignorar.
137. **Pergunta sobre sua família** — debate. A) Emocionar: Mom +. B) Desviar.
138. **Erro de número** — debate. A) Corrigir no ar: Cred +1. B) Insistir: Cred −3.
139. **Mediador perde o controle** — debate tenso. A) Pedir ordem: Cred +2. B) Entrar na briga: Ent +, Rej +.
140. **Rival traz documento** — dossiê. A) Pedir para ver: tensão. B) Chamar de falso: 50%.
141. **Pergunta de eleitor indeciso** — debate. A) Resposta técnica. B) Resposta emocional.
142. **Microfone aberto** — intervalo do debate. A) Comentário vaza: Rej +2 (20%).
143. **Debate cancelado** — emissora desiste. Notícia: todos perdem exposição.
144. **Debate na rádio** — interior. A) Ir: Pres +4. B) Faltar.
145. **Debate só entre mulheres candidatas** — 2+ candidatas. A) Participar ou apoiar a iniciativa: Cred +.

### 3.12 Segundo turno

146. **Terceiro colocado negocia** — 2º turno. A) Prometer secretaria: apoio transfere 50% dos votos. B) Prometer pauta. C) Dispensar.
147. **Partido derrotado libera os eleitores** — 2º turno. Notícia: votos se dividem.
148. **Frente ampla** — oposição unida contra você. A) Discurso de união nacional. B) Polarizar.
149. **Debate decisivo** — 2º turno. Prep vale o dobro.
150. **Virada nas pesquisas** — você estava atrás. A) Manter o ritmo: Ent +. B) Mudar o tom: risco.
151. **Abstenção alta prevista** — feriado no dia. A) Campanha "vá votar": Mil vale mais. B) Nada.
152. **Apoio inesperado** — político rival declara voto em você. A) Aceitar publicamente: Mom +, Ent −. B) Agradecer discretamente.
153. **Último ataque** — véspera. A) Responder: risco. B) Silêncio: Cred +.

### 3.13 Dia da eleição

154. **Fila longa** — dia da eleição. Notícia.
155. **Urna com defeito** — qualquer. A) Pedir explicação ao TRE. B) Insinuar fraude: Rej +5, Cred −5.
156. **Votação ao vivo** — candidato vota. A) Votar com a família: Con +1. B) Votar cedo e sozinho.
157. **Resultado apertado** — diferença < 1%. A) Aguardar a apuração. B) Declarar vitória cedo: risco.
158. **Discurso da derrota** — derrota. A) Reconhecer e parabenizar: Cred +5 para a carreira. B) Contestar: Ent +, Cred −10.
159. **Discurso da vitória** — vitória. A) Conciliador: Rej −3 no início do mandato. B) De revanche: Ent +, oposição se une.

### 3.14 Eleições proporcionais (vereador e deputados)

160. **Dobradinha** — deputado. A) Fazer dobradinha com candidato a estadual/federal do partido: Pres +4, divide recursos. B) Sozinho.
161. **Puxador do partido** — chapa. A) Pedir votos de legenda: elege mais da chapa. B) Voto nominal.
162. **Reduto eleitoral** — bairro com força. A) Concentrar: Pres +10 no reduto. B) Espalhar.
163. **Liderança de bairro** — vereador. A) Contratar a liderança: Pres +6, $ −. B) Não.
164. **Colega de chapa ataca** — mesma chapa. A) Responder: Uni −. B) Ignorar.
165. **Quociente em risco** — partido perto do quociente. A) Mobilizar toda a chapa: Ene −. B) Cuidar só de você.
166. **Candidato laranja** — partido usa candidaturas de fachada. A) Denunciar: Uni −20, Cred +. B) Silêncio: Esc + se descoberto.
167. **Cota de gênero** — partido sem candidatas suficientes. A) Recrutar candidatas reais: Cred +. B) Fachada: risco de cassar a chapa toda.
168. **Santinho com erro de número** — material. A) Reimprimir: $ −. B) Corrigir na mão: Rej +1.
169. **Eleitor pede emprego** — vereador. A) Prometer: Esc latente +3. B) Recusar.

### 3.15 Oportunidades

170. **Convite para Roda Viva** — Con ≥ 40. A) Ir: Con +6, entrevista hostil. B) Recusar.
171. **Debate em universidade federal** — qualquer. A) Ir: Mom[estudantes] +4. B) Não.
172. **Encontro com bispo** — eleitorado católico. A) Ir: Mom[religiosos] +3. B) Não.
173. **Feira de tecnologia** — cidade-polo. A) Visitar: GI[tecnologia] +5. B) Não.
174. **Show de música sertaneja** — interior. A) Subir ao palco: Con +3 (proibido discursar). B) Não.
175. **Entrevista em rádio evangélica** — eleitorado religioso. A) Ir: Mom +3. B) Não.
176. **Prêmio de gestão** — você foi gestor. A) Divulgar: Cred +3. B) Discreto.
177. **Apoio de ex-adversário** — derrotado na prévia. A) Aceitar: Uni +. B) Recusar.
178. **Jornal pede artigo de opinião** — Cred ≥ 50. A) Escrever: Cred +2, Con +2.
179. **Celebridade local apoia** — cidade-polo. A) Aceitar: Con +3 local.
180. **Campanha de vacinação** — saúde. A) Tomar vacina em público: Cred +2. B) Não.

### 3.16 Gafes e imprevistos

181. **Nome errado da cidade** — comício. Rej +1 local. A) Pedir desculpas com humor: Con +1.
182. **Torcida errada** — cidade dividida. A) Rir: Rej +1. B) Explicar: Rej neutra.
183. **Pergunta sobre preço do pão** — entrevista. A) Acertar: Cred +2. B) Errar: meme, Rej +2.
184. **Comentário machista de assessor** — redes. A) Demitir: Rej neutro. B) Defender: Rej +3.
185. **Foto com investigado** — evento. A) Explicar: Esc +2. B) Ignorar: Esc +4.
186. **Comida estragada no evento** — comício. A) Pagar atendimento: $ −, Cred +. B) Culpar o buffet.
187. **Microfone desligado** — comício grande. A) Gritar: Ent +3. B) Parar o comício.
188. **Pisou na bandeira** — vídeo. Rej +2. A) Desculpa: −1.
189. **Errou o hino** — evento cívico. Meme, Con +2, Rej +1.
190. **Carro do candidato multado** — redes. A) Pagar e postar: Cred +1. B) Ignorar: Rej +1.

### 3.17 Temas em alta

191. **Escândalo nacional muda a pauta** — qualquer. Foco[corruption] +10 para todos.
192. **Preço da gasolina** — inflação. Foco[inflation] +8.
193. **Crime bárbaro** — qualquer. Foco[security] +10. A) Discurso duro. B) Discurso de prevenção.
194. **Fila no SUS** — saúde. Foco[healthcare] +8.
195. **Notas do Enem** — educação. Foco[education] +6.
196. **Desemprego recorde** — economia. Foco[jobs] +10.
197. **Apagão de energia** — infraestrutura. Foco[infrastructure] +8.
198. **Enchente nacional** — clima. Foco[environment] +8.
199. **Juros sobem** — crédito. Foco[credit] +6.
200. **Reforma tributária em pauta** — impostos. Foco[taxes] +8.

### 3.18 Mais eventos de campanha

201. **Vizinho barulhento do comitê** — capital. A) Acordo: nada. B) Ignorar: reclamação vira notícia.
202. **Comitê pichado** — polarização. A) Pintar de novo e filmar: Ent +2. B) Registrar ocorrência: nada.
203. **Ameaça ao comitê** — polarização alta. A) Reforçar segurança: $ −. B) Denunciar: Con +.
204. **Pesquisa de imagem** — marqueteiro. A) Mudar o visual: Mom[jovens] +2, Cred −1. B) Manter.
205. **Jingle grudento** — marqueteiro. A) Investir no jingle: Con +3. B) Não.
206. **Jingle plagiado** — música famosa. A) Trocar: $ −. B) Manter: processo.
207. **Assessora grávida** — equipe. A) Licença integral: Cred +2. B) Pedir para ficar: Rej +1 se vazar.
208. **Apoiador famoso faz gafe** — celebridade apoiando. A) Distanciar: perde o apoio. B) Defender: Rej +1.
209. **Carta aberta de ex-ministros** — eleição nacional. A) Assinar compromisso. B) Ignorar.
210. **Manifestação de rua contra você** — polarização. A) Ignorar. B) Contraprotesto: tensão.
211. **Manifestação a favor** — Ent alto. A) Comparecer: Ent +5.
212. **Bandeira rasgada em ato** — ato de rua. Notícia polariza.
213. **Mãe de vítima cobra** — segurança. A) Receber a família: Cred +3. B) Mandar nota.
214. **Estudante faz pergunta difícil** — universidade. A) Responder bem: viral 20% (Con +3). B) Fugir: Rej +1.
215. **Idoso emociona no comício** — qualquer. Con +2.
216. **Indígenas pedem demarcação** — Norte/CO. A) Compromisso: GI[movimentos] +, GI[agro] −. B) Não.
217. **Quilombolas** — interior. A) Visita e compromisso: Cred +.
218. **Pescadores** — litoral. A) Compromisso com seguro-defeso: Mom[pescadores] +.
219. **Garimpeiros** — Norte. A) Prometer legalizar: GI[mineração] +, GI[ambientalistas] −−. B) Não.
220. **Caminhoneiros** — rodovias. A) Prometer frete mínimo: GI[transporte] +. B) Não.
221. **Taxistas contra aplicativos** — capital. A) Regular os apps: Mom[taxistas] +, Mom[jovens] −. B) Liberdade de mercado.
222. **Entregadores contra aplicativos** — capital. A) Direitos trabalhistas: Mom[trabalhadores] +.
223. **Professores da rede** — educação. A) Piso salarial: promessa cara.
224. **Médicos cubanos/estrangeiros** — saúde no interior. A) Programa de médicos: Mom[interior] +.
225. **Agentes comunitários** — saúde. A) Compromisso: Pres +.
226. **Igreja oferece templo para reunião** — eleitorado religioso. A) Aceitar: risco no TSE. B) Local neutro.
227. **Maçonaria convida** — interior tradicional. A) Ir: Mom[empresários] +2. B) Não.
228. **Clube de serviço (Rotary/Lions)** — cidade média. A) Palestra: Cred +.
229. **Escola de samba convida** — capital. A) Desfilar em ensaio: Con +3.
230. **CTG convida** — RS/SC. A) Ir pilchado: Mom[interior] +3.
231. **Vaquejada** — Nordeste. A) Ir: Mom[interior] +, Rej[ambientalistas] +.
232. **Parada LGBT** — capital. A) Participar: Mom[jovens] +, Mom[religiosos] −. B) Não.
233. **Marcha para Jesus** — capital. A) Participar: Mom[religiosos] +, Mom[jovens] −. B) Não.
234. **Ocupação de escola** — estudantes. A) Visitar: Mom[estudantes] +. B) Criticar: Mom[classe média] +.
235. **Greve de professores** — durante a campanha. A) Apoiar: GI[servidores] +. B) Criticar: GI[classe média] +.
236. **Policial morto** — segurança. A) Ir ao enterro: Mom[segurança] +3.
237. **Chuva de granizo** — interior. A) Visitar agricultores: Mom[agricultores] +3.
238. **Praga na lavoura** — agro. A) Prometer seguro rural: GI[agro] +.
239. **Fábrica fecha durante a campanha** — indústria. A) Prometer reabertura: promessa difícil. B) Requalificação.
240. **Shopping inaugura** — cidade-polo. A) Ir à inauguração: Con +1.
241. **Atraso no metrô** — capital. A) Andar de metrô: Mom[trabalhadores] +.
242. **Assalto a candidato** — capital violenta. A) Discurso de segurança: Foco +.
243. **Cobrança de promessa antiga** — você já governou. A) Explicar: Cred depende do cumprimento.
244. **Ex-funcionário processa** — empresa sua. A) Acordo: $ −. B) Brigar: notícia ruim.
245. **Imóvel não declarado** — imprensa. A) Corrigir a declaração: Esc +3. B) Negar: Esc +10.
246. **Erro na declaração de bens** — TSE. A) Retificar: nada.
247. **Pesquisa de intenção espontânea** — você é o mais lembrado. Mom +2.
248. **Voto envergonhado** — você é polêmico. Notícia: pesquisas podem subestimar você.
249. **Abstenção entre jovens** — juventude. A) Campanha de título de eleitor: Mom[jovens] +.
250. **Véspera da eleição** — último dia. A) Carreata final: Ent +5. B) Descanso e entrevistas: Con +2.

## 4. Eventos de prefeitura

Esfera municipal (prefeito no Executivo). Efeitos típicos: aprovação (Apr), satisfação de grupos (Sat[grupo]), caixa da prefeitura ($), capital político (Cap), estabilidade (Est), relação com a Câmara (Câm).

### 4.1 Zeladoria e serviços urbanos

1. **Buraco viral** — vídeo de buraco gigante. A) Operação tapa-buraco na cidade toda: $ −, Apr +2. B) Só aquele buraco: Apr +0,5, meme continua.
2. **Coleta de lixo parada** — contrato vencido. A) Contrato emergencial caro: $ −−. B) Garis da prefeitura em hora extra: $ −, Sat[servidores] +. C) Esperar a licitação: Apr −4 por semana.
3. **Iluminação apagada** — bairro escuro. A) Troca para LED em todo o bairro: $ −, Sat[segurança] +. B) Conserto pontual.
4. **Poda de árvore derruba fios** — tempestade. A) Mutirão com a concessionária de energia: Apr +1. B) Cobrar a concessionária publicamente: Rel[concessionária] −.
5. **Mato alto nas praças** — período de chuvas. A) Contratar roçada: $ −. B) Adote uma praça (empresas): Sat[comerciantes] +.
6. **Cemitério lotado** — cidade grande. A) Crematório público: $ −−, polêmica religiosa. B) Ampliar cemitério: $ −.
7. **Feira suja** — feira livre. A) Limpeza após feiras: $ −. B) Multar feirantes: Sat[comerciantes] −.
8. **Pichação no centro histórico** — centro antigo. A) Limpeza + muralismo legal: Sat[jovens] +. B) Lei antipichação dura: Sat[classe média] +.
9. **Calçadas quebradas** — idosos caem. A) Programa de calçadas acessíveis: $ −−, Sat[aposentados] +. B) Notificar proprietários: Sat[classe média] −.
10. **Semáforos queimados** — chuva forte. A) Agentes de trânsito em todos os cruzamentos: $ −. B) Esperar peças: acidentes, Apr −2.
11. **Bueiros entupidos** — antes das chuvas. A) Limpeza preventiva: $ −, evita alagamentos. B) Adiar: risco ↪ alagamento.
12. **Lâmpadas roubadas** — furto de cabos. A) Guarda municipal patrulha: Sat[segurança] +. B) Câmeras: $ −.
13. **Placas de rua erradas** — bairro novo. A) Corrigir: $ pequeno. B) Ignorar: piada local.
14. **Animais abandonados** — protetores reclamam. A) Castração gratuita: $ −, Sat[classe média] +. B) Canil municipal: polêmica.
15. **Pombos e ratos** — mercado central. A) Controle de pragas: $ −. B) Fechar o mercado para reforma: Sat[comerciantes] −.

### 4.2 Transporte e trânsito

16. **Reajuste da tarifa** — inflação alta. A) Subsídio: $ −−. B) Reajuste: Apr −5, Sat[estudantes] −. ↪ protestos.
17. **Greve de motoristas de ônibus** — salários atrasados pela empresa. A) Intervir no contrato: $ −, Sat[trabalhadores] +. B) Esperar a Justiça: cidade parada 3 dias.
18. **Empresa de ônibus quebra** — concessão antiga. A) Prefeitura assume linhas: $ −−. B) Nova licitação emergencial.
19. **Faixa exclusiva de ônibus** — trânsito. A) Implantar: Sat[trabalhadores] +, Sat[classe média] −. B) Não.
20. **Ciclovia polêmica** — comerciantes reclamam. A) Manter: Sat[jovens] +. B) Remover: Sat[comerciantes] +.
21. **Aplicativos de transporte** — taxistas protestam. A) Regulamentar com taxa: $ +. B) Liberar: Sat[jovens] +.
22. **Radar de velocidade** — acidentes. A) Mais radares: acidentes −, "indústria da multa". B) Educação de trânsito.
23. **Zona azul digital** — centro. A) Implantar: $ +, Sat[comerciantes] dividido.
24. **Acidente com ônibus escolar** — interior. A) Renovar frota: $ −−. B) Investigar a terceirizada.
25. **Mototaxistas** — periferia. A) Regulamentar: Sat[trabalhadores] +. B) Proibir: conflito.
26. **Trem metropolitano** — região metropolitana. A) Pleitear ao governo do estado: Rel[governador] importa.
27. **Patinetes elétricos** — capital. A) Liberar com regras: Sat[jovens] +. B) Proibir nas calçadas.
28. **Engarrafamento recorde** — capital. A) Rodízio de placas: Sat[classe média] −. B) Plano de mobilidade: longo prazo.
29. **BRT atrasado** — obra. A) Aditivo para terminar: $ −. B) Romper contrato: obra para.
30. **Passe livre estudantil** — campanha estudantil. A) Aprovar: $ −−, Sat[estudantes] ++. B) Meia ampliada.

### 4.3 Saúde

31. **Fila na UPA** — inverno. A) Mutirão de plantões: $ −. B) Hospital de campanha: $ −−.
32. **Surto de dengue** — verão. A) Mutirão contra criadouros: $ −, casos −50%. B) Fumacê: menos eficaz. ↪ arco Surto de Dengue.
33. **Falta de remédio na farmácia básica** — fornecedor atrasou. A) Compra emergencial: $ −. B) Esperar: Apr −3.
34. **Médico falta ao plantão** — posto de saúde. A) Ponto eletrônico: Sat[saúde] −, Apr +. B) Conversar com o sindicato.
35. **Campanha de vacinação baixa** — cobertura < 70%. A) Vacinação nas escolas: cobertura +. B) Campanha publicitária: $ −.
36. **Hospital municipal sem UTI** — pacientes transferidos. A) Abrir 10 leitos: $ −−. B) Convênio com hospital privado: $ −.
37. **Ambulância quebrada** — SAMU. A) Comprar 5 novas: $ −. B) Alugar: $ menor.
38. **Saúde mental** — aumento de casos. A) CAPS 24 horas: $ −, Sat[saúde] +.
39. **Mortalidade infantil sobe** — bairro pobre. A) Equipes de saúde da família: $ −.
40. **Fila de cirurgias eletivas** — anos de espera. A) Mutirão de cirurgias: $ −−, Apr +4.
41. **Agentes comunitários em greve** — salário defasado. A) Reajuste: $ −. B) Negociar.
42. **Odontologia** — sem dentista no posto. A) Contratar: $ −.
43. **Policlínica privada oferece parceria** — saúde. A) Aceitar: debate ideológico. B) Recusar.
44. **Hospital filantrópico vai fechar** — Santa Casa. A) Socorro financeiro: $ −−. B) Deixar fechar: Apr −6.
45. **Vírus novo chega à cidade** — epidemia nacional. A) Medidas restritivas locais: economia −, mortes −. B) Esperar orientação federal.

### 4.4 Educação

46. **Fila da creche** — 3 mil crianças. A) Conveniar creches privadas: $ −. B) Construir 5 creches: $ −−, Obra 18 meses.
47. **Merenda ruim** — vídeo de aluno. A) Trocar fornecedor: $ −. B) Cozinha própria nas escolas: $ −−, Sat[pais] +.
48. **Escola sem professor** — falta de concurso. A) Concurso: $ −, 6 meses. B) Temporários: $ menor.
49. **Telhado desaba em escola** — chuva. A) Reforma emergencial: $ −. ↪ auditoria de todas as escolas.
50. **Transporte escolar rural** — estradas ruins. A) Ônibus novos: $ −. B) Consertar estradas: Obra.
51. **Escola em tempo integral** — programa federal. A) Aderir: $ municipal −, Sat[pais] +.
52. **Violência na escola** — briga filmada. A) Guarda na porta: Sat[segurança] +. B) Psicólogos: $ −.
53. **Notas do IDEB caem** — avaliação. A) Reforço escolar: $ −. B) Bônus por desempenho para professores: Sat[servidores] dividido.
54. **Greve de professores municipais** — piso. A) Pagar o piso: $ −−. B) Negociar parcelado.
55. **Escola cívico-militar** — debate ideológico. A) Aderir: Sat[segurança] +, Sat[estudantes] −. B) Recusar.
56. **Tablets para alunos** — tecnologia. A) Comprar: $ −. B) Internet nas escolas primeiro.
57. **Alfabetização de adultos** — analfabetismo. A) Programa noturno: Sat[pobres] +.
58. **Uniforme escolar gratuito** — promessa. A) Entregar: $ −, Apr +1.
59. **Bullying viral** — escola. A) Programa antibullying: Sat[pais] +.
60. **Universidade federal quer terreno** — expansão. A) Doar terreno: Obra futura, Sat[estudantes] +.

### 4.5 Chuvas, clima e Defesa Civil

61. **Alagamento** — chuva forte. A) Bombas e equipes de plantão: $ −. B) Esperar a água baixar: Apr −3.
62. **Deslizamento em morro** — encostas ocupadas. A) Evacuar 300 famílias: $ −−, vidas salvas. B) Monitorar: risco de mortes. ↪ arco O Morro.
63. **Enchente histórica** — rio transborda. A) Abrigos e decreto de calamidade: verbas federais. B) Gestão local: $ −−.
64. **Onda de calor** — 40 °C. A) Pontos de hidratação: $ −. B) Horário escolar reduzido.
65. **Frio extremo** — Sul. A) Abrigos para pessoas em situação de rua: $ −, Apr +2.
66. **Granizo destrói telhados** — bairros. A) Doar telhas: $ −, Apr +3.
67. **Vendaval derruba árvores** — cidade. A) Mutirão: $ −.
68. **Seca seca o reservatório** — interior. A) Rodízio: Apr −4. B) Carros-pipa: $ −.
69. **Incêndio em favela** — capital. A) Aluguel social: $ −. B) Reconstrução no local.
70. **Ressaca no litoral destrói orla** — litoral. A) Obra de contenção: $ −−.
71. **Rompimento de adutora** — cidade sem água 3 dias. A) Cobrar a companhia estadual: Rel[governador] −.
72. **Tornado no interior** — Sul. A) Visitar e pedir calamidade: Apr +3.
73. **Fumaça das queimadas** — Norte/CO. A) Suspender aulas: Sat[pais] dividido.
74. **Alerta de tsunami falso** — litoral. A) Comunicado rápido: Cred +.
75. **Plano de adaptação climática** — após desastre. A) Aprovar plano de 10 anos: $ futuro −, legado.

### 4.6 Câmara Municipal

76. **Câmara rejeita o orçamento** — base pequena. A) Negociar emendas: $ −, Cap −. B) Governar com duodécimo: Est −.
77. **Vereador pede cargo** — base. A) Nomear indicado: Câm +, eficiência −. B) Recusar: Câm −.
78. **CPI municipal** — escândalo. A) Barrar: Cap −, Esc +. B) Colaborar: Cred +.
79. **Presidente da Câmara rompe** — disputa política. A) Reaproximação: Cap −. B) Guerra aberta: projetos travam.
80. **Vereadores aumentam o próprio salário** — opinião pública. A) Vetar: Apr +3, Câm −10. B) Sancionar: Apr −2.
81. **Projeto de lei popular** — abaixo-assinado. A) Apoiar: Apr +. B) Ignorar.
82. **Vereador da oposição faz denúncia** — redes. A) Responder com dados: Cred +. B) Processar.
83. **Sessão tumultuada** — projeto polêmico. A) Retirar o projeto: Cap −. B) Insistir.
84. **Câmara aprova lei inconstitucional** — vereadores. A) Vetar: Câm −. B) Sancionar e deixar o TJ derrubar.
85. **Bancada religiosa exige** — pauta de costumes. A) Ceder: Sat[religiosos] +, Sat[jovens] −.
86. **Plano diretor** — revisão obrigatória. ↪ arco Plano Diretor.
87. **Vereador preso** — operação policial. A) Distanciar: nada. B) Defender (se aliado): Esc +.
88. **Câmara derruba veto** — base fraca. Notícia: Cap −5.
89. **Reforma administrativa municipal** — cortar secretarias. A) Aprovar: $ +, Sat[servidores] −.
90. **Concurso público** — vagas. A) Abrir: $ futuro −, Sat[jovens] +.

### 4.7 Finanças municipais

91. **IPTU defasado** — planta genérica antiga. A) Atualizar valores: $ +, Apr −4. B) Manter.
92. **ISS de bancos e apps** — receita. A) Cobrar: $ +, GI[empresariado] −.
93. **FPM cai** — economia nacional fraca. A) Cortar gastos: Sat −. B) Endividar: risco.
94. **Precatórios vencendo** — dívida judicial. A) Pagar: $ −−. B) Parcelar.
95. **Royalties caem** — cidade petroleira. A) Fundo de diversificação.
96. **Folha atrasada** — caixa vazio. A) Atrasar fornecedores: obras param. B) Atrasar servidores: greve.
97. **Empréstimo internacional** — banco multilateral. A) Contratar para saneamento: $ futuro −, Obra grande.
98. **Dívida ativa** — contribuintes devedores. A) Refis com desconto: $ + no curto prazo.
99. **Taxa do lixo** — nova cobrança. A) Criar: $ +, Apr −3.
100.  **Lei de Responsabilidade Fiscal** — gasto com pessoal > 54%. A) Cortar comissionados: Câm −.
101.  **Venda de imóveis da prefeitura** — prédios ociosos. A) Vender: $ +.
102.  **Parceria público-privada** — iluminação. A) PPP: investimento +.
103.  **Emenda de deputado** — recurso federal. A) Aceitar e inaugurar com o deputado: Rel +.
104.  **Convênio do estado** — obra. A) Contrapartida municipal: $ −.
105.  **Auditoria do TCE** — irregularidades. A) Corrigir: Cred +. B) Contestar.

### 4.8 Cultura, esporte e lazer

106. **Carnaval sem dinheiro** — crise. A) Patrocínio privado: Sat neutro. B) Cancelar desfile: Apr −4. C) Bancar: $ −−.
107. **São João** — Nordeste. A) Festa grande: $ −, Apr +4, turismo +. B) Festa modesta.
108. **Show gratuito polêmico** — artista caro. A) Contratar: Apr dividido, MP questiona cachê. B) Cancelar.
109. **Teatro municipal fechado** — reforma. A) Reabrir: $ −, Sat[classe média] +.
110. **Biblioteca vazia** — leitura. A) Biblioteca com internet e games: Sat[jovens] +.
111. **Time da cidade pede patrocínio** — futebol. A) Patrocinar: Apr +2 entre torcedores, MP questiona.
112. **Estádio municipal interditado** — laudo. A) Reforma: $ −.
113. **Parque abandonado** — violência. A) Revitalização: Obra, Sat +.
114. **Festival de música** — turismo. A) Apoiar: turismo +.
115. **Grafite oficial** — artistas. A) Galeria a céu aberto: Sat[jovens] +.
116. **Patrimônio histórico desaba** — casarão. A) Tombar e restaurar: $ −−. B) Liberar demolição.
117. **Museu da cidade** — memória local. A) Criar: $ −, legado.
118. **Natal iluminado** — tradição. A) Grande decoração: $ −, turismo +.
119. **Réveillon** — capital. A) Queima de fogos: $ −. B) Fogos sem barulho (pets): Sat[classe média] +.
120. **Escola de samba atrasa pagamento** — carnaval. A) Antecipar repasse: $ −.

### 4.9 Habitação e urbanismo

121. **Ocupação de prédio abandonado** — centro. A) Reintegração: Sat[movimentos] −. B) Retrofit para moradia popular: $ −−.
122. **Regularização fundiária** — loteamentos irregulares. A) Escriturar 5 mil casas: Apr +5.
123. **Condomínio de luxo em área verde** — expansão urbana. A) Aprovar: $ +, Sat[ambientalistas] −.
124. **Minha Casa municipal** — programa federal. A) Ceder terrenos: Obra, Sat[pobres] +.
125. **Aluguel social atrasado** — famílias desabrigadas. A) Pagar: $ −.
126. **Despejo coletivo** — decisão judicial. A) Apoiar com abrigo: $ −. B) Não intervir: Apr −3.
127. **Verticalização** — bairro tradicional. A) Liberar prédios: Sat[moradores] −.
128. **Centro esvaziado** — lojas fechadas. A) IPTU zero para moradia no centro: $ −, revitalização.
129. **Favela vira bairro** — urbanização. A) Obra de urbanização: Obra grande, Sat ++.
130. **Loteamento clandestino** — periferia. A) Demolir: conflito. B) Regularizar.

### 4.10 Segurança municipal

131. **Guarda municipal armada** — debate. A) Armar: Sat[segurança] +, Sat[jovens] −. B) Não armar.
132. **Câmeras de reconhecimento facial** — tecnologia. A) Instalar: Sat[segurança] +, debate de privacidade.
133. **Assaltos no centro** — comércio. A) Base da guarda: Sat[comerciantes] +.
134. **Baile funk** — reclamação de moradores. A) Proibir: Sat[jovens] −. B) Regulamentar com estrutura.
135. **Feminicídio choca a cidade** — violência. A) Casa da mulher: $ −, Cred +.
136. **Tráfico em praça** — bairro. A) Ocupação cultural da praça: Sat +.
137. **Comércio ambulante** — centro. A) Fiscalização dura: Sat[comerciantes formais] +. B) Camelódromo.
138. **Ataque a ônibus** — facção. A) Pedir polícia estadual: Rel[governador].
139. **Vigilância comunitária** — moradores. A) Apoiar: Sat +.
140. **Iluminação para segurança** — mulheres. A) Rotas iluminadas: Sat +.

### 4.11 Assistência social

141. **População de rua dobra** — crise. A) Centros de acolhida: $ −. B) Retirada forçada: polêmica.
142. **Restaurante popular** — fome. A) Abrir: $ −, Apr +3.
143. **Cesta básica** — desemprego. A) Distribuir: $ −, risco eleitoral (TSE em ano eleitoral).
144. **Cadastro único desatualizado** — benefícios. A) Mutirão: Sat[pobres] +.
145. **Trabalho infantil** — semáforos. A) Programa de proteção: Cred +.
146. **Idosos sozinhos** — envelhecimento. A) Centro-dia do idoso: Sat[aposentados] +.
147. **Imigrantes chegam** — crise vizinha. A) Acolhimento: Sat dividido.
148. **Dependência química** — centro. A) Internação involuntária: polêmica. B) Redução de danos.
149. **Banco de alimentos** — desperdício. A) Criar com supermercados: Cred +.
150. **Inverno: doação de cobertores** — Sul. A) Campanha: Apr +1.

### 4.12 Economia local

151. **Fábrica fecha** — desemprego. A) Incentivo para nova empresa: $ −. B) Requalificação: Sat +.
152. **Shopping quer isenção** — investimento. A) Isenção de IPTU: $ −, empregos +.
153. **Feira de empreendedores** — comércio. A) Apoiar: GI[comércio] +.
154. **Distrito industrial** — atrair indústrias. A) Infraestrutura: $ −−, Obra.
155. **Turismo cai** — crise. A) Campanha publicitária: $ −.
156. **Startup pede espaço** — tecnologia. A) Incubadora municipal: GI[tecnologia] +.
157. **Mercado central decadente** — tradição. A) Reforma: Obra.
158. **Agricultura familiar** — interior do município. A) Compra para a merenda: Sat[agricultores] +.
159. **Polo gastronômico** — turismo. A) Criar rota: comércio +.
160. **Desemprego jovem** — juventude. A) Primeiro emprego municipal: $ −, Sat[jovens] +.

### 4.13 Meio ambiente urbano

161. **Rio que corta a cidade poluído** — saneamento. A) Plano de despoluição: $ −−, longo prazo.
162. **Lixão a céu aberto** — lei federal. ↪ arco Aterro Sanitário.
163. **Reciclagem** — catadores. A) Cooperativas: Sat[pobres] +.
164. **Arborização** — calor. A) Plantar 50 mil árvores: Apr +2.
165. **Poluição sonora** — bares. A) Lei do silêncio: Sat[moradores] +, Sat[comércio] −.
166. **Queimada urbana** — terrenos baldios. A) Multar donos: Sat +.
167. **Praia imprópria** — esgoto. A) Obra de emissário: $ −−.
168. **Energia solar em prédios públicos** — sustentabilidade. A) Instalar: $ −, economia futura.
169. **Desmatamento na periferia** — área de proteção. A) Fiscalizar: conflito.
170. **Ar poluído** — indústria. A) Fiscalizar emissões: GI[indústria] −.

### 4.14 Relações com estado e União

171. **Governador de partido rival** — relação. A) Aproximar: convênios +. B) Oposição: verbas −.
172. **Presidente visita a cidade** — inauguração federal. A) Recebê-lo: Rel +, Sat[oposição] −.
173. **Deputado aliado traz verba** — emenda. A) Dividir palco: Rel +.
174. **Estado corta repasse da saúde** — crise estadual. ↪ arco Calote do Estado.
175. **Consórcio de cidades** — região. A) Liderar: Fama +.
176. **Frente nacional de prefeitos** — Brasília. A) Ir à marcha: Fama +, Ene −.
177. **Governador inaugura obra municipal** — disputa de paternidade. A) Ir junto: Rel +. B) Inaugurar antes: Rel −.
178. **Programa federal exige contrapartida** — habitação. A) Aderir: $ −.
179. **Polícia estadual ausente** — segurança. A) Cobrar publicamente: Rel[governador] −.
180. **Estrada estadual destruída** — acesso à cidade. A) Consertar com recurso próprio: $ −.

### 4.15 Gestão e equipe

181. **Secretário de saúde pede demissão** — crise. A) Nomear técnico: eficiência +. B) Nomear político: Câm +.
182. **Servidor corrupto flagrado** — fiscalização. A) Exonerar e denunciar: Cred +.
183. **Concurso fraudado** — denúncia. A) Anular: Sat[candidatos] −.
184. **Prefeitura digital** — serviços online. A) Investir: Sat[jovens] +, filas −.
185. **Ponto eletrônico** — servidores. A) Implantar: Sat[servidores] −, Apr +.
186. **Vice quer secretaria** — vice-prefeito. A) Dar: Est +.
187. **Chefe de gabinete vaza informação** — confiança. A) Demitir.
188. **Ouvidoria lotada** — reclamações. A) Prefeito no bairro (gabinete itinerante): Apr +2.
189. **Pesquisa de satisfação** — interna. A) Divulgar: Cred + se boa.
190. **Prefeito na rua** — visita surpresa. A) Visitar postos de saúde: Apr +1.

### 4.16 Mais eventos de prefeitura

191. **Aniversário da cidade** — data anual. A) Festa: $ −, Apr +2.
192. **Visita de embaixador** — cidade-irmã. A) Acordo de cooperação: Fama +.
193. **Cidade ganha prêmio** — gestão. Cred +3.
194. **Cidade em ranking ruim** — saneamento. Apr −2.
195. **Ponte de madeira cai** — zona rural. A) Ponte nova: Obra.
196. **Rodoviária degradada** — porta de entrada. A) Reforma: Obra.
197. **Aeroporto regional perde voos** — cidade-polo. A) Subsídio a voos: $ −.
198. **Ferrovia abandonada** — patrimônio. A) Trem turístico: turismo +.
199. **Hospital veterinário público** — animais. A) Criar: Sat[classe média] +.
200. **Wi-Fi nas praças** — conectividade. A) Instalar: Sat[jovens] +.
201. **Mercado de pulgas** — cultura. A) Apoiar: Sat +.
202. **Romaria** — cidade religiosa. A) Estrutura para romeiros: $ −, turismo +.
203. **Rodeio** — interior. A) Apoiar: Sat[agro] +, Sat[ambientalistas] −.
204. **Parada LGBT** — capital. A) Apoio oficial: Sat[jovens] +, Sat[religiosos] −.
205. **Marcha para Jesus** — capital. A) Apoio oficial: Sat[religiosos] +, Sat[jovens] −.
206. **Shopping de luxo** — classe alta. A) Aprovar: empregos +.
207. **Cidade inteligente** — tecnologia. A) Sensores e dados: $ −, eficiência +.
208. **Lei do tempo integral** — escolas. A) Implantar gradualmente.
209. **Feirão de empregos** — desemprego. A) Organizar: Sat[desempregados] +.
210. **Abertura de vagas em creche noturna** — trabalhadores. A) Abrir: Sat[mães] +.
211. **Cão de guarda na escola** — segurança. A) Rondas: Sat +.
212. **Hortas comunitárias** — terrenos vazios. A) Programa: Sat +.
213. **Cozinha comunitária** — periferia. A) Apoiar: Sat[pobres] +.
214. **Bolsa atleta municipal** — esporte. A) Criar: Sat[jovens] +.
215. **Vacinação de cães** — raiva. A) Campanha: Sat +.
216. **Esgoto a céu aberto** — bairro. A) Obra de saneamento: Obra.
217. **Asfalto em estrada vicinal** — zona rural. A) Asfaltar: Sat[agricultores] +.
218. **Mutirão de documentos** — cidadania. A) Organizar: Sat +.
219. **Ponto de táxi lotado** — rodoviária. A) Reorganizar.
220. **Banheiros públicos** — centro. A) Construir: Sat +.
221. **Prefeito mirim** — educação cívica. A) Programa: Cred +.
222. **Orçamento participativo** — participação. A) Implantar: Sat +, Câm −.
223. **Conselho tutelar sem carro** — proteção à criança. A) Comprar: $ −.
224. **Escola de música** — cultura. A) Criar: Sat +.
225. **Cidade inteira sem sinal de celular** — interior. A) Pressionar operadoras.
226. **Praça de esportes radicais** — juventude. A) Pista de skate: Sat[jovens] +.
227. **Abandono de animais de carga** — carroceiros. A) Proibir carroças: conflito.
228. **Feira da madrugada** — comércio popular. A) Regularizar.
229. **Cinema de rua reabre** — cultura. A) Apoiar: Sat +.
230. **Restaurante sujo interditado** — vigilância sanitária. Notícia.
231. **Água com gosto ruim** — companhia. A) Cobrar análise.
232. **Pedágio urbano** — debate. A) Estudar: polêmica.
233. **Vaga de estacionamento para idosos** — fiscalização. A) Multar: Sat[aposentados] +.
234. **Linha de ônibus noturna** — trabalhadores. A) Criar: $ −.
235. **Cidade-irmã estrangeira** — intercâmbio. A) Estudantes no exterior: Sat +.
236. **Câmera corporal na guarda** — transparência. A) Adotar: Cred +.
237. **Programa de castração em massa** — animais. A) Mutirão.
238. **Parque linear no rio** — urbanismo. A) Obra: legado.
239. **Mutirão de catarata** — saúde. A) Organizar: Sat[aposentados] +.
240. **Lei anti-fogos** — pets. A) Aprovar: Sat[classe média] +.
241. **Feira do livro** — cultura. A) Apoiar: Sat +.
242. **Polo de cinema** — economia criativa. A) Atrair produções: $ −.
243. **Concessão do parque** — gestão privada. A) Conceder: $ +, Sat dividido.
244. **Escolinha de futebol** — esporte. A) Programa: Sat +.
245. **Marmitas para trabalhadores** — fome. A) Programa: $ −.
246. **Fila do INSS** — federal. A) Posto de apoio: Sat[aposentados] +.
247. **Abrigo para mulheres** — violência. A) Ampliar.
248. **Mapa da violência** — dados. A) Publicar: Cred +.
249. **Prestação de contas pública** — transparência. A) Audiência anual: Cred +.
250. **Último ano de mandato** — pré-eleição. A) Inaugurações em série: Apr +4, TSE vigia. B) Gestão discreta.

## 5. Eventos de governo estadual

Esfera estadual (governador). Efeitos típicos: Apr, Sat[grupo], $ (tesouro estadual), Cap, Est, relação com a Assembleia (Ass), com prefeitos (Pref) e com o presidente (Rel[presidente]).

### 5.1 Segurança pública

1. **Greve da PM** — salários defasados. A) Reajuste: $ −−, GI[segurança] +. B) Pedir Força Nacional: Rel[presidente] importa, Cap −. C) Punir grevistas: conflito, crimes sobem na semana.
2. **Rebelião em presídio** — superlotação. A) Negociar: Sat[segurança] −. B) Invadir: risco de mortes. ↪ arco O Presídio.
3. **Fuga em massa** — presídio antigo. A) Recaptura com toda a polícia: $ −. B) Culpar a gestão anterior: Cred −1.
4. **Facção ataca ônibus** — capital. A) Operação de saturação: $ −, Sat[segurança] +. B) Pedir ajuda federal. ↪ arco A Facção.
5. **Chacina policial** — operação. ↪ arco Chacina.
6. **Câmeras corporais** — debate. A) Adotar: letalidade −, GI[segurança] −. B) Recusar: Sat[segurança] +.
7. **Delegacias sem delegado** — interior. A) Concurso da Polícia Civil: $ futuro −.
8. **Feminicídios em alta** — estatísticas. A) Delegacias da mulher 24 h: $ −, Cred +.
9. **Roubo de cargas** — rodovias. A) Força-tarefa: Sat[transporte] +.
10. **Milícia domina bairros** — capital. ↪ arco Milícia no Bairro.
11. **Novo presídio** — déficit de vagas. A) Construir em cidade do interior: Pref[cidade] −−. B) PPP prisional: polêmica.
12. **Saidinha de feriado** — presos não voltam. A) Pedir mudança na lei: Sat[segurança] +.
13. **Bombeiros sem viatura** — incêndios. A) Comprar frota: $ −.
14. **Fronteira com tráfico** — estados de fronteira. A) Batalhão de fronteira: $ −.
15. **Linchamento** — justiça com as próprias mãos. A) Condenar publicamente: Cred +.
16. **Policial herói** — salvamento. A) Homenagem: Sat[segurança] +.
17. **Policial envolvido em morte de jovem** — protesto. A) Afastar: Sat[jovens] +, GI[segurança] −.
18. **Plano de segurança integrado** — municípios. A) Lançar: Pref +, $ −.
19. **Detran fraudado** — CNH. A) Intervenção: Cred +.
20. **Sistema prisional colapsa** — superlotação 200%. A) Mutirão carcerário: Sat[segurança] −, custo −.

### 5.2 Educação

21. **Greve dos professores estaduais** — piso. ↪ arco A Greve que Cresce.
22. **Ensino médio integral** — programa. A) Expandir: $ −−, Sat[estudantes] +.
23. **Escolas ocupadas** — reorganização de escolas. A) Recuar: Cap −. B) Reintegração: Sat[estudantes] −−.
24. **Universidade estadual sem verba** — crise. A) Aporte: $ −. B) Cortar bolsas: Sat[estudantes] −.
25. **Escolas cívico-militares** — debate. A) Expandir: Sat[segurança] +, Sat[estudantes] −.
26. **Merenda estadual cara** — auditoria. ↪ arco Licitação Dirigida.
27. **Transporte escolar estadual** — interior. A) Ônibus novos: $ −.
28. **Ranking nacional** — ensino médio. Notícia: Apr ±2.
29. **Escola técnica nova** — cidade-polo. A) Construir: Pref +, Obra.
30. **Professores temporários** — 50% da rede. A) Concurso: $ futuro −.
31. **Celular proibido em sala** — lei estadual. A) Aprovar: Sat[pais] +, Sat[estudantes] −.
32. **Livro didático polêmico** — conteúdo. A) Recolher: Sat[religiosos] +, Sat[professores] −.
33. **Vestibular estadual vaza** — fraude. A) Cancelar e refazer: Cred +.
34. **Cotas na universidade estadual** — debate. A) Ampliar: Sat[jovens] dividido.
35. **Bolsa para ensino médio** — evasão. A) Pagar poupança-aluno: $ −, evasão −.

### 5.3 Saúde

36. **Hospital regional parado** — obra. ↪ arco Hospital Fantasma.
37. **Fila de cirurgias** — eletivas. A) Mutirão estadual: $ −−, Apr +4.
38. **Falta de leitos de UTI** — inverno. A) Abrir leitos: $ −.
39. **Organizações sociais na saúde** — gestão. A) Ampliar OS: debate ideológico.
40. **Epidemia regional** — doença tropical. A) Mobilização: $ −.
41. **Remédios de alto custo** — judicialização. A) Ampliar lista: $ −−.
42. **Médicos do interior** — falta. A) Bônus para interior: $ −.
43. **SAMU estadual** — cobertura. A) Ampliar: Pref +.
44. **Hospital universitário em crise** — federal/estadual. A) Assumir parte: $ −.
45. **Hemocentro vazio** — doações. A) Campanha: Cred +.

### 5.4 Estradas e infraestrutura

46. **Rodovia mortal** — acidentes. A) Duplicação: Obra grande. B) Radares: polêmica.
47. **Ponte interditada** — rodovia estadual. A) Ponte provisória do Exército: Rel[presidente] +.
48. **Concessão de rodovias** — pedágio. ↪ arco Pedágio.
49. **Aeroporto regional** — cidade-polo. A) Investir: Pref +.
50. **Ferrovia estadual** — logística. A) Parceria privada: investimento +.
51. **Porto estadual** — exportação. A) Dragagem: $ −−.
52. **Estradas de terra** — safra atolada. A) Programa de asfalto: GI[agro] +.
53. **Metrô estadual atrasado** — capital. A) Aditivo: $ −.
54. **Barragem de abastecimento** — seca. A) Construir: Obra grande.
55. **Internet rural** — conectividade. A) Torres 4G: GI[agro] +.

### 5.5 Finanças estaduais

56. **Dívida com a União** — pagamento. A) Aderir a regime de recuperação: $ +, contrapartidas duras. B) Ir ao STF: liminar 50%.
57. **ICMS de combustíveis** — preço alto. A) Reduzir alíquota: $ −, Apr +3.
58. **Guerra fiscal** — estado vizinho. ↪ arco Guerra Fiscal.
59. **Previdência estadual quebrada** — déficit. A) Reforma estadual: Sat[servidores] −−, $ futuro +.
60. **Folha atrasada** — crise. A) Parcelar salários: greve geral. B) Vender estatal.
61. **Privatizar a companhia de saneamento** — debate. ↪ arco Concessão do Saneamento.
62. **Privatizar a companhia de energia** — debate. A) Vender: $ ++, GI[sindicatos] −.
63. **Royalties de mineração** — estado minerador. A) Aumentar taxa: $ +, GI[indústria] −.
64. **Incentivo para indústria** — empresa grande. ↪ arco Montadora Nova.
65. **Rating rebaixado** — agência de risco. Notícia: juros da dívida sobem.
66. **Superávit inesperado** — commodity. A) Poupar: fundo. B) Reajustar servidores: Sat +.
67. **Precatórios estaduais** — dívida judicial. A) Pagar: $ −−.
68. **Teto de gastos estadual** — controle. A) Aprovar: $ futuro +, Sat[servidores] −.
69. **Fundo de combate à pobreza** — ICMS adicional. A) Criar: $ +, preços sobem.
70. **Refis estadual** — devedores. A) Lançar: $ + curto prazo.

### 5.6 Assembleia Legislativa

71. **Assembleia rejeita empréstimo** — base fraca. A) Negociar emendas: Cap −. B) Desistir.
72. **CPI estadual** — escândalo. ↪ arco CPI.
73. **Deputados querem emendas impositivas** — orçamento. A) Aprovar: Ass +, $ discricionário −.
74. **Presidente da Assembleia vira rival** — disputa. A) Aproximar: Cap −.
75. **Pedido de impeachment** — crise. ↪ arco Impeachment.
76. **Reforma do secretariado** — base. A) Dar secretarias a aliados: Ass +, eficiência −.
77. **Lei polêmica de deputado** — costumes. A) Vetar: Ass −. B) Sancionar.
78. **Tribunal de Contas indica conselheiro** — vaga. A) Indicar técnico: Cred +. B) Indicar aliado.
79. **Deputados aumentam verba de gabinete** — opinião pública. A) Criticar: Apr +2, Ass −.
80. **Votação da LDO** — prazo. A) Aprovar com concessões.

### 5.7 Desastres e meio ambiente

81. **Enchente estadual** — chuvas. ↪ arco Enchente.
82. **Seca prolongada** — semiárido. ↪ arco Seca no Sertão.
83. **Queimadas recorde** — Norte/CO. ↪ arco Queimadas.
84. **Barragem de mineração** — risco. ↪ arco Barragem.
85. **Licenciamento ambiental** — obra grande. A) Acelerar: GI[indústria] +, GI[ambientalistas] −.
86. **Desmatamento sobe** — dados de satélite. A) Fiscalização: GI[agro] −. B) Negar dados: Cred −.
87. **Vazamento de óleo no litoral** — praias. A) Mutirão de limpeza: $ −.
88. **Rio contaminado por mineração** — metais. A) Multa à empresa: GI[indústria] −.
89. **Parque estadual invadido** — grilagem. A) Retirada: conflito.
90. **Crise hídrica** — reservatórios. ↪ arco Crise Hídrica.
91. **Terremoto leve** — raro. Notícia: Apr +1 pela resposta.
92. **Ciclone extratropical** — Sul. A) Defesa Civil: $ −.
93. **Mancha de esgoto na praia** — turismo. A) Obra: $ −−.
94. **Fiscalização do agrotóxico** — saúde. A) Restringir: GI[agro] −.
95. **Mercado de carbono estadual** — floresta. A) Criar: $ +, GI[ambientalistas] +.

### 5.8 Relações com municípios e União

96. **Prefeitos fazem fila por verbas** — interior. A) Programa de convênios: Pref +, $ −.
97. **Prefeito da capital é rival** — partidos opostos. A) Parceria: Apr dos dois. B) Guerra: obras param.
98. **Presidente corta repasse** — rivalidade. A) Ir ao STF. B) Negociar: Cap −.
99. **Frente de governadores** — pauta federativa. A) Liderar: Fama +.
100.  **Força Nacional enviada** — crise. A) Aceitar: Rel[presidente] +.
101.  **Consórcio interestadual** — região. A) Liderar consórcio: Fama +.
102.  **Municípios pedem ICMS ecológico** — distribuição. A) Aprovar: Pref[interior] +.
103.  **Governo federal inaugura obra sua** — disputa de paternidade. A) Ir à inauguração.
104.  **Programa federal exige adesão** — saúde. A) Aderir: $ −, benefícios +.
105.  **Senadores do estado rompem** — bancada. A) Reaproximar: Cap −.

### 5.9 Economia e desenvolvimento

106. **Fábrica de automóveis anuncia saída** — indústria. ↪ arco A Fábrica Vai Embora.
107. **Embargo à carne** — agro. ↪ arco Frigorífico Fechado.
108. **Safra recorde** — agro. Notícia: $ +, Apr +2.
109. **Geada mata o café** — Sul/Sudeste. A) Linha de crédito: $ −.
110. **Turismo bate recorde** — litoral. Notícia: Apr +1.
111. **Polo tecnológico** — universidade. A) Incentivos: GI[tecnologia] +.
112. **Mineração quer área indígena** — Norte. A) Apoiar: GI[mineração] +, conflito. B) Recusar.
113. **Usina eólica** — Nordeste. A) Licenciar: $ +, comunidades reclamam.
114. **Hidrogênio verde** — porto. A) Hub: investimento +.
115. **Exportação de frutas** — tarifas. A) Missão comercial: Fama +.
116. **Polo naval** — litoral. A) Reativar estaleiro: empregos +, $ −.
117. **Pecuária sustentável** — certificação. A) Programa: GI[agro] +, GI[ambientalistas] +.
118. **Zona de processamento de exportação** — porto. A) Criar: investimento +.
119. **Desemprego estadual recorde** — crise. A) Frentes de trabalho: $ −.
120. **Feira agro do estado** — anual. A) Inaugurar: GI[agro] +.

### 5.10 Gestão e governo

121. **Secretário de segurança preso** — escândalo. A) Demitir: Esc +5. B) Defender: Esc +15.
122. **Governo digital** — serviços online. A) Investir: Sat[jovens] +.
123. **Estatal dá prejuízo** — gestão. A) Reestruturar: Cap −.
124. **Vice-governador conspira** — ↪ arco O Vice Ambicioso.
125. **Reforma administrativa** — secretarias. A) Fundir 10 secretarias: $ +, Ass −.
126. **Avião do governo** — gastos. A) Vender o avião: Apr +2.
127. **Viagem internacional** — atrair investimento. A) Ir: Fama +, críticas.
128. **Palácio em reforma cara** — imprensa. A) Cancelar: Apr +1.
129. **Concurso para auditores** — receita. A) Abrir: $ futuro +.
130. **Transparência** — Lei de Acesso. A) Portal completo: Cred +.

### 5.11 Servidores e sindicatos

131. **Reajuste geral** — inflação. A) Dar inflação: $ −−. B) Abaixo da inflação: greve.
132. **Delegados em greve** — polícia civil. A) Negociar.
133. **Médicos estaduais em greve** — saúde. A) Plano de carreira: $ −.
134. **Servidores aposentados protestam** — previdência. A) Manter benefícios: $ −.
135. **Plano de cargos da educação** — professores. A) Aprovar: $ futuro −−.
136. **Terceirização** — gestão. A) Ampliar: GI[sindicatos] −.
137. **Assédio moral em secretaria** — denúncia. A) Afastar o secretário: Cred +.
138. **Teletrabalho no serviço público** — pós-pandemia. A) Permitir: Sat[servidores] +.
139. **Corte de cargos comissionados** — ajuste. A) Cortar 30%: Ass −, Apr +.
140. **Bônus por desempenho** — gestão. A) Implantar: Sat[servidores] dividido.

### 5.12 Cultura, esporte e sociedade

141. **Festa tradicional do estado** — calendário. A) Apoiar: Apr +2.
142. **Estádio estadual** — futebol. A) Conceder à iniciativa privada.
143. **Orquestra sinfônica** — cultura. A) Manter: $ −, Sat[classe média] +.
144. **Patrimônio histórico** — cidade colonial. A) Restaurar: turismo +.
145. **Jogos estudantis** — esporte. A) Organizar: Sat[jovens] +.
146. **Comunidades indígenas** — saúde. A) Programa estadual: Cred +.
147. **Quilombos** — regularização. A) Titular terras: GI[movimentos] +.
148. **Migrantes** — acolhimento. A) Centro estadual: Sat dividido.
149. **Pessoas com deficiência** — acessibilidade. A) Programa: Cred +.
150. **Racismo em clube** — caso nacional. A) Lei estadual antirracismo: Cred +.

### 5.13 Eventos por região (governador)

151. **Norte: rio seca e isola cidades** — seca amazônica. A) Ponte aérea de alimentos: $ −−, Apr +4.
152. **Norte: garimpo ilegal no rio** — fiscalização. A) Operação com a PF: GI[mineração] −.
153. **Norte: Zona Franca ameaçada** — AM. A) Defender em Brasília: Fama +.
154. **Nordeste: transposição atrasa** — semiárido. A) Cobrar a União: Rel[presidente] −.
155. **Nordeste: parque eólico e comunidades** — energia. A) Mediar: Cred +.
156. **Nordeste: São João estadual** — cultura. A) Festa: Apr +3.
157. **Centro-Oeste: ferrovia da soja** — logística. A) Apoiar: GI[agro] +.
158. **Centro-Oeste: Pantanal em chamas** — MS/MT. ↪ arco Queimadas.
159. **Centro-Oeste: conflito indígena** — MS. A) Mediação: conflito −.
160. **Sudeste: crise hídrica metropolitana** — SP/RJ/MG. ↪ arco Crise Hídrica.
161. **Sudeste: barragens** — MG. ↪ arco Barragem.
162. **Sudeste: milícias** — RJ. ↪ arco Milícia no Bairro.
163. **Sudeste: royalties do petróleo** — RJ/ES. A) Disputa no STF.
164. **Sul: enchentes** — RS/SC. ↪ arco Enchente.
165. **Sul: geada e safra** — PR/SC/RS. A) Seguro rural: $ −.
166. **Sul: dívida com a União** — RS. A) Renegociar.
167. **Sul: pedágios** — PR. ↪ arco Pedágio.
168. **Sul: migração de trabalhadores** — SC. A) Política de acolhimento.
169. **Fronteira: contrabando** — PR/MS/RS. A) Força-tarefa.
170. **Fronteira: imigração venezuelana** — RR. ↪ arco Crise Migratória.

### 5.14 Mais eventos estaduais

171. **Governador em campanha nacional** — ambição. A) Viajar pelo país: Fama +, Apr local −2.
172. **Deputado federal do estado quer ser governador** — rival. Notícia.
173. **Visita do presidente** — inauguração. A) Recepção: Rel +.
174. **Visita do papa / líder religioso** — capital. A) Organizar: Apr +2, $ −.
175. **Evento internacional** — conferência. A) Sediar: Fama +, $ −.
176. **Copa do Mundo de outra modalidade** — sede. A) Investir: Obra.
177. **Satélite de monitoramento** — tecnologia. A) Parceria: Cred +.
178. **Ataque cibernético ao governo** — ↪ arco Ataque Hacker ao Governo.
179. **Vazamento de dados do Detran** — privacidade. A) Investigar: Cred +.
180. **Concurso da PM com fraude** — denúncia. A) Anular.
181. **Polícia científica sem estrutura** — crimes sem solução. A) Investir.
182. **Caso de grande repercussão** — crime nacional. A) Resposta rápida: Apr +2.
183. **Governador cai nas pesquisas para presidente** — ambição. Notícia.
184. **Primeira-dama/primeiro-cavalheiro em programa social** — debate. A) Cargo voluntário: Rej[nepotismo] +.
185. **Juiz manda soltar presos** — superlotação. A) Recorrer.
186. **Greve de caminhoneiros estadual** — ICMS. A) Reduzir ICMS do diesel.
187. **Movimento separatista** — Sul (fictício). A) Ignorar. B) Debater federalismo.
188. **Escola rural fecha** — interior. A) Manter aberta: $ −.
189. **Hospital de campanha** — epidemia. A) Montar.
190. **Vacinação estadual** — doença. A) Comprar vacina própria: $ −−.
191. **Concessão de parques estaduais** — turismo. A) Conceder: $ +.
192. **Metrô de superfície** — capital. A) Projeto: Obra.
193. **Habitação estadual** — déficit. A) Programa próprio: $ −.
194. **Sistema de cotas em concurso** — inclusão. A) Aprovar.
195. **Plano estadual de carbono zero** — clima. A) Lançar.
196. **Feira de inovação** — tecnologia. A) Sediar.
197. **Universidade estadual nova** — interior. A) Criar campus.
198. **Linha de crédito para micro** — banco estadual. A) Lançar: GI[comércio] +.
199. **Pacto com prefeitos pela educação** — alfabetização. A) Assinar: Pref +.
200. **Último ano de mandato** — sucessão. A) Lançar sucessor: Fama + para o aliado. B) Concorrer ao Senado: renúncia em abril.

## 6. Eventos federais (Presidência)

Esfera federal. Efeitos típicos: Apr, Cap, Est, legitimidade (Leg), economia (`economyShock`: crescimento, inflação, desemprego, câmbio, confiança), Congresso (base, relação com partidos), GI[grupo].

### 6.1 Economia e mercado

1. **Dólar dispara** — risco fiscal. A) Anunciar corte de gastos: confiança +, Sat[servidores] −. B) Culpar especuladores: Ent +, câmbio piora. C) Intervenção do BC com reservas: câmbio estabiliza 3 meses.
2. **Inflação de alimentos** — choque de oferta. A) Zerar impostos de importação de alimentos: inflação −, GI[agro] −. B) Estoques reguladores: $ −.
3. **Juros em 15%** — BC aperta. A) Pressionar o BC: Cred −, confiança −. B) Respeitar a autonomia: crescimento −.
4. **Banco Central autônomo diverge** — juros altos. A) Atacar publicamente: Ent +, câmbio −. B) Reunião reservada.
5. **Regra fiscal em xeque** — gasto acima da meta. A) Mudar a meta: confiança −. B) Contingenciar: Sat −.
6. **Reforma tributária** — PEC. A) Unificar impostos sobre consumo: estados e municípios brigam. B) Fatiar.
7. **Reforma da Previdência** — déficit. ↪ cenário Reforma da Previdência.
8. **Privatização de estatal** — ↪ arco Privatização Polêmica.
9. **Estatal de petróleo e preço da gasolina** — combustível caro. A) Segurar preço: prejuízo da estatal, inflação −. B) Paridade internacional: Apr −3. C) Fundo de estabilização: $ −.
10. **Agência rebaixa a nota do país** — rating. Notícia: juros +, confiança −.
11. **Agência eleva a nota** — superávit. Notícia: confiança +.
12. **Recessão técnica** — dois trimestres. A) Pacote de estímulo: dívida +, crescimento +. B) Austeridade: desemprego +.
13. **PIB surpreende** — crescimento 4%. Notícia: Apr +3.
14. **Desemprego recorde** — crise. A) Programa de obras: $ −−. B) Desoneração da folha: receita −.
15. **Salário mínimo** — reajuste anual. A) Ganho real: Sat[trabalhadores] +, $ previdência −. B) Só inflação: Sat −.
16. **Bolsas sociais** — programa de renda. A) Ampliar: Sat[pobres] ++, $ −−. B) Revisar cadastro: economia +, Sat −.
17. **Crédito para o agro** — Plano Safra. A) Juros subsidiados: GI[agro] +, $ −.
18. **Crise de bancos médios** — sistema financeiro. A) Socorro: Rej +, estabilidade +. B) Deixar quebrar: confiança −.
19. **Dívida pública passa de 90% do PIB** — alerta. A) Pacote fiscal: Cap −.
20. **Teto do funcionalismo** — supersalários. A) Lei contra penduricalhos: Apr +3, GI[servidores de elite] −.

### 6.2 Comércio exterior e geopolítica econômica

21. **Tarifa dos EUA sobre aço brasileiro** — protecionismo. A) Retaliar: GI[indústria] dividido. B) Negociar cotas.
22. **Acordo Mercosul–União Europeia** — ratificação. A) Ratificar: GI[agro] +, GI[indústria] −. B) Exigir mudanças.
23. **China compra menos soja** — desaceleração. Notícia: GI[agro] −, receita −.
24. **Crise na Argentina** — vizinho. A) Socorro via BNDES: polêmica. B) Proteger exportadores.
25. **Brics propõe moeda comum** — geopolítica. A) Apoiar: Rel[EUA] −. B) Cautela.
26. **Embargo europeu por desmatamento** — lei europeia. A) Rastreabilidade obrigatória: GI[agro] −. B) Contestar na OMC.
27. **Preço do minério despenca** — commodities. Notícia: receita −.
28. **Missão comercial na Ásia** — exportação. A) Viajar com empresários: Fama +.
29. **Investidor estrangeiro sai** — fuga de capitais. A) Garantias: confiança +.
30. **Acordo de livre comércio com país asiático** — tarifas. A) Assinar: GI[indústria] −, consumidores +.

### 6.3 Congresso e coalizão

31. **Centrão cobra ministérios** — base. A) Entregar 3 ministérios: base +40 votos, eficiência −. B) Recusar: pauta trava.
32. **Presidente da Câmara engaveta tudo** — rival. A) Negociar: Cap −. B) Ir para a rua: Leg pressão.
33. **Emendas parlamentares** — orçamento. A) Liberar R$ bilhões: base +, $ discricionário −. B) Segurar: rebelião.
34. **Votação da LDO** — prazo. A) Concessões: Cap −.
35. **Medida provisória caduca** — Congresso não vota. Notícia: Cap −5.
36. **PEC de interesse do Congresso** — aumento de fundo eleitoral. A) Apoiar: base +, Apr −3. B) Vetar.
37. **Rebelião na coalizão** — crise. A) Reunião no palácio: Cap −10. B) Ameaçar demissões.
38. **Líder do governo cai** — derrota. A) Novo líder do Centrão: base +.
39. **Senado rejeita indicado** — STF/agência. Notícia: Cap −8.
40. **CPI contra o governo** — ↪ arco CPI.
41. **Impeachment** — ↪ arco Impeachment.
42. **Voto impresso volta à pauta** — Congresso. A) Apoiar: Ent[base] +, Leg −. B) Defender a urna eletrônica.
43. **Anistia em pauta** — tema sensível. A) Apoiar: polarização. B) Vetar.
44. **Reforma política** — sistema eleitoral. A) Propor voto distrital misto: Congresso resiste.
45. **Orçamento secreto (emendas de relator)** — transparência. A) Acabar: base −, Cred +. B) Manter: Esc latente +.

### 6.4 Judiciário e órgãos de controle

46. **STF suspende decreto** — inconstitucional. A) Acatar: Leg +. B) Atacar o STF: Ent +, Leg −−.
47. **Indicação ao STF** — vaga. A) Jurista técnico: Cred +. B) Aliado fiel: base +, Cred −.
48. **PGR denuncia ministro** — escândalo. A) Demitir: Cap −. B) Manter: Esc +.
49. **TCU aponta irregularidade** — programa. A) Corrigir: Cred +.
50. **PF faz operação no governo** — escândalo. ↪ arco Mandado na Madrugada.
51. **Lava-Jato 2.0** — investigação ampla. A) Apoiar: Cred +, risco a aliados.
52. **STF julga marco temporal** — terras indígenas. A) Comentar: polarização.
53. **TSE multa partido do presidente** — campanha. Notícia: Esc +3.
54. **Delação de empresário** — ↪ arco Delação Premiada.
55. **Indulto de Natal** — tradição. A) Amplo: Rej +. B) Restrito.

### 6.5 Relações exteriores

56. **Cúpula do G20** — liderança. A) Propor taxação de super-ricos: Fama +, GI[empresariado] −.
57. **Crise na Venezuela** — refugiados. ↪ arco Crise Migratória.
58. **Guerra distante** — conflito internacional. A) Neutralidade: Rel[potências] neutras. B) Condenar: polarização.
59. **Brasileiros presos no exterior** — consular. A) Negociar libertação: Fama +.
60. **Assento permanente na ONU** — diplomacia. A) Campanha: Fama +, $ −.
61. **Visita do presidente dos EUA** — diplomacia. A) Acordo de defesa: polarização.
62. **Visita do líder chinês** — investimentos. A) Acordos de infraestrutura: polarização.
63. **Amazônia em foco** — conferência do clima. ↪ arco Queimadas.
64. **Fundo Amazônia** — doadores. A) Reativar: $ +, GI[agro] −.
65. **Embaixador expulso** — crise diplomática. A) Retaliar: Ent +. B) Diálogo.
66. **Repatriação na guerra** — brasileiros em zona de conflito. A) Avião da FAB: Apr +3.
67. **Mercosul em crise** — vizinho quer sair. A) Mediação.
68. **Fronteira com cocaína** — Bolívia/Peru/Colômbia. A) Cooperação militar.
69. **Tratado da Antártida** — ciência. Notícia.
70. **Brasil sedia Copa ou Olimpíada** — candidatura. A) Apoiar: Fama +, $ futuro −−.

### 6.6 Social, saúde e educação

71. **Pandemia** — ↪ cenário Pandemia Nova.
72. **Vacina nacional** — instituto público. A) Investir: $ −, Cred +.
73. **SUS em colapso** — financiamento. A) Aumentar piso da saúde: $ −−.
74. **Enem vaza** — prova. A) Cancelar e refazer: Cred +, $ −.
75. **Universidades federais em greve** — salários. A) Reajuste: $ −. B) Endurecer.
76. **Programa de casas populares** — habitação. A) Relançar: Sat[pobres] +, $ −−.
77. **Farmácia popular** — remédios. A) Ampliar: Sat[aposentados] +.
78. **Fome volta ao mapa** — relatório da ONU. A) Programa emergencial: $ −, Apr +.
79. **Cotas raciais em revisão** — lei. A) Renovar: polarização.
80. **Escola em tempo integral nacional** — programa. A) Lançar: $ −−, legado.
81. **Médicos para o interior** — programa. A) Relançar: Sat[interior] +, GI[médicos] −.
82. **Censo atrasado** — IBGE sem verba. A) Liberar recursos: Cred +.
83. **Analfabetismo funcional** — dados. A) Programa nacional.
84. **Saneamento básico universal** — marco legal. A) Acelerar concessões: investimento +.
85. **Previdência do INSS com fila** — 2 milhões na fila. A) Mutirão: Sat[aposentados] +.

### 6.7 Segurança e defesa

86. **Crime organizado nacional** — facções. A) Lei antifacção dura: Sat[segurança] +.
87. **Ministério da Segurança** — estrutura. A) Criar: $ −.
88. **Militares pedem reajuste** — Forças Armadas. A) Conceder: GI[militares] +, $ −.
89. **General critica o governo** — quebra de hierarquia. A) Exonerar: Leg +, tensão. B) Ignorar: autoridade −.
90. **Operação de Garantia da Lei e da Ordem** — crise estadual. A) Enviar tropas: Sat[segurança] +.
91. **Compra de caças** — defesa. A) Comprar: $ −−, GI[indústria de defesa] +.
92. **Ataque hacker ao governo federal** — ↪ arco Ataque Hacker ao Governo.
93. **Tráfico de armas** — fronteira. A) Controle de armas: polarização.
94. **Decreto de armas** — tema sensível. A) Flexibilizar: Sat[segurança] +, Sat[jovens] −. B) Restringir: inverso.
95. **Polícia Federal sem verba** — investigações. A) Recompor: Cred +.

### 6.8 Energia, infraestrutura e meio ambiente

96. **Apagão nacional** — ↪ arco Apagão.
97. **Petróleo na Foz do Amazonas** — licença. A) Autorizar: $ futuro ++, GI[ambientalistas] −−. B) Negar: GI[petroleiras] −.
98. **Ferrovia transcontinental** — logística. A) Concessão: investimento +.
99. **Hidrelétrica na Amazônia** — energia. A) Aprovar: energia +, conflito indígena.
100.  **Energia nuclear** — usina parada. A) Retomar obra: $ −−.
101.  **Desmatamento recorde** — dados. A) Operação federal: GI[agro] −, Fama +.
102.  **Garimpo em terra indígena** — crise humanitária. A) Operação de retirada: Cred +.
103.  **Marco temporal** — Congresso. A) Vetar: GI[agro] −.
104.  **Carros elétricos** — indústria. A) Incentivo: GI[indústria] dividido.
105.  **Biocombustíveis** — etanol. A) Mistura maior: GI[agro] +.

### 6.9 Tecnologia e mídia

106. **Regulação das redes** — fake news. A) Lei de responsabilidade das plataformas: polarização, Big Techs reagem. B) Autorregulação.
107. **Inteligência artificial** — empregos. A) Marco legal da IA: GI[tecnologia] dividido.
108. **Big Tech ameaça sair do país** — regulação. A) Manter a lei: Fama +. B) Recuar.
109. **5G no interior** — conectividade. A) Obrigação das operadoras: GI[agro] +.
110. **Moeda digital do BC** — inovação. ↪ cenário Moeda Digital.
111. **Vazamento de dados do governo** — privacidade. A) Investigar: Cred +.
112. **Canal estatal de TV** — comunicação. A) Ampliar: polarização. B) Privatizar.
113. **Jornalista agredido** — liberdade de imprensa. A) Condenar: Cred +.
114. **Apostas online** — vício. A) Regular duramente: receita −. B) Tributar: receita +.
115. **Criptomoedas** — fraudes. A) Regulamentar: Cred +.

### 6.10 Política nacional e partido

116. **Presidente do partido quer ser candidato** — sucessão. A) Apoiar. B) Lançar outro nome.
117. **Ex-presidente vira rival** — passado. Notícia polariza.
118. **Primeiro escalão em crise** — ministros brigam. A) Demitir os dois: Est +.
119. **Ministro faz declaração desastrosa** — gafe. A) Demitir: Cap −. B) Manter: Apr −2.
120. **Pesquisa de 2º mandato** — reeleição. Notícia.
121. **Vice faz carreira própria** — ↪ arco O Vice Ambicioso.
122. **Partido aliado lança candidato próprio** — eleição. A) Negociar: Cap −.
123. **Escândalo no partido** — tesoureiro. ↪ arco Doação Generosa.
124. **Manifestações contra o governo** — rua. A) Ignorar: Leg −. B) Diálogo: Cap −.
125. **Manifestações a favor** — base. A) Discursar: Ent +, polarização +.
126. **Greve geral** — centrais sindicais. A) Negociar pauta: GI[sindicatos] +.
127. **Caminhoneiros param o país** — diesel. A) Subsidiar diesel: $ −−. B) Endurecer: desabastecimento.
128. **Panelaço** — classe média. Notícia: Apr −1.
129. **Fake news sobre o presidente** — redes. A) Desmentir.
130. **Biografia do presidente** — ↪ arco Biografia Não Autorizada.

### 6.11 Mais eventos federais

131. **Copa do Mundo** — seleção. A) Assistir com o povo: Apr +1 se vencer.
132. **Atleta brasileiro ganha ouro** — Olimpíada. A) Receber no palácio: Apr +1.
133. **Morte de ex-presidente** — luto. A) Luto oficial de 3 dias: Cred +.
134. **Desastre aéreo** — tragédia. A) Visitar famílias: Cred +.
135. **Tragédia em escola** — ataque. A) Plano nacional: Cred +.
136. **Rompimento de barragem** — ↪ arco Barragem.
137. **Terremoto em país vizinho** — ajuda humanitária. A) Enviar ajuda: Fama +.
138. **Navio com refugiados** — litoral. A) Acolher: Sat dividido.
139. **Seca no Sul e cheia no Norte** — clima extremo. A) Plano nacional de adaptação.
140. **Recorde de queimadas** — ↪ arco Queimadas.
141. **Programa espacial** — lançamento. A) Investir: Fama +.
142. **Descoberta de terras raras** — mineração. A) Estatal de minerais críticos: polarização.
143. **Pré-sal 2** — petróleo. ↪ oil_discovery (existente).
144. **Ponte com país vizinho** — integração. A) Inaugurar: Fama +.
145. **Hidrovia** — logística. A) Concessão.
146. **Transposição de rios** — semiárido. A) Ampliar: Apr[Nordeste] +.
147. **Censura em exposição** — cultura. A) Defender a liberdade: polarização.
148. **Lei Rouanet** — cultura. A) Ampliar: polarização. B) Reduzir: polarização.
149. **Carnaval com críticas ao governo** — sambas. A) Ignorar. B) Reagir: Streisand.
150. **Indígenas em Brasília** — acampamento. A) Receber lideranças: GI[movimentos] +.
151. **Marcha dos prefeitos** — Brasília. A) Liberar repasse: Pref +.
152. **Greve de servidores federais** — salários. A) Reajuste parcelado.
153. **Concurso nacional unificado** — serviço público. A) Realizar: Sat[jovens] +.
154. **Prova de vida do INSS** — idosos em fila. A) Fim da prova presencial: Sat[aposentados] +.
155. **Remédio caro para doença rara** — judicialização. A) Incorporar ao SUS: $ −.
156. **Cannabis medicinal** — regulação. A) Liberar: polarização.
157. **Aborto em pauta** — tema sensível. A) Não mexer na lei: neutro. B) Qualquer mudança: polarização extrema.
158. **Drogas: descriminalização** — STF. A) Comentar: polarização.
159. **Ensino domiciliar** — costumes. A) Regulamentar: Sat[religiosos] +.
160. **Casamento civil igualitário** — STF já garantiu. A) Defender: Sat[jovens] +.
161. **Lei de cotas para mulheres na política** — representação. A) Ampliar: Cred +.
162. **Voto aos 16 obrigatório** — reforma. A) Propor: polarização.
163. **Fim da reeleição** — reforma. A) Apoiar: Cred +, futuro próprio −.
164. **Mandato de 5 anos** — reforma. A) Apoiar.
165. **Fundo eleitoral bilionário** — opinião pública. A) Vetar aumento: Apr +3, base −.
166. **Taxação das blusinhas** — compras internacionais. A) Taxar: GI[indústria] +, Sat[jovens] −.
167. **Imposto sobre grandes fortunas** — justiça tributária. A) Propor: GI[empresariado] −, Sat[pobres] +.
168. **Isenção do IR até 5 mil** — classe média. A) Aprovar: Sat[classe média] ++, receita −.
169. **Desoneração da folha** — 17 setores. A) Prorrogar: GI[indústria] +, receita −.
170. **Arcabouço fiscal** — âncora. A) Endurecer: confiança +.
171. **Fundo soberano** — petróleo. A) Criar: legado.
172. **Banco de desenvolvimento** — crédito. A) Ampliar empréstimos: crescimento +, dívida +.
173. **Estatal de chips** — tecnologia. A) Reativar: $ −.
174. **Indústria de defesa** — exportação. A) Apoiar.
175. **Reforma administrativa federal** — estabilidade do servidor. A) Propor: GI[servidores] −−.
176. **Supremo e Congresso brigam** — crise institucional. A) Mediar: Leg +.
177. **Militares e STF brigam** — crise. A) Defender as instituições: Leg +.
178. **Ataque às sedes dos Poderes** — crise democrática. A) Responsabilizar: Leg +, polarização.
179. **Pedido de intervenção militar** — manifestantes. A) Rechaçar: Leg ++.
180. **Plebiscito nacional** — ↪ arco Plebiscito.
181. **Caso de racismo internacional** — atleta. A) Nota oficial: Cred +.
182. **Missão de paz** — ONU. A) Enviar tropas: Fama +.
183. **Satélite brasileiro** — lançamento. A) Celebrar: Fama +.
184. **Cientista brasileiro ganha Nobel** — ciência. A) Homenagem: Cred +.
185. **Fuga de cérebros** — pesquisadores. A) Bolsas: Sat[estudantes] +.
186. **Corte em bolsas de pesquisa** — ajuste. A) Manter: $ −.
187. **Museu Nacional reaberto** — cultura. A) Inaugurar: Cred +.
188. **Incêndio em patrimônio** — tragédia. A) Fundo de patrimônio.
189. **Seleção feminina vence** — esporte. A) Programa para o futebol feminino.
190. **Doping de atleta** — escândalo esportivo. Notícia.
191. **Rodovias federais esburacadas** — DNIT. A) Operação tapa-buraco nacional.
192. **Aeroportos concedidos** — infraestrutura. A) Nova rodada.
193. **Portos com fila de navios** — safra. A) Investimento emergencial.
194. **Greve de auditores fiscais** — receita. A) Negociar.
195. **Receita Federal bate recorde** — arrecadação. Notícia: $ +.
196. **Contrabando de cigarros** — fronteira. A) Fiscalização.
197. **Turismo internacional cresce** — câmbio. Notícia.
198. **Brasileiros emigram** — crise. Notícia: Sat −.
199. **Brasileiros voltam** — economia melhora. Notícia: Sat +.
200. **Último ano de mandato** — sucessão. A) Candidato próprio. B) Reeleição. C) Apoiar aliado de outro partido.

## 7. Eventos de mandato legislativo

Vereador, deputado estadual, deputado federal e senador. Efeitos típicos: relação com a liderança do partido (Lid), com o Executivo (Exe), fama, credibilidade, base eleitoral (Base[região]), emendas ($ emendas), GI[grupo].

### 7.1 Votações e plenário

1. **Voto contra o partido** — orientação contrária às suas bandeiras. A) Votar com a consciência: Lid −15, Cred +4. B) Seguir a orientação: Cred −2. C) Faltar à sessão: Lid −5, imprensa nota.
2. **Votação noturna** — projeto polêmico às 2h. A) Denunciar a pressa: Cred +2. B) Votar: depende do projeto.
3. **Voto decisivo** — empate. A) Negociar seu voto com o Executivo: emendas +. B) Votar pelo programa: Cred +.
4. **Projeto impopular do governo aliado** — aumento de imposto. A) Votar a favor: Exe +10, Base −. B) Contra: Exe −10.
5. **Obstrução** — oposição. A) Liderar obstrução: Fama +, Exe −. B) Não participar.
6. **Discurso viral na tribuna** — tema em alta. A) Discurso inflamado: Fama +4, Rej +1. B) Técnico: Cred +2.
7. **Projeto seu é aprovado** — raro. Notícia: Cred +5, Fama +3.
8. **Projeto seu é engavetado** — presidente da Casa. ↪ arco A Velha Raposa.
9. **Pedido de vista** — atrasar votação. A) Pedir vista: aliados gratos. B) Votar logo.
10. **Votação secreta** — eleição da Mesa. A) Apoiar o candidato do partido: Lid +. B) Apoiar o favorito: cargo na Mesa.
11. **Destaque derruba seu artigo** — projeto. A) Negociar a volta. B) Aceitar.
12. **Urgência para projeto popular** — abaixo-assinado. A) Assinar: Fama +.
13. **Sessão de homenagem** — título de cidadão. A) Propor homenagem a ídolo local: Fama + local.
14. **Projeto de lei inútil** — data comemorativa. A) Propor (fácil de aprovar): Cred −1. B) Não.
15. **Votação da reforma** — tema estrutural. A) A favor: GI dividido. B) Contra.

### 7.2 Comissões e relatoria

16. **Presidência de comissão** — oportunidade. A) Aceitar a de Constituição e Justiça: Fama +, trabalho +. B) Comissão temática do seu tema: Cred +.
17. **Relatoria do orçamento** — poder. A) Aceitar: emendas ++, Esc latente +. ↪ arco Emenda Pix.
18. **Relator de CPI** — escândalo. A) Relatório duro: Fama +, inimigos. B) Relatório brando: Cred −.
19. **Audiência pública lotada** — tema polêmico. A) Ouvir todos os lados: Cred +.
20. **Convocação de ministro/secretário** — fiscalização. A) Interrogar duramente: Fama +, Exe −.
21. **Comissão de ética** — colega denunciado. A) Votar pela cassação: Cred +, colegas −. B) Absolver.
22. **Relatório de projeto de outro partido** — consenso. A) Construir acordo: Cred +, Lid neutro.
23. **Frente parlamentar** — tema. A) Fundar frente do seu tema: Fama +.
24. **Missão oficial ao exterior** — viagem. A) Ir: Fama +, críticas sobre gastos. B) Não.
25. **Comissão especial de PEC** — tema estrutural. A) Participar: Fama +.

### 7.3 Base eleitoral e emendas

26. **Prefeito aliado pede emenda** — reduto. A) Emenda para posto de saúde: Base[cidade] +5. B) Emenda para asfalto: Base +3.
27. **Emenda para ONG suspeita** — pedido de aliado. A) Recusar: Rel[aliado] −. B) Aceitar: Esc latente +10.
28. **Inauguração com sua emenda** — obra. A) Ir à inauguração: Base +4.
29. **Prefeito de outro partido pede emenda** — cidade grande. A) Atender: Base nova +. B) Recusar.
30. **Emendas atrasadas** — Executivo segura. A) Ameaçar votar contra: Exe −, liberação 60%.
31. **Gabinete itinerante** — interior. A) Visitar 10 cidades: Base +, Ene −.
32. **Reduto ameaçado** — novo candidato forte. A) Mais emendas no reduto: Base +.
33. **Pedido de emprego** — eleitor. A) Indicar para cargo: Esc latente +2.
34. **Assistencialismo** — cestas. A) Recusar: Base −1. B) Fazer: risco no TSE.
35. **Rádio local oferece programa** — base. A) Aceitar: Base +3 (proibido em ano eleitoral).

### 7.4 Partido e bancada

36. **Líder da bancada quer você como vice-líder** — ascensão. A) Aceitar: Lid +, trabalho +.
37. **Bancada racha** — eleição da liderança. A) Escolher um lado: Lid ±.
38. **Expulsão do partido** — divergência. A) Recorrer: tempo. B) Sair na janela.
39. **Convite para ministério/secretaria** — Executivo. A) Aceitar: deixa o mandato, Fama +. B) Recusar.
40. **Federação define candidatos** — próxima eleição. A) Disputar vaga de senador: risco.
41. **Fundo partidário para sua reeleição** — direção. A) Agradar a direção: $ campanha +.
42. **Bancada temática** — evangélica, ruralista, da bala, sindical. A) Entrar: GI[tema] +, apoio em votações.
43. **Escolha da presidência da Casa** — disputa. A) Apoiar o vencedor: cargo. B) Apoiar o perdedor: geladeira.
44. **Partido quer que você seja candidato a prefeito** — municipal. A) Aceitar: campanha no meio do mandato.
45. **Colega de partido em escândalo** — bancada. A) Defender: Esc +2. B) Pedir afastamento: Lid −.

### 7.5 Ética e escândalos

46. **Uso de verba de gabinete** — combustível alto. A) Devolver: Cred +. B) Justificar: Esc +3.
47. **Assessor fantasma** — denúncia. ↪ arco Rachadinha no Gabinete.
48. **Viagem com dinheiro público** — jornal. A) Devolver: Esc +2.
49. **Imóvel funcional** — mordomia. A) Abrir mão: Apr +2.
50. **Auxílio-moradia** — tem casa própria. A) Recusar o benefício: Cred +3.
51. **Parente nomeado** — nepotismo cruzado. A) Exonerar: Cred +.
52. **Briga física no plenário** — tensão. A) Pedir desculpas: Cred neutro. B) Justificar: Rej +2.
53. **Comentário preconceituoso de colega** — plenário. A) Representar no Conselho de Ética: Cred +.
54. **Investigação no STF** — foro privilegiado. A) Abrir mão do foro: Cred +4.
55. **Vazamento de conversa com lobista** — ↪ arco O Lobista Simpático.

### 7.6 Mídia e redes do parlamentar

56. **Corte do discurso viraliza** — redes. A) Aproveitar a onda: Fama +3.
57. **Fake news sobre seu voto** — redes. A) Desmentir com vídeo: Cred +.
58. **Entrevista em programa político** — TV. A) Ir: Fama +.
59. **Lacrar ou legislar** — dilema. A) Investir em vídeos polêmicos: Fama ++, Cred −. B) Focar em projetos: Cred +.
60. **Cancelamento** — post antigo. A) Desculpas públicas.
61. **Live com ministro/secretário** — relação. A) Fazer: Exe +.
62. **Podcast político** — formato longo. A) Ir: Fama +.
63. **Ranking de parlamentares** — ONG. Notícia: Cred ±.
64. **Prêmio de melhor parlamentar** — imprensa. Cred +3.
65. **Jornal acusa absenteísmo** — faltas. A) Justificar.

### 7.7 Vereador

66. **Buraco na rua do seu reduto** — cobrança. A) Indicação ao prefeito: Base +1. B) Pressão pública: Exe[prefeito] −.
67. **Prefeito oferece secretaria** — base. A) Aceitar: deixa o mandato.
68. **Câmara vota plano diretor** — ↪ arco Plano Diretor.
69. **Projeto proíbe fogos** — pets. A) Apoiar: Sat[classe média] +.
70. **Nome de rua** — homenagem. A) Propor nome de ídolo local: Base +.
71. **Vereador mirim** — escola. A) Patrocinar: Cred +.
72. **Feira no bairro** — pedido. A) Indicar.
73. **Projeto sobre animais** — bem-estar. A) Apoiar: Sat +.
74. **CPI do transporte** — tarifa. A) Assinar: Fama +.
75. **Cassação de vereador colega** — escândalo. A) Votar pela cassação: Cred +.

### 7.8 Deputado estadual

76. **Governador pede voto na reforma da previdência estadual** — base. A) Apoiar: Exe +, GI[servidores] −.
77. **Emenda para hospital regional** — reduto. A) Destinar: Base +.
78. **CPI da Assembleia** — escândalo. A) Participar.
79. **Projeto de lei estadual seu** — pauta. A) Articular: Cap pessoal −.
80. **Pré-candidatura a federal** — ascensão. A) Lançar.

### 7.9 Deputado federal

81. **Voto na PEC** — 308 votos. A) Negociar com o governo: emendas +.
82. **Bancada do estado unida** — pauta estadual. A) Coordenar a bancada: Fama +.
83. **Comissão Mista de Orçamento** — poder. ↪ arco Emenda Pix.
84. **Votação de MP** — prazo. A) Votar.
85. **Candidato a presidente da Câmara** — ambição. A) Lançar candidatura: Fama ++, risco.

### 7.10 Senador

86. **Sabatina de ministro do STF** — indicação. A) Aprovar: Exe +. B) Rejeitar: raro, Fama ++.
87. **Voto decisivo no Senado** — reforma. ↪ cenário Senador Decisivo.
88. **Presidência do Senado** — ambição. A) Disputar.
89. **Impeachment no Senado** — julgamento. A) Votar.
90. **Suplente ambicioso** — vaga. A) Licença para cargo no Executivo: suplente assume.

### 7.11 Mais eventos legislativos

91. **Greve na frente da Casa** — servidores. A) Receber os grevistas: GI[servidores] +.
92. **Ocupação das galerias** — protesto. A) Dialogar.
93. **Projeto popular de iniciativa** — 1% do eleitorado. A) Relatar: Fama +.
94. **Lei com seu nome** — homenagem. Cred +.
95. **Indicação de conselheiro do TCE** — vaga. A) Indicar técnico.
96. **Jornada de 4 dias** — projeto. A) Apoiar: GI[sindicatos] +, GI[empresariado] −.
97. **Projeto de anistia a dívidas** — agro. A) Apoiar: GI[agro] +.
98. **Projeto de transparência** — dados abertos. A) Propor: Cred +.
99. **Votação de vetos acumulados** — sessão do Congresso. A) Votar.
100.  **Renúncia ao mandato** — escândalo ou nova missão. A) Renunciar: evita cassação, inelegibilidade pode valer.

## 8. Eventos de entressafra (fora do cargo)

Depois de perder ou terminar o mandato, o jogador escolhe uma ocupação. Cada bloco de 4 a 6 meses traz um evento da ocupação. Efeitos: fama, rede de contatos (Rede), dinheiro pessoal ($ pessoal), reputação, credibilidade, relação com o partido (Lid).

### 8.1 Ocupações

- **Secretário estadual ou municipal** (convite de aliado): mantém visibilidade; risco de escândalo da gestão.
- **Comentarista de TV/rádio**: fama +, mas cada opinião gera aliados e inimigos.
- **Presidente do partido** (estadual/nacional): controle do fundo e das candidaturas; brigas internas.
- **Consultor**: $ pessoal ++, risco de conflito de interesse.
- **ONG ou instituto**: credibilidade +, pouca fama.
- **Professor universitário**: credibilidade +, rede acadêmica.
- **Voltar à profissão**: neutro; fama cai mais rápido.
- **Escrever livro**: fama +, risco de revelações.
- **Influenciador**: fama ++ nas redes, credibilidade −.
- **Cargo internacional** (organismo multilateral): fama +, longe da base.

### 8.2 Eventos

101. **Convite para secretaria** — aliado eleito. A) Aceitar: visibilidade +, risco do governo. B) Recusar.
102. **Comentarista: opinião polêmica** — TV. A) Defender: Fama +3, Rej +2. B) Moderar: Cred +1.
103. **Comentarista: proposta de ser âncora** — audiência alta. A) Aceitar: Fama ++, deixa a política ativa por 2 anos.
104. **Presidente do partido: escolher candidatos** — eleição municipal. A) Candidatos competitivos: força do partido +. B) Aliados leais: Lid +.
105. **Presidente do partido: fusão proposta** — partido pequeno. A) Fundir: força +, identidade −.
106. **Presidente do partido: tesoureiro investigado** — ↪ arco Doação Generosa.
107. **Consultor: cliente polêmico** — empresa investigada. A) Aceitar: $ ++, Esc latente +15. B) Recusar.
108. **Consultor: palestra paga por banco** — imprensa. A) Fazer: $ +, críticas.
109. **ONG: doação internacional** — projeto. A) Aceitar: Cred +, críticas de interferência.
110. **ONG: projeto premiado** — reconhecimento. Cred +5.
111. **Professor: livro acadêmico** — publicação. Cred +3.
112. **Professor: alunos protestam contra você** — polarização. A) Debate aberto: Cred +.
113. **Profissão: caso de repercussão** — advogado/médico. A) Assumir: Fama +.
114. **Livro de memórias** — ↪ arco Livro de Memórias.
115. **Influenciador: patrocínio de apostas** — redes. A) Aceitar: $ ++, Cred −5.
116. **Influenciador: live com 1 milhão** — fama. Fama +5.
117. **Cargo internacional: crise global** — destaque. A) Liderar resposta: Fama +, Cred +.
118. **Convite para outro partido** — ascensão. A) Filiar-se na janela.
119. **Pesquisa espontânea** — você é lembrado. Notícia: Fama +2.
120. **Ex-rival te procura** — reconciliação. A) Aliança para a próxima eleição.
121. **Velho aliado precisa de ajuda** — campanha dele. A) Apoiar: Rede +.
122. **Processo antigo julgado** — Justiça. A) Absolvição: Cred +. B) Condenação: ↪ arco Ficha Suja.
123. **Viagem de estudos no exterior** — formação. A) Ir: atributos +, Fama −.
124. **Curso de oratória** — preparação. A) Fazer: Oratória +3.
125. **Saúde: check-up** — idade. A) Cuidar: evita evento de saúde.
126. **Família pede que você saia da política** — pessoal. A) Aposentar-se. B) Continuar.
127. **Filho quer se candidatar** — ↪ arco Filho na Política.
128. **Proposta de sociedade em empresa** — negócios. A) Aceitar: $ +, conflito futuro.
129. **Movimento social te convida** — causa. A) Liderar: Rede +, GI[movimento] +.
130. **Associação empresarial te convida** — causa. A) Presidir: GI[empresariado] +.
131. **Documentário sobre sua carreira** — streaming. A) Participar: Fama +.
132. **Convite para debate de pré-candidatos** — ano pré-eleitoral. A) Ir: Fama +.
133. **Pesquisa mostra você competitivo** — próxima eleição. Notícia: Lid +.
134. **Escândalo do antigo governo** — gestão passada. A) Defender sua gestão: Cred depende.
135. **Prêmio pela gestão passada** — reconhecimento. Cred +.
136. **Ataque de rival que ocupa o cargo** — rival. A) Responder pela imprensa.
137. **Programa de rádio próprio** — interior. A) Lançar: Base +.
138. **Fundação com seu nome** — legado. A) Criar: Cred +, $ pessoal −.
139. **Mentoria de jovens políticos** — pupilos. A) Mentorar: Rede +. ↪ arco O Pupilo.
140. **Ano sabático acaba** — escolha. A) Voltar à disputa. B) Mais um ano.
141. **Convite para ser vice** — eleição majoritária. A) Aceitar: chapa com aliado.
142. **Convite para disputar o Senado** — ascensão. A) Aceitar.
143. **Pedido para apoiar candidato** — eleição em curso. A) Apoiar o favorito: Rede +. B) Apoiar o aliado: Lid +.
144. **Pesquisa de imagem pessoal** — marketing. A) Reposicionar a imagem.
145. **Biografia elogiosa** — editora. A) Autorizar: Fama +.
146. **Polêmica antiga ressurge** — redes. ↪ arco O Vídeo Antigo.
147. **Convite para reality show** — fama. A) Aceitar: Fama +++, Cred −−.
148. **Convite para curso no exterior** — universidade estrangeira. A) Aceitar.
149. **Grupo de pressão oferece apoio** — próxima eleição. A) Aceitar: GI +.
150. **Retorno triunfal** — pesquisa favorável. A) Anunciar pré-candidatura.

## 9. Eventos regionais por estado

Seis por UF. Valem para qualquer cargo com jurisdição no estado (prefeitos das cidades do estado, governador, deputados e senadores eleitos por ele). Filtro sugerido no motor: `states: ['UF']`.

**AC** — 1. Cheia do rio Acre isola Rio Branco: abrigos e ponte aérea. 2. Fronteira com Peru e Bolívia: rota de imigrantes haitianos e africanos. 3. Rodovia do Pacífico: corredor de exportação para a Ásia. 4. Seringueiros cobram preço mínimo da borracha. 5. Desmatamento na BR-364: fiscalização × produtores. 6. Fumaça de queimadas fecha o aeroporto.

**AL** — 1. Bairros afundam em Maceió por mineração de sal-gema. 2. Lagoa Mundaú poluída: pescadores sem renda. 3. Usinas de açúcar fecham no interior. 4. Turismo em Maragogi bate recorde e falta saneamento. 5. Violência no sertão alagoano. 6. Seca no Sertão do São Francisco.

**AM** — 1. Seca histórica dos rios isola municípios. 2. Zona Franca ameaçada pela reforma tributária. 3. Garimpo ilegal no Rio Negro. 4. Boto e peixes morrem com o calor da água. 5. Festival de Parintins: estrutura e verba. 6. Facções disputam rotas do tráfico nos rios.

**AP** — 1. Petróleo na margem equatorial: licença em debate. 2. Apagão de semanas por falha em subestação. 3. Ponte para a Guiana Francesa: comércio e imigração. 4. Mineração de manganês desativada deixa passivo. 5. Ressaca e erosão no litoral do Amapá. 6. Sem ligação rodoviária com o resto do país.

**BA** — 1. Operações policiais letais em Salvador. 2. Oeste baiano: disputa por água entre agro e comunidades. 3. Carnaval de Salvador: segurança e trios. 4. Cacau volta a valer ouro no sul. 5. Seca no sertão do São Francisco. 6. Turismo no litoral norte e especulação imobiliária.

**CE** — 1. Hub de hidrogênio verde no Pecém. 2. Facções controlam bairros e presídios. 3. Transposição chega ao Castanhão. 4. Energia eólica no litoral muda paisagem. 5. Romaria em Juazeiro do Norte. 6. Seca prolongada no sertão central.

**DF** — 1. Greve de servidores distritais. 2. Entorno pobre pressiona serviços. 3. Seca e incêndios no cerrado. 4. Manifestações na Esplanada. 5. Metrô sem expansão. 6. Grilagem de terras públicas.

**ES** — 1. Lama de mineração no Rio Doce: acordo de reparação. 2. Portos de Vitória e minério de ferro. 3. Petróleo e gás no litoral sul. 4. Café conilon: preço internacional dispara. 5. Mármore e granito em Cachoeiro. 6. Chuvas e deslizamentos na serra capixaba.

**GO** — 1. Segurança pública dura vira vitrine. 2. Soja e milho batem recordes. 3. Polo farmacêutico de Anápolis. 4. Crise hídrica em Goiânia. 5. Festa do Divino em Pirenópolis. 6. Conflito por terra na fronteira agrícola.

**MA** — 1. Base de Alcântara: acordo internacional. 2. Pobreza extrema no interior. 3. Porto do Itaqui exporta minério e grãos. 4. Desmatamento na Amazônia maranhense. 5. Lençóis Maranhenses: turismo e preservação. 6. Conflitos com quilombolas por terra.

**MG** — 1. Barragens de mineração em risco. 2. Dívida com a União estrangula o estado. 3. Café sul-mineiro e geada. 4. Seca no norte de Minas. 5. Patrimônio histórico de Ouro Preto em risco. 6. 853 municípios disputam verbas.

**MS** — 1. Pantanal em chamas. 2. Conflito indígena na região de Dourados. 3. Fronteira seca com o Paraguai: contrabando. 4. Celulose transforma Três Lagoas. 5. Rota bioceânica até o Chile. 6. Pecuária e certificação ambiental.

**MT** — 1. Ferrovia da soja chega ao norte. 2. Moratória da soja em debate. 3. Queimadas no Pantanal e na Amazônia. 4. BR-163 esburacada na safra. 5. Terras indígenas e garimpo. 6. Calor recorde em Cuiabá.

**PA** — 1. Garimpo em terra indígena. 2. Legado da conferência do clima em Belém. 3. Mineração em Carajás. 4. Divisão do Pará em plebiscito. 5. Hidrelétricas e ribeirinhos. 6. Círio de Nazaré: estrutura e fé.

**PB** — 1. Transposição do São Francisco. 2. São João de Campina Grande. 3. Polo de tecnologia em Campina. 4. Seca no Cariri. 5. Praias de João Pessoa e especulação. 6. Energia solar no sertão.

**PE** — 1. Chuvas matam na região metropolitana do Recife. 2. Porto de Suape e refinaria. 3. Fruticultura irrigada em Petrolina. 4. São João de Caruaru. 5. Carnaval de Olinda e Recife. 6. Violência em Jaboatão.

**PI** — 1. Energia eólica e solar transformam o sertão. 2. Calor extremo em Teresina. 3. Cerrado piauiense vira fronteira da soja. 4. Pobreza rural. 5. Delta do Parnaíba: turismo. 6. Seca.

**PR** — 1. Pedágios novos e protestos. 2. Itaipu e royalties. 3. Geada destrói safra. 4. Ferrovia Paranaguá–oeste. 5. Tríplice fronteira: contrabando. 6. Professores em greve.

**RJ** — 1. Milícias e tráfico. 2. Regime de recuperação fiscal. 3. Royalties do petróleo. 4. Deslizamentos na serra. 5. Carnaval do Rio. 6. Baía de Guanabara poluída.

**RN** — 1. Ataques de facção a ônibus. 2. Energia eólica no litoral. 3. Sal e petróleo em Mossoró. 4. Turismo em Natal e Pipa. 5. Seca no Seridó. 6. Falta de água em Natal.

**RO** — 1. BR-364 e desmatamento. 2. Hidrelétricas do Madeira. 3. Garimpo no rio Madeira. 4. Queimadas. 5. Agro e terras indígenas. 6. Imigração boliviana.

**RR** — 1. Imigração venezuelana. 2. Garimpo na terra Yanomami. 3. Apagão: estado isolado do sistema elétrico. 4. Linhão de Tucuruí em debate. 5. Fronteira com Guiana. 6. Agro avança no lavrado.

**RS** — 1. Enchentes no Vale do Taquari e no Guaíba. 2. Dívida com a União. 3. Estiagem destrói a safra. 4. Indústria metalmecânica da serra. 5. Tabaco em Santa Cruz. 6. Fronteira com Uruguai e Argentina.

**SC** — 1. Enchentes em Blumenau e no Vale do Itajaí. 2. Pleno emprego e falta de mão de obra. 3. Porto de Itajaí. 4. Agroindústria do oeste. 5. Oktoberfest. 6. Turismo em Florianópolis e Balneário.

**SE** — 1. Gás em águas profundas. 2. Seca no sertão sergipano. 3. Rio São Francisco perde força na foz. 4. Turismo em Aracaju. 5. Violência urbana. 6. Citricultura no sul do estado.

**SP** — 1. Crise hídrica na Cantareira. 2. Privatização do saneamento. 3. Indústria deixa o ABC. 4. Agro do interior: cana e laranja. 5. Porto de Santos. 6. Cracolândia no centro da capital.

**TO** — 1. Matopiba: fronteira agrícola. 2. Crise hídrica no rio Tocantins. 3. Ilha do Bananal: indígenas e turismo. 4. Ferrovia Norte-Sul. 5. Pecuária em Araguaína. 6. Palmas planejada cresce desordenada.

## 10. Ganchos por cidade jogável

Um evento próprio por cidade (filtro `cities: ['código IBGE']`). Formato: **Cidade (UF)** — perfil · evento · opções.

### Norte

1. **Rio Branco (AC)** — capital ribeirinha · Cheia do rio Acre invade bairros · A) Abrigos e auxílio: $ −, Apr +. B) Remoção definitiva das margens: conflito.
2. **Manaus (AM)** — metrópole amazônica, Zona Franca · Fábrica de motos ameaça sair · A) Incentivo municipal: $ −. B) Campanha em Brasília: Fama +.
3. **Macapá (AP)** — capital na linha do Equador · Apagão de dias · A) Geradores emergenciais: $ −. B) Cobrar a União.
4. **Boa Vista (RR)** — fronteira com Venezuela · Abrigos de imigrantes lotados · A) Interiorização com a União. B) Pressionar por fechamento: inconstitucional.
5. **Palmas (TO)** — capital planejada · Bairros afastados sem ônibus · A) Novas linhas: $ −.
6. **Araguaína (TO)** — capital do boi · Embargo à carne · A) Missão comercial. B) Auxílio aos trabalhadores.
7. **Porto Velho (RO)** — rio Madeira · Garimpo ilegal no rio · A) Operação com a PF: conflito com garimpeiros.
8. **Ji-Paraná (RO)** — interior de Rondônia · Serrarias fechadas pela fiscalização · A) Requalificação: Sat +.
9. **Cacoal (RO)** — café robusta · Cooperativa de café quer selo de origem · A) Apoiar: GI[agro] +.
10. **Belém (PA)** — metrópole, Círio · Círio com 2 milhões de pessoas · A) Estrutura reforçada: $ −, Apr +.
11. **Marabá (PA)** — Carajás · Conflito agrário com mortes · A) Mediação com o Incra: Cred +.
12. **Santarém (PA)** — porto graneleiro · Rio fica marrom por garimpo · A) Denunciar: Fama +.
13. **Castanhal (PA)** — entroncamento · Feira do açaí · A) Selo de qualidade do açaí: comércio +.

### Nordeste

14. **São Luís (MA)** — capital, porto do Itaqui · Centro histórico desaba · A) Restauro com a União: $ −.
15. **Imperatriz (MA)** — celulose · Fábrica quer captar mais água do Tocantins · A) Autorizar: empregos +, GI[pescadores] −.
16. **Teresina (PI)** — calor extremo · Onda de calor de 42 °C · A) Arborização emergencial: Apr +.
17. **Fortaleza (CE)** — metrópole, praias · Ataques de facção a ônibus · A) Pedir Força Nacional.
18. **Juazeiro do Norte (CE)** — romaria · Romaria de novembro · A) Estrutura para 2 milhões de romeiros: $ −.
19. **Sobral (CE)** — referência em educação · Prêmio nacional de alfabetização · Cred +4.
20. **Natal (RN)** — turismo · Falta de água na alta temporada · A) Caminhões-pipa: $ −.
21. **Mossoró (RN)** — sal e petróleo · Estatal vende campos maduros · A) Atrair o comprador: empregos +.
22. **João Pessoa (PB)** — capital · Prédios altos na orla · A) Manter o limite de altura: Sat[moradores] +.
23. **Campina Grande (PB)** — São João, tecnologia · Maior São João do mundo · A) Festa grande: Apr +4, $ −.
24. **Recife (PE)** — metrópole, chuvas · Morros desabam com chuva · ↪ arco O Morro.
25. **Jaboatão dos Guararapes (PE)** — região metropolitana · Erosão destrói orla de Piedade · A) Engorda da praia: $ −−.
26. **Caruaru (PE)** — feira e São João · Feira da Sulanca perde para o online · A) Plataforma digital da feira: comércio +.
27. **Petrolina (PE)** — fruticultura · Tarifa europeia sobre uva · A) Novos mercados: GI[agro] +.
28. **Garanhuns (PE)** — festival de inverno · Festival com artistas caros · A) Festival enxuto: Apr dividido.
29. **Maceió (AL)** — capital · Bairros afundam por mineração · A) Cobrar a mineradora: Fama +.
30. **Arapiraca (AL)** — agreste · Fábrica de calçados chega · A) Incentivo: empregos +.
31. **Aracaju (SE)** — capital · Orla em reforma atrasada · A) Aditivo: $ −.
32. **Salvador (BA)** — metrópole, carnaval · Carnaval sem patrocinador · ↪ cenário Prefeito do Carnaval.
33. **Feira de Santana (BA)** — entroncamento · Greve de caminhoneiros trava a cidade · A) Mediação.
34. **Vitória da Conquista (BA)** — planalto, café · Geada no café · A) Crédito emergencial: GI[agro] +.
35. **Itabuna (BA)** — cacau · Preço do cacau dispara · Notícia: economia local +.
36. **Ilhéus (BA)** — turismo literário · Porto Sul em obras · A) Apoiar: empregos +, GI[ambientalistas] −.
37. **Barreiras (BA)** — oeste baiano · Disputa por outorga de água · A) Mediar: conflito −.
38. **Eunápolis (BA)** — eucalipto · Celulose amplia plantio · A) Zoneamento: conflito com agricultores.

### Centro-Oeste

39. **Brasília (DF)** — capital federal · Greve de servidores · A) Negociar: $ −.
40. **Goiânia (GO)** — metrópole · Crise hídrica · A) Rodízio: Apr −.
41. **Aparecida de Goiânia (GO)** — região metropolitana · Cresce sem saneamento · A) Obra de esgoto: Obra grande.
42. **Anápolis (GO)** — polo farmacêutico · Falta de remédios no país · A) Incentivo à produção local: Fama +.
43. **Campo Grande (MS)** — capital · Rota bioceânica passa pela cidade · A) Plataforma logística: investimento +.
44. **Dourados (MS)** — agro e fronteira · Retomada de terra indígena · A) Mediação: Cred +.
45. **Cuiabá (MT)** — calor e agro · Calor de 44 °C · A) Horário escolar ajustado.
46. **Rondonópolis (MT)** — terminal ferroviário · Ferrovia estende linha · A) Disputar o novo terminal.
47. **Sinop (MT)** — BR-163 · Queimadas fecham o aeroporto · A) Brigadas municipais: $ −.

### Sudeste

48. **Belo Horizonte (MG)** — metrópole · Lagoa da Pampulha poluída · A) Despoluição: $ −−.
49. **Contagem (MG)** — industrial · Galpões vazios · A) Polo logístico: empregos +.
50. **Uberlândia (MG)** — logística · Atacadistas ameaçam ir para GO · A) Incentivo: $ −.
51. **Juiz de Fora (MG)** — universidade · Universidade federal em greve · A) Apoiar: Sat[estudantes] +.
52. **Montes Claros (MG)** — norte de Minas · Seca e falta de água · A) Adutora: Obra.
53. **Ipatinga (MG)** — Vale do Aço · Alto-forno desligado · A) Plano de diversificação.
54. **Uberaba (MG)** — zebu · Febre aftosa na região · A) Barreira sanitária: GI[agro] +.
55. **Sete Lagoas (MG)** — industrial · Fábrica de cerveja amplia · A) Água para a fábrica: conflito.
56. **Pouso Alegre (MG)** — sul de Minas · Polo industrial cresce · A) Mais escolas técnicas.
57. **Poços de Caldas (MG)** — termas · Turismo cai · A) Festival de inverno: turismo +.
58. **Governador Valadares (MG)** — emigração · Deportações dos EUA · A) Programa de acolhida: Sat +.
59. **Divinópolis (MG)** — confecções · Concorrência de importados · A) Feira de moda: comércio +.
60. **Varginha (MG)** — café · Bolsa de café em alta · Notícia.
61. **Teófilo Otoni (MG)** — pedras preciosas · Feira internacional de pedras · A) Apoiar: turismo +.
62. **Vitória (ES)** — capital, porto · Pó preto do minério · A) Fiscalizar a mineradora: Sat +.
63. **Serra (ES)** — industrial · Crescimento desordenado · A) Plano diretor: conflito.
64. **Cachoeiro de Itapemirim (ES)** — mármore · Acidente em pedreira · A) Fiscalização: Cred +.
65. **Rio de Janeiro (RJ)** — metrópole · Milícia cobra taxa em bairro · ↪ arco Milícia no Bairro.
66. **São Gonçalo (RJ)** — região metropolitana · Sem hospital municipal · A) Construir: Obra grande.
67. **Duque de Caxias (RJ)** — refinaria · Vazamento na refinaria · A) Multa: Cred +.
68. **Nova Iguaçu (RJ)** — Baixada · Enchentes recorrentes · A) Piscinões: Obra.
69. **Campos dos Goytacazes (RJ)** — royalties · Royalties caem · ↪ cenário Prefeitura Quebrada.
70. **Macaé (RJ)** — petróleo · Plataforma desativada · ↪ cenário Royalties Zero.
71. **Volta Redonda (RJ)** — aço · Usina vendida a estrangeiros · A) Garantias de emprego.
72. **Petrópolis (RJ)** — serra · Tempestade de fevereiro · ↪ arco O Morro.
73. **Cabo Frio (RJ)** — turismo · Esgoto nas praias · A) Saneamento: Obra.
74. **São Paulo (SP)** — megalópole · Cracolândia · ↪ arco Cracolândia.
75. **Guarulhos (SP)** — aeroporto · Apagão no aeroporto · A) Cobrar a concessionária.
76. **Campinas (SP)** — tecnologia · Viracopos expande · A) Desapropriações: conflito.
77. **São Bernardo do Campo (SP)** — ABC · Montadora fecha · ↪ arco A Fábrica Vai Embora.
78. **Santo André (SP)** — ABC · Indústria química sai · A) Requalificação de área contaminada.
79. **Osasco (SP)** — serviços · Bancos fecham agências · A) Inclusão digital.
80. **Ribeirão Preto (SP)** — agro · Queimadas em canaviais · A) Fiscalização: GI[agro] −.
81. **Sorocaba (SP)** — indústria · Montadora suspende turno · A) Negociação tripartite.
82. **São José dos Campos (SP)** — aeroespacial · Contrato de exportação de aviões · Notícia: empregos +.
83. **São José do Rio Preto (SP)** — interior rico · Dengue explode · ↪ arco Surto de Dengue.
84. **Bauru (SP)** — centro do estado · Rodízio de água · A) Poços emergenciais.
85. **Santos (SP)** — porto · Navio encalha no canal · A) Dragagem emergencial.
86. **Jundiaí (SP)** — Serra do Japi · Condomínios na serra · A) Proteger: Sat[ambientalistas] +.
87. **Piracicaba (SP)** — rio e cana · Mortandade de peixes · A) Multar indústrias.
88. **Americana (SP)** — têxtil · Têxteis fecham · A) Polo de moda.
89. **Limeira (SP)** — joias folheadas · Trabalho informal nas folheações · A) Formalização: Sat +.
90. **Franca (SP)** — calçados · Importados chineses · A) Pleitear tarifa.
91. **Araraquara (SP)** — laranja · Greening nos pomares · A) Programa fitossanitário.
92. **São Carlos (SP)** — universidades · Parque tecnológico · A) Criar: GI[tecnologia] +.
93. **Presidente Prudente (SP)** — Pontal · Ocupação de fazenda · A) Mediação.
94. **Marília (SP)** — alimentos · Recall de fábrica · A) Fiscalização.
95. **Araçatuba (SP)** — boi e cana · Usina de etanol amplia · Notícia: empregos +.
96. **Guaratinguetá (SP)** — Vale do Paraíba · Turismo religioso (Aparecida vizinha) · A) Rota da fé.
97. **Catanduva (SP)** — cana · Queimada perto de escola · A) Fiscalização.
98. **Barretos (SP)** — festa do peão · Polêmica sobre rodeios · A) Manter a festa: GI[agro] +.
99. **Jaú (SP)** — calçados femininos · Polo de calçados perde mercado · A) Feira de negócios.

### Sul

100. **Curitiba (PR)** — capital modelo · BRT sobrecarregado · A) Metrô: Obra grande.
101. **Londrina (PR)** — norte do PR · Escândalo na Câmara · ↪ cenário Norte Pé-Vermelho.
102. **Maringá (PR)** — planejada · Aeroporto perde voos · A) Subsídio a rotas.
103. **Cascavel (PR)** — agro · Show Rural bate recorde · Notícia: GI[agro] +.
104. **Ponta Grossa (PR)** — campos gerais · Acidente ferroviário · A) Exigir segurança da concessionária.
105. **Foz do Iguaçu (PR)** — três fronteiras · Crise no Paraguai esvazia o comércio · A) Turismo de compras.
106. **Florianópolis (SC)** — ilha · Trânsito na ponte · A) Nova ligação: Obra grande.
107. **Joinville (SC)** — indústria · Greve de metalúrgicos · A) Mediação.
108. **Blumenau (SC)** — Oktoberfest · Deslizamento na festa · ↪ cenário Chope e Enchente.
109. **Itajaí (SC)** — porto · Concessão do porto · ↪ cenário Porto Vivo.
110. **Chapecó (SC)** — agroindústria · Gripe aviária · A) Barreira sanitária.
111. **Criciúma (SC)** — carvão · Térmica desligada · A) Transição energética justa.
112. **Brusque (SC)** — têxtil · Falta de mão de obra · A) Atrair migrantes.
113. **Tubarão (SC)** — sul catarinense · Enchente do rio Tubarão · A) Diques: Obra.
114. **Lages (SC)** — serra · Nevasca isola distritos · A) Operação de inverno.
115. **Caçador (SC)** — madeira · Madeireiras fecham · A) Requalificação.
116. **Joaçaba (SC)** — meio-oeste · Carnaval de salão famoso · A) Apoiar: turismo +.
117. **Porto Alegre (RS)** — capital · Guaíba transborda · ↪ arco Enchente.
118. **Caxias do Sul (RS)** — serra, indústria · Demissões nas metalúrgicas · ↪ cenário Serra em Movimento.
119. **Pelotas (RS)** — doces, universidade · Porto ocioso · A) Revitalização portuária.
120. **Santa Maria (RS)** — universidade, quartéis · Greve na universidade federal · A) Apoiar: Sat[estudantes] +.
121. **Passo Fundo (RS)** — polo médico · Hospital regional lotado · ↪ cenário Capital do Planalto.
122. **Santa Cruz do Sul (RS)** — tabaco · Tratado antitabagismo · ↪ cenário Folha de Fumo.
123. **Lajeado (RS)** — Vale do Taquari · Nova cheia · ↪ cenário Depois da Água.

## 11. Cartas

### 11.1 Cartas da reunião semanal (campanha)

Formato: **Carta** — quando aparece · efeito · risco. Hoje existem 12 tipos; estas são novas.

1. **Caravana do interior** — Pres baixa no interior · Pres +20 em 3 regiões, Ene −20 · —
2. **Dia da periferia** — Mom[trabalhadores] baixo · Mom[trabalhadores] +6, Mom[desempregados] +6 · gafe 10%.
3. **Café com a classe média** — Mom[classe média] baixo · Mom +6 · Rej[pobres] +0,5.
4. **Agenda da juventude** — Mom[estudantes] baixo · Mom +8 · Cred −1 se forçado.
5. **Entrevista coletiva** — Con baixo · Con +4 · pergunta hostil 40%.
6. **Sabatina em jornal** — Cred ≥ 50 · Cred +3 · nota ruim 25%.
7. **Mutirão de propostas** — 0 propostas · lança 2 propostas · promessas +2.
8. **Plano de governo detalhado** — semana 3 · Cred +5 · checagem aponta erro 20%.
9. **Ataque ao líder** — 2º lugar · líder Rej +4 · sua Rej +2.
10. **Defesa da honra** — você foi atacado · sua Rej −2 · —
11. **Dia sem campanha** — Ene < 30 · Ene +40 · perde momentum.
12. **Comício monstro** — semana final · Ent +10, Con +3 · $ −−.
13. **Bandeiraço nos semáforos** — Mil alta · Con +2 em todas as regiões · multa 15%.
14. **Live com especialistas** — tema técnico · Cred +3 · baixa audiência.
15. **Visita a hospital** — Foco[saúde] · Mom[saúde] +5 · acusação de uso político 15%.
16. **Visita a escola** — Foco[educação] · Mom[pais] +4 · —
17. **Tour pelas obras paradas** — oposição · Foco[infraestrutura] +10 · —
18. **Inauguração de comitê** — região nova · Pres +10 · $ −.
19. **Pesquisa qualitativa** — estatístico · revela 2 temas ocultos · $ −.
20. **Grupo focal com indecisos** — indecisos ≥ 25% · Mom[indecisos] +5 · $ −.
21. **Peça de TV emocional** — TV contratada · Mom +5 · Cred −1 se exagerada.
22. **Peça de TV técnica** — TV · Cred +3 · baixo impacto.
23. **Vídeo de bastidores** — redes · Con +3 · —
24. **Conversa com caminhoneiros** — Foco[transporte] · GI[transporte] +8 · —
25. **Conversa com o agro** — interior agrícola · GI[agro] +8 · GI[ambientalistas] −3.
26. **Conversa com o comércio** — cidade média · GI[comércio] +8 · —
27. **Conversa com a indústria** — polo industrial · GI[indústria] +8 · —
28. **Conversa com sindicatos** — operários · GI[sindicatos] +8 · GI[empresariado] −3.
29. **Encontro com religiosos** — eleitorado religioso · Mom[religiosos] +6 · Mom[jovens] −2.
30. **Encontro com movimentos sociais** — capital · GI[movimentos] +8 · GI[empresariado] −3.
31. **Pacto pela segurança** — Foco[segurança] · Mom[segurança] +6 · —
32. **Carta aos aposentados** — idosos · Mom[aposentados] +6 · promessa cara.
33. **Carta às mulheres** — eleitoras · Mom[mulheres] +5 · —
34. **Encontro com prefeitos** — campanha estadual · Pres +5 em 3 regiões · —
35. **Apoio de ex-adversário** — eliminado na prévia · Uni +10 · —
36. **Anúncio de vice** — majoritária · Con +3, Mom do vice · vice com problema 15%.
37. **Anúncio de equipe econômica** — presidente · Cred +5 · —
38. **Debate de propostas com o rival** — rivais próximos · ambos Cred +2 · —
39. **Desafio público** — você atrás · rival forçado a debater · Rej +1.
40. **Campanha do voto útil** — 3º lugar · Mom +5 · Rej[rival] +2.
41. **Campanha contra a abstenção** — eleitorado jovem · comparecimento +3% · —
42. **Dossiê do rival** — Esc do rival latente · rival Rej +6 · sua Rej +3, risco de processo.
43. **Retratação** — gafe recente · Rej −2 · Ent −3.
44. **Humor contra o ataque** — atacado · Rej −1, Con +2 · —
45. **Ato com artistas** — capital · Con +4 · polarização.
46. **Ato com atletas** — esporte popular · Con +3 · —
47. **Caminhada em feira livre** — cidade média · Mom[comerciantes] +4 · —
48. **Rodada de rádios** — interior · Pres +6 nas cidades do interior · —
49. **Jornal de bairro** — vereador · Pres +8 no reduto · —
50. **Panfletagem em massa** — Mil alta · Con +2 · lixo nas ruas (Rej +0,5).
51. **Influenciadores regionais** — redes · Mom[região] +4 · —
52. **Disparo de mensagens** — redes · Con +3 · risco no TSE 25%.
53. **Proposta-bomba** — atrás · Mom +6 · Cred −3 se inviável.
54. **Recuo estratégico** — proposta impopular · Rej −2 · Cred −2.
55. **Escola de militância** — Mil baixa · Mil +15% · Ene −10.
56. **Comitês de bairro** — Mil média · Pres +6 · $ −.
57. **Mesa de negociação com o partido** — Uni baixa · Uni +10 · promessa ao partido.
58. **Cobrança do fundo partidário** — caixa baixo · $ + · Lid −5.
59. **Live de arrecadação** — Ent alta · $ + · —
60. **Leilão beneficente** — caixa baixo · $ + · —
61. **Campanha no litoral** — feriado · Pres +5 · —
62. **Campanha nas universidades** — estudantes · Mom +6 · vaia 20%.
63. **Campanha nas igrejas** — religiosos · Mom +5 · TSE 10%.
64. **Campanha nas fábricas** — operários · Mom +6 · —
65. **Campanha nas fazendas** — agricultores · Mom +6 · —
66. **Campanha nos hospitais** — saúde · Mom +5 · —
67. **Campanha nos quartéis (proibido)** — aparece como armadilha · TSE multa · —
68. **Debate de jovens** — juventude · Mom[jovens] +5 · —
69. **Entrevista para TV estrangeira** — presidente · Fama +3 · polarização.
70. **Visita a outro estado** — presidente · Pres +10 no estado · —
71. **Rota do Nordeste** — presidente · Pres +5 em 5 estados · Ene −30.
72. **Rota do Sul** — presidente · Pres +5 em 3 estados · Ene −20.
73. **Rota do Norte** — presidente · Pres +5 em 4 estados · Ene −30.
74. **Rota do Sudeste** — presidente · Pres +5 em 4 estados · Ene −20.
75. **Rota do Centro-Oeste** — presidente · Pres +5 em 4 UFs · Ene −20.
76. **Apoio de governador** — campanha nacional · Pres +8 no estado · —
77. **Apoio de prefeito** — campanha estadual · Pres +8 na cidade · —
78. **Apoio de pastor/padre** — religiosos · Mom +5 · TSE 10%.
79. **Apoio de sindicato** — operários · Mom +5 · GI[empresariado] −2.
80. **Apoio de associação comercial** — comerciantes · Mom +5 · —
81. **Apoio de entidade do agro** — agricultores · Mom +5 · GI[ambientalistas] −2.
82. **Apoio de entidade ambiental** — jovens · Mom +5 · GI[agro] −2.
83. **Manifesto de intelectuais** — classe média · Cred +3 · —
84. **Manifesto de empresários** — empresários · GI +5 · Mom[trabalhadores] −1.
85. **Carta de economistas** — Cred · Cred +4 · —
86. **Treino intensivo de debate** — debate em 3 dias · Prep +30 · Ene −15.
87. **Simulação de debate com sósia** — debate · Prep +20 · —
88. **Pesquisa de rejeição** — Rej alta · revela causa · $ −.
89. **Reposicionamento de imagem** — Rej alta · Rej −2 · Cred −1.
90. **Dia de silêncio** — escândalo · Esc esfria mais rápido · Con −1.
91. **Agenda internacional** — presidente · Cred +2 · "abandonou o Brasil" 20%.
92. **Visita a tragédia** — desastre recente · Cred +3 · uso político 20%.
93. **Ato de encerramento** — última semana · Ent +8 · —
94. **Comício surpresa** — reduto do rival · Mom +3 · confronto 15%.
95. **Apoio de celebridade nacional** — fama · Con +5 · polarização.
96. **Mobilização da diáspora** — presidente · votos no exterior +.
97. **Campanha em libras e acessível** — inclusão · Cred +2 · —
98. **Campanha em línguas indígenas** — Norte · Mom[indígenas] +6 · —
99. **Jingle novo** — Con baixo · Con +3 · plágio 10%.
100. **Virada de chave** — campanha estagnada · troca toda a estratégia · reseta momentum.

### 11.2 Cartas do gabinete mensal (governo)

Formato: **Carta** — quando aparece · efeito · risco.

1. **Pacote de obras de bairro** — Apr < 50 · Apr +3, $ −−, Obra · TCE 10%.
2. **Choque de gestão** — eficiência baixa · eficiência +, Sat[servidores] −.
3. **Corte de cargos comissionados** — caixa baixo · $ +, base −.
4. **Concurso público** — serviços ruins · eficiência futura +, $ futuro −.
5. **Reajuste para servidores** — greve iminente · GI[servidores] +, $ −−.
6. **Mutirão da saúde** — fila longa · Sat[saúde] +, $ −.
7. **Mutirão da educação** — notas baixas · Sat[pais] +, $ −.
8. **Força-tarefa de segurança** — violência alta · Sat[segurança] +, $ −.
9. **Programa de renda** — desemprego alto · Sat[pobres] +, $ −−.
10. **Isenção para pequenos negócios** — comércio fraco · GI[comércio] +, receita −.
11. **Atração de indústria** — desemprego · empregos futuros +, receita −.
12. **Parceria público-privada** — investimento baixo · Obra +, polêmica.
13. **Privatização** — caixa baixo · $ ++, GI[sindicatos] −.
14. **Estatização/retomada** — serviço ruim concedido · Sat +, $ −−.
15. **Reforma administrativa** — máquina inchada · $ futuro +, Sat[servidores] −.
16. **Pacote anticorrupção** — Esc alto · Cred +5, base −.
17. **Portal da transparência** — Cred baixa · Cred +3.
18. **Ouvidoria itinerante** — Apr baixa · Apr +1.
19. **Reunião com a oposição** — Câmara hostil · relação +, base reclama.
20. **Cargo para aliado** — votação importante · base +, eficiência −.
21. **Emendas para a base** — votação importante · base +, $ −.
22. **Ameaça de veto** — projeto ruim da Câmara · Cap +, relação −.
23. **Lei de iniciativa popular** — tema popular · Apr +2.
24. **Plebiscito** — tema dividido · ↪ arco Plebiscito.
25. **Campanha publicitária do governo** — Apr baixa · Apr +2, $ −, críticas.
26. **Pronunciamento em rede** — crise · Apr ±3 (depende de Oratória).
27. **Entrevista exclusiva** — boato · Cred +2.
28. **Ataque à imprensa** — imprensa hostil · Ent +, Cred −3.
29. **Viagem ao interior** — Pres baixa · Apr[interior] +3.
30. **Viagem internacional** — investimento · Fama +, "fugiu da crise" 20%.
31. **Recebe movimento social** — protesto · GI[movimentos] +.
32. **Recebe empresários** — investimento · GI[empresariado] +.
33. **Recebe sindicatos** — greve · GI[sindicatos] +.
34. **Recebe o agro** — safra · GI[agro] +.
35. **Recebe igrejas** — costumes · Sat[religiosos] +.
36. **Recebe estudantes** — protesto estudantil · Sat[estudantes] +.
37. **Recebe aposentados** — previdência · Sat[aposentados] +.
38. **Recebe policiais** — segurança · GI[segurança] +.
39. **Demissão de secretário** — escândalo · Esc −5, base −.
40. **Troca de secretariado** — crise · reset da equipe, Est −.
41. **Nomeação técnica** — área ruim · eficiência +, base −.
42. **Nomeação política** — votação · base +, eficiência −.
43. **Pedido de ajuda federal** — desastre · $ +, Rel importa.
44. **Pedido de ajuda estadual** — prefeitura · $ +, Rel importa.
45. **Consórcio com vizinhos** — serviço caro · $ +, Fama +.
46. **Empréstimo** — caixa vazio · $ ++, dívida +.
47. **Renegociação de dívida** — dívida alta · $ futuro +.
48. **Aumento de imposto** — déficit · $ +, Apr −4.
49. **Redução de imposto** — superávit · Apr +3, $ −.
50. **Refis** — devedores · $ + curto prazo.
51. **Contingenciamento** — arrecadação cai · $ +, serviços −.
52. **Fundo de reserva** — superávit · proteção a choques.
53. **Plano de longo prazo** — 1º ano · legado +, Apr curto prazo neutro.
54. **Inauguração** — obra pronta · Apr +2.
55. **Lançamento de obra** — pedra fundamental · Apr +1, $ −.
56. **Obra paralisada** — empresa quebrou · ↪ arco Calote do Fornecedor.
57. **Auditoria interna** — suspeita · Esc latente revelado (cedo é melhor).
58. **Política de dados abertos** — tecnologia · Cred +, GI[tecnologia] +.
59. **Governo digital** — filas · Sat +, $ −.
60. **Plano de segurança** — violência · Sat[segurança] +.
61. **Plano de saúde mental** — dados · Sat[saúde] +.
62. **Plano de habitação** — déficit · Sat[pobres] +, $ −−.
63. **Plano de mobilidade** — trânsito · Sat +, $ −−.
64. **Plano climático** — desastres · legado, $ −.
65. **Plano de turismo** — economia · comércio +.
66. **Plano cultural** — juventude · Sat +.
67. **Plano esportivo** — juventude · Sat[jovens] +.
68. **Plano de primeira infância** — educação · legado.
69. **Plano para idosos** — envelhecimento · Sat[aposentados] +.
70. **Plano para mulheres** — violência · Cred +.
71. **Plano para igualdade racial** — desigualdade · Cred +, polarização.
72. **Plano para pessoas com deficiência** — acessibilidade · Cred +.
73. **Plano para agricultura familiar** — interior · Sat[agricultores] +.
74. **Plano de inovação** — tecnologia · GI[tecnologia] +.
75. **Plano de exportação** — economia · GI[indústria] +.
76. **Plano de emprego jovem** — desemprego · Sat[jovens] +.
77. **Plano de qualificação** — desemprego · Sat[desempregados] +.
78. **Plano de crédito popular** — juros · Sat[comerciantes] +.
79. **Plano de saneamento** — esgoto · legado, $ −−.
80. **Plano de energia limpa** — energia · legado.
81. **Reconciliação com o partido** — Uni baixa · Uni +.
82. **Disputa com o partido** — direção hostil · Cred + se popular, Uni −.
83. **Aliança com outro partido** — base fraca · base +.
84. **Rompimento com aliado** — aliado tóxico · Esc −, base −.
85. **Encontro com o vice** — vice rebelde · Est +.
86. **Encontro com o presidente da Câmara** — pauta travada · pauta destrava, Cap −.
87. **Reforma do Regimento** — Câmara · Cap +, oposição protesta.
88. **Pedido de CPI contra rival** — rival em escândalo · Fama +, polarização.
89. **Defesa contra CPI** — CPI aberta · ↪ arco CPI.
90. **Pedido de desculpas público** — erro grave · Cred +, Ent −.
91. **Lua de mel** — 1º semestre · use para pautas difíceis: custo político −30%.
92. **Ano eleitoral** — último ano · inaugurações ×2, TSE atento.
93. **Pré-candidatura do sucessor** — fim de mandato · aliado ganha Fama.
94. **Reeleição** — fim de mandato · campanha começa mais cedo.
95. **Desincompatibilização** — vai disputar outro cargo · renuncia em abril.
96. **Balanço do mandato** — 4º ano · promessas viram notícia.
97. **Agenda de costumes** — base conservadora pede · Sat[religiosos] +, Sat[jovens] −.
98. **Agenda progressista** — base progressista pede · Sat[jovens] +, Sat[religiosos] −.
99. **Agenda liberal** — mercado pede · confiança +, GI[sindicatos] −.
100. **Agenda desenvolvimentista** — indústria pede · empregos +, dívida +.

## 12. Perguntas de entrevista e debate

Variáveis: `{cidade}`, `{estado}`, `{bairro}`, `{rival}`, `{partido}`, `{cargo}`, `{grupo}`, `{ano}`, `{indicador}`. Hoje há 31 perguntas para 17 temas; a meta é 15 por tema.

### 12.1 Emprego (`jobs`)

1. O desemprego em {cidade} está acima da média nacional. O que o senhor faria no primeiro mês?
2. Fábricas estão saindo de {estado}. Como trazer empregos de volta sem dar isenção para todo mundo?
3. Os aplicativos viraram o maior empregador da cidade. Entregador é empregado ou empreendedor?
4. Jovens de {bairro} não conseguem o primeiro emprego. Qual é a sua proposta concreta?
5. A inteligência artificial vai acabar com empregos de escritório?
6. O senhor promete criar quantos empregos e como vamos medir?
7. Frentes de trabalho: solução ou paliativo?
8. Como gerar emprego para quem tem mais de 50 anos?
9. Qualificação profissional: prefeitura, estado ou empresas devem pagar?
10. O comércio de rua está fechando. É culpa dos impostos ou da internet?
11. Reduzir a jornada de trabalho gera ou destrói empregos?
12. O que fazer com os galpões vazios da antiga zona industrial?
13. Turismo pode ser o motor da economia de {cidade}?
14. Concurso público é política de emprego?
15. Como o senhor vai atrair empresas sem guerra fiscal com as cidades vizinhas?

### 12.2 Saúde (`healthcare`)

1. A fila para cirurgia em {cidade} passa de um ano. Como zerar?
2. Faltam médicos nos postos de {bairro}. O senhor vai contratar ou terceirizar?
3. Organizações sociais na saúde: eficiência ou privatização disfarçada?
4. O hospital regional está há anos em obras. De quem é a culpa?
5. A dengue voltou com força. O que deu errado na prevenção?
6. Saúde mental virou epidemia entre jovens. Qual é o plano?
7. O senhor usa o SUS?
8. Remédios de alto custo: a Justiça manda e o orçamento não tem. Como resolver?
9. Telemedicina resolve a falta de médicos no interior?
10. Plano de saúde para servidores públicos com dinheiro público: justo ou privilégio?
11. Vacinação infantil caiu. Obrigar ou convencer?
12. As UPAs viraram hospitais improvisados. O modelo fracassou?
13. Quanto do orçamento o senhor vai destinar à saúde, em número?
14. Parcerias com Santas Casas ou hospitais próprios?
15. Como reduzir a mortalidade materna em {estado}?

### 12.3 Educação (`education`)

1. A nota do ensino fundamental em {cidade} caiu. Onde o senhor erraria menos?
2. Faltam vagas em creche para 3 mil crianças. Construir ou conveniar?
3. Escola em tempo integral para todos: cabe no orçamento?
4. Escolas cívico-militares: modelo para expandir ou abandonar?
5. Celular na sala de aula deve ser proibido?
6. Professores ganham pouco e faltam muito. O que vem primeiro?
7. Merenda escolar de qualidade custa caro. De onde sai o dinheiro?
8. Ensino técnico ou universidade: onde investir?
9. O que o senhor acha de homeschooling?
10. Violência nas escolas: polícia na porta ou psicólogo na sala?
11. Alfabetização na idade certa: qual é a meta e quando?
12. Cotas na universidade estadual devem continuar?
13. Bônus para professores por desempenho dos alunos é justo?
14. Transporte escolar rural está precário. Qual é a solução?
15. Educação financeira e programação no currículo: prioridade ou modismo?

### 12.4 Segurança (`security`)

1. Os assaltos em {bairro} dobraram. O que muda no primeiro dia?
2. Guarda municipal armada: sim ou não?
3. Câmeras corporais nos policiais: transparência ou desconfiança?
4. Facções controlam bairros inteiros. Dá para retomar sem violência?
5. Milícias: como combater quem tem apoio político?
6. Redução da maioridade penal resolve?
7. Presídios superlotados: construir mais ou prender menos?
8. Reconhecimento facial nas ruas: segurança ou vigilância?
9. Feminicídio bateu recorde. Qual é a resposta do governo?
10. A polícia mata demais ou de menos?
11. Iluminação pública é política de segurança?
12. Porte de armas para cidadãos: o senhor é a favor?
13. Drogas: tratar como crime ou como saúde pública?
14. Policiais ganham mal. Reajuste já ou plano de carreira?
15. Por que o senhor acha que vai fazer diferente dos últimos governos?

### 12.5 Impostos (`taxes`)

1. O IPTU de {cidade} vai subir no seu governo?
2. Reforma tributária: quem paga a conta?
3. Isenção de imposto de renda para quem ganha até 5 mil: como compensar?
4. Taxar grandes fortunas afasta investidores?
5. Empresas que ganharam isenção cumpriram o que prometeram?
6. O senhor promete não criar nenhum imposto? Pode cumprir?
7. Taxa do lixo: justa ou bitributação?
8. Imposto sobre combustível deve cair?
9. O comércio paga imposto demais?
10. Cobrar ISS de aplicativos e bancos é viável?
11. Guerra fiscal entre estados: participar ou denunciar?
12. Onde o senhor cortaria gastos antes de aumentar impostos?
13. Taxar compras internacionais protege a indústria ou pune o consumidor?
14. Imposto sobre heranças deve subir?
15. A sonegação em {estado} é alta. Como combater?

### 12.6 Custo de vida (`inflation`)

1. O preço da comida subiu 15% em um ano. O que um {cargo} pode fazer?
2. Aluguel em {cidade} disparou. Controle de preços funciona?
3. Gás de cozinha a preço de ouro: subsidiar ou não?
4. A tarifa de ônibus vai subir no seu governo?
5. Energia elétrica cara: culpa de quem?
6. Feiras e mercados populares baixam o preço da comida?
7. O salário mínimo deve ter aumento real todo ano?
8. Juros altos para segurar a inflação: concorda?
9. Combustível: preço internacional ou preço controlado?
10. A cesta básica deve ter imposto zero?
11. Como o senhor vai proteger os mais pobres da inflação?
12. Programas sociais devem ser corrigidos pela inflação?
13. Remédios caros: o governo deve controlar preços?
14. Tarifa social de água e luz para quem?
15. O senhor sabe quanto custa um quilo de feijão hoje?

### 12.7 Corrupção (`corruption`)

1. Seu partido tem filiados investigados. Como o senhor responde?
2. O senhor aceitaria apoio de alguém condenado?
3. Emendas parlamentares sem transparência: o senhor vai divulgar todas?
4. Como evitar que obras sejam superfaturadas no seu governo?
5. Nepotismo cruzado: seus parentes terão cargos?
6. Quem financia a sua campanha?
7. Delação premiada: instrumento de justiça ou de perseguição?
8. O senhor abre mão do foro privilegiado?
9. CPI contra aliados: o senhor apoiaria?
10. Licitações: o que muda no seu governo?
11. O senhor tem algum processo na Justiça?
12. Sua declaração de bens cresceu muito. Pode explicar?
13. Lobby deve ser regulamentado?
14. Como proteger servidores que denunciam irregularidades?
15. Se um secretário seu for investigado, o senhor demite na hora?

### 12.8 Infraestrutura (`infrastructure`)

1. A obra mais atrasada de {cidade} será entregue quando?
2. Buracos nas ruas: tapa-buraco ou recapeamento?
3. Saneamento: privatizar a companhia ou investir com dinheiro público?
4. Enchentes todo verão: o que falta?
5. Ponte, viaduto ou metrô: qual é a obra prioritária?
6. Internet de qualidade em toda a cidade é possível?
7. O senhor vai terminar as obras do antecessor ou começar as suas?
8. Concessão de rodovias com pedágio: a favor?
9. Iluminação em LED compensa?
10. O aeroporto regional deve receber dinheiro público?
11. Barragens e encostas: quantas famílias vivem em área de risco?
12. Água encanada para todos até quando?
13. Parcerias público-privadas são seguras?
14. Como evitar obras eleitoreiras?
15. Quais obras cabem de verdade em quatro anos?

### 12.9 Moradia (`housing`)

1. Quantas casas populares o senhor promete entregar?
2. Ocupações de prédios abandonados no centro: despejar ou regularizar?
3. Aluguel social é suficiente para quem perdeu a casa?
4. Regularização fundiária: escritura para todos?
5. Verticalizar a cidade resolve o déficit?
6. Condomínios de luxo em área verde: pode?
7. Moradia no centro com IPTU zero: viável?
8. Pessoas em situação de rua: acolher ou retirar?
9. Programa de moradia para servidores: justo?
10. Áreas de risco: remover famílias contra a vontade?
11. Como evitar que conjuntos habitacionais virem guetos?
12. Retrofit de prédios públicos para moradia: o senhor faria?
13. Despejos durante crise econômica devem ser suspensos?
14. Mutirões de autoconstrução: bom modelo?
15. Imóveis vazios devem pagar IPTU maior?

### 12.10 Meio ambiente (`environment`)

1. Agro e meio ambiente: dá para conciliar em {estado}?
2. Queimadas: punir mais ou fiscalizar melhor?
3. O rio que corta {cidade} tem esgoto. Quando estará limpo?
4. Lixão: fechar já ou esperar o aterro?
5. Carro elétrico deve ter incentivo?
6. Petróleo na Amazônia: explorar ou proteger?
7. Mudanças climáticas: o senhor tem plano de adaptação?
8. Reciclagem: obrigação da prefeitura ou do cidadão?
9. Árvores derrubadas para obras: compensação suficiente?
10. Garimpo ilegal: como acabar?
11. Licenciamento ambiental atrasa o desenvolvimento?
12. Energia solar em prédios públicos: quando?
13. Mercado de carbono: oportunidade para {estado}?
14. Proteger nascentes ou liberar a expansão urbana?
15. Animais abandonados: o que o senhor vai fazer?

### 12.11 Previdência (`pensions`)

1. A previdência dos servidores de {estado} está quebrada. Reforma ou aporte?
2. Aposentados devem ganhar aumento real?
3. Idade mínima para aposentadoria deve subir?
4. Militares devem ter regras iguais aos civis?
5. A fila do INSS passa de 1 milhão. Como zerar?
6. Aposentadoria rural deve continuar como está?
7. Professores devem se aposentar mais cedo?
8. Previdência complementar para servidores: boa ideia?
9. Como garantir a aposentadoria de quem trabalha por aplicativo?
10. Supersalários de aposentados: cortar?
11. O senhor vai mexer em direitos adquiridos?
12. Aposentados que voltam a trabalhar devem contribuir?
13. Pensão por morte deve mudar?
14. O déficit da previdência é real?
15. Quem cuida dos idosos sem aposentadoria?

### 12.12 Burocracia e regulação (`regulation`)

1. Abrir uma empresa em {cidade} leva meses. O que muda?
2. Alvarás: facilitar ou fiscalizar mais?
3. Aplicativos de transporte devem ser regulados?
4. Plataformas digitais devem responder por fake news?
5. Agências reguladoras são independentes de verdade?
6. Ambulantes: regularizar ou retirar?
7. Fiscalização sanitária fecha negócios demais?
8. Licenças de construção: por que demoram tanto?
9. Apostas online devem ser proibidas?
10. Inteligência artificial precisa de regras?
11. O serviço público digital funciona?
12. Quantas secretarias o senhor vai extinguir?
13. Terceirização no serviço público: limite?
14. Licitações eletrônicas reduzem corrupção?
15. Burocracia protege ou atrapalha o cidadão?

### 12.13 Crédito e dívidas (`credit`)

1. Famílias endividadas: o governo deve ajudar a renegociar?
2. Juros do cartão são abusivos. O que um {cargo} pode fazer?
3. Banco público deve emprestar mais barato?
4. Microcrédito para pequenos negócios: o senhor vai criar?
5. Agricultores endividados: perdoar dívidas?
6. Crédito consignado para aposentados: proteção ou armadilha?
7. Fintechs devem ter as mesmas regras dos bancos?
8. Dívida da prefeitura/estado: quanto o senhor vai pagar?
9. Empréstimo internacional para obras: risco cambial?
10. Juros altos travam o crescimento?
11. Programa de renegociação de dívidas funcionou?
12. Crédito estudantil deve voltar?
13. Bancos devem pagar mais impostos?
14. Educação financeira nas escolas resolve endividamento?
15. Apostas online estão endividando as famílias?

### 12.14 Agricultura (`agriculture`)

1. Plano Safra: mais crédito ou juros menores?
2. Agricultura familiar recebe pouco. O que muda?
3. Agrotóxicos: liberar ou restringir?
4. Reforma agrária ainda faz sentido?
5. Invasões de terra: como o senhor reage?
6. Seguro rural cobre a seca e a geada?
7. Estradas rurais impedem o escoamento da safra. Quando serão asfaltadas?
8. Exportação de grãos ou abastecimento interno?
9. Marco temporal das terras indígenas: qual é a sua posição?
10. Pecuária e desmatamento: como certificar?
11. Irrigação no semiárido: prioridade?
12. Cooperativas devem ter benefício fiscal?
13. Agroindústria: incentivar para gerar empregos?
14. Tecnologia no campo: internet rural quando?
15. Compra da agricultura familiar para a merenda: aumentar?

### 12.15 Tecnologia (`technology`)

1. {cidade} pode virar polo de startups?
2. Internet gratuita nas praças: vale o custo?
3. Inteligência artificial no serviço público: confiável?
4. Dados dos cidadãos estão protegidos no seu governo?
5. Escolas com tablets ou com professores?
6. Parque tecnológico: quem paga?
7. Fuga de cérebros: como reter talentos?
8. Reconhecimento facial: privacidade importa?
9. Governo digital exclui os idosos?
10. Big techs pagam pouco imposto?
11. Criptomoedas: regular ou proibir?
12. Ataques hackers a órgãos públicos: estamos preparados?
13. Indústria de chips no Brasil: sonho ou estratégia?
14. Trabalho remoto deve ser incentivado?
15. Robôs e automação: como proteger os trabalhadores?

### 12.16 Transporte (`transport`)

1. A tarifa de ônibus vai subir?
2. Passe livre estudantil: o senhor vai implantar?
3. Faixas exclusivas de ônibus ou mais espaço para carros?
4. Metrô: promessa ou realidade?
5. Ciclovias: prioridade ou perda de vagas?
6. Aplicativos de transporte devem pagar taxa à cidade?
7. Empresas de ônibus: concessão ou gestão pública?
8. Engarrafamento recorde: rodízio de placas?
9. Mototaxi deve ser regulamentado?
10. Patinetes elétricos nas calçadas: proibir?
11. Trem metropolitano: quando?
12. Estradas estaduais: duplicar quais?
13. Pedágio urbano: o senhor cogita?
14. Transporte noturno para trabalhadores: vai existir?
15. Ônibus elétricos: quando?

### 12.17 Assistência social (`welfare`)

1. Programas de renda devem ter porta de saída?
2. Fome em {cidade}: quantas famílias passam fome hoje?
3. Restaurante popular: o senhor vai abrir?
4. Pessoas em situação de rua: acolhimento ou internação?
5. Cadastro único está desatualizado. Como corrigir?
6. Benefícios sociais desestimulam o trabalho?
7. Creches noturnas para mães trabalhadoras?
8. Idosos sozinhos: quem cuida?
9. Trabalho infantil nos semáforos: o que fazer?
10. Imigrantes devem ter acesso a programas sociais?
11. Cesta básica em ano eleitoral é compra de voto?
12. Dependência química: tratamento voluntário ou obrigatório?
13. Renda básica universal: viável?
14. Violência doméstica: abrigos suficientes?
15. Assistência social é dever do município ou do estado?

### 12.18 Perguntas hostis (memória política)

1. Em {ano} o senhor prometeu {promessa} e não cumpriu. Por que acreditar agora?
2. Seu ex-secretário foi preso. O senhor sabia?
3. O senhor trocou de partido {n} vezes. Em que o senhor acredita?
4. Sua rejeição é a maior entre os candidatos. Por quê?
5. O senhor faltou a {n} debates. Tem medo de quê?
6. Sua campanha recebeu doação de empresa investigada. Vai devolver?
7. O senhor votou contra {tema} e agora defende. Mudou de ideia ou de conveniência?
8. Há um vídeo antigo seu dizendo {frase}. O senhor mantém?
9. Seu partido está dividido. Como governar se não une nem o partido?
10. O senhor está em {posição}º nas pesquisas. Por que não desiste?
11. Seu vice responde a processo. Foi uma boa escolha?
12. O senhor é acusado de usar a máquina pública. Responde?
13. Sua gestão passada terminou com déficit. Vai repetir?
14. O senhor apoiou {rival} na última eleição. O que mudou?
15. Moradores de {bairro} dizem que o senhor só aparece em eleição.
16. O senhor tem patrimônio de {valor}. Entende a vida do trabalhador?
17. A sua equipe tem parentes seus. Isso não é nepotismo?
18. O senhor prometeu não aumentar impostos e aumentou. Vai fazer de novo?
19. Sua obra principal está parada há {n} meses. De quem é a culpa?
20. O senhor foi multado pelo TSE nesta campanha. Respeita as regras?
21. Um ex-aliado diz que o senhor é autoritário. O que responde?
22. O senhor já disse que {grupo} não vota em você. Desistiu deles?
23. Seu adversário diz que o senhor não tem experiência. Ele tem razão?
24. O senhor é investigado por {fato}. É inocente?
25. Sua campanha usou robôs nas redes. Vai assumir?
26. O senhor recebeu apoio de alguém condenado. Aceita esse apoio?
27. Por que o senhor não divulga sua agenda?
28. O senhor sabe o número de mortos na última enchente da cidade?
29. Sua aprovação caiu {n} pontos. O que deu errado?
30. Se perder, o senhor reconhece o resultado?
31. O senhor desistiria da candidatura para unir o seu campo?
32. Sua promessa custa {valor}. De onde sai o dinheiro?
33. O senhor terminaria o mandato ou largaria para disputar outro cargo?
34. Você já mentiu em entrevista?
35. Seu assessor xingou um eleitor nas redes. Vai demitir?
36. O senhor foi visto em jantar com {lobista}. O que conversaram?
37. A polícia matou {n} pessoas na operação que o senhor elogiou. Mantém o elogio?
38. Seu partido votou pelo aumento do fundo eleitoral. O senhor concorda?
39. Por que o senhor não usa o transporte público?
40. Sua família tem negócios com o governo?
41. O senhor quebrou o acordo com {aliado}. Por que confiar no senhor?
42. Seus números de gestão são contestados pelo Tribunal de Contas.
43. O senhor foi o candidato que mais gastou. Isso compra eleição?
44. O senhor chorou no debate. Foi sincero ou estratégia?
45. Qual foi o maior erro da sua vida pública?

### 12.19 Temas e pegadinhas de debate

Formato: **Tema** — situação · como explorar · risco.

1. **Pergunta de número** — rival pergunta o orçamento exato da saúde · acertar dá Cred +3 · errar vira meme.
2. **Pergunta sobre seu partido** — escândalo do partido · distanciar-se · Uni −.
3. **Promessa impossível** — rival promete algo inviável · desmontar com números · soar arrogante.
4. **Ataque pessoal** — família ou vida privada · indignação calma · revidar sobe a rejeição.
5. **Pergunta de eleitor indeciso** — tema local · resposta concreta · resposta genérica perde votos.
6. **Mediador corta o tempo** — resposta pela metade · usar a réplica · desperdiçar o tempo.
7. **Documento mostrado no ar** — dossiê · pedir para ver · chamar de falso sem saber.
8. **Rival se faz de vítima** — ataque · não morder a isca · parecer agressor.
9. **Pergunta sobre aliado preso** — escândalo · "a Justiça decide" · defender sai caro.
10. **Tema que o rival domina** — área técnica · trazer para o seu tema · fugir parece fraqueza.
11. **Pergunta sobre aborto/drogas/armas** — costumes · posição clara e curta · ficar em cima do muro irrita todos.
12. **Rival lê a resposta** — cola · ironizar · parecer mesquinho.
13. **Pergunta sobre gafe antiga** — vídeo · humor · negar o óbvio.
14. **Considerações finais** — último minuto · mensagem emocional · repetir slogans.
15. **Pergunta sobre a cidade vizinha** — guerra fiscal · cooperação · atacar vizinhos.
16. **Pergunta sobre salário de professor** — educação · valor concreto · prometer sem fonte.
17. **Pergunta sobre polícia** — segurança · equilíbrio · extremos.
18. **Desafio para assinar compromisso** — carta no ar · assinar se coerente · assinar sem ler.
19. **Rival cita pesquisa** — "você está em 4º" · mostrar tendência · ficar na defensiva.
20. **Rival fala de experiência** — "nunca administrou nada" · histórico concreto · arrogância.
21. **Pergunta de jornalista convidado** — pergunta técnica · dados · enrolar.
22. **Pergunta sobre gastos de campanha** — dinheiro · transparência · ataque ao financiador do rival.
23. **Pergunta sobre o governo federal** — nacionalização · trazer para o local · ser engolido pelo tema nacional.
24. **Pergunta sobre o governador** — alinhamento · cooperação · dependência.
25. **Briga entre dois rivais** — oportunidade · ficar acima da briga · ser esquecido.
26. **Pergunta sobre fake news** — boato · desmentir com prova · repetir o boato.
27. **Pergunta sobre mulheres na política** — representação · compromisso concreto · frase infeliz.
28. **Pergunta sobre racismo** — tema sensível · empatia · minimizar.
29. **Pergunta sobre religião** — fé · respeito ao Estado laico · instrumentalizar a fé.
30. **Pergunta sobre o meio ambiente** — agro × floresta · conciliação · discurso vazio.
31. **Pergunta sobre a Copa/carnaval** — gasto com festa · equilíbrio · parecer contra o povo.
32. **Pergunta sobre transporte** — tarifa · número concreto · promessa de tarifa zero sem fonte.
33. **Pergunta sobre moradia** — ocupações · posição clara · contradição com o passado.
34. **Pergunta sobre servidores** — reajuste · realismo · prometer o que não cabe.
35. **Pergunta sobre o vice** — vice polêmico · defender com fatos · trair o vice.
36. **Pergunta sobre reeleição** — "vai terminar o mandato?" · compromisso · evasiva.
37. **Pergunta sobre a imprensa** — liberdade · defender · atacar jornalistas.
38. **Pergunta sobre as urnas** — confiança · defender o sistema · lançar dúvida.
39. **Pergunta em libras / acessibilidade** — inclusão · resposta concreta · desconhecer.
40. **Pergunta de criança (formato especial)** — linguagem simples · empatia · infantilizar.
41. **Pergunta do rival sobre sua idade** — juventude/idade · energia ou experiência · se ofender.
42. **Pergunta sobre o maior erro** — autocrítica · humildade · "nunca errei".
43. **Rival usa dado falso** — checagem · corrigir com elegância · acusar de mentiroso sem prova.
44. **Mediador comete erro** — gafe da emissora · ignorar · ironizar o mediador.
45. **Rival não comparece** — cadeira vazia · falar à cadeira · parecer arrogante.
46. **Pergunta sobre o maior bairro** — local · conhecimento do território · errar o nome.
47. **Pergunta sobre imposto do agro** — agro · equilíbrio · perder um lado inteiro.
48. **Pergunta sobre a juventude** — emprego/educação · proposta nova · discurso antigo.
49. **Pergunta sobre idosos** — saúde/previdência · empatia · promessa vaga.
50. **Rival faz piada com você** — humor · rir junto · se irritar.
51. **Pergunta sobre seu patrimônio** — riqueza · transparência · arrogância.
52. **Pergunta sobre sua formação** — diploma · fatos · inflar o currículo.
53. **Pergunta sobre acordo com o Centrão** — governabilidade · pragmatismo explicado · negar o óbvio.
54. **Pergunta sobre a oposição** — diálogo · abertura · revanchismo.
55. **Pergunta sobre o primeiro dia de governo** — prioridade · uma medida concreta · lista sem fim.
56. **Pergunta sobre o que corta** — ajuste · coragem com detalhes · "corto desperdício".
57. **Pergunta sobre impostos** — "vai aumentar?" · posição clara · promessa que vai quebrar.
58. **Pergunta sobre segurança da mulher** — violência · medidas · estatística errada.
59. **Pergunta sobre seu partido no Congresso** — votações · coerência · contradição.
60. **Pergunta sobre um caso local recente** — tragédia · conhecer o caso · não saber.
61. **Rival propõe pacto** — não agressão · aceitar se vantajoso · parecer conluio.
62. **Plateia vaia** — torcida rival · seguir calmo · reagir à plateia.
63. **Microfone falha** — técnico · bom humor · irritação.
64. **Tempo de resposta acaba** — corte · priorizar a frase final · ser cortado no meio.
65. **Pergunta sobre a capital do estado** — prefeito de cidade-polo · cooperação regional · bairrismo.
66. **Pergunta sobre a universidade** — cidade universitária · apoio · ignorar.
67. **Pergunta sobre o porto** — cidade portuária · plano · desconhecer.
68. **Pergunta sobre a enchente** — cidade atingida · plano e empatia · culpar a natureza.
69. **Pergunta sobre a fábrica que fechou** — emprego · plano realista · promessa mágica.
70. **Pergunta sobre a fronteira** — cidade de fronteira · segurança e comércio · xenofobia.
71. **Pergunta sobre o turismo** — cidade turística · equilíbrio com moradores · só falar de turistas.
72. **Pergunta sobre o agro local** — cidade agro · conhecimento do setor · generalidades.
73. **Pergunta sobre a festa da cidade** — tradição · valorizar · desprezar.
74. **Pergunta sobre o time da cidade** — futebol · simpatia · tomar partido em rivalidade.
75. **Pergunta sobre transporte intermunicipal** — região metropolitana · cooperação · culpar o estado.
76. **Pergunta sobre o hospital regional** — polo de saúde · financiamento · empurrar para o estado.
77. **Pergunta sobre a ferrovia** — logística · plano · promessa sem verba.
78. **Pergunta sobre a mineração** — cidade mineradora · royalties e segurança · omitir riscos.
79. **Pergunta sobre o petróleo** — royalties · diversificação · dependência.
80. **Pergunta final do mediador: "por que você?"** — síntese · mensagem clara · repetir o programa inteiro.

## 13. Manchetes

Modelos de notícia gerados a partir de fatos da simulação. Variáveis como na seção 12, mais `{n}`, `{p}` (pontos percentuais) e `{veiculo}`.

### 13.1 Pesquisas

1. {nome} dispara e encosta em {rival}
2. Empate técnico na disputa por {cidade}
3. {nome} perde {p} pontos em uma semana
4. Indecisos ainda são {n}% e podem decidir a eleição
5. Rejeição de {nome} chega a {n}%
6. Pesquisa mostra 2º turno entre {nome} e {rival}
7. {nome} lidera entre jovens; {rival}, entre idosos
8. Interior e capital votam de formas opostas
9. Voto útil começa a migrar para {nome}
10. Instituto {instituto} é questionado após resultado surpreendente
11. {nome} tem melhor avaliação de gestão entre os candidatos
12. Eleitor de {grupo} muda de lado na reta final
13. Mulheres decidem a eleição em {cidade}
14. {nome} cresce depois do debate
15. Pesquisa espontânea: {nome} é o mais lembrado

### 13.2 Campanha

16. Comício de {nome} reúne milhares em {bairro}
17. Carreata de {nome} trava o trânsito no centro
18. {nome} passa o dia em {bairro} e ouve reclamações
19. {nome} lança plano para {tema}
20. Proposta de {nome} custaria R$ {valor}, dizem economistas
21. {nome} anuncia {vice} como vice
22. {partido} oficializa candidatura de {nome}
23. {nome} recebe apoio de {aliado}
24. {rival} desiste e declara voto em {nome}
25. Militância de {nome} faz bandeiraço em toda a cidade
26. {nome} grava vídeo andando de ônibus
27. Jingle de {nome} vira hit nas redes
28. {nome} visita hospital e promete mutirão de cirurgias
29. {nome} percorre o interior em caravana
30. Campanha de {nome} arrecada R$ {valor} em vaquinha

### 13.3 Ataques e polêmicas

31. {rival} acusa {nome} de mentir sobre {tema}
32. {nome} rebate: "{frase}"
33. Vídeo antigo de {nome} volta a circular
34. TSE manda remover propaganda de {nome}
35. {nome} ganha direito de resposta contra {rival}
36. Fake news sobre {nome} se espalha em grupos de mensagens
37. {nome} diz que é vítima de perseguição
38. Gafe: {nome} erra o nome de {cidade}
39. {nome} pede desculpas após declaração sobre {grupo}
40. Áudio atribuído a {nome} é falso, diz perícia
41. {rival} usa horário eleitoral para atacar {nome}
42. {nome} processa {rival} por difamação
43. Assessor de {nome} é afastado após ofensas nas redes
44. Campanha de {nome} é multada por propaganda irregular
45. {nome} é vaiado em {lugar}

### 13.4 Debates

46. {nome} vence debate, diz pesquisa
47. Debate tem trocas de acusações e pouca proposta
48. Cadeira vazia: {rival} falta e vira alvo
49. {nome} erra número da saúde e vira meme
50. Momento de emoção marca o debate
51. Mediador perde o controle no debate da {veiculo}
52. {nome} e {rival} fazem pacto de não agressão
53. {nome} apresenta documento contra {rival} ao vivo
54. Checagem: {n} afirmações falsas no debate
55. Último debate define rumo do 2º turno

### 13.5 Resultados

56. {nome} é eleito prefeito de {cidade}
57. {nome} vence no 1º turno com {n}% dos votos válidos
58. {nome} e {rival} disputam o 2º turno
59. Virada histórica: {nome} vence de trás para frente
60. {nome} reconhece derrota e parabeniza {rival}
61. {nome} contesta resultado sem provas
62. Abstenção recorde de {n}%
63. {partido} elege a maior bancada da Câmara
64. {nome} é o vereador mais votado da história de {cidade}
65. Puxador de votos elege mais {n} da chapa

### 13.6 Governo

66. {nome} toma posse e promete {promessa}
67. Primeiros 100 dias: aprovação de {nome} é de {n}%
68. {nome} anuncia secretariado com {n} indicações políticas
69. Câmara aprova projeto de {nome} por {n} votos a {m}
70. Câmara derrota {nome} e derruba veto
71. {nome} decreta calamidade após enchente
72. Obra prometida por {nome} completa {n} meses de atraso
73. {nome} inaugura {obra} em {bairro}
74. Aprovação de {nome} cai para {n}%
75. {nome} enfrenta a maior greve de servidores em {n} anos
76. Orçamento de {ano} tem déficit de R$ {valor}
77. {nome} anuncia corte de gastos de R$ {valor}
78. Secretário de {nome} pede demissão
79. {nome} demite secretário após denúncia
80. Tribunal de Contas aprova as contas de {nome}
81. Tribunal de Contas aponta irregularidades na gestão {nome}
82. {nome} lança programa {programa}
83. {nome} cumpre {n} de {m} promessas, diz levantamento
84. Lua de mel acaba: oposição se organiza contra {nome}
85. {nome} sanciona lei que {efeito}

### 13.7 Escândalos e Justiça

86. PF cumpre mandados em empresa ligada a aliado de {nome}
87. Ex-assessor de {nome} assina delação
88. {nome} é citado em investigação; defesa nega
89. CPI contra {nome} é instalada
90. Relatório da CPI pede indiciamento de {n} pessoas
91. Justiça Eleitoral julga cassação de {nome}
92. TSE absolve {nome} por falta de provas
93. {nome} fica inelegível por oito anos
94. Pedido de impeachment de {nome} é aceito
95. {nome} sobrevive ao impeachment por {n} votos
96. STF suspende lei de {nome}
97. MP pede afastamento de secretário de {nome}
98. {nome} abre mão do foro privilegiado
99. Doação suspeita na campanha de {nome} vira inquérito
100.  {nome} devolve dinheiro de verba de gabinete

### 13.8 Economia

101. Desemprego cai para {n}% em {estado}
102. Inflação acumulada passa de {n}%
103. Dólar fecha a R$ {valor}, maior alta do ano
104. Fábrica anuncia {n} demissões em {cidade}
105. Investimento de R$ {valor} vai gerar {n} empregos
106. Safra recorde aquece economia do interior
107. Preço da gasolina sobe pela {n}ª vez no ano
108. Juros sobem para {n}% ao ano
109. PIB cresce {n}% e surpreende o mercado
110. Recessão técnica: economia encolhe pelo 2º trimestre
111. Agência rebaixa nota de crédito do país
112. Comércio fecha {n} lojas no centro de {cidade}
113. Turismo bate recorde em {cidade}
114. Exportações de {produto} disparam
115. Aluguel sobe {n}% em um ano

### 13.9 Crises e tragédias

116. Chuva deixa {n} desabrigados em {cidade}
117. Deslizamento atinge casas em {bairro}
118. Seca: {n} cidades em situação de emergência
119. Queimadas cobrem {cidade} de fumaça
120. Apagão atinge {n} mil casas
121. Surto de dengue lota hospitais em {cidade}
122. Rebelião em presídio deixa {n} mortos
123. Facção ataca ônibus em {cidade}
124. Barragem é interditada por risco de rompimento
125. Enchente histórica: rio sobe {n} metros
126. Onda de calor bate recorde de {n} °C
127. Granizo destrói telhados em {bairro}
128. Ponte desaba e isola {cidade}
129. Vazamento de óleo atinge praias de {estado}
130. Epidemia: {n} casos confirmados

### 13.10 Partidos e bastidores

131. {partido} rompe com o governo {nome}
132. Ala de {partido} lança manifesto contra a direção
133. {nome} troca {partido} por {partido2}
134. Federação {federacao} discute candidato próprio
135. Janela partidária: {n} deputados trocam de partido
136. {partido} expulsa {nome}
137. Centrão cobra ministérios para apoiar {nome}
138. Presidente da Câmara engaveta projeto de {nome}
139. {nome} e {rival} selam aliança improvável
140. Convenção de {partido} tem vaias e empurrões
141. Pré-candidatos se movimentam para {ano}
142. {nome} é apontado como favorito para a sucessão
143. Prefeitos de {partido} declaram apoio a {nome}
144. {partido} perde tempo de TV com saída de deputados
145. Bastidores: {nome} negocia vice com {partido}

### 13.11 Curiosidades e leveza

146. {nome} adota cachorro caramelo e vira hit
147. {nome} dança em festa junina e viraliza
148. {nome} comemora gol da seleção com eleitores
149. Candidato se fantasia de super-herói e é multado
150. {nome} erra receita de bolo em programa de TV
151. Eleitor tatua o número de {nome}
152. {nome} é flagrado comendo pastel na feira
153. Jingle de {nome} ganha versão funk
154. {nome} perde o voo e faz comício por vídeo
155. Avó de {nome} rouba a cena no comício
156. {nome} chega de bicicleta ao debate
157. {nome} recebe título de cidadão honorário de {cidade}
158. Meme com {nome} vira figurinha mais usada do país
159. {nome} se emociona ao visitar escola onde estudou
160. Gato invade coletiva de {nome}

### 13.12 Mais manchetes

161. Eleição em {cidade} tem recorde de candidatos
162. Mulheres são {n}% dos candidatos, recorde histórico
163. Candidatos indígenas crescem em {estado}
164. Policiais e militares lançam {n} candidaturas
165. Pastores e padres disputam vagas na Câmara
166. Influenciadores tentam vaga no Legislativo
167. Gasto médio por voto em {cidade} é de R$ {valor}
168. Fundo eleitoral financia {n}% das campanhas
169. Debate é a TV mais vista da semana
170. Horário eleitoral perde audiência para streaming
171. Eleitor jovem tira título em número recorde
172. Abstenção entre idosos preocupa campanhas
173. Pesquisas erraram: o que aconteceu?
174. Cidade de {cidade} elege primeira prefeita
175. Câmara de {cidade} terá {n} novos vereadores
176. Reeleição: {n}% dos prefeitos conseguem novo mandato
177. Oposição vence em {n} capitais
178. Mapa: onde cada partido venceu
179. Voto evangélico decide em {cidade}
180. Agro elege bancada recorde
181. Sindicatos perdem força nas urnas
182. Partidos pequenos não atingem a cláusula de barreira
183. Federação garante sobrevivência de {partido}
184. Eleição mais cara da história de {estado}
185. Brancos e nulos somam {n}%
186. Urna eletrônica completa {n} anos sem fraude comprovada
187. TSE recebe {n} pedidos de direito de resposta
188. Deepfakes preocupam a Justiça Eleitoral
189. Campanhas gastam mais com redes do que com TV
190. Candidato com menos dinheiro vence em {cidade}
191. Eleitor de {cidade} quer {tema} como prioridade
192. Prefeitos eleitos assumem com caixa vazio
193. Transição de governo começa com atritos
194. Novo prefeito encontra obras paradas
195. Novo governador anuncia auditoria nas contas
196. Primeira semana: {nome} revoga decretos do antecessor
197. Novo presidente da Câmara é aliado de {nome}
198. {nome} completa um ano de governo com {n}% de aprovação
199. Balanço do mandato: o que {nome} entregou
200. {nome} se despede do cargo após {n} anos

## 14. Personagens recorrentes (arquétipos)

NPCs que persistem entre eleições (Bloco 3A). Nomes gerados; o arquétipo define estilo, ideologia típica, forças, fraquezas e eventos próprios. Nenhum representa pessoa real.

### 14.1 Rivais

1. **O Coronel do Interior** — dono de terras e votos · conservador · máquina municipal forte, fraco nas capitais · eventos: compra de lideranças, briga por água.
2. **A Professora** — sindicalista da educação · progressista · militância e credibilidade, pouco dinheiro · eventos: greves, debates técnicos.
3. **O Empresário Outsider** — "gestor, não político" · liberal · dinheiro ilimitado, inexperiente · eventos: gastos recorde, gafes.
4. **O Pastor** — líder religioso · conservador · rede de templos · eventos: abuso de poder religioso, agenda de costumes.
5. **O Delegado** — fama em operações · linha dura · popularidade em segurança · eventos: discurso punitivista, investigações.
6. **O Herdeiro** — filho de político tradicional · centro · sobrenome e máquina · eventos: escândalos do pai, nepotismo.
7. **A Influenciadora** — milhões de seguidores · variável · redes e jovens · eventos: cancelamentos, lives.
8. **O Técnico** — ex-secretário competente · centro · credibilidade · eventos: planos detalhados, falta de carisma.
9. **O Populista** — promete tudo · variável · carisma · eventos: promessas impossíveis, ataques.
10. **O Militar da Reserva** — ordem · conservador · segurança · eventos: falas antidemocráticas.
11. **O Sindicalista** — chão de fábrica · trabalhista · operários · eventos: greves, alianças com movimentos.
12. **O Ruralista** — agro · conservador econômico · agricultores e dinheiro · eventos: conflitos ambientais.
13. **A Ambientalista** — causa verde · progressista · jovens e classe média · eventos: protestos, licenças.
14. **O Coach** — autoajuda e lives · liberal · outsider · eventos: processos, ausência em debates.
15. **O Veterano** — 30 anos de mandatos · centro · experiência · eventos: escândalos antigos.
16. **A Jovem Promessa** — 25 anos · variável · energia · eventos: inexperiência.
17. **O Apresentador de TV** — popular · popular · Con alto · eventos: falas polêmicas.
18. **O Médico** — saúde · centro · credibilidade em saúde · eventos: debates técnicos.
19. **O Policial Militar** — tropa · linha dura · GI[segurança] · eventos: greves da PM.
20. **A Juíza Aposentada** — anticorrupção · centro · credibilidade · eventos: rigidez, falta de aliados.
21. **O Ex-Jogador de Futebol** — ídolo · popular · torcida · eventos: gafes, puxador de votos.
22. **O Comunicador de Rádio** — interior · popular · alcance local · eventos: ataques no rádio.
23. **O Economista do Mercado** — Faria Lima · liberal · empresariado · eventos: planos de ajuste.
24. **A Líder Comunitária** — periferia · progressista · militância · eventos: ocupações.
25. **O Prefeito Reeleito** — máquina · governista · obras · eventos: uso da máquina.
26. **O Ex-Presidiário Regenerado** — história de superação · variável · carisma · eventos: passado.
27. **O Cientista** — universidade · técnico · credibilidade · eventos: falta de verba de campanha.
28. **O Fazendeiro Ambientalista** — agro sustentável · centro · ponte entre grupos · eventos: conciliação.
29. **O Taxista** — classe trabalhadora · popular · autenticidade · eventos: falta de estrutura.
30. **A Atleta Olímpica** — esporte · centro · imagem limpa · eventos: inexperiência.

### 14.2 Aliados e figuras do partido

31. **O Presidente do Partido** — controla o fundo · cobra lealdade.
32. **O Tesoureiro** — sabe de tudo · risco de delação.
33. **O Marqueteiro Estrela** — caro e eficiente · exige liberdade total.
34. **O Coordenador de Campanha** — leal · centraliza decisões.
35. **A Assessora de Imprensa** — relação com jornalistas · protege a imagem.
36. **O Estatístico** — pesquisas internas · traz más notícias.
37. **O Captador** — dinheiro · relações perigosas.
38. **O Padrinho Político** — abre portas · cobra depois.
39. **O Pupilo** — jovem talento · pode virar rival.
40. **O Vice Leal** — discreto · confiável.
41. **O Vice Ambicioso** — quer o seu lugar.
42. **O Líder da Bancada** — negocia votos · cobra cargos.
43. **A Militante Histórica** — base · cobra coerência.
44. **O Ex-Aliado Ressentido** — rompeu · conhece seus segredos.
45. **O Cacique Regional** — dono de votos em uma região · negocia apoio.
46. **O Prefeito Aliado** — base municipal · pede emendas.
47. **O Governador Aliado** — convênios · exige fidelidade.
48. **O Deputado Puxador** — votos · ego.
49. **A Ala Jovem** — redes · radicalização.
50. **O Fundador do Partido** — história · resistência a mudanças.

### 14.3 Imprensa e opinião

51. **O Jornalista Obstinado** — investiga · não larga o osso.
52. **A Âncora Implacável** — entrevistas duras · audiência alta.
53. **O Colunista Amigo** — notas favoráveis · cobra acesso.
54. **O Blogueiro Militante** — ataques · alcance nas redes.
55. **O Dono do Jornal** — linha editorial · interesses empresariais.
56. **A Checadora de Fatos** — corrige números · imparcial.
57. **O Comentarista Ex-Político** — opinião ácida.
58. **O Humorista** — sátira · memes.
59. **A Repórter de Rua** — flagrantes · vídeos virais.
60. **O Podcaster** — conversas longas · audiência jovem.

### 14.4 Sociedade e poder econômico

61. **O Presidente da Federação das Indústrias** — empregos · incentivos.
62. **A Líder do Agro** — crédito · estradas.
63. **O Presidente da Central Sindical** — salários · greves.
64. **A Líder do Movimento de Moradia** — ocupações · negociações.
65. **O Bispo** — eleitorado católico · costumes.
66. **O Apóstolo** — eleitorado evangélico · costumes.
67. **A Reitora** — universidade · verbas.
68. **O Presidente da Associação Comercial** — impostos · segurança.
69. **O Líder Indígena** — demarcação · meio ambiente.
70. **A Líder Quilombola** — titulação · políticas públicas.
71. **O Banqueiro** — crédito · juros.
72. **O Dono da Construtora** — obras · doações.
73. **O Empresário de Ônibus** — tarifa · subsídio.
74. **O Lobista** — acesso · favores.
75. **O Miliciano (nunca nomeado)** — território · ameaça.
76. **O Chefe de Facção (nunca nomeado)** — território · violência.
77. **A Presidente da OAB** — instituições · direitos.
78. **O Comandante da PM** — tropa · hierarquia.
79. **A Defensora Pública** — direitos · ações judiciais.
80. **O Promotor** — investigações · ação civil pública.

### 14.5 Instituições (personagens institucionais)

81. **O Presidente da Câmara** — pauta · engavetamento.
82. **O Presidente do Senado** — PECs · indicações.
83. **O Ministro do STF Relator** — decisões monocráticas.
84. **O Procurador-Geral** — denúncias.
85. **O Conselheiro do Tribunal de Contas** — auditorias.
86. **O Juiz Eleitoral** — multas · cassações.
87. **O Delegado da PF** — operações.
88. **A Presidente do Banco Central** — juros · autonomia.
89. **O Chefe da Defesa Civil** — alertas · desastres.
90. **O Secretário de Fazenda** — caixa · cortes.

### 14.6 Família e círculo pessoal

91. **O Cônjuge** — apoio ou crise.
92. **O Filho Político** — herdeiro · nepotismo.
93. **A Filha Ativista** — discorda publicamente.
94. **O Irmão Empresário** — conflito de interesse.
95. **A Mãe** — humaniza a campanha.
96. **O Amigo de Infância** — pede emprego.
97. **O Motorista** — sabe de tudo.
98. **O Médico Pessoal** — saúde do candidato.
99. **O Advogado** — processos.
100.  **O Biógrafo** — livro.

### 14.7 Personagens de eventos especiais

101. **A Eleitora Indecisa** — aparece em debates e pesquisas qualitativas.
102. **O Idoso do Comício** — emociona.
103. **A Mãe de Vítima** — cobra justiça.
104. **O Estudante Questionador** — pergunta difícil viral.
105. **O Motoboy** — voz dos aplicativos.
106. **O Agricultor Endividado** — crédito rural.
107. **A Enfermeira** — fila do SUS.
108. **O Professor da Rede** — salários.
109. **O Comerciante Assaltado** — segurança.
110. **A Moradora de Área de Risco** — enchentes.
111. **O Imigrante** — fronteira.
112. **O Ex-Operário** — fábrica fechada.
113. **A Catadora** — reciclagem.
114. **O Romeiro** — fé.
115. **O Torcedor** — futebol.
116. **A Artista de Rua** — cultura.
117. **O Pescador** — rios e mares.
118. **O Garimpeiro** — conflito ambiental.
119. **A Cientista** — fuga de cérebros.
120. **O Aposentado do INSS** — fila.

## 15. Conquistas

Formato: **Nome** — condição.

### 15.1 Campanha

1. **Primeira vitória** — vencer qualquer eleição.
2. **No primeiro turno** — vencer eleição majoritária sem 2º turno.
3. **Virada histórica** — vencer estando 10+ pontos atrás um mês antes.
4. **Davi contra Golias** — vencer com partido pequeno contra o maior partido do estado.
5. **Campanha franciscana** — vencer gastando menos que todos os rivais.
6. **Sem ataques** — vencer sem nenhuma peça de ataque.
7. **Rei do debate** — vencer todos os debates de uma eleição.
8. **Cadeira vazia** — vencer faltando a todos os debates.
9. **Fenômeno das redes** — vencer só com redes sociais (sem TV e rádio).
10. **Porta a porta** — 20 ações de porta a porta numa campanha.
11. **Mais votado** — vereador ou deputado mais votado do estado.
12. **Puxador** — eleger 3 colegas de chapa com sua votação.
13. **Sobra de vagas** — eleger-se pela distribuição das sobras.
14. **Unanimidade** — mais de 70% dos votos válidos.
15. **Por um fio** — vencer por menos de 0,5 ponto.
16. **Promessa nenhuma** — vencer sem fazer promessas.
17. **Cumpridor** — ser reeleito com 100% das promessas cumpridas.
18. **Imune** — passar uma campanha inteira sem gafes.
19. **Desmentido** — derrubar uma fake news no TSE.
20. **Voto útil** — subir 10 pontos na última semana.
21. **Coalizão arco-íris** — receber apoio de 3 partidos de campos diferentes no 2º turno.
22. **Interiorano** — vencer em todas as zonas do interior.
23. **Capital conquistada** — vencer em todas as zonas da capital.
24. **Carreata monstro** — 3 comícios com entusiasmo máximo.
25. **Doador zero** — vencer só com fundo partidário e vaquinha.
26. **Sem vice problemático** — escolher um vice sem nenhum escândalo em 4 anos.
27. **Rival derrotado** — vencer o mesmo rival três vezes.
28. **Revanche** — vencer quem te derrotou na eleição anterior.
29. **Estreante** — vencer na primeira eleição da carreira.
30. **Sobrevivente** — vencer com escândalo acima de 30.

### 15.2 Governo

31. **Lua de mel eterna** — terminar o 1º ano com aprovação acima de 60%.
32. **Fim de mandato popular** — sair com aprovação acima de 65%.
33. **Contas em dia** — quatro anos sem déficit.
34. **Obreiro** — entregar 10 obras num mandato.
35. **Nenhuma obra parada** — terminar o mandato sem obras atrasadas.
36. **Fila zero** — zerar fila de cirurgias eletivas.
37. **Creche para todos** — zerar fila de creche.
38. **Cidade limpa** — nenhuma crise do lixo em 4 anos.
39. **Sem greves** — mandato sem greve de servidores.
40. **Pacificador** — encerrar uma greve em menos de 1 mês.
41. **Herói da enchente** — aprovação subir após um desastre.
42. **Gestor de crise** — atravessar 3 crises sem cair abaixo de 40%.
43. **Reformista** — aprovar uma PEC.
44. **Legislador** — aprovar 10 leis próprias.
45. **Câmara amiga** — base acima de 2/3 por 2 anos.
46. **Contra tudo e todos** — governar com base abaixo de 1/3 por 1 ano e aprovar 3 leis.
47. **Sem veto derrubado** — nenhum veto derrubado num mandato.
48. **Transparência total** — portal de transparência e nenhum escândalo.
49. **Mão firme** — reduzir a violência em 30%.
50. **Pleno emprego** — desemprego local abaixo de 5%.
51. **Inflação domada** — inflação abaixo da meta por 2 anos (presidente).
52. **Grau de investimento** — recuperar a nota de crédito (presidente).
53. **Diplomata** — 5 cúpulas internacionais com saldo positivo (presidente).
54. **Federalista** — aprovar repasses maiores a estados e municípios.
55. **Saneamento universal** — esgoto acima de 90% na sua esfera.
56. **Educador** — subir a nota da educação em 1 ponto.
57. **Verde** — reduzir desmatamento em 50% (estado/União).
58. **Agro forte** — safra recorde com aprovação do agro acima de 70%.
59. **Industrial** — atrair 3 grandes fábricas.
60. **Cidade inteligente** — governo digital completo.
61. **Plebiscito vencido** — vencer um plebiscito.
62. **CPI enterrada** — impedir uma CPI sem perder credibilidade.
63. **Impeachment barrado** — sobreviver a um processo de impeachment.
64. **Sucessão** — eleger seu sucessor.
65. **Reeleito** — vencer a reeleição.
66. **Dois mandatos** — completar dois mandatos consecutivos.
67. **Ministério técnico** — secretariado 100% técnico por 1 ano.
68. **Ministério político** — secretariado 100% político sem escândalo.
69. **Austero** — cortar 20% dos cargos comissionados.
70. **Generoso** — reajuste acima da inflação para servidores 4 anos seguidos.

### 15.3 Carreira

71. **De vereador a presidente** — ocupar os dois cargos na mesma carreira.
72. **Escada completa** — vereador, prefeito, deputado, governador, senador e presidente.
73. **Fiel** — carreira inteira no mesmo partido.
74. **Camaleão** — vencer por 4 partidos diferentes.
75. **Fundador** — fundar um partido que elege um governador.
76. **Dinastia** — eleger um herdeiro político.
77. **Veterano** — 30 anos de vida pública.
78. **Ficha limpa** — carreira sem escândalo acima de 10.
79. **Volta por cima** — vencer depois de ficar inelegível.
80. **Senador vitalício** — três mandatos de senador.
81. **Prefeito de duas cidades** — governar duas cidades diferentes.
82. **Nacionalizado** — governar dois estados diferentes.
83. **Aposentado em paz** — aposentar-se com reputação acima de 80.
84. **Lenda** — legado acima de 90 no placar final.
85. **Mentor** — pupilo eleito governador.
86. **Comentarista** — 4 anos como comentarista e voltar eleito.
87. **Presidente do partido** — dirigir o partido nacional.
88. **Sabático produtivo** — voltar de um ano sabático e vencer.
89. **Jovem prodígio** — prefeito de capital antes dos 30.
90. **Sem idade** — eleito depois dos 75.

### 15.4 Desafios e partidas especiais

91. **Contra todos** — vencer o cenário Contra Todos.
92. **Sem dinheiro** — vencer o cenário Sem Dinheiro.
93. **Imprensa hostil** — vencer com todos os veículos contra.
94. **Crise permanente** — terminar o cenário Crise Permanente com aprovação acima de 40%.
95. **Arco-íris** — manter a coalizão do cenário por 2 anos.
96. **Cumpra tudo** — 100% das promessas no cenário Cumpra Tudo.
97. **Modo simulação** — vencer qualquer eleição na dificuldade Simulação.
98. **Brasil real completo** — vencer com 10 partidos reais diferentes.
99. **Paródia** — vencer no mundo paródia.
100.  **Fictício** — vencer no mundo fictício com o menor partido.
101.  **Cidade-polo** — vencer em 10 cidades-polo diferentes.
102.  **Rio Grande** — vencer nas 7 cidades do RS.
103.  **Nordeste** — vencer em todos os estados do Nordeste (carreira longa).
104.  **Amazônia** — governar um estado do Norte por 2 mandatos.
105.  **Desafio semanal** — completar 10 desafios semanais.
106.  **Speedrun** — de vereador a governador em 12 anos.
107.  **Sem save** — carreira inteira sem carregar save.
108.  **Pacifista** — campanha inteira sem resposta agressiva em entrevistas.
109.  **Técnico** — vencer usando só respostas técnicas em debates.
110.  **Emocional** — vencer usando só respostas emocionais.

### 15.5 Curiosidades

111. **Caramelo** — adotar um cachorro na campanha.
112. **Quadrilha** — dançar em festa junina.
113. **Meme** — viralizar com uma gafe e ainda vencer.
114. **Pastel** — 10 visitas a feiras.
115. **Ônibus lotado** — andar de ônibus 5 vezes.
116. **Chuva** — fazer comício na chuva.
117. **Torcedor** — torcer pelo time da cidade e vencer lá.
118. **Jingle de ouro** — jingle viral.
119. **Fã-clube** — entusiasmo máximo por 30 dias.
120. **Cadeira vazia histórica** — rival faltar a todos os debates.
121. **Hino** — errar o hino e vencer.
122. **Bicicleta** — ir de bicicleta ao debate.
123. **Gato na coletiva** — evento raro.
124. **Avó** — evento da avó no comício.
125. **Tatuagem** — eleitor tatuou seu número.
126. **Pé na estrada** — visitar todas as regiões do estado.
127. **Maratona** — 3 debates em uma semana.
128. **Insone** — sem descanso por 15 dias.
129. **Super-herói** — fantasia no comício (e multa).
130. **Réveillon** — virar o ano em campanha.

### 15.6 Conquistas de conteúdo (catálogo)

131. **Colecionador de eventos** — ver 100 eventos diferentes.
132. **Mestre dos arcos** — completar 20 arcos narrativos.
133. **Todas as cidades** — jogar em todas as 27 capitais.
134. **Todos os cargos** — disputar os 7 cargos.
135. **Todas as dificuldades** — vencer em todas as dificuldades.
136. **Todos os cenários** — completar 50 cenários.
137. **Enciclopédia** — ler todas as seções do manual.
138. **Analista** — abrir 100 pesquisas.
139. **Economista** — usar o simulador de impacto 50 vezes.
140. **Legislador nato** — propor leis em todas as áreas.
141. **Ministro de tudo** — nomear secretários em todas as pastas.
142. **Obras para todo lado** — obras de todos os tipos.
143. **Todos os modos de mapa** — usar todos os modos de mapa.
144. **Diário completo** — 4 anos de diário sem pular semana.
145. **Arqueólogo** — ler a memória política inteira.
146. **Pesquisador** — contratar todos os tipos de pesquisa.
147. **Marqueteiro** — usar todos os canais de propaganda.
148. **Entrevistado** — dar 50 entrevistas.
149. **Debatedor** — 30 debates.
150. **Completo** — todas as outras conquistas.

## 16. Objetivos e desafios de mandato

Objetivos opcionais propostos no início do mandato (o jogador escolhe 3). Cumprir dá reputação e legado.

1. Zerar a fila da creche.
2. Reduzir homicídios em 20%.
3. Entregar a obra principal antes do 3º ano.
4. Aprovar o plano diretor.
5. Terminar o mandato sem déficit.
6. Subir a nota da educação.
7. Reduzir o desemprego em 2 pontos.
8. Universalizar coleta de esgoto em 2 bairros.
9. Aprovar 5 leis próprias.
10. Manter aprovação acima de 50% por 2 anos.
11. Nenhuma greve de servidores.
12. Concluir 100% das promessas.
13. Atrair uma grande indústria.
14. Criar um parque tecnológico.
15. Reduzir a tarifa de ônibus.
16. Implantar passe livre estudantil.
17. Abrir um hospital.
18. Reformar todas as escolas.
19. Plantar 50 mil árvores.
20. Fechar o lixão.
21. Regularizar 5 mil moradias.
22. Abrir restaurante popular.
23. Reduzir a mortalidade infantil.
24. Zerar fila de cirurgias.
25. Implantar escola em tempo integral em metade da rede.
26. Instalar câmeras corporais na guarda.
27. Criar a casa da mulher.
28. Ampliar ciclovias em 50 km.
29. Implantar governo digital.
30. Aprovar orçamento participativo.
31. Reduzir cargos comissionados em 20%.
32. Pagar todos os precatórios.
33. Recuperar o centro histórico.
34. Fazer o maior São João/carnaval da história sem dívida.
35. Plano de adaptação climática aprovado.
36. Concurso público para saúde e educação.
37. Programa de primeiro emprego.
38. Reduzir em 30% a população em situação de rua.
39. Criar o consórcio regional de saúde.
40. Eleger um aliado na sucessão.
41. Duplicar uma rodovia estadual (governador).
42. Reduzir a superlotação dos presídios (governador).
43. Aprovar a reforma da previdência estadual (governador).
44. Atrair uma montadora (governador).
45. Universidade estadual no interior (governador).
46. Pagar a dívida com a União em dia (governador).
47. Reduzir desmatamento em 30% (governador do Norte/CO).
48. Acabar com o déficit de vagas em creche no estado (governador).
49. Policiamento em todas as cidades (governador).
50. Internet em todas as escolas (governador).
51. Aprovar a reforma tributária (presidente).
52. Inflação na meta (presidente).
53. Desemprego abaixo de 6% (presidente).
54. Grau de investimento (presidente).
55. Aprovar regra fiscal (presidente).
56. Zerar fila do INSS (presidente).
57. Reduzir desmatamento da Amazônia em 50% (presidente).
58. Acordo Mercosul–UE ratificado (presidente).
59. Ferrovia transcontinental iniciada (presidente).
60. Programa de casas populares com 1 milhão de unidades (presidente).
61. Aprovar 3 projetos como vereador.
62. Abrir uma CPI como vereador.
63. Ser presidente de comissão como deputado.
64. Relatar o orçamento sem escândalo.
65. Aprovar uma PEC como relator.
66. Votar 100% com o programa do partido.
67. Ser eleito presidente da Câmara/Assembleia.
68. Destinar emendas para 20 cidades.
69. Zerar faltas no plenário.
70. Ganhar prêmio de melhor parlamentar.
71. Liderar uma frente parlamentar.
72. Derrubar um veto do Executivo.
73. Barrar um projeto do governo.
74. Aprovar uma lei de iniciativa popular.
75. Fazer 100 discursos na tribuna.
76. Visitar todas as cidades da base.
77. Abrir mão de verba de gabinete.
78. Não usar auxílio-moradia.
79. Apresentar 50 projetos.
80. Ser reeleito com mais votos.

## 17. Ideias soltas de mecânicas

Complementam o [roteiro](ROADMAP_DINAMISMO.md). Cada item é uma semente para discussão.

1. **Agenda do dia com hora** — manhã, tarde e noite; eventos conflitam e é preciso escolher.
2. **Mapa de calor de presença** — onde você esteve nos últimos 30 dias.
3. **Pesquisa por bairro clicável** — abrir o bairro e ver o eleitor típico.
4. **Eleitor-avatar** — 5 eleitores fictícios que comentam suas ações a cada semana.
5. **Diário do eleitor indeciso** — narrativa leve de um eleitor que muda de ideia.
6. **Reações em tempo real no debate** — barra de aprovação ao vivo.
7. **Corte do debate** — o trecho que mais viralizou vira notícia e evento.
8. **Horário eleitoral roteirizado** — montar a peça com cenas (abertura, biografia, proposta, ataque, fecho).
9. **Spots de rádio regionais** — mensagens diferentes por região.
10. **Material de campanha** — santinhos, adesivos e camisetas com efeito em militância.
11. **Comitês físicos no mapa** — instalar comitês e ver alcance.
12. **Logística de caravana** — rota no mapa com dias e custo.
13. **Clima real por região** — chuva e calor afetam eventos de rua.
14. **Calendário de festas** — feriados e festas regionais no calendário do jogo.
15. **Copa do Mundo no calendário** — desvia atenção e muda o humor nacional.
16. **Pesquisas de diferentes institutos com viés visível** — histórico de acerto.
17. **Agregador de pesquisas** — média ponderada como os sites reais.
18. **Mercado de apostas político (fictício)** — odds como termômetro.
19. **Rede de contatos** — grafo de relações com NPCs.
20. **Favores** — banco de favores dados e devidos.
21. **Traições** — NPCs com ambição podem trocar de lado.
22. **Segredos** — informações sobre rivais com prazo de validade.
23. **Dossiês** — custam dinheiro e reputação para usar.
24. **Vazamentos** — sua equipe pode vazar; lealdade importa.
25. **Lealdade da equipe** — salário, tratamento e vitórias.
26. **Burnout** — a equipe cansa; trocar no meio da campanha custa.
27. **Saúde do candidato** — energia de longo prazo.
28. **Família como recurso e risco** — eventos com cônjuge e filhos.
29. **Patrimônio pessoal** — doar para a própria campanha.
30. **Imóveis e empresas** — conflitos de interesse.
31. **Declaração de bens pública** — crescimento suspeito vira evento.
32. **Agenda internacional** — viagens geram fama e críticas.
33. **Idiomas** — atributo para cúpulas.
34. **Religião do candidato** — afinidade com eleitores religiosos.
35. **Origem regional** — bônus no estado natal.
36. **Sotaque e identidade** — eventos sobre preconceito regional.
37. **Comparação com antecessores** — legado relativo.
38. **Museu da carreira** — galeria de cartazes e manchetes.
39. **Álbum de figurinhas** — colecionar personagens encontrados.
40. **Replays de eleição** — rever a noite da apuração.
41. **Noite da apuração interativa** — urnas chegando por região, com reação da equipe.
42. **Discurso de vitória/derrota escolhido** — muda o início do mandato.
43. **Transição de governo** — 2 meses entre eleição e posse com decisões.
44. **Equipe de transição** — descobrir rombos e esqueletos.
45. **Primeiros 100 dias** — painel especial com metas.
46. **Lua de mel com regras** — pautas difíceis custam menos.
47. **Popularidade por grupo no governo** — painel por segmento.
48. **Protestos no mapa** — manifestações aparecem como marcadores.
49. **Greves no mapa** — setores parados.
50. **Obras no mapa** — progresso visível.
51. **Crimes no mapa** — manchas de violência.
52. **Saúde no mapa** — lotação de hospitais.
53. **Educação no mapa** — escolas e notas.
54. **Transporte no mapa** — linhas e lotação.
55. **Modos de mapa novos** — saneamento, renda, idade, religião.
56. **Comparar cidades** — ranking nacional de prefeitos.
57. **Ranking de governadores** — aprovação comparada.
58. **Prefeitos NPC com aprovação** — rivais futuros se destacam.
59. **Eleições NPC acontecendo** — resultados nacionais no fim do ciclo.
60. **Notícias de outros estados** — o país vivo.
61. **Mídia nacional × local** — alcance e linha editorial.
62. **Redes por plataforma** — vídeos curtos, texto, áudio.
63. **Algoritmo e bolhas** — alcance fora da bolha é raro.
64. **Checagem automática** — propostas com números são checadas.
65. **Promessas com custo estimado** — economistas avaliam.
66. **Plano de governo** — documento com metas que vira avaliação.
67. **Debate entre vices** — eleição presidencial.
68. **Sabatina com entidades** — CNI, CUT, CNA etc. (fictícias).
69. **Votação de prévias** — filiados votam.
70. **Filiação em massa** — campanha de filiação aumenta militância.
71. **Escola de formação política** — partido treina quadros.
72. **Fundo partidário com prestação de contas** — escândalo se mal usado.
73. **Coligações proporcionais via federação** — regras realistas.
74. **Cláusula de barreira** — partidos pequenos perdem recursos.
75. **Fusões partidárias** — eventos de fusão entre partidos reais (respeitando dados oficiais).
76. **Editor de partido** — criar partido com logo própria (desenho simples).
77. **Mods** — pacotes de eventos de comunidade.
78. **Narrador opcional com IA** — resume a semana em texto.
79. **Modo história guiada** — campanha com roteiro leve para iniciantes.
80. **Desafio de seed compartilhada** — mesmo mundo para comparar resultados com amigos.
