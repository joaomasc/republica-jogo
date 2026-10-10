# Mundo "Brasil real" — partidos do TSE

O mundo **Brasil real** (padrão ao criar um novo jogo) usa os **30 partidos com registro no TSE em outubro de 2026**, com nome, sigla, número de urna e logo oficiais. Os mundos **Fictício** e **Paródia** continuam disponíveis.

- **Dados:** [`packages/game-engine/src/parties/realParties.data.ts`](../packages/game-engine/src/parties/realParties.data.ts)
- **Logos:** [`apps/web/public/partidos/`](../apps/web/public/partidos/) (PNG/JPG de até 330 px de largura, renderizados pelo Wikimedia)
- **Fontes:** TSE (partidos registrados) e Wikipédia, [Lista de partidos políticos do Brasil](https://pt.wikipedia.org/wiki/Lista_de_partidos_pol%C3%ADticos_do_Brasil) (sigla, número, registro e presidência nacional).

## O que é real e o que é modelo

| Real                                                   | Modelo do jogo (aproximação)                                         |
| ------------------------------------------------------ | -------------------------------------------------------------------- |
| Nome, sigla, número, logo                              | Vetor ideológico nos 9 eixos                                         |
| Presidência nacional (só exibida na tela do partido)   | Popularidade, influência, dinheiro, militância                       |
| Federações e fusões citadas nas descrições             | Regiões fortes/fracas, prioridades, facções                          |
| Presidente da República no início de 2026 (PT)         | Composição inicial do Congresso (calibrada para lembrar as bancadas) |

Candidatos adversários, eventos e escândalos continuam **fictícios**. A liderança do partido só aparece como rótulo informativo e nunca é usada em textos gerados (notícias, IA, eventos).

**Calibragem:** com os valores atuais, a Câmara inicial fica, em média, com PL ≈ 82, PT ≈ 65, União ≈ 54, PP ≈ 49, PSD ≈ 47, MDB ≈ 46, Republicanos ≈ 44, PDT ≈ 18, PSB ≈ 17, Podemos ≈ 15, PSDB ≈ 14, PSOL ≈ 13 e partidos menores abaixo de 10. Siglas sem bancada (UP, PSTU, PCB, PCO, Democrata, Agir, DC, Mobiliza, PRTB) ficam abaixo da cláusula `congress.minSeatShare` e não elegem ninguém.

## Atualizando

Quando houver fusão, incorporação, mudança de nome ou novo registro:

1. Edite `REAL_PARTIES` (o teste `tests/real-world.test.ts` exige ids, siglas e números únicos e um logo existente para cada partido; ajuste a contagem de 30).
2. Ponha o logo em `apps/web/public/partidos/<id>.png`. De preferência, use o thumbnail do Wikimedia Commons (`prop=imageinfo&iiurlwidth=256`), em vez de um SVG bruto.
3. Atualize a tabela de créditos abaixo e a data em `REAL_WORLD_DISCLAIMER` (`src/world/parody.ts`).

## Créditos dos logos

Todos os arquivos vêm do Wikimedia Commons. A maioria é logotipo simples marcado como domínio público (PD-textlogo). Alguns exigem atribuição:

- **PCB:** "PCB logo", Partido Comunista Brasileiro, licença [CC BY-SA 2.5 BR](https://creativecommons.org/licenses/by-sa/2.5/br/deed.pt_BR). O arquivo deste repositório é uma redução em PNG do original e mantém a mesma licença.
- **PSTU:** "Logo PSTU", PSTU, licença de atribuição. Veja a página do arquivo.

Domínio público no Commons não afasta os **direitos de marca** dos partidos. Os logos aparecem aqui apenas para identificar cada legenda num simulador sem fins comerciais.

| Sigla         | Nº  | Arquivo             | Origem (Wikimedia Commons)                                                                                                                                | Licença         |
| ------------- | --- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| PL            | 22  | `pl.png`            | [Partido Liberal (Brazil) logo.svg](https://commons.wikimedia.org/wiki/File:Partido_Liberal_(Brazil)_logo.svg)                                            | Domínio público |
| PT            | 13  | `pt.png`            | [PT (Brazil) logo 2021.svg](https://commons.wikimedia.org/wiki/File:PT_(Brazil)_logo_2021.svg)                                                            | Domínio público |
| UNIÃO         | 44  | `uniao.png`         | [União Brasil logo.svg](https://commons.wikimedia.org/wiki/File:Uni%C3%A3o_Brasil_logo.svg)                                                               | Domínio público |
| PP            | 11  | `pp.png`            | [Progressistas logo.png](https://commons.wikimedia.org/wiki/File:Progressistas_logo.png)                                                                  | Domínio público |
| PSD           | 55  | `psd.png`           | [PSD Brazil logo.svg](https://commons.wikimedia.org/wiki/File:PSD_Brazil_logo.svg)                                                                        | Domínio público |
| REPUBLICANOS  | 10  | `republicanos.png`  | [Republicanos (Brazil) wordmark.svg](https://commons.wikimedia.org/wiki/File:Republicanos_(Brazil)_wordmark.svg)                                          | Domínio público |
| MDB           | 15  | `mdb.png`           | [Movimento Democrático Brasileiro (2017).png](https://commons.wikimedia.org/wiki/File:Movimento_Democr%C3%A1tico_Brasileiro_(2017).png)                   | Domínio público |
| PDT           | 12  | `pdt.png`           | [PDT logo 2026 (cropped).png](https://commons.wikimedia.org/wiki/File:PDT_logo_2026_(cropped).png)                                                        | Domínio público |
| PSB           | 40  | `psb.png`           | [Logo of the Brazilian Socialist Party (wordmark color).svg](https://commons.wikimedia.org/wiki/File:Logo_of_the_Brazilian_Socialist_Party_(wordmark_color).svg) | Domínio público |
| PODE          | 20  | `podemos.png`       | [Podemos (Brasil) logo.svg](https://commons.wikimedia.org/wiki/File:Podemos_(Brasil)_logo.svg)                                                            | Domínio público |
| PSDB          | 45  | `psdb.png`          | [Logo of the Brazilian Social Democracy Party (2023).svg](https://commons.wikimedia.org/wiki/File:Logo_of_the_Brazilian_Social_Democracy_Party_(2023).svg) | Domínio público |
| PSOL          | 50  | `psol.png`          | [Logo PSOL roxo.svg](https://commons.wikimedia.org/wiki/File:Logo_PSOL_roxo.svg)                                                                          | Domínio público |
| PCdoB         | 65  | `pcdob.png`         | [PCdoB logo.svg](https://commons.wikimedia.org/wiki/File:PCdoB_logo.svg)                                                                                  | Domínio público |
| AVANTE        | 70  | `avante.png`        | [Avante 70 (Brasil) logo.svg](https://commons.wikimedia.org/wiki/File:Avante_70_(Brasil)_logo.svg)                                                        | Domínio público |
| SOLIDARIEDADE | 77  | `solidariedade.png` | [Logomarca do Partido Solidariedade.png](https://commons.wikimedia.org/wiki/File:Logomarca_do_Partido_Solidariedade.png)                                  | Domínio público |
| PRD           | 25  | `prd.png`           | [Partido Renovação Democrática logo.svg](https://commons.wikimedia.org/wiki/File:Partido_Renova%C3%A7%C3%A3o_Democr%C3%A1tica_logo.svg)                   | Domínio público |
| PV            | 43  | `pv.png`            | [PV Logo.svg](https://commons.wikimedia.org/wiki/File:PV_Logo.svg)                                                                                        | Domínio público |
| NOVO          | 30  | `novo.png`          | [Partido Novo logo (2023).svg](https://commons.wikimedia.org/wiki/File:Partido_Novo_logo_(2023).svg)                                                      | Domínio público |
| CIDADANIA     | 23  | `cidadania.png`     | [Logo do Cidadania 23.png](https://commons.wikimedia.org/wiki/File:Logo_do_Cidadania_23.png)                                                              | Domínio público |
| REDE          | 18  | `rede.png`          | [Rede Sustentabilidade logo.svg](https://commons.wikimedia.org/wiki/File:Rede_Sustentabilidade_logo.svg)                                                  | Domínio público |
| MISSÃO        | 14  | `missao.jpg`        | [Logo Partido Missão.jpg](https://commons.wikimedia.org/wiki/File:Logo_Partido_Miss%C3%A3o.jpg)                                                           | CC0             |
| MOBILIZA      | 33  | `mobiliza.png`      | [Logomarca Partido Mobiliza.png](https://commons.wikimedia.org/wiki/File:Logomarca_Partido_Mobiliza.png)                                                  | Domínio público |
| AGIR          | 36  | `agir.png`          | [Logomarca do Partido Agir.png](https://commons.wikimedia.org/wiki/File:Logomarca_do_Partido_Agir.png)                                                    | Domínio público |
| DC            | 27  | `dc.png`            | [Bandeira-democracia-cristã.png](https://commons.wikimedia.org/wiki/File:Bandeira-democracia-crist%C3%A3.png)                                             | Domínio público |
| PRTB          | 28  | `prtb.png`          | [PRTB-LOGO-03-1024x393.png](https://commons.wikimedia.org/wiki/File:PRTB-LOGO-03-1024x393.png)                                                            | Domínio público |
| DEMOCRATA     | 35  | `democrata.png`     | [Logomarca O Democrata 35.png](https://commons.wikimedia.org/wiki/File:Logomarca_O_Democrata_35.png)                                                      | Domínio público |
| UP            | 80  | `up.png`            | [Unidade Popular logo.svg](https://commons.wikimedia.org/wiki/File:Unidade_Popular_logo.svg) (arte branca, exibida sobre fundo vermelho)                  | Domínio público |
| PSTU          | 16  | `pstu.png`          | [Logo PSTU.png](https://commons.wikimedia.org/wiki/File:Logo_PSTU.png)                                                                                    | Atribuição      |
| PCB           | 21  | `pcb.png`           | [PCB logo.svg](https://commons.wikimedia.org/wiki/File:PCB_logo.svg)                                                                                      | CC BY-SA 2.5 BR |
| PCO           | 29  | `pco.jpg`           | [PCO29.jpg](https://commons.wikimedia.org/wiki/File:PCO29.jpg)                                                                                            | Domínio público |
