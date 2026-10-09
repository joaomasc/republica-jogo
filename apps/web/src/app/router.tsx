import { createBrowserRouter, Navigate } from 'react-router';
import { CampaignView } from '../features/campaign/CampaignView';
import { AdsView } from '../features/campaign/AdsView';
import { AgendaView } from '../features/agenda/AgendaView';
import { FinanceView } from '../features/campaign/FinanceView';
import { CandidateView } from '../features/candidate/CandidateView';
import { CareerView } from '../features/career/CareerView';
import { ElectionView } from '../features/election/ElectionView';
import { IndustryView } from '../features/economy/IndustryView';
import { MarketView } from '../features/economy/MarketView';
import { TradeView } from '../features/economy/TradeView';
import { DecreesView } from '../features/executive/DecreesView';
import { NationView } from '../features/nation/NationView';
import { WorksView } from '../features/works/WorksView';
import { RegionPanel } from '../features/region/RegionPanel';
import { EventsView } from '../features/events/EventsView';
import { GameLayout } from '../features/game/GameLayout';
import { BudgetView } from '../features/government/BudgetView';
import { CongressView } from '../features/government/CongressView';
import { EconomyView } from '../features/government/EconomyView';
import { GovernmentView } from '../features/government/GovernmentView';
import { GroupsView } from '../features/government/GroupsView';
import { LawsView } from '../features/government/LawsView';
import { HistoryView } from '../features/history/HistoryView';
import { ImpactView } from '../features/impact/ImpactView';
import { ManualPage, ManualView } from '../features/manual/Manual';
import { MapView } from '../features/map/MapView';
import { LoadGamePage } from '../features/menu/LoadGamePage';
import { MainMenu } from '../features/menu/MainMenu';
import { SandboxPage } from '../features/menu/SandboxPage';
import { ScenariosPage } from '../features/menu/ScenariosPage';
import { SettingsPage } from '../features/menu/SettingsPage';
import { NewGamePage } from '../features/newgame/NewGamePage';
import { PartyView } from '../features/party/PartyView';
import { PollsView } from '../features/polls/PollsView';
import { PopsView } from '../features/pops/PopsView';
import { RootLayout } from './RootLayout';

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/', element: <MainMenu /> },
      { path: '/novo', element: <NewGamePage /> },
      { path: '/carregar', element: <LoadGamePage /> },
      { path: '/sandbox', element: <SandboxPage /> },
      { path: '/cenarios', element: <ScenariosPage /> },
      { path: '/config', element: <SettingsPage /> },
      { path: '/manual', element: <ManualPage /> },
      {
        path: '/jogo',
        element: <GameLayout />,
        children: [
          { index: true, element: <MapView /> },
          { path: 'campanha', element: <CampaignView /> },
          { path: 'agenda', element: <AgendaView /> },
          { path: 'propaganda', element: <AdsView /> },
          { path: 'financas', element: <FinanceView /> },
          { path: 'pesquisas', element: <PollsView /> },
          { path: 'impacto', element: <ImpactView /> },
          { path: 'eleitores', element: <PopsView /> },
          { path: 'eleicao', element: <ElectionView /> },
          { path: 'candidato', element: <CandidateView /> },
          { path: 'partido', element: <PartyView /> },
          { path: 'eventos', element: <EventsView /> },
          { path: 'governo', element: <GovernmentView /> },
          { path: 'orcamento', element: <BudgetView /> },
          { path: 'leis', element: <LawsView /> },
          { path: 'congresso', element: <CongressView /> },
          { path: 'grupos', element: <GroupsView /> },
          { path: 'economia', element: <EconomyView /> },
          { path: 'mercado', element: <MarketView /> },
          { path: 'industria', element: <IndustryView /> },
          { path: 'obras', element: <WorksView /> },
          { path: 'comercio', element: <TradeView /> },
          { path: 'decretos', element: <DecreesView /> },
          { path: 'nacao', element: <NationView /> },
          { path: 'regiao/:unitId', element: <RegionPanel /> },
          { path: 'historia', element: <HistoryView /> },
          { path: 'carreira', element: <CareerView /> },
          { path: 'manual', element: <ManualView /> },
        ],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
],
  // Respeita o subcaminho da publicação (ex.: /republica/ no GitHub Pages).
  { basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/' },
);
