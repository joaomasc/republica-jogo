import { economyDashboard, federalOption, getLawCategory, getLawOption, nationOverview } from '@republica/game-engine';
import { Badge, Bar, Icon, Panel, StatTile } from '@republica/ui';
import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { formatDateShort, pct } from '../../lib/format';
import { useGameState } from '../../store/gameStore';

/** Leis que definem o "sistema" do país (painel de identidade). */
const PILLARS = ['regime', 'economic_system', 'trade', 'industrial_policy', 'labor', 'taxation', 'banking', 'unions'];

const OBJ_TONE = { active: 'info', completed: 'good', failed: 'bad' } as const;
const OBJ_LABEL = { active: 'Em andamento', completed: 'Cumprido', failed: 'Falhou' } as const;

/** Retrato da nação: identidade, regime, legitimidade, inquietação, greves, objetivos e marcos. */
export function NationView() {
  const game = useGameState();
  const navigate = useNavigate();
  const n = useMemo(() => nationOverview(game), [game]);
  const econ = useMemo(() => economyDashboard(game), [game]);
  const objectives = game.nation.objectives;

  return (
    <div className="space-y-3">
      <section
        className="ornate-panel relative overflow-hidden px-5 py-4"
        style={{ backgroundImage: `linear-gradient(120deg, ${n.identity.color}33, transparent 60%)` }}
      >
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">{n.identity.systemLabel}</div>
        <h1 className="font-display text-3xl font-semibold tracking-[0.03em] text-gold-300">{n.identity.officialName}</h1>
        <p className="mt-1 max-w-3xl text-sm text-paper/85">{n.identity.description}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge tone="gold">{n.regime.label}</Badge>
          <Badge tone={n.legitimacy >= 60 ? 'good' : n.legitimacy < 35 ? 'bad' : 'warn'}>Legitimidade: {n.legitimacyLabel}</Badge>
          <Badge tone={n.unrest >= 50 ? 'bad' : n.unrest >= 25 ? 'warn' : 'good'}>Inquietação: {n.unrestLabel}</Badge>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatTile label="Legitimidade" icon="badge-check" value={Math.round(n.legitimacy)} sub={`tendência ${Math.round(n.legitimacyTarget)}`} tone={n.legitimacy >= 60 ? 'good' : n.legitimacy < 35 ? 'bad' : 'warn'} />
        <StatTile label="Inquietação" icon="flame" value={Math.round(n.unrest)} tone={n.unrest >= 50 ? 'bad' : 'neutral'} />
        <StatTile label="Indústria" icon="factory" value={pct(econ.manufacturingShare)} sub="do valor adicionado" />
        <StatTile label="Greves" icon="hand-fist" value={n.strikes.length} tone={n.strikes.length ? 'bad' : 'good'} />
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <Panel title="Pilares do sistema" icon="landmark" className="xl:col-span-2">
          <div className="grid gap-2 sm:grid-cols-2">
            {PILLARS.map((id) => {
              const cat = getLawCategory(id);
              const opt = federalOption(game, id);
              if (!cat) return null;
              return (
                <button
                  key={id}
                  onClick={() => navigate('/jogo/leis')}
                  className="flex items-center gap-2.5 rounded-lg border border-ink-600 bg-ink-900 px-2.5 py-2 text-left hover:border-gold-500/50"
                >
                  <Icon name={cat.icon} size={18} className="text-gold-400" />
                  <span className="min-w-0">
                    <span className="block text-[11px] uppercase tracking-wider text-muted">{cat.name}</span>
                    <span className="block truncate text-sm font-semibold">{opt ? (getLawOption(id, opt)?.name ?? opt) : '—'}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </Panel>
        <Panel title="O que sustenta a legitimidade" icon="scale">
          <ul className="space-y-1 text-sm">
            {n.legitimacyFactors.map((f) => (
              <li key={f.id} className="flex justify-between gap-2">
                <span>{f.label}</span>
                <span className={`tabular-nums ${f.value > 0 ? 'text-good' : f.value < 0 ? 'text-bad' : 'text-muted'}`}>
                  {f.value > 0 ? '+' : ''}
                  {f.value.toLocaleString('pt-BR')}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-2">
            <Bar value={n.legitimacy / 100} color={n.legitimacy >= 60 ? 'var(--color-good)' : n.legitimacy < 35 ? 'var(--color-bad)' : 'var(--color-warn)'} />
          </div>
        </Panel>
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <Panel title="Greves e mobilizações" icon="hand-fist">
          {n.strikes.length === 0 ? (
            <p className="text-sm text-muted">Nenhuma greve em curso.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {n.strikes.map((s) => (
                <li key={s.id} className="rounded-lg bg-ink-900 px-2.5 py-1.5">
                  <div className="font-semibold">{s.label}</div>
                  <div className="text-xs text-muted">
                    {s.groupName} · {s.sectorLabel} · produção −{Math.round(s.intensity * 100)}% · {s.monthsLeft} mês(es)
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Objetivos nacionais" icon="flag">
          {objectives.length === 0 ? (
            <p className="text-sm text-muted">Sem objetivos de cenário.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {objectives.map((o) => (
                <li key={o.id} className="rounded-lg bg-ink-900 px-2.5 py-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{o.title}</span>
                    <Badge tone={OBJ_TONE[o.status]}>{OBJ_LABEL[o.status]}</Badge>
                  </div>
                  <div className="text-xs text-muted">
                    {o.description}
                    {o.deadline && ` · até ${formatDateShort(o.deadline)}`}
                  </div>
                  <Bar value={o.progress} height={4} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Marcos da nação" icon="scroll">
          {n.milestones.length === 0 ? (
            <p className="text-sm text-muted">A história ainda está por ser escrita.</p>
          ) : (
            <ol className="max-h-72 space-y-1.5 overflow-y-auto pr-1 text-sm">
              {n.milestones.map((m, i) => (
                <li key={i} className="border-l-2 border-gold-500/40 pl-2">
                  <div className="text-[11px] text-muted">{formatDateShort(m.date)}</div>
                  <div className="font-semibold">{m.title}</div>
                  <div className="text-xs text-muted">{m.description}</div>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>
    </div>
  );
}
