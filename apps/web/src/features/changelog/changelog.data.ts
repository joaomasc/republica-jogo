/**
 * Diário de desenvolvimento: cada commit publicado é uma versão.
 * Ao lançar uma versão nova, acrescente a entrada NO TOPO e atualize `version` nos package.json.
 */
export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  /** Resumo em uma frase. */
  summary: string;
  /** Novidades, em linguagem de jogador. */
  items: string[];
  commit?: string;
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '0.8.0',
    date: '2026-10-12',
    title: 'Causalidade: todo número com motivo',
    commit: '6c36a7e',
    summary:
      'Nada mais muda "por acaso": intenção de voto, aprovação e eventos dizem por que mudaram, e a entressafra virou uma pré-campanha de verdade.',
    items: [
      '"Por que mudou?" na barra superior, nas pesquisas e na disputa: as 3 principais causas da semana, com o nome de quem fez o quê.',
      'Pesquisas honestas: a margem inclui o viés de cada instituto, e a tela separa o que a pesquisa mostra do que mudou de fato.',
      'Adversários sem sorte: cada rival faz campanha conforme orçamento, habilidade e estilo; ataques vêm com motivo.',
      'O início da semana (pauta nova, temas que esfriam, rivais aderindo) deixou de mexer nos votos às escondidas.',
      'Aprovação sem ruído: o Gabinete mostra para onde ela está indo (satisfação, lua de mel, desgaste, escândalos, déficit) e o que a moveu no mês.',
      'Eventos com gatilho: saúde, segurança, economia, clima e outros temas mudam a chance de cada evento; todo evento diz "por que agora?" ou se é um imprevisto.',
      'Consequências chegam: continuações de eventos no mandato (como "propina exposta") antes nunca disparavam.',
      'Pré-campanha: escolha a próxima eleição e avance de marco em marco (janela partidária, convenções...), com uma preparação por bloco e resumo do que mudou.',
      'Base eleitoral, caixa da pré-campanha, alianças, fama, credibilidade e reputação entram na campanha seguinte, com prévia "se a campanha começasse hoje".',
      'Ocupações com efeito real (consultor junta caixa, ONG faz base, cargo internacional afasta da base) e saldo de fama já descontado.',
      'Popularidade dos partidos responde a quem governa e às eleições, não a sorteio.',
      'Risco de gafe mostrado é o risco real da ação.',
      'Manual atualizado: pesquisas, eventos, aprovação, medidor de impacto e pré-campanha.',
    ],
  },
  {
    version: '0.7.0',
    date: '2026-10-12',
    title: 'Dinamismo: mil eventos, gabinete, rivais e carreira',
    commit: '8bd3dd2',
    summary:
      'O maior pacote até aqui: o jogo ganhou ritmo no governo, memória entre eleições e vida entre um mandato e outro.',
    items: [
      'Cerca de 1.100 eventos (eram 56): por prefeitura, governo estadual, Presidência, mandato legislativo e campanha, 6 por estado, um por cidade-polo, cerca de 50 histórias em etapas, eventos de entressafra e da Justiça Eleitoral.',
      'Calendário: chuvas de verão, seca e queimadas, frio no Sul, Carnaval, São João, Círio, Oktoberfest. Nenhum evento se repete em menos de 18 meses de mandato.',
      'Gabinete mensal: todo mês, balanço, pauta do mês, o que a oposição vai fazer e 3 cartas de decisão.',
      'Governar desgasta: depois da lua de mel a aprovação cai aos poucos; pauta, inaugurações e renovação da equipe seguram o desgaste.',
      'Ministros com lealdade, ambição e escândalo latente; repasses de governador e presidente dependem do alinhamento político.',
      'Objetivos de mandato: escolha até 3 no início e ganhe reputação ao cumpri-los.',
      '2º turno de verdade: negocie o apoio dos derrotados (cargo ou pauta) — o rival também negocia.',
      'Vice na chapa: do próprio partido (base feliz) ou de um aliado (mais eleitores, mais riscos).',
      'Rivais recorrentes: adversários voltam nas eleições seguintes com memória; o nêmesis tem eventos próprios.',
      'Entressafra: 10 ocupações fora do cargo (comentarista, professor, presidente do partido...) com acontecimentos a cada 6 meses.',
      'Justiça e dinheiro: caixa 2 deixa rastro, prestação de contas pode ser rejeitada, cassação e Ficha Limpa.',
      'Campanha: 60 cartas novas na reunião semanal, 255 perguntas novas de entrevista, bolha das redes, memes de gafes e convenção partidária.',
      '"Por que perdi?" no resultado da eleição, dicas da primeira partida, selo de porte do partido, prazos das promessas.',
      '60 conquistas, placar de legado da carreira e desafio da semana (mesma semente para todos).',
      'Diário de desenvolvimento no menu inicial (esta tela).',
    ],
  },
  {
    version: '0.6.0',
    date: '2026-10-10',
    title: 'Cidades-polo jogáveis',
    summary: 'As eleições municipais deixaram de ser só nas capitais.',
    commit: '639a8c3',
    items: [
      '123 cidades jogáveis: capitais, metrópoles e capitais regionais da REGIC 2018 do IBGE, como Caxias do Sul, Santa Maria e Passo Fundo.',
      'Mapa da cidade com o contorno real do município e as zonas eleitorais recortadas nele.',
      'Eleitorado pela população do Censo 2022 e câmara municipal no teto constitucional de vereadores.',
      'Prefeitos de outras cidades, leis, orçamento, obras e indicadores locais por cidade.',
    ],
  },
  {
    version: '0.5.0',
    date: '2026-10-10',
    title: 'Responsividade em telas pequenas',
    summary: 'Nada mais fica escondido ou sobreposto em monitores menores.',
    commit: '6a5b112',
    items: [
      'Barra lateral que adensa os ícones e recolhe grupos quando falta altura.',
      'Barra superior mostra os indicadores que cabem e o resto num botão "+N".',
      'Painéis que se adaptam à própria largura; tabelas largas com rolagem.',
      'Menu, criação de personagem e reunião semanal cabem em telas baixas.',
    ],
  },
  {
    version: '0.4.0',
    date: '2026-10-10',
    title: 'Mundo "Brasil real"',
    summary: 'Os 30 partidos registrados no TSE, com logos oficiais.',
    commit: '34d67cb',
    items: [
      'Novo mundo padrão com os 30 partidos do TSE: nome, sigla, número e logo.',
      'Congresso inicial parecido com as bancadas atuais.',
      'Cláusula de barreira, sorteio de governadores mais realista e a maior oposição sempre lança candidato.',
      'Logos pré-carregados para aparecer na hora.',
    ],
  },
  {
    version: '0.3.0',
    date: '2026-10-09',
    title: 'Promessas, obras e revolta popular',
    summary: 'Governar ficou mais concreto: promessas ao vivo, obras e ruas que reagem.',
    commit: 'ff2cb33',
    items: [
      'Promessas cumpridas assim que a lei passa, com o motivo do status.',
      'Obras públicas por esfera, com empregos, melhora dos serviços e inaugurações.',
      'Interface por cargo: cidade para prefeito, estado para governador, país para presidente.',
      'Clima nas ruas em 7 degraus, até impeachment ou cassação.',
      'Cenários Prefeitura de Salvador e Governo da Bahia.',
    ],
  },
  {
    version: '0.2.1',
    date: '2026-10-09',
    title: 'Jogue online',
    summary: 'Link para jogar no navegador e instruções de publicação.',
    commit: 'd0476ef',
    items: ['README com o link do jogo publicado e o passo a passo de publicação.'],
  },
  {
    version: '0.2.0',
    date: '2026-10-09',
    title: 'Publicação no GitHub Pages',
    summary: 'O jogo passou a ter endereço público.',
    commit: '4e811f4',
    items: [
      'Publicação com um comando (npm run deploy:pages).',
      'Menu inicial com o número real de áreas de leis.',
    ],
  },
  {
    version: '0.1.0',
    date: '2026-10-09',
    title: 'República',
    summary: 'Primeira versão do simulador político e econômico.',
    commit: '4faa7c9',
    items: [
      'Campanha eleitoral do município à Presidência: agenda, propaganda, entrevistas, debates e pesquisas.',
      'Mandato com economia industrial: mercado, indústrias em 27 estados e comércio exterior.',
      'Leis no estilo Victoria 3 e processo legislativo completo (PL, PLP, PEC, MP, veto, impeachment).',
      'Decretos, Nação, grupos de interesse e greves.',
    ],
  },
];

export const APP_VERSION = CHANGELOG[0]!.version;
