import { activeDecreesView, decreeOptions, hasLegalCover, previewDecreeImpact, type DecreeOptionView } from '@republica/game-engine';
import { Badge, Button, EmptyState, Icon, Panel } from '@republica/ui';
import { useMemo, useState } from 'react';
import { formatDateShort } from '../../lib/format';
import { useGame, useGameState } from '../../store/gameStore';
import { ImpactButton } from '../government/ImpactReport';

/** Tarifas e alíquotas vêm em fração (0,1 = 10 p.p.); os demais valores já vêm na unidade. */
function formatValue(value: number, unit: string): string {
  if (unit === 'p.p.') return `${value > 0 ? '+' : ''}${Math.round(value * 100)} p.p.`;
  return `${value.toLocaleString('pt-BR')} ${unit}`;
}

const RISK_TONE = { nenhum: 'good', baixo: 'info', médio: 'warn', alto: 'bad' } as const;

function DecreeCard({ d }: { d: DecreeOptionView }) {
  const act = useGame((s) => s.act);
  const game = useGameState();
  const [target, setTarget] = useState(d.targets[0]?.id ?? '');
  const [value, setValue] = useState(d.value?.default ?? 0);
  const enabled = d.available && d.affordable && (d.targetKind === 'none' || !!target);
  const chosen = d.targets.find((t) => t.id === target);
  return (
    <div className={`rounded-xl border-2 border-ink-600 bg-ink-900 p-2.5 ${d.available ? '' : 'opacity-60'}`}>
      <div className="flex items-start gap-2">
        <Icon name={d.icon} size={20} className="mt-0.5 shrink-0 text-gold-400" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-display font-semibold">{d.name}</span>
            {d.activeCount > 0 && <Badge tone="gold">{d.activeCount} ativo(s)</Badge>}
            {d.legalRisk > 0 && <Badge tone="warn">Risco no STF</Badge>}
          </div>
          <p className="text-xs text-muted">{d.description}</p>
        </div>
      </div>
      {d.targets.length > 0 && (
        <select className="game-select mt-2 w-full py-1 text-xs" value={target} onChange={(e) => setTarget(e.target.value)}>
          {d.targets.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
              {t.detail ? ` — ${t.detail}` : ''}
            </option>
          ))}
        </select>
      )}
      {chosen?.detail && <div className="mt-0.5 text-[11px] text-muted">{chosen.detail}</div>}
      {d.value && (
        <label className="mt-2 flex items-center gap-2 text-xs">
          <input
            type="range"
            min={d.value.min}
            max={d.value.max}
            step={d.value.step}
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            className="flex-1 accent-[var(--color-gold-500)]"
          />
          <span className="w-28 text-right tabular-nums">
            {formatValue(value, d.value.unit)}
          </span>
        </label>
      )}
      <div className="mt-2 flex items-center justify-between gap-2">
        {d.available && !d.instant && (
          <ImpactButton
            title={d.name}
            label="Simular"
            run={() => previewDecreeImpact(game, d.kind, d.targetKind === 'none' ? null : target, d.value ? value : null)}
          />
        )}
        <span className="text-[11px] text-muted">
          Custo {d.cost} capital{d.durationMonths ? ` · ${d.durationMonths} meses` : d.instant ? ' · imediato' : ' · até revogar'}
        </span>
        <Button
          size="sm"
          variant="primary"
          disabled={!enabled}
          title={d.reason}
          onClick={() =>
            act({
              type: 'exec/decree',
              kind: d.kind,
              target: d.targetKind === 'none' ? null : target,
              value: d.value ? value : null,
            })
          }
        >
          Decretar
        </Button>
      </div>
      {d.reason && <div className="mt-1 text-[11px] text-bad">{d.reason}</div>}
    </div>
  );
}

/** Atos do Executivo: decretos com efeito imediato, sujeitos a revisão do STF quando extrapolam a lei. */
export function DecreesView() {
  const game = useGameState();
  const act = useGame((s) => s.act);
  const options = useMemo(() => decreeOptions(game), [game]);
  const active = useMemo(() => activeDecreesView(game), [game]);
  const gov = game.government;
  if (!gov || gov.branch !== 'executive')
    return <EmptyState icon="scroll-text" title="Sem caneta" text="Decretos são atos do chefe do Executivo (prefeito, governador ou presidente)." />;
  const cover = hasLegalCover(game);

  return (
    <div className="space-y-3">
      <Panel title={`Decretos em vigor (${active.length})`} icon="scroll-text">
        {!cover && (
          <p className="mb-2 rounded-lg bg-warn/10 px-2.5 py-1.5 text-xs text-warn">
            As leis atuais não dão respaldo amplo a intervenções: decretos que extrapolam a lei podem ser suspensos pelo STF.
          </p>
        )}
        {active.length === 0 ? (
          <p className="text-sm text-muted">Nenhum decreto ativo.</p>
        ) : (
          <div className="grid gap-2 @2xl:grid-cols-2">
            {active.map((d) => (
              <div key={d.id} className="flex items-center gap-2 rounded-lg bg-ink-900 px-2.5 py-1.5">
                <Icon name={d.icon} size={18} className="text-gold-400" />
                <div className="min-w-0 flex-1 text-sm">
                  <div className="font-semibold">
                    {d.name} {d.suspended && <Badge tone="bad">Suspenso pelo STF</Badge>}
                  </div>
                  <div className="text-xs text-muted">
                    {d.targetLabel}
                    {d.valueLabel && ` · ${d.valueLabel}`} · desde {formatDateShort(d.issuedOn)}
                    {d.monthsLeft !== null ? ` · ${d.monthsLeft} mês(es) restantes` : ' · até revogar'}
                  </div>
                </div>
                <Badge tone={RISK_TONE[d.riskLabel]}>Risco {d.riskLabel}</Badge>
                <Button size="sm" variant="ghost" onClick={() => act({ type: 'exec/revoke', decreeId: d.id })}>
                  Revogar
                </Button>
              </div>
            ))}
          </div>
        )}
      </Panel>
      <Panel title="Editar decreto" icon="file-signature">
        <div className="grid gap-2 @lg:grid-cols-2 @4xl:grid-cols-3">
          {options.map((d) => (
            <DecreeCard key={d.kind} d={d} />
          ))}
        </div>
      </Panel>
    </div>
  );
}
