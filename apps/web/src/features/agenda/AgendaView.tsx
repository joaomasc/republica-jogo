import {
  actionCost,
  AGENDA_ACTIONS,
  AGENDA_PRESETS,
  agendaItemLabel,
  DEFAULT_AGENDA,
  diffDays,
  formatMoney,
  GameConstants,
  getCampaignAction,
  INTERVIEW_TYPE_INFO,
  INTERVIEW_TYPES,
  isDayActivity,
  POP_TYPE_LIST,
  type AgendaConfig,
  type AgendaFrequency,
  type AgendaItem,
  type GameState,
  type InterviewType,
  type PopTypeId,
} from '@republica/game-engine';
import { Badge, Button, cn, EmptyState, Icon, Panel } from '@republica/ui';
import { useMemo } from 'react';
import { Link } from 'react-router';
import { pp } from '../../lib/format';
import { useGame, useGameState } from '../../store/gameStore';

const FREQ_LABEL: Record<AgendaFrequency, string> = {
  1: 'Todo dia',
  2: 'Dia sim, dia não',
  3: 'A cada 3 dias',
  7: '1× por semana',
};

let seq = 0;
const newId = () => `i${Date.now().toString(36)}${(seq++).toString(36)}`;

function encode(item: AgendaItem): string {
  return item.kind === 'interview' ? `i:${item.interviewType}` : `a:${item.actionId}`;
}

function energyOf(item: AgendaItem): number {
  return item.kind === 'interview'
    ? INTERVIEW_TYPE_INFO[item.interviewType ?? 'tv'].energy
    : (getCampaignAction(item.actionId ?? '')?.energy ?? 0);
}

function costOf(game: GameState, item: AgendaItem): number {
  if (item.kind === 'interview') return 0;
  const def = getCampaignAction(item.actionId ?? '');
  return def ? actionCost(game, def) : 0;
}

/** Plano dos próximos dias (sem considerar energia/caixa), na ordem de prioridade. */
function plan(game: GameState, agenda: AgendaConfig, days: number) {
  const election = game.election!;
  const start = diffDays(election.roundStartDate, game.date);
  const left = diffDays(game.date, election.date);
  const out: { date: string; items: AgendaItem[] }[] = [];
  let busy = 0;
  for (let d = 0; d < Math.min(days, left); d++) {
    const day = start + d;
    const items: AgendaItem[] = [];
    let taken = busy > 0;
    if (busy > 0) busy--;
    for (const it of agenda.items) {
      if (!it.enabled || day % it.every !== 0) continue;
      const main = isDayActivity(it);
      if (main && taken) continue;
      items.push(it);
      if (main) {
        taken = true;
        const len = it.kind === 'action' ? (getCampaignAction(it.actionId ?? '')?.days ?? 1) : 1;
        busy = Math.max(0, len - 1);
      }
    }
    const date = new Date(Date.parse(game.date) + d * 864e5).toISOString().slice(0, 10);
    out.push({ date, items });
  }
  return out;
}

export function AgendaView() {
  const game = useGameState();
  const act = useGame((s) => s.act);
  const campaign = game.campaign;
  const election = game.election;
  const agenda: AgendaConfig = campaign?.agenda ?? DEFAULT_AGENDA;
  const week = useMemo(
    () => (election && campaign ? plan(game, agenda, 7) : []),
    [game, agenda, election, campaign],
  );

  if (!campaign || !election || game.phase !== 'campaign')
    return (
      <EmptyState
        icon="calendar-check"
        title="Sem campanha em andamento"
        text="A agenda automática funciona durante as campanhas."
      />
    );

  const save = (next: Partial<AgendaConfig>) =>
    act({ type: 'agenda/update', agenda: { ...agenda, ...next } }, { quiet: true });
  const setItem = (id: string, patch: Partial<AgendaItem>) =>
    save({ items: agenda.items.map((it) => (it.id === id ? { ...it, ...patch } : it)) });
  const move = (idx: number, dir: -1 | 1) => {
    const items = [...agenda.items];
    const j = idx + dir;
    if (j < 0 || j >= items.length) return;
    [items[idx], items[j]] = [items[j]!, items[idx]!];
    save({ items });
  };

  const player = game.candidates[game.playerId]!;
  const regen =
    GameConstants.campaign.energyRegenPerDay +
    (GameConstants.campaign.energyRegenOrganizationBonus * player.attributes.organization) / 100 +
    (player.age < GameConstants.campaign.youngAgeLimit
      ? GameConstants.campaign.youngAgeEnergyBonus
      : 0);
  const daysPlanned = Math.max(1, week.length);
  const energyPerDay =
    week.reduce((a, d) => a + d.items.reduce((b, it) => b + energyOf(it), 0), 0) / daysPlanned;
  const costPerDay =
    week.reduce((a, d) => a + d.items.reduce((b, it) => b + costOf(game, it), 0), 0) / daysPlanned;
  const runway =
    costPerDay > 0 ? Math.floor((campaign.money - agenda.minMoney) / costPerDay) : Infinity;
  const recent = campaign.log.filter((l) => l.auto).slice(0, 12);
  const units = [...election.units].sort((a, b) => b.voters - a.voters);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Agenda automática</h1>
          <p className="max-w-2xl text-sm text-muted">
            Monte sua rotina uma vez: a cada dia que você avançar, a equipe executa os compromissos
            em ordem de prioridade. Ações que você faz à mão continuam funcionando normalmente.{' '}
            <Link to="/jogo/manual#agenda" className="text-gold-400 underline">
              Como funciona
            </Link>
          </p>
        </div>
        <Button
          variant={agenda.enabled ? 'success' : 'primary'}
          size="lg"
          icon={<Icon name={agenda.enabled ? 'calendar-check' : 'rocket'} size={18} />}
          onClick={() => save({ enabled: !agenda.enabled })}
          disabled={agenda.items.length === 0 && !agenda.enabled}
          data-testid="agenda-toggle"
        >
          {agenda.enabled ? 'Agenda ativa — pausar' : 'Ativar agenda'}
        </Button>
      </div>

      <Panel title="Começar de um modelo" icon="sparkles">
        <div className="grid gap-2 @lg:grid-cols-3">
          {AGENDA_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() =>
                save({ items: p.items.map((it) => ({ ...it, id: newId() })), enabled: true })
              }
              className="card-hover rounded-xl border-2 border-ink-600 bg-ink-900 p-2.5 text-left"
              data-testid={`agenda-preset-${p.id}`}
            >
              <div className="font-display font-semibold">{p.name}</div>
              <div className="text-xs text-muted">{p.description}</div>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">
          Aplicar um modelo substitui os compromissos atuais e ativa a agenda.
        </p>
      </Panel>

      <div className="grid grid-cols-1 gap-3 @4xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel
          title="Compromissos (em ordem de prioridade)"
          icon="clipboard-list"
          actions={
            <Button
              size="sm"
              icon={<Icon name="flag" size={14} />}
              disabled={agenda.items.length >= 12}
              onClick={() =>
                save({
                  items: [
                    ...agenda.items,
                    {
                      id: newId(),
                      kind: 'action',
                      actionId: 'social_media',
                      every: 1,
                      unit: 'auto',
                      popTypeId: 'auto',
                      enabled: true,
                    },
                  ],
                })
              }
              data-testid="agenda-add"
            >
              Adicionar
            </Button>
          }
        >
          {agenda.items.length === 0 ? (
            <p className="text-sm text-muted">
              Nenhum compromisso. Escolha um modelo acima ou adicione um.
            </p>
          ) : (
            <ul className="space-y-2">
              {agenda.items.map((it, idx) => {
                const def = it.kind === 'action' ? getCampaignAction(it.actionId ?? '') : undefined;
                const main = isDayActivity(it);
                const cost = costOf(game, it);
                return (
                  <li
                    key={it.id}
                    className={cn(
                      'rounded-xl border-2 bg-ink-900 p-2',
                      it.enabled ? 'border-ink-600' : 'border-ink-700 opacity-60',
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="w-5 text-center font-display text-sm text-muted">
                        {idx + 1}
                      </span>
                      <select
                        className="game-select min-w-0 flex-1"
                        value={encode(it)}
                        aria-label="Compromisso"
                        onChange={(e) => {
                          const [k, v] = e.target.value.split(':') as [string, string];
                          setItem(
                            it.id,
                            k === 'i'
                              ? {
                                  kind: 'interview',
                                  interviewType: v as InterviewType,
                                  actionId: undefined,
                                }
                              : { kind: 'action', actionId: v, interviewType: undefined },
                          );
                        }}
                      >
                        <optgroup label="Rápidas (várias por dia)">
                          {AGENDA_ACTIONS.filter((a) => a.days === 0).map((a) => (
                            <option key={a.id} value={`a:${a.id}`}>
                              {a.name}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Atividade do dia (uma por dia)">
                          {AGENDA_ACTIONS.filter((a) => a.days > 0 && a.id !== 'rest').map((a) => (
                            <option key={a.id} value={`a:${a.id}`}>
                              {a.name}
                              {a.days > 1 ? ` (${a.days} dias)` : ''}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Entrevistas (respostas automáticas)">
                          {INTERVIEW_TYPES.map((t) => (
                            <option key={t} value={`i:${t}`}>
                              Entrevista: {INTERVIEW_TYPE_INFO[t].name}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                      <select
                        className="game-select"
                        value={it.every}
                        aria-label="Frequência"
                        onChange={(e) =>
                          setItem(it.id, { every: Number(e.target.value) as AgendaFrequency })
                        }
                      >
                        {([1, 2, 3, 7] as AgendaFrequency[]).map((f) => (
                          <option key={f} value={f}>
                            {FREQ_LABEL[f]}
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-0.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => move(idx, -1)}
                          disabled={idx === 0}
                          aria-label="Subir"
                        >
                          ↑
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => move(idx, 1)}
                          disabled={idx === agenda.items.length - 1}
                          aria-label="Descer"
                        >
                          ↓
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setItem(it.id, { enabled: !it.enabled })}
                          title={
                            it.enabled ? 'Desligar este compromisso' : 'Ligar este compromisso'
                          }
                        >
                          {it.enabled ? 'Ligado' : 'Desligado'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            save({ items: agenda.items.filter((x) => x.id !== it.id) })
                          }
                          aria-label="Remover"
                          title="Remover"
                        >
                          ✕
                        </Button>
                      </div>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 pl-7">
                      {def?.target === 'unit' && (
                        <select
                          className="game-select text-xs"
                          value={it.unit}
                          aria-label="Região"
                          onChange={(e) => setItem(it.id, { unit: e.target.value })}
                        >
                          <option value="auto">
                            Região automática (mais eleitores, menos presença sua)
                          </option>
                          {units.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name}
                            </option>
                          ))}
                        </select>
                      )}
                      {def?.target === 'popType' && (
                        <select
                          className="game-select text-xs"
                          value={it.popTypeId}
                          aria-label="Grupo social"
                          onChange={(e) =>
                            setItem(it.id, { popTypeId: e.target.value as PopTypeId | 'auto' })
                          }
                        >
                          <option value="auto">
                            Grupo automático (grande e ainda pouco conquistado)
                          </option>
                          {POP_TYPE_LIST.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.plural}
                            </option>
                          ))}
                        </select>
                      )}
                      <Badge tone={main ? 'info' : 'neutral'}>
                        {main ? 'atividade do dia' : 'rápida'}
                      </Badge>
                      <Badge tone="gold">{cost > 0 ? formatMoney(cost) : 'grátis'}</Badge>
                      <Badge tone="info">⚡{energyOf(it)}</Badge>
                      {it.kind === 'interview' && <Badge>sem promessas nem ataques</Badge>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-4 border-t-2 border-ink-700 pt-3 text-sm">
            <label className="flex items-center gap-2">
              Manter no caixa pelo menos
              <input
                type="number"
                min={0}
                step={10000}
                className="game-select w-36"
                value={agenda.minMoney}
                onChange={(e) => save({ minMoney: Math.max(0, Number(e.target.value) || 0) })}
              />
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={agenda.autoRest}
                onChange={(e) => save({ autoRest: e.target.checked })}
              />
              Descansar quando a energia estiver baixa
            </label>
          </div>
        </Panel>

        <div className="space-y-3">
          <Panel title="Próximos 7 dias" icon="calendar-check">
            <ul className="space-y-1 text-xs">
              {week.map((d) => (
                <li key={d.date} className="flex gap-2 rounded-lg bg-ink-900 px-2 py-1">
                  <span className="w-10 shrink-0 font-display font-semibold">
                    {d.date.split('-').reverse().slice(0, 2).join('/')}
                  </span>
                  <span className="text-muted">
                    {d.items.length ? d.items.map(agendaItemLabel).join(' · ') : '—'}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-2 space-y-1 text-xs">
              <div className={cn(energyPerDay > regen + 1 ? 'text-warn' : 'text-muted')}>
                Energia: gasta ~{Math.round(energyPerDay)}/dia, recupera ~{Math.round(regen)}/dia.
                {energyPerDay > regen + 1 &&
                  ' Vai faltar energia: os últimos itens da lista serão pulados em alguns dias.'}
              </div>
              <div
                className={cn(
                  runway < diffDays(game.date, election.date) ? 'text-warn' : 'text-muted',
                )}
              >
                Custo: ~{formatMoney(costPerDay)}/dia
                {Number.isFinite(runway)
                  ? ` — o caixa atual cobre ~${runway} dias (sem contar doações).`
                  : '.'}
              </div>
            </div>
          </Panel>

          <Panel title="Últimas execuções" icon="file-text">
            {recent.length === 0 ? (
              <p className="text-sm text-muted">
                {agenda.enabled
                  ? 'Avance o tempo (1 dia / 1 semana) para a agenda começar.'
                  : 'Ative a agenda e avance o tempo.'}
              </p>
            ) : (
              <ul className="space-y-1 text-xs">
                {recent.map((l, i) => (
                  <li key={i} className="flex items-center gap-2 rounded-lg bg-ink-900 px-2 py-1">
                    <span className="w-10 shrink-0 text-muted">
                      {l.date.split('-').reverse().slice(0, 2).join('/')}
                    </span>
                    <span className="flex-1 truncate">{l.label}</span>
                    {l.impact && (
                      <span
                        className={cn(
                          'font-bold tabular-nums',
                          l.impact.share >= 0 ? 'text-good' : 'text-bad',
                        )}
                      >
                        {pp(l.impact.share)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
