import { mapUnits } from '@republica/game-engine';
import { useEffect, useMemo, useRef, type CSSProperties } from 'react';
import { Navigate, Outlet, useLocation, useMatch, useNavigate } from 'react-router';
import { Toasts } from '../../components/Toasts';
import { useGame, useGameState } from '../../store/gameStore';
import { useUi } from '../../store/uiStore';
import { DecisionCenter } from '../decisions/DecisionCenter';
import { MapLegendHud } from '../map/MapLegend';
import { MapStage } from '../map/MapStage';
import { suggestedMode } from '../map/mapModes';
import { DebateModal } from '../media/DebateModal';
import { EventModal } from '../events/EventModal';
import { InterviewModal } from '../media/InterviewModal';
import { useAchievementTracker } from '../achievements/useAchievementTracker';
import { CabinetModal } from '../cabinet/CabinetModal';
import { WeekModal } from '../week/WeekModal';
import { Dock } from './Dock';
import {
  clusterWidth,
  isCompactHud,
  LAYOUT,
  panelWidthPx,
  useViewportHeight,
  useViewportWidth,
} from './layout';
import { panelSegment, routeMeta, scopedItem } from './navigation';
import { Outliner } from './Outliner';
import { PanelHost } from './PanelHost';
import { TimeControls } from './TimeControls';
import { TopBar } from './TopBar';

/** Leva o jogador à tela certa quando a fase do jogo muda (dia da eleição, posse, fim de mandato...). */
function PhaseRouter() {
  const phase = useGame((s) => s.game?.phase);
  const navigate = useNavigate();
  const location = useLocation();
  const previous = useRef(phase);
  useEffect(() => {
    if (phase === previous.current) return;
    previous.current = phase;
    if (phase === 'election_day' || phase === 'results') navigate('/jogo/eleicao');
    else if (phase === 'career' || phase === 'retired') navigate('/jogo/carreira');
    else if (phase === 'governing' || phase === 'legislating') navigate('/jogo/governo');
    else if (phase === 'campaign' && location.pathname.startsWith('/jogo/carreira'))
      navigate('/jogo');
  }, [phase, navigate, location.pathname]);
  return null;
}

/**
 * Ao abrir um painel, o mapa passa ao modo que conversa com ele (Economia → desemprego,
 * Pesquisas → intenção...), se o jogador deixou "o mapa acompanha os painéis" ligado.
 * Só reage à troca de painel: escolher outro modo com o painel aberto continua valendo.
 */
function ContextualMapMode({ segment }: { segment: string | null }) {
  const auto = useUi((s) => s.mapAuto);
  const setMapMode = useUi((s) => s.setMapMode);
  useEffect(() => {
    if (!auto) return;
    const game = useGame.getState().game;
    const mode = game ? suggestedMode(segment, game) : null;
    if (mode) setMapMode(mode);
    // Só na troca de painel (ligar a opção também reaplica).
  }, [segment, auto, setMapMode]);
  return null;
}

/** Largura do painel da rota (px) ou 0 sem painel. */
function usePanelWidth(viewport: number): number {
  const location = useLocation();
  // Roda antes da checagem de jogo ativo do layout: sem jogo, sem painel.
  const game = useGame((s) => s.game);
  const panelWide = useUi((s) => s.panelWide);
  const segment = panelSegment(location.pathname);
  if (segment === null || !game) return 0;
  const meta = scopedItem(routeMeta(segment), game);
  const kind = meta.width === 'narrow' ? 'narrow' : panelWide ? 'wide' : (meta.width ?? 'normal');
  return panelWidthPx(kind, viewport);
}

/** Painel da rota ativa (sobre o lado esquerdo do mapa); no índice `/jogo` só o mapa aparece. */
function ActivePanel({ width }: { width: number }) {
  const location = useLocation();
  const game = useGameState();
  const regionMatch = useMatch('/jogo/regiao/:unitId');
  const segment = panelSegment(location.pathname);
  if (segment === null) return null;
  const meta = scopedItem(routeMeta(segment), game);
  const regionName = regionMatch
    ? mapUnits(game).find((u) => u.id === regionMatch.params.unitId)?.name
    : undefined;
  const style: CSSProperties = {
    left: LAYOUT.dock + LAYOUT.gap,
    top: LAYOUT.topBar + LAYOUT.gap,
    bottom: LAYOUT.edge,
    width,
  };
  return (
    <PanelHost meta={meta} title={regionName ?? meta.label} style={style}>
      <Outlet />
    </PanelHost>
  );
}

export function GameLayout() {
  useAchievementTracker();
  const hasGame = useGame((s) => s.game !== null);
  const viewport = useViewportWidth();
  const height = useViewportHeight();
  const location = useLocation();
  const segment = panelSegment(location.pathname);
  const narrow = viewport < LAYOUT.outlinerMinViewport;
  const cluster = clusterWidth(viewport);
  const compact = isCompactHud(viewport, height);
  const panelWidth = usePanelWidth(viewport);
  // Área do mapa coberta pela interface (em pixels do próprio mapa, que começa após dock e barra).
  const mapInsets = useMemo(
    () => ({
      top: 0,
      bottom: 0,
      left: panelWidth > 0 ? panelWidth + LAYOUT.gap * 2 : 0,
      right: narrow ? LAYOUT.edge : cluster + LAYOUT.edge * 2,
    }),
    [panelWidth, narrow, cluster],
  );
  if (!hasGame) return <Navigate to="/" replace />;
  return (
    <div className="relative h-full overflow-hidden">
      <MapStage
        style={{ left: LAYOUT.dock, top: LAYOUT.topBar, right: 0, bottom: 0 }}
        insets={mapInsets}
      />
      <Dock />
      <TopBar />
      <ActivePanel width={panelWidth} />
      <ContextualMapMode segment={segment} />
      <div
        className="pointer-events-none absolute z-20 flex flex-col gap-2"
        style={{
          right: LAYOUT.edge,
          top: LAYOUT.topBar + LAYOUT.gap,
          bottom: LAYOUT.edge,
          width: cluster,
        }}
      >
        <div className="relative min-h-0 flex-1">
          <div className="absolute right-0 top-0 flex max-h-full">
            <Outliner forceCollapsed={narrow} />
          </div>
          <Toasts placement="hud" />
        </div>
        <MapLegendHud dense={compact} />
        <TimeControls compact={compact} />
      </div>
      <PhaseRouter />
      <EventModal />
      <InterviewModal />
      <DebateModal />
      <WeekModal />
      <CabinetModal />
      <DecisionCenter />
    </div>
  );
}