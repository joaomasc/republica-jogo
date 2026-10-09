/** Veículos, institutos e emissoras FICTÍCIOS. */
export const NEWS_OUTLETS = [
  'Jornal da República',
  'Folha do Planalto',
  'RNN — Rede Nacional de Notícias',
  'Portal Agora',
  'O Observador',
  'Gazeta Regional',
  'Rádio Cidadania',
  'Diário do Povo',
  'Canal Debate',
] as const;

export const POLLSTERS = [
  'Instituto Vox Brasilis',
  'Ágora Pesquisas',
  'Datamétrica',
  'Panorama Opinião',
  'Instituto Census',
] as const;

export const DEBATE_HOSTS = [
  'TV Horizonte',
  'Rede Nacional (RNN)',
  'Canal Debate',
  'TV Cultura Viva',
] as const;

export const INTERVIEW_HOSTS: Record<string, { outlets: string[]; hosts: string[] }> = {
  tv: {
    outlets: ['TV Horizonte — Roda Política', 'RNN Entrevista'],
    hosts: ['Sandra Moretti', 'Paulo Arantes'],
  },
  radio: {
    outlets: ['Rádio Cidadania — Manhã Brasil', 'Rádio Interior FM'],
    hosts: ['Zé Carlos', 'Beth Nogueira'],
  },
  newspaper: {
    outlets: ['Jornal da República', 'Folha do Planalto'],
    hosts: ['Redação', 'Equipe de Política'],
  },
  podcast: {
    outlets: ['Podcast Bastidores', 'Papo de Praça'],
    hosts: ['Léo & Duda', 'Rafa Mendes'],
  },
  street: { outlets: ['Portal Agora — Na Rua'], hosts: ['Repórter Ana Lis'] },
  press_conference: { outlets: ['Coletiva de imprensa'], hosts: ['Jornalistas credenciados'] },
};
