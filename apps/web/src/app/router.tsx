import type { ComponentType } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import { GameLayout } from '../features/game/GameLayout';
import { MapView } from '../features/map/MapView';
import { MainMenu } from '../features/menu/MainMenu';
import { RootLayout } from './RootLayout';

/**
 * Telas carregadas sob demanda: o menu e a casca do jogo (mapa, barra, dock) vêm no pacote
 * inicial; cada painel e página secundária vira um pedaço próprio (os gráficos — Recharts e
 * dependências — só descem com os painéis que os usam).
 */
type Loader = () => Promise<Record<string, unknown>>;

const LOADERS: Loader[] = [];

/** Rota preguiçosa: carrega o módulo e usa o componente exportado com o nome dado. */
function view(load: Loader, name: string) {
  LOADERS.push(load);
  return async () => ({ Component: (await load())[name] as ComponentType });
}

/**
 * Baixa todos os pedaços em segundo plano (navegador ocioso) depois que o jogo abriu: o painel
 * abre na hora e o jogo continua inteiro mesmo se a conexão cair depois do carregamento.
 */
export function prefetchRoutes(): void {
  for (const load of LOADERS) load().catch(() => undefined);
}

const campaign = () => import('../features/campaign/CampaignView');
const agenda = () => import('../features/agenda/AgendaView');
const ads = () => import('../features/campaign/AdsView');
const finance = () => import('../features/campaign/FinanceView');
const polls = () => import('../features/polls/PollsView');
const impact = () => import('../features/impact/ImpactView');
const pops = () => import('../features/pops/PopsView');
const election = () => import('../features/election/ElectionView');
const candidate = () => import('../features/candidate/CandidateView');
const party = () => import('../features/party/PartyView');
const events = () => import('../features/events/EventsView');
const government = () => import('../features/government/GovernmentView');
const budget = () => import('../features/government/BudgetView');
const laws = () => import('../features/government/LawsView');
const congress = () => import('../features/government/CongressView');
const groups = () => import('../features/government/GroupsView');
const economy = () => import('../features/government/EconomyView');
const market = () => import('../features/economy/MarketView');
const industry = () => import('../features/economy/IndustryView');
const works = () => import('../features/works/WorksView');
const trade = () => import('../features/economy/TradeView');
const decrees = () => import('../features/executive/DecreesView');
const nation = () => import('../features/nation/NationView');
const region = () => import('../features/region/RegionPanel');
const history = () => import('../features/history/HistoryView');
const career = () => import('../features/career/CareerView');
const manual = () => import('../features/manual/Manual');
const newGame = () => import('../features/newgame/NewGamePage');
const loadGame = () => import('../features/menu/LoadGamePage');
const sandbox = () => import('../features/menu/SandboxPage');
const scenarios = () => import('../features/menu/ScenariosPage');
const settings = () => import('../features/menu/SettingsPage');
const achievements = () => import('../features/achievements/AchievementsPage');
const diary = () => import('../features/changelog/DevDiaryPage');

export const router = createBrowserRouter(
  [
    {
      element: <RootLayout />,
      children: [
        { path: '/', element: <MainMenu /> },
        { path: '/novo', lazy: view(newGame, 'NewGamePage') },
        { path: '/carregar', lazy: view(loadGame, 'LoadGamePage') },
        { path: '/sandbox', lazy: view(sandbox, 'SandboxPage') },
        { path: '/cenarios', lazy: view(scenarios, 'ScenariosPage') },
        { path: '/config', lazy: view(settings, 'SettingsPage') },
        { path: '/manual', lazy: view(manual, 'ManualPage') },
        { path: '/conquistas', lazy: view(achievements, 'AchievementsPage') },
        { path: '/diario', lazy: view(diary, 'DevDiaryPage') },
        {
          path: '/jogo',
          element: <GameLayout />,
          children: [
            { index: true, element: <MapView /> },
            { path: 'campanha', lazy: view(campaign, 'CampaignView') },
            { path: 'agenda', lazy: view(agenda, 'AgendaView') },
            { path: 'propaganda', lazy: view(ads, 'AdsView') },
            { path: 'financas', lazy: view(finance, 'FinanceView') },
            { path: 'pesquisas', lazy: view(polls, 'PollsView') },
            { path: 'impacto', lazy: view(impact, 'ImpactView') },
            { path: 'eleitores', lazy: view(pops, 'PopsView') },
            { path: 'eleicao', lazy: view(election, 'ElectionView') },
            { path: 'candidato', lazy: view(candidate, 'CandidateView') },
            { path: 'partido', lazy: view(party, 'PartyView') },
            { path: 'eventos', lazy: view(events, 'EventsView') },
            { path: 'governo', lazy: view(government, 'GovernmentView') },
            { path: 'orcamento', lazy: view(budget, 'BudgetView') },
            { path: 'leis', lazy: view(laws, 'LawsView') },
            { path: 'congresso', lazy: view(congress, 'CongressView') },
            { path: 'grupos', lazy: view(groups, 'GroupsView') },
            { path: 'economia', lazy: view(economy, 'EconomyView') },
            { path: 'mercado', lazy: view(market, 'MarketView') },
            { path: 'industria', lazy: view(industry, 'IndustryView') },
            { path: 'obras', lazy: view(works, 'WorksView') },
            { path: 'comercio', lazy: view(trade, 'TradeView') },
            { path: 'decretos', lazy: view(decrees, 'DecreesView') },
            { path: 'nacao', lazy: view(nation, 'NationView') },
            { path: 'regiao/:unitId', lazy: view(region, 'RegionPanel') },
            { path: 'historia', lazy: view(history, 'HistoryView') },
            { path: 'carreira', lazy: view(career, 'CareerView') },
            { path: 'manual', lazy: view(manual, 'ManualView') },
          ],
        },
        { path: '*', element: <Navigate to="/" replace /> },
      ],
    },
  ],
  // Respeita o subcaminho da publicação (ex.: /republica/ no GitHub Pages).
  { basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/' },
);
