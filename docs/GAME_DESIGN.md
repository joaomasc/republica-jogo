# República — Documento de Game Design

Este documento descreve as mecânicas do jogo e como elas se conectam. Todos os números citados vivem em `packages/game-engine/src/config/constants.ts` (`GameConstants`) e podem ser rebalanceados sem mexer nas fórmulas. O script `npm run simulate -- <cargo> <UF> <partidas>` joga campanhas inteiras com bots (passivo × ativo) e é a ferramenta de calibração.

> A economia industrial (edifícios, mercado, comércio, investimento), as leis no estilo Victoria 3, o processo legislativo completo (PL/PLP/PEC/MP, mesas, bancadas, veto, plebiscito, impeachment), os decretos e a Nação (legitimidade, regime, greves) estão descritos em [DESIGN_NACAO.md](DESIGN_NACAO.md). Onde este documento e aquele divergirem sobre economia, leis ou Congresso, vale o DESIGN_NACAO.

## 1. Princípios

1. **Histórias emergentes, não roteiro.** Não há campanha linear: a narrativa nasce da interação entre eleitores agregados, adversários com IA própria, eventos encadeados, economia e memória política.
2. **O motor decide; a IA escreve.** Resultados vêm de fórmulas determinísticas com aleatoriedade controlada por seed. Modelos de linguagem só produzem texto (perguntas, notícias) ou classificam o estilo de uma resposta livre — nunca o resultado.
3. **Neutralidade ideológica.** Posições são coordenadas numéricas. Toda lei e toda proposta agrada alguns grupos e desagrada outros; nenhuma opção domina as demais. Os efeitos são "do modelo", não verdades sobre o mundo.
4. **Pesquisa não é urna.** O jogador só enxerga o eleitorado por pesquisas (com erro amostral e viés de instituto); o dia da eleição tem ruído próprio.

## 2. Tempo

- Campanha avança em **dias** (botões 1 dia / 1 semana / 1 mês, ou avanço automático). Ações têm duração (0–3 dias); ações de duração 0 são limitadas pela energia.
- Mandato avança em **meses** (cada virada de mês roda o tick de governo).
- O tempo para em **interrupções**: evento aguardando decisão, dia de debate, dia da eleição, fim de mandato.
- Eleições gerais: 2026, 2030, 2034...; municipais: 2028, 2032... 1º turno no primeiro domingo de outubro; 2º turno no último domingo de outubro.

## 3. Eleitorado (Pops)

O país tem **324 Pops** = 12 tipos × 27 estados (trabalhadores, operários, agricultores, empresários, comerciantes, classe média, servidores, profissionais de saúde e de tecnologia, estudantes, aposentados, desempregados). Ninguém é simulado individualmente.

Cada Pop tem tamanho (eleitores), renda, escolaridade, idade, **ideologia em 9 eixos**, **prioridades** (17 temas), comparecimento, identificação partidária, satisfação e humor.

- **Composição regional:** a participação de cada tipo em cada estado parte de uma média nacional e é ajustada pelo perfil do estado (urbanização, agro, indústria, setor público, tecnologia, renda, desemprego).
- **Ideologia regional:** fatores econômicos deslocam a ideologia local (ex.: agro → produção no eixo ambiental) + ruído por partida (cada jogo tem uma geografia política diferente).
- **Identificação partidária:** proporcional a afinidade ideológica³ × popularidade × força local do partido; soma ~0,42 (o resto são independentes).

### Unidades eleitorais

- Presidente: os 27 estados.
- Governador, senador, deputados: 6 zonas do estado (capital, região metropolitana, interior N/S/L/O), com composição diferente (capital mais escolarizada; interior mais agrícola).
- Prefeito, vereador: 5 zonas da capital (centro e zonas N/S/L/O, perfis sorteados).

## 4. Ideologia

Eixos (0 → 100): Economia (Estado ↔ Mercado), Costumes (Progressista ↔ Conservador), Fiscal (Mais ↔ Menos impostos), Segurança (Preventiva ↔ Punitiva), Federalismo (União ↔ Estados/Municípios), Meio ambiente (Regulação ↔ Produção), Comércio (Protecionismo ↔ Livre comércio), Instituições (Centralização ↔ Descentralização), Relações exteriores (Integração ↔ Soberania).

A distância entre um eleitor e um candidato é ponderada pela **saliência**: temas prioritários para o Pop aumentam o peso dos eixos ligados a eles. O candidato tem posições **pessoais** e **percebidas** (o que o eleitor vê), que mudam com propostas, discursos, respostas em entrevistas e eventos.

## 5. Modelo de voto

Para cada (unidade, Pop, candidato):

```
utilidade = 1,7·(1 − 2·distância) + 2,2·identificação partidária + 0,9·apelo pessoal
          + 0,7·aderência aos temas + 0,8·momentum + 0,55·presença local
          + 0,6·voto retrospectivo (economia/aprovação) − 1,2·rejeição + bônus de incumbência
peso      = conhecimento^1,5 × e^(utilidade / 0,24) × (1 − rejeição)
```

- **Apelo pessoal:** carisma, credibilidade, comunicação, popularidade e oratória.
- **Conhecimento:** ninguém vota em quem não conhece — o expoente faz desconhecidos começarem com poucos pontos.
- **Rejeição:** cresce com distância ideológica acima de um limiar, polarização (extremismo das posições), baixa credibilidade, escândalos e ataques.
- **Momentum:** persuasão acumulada por grupo social e por região, com retornos decrescentes e decaimento diário.
- **Voto retrospectivo:** quem governa (o jogador ou o partido do NPC no cargo) ganha ou perde conforme a satisfação; a oposição se beneficia da insatisfação.
- **Indecisos:** começam altos e caem conforme a eleição se aproxima e o conhecimento dos candidatos sobe.
- **Brancos/nulos** aumentam quando todos são muito rejeitados.

### Segmentos do eleitorado (pesquisa interna)

Fiéis (votam em você e se identificam com seu partido), simpatizantes, independentes (votam em outro sem rejeitar você — os conquistáveis), indecisos, anti-candidato e abstenção.

## 6. Pesquisas

Pesquisas públicas semanais de 5 institutos fictícios: n = 2.000, margem ≈ ±2,4 p.p., viés de instituto por candidato (fixo por partida). Trazem total, rejeição, conhecimento, recortes por região, por algumas profissões e por zona (subamostras pequenas = mais erro) e cenários de 2º turno.

A **pesquisa interna** (paga; o estatístico barateia e amplia a amostra) mostra todos os grupos e os segmentos do eleitorado. O **mapa** de intenção de voto usa a pesquisa mais recente — não a intenção "real".

## 7. Eleição (`simulateElection`)

Função pura, reprodutível por seed:

1. Choques correlacionados na utilidade: **nacional** por candidato, **regional** por candidato×região e **por grupo** (escala da volatilidade da dificuldade).
2. Comparecimento por Pop com ruído por unidade e efeito do entusiasmo da base.
3. Indecisos: 30% anulam/abstêm, o resto se distribui com leve concentração nos líderes.
4. Majoritária: >50% dos válidos vence; senão 2º turno entre os dois primeiros (exceto Senado, turno único). Se o jogador cai no 1º turno, o 2º turno entre NPCs é resolvido automaticamente.
5. **Proporcional:** nomes individualizados ("puxadores") disputam ~16% dos votos; os demais vão para "outros candidatos" de cada partido (por identificação partidária e força das chapas). Cadeiras por **D'Hondt**; dentro do partido, o jogador disputa com candidatos sintéticos (distribuição de Pareto). Eleito se ficar entre os N mais votados do partido. Mostra-se a **linha de corte**.

Resultado: votos, percentuais, comparecimento, brancos/nulos, vencedor por unidade e voto por grupo social.

## 8. Candidato

Atributos 0–100 (compra de pontos: base 35, 110 pontos livres, máx. 85 + bônus da origem): carisma, oratória, liderança, negociação, credibilidade, comunicação, gestão, experiência, popularidade, organização e capacidade de campanha. **Derivados:** rejeição, conhecimento público, confiança, polarização e base militante.

Origens (12) dão bônus, simpatia de grupos, dinheiro e fama iniciais. Idade traz experiência; menos de 40 anos dá mais energia por dia. Aparência é um `AvatarConfig` serializável desenhado em SVG (preparado para sprites).

## 9. Partidos

9 partidos fictícios cobrindo o espectro, cada um com ideologia, popularidade, influência (tempo de TV, máquina), dinheiro, militância, regiões fortes/fracas, prioridades, grupos prioritários e **facções** com satisfação própria. A **unidade** do partido é a satisfação média das facções, que reagem à sua posição percebida. **Compatibilidade** candidato–partido afeta o repasse do fundo partidário.

Fundar um partido: nasce pequeno (popularidade 8, pouca estrutura e tempo de TV), forte só no estado de origem, mas 100% alinhado ao fundador.

**Mundo paródia** (`settings.world = 'parody'`, opção do assistente e do menu): os 9 partidos ganham nome, sigla, cor e líder em tom de sátira (`world/parody.ts`), com a mesma ideologia e mecânica; os adversários sorteados podem ser personagens-caricatura (nome-trocadilho, avatar desenhado, nunca foto). Regras: o elenco cobre esquerda, centro e direita no mesmo tom; personagens começam sem escândalo; eventos marcados com `accusesOpponent` (escândalo, dossiê) nunca escolhem um personagem de paródia; um aviso de sátira fica visível na partida.

## 10. Campanha

**Recursos:** dinheiro, energia (regenera diariamente), militantes, entusiasmo da base, equipe, tempo.

**Escala monetária:** custos e orçamentos escalam com `fator do cargo × eleitorado^0,75` — campanhas para vereador e presidente têm a mesma proporção entre caixa e custos.

**Dinheiro:** repasse inicial do partido + fundo partidário diário + doações (entusiasmo × intenção de voto × capacidade de campanha) + vaquinha da militância + jantares de arrecadação + grupos de interesse simpáticos. **Despesas:** ações, propaganda (paga antecipadamente), folha da equipe (diária; sem caixa, a equipe vai embora), pesquisas e multas.

**Ações** (custo, energia, duração, risco, atributos que importam e público): comício, viagem/caravana, caminhada, porta a porta (depende da militância), campanha regional intensiva, reunião com grupo social, redes sociais, rádio, TV, jornal, podcast, discurso temático, lançar proposta, jantar de arrecadação, mobilizar militância, treinamento de mídia e descanso. Ações repetidas em 3 dias rendem menos. Toda ação com risco pode virar **gafe** (rejeição ↑, credibilidade ↓, notícia ruim).

**Propaganda:** 9 canais (TV, rádio, internet, redes, jornais, podcasts, influenciadores, outdoor, eventos) com custo, alcance, persuasão, ganho de conhecimento, risco e consumo diferente por grupo. Escolha de regiões, público-alvo (segmentação mais cara e mais eficiente), tom (propositivo, comparativo, ataque — ataque desgasta o alvo e aumenta sua rejeição; pode gerar multa da Justiça Eleitoral), tema, duração e intensidade.

**Horário eleitoral gratuito:** nos últimos 35 dias, todos ganham conhecimento proporcional à influência do partido (bem menos em eleições proporcionais).

**Equipe:** coordenador, marqueteiro, assessor de imprensa, estatístico, captador, coordenador regional, social media e preparador de debates, em três níveis.

**Propostas e promessas:** cada proposta desloca sua posição percebida (a tela mostra quem tende a gostar e a desgostar), aumenta a ênfase no tema e vira promessa rastreável. Mais de 5 promessas pendentes custam credibilidade.

**Adversários:** gastam orçamento diariamente em conhecimento, presença nas regiões-foco e persuasão dos grupos prioritários do partido, e atacam quem lidera (ou o jogador, se ele cresce). Dois partidos mais fortes lançam favoritos; os demais, candidaturas menores.

**Medidor de impacto:** a intenção do jogador é medida antes e depois de cada mudança (ação, peça de propaganda, resposta de entrevista, debate, decisão de evento) e de cada etapa do tick diário (adversários, horário gratuito, desgaste, eventos); o resíduo do dia vai para "passagem do tempo". A soma das fontes de um dia é exatamente a variação real. Os registros ficam em `campaign.impact` e alimentam a tela _Impacto_, o diário de campanha e as notificações. O jogo tem um **manual** (`/manual` e `/jogo/manual`) cujas tabelas são lidas diretamente dos dados do motor.

## 11. Entrevistas e debates

**Entrevistas** (TV, rádio, jornal, podcast, rua, coletiva): 3 perguntas sobre os temas que mais importam ao eleitorado local; a última pode ser **hostil**, lembrando escândalos, promessas quebradas, crise no partido ou pesquisas ruins (memória política). Respostas: defender uma proposta (vira promessa e muda posição), técnica, empática, ataque ou evasiva — ou **resposta livre** (classificada em um desses estilos). Nota = estilo × atributos × contexto + ruído; afeta conhecimento, grupos que consomem aquela mídia, rejeição e credibilidade.

**Debates** (eleições majoritárias, datas fixas antes de cada turno): 4 rodadas de pergunta → resposta → ataque → réplica → tréplica. Estratégias: técnica, popular, agressiva, conciliadora, emocional e evasiva, cada uma com atributos, variância, público e efeitos (agressiva anima a base e aumenta rejeição; conciliadora reduz rejeição; emocional sem credibilidade sai pela culatra). Faltar gera "cadeira vazia".

## 12. Eventos

~45 eventos em 10 categorias (política, economia, campanha, mídia, escândalo, crise, oportunidade, partido, adversários, regional), com **gatilho** (fase + condição), **peso** (probabilidade, ajustada por dificuldade), **recarga**, **contexto** (região, adversário, partido, grupo), **opções** com efeitos declarativos e prévia, **encadeamento** (`chain`, ex.: doação suspeita → investigação semanas depois) e **duração** (modificadores diários, choques econômicos de N meses). Eventos com opção única viram notícia e alerta sem parar o jogo.

## 13. Notícias, alertas e memória política

**Notícias** só surgem de fatos da simulação: comícios, gafes, ataques, pesquisas (inclusive "mudança entre jovens" quando um grupo varia), debates, eventos, votações e resultados. **Alertas:** queda de intenção, perda de apoio numa região, caixa acabando, partido dividido, nova pesquisa, convite para debate, projeto pronto para votação, orçamento deficitário, queda de aprovação.

**Memória política:** escândalos, vitórias, derrotas, reformas, promessas, crises, alianças, rompimentos, trocas e fundações de partido. Jornalistas e adversários a usam contra você.

## 14. Governo

Ao vencer para o Executivo: posse em 1º de janeiro (legislativo: fevereiro), **orçamento** da esfera governada, **capital político**, **estabilidade**, **ministros/secretários**, **Legislativo** gerado pela força dos partidos + efeito "puxador" do seu partido.

Tick mensal: economia → execução orçamentária → satisfação dos Pops → aprovação → capital político → grupos de interesse → votações e implementação de leis → eventos → alertas. O mandato termina no início da campanha seguinte do mesmo cargo.

**Aprovação** = satisfação média dos Pops governados + lua de mel (6 meses) − escândalos − déficit. **Satisfação** de cada Pop = economia (desemprego regional, inflação, crescimento, pesados pelas prioridades) + qualidade dos serviços (gasto/referência × eficiência de gestão e ministros, nos temas prioritários) + efeitos diretos das leis + alinhamento ideológico com as leis vigentes.

**Mandato legislativo** (vereador, deputados, senador): o Executivo NPC envia projetos; você vota (fidelidade partidária, grupos e Pops reagem) e pode propor projetos (mais difíceis de aprovar).

## 15. Leis e Congresso

13 áreas (sistema eleitoral, tributação, educação, saúde, segurança, trabalho, previdência, meio ambiente, comércio, administração, federalismo, infraestrutura e instituições), cada uma com 3–4 opções que têm posição ideológica, efeitos econômicos, orçamentários, nos Pops e nos grupos, requisitos, **custo político** e **meses de implementação**. Cada esfera legisla sobre áreas diferentes; áreas constitucionais exigem 3/5.

Nada é aprovado com um clique: o projeto **tramita** (2 meses) e é **votado** em cada casa. Probabilidade de voto de cada partido = sigmoide(ganho de afinidade ideológica com a mudança + coalizão + relação + emendas + concessões + pressão popular × aprovação + negociação + grupos de interesse − oposição − dificuldade). **Negociação:** reuniões (capital político), oferecer pastas (o partido entra na base; aliados distantes incomodam suas facções), liberar emendas (custa orçamento e gera desgaste), concessões (enfraquecem a lei) e mobilização pública.

## 16. Economia (modelo simplificado)

Indicadores: PIB, crescimento, inflação, desemprego, renda, dívida, resultado fiscal, investimento, arrecadação, juros e confiança. A cada mês:

- crescimento → alvo = potencial + leis + confiança + estímulo fiscal − juros − dívida alta + choques;
- inflação → meta + leis + superaquecimento + déficit + choques; juros seguem uma regra de Taylor;
- desemprego pela lei de Okun; renda e PIB pelo crescimento; dívida pelo déficit e pelos juros reais;
- indicadores estaduais acompanham o nacional, com ruído e efeito das leis estaduais.

## 17. Promessas, reeleição e carreira

No fim do mandato cada promessa é **cumprida, parcial ou não cumprida** (lei aprovada, gasto acima da meta, indicador que melhorou, imposto não criado, projeto apresentado). A taxa de cumprimento altera credibilidade e reputação — e a próxima eleição. Reeleição: candidato incumbente (bônus/ônus conforme a satisfação), com limite de 2 mandatos consecutivos no Executivo.

Carreira não é linear: concorrer a qualquer cargo no próximo ciclo (anos passam: economia e cenário político evoluem, idade sobe, fama cai fora do cargo), trocar de partido (custa credibilidade), fundar partido, tirar um ano sabático ou se aposentar.

## 18. Dificuldade

|           | Recursos | Custos | Volatilidade | Eventos | Viés negativo | Adversários | Leis  | Incerteza |
| --------- | -------- | ------ | ------------ | ------- | ------------- | ----------- | ----- | --------- |
| Fácil     | 1,45     | 0,85   | 0,6          | 0,8     | 0,7           | 0,75        | −0,4  | 0,6       |
| Normal    | 1        | 1      | 1            | 1       | 1             | 1           | 0     | 1         |
| Difícil   | 0,75     | 1,15   | 1,25         | 1,2     | 1,3           | 1,25        | +0,35 | 1,3       |
| Simulação | 0,9      | 1,05   | 1,6          | 1,35    | 1,15          | 1,15        | +0,25 | 1,7       |

## 19. Save

O `GameState` inteiro é JSON (≈330 KB), salvo com envelope versionado (`format`, `version`, `savedAt`, resumo). Como o RNG faz parte do estado, carregar e continuar produz exatamente o mesmo futuro que a partida original teria.

## 20. Dados reais (futuro)

Dados demográficos e a malha territorial já vêm do IBGE, com a fonte registrada em `DATA_SOURCE`. Partidos e candidatos têm `provenance` (`fictional` / `historical` / `player`), e o banco tem tabelas `ReferenceParty`, `ReferencePolitician` e `ReferenceElectionResult` com **fonte e data obrigatórias** para dados históricos — mantendo-os separados do cenário fictício.
