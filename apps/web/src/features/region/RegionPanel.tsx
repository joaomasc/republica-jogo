import {
  actionCost,
  canPerformAction,
  CAMPAIGN_ACTIONS,
  formatMoney,
  formatNumber,
  ISSUE_DEFINITIONS,
  POP_TYPES,
  unitDetails,
  type CampaignActionDefinition,
} from '@republica/game-engine';
import { Badge, Bar, EmptyState, Icon, LabeledBar, Panel, StatTile, Tooltip } from '@republica/ui';
import { useParams } from 'react-router';
import { pct } from '../../lib/format';
import { useGame, useGameState } from '../../store/gameStore';
import { StateEconomySection } from '../economy/StateEconomySection';

/** Ações de campanha que só precisam de uma região como alvo. */
const REGIONAL_ACTIONS = CAMPAIGN_ACTIONS.filter((a) => a.target === 'unit');

function ActionButton({
  action,
  unitId,
  disabledReason,
  onRun,
}: {
  action: CampaignActionDefinition;
  unitId: string;
  disabledReason: string | null;
  onRun: () => void;
}) {
  const game = useGameState();
  const cost = actionCost(game, action);
  return (
    <Tooltip
      className="flex w-full"
      content={
        <div className="max-w-60 space-y-1">
          <div className="font-display text-[13px] text-gold-300">{action.name}</div>
          <div className="text-paper/90">{action.description}</div>
          <div className="text-muted">Público: {action.audience}</div>
          {disabledReason && <div className="text-warn">{disabledReason}</div>}
        </div>
      }
    >
      <button
        type="button"
        onClick={onRun}
        disabled={!!disabledReason}
        data-testid={`map-action-${action.id}`}
        data-unit={unitId}
        className="card-hover flex w-full items-center gap-2 rounded-[4px] border border-gold-500/25 bg-ink-950/50 px-2 py-1.5 text-left disabled:cursor-not-allowed disabled:opacity-45"
      >
        <Icon name={action.icon} size={15} className="shrink-0 text-gold-400" />
        <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-paper">
          {action.name}
        </span>
        <span className="shrink-0 text-[10.5px] tabular-nums text-muted">
          {action.cost > 0 ? formatMoney(cost) : 'grátis'} · ⚡{action.energy}
        </span>
      </button>
    </Tooltip>
  );
}

/** Painel de uma região do mapa (`/jogo/regiao/:unitId`): perfil, intenção de voto e ações locais. */
export function RegionPanel() {
  const { unitId = '' } = useParams();
  const game = useGameState();
  const act = useGame((s) => s.act);
  const details = unitDetails(game, unitId);

  if (!details)
    return (
      <EmptyState
        icon="map-pin"
        title="Região não encontrada"
        text="Clique numa região do mapa para ver os detalhes."
      />
    );

  const { unit } = details;
  const campaign = game.phase === 'campaign' && game.election && game.campaign;

  return (
    <div className="space-y-3" data-testid="unit-details">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone="gold">{details.regionName}</Badge>
        {unit.kind === 'zone' && <Badge>{details.stateName}</Badge>}
        <h2 className="w-full font-display text-[22px] font-bold leading-tight tracking-[0.04em] text-paper">
          {unit.name}
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <StatTile
          label="População"
          icon="users"
          value={formatNumber(details.population)}
          sub={`${formatNumber(unit.voters)} eleitores`}
        />
        <StatTile
          label="Renda média"
          icon="wallet"
          value={`R$ ${formatNumber(Math.round(details.income))}`}
          sub="por mês"
        />
        <StatTile
          label="Desemprego"
          icon="user-x"
          value={`${details.unemployment.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`}
          tone={details.unemployment > 11 ? 'bad' : details.unemployment > 8 ? 'warn' : 'neutral'}
        />
        <StatTile
          label="Intenção em você"
          icon="vote"
          value={pct(details.playerShare)}
          tone="gold"
          sub={details.playerRejection !== null ? `rejeição ${pct(details.playerRejection, 0)}` : undefined}
        />
      </div>

      {(details.playerKnowledge !== null || details.playerPresence !== null) && (
        <Panel title="Sua campanha na região" icon="megaphone" bodyClassName="space-y-2 p-3">
          {details.playerKnowledge !== null && (
            <LabeledBar
              label="Conhecimento do nome"
              value={details.playerKnowledge / 100}
              display={`${Math.round(details.playerKnowledge)}%`}
              color="var(--color-info)"
            />
          )}
          {details.playerPresence !== null && (
            <LabeledBar
              label="Presença"
              value={details.playerPresence / 100}
              display={`${Math.round(details.playerPresence)}%`}
            />
          )}
        </Panel>
      )}

      {details.candidates.length > 0 && (
        <Panel title="Intenção de voto" icon="bar-chart-3" bodyClassName="space-y-1.5 p-3">
          {details.candidates.slice(0, 5).map((c) => (
            <div key={c.id} className="flex items-center gap-2 text-[12px]">
              <span className="w-28 shrink-0 truncate text-paper">{c.name}</span>
              <Bar value={c.share * 1.6} color={c.color} height={6} />
              <span className="w-12 shrink-0 text-right font-semibold tabular-nums">{pct(c.share)}</span>
            </div>
          ))}
        </Panel>
      )}

      <Panel title="Problemas e partidos" icon="triangle-alert" bodyClassName="space-y-3 p-3">
        <div>
          <div className="label mb-1">Maiores problemas</div>
          <div className="flex flex-wrap gap-1.5">
            {details.problems.map((p) => (
              <Badge key={p} tone="warn">
                <Icon name={ISSUE_DEFINITIONS[p].icon} size={11} />
                {ISSUE_DEFINITIONS[p].name}
              </Badge>
            ))}
          </div>
        </div>
        <div>
          <div className="label mb-1">Partidos fortes</div>
          <div className="flex flex-wrap gap-1.5">
            {details.strongParties.map((p) => (
              <span
                key={p.id}
                className="inline-flex items-center gap-1.5 rounded-[3px] border border-gold-500/25 bg-ink-950/50 px-1.5 py-0.5 text-[12px]"
              >
                <span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: p.color }} />
                {p.acronym}
              </span>
            ))}
          </div>
        </div>
      </Panel>

      <Panel title="Quem vota aqui" icon="users" bodyClassName="space-y-1.5 p-3">
        {details.composition.slice(0, 6).map((c) => {
          const def = POP_TYPES[c.typeId];
          return (
            <div key={c.typeId} className="flex items-center gap-2 text-[12px]">
              <span className="shrink-0" style={{ color: def.color }}>
                <Icon name={def.icon} size={13} />
              </span>
              <span className="w-28 shrink-0 truncate text-paper">{def.plural}</span>
              <Bar value={c.share * 2.2} color={def.color} height={5} />
              <span className="w-11 shrink-0 text-right tabular-nums text-muted">{pct(c.share, 0)}</span>
            </div>
          );
        })}
      </Panel>

      {campaign && (
        <Panel title="Ações nesta região" icon="map-pin" bodyClassName="space-y-1.5 p-3">
          {REGIONAL_ACTIONS.map((a) => (
            <ActionButton
              key={a.id}
              action={a}
              unitId={unit.id}
              disabledReason={canPerformAction(game, { actionId: a.id, unitId: unit.id })}
              onRun={() => act({ type: 'campaign/action', input: { actionId: a.id, unitId: unit.id } })}
            />
          ))}
        </Panel>
      )}

      <StateEconomySection stateId={unit.stateId} />
    </div>
  );
}
