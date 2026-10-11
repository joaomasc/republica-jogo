import {
  billDetail,
  billsOverview,
  caucusesView,
  chamberView,
  executiveInfoView,
  formatDateShort,
  impeachmentView,
  legislativeAgenda,
  type BillSummary,
} from '@republica/game-engine';
import { Badge, Bar, Button, cn, EmptyState, Icon, Panel } from '@republica/ui';
import { useMemo, useState } from 'react';
import { useGame, useGameState } from '../../store/gameStore';
import { PartySupport, ProjectionBars, VoteResult } from './BillParts';
import { PartiesTab } from './CongressParties';
import { ManeuversPanel } from './ManeuversPanel';

type Tab = 'bills' | 'parties' | 'caucuses' | 'house';

function StatusBadge({ s }: { s: BillSummary }) {
  const tone = s.status === 'passed' ? 'good' : ['rejected', 'expired'].includes(s.status) ? 'bad' : s.status === 'withdrawn' ? 'neutral' : 'info';
  return <Badge tone={tone}>{s.statusLabel}</Badge>;
}

function BillRow({ s, active, onClick }: { s: BillSummary; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn('block w-full rounded-[5px] border px-2.5 py-1.5 text-left', active ? 'border-gold-500 bg-gold-500/10' : 'border-ink-600 bg-ink-900 hover:border-ink-400')}
    >
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] tabular-nums text-muted">{s.number}</span>
        {s.mine && <Badge tone="gold">Sua</Badge>}
        {s.needsPlayer && <Badge tone="bad">Ação sua</Badge>}
        {s.urgency && <Icon name="zap" size={12} className="text-warn" />}
        <span className="ml-auto">
          <StatusBadge s={s} />
        </span>
      </div>
      <div className="truncate text-sm font-semibold">{s.title}</div>
      <div className="flex items-center gap-2 text-[11px] text-muted">
        <span className="min-w-0 flex-1 truncate">{s.stage}</span>
        {s.likely !== null && <span className={s.likely ? 'text-good' : 'text-bad'}>{s.likely ? 'tende a passar' : 'tende a cair'}</span>}
      </div>
      <Bar value={s.progress} height={3} />
    </button>
  );
}

function BillPanel({ billId }: { billId: string }) {
  const game = useGameState();
  const act = useGame((s) => s.act);
  const d = useMemo(() => billDetail(game, billId), [game, billId]);
  const [party, setParty] = useState('');
  if (!d) return null;
  const s = d.summary;
  const exec = executiveInfoView(game);
  const gov = game.government;
  const moving = s.status === 'committee' || s.status === 'floor';
  const parties = Object.entries(game.congress.chambers[0]?.seats ?? {}).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  const target = party || parties.find(([pid]) => (d.projection.chambers[0]?.byParty[pid] ?? 1) < 0.5)?.[0] || parties[0]?.[0] || '';
  const legislator = gov?.branch === 'legislative';

  return (
    <Panel title={`${s.number} · ${s.title}`} icon="file-text" actions={<StatusBadge s={s} />}>
      <div className="space-y-3">
        <div className="text-xs text-muted">
          {s.instrumentLabel} · {s.categoryName} · autor: {s.author}
          {d.mpExpires && ` · MP vale até ${formatDateShort(d.mpExpires)}`}
        </div>
        <p className="text-sm">{d.description}</p>

        <ol className="flex flex-wrap items-center gap-1 text-xs">
          {d.path.map((p, i) => (
            <li key={p.chamberId} className="flex items-center gap-1">
              {i > 0 && <Icon name="chevron-right" size={12} className="text-muted" />}
              <span className={cn('rounded px-1.5 py-0.5', p.current ? 'bg-gold-500/20 text-gold-200' : p.done ? 'bg-good/15 text-good' : 'bg-ink-900 text-muted')}>
                {p.name}
                {p.rounds > 1 ? ` (${p.rounds} turnos)` : ''}
              </span>
            </li>
          ))}
          <li className="flex items-center gap-1">
            <Icon name="chevron-right" size={12} className="text-muted" />
            <span className={cn('rounded px-1.5 py-0.5', s.status === 'sanction' || s.status === 'veto' ? 'bg-gold-500/20 text-gold-200' : 'bg-ink-900 text-muted')}>
              {s.instrument === 'pec' ? 'Promulgação' : 'Sanção'}
            </span>
          </li>
        </ol>

        {d.relator && (
          <div className="rounded-lg bg-ink-900 px-2.5 py-1.5 text-sm">
            Relator: <b>{d.relator.name}</b> ({d.relator.party}) · parecer <b>{d.relator.report.toLowerCase()}</b>
            {d.relator.isPlayer && <Badge tone="gold">Você</Badge>}
          </div>
        )}
        {d.signatures && (
          <div className="text-sm">
            Assinaturas: {d.signatures.have} de {d.signatures.need}
            <Bar value={d.signatures.have / Math.max(1, d.signatures.need)} height={5} />
          </div>
        )}

        {moving && (
          <div>
            <ProjectionBars projection={d.projection} />
            <div className="mt-1.5">
              <PartySupport game={game} projection={d.projection} />
            </div>
          </div>
        )}

        {d.votes.length > 0 && (
          <div className="space-y-1">
            {d.votes.map((v, i) => (
              <VoteResult key={i} vote={v} />
            ))}
          </div>
        )}

        {s.status === 'sanction' && exec.isPlayer && (
          <div className="flex flex-wrap gap-2 rounded-lg border border-gold-500/40 bg-gold-500/5 p-2">
            <span className="w-full text-sm">O Legislativo aprovou. Sancione para virar lei ou vete (o Congresso pode derrubar o veto).</span>
            <Button variant="success" onClick={() => act({ type: 'leg/sanction', billId, decision: 'sanction' })}>
              Sancionar
            </Button>
            <Button variant="danger" onClick={() => act({ type: 'leg/sanction', billId, decision: 'veto' })}>
              Vetar
            </Button>
          </div>
        )}

        {moving && gov && (
          <div className="flex flex-wrap gap-1.5">
            {!s.urgency && (
              <Button size="sm" onClick={() => act({ type: 'leg/urgency', billId })} title="Encurta prazos de comissão e pauta (capital político)">
                Pedir urgência
              </Button>
            )}
            <Button size="sm" onClick={() => act({ type: 'leg/agenda', billId })} title="Acordo com o presidente da casa para pautar o projeto">
              Negociar pauta
            </Button>
            {s.status === 'committee' && d.relator && (
              <Button size="sm" onClick={() => act({ type: 'leg/relator', billId })}>
                {d.relator.isPlayer ? 'Mudar meu parecer' : 'Conversar com o relator'}
              </Button>
            )}
            {d.signatures && d.signatures.have < d.signatures.need && (
              <Button size="sm" onClick={() => act({ type: 'leg/signatures', billId })}>
                Coletar assinaturas
              </Button>
            )}
            {s.mine && (
              <>
                <Button size="sm" onClick={() => act({ type: 'gov/concession', billId })} title="Suaviza a lei (efeito menor) para atrair opositores">
                  Concessão ({d.concessions})
                </Button>
                <Button size="sm" onClick={() => act({ type: 'gov/publicCampaign', billId })} title="Usa capital político e sua aprovação">
                  Mobilizar a opinião pública
                </Button>
                {exec.isPlayer && (
                  <span className="flex items-center gap-1">
                    <select className="game-select py-1 text-xs" value={target} onChange={(e) => setParty(e.target.value)}>
                      {parties.map(([pid]) => (
                        <option key={pid} value={pid}>
                          {game.parties[pid]?.acronym}
                        </option>
                      ))}
                    </select>
                    <Button size="sm" onClick={() => act({ type: 'gov/amendments', partyId: target, billId })} title="Custa orçamento e pode gerar desgaste">
                      Liberar emendas
                    </Button>
                  </span>
                )}
                <Button size="sm" variant="primary" onClick={() => act({ type: 'gov/rush', billId })} data-testid="bill-rush" title="Urgência urgentíssima: todas as votações hoje">
                  Votar tudo hoje
                </Button>
                <Button size="sm" variant="ghost" onClick={() => act({ type: 'gov/withdraw', billId })}>
                  Retirar
                </Button>
              </>
            )}
            {legislator && s.status === 'floor' && (
              <span className="flex items-center gap-1 text-xs">
                <span className="text-muted">Meu voto:</span>
                {(['yes', 'no', 'abstain'] as const).map((v) => (
                  <Button key={v} size="sm" variant={d.playerVote === v ? 'primary' : 'ghost'} onClick={() => act({ type: 'leg/vote', billId, vote: v })}>
                    {v === 'yes' ? 'Sim' : v === 'no' ? 'Não' : 'Abster'}
                  </Button>
                ))}
              </span>
            )}
          </div>
        )}

        {moving && !s.mine && gov && (
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
              Manobras contra o projeto
              <span className="font-normal normal-case tracking-normal">— atrasar, desidratar ou derrubar</span>
            </div>
            <ManeuversPanel billId={billId} />
          </div>
        )}
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">Tramitação</div>
          <ol className="max-h-56 space-y-1 overflow-y-auto pr-1 text-xs">
            {d.timeline.map((e, i) => (
              <li key={i} className="border-l-2 border-ink-500 pl-2">
                <span className="text-muted">{formatDateShort(e.date)}</span> — {e.text}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Panel>
  );
}

function BillsTab() {
  const game = useGameState();
  const ov = useMemo(() => billsOverview(game), [game]);
  const agenda = useMemo(() => legislativeAgenda(game), [game]);
  const [sel, setSel] = useState<string | null>(null);
  const [showClosed, setShowClosed] = useState(false);
  const list = showClosed ? ov.closed : ov.active;
  const current = sel && [...ov.active, ...ov.closed].some((b) => b.id === sel) ? sel : (ov.active[0]?.id ?? ov.closed[0]?.id ?? null);
  return (
    <div className="grid grid-cols-1 gap-3 @4xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)]">
      <div className="space-y-3">
        <Panel
          title="Proposições"
          icon="file-stack"
          actions={
            <div className="flex gap-1 text-xs">
              <button className={!showClosed ? 'text-gold-300' : 'text-muted'} onClick={() => setShowClosed(false)}>
                Tramitando ({ov.active.length})
              </button>
              <span className="text-muted">·</span>
              <button className={showClosed ? 'text-gold-300' : 'text-muted'} onClick={() => setShowClosed(true)}>
                Encerradas
              </button>
            </div>
          }
        >
          {list.length === 0 ? (
            <p className="text-sm text-muted">{showClosed ? 'Nada encerrado ainda.' : 'Nenhuma proposição tramitando. Proponha mudanças na tela de Leis.'}</p>
          ) : (
            <div className="max-h-[56vh] space-y-1.5 overflow-y-auto pr-1">
              {list.map((s) => (
                <BillRow key={s.id} s={s} active={current === s.id} onClick={() => setSel(s.id)} />
              ))}
            </div>
          )}
        </Panel>
        <Panel title="Pauta das próximas sessões" icon="calendar-check">
          {agenda.length === 0 ? (
            <p className="text-sm text-muted">Nenhuma votação marcada.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {agenda.slice(0, 8).map((a) => (
                <li key={`${a.billId}-${a.date}`} className="flex gap-2">
                  <span className="w-12 shrink-0 tabular-nums text-muted">{formatDateShort(a.date)}</span>
                  <span className="min-w-0 flex-1 truncate">
                    {a.number} {a.title}
                  </span>
                  <span className="text-xs text-muted">{a.chamber}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
      {current ? <BillPanel billId={current} /> : <EmptyState icon="file-text" title="Nenhuma proposição" />}
    </div>
  );
}

function CaucusesTab() {
  const game = useGameState();
  const act = useGame((s) => s.act);
  const list = useMemo(() => caucusesView(game), [game]);
  const legislator = game.government?.branch === 'legislative';
  return (
    <Panel title="Bancadas temáticas" icon="users">
      <p className="mb-2 text-sm text-muted">
        Bancadas cruzam partidos: um deputado do agro vota com o agro mesmo contra o partido. Elas apresentam projetos,
        cobram fidelidade e vendem caro o apoio.
      </p>
      <div className="grid gap-2 @2xl:grid-cols-2">
        {list.map((c) => (
          <div key={c.id} className="rounded-xl border-2 border-ink-600 bg-ink-900 p-2.5">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded" style={{ background: `${c.color}33`, color: c.color }}>
                <Icon name={c.icon} size={17} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-display font-semibold">
                  {c.name} {c.playerMember && <Badge tone="gold">Membro</Badge>}
                </div>
                <div className="text-xs text-muted">
                  {c.members} parlamentares · líder {c.leader} · força {Math.round(c.strength * 100)}%
                </div>
              </div>
              <span className={cn('text-sm tabular-nums', c.relation >= 0 ? 'text-good' : 'text-bad')} title="Relação com você">
                {c.relation > 0 ? '+' : ''}
                {Math.round(c.relation)}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted">{c.description}</p>
            {c.agenda.length > 0 && <div className="mt-1 text-[11px]">Pauta: {c.agenda.join(' · ')}</div>}
            <div className="mt-2 flex gap-1.5">
              <Button size="sm" onClick={() => act({ type: 'leg/caucus', caucusId: c.id, op: 'meet' })}>
                Reunir-se
              </Button>
              {legislator &&
                (c.playerMember ? (
                  <Button size="sm" variant="ghost" onClick={() => act({ type: 'leg/caucus', caucusId: c.id, op: 'leave' })}>
                    Sair
                  </Button>
                ) : (
                  <Button size="sm" variant="primary" onClick={() => act({ type: 'leg/caucus', caucusId: c.id, op: 'join' })}>
                    Entrar
                  </Button>
                ))}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function HouseTab() {
  const game = useGameState();
  const act = useGame((s) => s.act);
  const imp = useMemo(() => impeachmentView(game), [game]);
  const exec = executiveInfoView(game);
  const gov = game.government;
  const leg = game.legislature;
  return (
    <div className="grid gap-3 @3xl:grid-cols-2">
      <div className="space-y-3">
        {game.congress.chambers.map((c) => {
          const v = chamberView(game, c.id);
          if (!v) return null;
          return (
            <Panel key={c.id} title={`Mesa da ${v.name}`} icon="gavel">
              {v.speaker ? (
                <div className="space-y-1 text-sm">
                  <div>
                    Presidente: <b>{v.speaker.name}</b> ({v.speaker.party}) {v.speaker.isPlayer && <Badge tone="gold">Você</Badge>}
                  </div>
                  <div className="text-xs text-muted">
                    Controla a pauta: projetos de quem ele não gosta vão para a gaveta. Próxima eleição da mesa:{' '}
                    {formatDateShort(v.speaker.nextElection)}.
                  </div>
                  {!v.speaker.isPlayer && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted">Relação com você</span>
                      <Bar value={(v.speaker.relation + 100) / 200} color={v.speaker.relation >= 0 ? 'var(--color-good)' : 'var(--color-bad)'} height={5} />
                      <span className="tabular-nums">{Math.round(v.speaker.relation)}</span>
                    </div>
                  )}
                  <div className="text-xs">
                    Base do governo: {v.government} de {v.total} cadeiras ({Math.round((v.government / Math.max(1, v.total)) * 100)}%)
                  </div>
                  {gov && !v.speaker.isPlayer && (
                    <Button size="sm" onClick={() => act({ type: 'leg/speaker', chamberId: c.id })}>
                      {gov.branch === 'legislative' ? 'Candidatar-me à presidência' : 'Apoiar um aliado na eleição da mesa'}
                    </Button>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted">Mesa não formada.</p>
              )}
            </Panel>
          );
        })}
        {gov?.branch === 'legislative' && (
          <Panel title="Seu mandato" icon="user-check">
            <div className="space-y-1 text-sm">
              <div>
                Fidelidade ao governo: <b>{Math.round(leg.governmentLoyalty ?? 50)}</b>/100 — {exec.office} libera emendas a quem vota com a base.
              </div>
              <div>
                Emendas no ano: R$ {leg.amendments.budget.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} bi · executadas{' '}
                {leg.amendments.executed.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} · bloqueadas{' '}
                {leg.amendments.blocked.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
              </div>
            </div>
          </Panel>
        )}
      </div>
      <div className="space-y-3">
        <Panel title="Impeachment" icon="gavel">
          {imp ? (
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <b>{imp.targetName}</b>
                <Badge tone={imp.active ? 'bad' : 'neutral'}>{imp.stage}</Badge>
                {imp.outcome && <Badge tone="gold">{imp.outcome}</Badge>}
              </div>
              <p className="text-xs text-muted">{imp.reason}</p>
              {imp.active && (
                <div className="text-xs">
                  Votação em {formatDateShort(imp.nextDate)}: ~{imp.expectedYes} votos pelo afastamento, precisa de {imp.required} de {imp.total}.
                  <Bar value={imp.expectedYes / Math.max(1, imp.total)} color="var(--color-bad)" height={6} />
                </div>
              )}
              {imp.votes.map((v, i) => (
                <VoteResult key={i} vote={v} />
              ))}
              {imp.active && imp.targetIsPlayer && (
                <Button size="sm" variant="primary" onClick={() => act({ type: 'leg/impeachment', op: 'defend' })}>
                  Articular defesa (capital político)
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <p className="text-muted">Nenhum processo aberto. Impeachment exige 2/3 da Câmara para abrir e 2/3 do Senado para condenar.</p>
              {gov?.branch === 'legislative' && !exec.isPlayer && (
                <Button size="sm" variant="danger" onClick={() => act({ type: 'leg/impeachment', op: 'file' })}>
                  Protocolar pedido de impeachment contra {exec.office}
                </Button>
              )}
            </div>
          )}
        </Panel>
        <Panel title="Diário do Legislativo" icon="scroll">
          {leg.log.length === 0 ? (
            <p className="text-sm text-muted">Nada registrado ainda.</p>
          ) : (
            <ul className="max-h-80 space-y-1 overflow-y-auto pr-1 text-xs">
              {leg.log.slice(0, 40).map((l, i) => (
                <li key={i} className={l.tone === 'good' ? 'text-good' : l.tone === 'bad' ? 'text-bad' : ''}>
                  <span className="text-muted">{formatDateShort(l.date)}</span> — {l.text}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'bills', label: 'Proposições', icon: 'file-stack' },
  { id: 'parties', label: 'Plenário e partidos', icon: 'building-2' },
  { id: 'caucuses', label: 'Bancadas', icon: 'users' },
  { id: 'house', label: 'Mesa e impeachment', icon: 'gavel' },
];

/** Congresso: proposições em tramitação, partidos, bancadas, mesas e impeachment. */
export function CongressView() {
  const game = useGameState();
  const [tab, setTab] = useState<Tab>('bills');
  if (!game.government) return <EmptyState icon="building-2" title="Sem mandato" />;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex items-center gap-1.5 rounded-[4px] border px-3 py-1.5 text-sm',
              tab === t.id ? 'border-gold-500 bg-gold-500/15 text-gold-200' : 'border-ink-600 bg-ink-900 text-paper/80 hover:border-ink-400',
            )}
            data-testid={`congress-tab-${t.id}`}
          >
            <Icon name={t.icon} size={14} />
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'bills' && <BillsTab />}
      {tab === 'parties' && <PartiesTab />}
      {tab === 'caucuses' && <CaucusesTab />}
      {tab === 'house' && <HouseTab />}
    </div>
  );
}
