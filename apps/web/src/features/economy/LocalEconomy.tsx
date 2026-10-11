import { localScope, stateOfName, worksJobsIn, worksOverview } from '@republica/game-engine';
import { Button, Panel, StatTile } from '@republica/ui';
import { useNavigate } from 'react-router';
import { billions, num, people } from '../../lib/format';
import { useGameState } from '../../store/gameStore';
import { StateEconomySection } from './StateEconomySection';

/** Economia do lugar que o jogador governa (cidade ou estado), antes do quadro nacional. */
export function LocalEconomy() {
  const game = useGameState();
  const navigate = useNavigate();
  const scope = localScope(game);
  if (scope.kind === 'country' || !scope.stateId) return null;
  const works = worksOverview(game);
  const jobs = worksJobsIn(game, scope.stateId);
  const du = scope.unemployment - scope.unemployment0;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 @lg:grid-cols-5">
        <StatTile label="População" icon="users" value={people(scope.population)} />
        <StatTile label={scope.estimated ? 'PIB (estimado)' : 'PIB'} icon="landmark" value={billions(scope.gdp)} sub={`${num(scope.growth)}% ao ano`} />
        <StatTile
          label="Desemprego"
          icon="user-x"
          value={`${num(scope.unemployment)}%`}
          tone={du < -0.2 ? 'good' : du > 0.2 ? 'bad' : 'neutral'}
          sub={`início: ${num(scope.unemployment0)}% · Brasil: ${num(game.economy.unemployment)}%`}
        />
        <StatTile label="Renda média" icon="piggy-bank" value={`R$ ${Math.round(scope.income).toLocaleString('pt-BR')}`} sub="por mês" />
        <StatTile label="Empregos das suas obras" icon="hard-hat" value={people(jobs.temp + jobs.permanent)} sub={`${works.mine.length} obra(s) em andamento`} tone="good" />
      </div>
      {scope.estimated && (
        <p className="text-xs text-muted">
          Os números {scope.ofName} são estimados a partir do estado (a economia do jogo é modelada por estado). As suas
          obras municipais contam integralmente na cidade.
        </p>
      )}
      <Panel
        title={`Empresas e edifícios ${scope.kind === 'city' ? `no estado ${stateOfName(scope.stateId)}` : scope.ofName}`}
        icon="factory"
        actions={
          <Button size="sm" onClick={() => navigate('/jogo/obras')}>
            Obras {scope.ofName} →
          </Button>
        }
      >
        <StateEconomySection stateId={scope.stateId} />
      </Panel>
    </div>
  );
}
