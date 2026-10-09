import { mapUnits } from '@republica/game-engine';
import { useEffect, useRef, type CSSProperties } from 'react';
import { Navigate, Outlet, useLocation, useMatch, useNavigate } from 'react-router';
import { Toasts } from '../../components/Toasts';
import { useGame, useGameState } from '../../store/gameStore';
import { useUi } from '../../store/uiStore';
import { DecisionCenter } from '../decisions/DecisionCenter';
import { MapStage } from '../map/MapStage';
import { DebateModal } from '../media/DebateModal';
import { EventModal } from '../events/EventModal';
import { InterviewModal } from '../media/InterviewModal';
import { WeekModal } from '../week/WeekModal';
import { Dock } from './Dock';
import { LAYOUT, panelWidthPx, useViewportWidth } from './layout';
import { panelSegment, routeMeta } from './navigation';
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

/** Painel da rota ativa (sobre o lado esquerdo do mapa); no índice `/jogo` só o mapa aparece. */
function ActivePanel({ viewport }: { viewport: number }) {
  const location = useLocation();
  const game = useGameState();
  const regionMatch = useMatch('/jogo/regiao/:unitId');
  const panelWide = useUi((s) => s.panelWide);
  const segment = panelSegment(location.pathname);
  if (segment === null) return null;
  const meta = routeMeta(segment);
  const kind = meta.width === 'narrow' ? 'narrow' : panelWide ? 'wide' : (meta.width ?? 'normal');
  const regionName = regionMatch
    ? mapUnits(game).find((u) => u.id === regionMatch.params.unitId)?.name
    : undefined;
  const style: CSSProperties = {
    left: LAYOUT.dock + LAYOUT.gap,
    top: LAYOUT.topBar + LAYOUT.gap,
    bottom: LAYOUT.edge,
    width: panelWidthPx(kind, viewport),
  };
  return (
    <PanelHost meta={meta} title={regionName ?? meta.label} style={style}>
      <Outlet />
    </PanelHost>
  );
}

export function GameLayout() {
  const hasGame = useGame((s) => s.game !== null);
  const viewport = useViewportWidth();
  if (!hasGame) return <Navigate to="/" replace />;
  const narrow = viewport < LAYOUT.outlinerMinViewport;
  return (
    <div
      className="relative h-full overflow-hidden"
      style={{ '--outliner-space': `${LAYOUT.cluster + LAYOUT.edge}px` } as CSSProperties}
    >
      <MapStage
        style={{ left: LAYOUT.dock, top: LAYOUT.topBar, right: 0, bottom: 0 }}
      />
      <Dock />
      <TopBar />
      <ActivePanel viewport={viewport} />
      <div
        className="pointer-events-none absolute z-20 flex flex-col gap-2"
        style={{
          right: LAYOUT.edge,
          top: LAYOUT.topBar + LAYOUT.gap,
          bottom: LAYOUT.edge,
          width: LAYOUT.cluster,
        }}
      >
        <div className="relative min-h-0 flex-1">
          <div className="absolute right-0 top-0 flex max-h-full">
            <Outliner forceCollapsed={narrow} />
          </div>
        </div>
        <TimeControls />
      </div>
      <PhaseRouter />
      <EventModal />
      <InterviewModal />
      <DebateModal />
      <WeekModal />
      <DecisionCenter />
      <Toasts placement="game" />
    </div>
  );
}