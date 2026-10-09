import {
  BUDGET_INFO,
  canProposeBill,
  categoriesForLevel,
  describeModifiers,
  getLawCategory,
  getLawOption,
  INSTRUMENT_LABELS,
  INSTRUMENT_SHORT,
  INTEREST_GROUP_SEEDS,
  isBillActive,
  lawProposalPreview,
  legislativeLevel,
  previewLawImpact,
  type BillInstrument,
  type BudgetCategory,
  type LawBranch,
  type LawOptionDefinition,
} from '@republica/game-engine';
import { Badge, Button, cn, EmptyState, Icon, Panel, StatTile, Tooltip } from '@republica/ui';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useGame, useGameState } from '../../store/gameStore';
import { PartySupport, ProjectionBars } from './BillParts';
import { ImpactButton } from './ImpactReport';
import { HowItConnects } from '../economy/HowItConnects';

const BRANCH_LABEL: Record<LawBranch, string> = { estado: 'Estado e instituições', economia: 'Economia', sociedade: 'Sociedade' };
const GROUP_NAME = Object.fromEntries(INTEREST_GROUP_SEEDS.map((g) => [g.id, g.name]));
const INSTRUMENT_HINT: Record<BillInstrument, string> = {
  pl: 'Maioria simples dos presentes em cada casa. Sanção ou veto do Executivo.',
  plp: 'Maioria absoluta (metade + 1 de toda a casa) em cada casa.',
  pec: '3/5 da casa em dois turnos, na Câmara e no Senado. Não passa por sanção.',
  mp: 'Vale imediatamente. O Congresso tem 120 dias para aprovar; se cair ou caducar, a lei antiga volta.',
};

const MACRO_WHY: Record<string, string> = {
  confidence: 'Confiança dos empresários e do mercado → afeta investimento, juros e câmbio.',
  inflation: 'Pressão direta sobre os preços → corrói a renda e leva o Banco Central a subir juros.',
  growth: 'Efeito direto no ritmo da economia.',
  unemployment: 'Efeito direto no emprego.',
  investment: 'Efeito direto no investimento.',
  revenue: 'Muda quanto o governo arrecada → mais (ou menos) espaço no orçamento.',
};

const ECON_LABEL: Record<string, string> = {
  growth: 'PIB',
  inflation: 'Inflação',
  unemployment: 'Desemprego',
  investment: 'Investimento',
  confidence: 'Confiança',
  revenue: 'Arrecadação',
};

function Chip({ text, tone, why }: { text: string; tone: 'good' | 'bad' | 'neutral'; why?: string }) {
  const chip = (
    <span
      className={cn(
        'rounded-[3px] border px-1.5 py-0.5 text-[10.5px] font-semibold',
        why && 'cursor-help underline decoration-dotted underline-offset-2',
        tone === 'good' ? 'border-good/40 text-good' : tone === 'bad' ? 'border-bad/40 text-bad' : 'border-ink-500 text-paper/80',
      )}
    >
      {text}
    </span>
  );
  if (!why) return chip;
  return (
    <Tooltip
      content={
        <div className="max-w-xs">
          <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-gold-300">O que isso causa</div>
          <div className="text-[12px] leading-snug">{why}</div>
        </div>
      }
    >
      {chip}
    </Tooltip>
  );
}

/** Efeitos de uma opção de lei: motor industrial, macro legado, orçamento e grupos. */
function Effects({ option }: { option: LawOptionDefinition }) {
  const chips: { text: string; tone: 'good' | 'bad' | 'neutral'; why?: string }[] = describeModifiers(option.modifiers).map((l) => ({ ...l }));
  for (const [k, v] of Object.entries(option.economy)) {
    if (!v || !ECON_LABEL[k]) continue;
    const inverted = k === 'inflation' || k === 'unemployment';
    const text = k === 'revenue' ? `${ECON_LABEL[k]} ${v > 0 ? '+' : ''}${Math.round(v * 100)}%` : `${ECON_LABEL[k]} ${v > 0 ? '+' : ''}${v}`;
    chips.push({ text, tone: (inverted ? v < 0 : v > 0) ? 'good' : 'bad', why: MACRO_WHY[k] });
  }
  for (const [k, v] of Object.entries(option.budget))
    if (v)
      chips.push({
        text: `Gasto ${BUDGET_INFO[k as BudgetCategory].name} ${v > 0 ? '+' : ''}${Math.round(v * 100)}%`,
        tone: v < 0 ? 'good' : 'bad',
        why: 'Muda quanto o governo precisa gastar nessa área → mais gasto melhora o serviço (e agrada quem prioriza o tema), mas pesa no orçamento e no déficit.',
      });
  const groups = Object.entries(option.groups).filter(([, v]) => v);
  return (
    <div className="space-y-1">
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {chips.map((c) => (
            <Chip key={c.text} {...c} />
          ))}
        </div>
      )}
      {groups.length > 0 && (
        <div className="flex flex-wrap gap-x-2 text-[11px]">
          {groups.map(([g, v]) => (
            <span key={g} className={(v ?? 0) > 0 ? 'text-good' : 'text-bad'}>
              {GROUP_NAME[g] ?? g} {(v ?? 0) > 0 ? '▲' : '▼'}
            </span>
          ))}
        </div>
      )}
      {(option.plebiscite || option.legitimacyShock) && (
        <div className="flex flex-wrap gap-1">
          {option.plebiscite && <Chip text="Exige plebiscito" tone="neutral" />}
          {option.legitimacyShock ? (
            <Chip text={`Legitimidade ${option.legitimacyShock > 0 ? '+' : ''}${option.legitimacyShock}`} tone={option.legitimacyShock > 0 ? 'good' : 'bad'} />
          ) : null}
        </div>
      )}
    </div>
  );
}

/** Painel de proposta: instrumento, votos esperados, bancadas, grupos e Pops. */
function ProposalPanel({ categoryId, optionId }: { categoryId: string; optionId: string }) {
  const game = useGameState();
  const act = useGame((s) => s.act);
  const preview = useMemo(() => lawProposalPreview(game, categoryId, optionId), [game, categoryId, optionId]);
  const [picked, setPicked] = useState<BillInstrument | null>(null);
  if (!preview) return null;
  const option = getLawOption(categoryId, optionId)!;
  const error = canProposeBill(game, categoryId, optionId);
  const instrument = picked && preview.instruments.find((i) => i.instrument === picked)?.allowed ? picked : preview.defaultInstrument;
  const choice = preview.instruments.find((i) => i.instrument === instrument);
  const capital = game.government?.politicalCapital ?? 0;
  // Agrupa efeitos com a mesma explicação (ex.: várias tarifas) para não repetir o texto.
  const mechanics: { text: string; tone: 'good' | 'bad' | 'neutral'; why: string }[] = [];
  for (const m of describeModifiers(option.modifiers)) {
    if (!m.why) continue;
    const same = mechanics.find((x) => x.why === m.why);
    if (same) same.text += ` · ${m.text}`;
    else mechanics.push({ ...m });
  }
  return (
    <Panel title={`Propor: ${option.name}`} icon="file-pen">
      <div className="space-y-3">
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">Instrumento</div>
          <div className="grid grid-cols-2 gap-1.5">
            {preview.instruments.map((i) => (
              <button
                key={i.instrument}
                disabled={!i.allowed}
                title={i.reason ?? INSTRUMENT_HINT[i.instrument]}
                onClick={() => setPicked(i.instrument)}
                className={cn(
                  'rounded-[4px] border px-2 py-1.5 text-left text-xs',
                  !i.allowed && 'cursor-not-allowed opacity-40',
                  instrument === i.instrument ? 'border-gold-500 bg-gold-500/15 text-gold-200' : 'border-ink-600 bg-ink-900 hover:border-ink-400',
                )}
              >
                <div className="font-semibold">{INSTRUMENT_LABELS[i.instrument]}</div>
                <div className="text-muted">custo {i.cost}</div>
              </button>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-muted">{choice?.reason ?? INSTRUMENT_HINT[instrument]}</p>
        </div>
        <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">Votos esperados hoje</div>
            <ProjectionBars projection={preview.projection} />
            <div className="mt-1.5">
              <PartySupport game={game} projection={preview.projection} />
            </div>
          </div>
        {preview.caucuses.length > 0 && (
          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">Bancadas</div>
            <div className="flex flex-wrap gap-1">
              {preview.caucuses.map((c) => (
                <Chip key={c.id} text={`${c.name} ${c.stance > 0 ? 'a favor' : 'contra'}`} tone={c.stance > 0 ? 'good' : 'bad'} />
              ))}
            </div>
          </div>
        )}
        {(preview.winners.length > 0 || preview.losers.length > 0) && (
          <div className="text-xs">
            {preview.winners.length > 0 && <div className="text-good">Agrada: {preview.winners.join(', ')}</div>}
            {preview.losers.length > 0 && <div className="text-bad">Desagrada: {preview.losers.join(', ')}</div>}
          </div>
        )}
        {mechanics.length > 0 && (
          <div>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">Como isso mexe na economia</div>
            <ul className="space-y-1.5 text-xs">
              {mechanics.map((m) => (
                <li key={m.text}>
                  <span className={m.tone === 'good' ? 'text-good' : m.tone === 'bad' ? 'text-bad' : 'text-paper'}>
                    <b>{m.text}</b>
                  </span>
                  <span className="text-muted"> — {m.why}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-ink-900 p-2">
          <ImpactButton title={option.name} run={() => previewLawImpact(game, categoryId, optionId)} label="Simular impacto (2 anos)" />
          <span className="text-[11px] text-muted">Veja o que acontece com PIB, emprego, preços, Pops e grupos se a lei entrar em vigor.</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted">
            Capital: {Math.round(capital)} · implementação {option.implementationMonths} mês(es)
          </span>
          <Button
            variant="primary"
            disabled={!!error || !choice?.allowed || capital < (choice?.cost ?? 0)}
            onClick={() => act({ type: 'leg/propose', categoryId, optionId, instrument })}
            data-testid={`propose-${optionId}`}
          >
            Apresentar {INSTRUMENT_SHORT[instrument]}
          </Button>
        </div>
        {error && <p className="text-xs text-bad">{error}</p>}
      </div>
    </Panel>
  );
}

/** Leis do país (estilo Victoria 3): categorias, opções com efeitos e proposta com instrumento. */
export function LawsView() {
  const game = useGameState();
  const navigate = useNavigate();
  const gov = game.government;
  const level = legislativeLevel(game);
  const cats = level ? categoriesForLevel(level) : [];
  const [catId, setCatId] = useState(cats[0]?.id ?? '');
  const [optionId, setOptionId] = useState<string | null>(null);
  if (!gov || !level) return <EmptyState icon="scale" title="Sem mandato" text="Leis só podem ser propostas por quem tem mandato." />;
  const cat = getLawCategory(catId) ?? cats[0];
  const activeBills = game.laws.bills.filter(isBillActive);
  const branches = (['estado', 'economia', 'sociedade'] as LawBranch[]).map((b) => ({ b, list: cats.filter((c) => c.branch === b) })).filter((x) => x.list.length);
  const selected = cat && optionId && cat.options.some((o) => o.id === optionId) && game.laws.enacted[cat.id] !== optionId ? optionId : null;
  const catBill = cat ? activeBills.find((b) => b.categoryId === cat.id) : undefined;
  const catImpl = cat ? game.laws.implementing.find((i) => i.categoryId === cat.id) : undefined;

  return (
    <div className="space-y-3">
      <HowItConnects />
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatTile label="Capital político" icon="star" value={Math.round(gov.politicalCapital)} />
        <StatTile label="Esfera" icon="landmark" value={level === 'federal' ? 'Federal' : level === 'estadual' ? 'Estadual' : 'Municipal'} />
        <StatTile label="Proposições tramitando" icon="file-text" value={activeBills.length} />
        <StatTile label="Leis em implementação" icon="construction" value={game.laws.implementing.length} />
      </div>
      <div className="grid gap-3 xl:grid-cols-[250px_minmax(0,1fr)_minmax(0,0.85fr)]">
        <Panel title="Leis" icon="scale" bodyClassName="p-2">
          <div className="max-h-[72vh] space-y-3 overflow-y-auto pr-1">
            {branches.map(({ b, list }) => (
              <div key={b}>
                <div className="px-1 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-gold-500">{BRANCH_LABEL[b]}</div>
                <ul className="space-y-0.5">
                  {list.map((c) => {
                    const current = getLawOption(c.id, game.laws.enacted[c.id] ?? c.defaultOptionId);
                    const tramit = activeBills.some((x) => x.categoryId === c.id);
                    return (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setCatId(c.id);
                            setOptionId(null);
                          }}
                          className={cn('flex w-full items-center gap-2 rounded-[4px] px-2 py-1.5 text-left', c.id === cat?.id ? 'bg-gold-500/20 text-gold-200' : 'hover:bg-ink-700')}
                          data-testid={`law-cat-${c.id}`}
                        >
                          <Icon name={c.icon} size={15} className="shrink-0" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-semibold">{c.name}</span>
                            <span className="block truncate text-[11px] text-muted">{current?.name}</span>
                          </span>
                          {tramit && <Icon name="file-clock" size={13} className="text-info" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </Panel>

        {cat && (
          <Panel
            title={cat.name}
            icon={cat.icon}
            actions={<Badge tone={cat.instrument === 'pec' ? 'warn' : 'neutral'}>{INSTRUMENT_LABELS[cat.instrument]}{cat.allowsMP ? ' · aceita MP' : ''}</Badge>}
          >
            <p className="mb-2 text-sm text-muted">{cat.description}</p>
            {(catBill || catImpl) && (
              <div className="mb-2 rounded-lg bg-info/10 px-2.5 py-1.5 text-xs text-info">
                {catBill && (
                  <button className="hover:underline" onClick={() => navigate('/jogo/congresso')}>
                    {catBill.number} ({getLawOption(cat.id, catBill.optionId)?.name}) está tramitando →
                  </button>
                )}
                {catImpl && (
                  <div>
                    Implementando {getLawOption(cat.id, catImpl.optionId)?.name}: faltam {catImpl.monthsLeft} mês(es) · força {Math.round(catImpl.strength * 100)}%
                  </div>
                )}
              </div>
            )}
            <div className="max-h-[66vh] space-y-2 overflow-y-auto pr-1">
              {cat.options.map((o) => {
                const enacted = game.laws.enacted[cat.id] === o.id;
                const isSel = selected === o.id;
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => !enacted && setOptionId(o.id)}
                    className={cn(
                      'block w-full rounded-[6px] border-2 p-2.5 text-left transition',
                      enacted ? 'border-good/60 bg-good/5' : isSel ? 'border-gold-500 bg-gold-500/10' : 'border-ink-600 bg-ink-900 hover:border-ink-400',
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display font-semibold">{o.name}</span>
                      {enacted && <Badge tone="good">Em vigor</Badge>}
                      {!enacted && <span className="ml-auto text-[11px] text-muted">custo {o.politicalCost}</span>}
                    </div>
                    <p className="mb-1.5 text-[12.5px] text-muted">{o.description}</p>
                    <Effects option={o} />
                  </button>
                );
              })}
            </div>
          </Panel>
        )}

        <div className="space-y-3">
          {cat && selected ? (
            <ProposalPanel key={`${cat.id}:${selected}`} categoryId={cat.id} optionId={selected} />
          ) : (
            <Panel title="Mudar a lei" icon="file-pen">
              <p className="text-sm text-muted">
                Escolha uma opção ao lado para ver quem apoia, quem perde e por qual instrumento ela pode tramitar: projeto de
                lei, lei complementar, emenda constitucional ou medida provisória.
              </p>
            </Panel>
          )}
          <Panel title="Em tramitação" icon="file-clock" actions={<button className="text-xs text-gold-300 hover:underline" onClick={() => navigate('/jogo/congresso')}>Congresso →</button>}>
            {activeBills.length === 0 ? (
              <p className="text-sm text-muted">Nenhuma proposição tramitando.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {activeBills.slice(0, 8).map((b) => (
                  <li key={b.id} className="flex items-center justify-between gap-2 rounded bg-ink-900 px-2 py-1" data-testid="bill">
                    <span className="min-w-0 truncate">
                      <span className="text-muted">{b.number}</span> {getLawOption(b.categoryId, b.optionId)?.name}
                    </span>
                    <Badge tone={b.authorId === 'npc' ? 'neutral' : 'gold'}>{b.authorId === 'npc' ? b.authorLabel : 'Sua'}</Badge>
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
