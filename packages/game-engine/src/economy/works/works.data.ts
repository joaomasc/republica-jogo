import type { OfficeLevel } from '../../election/offices';
import type { IssueId } from '../../ideology/issues';
import type { BudgetCategory } from '../types';

/**
 * Obras públicas: o que prefeituras, governos estaduais e o governo federal constroem. Separadas
 * da fila industrial (fábricas, minas). Valores de custo em R$ bi para o porte médio.
 */
export interface PublicWorkType {
  id: string;
  name: string;
  icon: string;
  description: string;
  /** Esferas que fazem esta obra. */
  levels: OfficeLevel[];
  /** Serviço público que melhora ao concluir. */
  category: BudgetCategory;
  /** Tema que os eleitores associam à obra. */
  issue: IssueId;
  /** Custo (R$ bi) e prazo (meses) no porte médio. */
  cost: number;
  months: number;
  /** Empregos permanentes por R$ bi investido (operação depois de pronta). */
  permanentJobsPerBi: number;
  /** Ganho de qualidade do serviço da esfera (fração) por obra média concluída. */
  serviceGain: number;
  /** Atrai empresas privadas: níveis de edifícios privados que começam a ser construídos no estado ao inaugurar. */
  attractsInvestment?: number;
}

export type WorkSize = 'small' | 'medium' | 'large';

export const WORK_SIZES: Record<WorkSize, { name: string; cost: number; months: number; impact: number }> = {
  small: { name: 'Pequena', cost: 0.4, months: 0.7, impact: 0.5 },
  medium: { name: 'Média', cost: 1, months: 1, impact: 1 },
  large: { name: 'Grande', cost: 2.5, months: 1.4, impact: 2.2 },
};

export const PUBLIC_WORK_TYPES: PublicWorkType[] = [
  // ── Prefeitura ──
  { id: 'creche', name: 'Creches e escolas municipais', icon: 'graduation-cap', description: 'Vagas em creches e ensino fundamental.', levels: ['municipal'], category: 'education', issue: 'education', cost: 0.25, months: 10, permanentJobsPerBi: 2500, serviceGain: 0.04 },
  { id: 'ubs', name: 'Postos de saúde (UBS)', icon: 'heart-pulse', description: 'Atenção básica perto de casa: consultas, vacinas, pré-natal.', levels: ['municipal'], category: 'health', issue: 'healthcare', cost: 0.2, months: 9, permanentJobsPerBi: 2200, serviceGain: 0.04 },
  { id: 'saneamento_mun', name: 'Saneamento básico', icon: 'droplets', description: 'Água tratada e esgoto: menos doenças, bairros valorizados.', levels: ['municipal'], category: 'health', issue: 'healthcare', cost: 0.6, months: 18, permanentJobsPerBi: 300, serviceGain: 0.03 },
  { id: 'pavimentacao', name: 'Pavimentação e drenagem', icon: 'construction', description: 'Asfalto, calçadas e drenagem contra enchentes.', levels: ['municipal'], category: 'infrastructure', issue: 'infrastructure', cost: 0.3, months: 8, permanentJobsPerBi: 100, serviceGain: 0.04 },
  { id: 'habitacao_mun', name: 'Habitação popular', icon: 'home', description: 'Conjuntos habitacionais para famílias de baixa renda.', levels: ['municipal'], category: 'social', issue: 'housing', cost: 0.5, months: 16, permanentJobsPerBi: 150, serviceGain: 0.04 },
  { id: 'corredor', name: 'Corredor de ônibus (BRT)', icon: 'bus', description: 'Faixas exclusivas e estações: viagens mais rápidas.', levels: ['municipal'], category: 'infrastructure', issue: 'transport', cost: 0.8, months: 18, permanentJobsPerBi: 600, serviceGain: 0.05 },
  { id: 'distrito_industrial', name: 'Distrito industrial', icon: 'factory', description: 'Terrenos, acesso e incentivos: atrai empresas privadas para a cidade.', levels: ['municipal'], category: 'industry', issue: 'jobs', cost: 0.35, months: 12, permanentJobsPerBi: 200, serviceGain: 0, attractsInvestment: 4 },
  // ── Governo estadual ──
  { id: 'hospital_regional', name: 'Hospital regional', icon: 'heart-pulse', description: 'Leitos, UTI e especialidades no interior.', levels: ['estadual'], category: 'health', issue: 'healthcare', cost: 1, months: 20, permanentJobsPerBi: 1800, serviceGain: 0.04 },
  { id: 'escola_tecnica', name: 'Escolas técnicas', icon: 'graduation-cap', description: 'Ensino médio técnico ligado às empresas da região.', levels: ['estadual'], category: 'education', issue: 'education', cost: 0.6, months: 14, permanentJobsPerBi: 1600, serviceGain: 0.04 },
  { id: 'rodovia_estadual', name: 'Rodovia estadual', icon: 'truck', description: 'Duplicação e pavimentação de estradas estaduais.', levels: ['estadual'], category: 'infrastructure', issue: 'infrastructure', cost: 1.5, months: 18, permanentJobsPerBi: 150, serviceGain: 0.04 },
  { id: 'seguranca', name: 'Batalhões e delegacias', icon: 'shield', description: 'Mais policiamento e investigação.', levels: ['estadual'], category: 'security', issue: 'security', cost: 0.5, months: 12, permanentJobsPerBi: 1500, serviceGain: 0.05 },
  { id: 'saneamento_est', name: 'Saneamento estadual', icon: 'droplets', description: 'Estações de tratamento e redes de esgoto em várias cidades.', levels: ['estadual'], category: 'health', issue: 'healthcare', cost: 1.5, months: 24, permanentJobsPerBi: 300, serviceGain: 0.03 },
  { id: 'metro', name: 'Metrô e trens urbanos', icon: 'bus', description: 'Transporte de massa na região metropolitana.', levels: ['estadual'], category: 'infrastructure', issue: 'transport', cost: 6, months: 36, permanentJobsPerBi: 800, serviceGain: 0.06 },
  { id: 'polo_industrial', name: 'Polo industrial', icon: 'factory', description: 'Infraestrutura e incentivos fiscais para atrair fábricas ao estado.', levels: ['estadual'], category: 'industry', issue: 'jobs', cost: 1.2, months: 18, permanentJobsPerBi: 300, serviceGain: 0, attractsInvestment: 10 },
  { id: 'habitacao_est', name: 'Programa estadual de moradia', icon: 'home', description: 'Moradias populares em parceria com municípios.', levels: ['estadual'], category: 'social', issue: 'housing', cost: 1.2, months: 18, permanentJobsPerBi: 150, serviceGain: 0.04 },
  // ── Governo federal ──
  { id: 'ferrovia', name: 'Ferrovia', icon: 'truck', description: 'Escoamento de grãos e minérios mais barato.', levels: ['federal'], category: 'infrastructure', issue: 'infrastructure', cost: 12, months: 36, permanentJobsPerBi: 400, serviceGain: 0.04, attractsInvestment: 6 },
  { id: 'rodovia_federal', name: 'Rodovia federal', icon: 'truck', description: 'Duplicação de BRs e novas estradas.', levels: ['federal'], category: 'infrastructure', issue: 'infrastructure', cost: 4, months: 24, permanentJobsPerBi: 150, serviceGain: 0.03 },
  { id: 'universidade', name: 'Universidade e institutos federais', icon: 'graduation-cap', description: 'Novos campi e cursos técnicos superiores.', levels: ['federal'], category: 'education', issue: 'education', cost: 2, months: 24, permanentJobsPerBi: 2500, serviceGain: 0.04 },
  { id: 'hospital_federal', name: 'Hospitais federais', icon: 'heart-pulse', description: 'Hospitais universitários e de alta complexidade.', levels: ['federal'], category: 'health', issue: 'healthcare', cost: 1.5, months: 24, permanentJobsPerBi: 1800, serviceGain: 0.03 },
  { id: 'moradia_nacional', name: 'Programa nacional de moradia', icon: 'home', description: 'Milhares de moradias populares financiadas pela União.', levels: ['federal'], category: 'social', issue: 'housing', cost: 6, months: 24, permanentJobsPerBi: 150, serviceGain: 0.05 },
  { id: 'porto', name: 'Portos e aeroportos', icon: 'ship', description: 'Mais capacidade logística para exportar e receber turistas.', levels: ['federal'], category: 'infrastructure', issue: 'infrastructure', cost: 3, months: 30, permanentJobsPerBi: 600, serviceGain: 0.03, attractsInvestment: 6 },
];

export function getWorkType(id: string): PublicWorkType | undefined {
  return PUBLIC_WORK_TYPES.find((t) => t.id === id);
}
