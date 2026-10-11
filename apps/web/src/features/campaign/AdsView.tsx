import {
  AD_TONES,
  CHANNELS,
  diffDays,
  estimateAdCost,
  formatMoney,
  ISSUE_DEFINITIONS,
  ISSUES,
  MEDIA_CHANNELS,
  POP_TYPE_LIST,
  type AdTone,
  type IssueId,
  type MediaChannel,
  type PopTypeId,
} from '@republica/game-engine';
import { Badge, Bar, Button, cn, EmptyState, Icon, Panel, Segmented, Slider } from '@republica/ui';
import { useState } from 'react';
import { pct } from '../../lib/format';
import { useGame, useGameState } from '../../store/gameStore';

export function AdsView() {
  const game = useGameState();
  const act = useGame((s) => s.act);
  const election = game.election;
  const campaign = game.campaign;
  const [channel, setChannel] = useState<MediaChannel>('tv');
  const [unitIds, setUnitIds] = useState<string[]>([]);
  const [targets, setTargets] = useState<PopTypeId[]>([]);
  const [tone, setTone] = useState<AdTone>('positive');
  const [opponent, setOpponent] = useState('');
  const [theme, setTheme] = useState<IssueId | ''>('');
  const [days, setDays] = useState(7);
  const [intensity, setIntensity] = useState(1);
  const def = CHANNELS[channel];
  const opponents = election?.candidateIds.filter((id) => id !== game.playerId) ?? [];
  const target = opponent || opponents[0] || '';
  const daysLeft = election ? Math.max(1, diffDays(game.date, election.date)) : 1;
  const input = {
    channel,
    unitIds: def.regional ? unitIds : [],
    targetPopTypes: def.targetable ? targets : [],
    tone,
    targetCandidateId: tone === 'positive' ? null : target,
    theme: theme || null,
    days: Math.min(days, daysLeft),
    intensity,
  };
  if (!election || !campaign)
    return <EmptyState icon="tv" title="Propaganda só durante a campanha" />;
  const cost = estimateAdCost(game, input);
  const toggle = <T,>(list: T[], v: T) =>
    list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
  const units = [...election.units].sort((a, b) => b.voters - a.voters);

  return (
    <div className="grid grid-cols-1 gap-3 @4xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <Panel title="Nova campanha publicitária" icon="tv">
        <div className="space-y-4">
          <div>
            <div className="label mb-1.5">Canal</div>
            <div className="grid gap-2 @sm:grid-cols-3">
              {MEDIA_CHANNELS.map((c) => {
                const ch = CHANNELS[c];
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setChannel(c)}
                    className={cn(
                      'rounded-xl border-2 p-2 text-left transition',
                      channel === c
                        ? 'border-gold-400 bg-gold-500/10'
                        : 'border-ink-600 bg-ink-900 hover:border-ink-400',
                    )}
                    data-testid={`channel-${c}`}
                  >
                    <div className="flex items-center gap-1.5 font-display text-sm font-semibold">
                      <Icon name={ch.icon} size={15} className="text-gold-400" />
                      {ch.name}
                    </div>
                    <div className="mt-1 grid grid-cols-3 gap-1 text-[9px] uppercase text-muted">
                      <span>
                        Alcance
                        <Bar value={ch.reach} height={4} />
                      </span>
                      <span>
                        Persuasão
                        <Bar value={ch.persuasion} height={4} color="var(--color-good)" />
                      </span>
                      <span>
                        Risco
                        <Bar value={ch.risk * 15} height={4} color="var(--color-bad)" />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-xs text-muted">{def.description}</p>
          </div>

          <div>
            <div className="label mb-1.5">
              Regiões {def.regional ? '(nenhuma = todo o território)' : '(canal só nacional)'}
            </div>
            <div className="flex flex-wrap gap-1">
              {units.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  disabled={!def.regional}
                  onClick={() => setUnitIds(toggle(unitIds, u.id))}
                  className={cn(
                    'rounded-lg border-2 px-2 py-0.5 text-xs font-bold disabled:opacity-40',
                    unitIds.includes(u.id)
                      ? 'border-gold-400 bg-gold-500 text-ink-950'
                      : 'border-ink-600 bg-ink-900 text-muted',
                  )}
                >
                  {u.kind === 'state' ? u.id : u.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="label mb-1.5">
              Público-alvo{' '}
              {def.targetable ? '(segmentação aumenta eficiência)' : '(canal não segmentável)'}
            </div>
            <div className="flex flex-wrap gap-1">
              {POP_TYPE_LIST.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  disabled={!def.targetable}
                  onClick={() => setTargets(toggle(targets, p.id))}
                  className={cn(
                    'flex items-center gap-1 rounded-lg border-2 px-2 py-0.5 text-xs font-bold disabled:opacity-40',
                    targets.includes(p.id)
                      ? 'border-gold-400 bg-gold-500 text-ink-950'
                      : 'border-ink-600 bg-ink-900 text-muted',
                  )}
                >
                  <Icon name={p.icon} size={11} /> {p.plural}
                  <span className="opacity-70">{Math.round(p.media[channel] * 100)}%</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 @lg:grid-cols-2">
            <div>
              <div className="label mb-1.5">Tom</div>
              <Segmented
                options={(Object.keys(AD_TONES) as AdTone[]).map((t) => ({
                  id: t,
                  label: AD_TONES[t].name,
                }))}
                value={tone}
                onChange={setTone}
              />
              <p className="mt-1 text-xs text-muted">{AD_TONES[tone].description}</p>
              {tone !== 'positive' && (
                <select
                  className="game-select mt-2 w-full"
                  value={target}
                  onChange={(e) => setOpponent(e.target.value)}
                >
                  {opponents.map((id) => (
                    <option key={id} value={id}>
                      Alvo: {game.candidates[id]?.ballotName}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <div className="label mb-1.5">Tema (opcional)</div>
              <select
                className="game-select w-full"
                value={theme}
                onChange={(e) => setTheme(e.target.value as IssueId | '')}
              >
                <option value="">Imagem do candidato</option>
                {ISSUES.map((i) => (
                  <option key={i} value={i}>
                    {ISSUE_DEFINITIONS[i].name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid gap-4 @lg:grid-cols-2">
            <Slider
              label="Duração"
              value={Math.min(days, daysLeft)}
              min={1}
              max={Math.min(30, daysLeft)}
              onChange={setDays}
              display={`${Math.min(days, daysLeft)} dias`}
            />
            <Slider
              label="Intensidade"
              value={intensity}
              min={0.5}
              max={2}
              step={0.1}
              onChange={setIntensity}
              display={`${Math.round(intensity * 100)}%`}
              leftLabel="Leve"
              rightLabel="Saturação"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-gold-500/40 bg-ink-950 p-3">
            <div>
              <div className="label">Custo total</div>
              <div
                className={cn(
                  'font-display text-2xl',
                  cost.total > campaign.money ? 'text-bad' : 'text-gold-400',
                )}
                data-testid="ad-cost"
              >
                {formatMoney(cost.total)}
              </div>
              <div className="text-xs text-muted">
                {formatMoney(cost.daily)}/dia · cobre {pct(cost.coverage, 0)} do eleitorado · caixa{' '}
                {formatMoney(campaign.money)}
              </div>
            </div>
            <Button
              variant="primary"
              size="lg"
              disabled={cost.total > campaign.money}
              onClick={() => act({ type: 'campaign/ad', input })}
              data-testid="ad-launch"
            >
              Veicular propaganda
            </Button>
          </div>
        </div>
      </Panel>

      <Panel title="No ar" icon="radio">
        {campaign.ads.filter((a) => a.active).length === 0 ? (
          <EmptyState
            icon="tv"
            title="Nenhuma propaganda no ar"
            text="Sem propaganda, seu nome demora a chegar ao eleitor."
          />
        ) : (
          <ul className="space-y-2">
            {campaign.ads
              .filter((a) => a.active)
              .map((a) => {
                const remaining = Math.max(0, diffDays(game.date, a.endDate) + 1);
                const total = Math.max(1, diffDays(a.startDate, a.endDate) + 1);
                return (
                  <li key={a.id} className="rounded-xl border-2 border-ink-600 bg-ink-900 p-2.5">
                    <div className="flex items-center gap-2">
                      <Icon name={CHANNELS[a.channel].icon} size={16} className="text-gold-400" />
                      <span className="font-bold">{CHANNELS[a.channel].name}</span>
                      <Badge
                        tone={a.tone === 'attack' ? 'bad' : a.tone === 'contrast' ? 'warn' : 'good'}
                      >
                        {AD_TONES[a.tone].name}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="ml-auto"
                        onClick={() => act({ type: 'campaign/cancelAd', adId: a.id })}
                      >
                        Tirar do ar
                      </Button>
                    </div>
                    <div className="mt-1 text-xs text-muted">
                      {a.unitIds.length ? `${a.unitIds.length} região(ões)` : 'Todo o território'}
                      {a.targetPopTypes.length
                        ? ` · ${a.targetPopTypes.length} grupo(s)`
                        : ''} · {formatMoney(a.dailyCost)}/dia · {remaining} dia(s) restantes
                    </div>
                    <Bar value={1 - remaining / total} height={5} className="mt-1.5" />
                  </li>
                );
              })}
          </ul>
        )}
        <div className="mt-3 text-xs text-muted">
          Horário eleitoral gratuito: começa 35 dias antes da eleição, proporcional à influência do
          partido.
        </div>
      </Panel>
    </div>
  );
}
