import {
  describeModifiers,
  getLawCategory,
  getLawOption,
  ideologyFromPlatform,
  INTEREST_GROUP_SEEDS,
  PLATFORM_CATEGORIES,
  PLATFORM_MAX,
  platformGroupStance,
  platformIdeologyFit,
  platformPopAppeal,
  POP_TYPES,
  suggestPlatform,
  type IdeologyVector,
  type LawBranch,
  type Platform,
  type PopTypeId,
} from '@republica/game-engine';
import { Badge, Button, cn, Icon, Tooltip } from '@republica/ui';

const BRANCH_LABEL: Record<LawBranch, string> = { estado: 'Estado e instituições', economia: 'Economia', sociedade: 'Sociedade' };
const GROUP_NAME = Object.fromEntries(INTEREST_GROUP_SEEDS.map((g) => [g.id, g.name]));

/** Lista compacta de bandeiras (para cartões de partido, ficha do candidato, resumo). */
export function PlatformChips({ platform, limit = 8, color }: { platform: Platform | { categoryId: string; optionId: string }[]; limit?: number; color?: string }) {
  const list = Array.isArray(platform) ? platform : Object.entries(platform).map(([categoryId, optionId]) => ({ categoryId, optionId }));
  if (list.length === 0) return <span className="text-xs text-muted">Nenhuma bandeira definida.</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {list.slice(0, limit).map(({ categoryId, optionId }) => {
        const cat = getLawCategory(categoryId);
        const opt = getLawOption(categoryId, optionId);
        if (!cat || !opt) return null;
        return (
          <Tooltip key={categoryId} content={<div className="max-w-xs text-xs"><b>{cat.name}</b>: {opt.description}</div>}>
            <span
              className="flex items-center gap-1 rounded-[4px] border px-1.5 py-0.5 text-[11px]"
              style={{ borderColor: color ? `${color}88` : undefined }}
            >
              <Icon name={cat.icon} size={11} className="text-gold-400" />
              {opt.name}
            </span>
          </Tooltip>
        );
      })}
      {list.length > limit && <span className="text-[11px] text-muted">+{list.length - limit}</span>}
    </div>
  );
}

/**
 * Escolha das bandeiras (leis que o político ou o partido defende). Mostra quem ganha e quem
 * perde com elas e a coerência com as posições ideológicas.
 */
export function PlatformPicker({
  value,
  onChange,
  ideology,
  onApplyIdeology,
  title = 'Suas bandeiras',
}: {
  value: Platform;
  onChange: (p: Platform) => void;
  ideology?: IdeologyVector;
  onApplyIdeology?: (v: IdeologyVector) => void;
  title?: string;
}) {
  const count = Object.keys(value).length;
  const full = count >= PLATFORM_MAX;
  const appeal = platformPopAppeal(value);
  const pops = (Object.entries(appeal) as [PopTypeId, number][]).filter(([, v]) => Math.abs(v) >= 0.05).sort((a, b) => b[1] - a[1]);
  const groups = Object.entries(platformGroupStance(value))
    .filter(([, v]) => Math.abs(v ?? 0) >= 2)
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
  const fit = ideology ? platformIdeologyFit(value, ideology) : {};
  const branches = (['economia', 'sociedade', 'estado'] as LawBranch[]).map((b) => ({ b, list: PLATFORM_CATEGORIES.filter((c) => c.branch === b) }));
  const toggle = (categoryId: string, optionId: string) => {
    const next = { ...value };
    if (next[categoryId] === optionId) delete next[categoryId];
    else if (next[categoryId] || !full) next[categoryId] = optionId;
    onChange(next);
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-display text-base">{title}</span>
          <Badge tone={full ? 'warn' : 'gold'}>
            {count}/{PLATFORM_MAX}
          </Badge>
          {ideology && (
            <Button size="sm" onClick={() => onChange(suggestPlatform(ideology))} title="Escolhe as leis mais próximas das suas posições">
              Sugerir pelas minhas ideias
            </Button>
          )}
          {count > 0 && (
            <Button size="sm" variant="ghost" onClick={() => onChange({})}>
              Limpar
            </Button>
          )}
        </div>
        <p className="text-xs text-muted">
          Escolha as leis que você defende publicamente (uma opção por tema). Eleitores que ganham com elas gostam mais de você e os
          que perdem gostam menos; grupos de interesse e bancadas reagem; no governo, cumprir uma bandeira dá credibilidade e
          contrariá-la é incoerência.
        </p>
        <div className="max-h-[52vh] space-y-3 overflow-y-auto pr-1">
          {branches.map(({ b, list }) => (
            <div key={b}>
              <div className="pb-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-gold-500">{BRANCH_LABEL[b]}</div>
              <div className="space-y-1.5">
                {list.map((cat) => (
                  <div key={cat.id} className="rounded-lg border border-ink-700 bg-ink-900 p-2" data-testid={`platform-cat-${cat.id}`}>
                    <div className="mb-1 flex items-center gap-1.5 text-[12.5px] font-semibold">
                      <Icon name={cat.icon} size={13} className="text-gold-400" />
                      {cat.name}
                      {value[cat.id] && ideology && fit[cat.id] !== undefined && (
                        <span className={cn('ml-auto text-[10.5px] font-normal', (fit[cat.id] ?? 0) >= 70 ? 'text-good' : (fit[cat.id] ?? 0) >= 50 ? 'text-warn' : 'text-bad')}>
                          coerência com suas ideias {fit[cat.id]}%
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {cat.options.map((o) => {
                        const on = value[cat.id] === o.id;
                        const blocked = !on && full && !value[cat.id];
                        const lines = describeModifiers(o.modifiers).slice(0, 4);
                        return (
                          <Tooltip
                            key={o.id}
                            content={
                              <div className="max-w-xs text-xs">
                                <div className="font-semibold text-gold-300">{o.name}</div>
                                <div>{o.description}</div>
                                {lines.length > 0 && (
                                  <ul className="mt-1 list-disc pl-4 text-[11px]">
                                    {lines.map((l) => (
                                      <li key={l.text}>{l.text}</li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            }
                          >
                            <button
                              type="button"
                              disabled={blocked}
                              onClick={() => toggle(cat.id, o.id)}
                              className={cn(
                                'rounded-[4px] border px-2 py-0.5 text-[11.5px] transition',
                                on ? 'border-gold-400 bg-gold-500 font-semibold text-ink-950' : 'border-ink-600 text-paper/85 hover:border-ink-400',
                                blocked && 'cursor-not-allowed opacity-40',
                              )}
                              data-testid={`platform-${o.id}`}
                            >
                              {o.name}
                              {o.id === cat.defaultOptionId && <span className="ml-1 opacity-60">(atual)</span>}
                            </button>
                          </Tooltip>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3 xl:sticky xl:top-0 xl:self-start">
        <div className="rounded-xl border-2 border-ink-700 bg-ink-900 p-3">
          <div className="label mb-1.5">Quem ganha e quem perde</div>
          {pops.length === 0 ? (
            <p className="text-xs text-muted">Escolha bandeiras para ver como cada grupo de eleitores reage.</p>
          ) : (
            <ul className="space-y-1 text-xs">
              {pops.map(([t, v]) => (
                <li key={t} className="flex items-center gap-2">
                  <Icon name={POP_TYPES[t].icon} size={12} className="text-muted" />
                  <span className="flex-1">{POP_TYPES[t].plural}</span>
                  <span className="relative h-1.5 w-24 rounded bg-ink-950">
                    <span className="absolute left-1/2 top-0 h-1.5 w-px bg-ink-400" />
                    <span
                      className="absolute top-0 h-1.5 rounded"
                      style={{ left: v >= 0 ? '50%' : `${50 + v * 50}%`, width: `${Math.abs(v) * 50}%`, background: v >= 0 ? 'var(--color-good)' : 'var(--color-bad)' }}
                    />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        {groups.length > 0 && (
          <div className="rounded-xl border-2 border-ink-700 bg-ink-900 p-3">
            <div className="label mb-1.5">Grupos de interesse</div>
            <div className="flex flex-wrap gap-1 text-[11px]">
              {groups.map(([g, v]) => (
                <span key={g} className={cn('rounded px-1.5 py-0.5', (v ?? 0) > 0 ? 'bg-good/15 text-good' : 'bg-bad/15 text-bad')}>
                  {GROUP_NAME[g] ?? g} {(v ?? 0) > 0 ? 'apoia' : 'rejeita'}
                </span>
              ))}
            </div>
          </div>
        )}
        {ideology && onApplyIdeology && count > 0 && (
          <div className="rounded-xl border-2 border-ink-700 bg-ink-900 p-3 text-xs">
            <p className="mb-2 text-muted">Quer que suas posições nos eixos ideológicos acompanhem essas bandeiras?</p>
            <Button size="sm" onClick={() => onApplyIdeology(ideologyFromPlatform(value, ideology))} data-testid="platform-apply-ideology">
              Ajustar meus eixos às bandeiras
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
