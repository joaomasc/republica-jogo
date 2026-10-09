import {
  actionCost,
  CAMPAIGN_ACTIONS,
  canStartInterview,
  diffDays,
  formatMoney,
  formatNumber,
  hiringCost,
  INTERVIEW_TYPE_INFO,
  INTERVIEW_TYPES,
  ISSUE_DEFINITIONS,
  OFFICES,
  POP_TYPE_LIST,
  proposalsFor,
  STAFF_LEVELS,
  STAFF_ROLES,
  STAFF_ROLE_IDS,
  type CampaignActionDefinition,
  type PopTypeId,
  type StaffRoleId,
  getLawCategory,
} from '@republica/game-engine';
import {
  Badge,
  Bar,
  Button,
  cn,
  EmptyState,
  Icon,
  Modal,
  Panel,
  Segmented,
  StatTile,
} from '@republica/ui';
import { useState } from 'react';
import { Link } from 'react-router';
import { pp } from '../../lib/format';
import { useGame, useGameState } from '../../store/gameStore';
import { ProposalPreview } from './ProposalPreview';
import { WeekPanel } from '../week/WeekPanel';

const CATEGORY_LABEL = {
  ground: 'Rua e regiões',
  media: 'Mídia espontânea',
  politics: 'Política e propostas',
  logistics: 'Estrutura',
} as const;

function ActionDialog({
  action,
  onClose,
}: {
  action: CampaignActionDefinition;
  onClose: () => void;
}) {
  const game = useGameState();
  const act = useGame((s) => s.act);
  const election = game.election;
  const units = [...(election?.units ?? [])].sort((a, b) => b.voters - a.voters);
  const [unitId, setUnitId] = useState(units[0]?.id ?? '');
  const [popTypeId, setPopTypeId] = useState<PopTypeId>('workers');
  const level = election ? OFFICES[election.officeId].level : 'federal';
  const proposals = proposalsFor(level);
  const made = new Set(game.promises.map((p) => p.proposalId));
  const [proposalId, setProposalId] = useState(
    proposals.find((p) => !made.has(p.id))?.id ?? proposals[0]?.id ?? '',
  );
  const proposal = proposals.find((p) => p.id === proposalId);
  const needsUnit = action.target === 'unit' || action.target === 'unitAndProposal';
  const needsProposal = action.target === 'proposal' || action.target === 'unitAndProposal';

  const run = () => {
    const r = act({
      type: 'campaign/action',
      input: {
        actionId: action.id,
        ...(needsUnit ? { unitId } : {}),
        ...(action.target === 'popType' ? { popTypeId } : {}),
        ...(needsProposal ? { proposalId } : {}),
      },
    });
    if (r.ok) onClose();
  };

  return (
    <Modal
      open
      title={action.name}
      icon={action.icon}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={run} data-testid="action-confirm">
            Executar
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-muted">{action.description}</p>
        <div className="flex flex-wrap gap-1.5">
          <Badge tone="gold">
            {action.cost > 0 ? formatMoney(actionCost(game, action)) : 'Sem custo'}
          </Badge>
          <Badge tone="info">Energia {action.energy}</Badge>
          <Badge>{action.days === 0 ? 'Rápida' : `${action.days} dia(s)`}</Badge>
          {action.risk > 0 && <Badge tone="warn">Risco {Math.round(action.risk * 100)}%</Badge>}
          <Badge>Público: {action.audience}</Badge>
        </div>
        {needsUnit && (
          <label className="block">
            <span className="label">Região</span>
            <select
              className="game-select mt-1 w-full"
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
              data-testid="action-unit"
            >
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} — {formatNumber(u.voters)} eleitores · presença{' '}
                  {Math.round(election?.participants[game.playerId]?.presence[u.id] ?? 0)}
                </option>
              ))}
            </select>
          </label>
        )}
        {action.target === 'popType' && (
          <label className="block">
            <span className="label">Grupo social</span>
            <select
              className="game-select mt-1 w-full"
              value={popTypeId}
              onChange={(e) => setPopTypeId(e.target.value as PopTypeId)}
            >
              {POP_TYPE_LIST.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.plural}
                </option>
              ))}
            </select>
          </label>
        )}
        {needsProposal && (
          <div className="space-y-2">
            <span className="label">Proposta</span>
            <div className="grid max-h-64 gap-1.5 overflow-y-auto pr-1">
              {proposals.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setProposalId(p.id)}
                  className={cn(
                    'rounded-lg border-2 px-2.5 py-1.5 text-left',
                    proposalId === p.id
                      ? 'border-gold-400 bg-gold-500/10'
                      : 'border-ink-600 bg-ink-900',
                  )}
                >
                  <div className="flex items-center gap-2 text-sm font-bold">
                    <Icon
                      name={ISSUE_DEFINITIONS[p.issue].icon}
                      size={13}
                      className="text-gold-400"
                    />
                    {p.title}
                    {made.has(p.id) && <Badge tone="info">já prometida</Badge>}
                    {(p.promise.kind === 'law' || p.promise.kind === 'noLaw') &&
                      !getLawCategory(p.promise.categoryId)?.levels.includes(level) && (
                        <Badge tone="neutral">depende de outra esfera</Badge>
                      )}
                  </div>
                  <div className="text-xs text-muted">{p.description}</div>
                </button>
              ))}
            </div>
            {proposal && <ProposalPreview game={game} proposal={proposal} />}
          </div>
        )}
      </div>
    </Modal>
  );
}

export function CampaignView() {
  const game = useGameState();
  const act = useGame((s) => s.act);
  const [dialog, setDialog] = useState<CampaignActionDefinition | null>(null);
  const [level, setLevel] = useState<'1' | '2' | '3'>('1');
  const campaign = game.campaign;
  const election = game.election;
  if (!campaign || !election)
    return <EmptyState icon="megaphone" title="Sem campanha em andamento" />;
  const daysLeft = diffDays(game.date, election.date);
  const hired = new Set(campaign.staff.map((s) => s.roleId));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        <StatTile label="Caixa" icon="piggy-bank" value={formatMoney(campaign.money)} />
        <StatTile
          label="Energia"
          icon="rocket"
          value={`${Math.round(campaign.energy)}/100`}
          sub={<Bar value={campaign.energy / 100} height={5} color="var(--color-info)" />}
        />
        <StatTile label="Militantes" icon="users" value={formatNumber(campaign.militants)} />
        <StatTile
          label="Entusiasmo da base"
          icon="flame"
          value={`${Math.round(campaign.enthusiasm)}`}
          tone={campaign.enthusiasm >= 60 ? 'good' : campaign.enthusiasm < 35 ? 'bad' : 'neutral'}
        />
        <StatTile
          label="Dias restantes"
          icon="calendar-check"
          value={`${daysLeft}`}
          tone={daysLeft < 7 ? 'bad' : 'neutral'}
        />
        <StatTile
          label="Preparação"
          icon="graduation-cap"
          value={`${Math.round(campaign.prepBonus * 100)}%`}
          hint="Bônus para debates e entrevistas"
        />
      </div>

      <WeekPanel />

      <Link
        to="/jogo/agenda"
        className="flex items-center gap-2 rounded-xl border-2 border-gold-500/40 bg-gold-500/10 px-3 py-2 text-sm hover:bg-gold-500/15"
      >
        <Icon name="calendar-check" size={16} className="text-gold-400" />
        {campaign.agenda?.enabled ? (
          <span>
            <b>Agenda automática ativa</b> — {campaign.agenda.items.filter((i) => i.enabled).length}{' '}
            compromisso(s) rodam sozinhos a cada dia avançado. Clique para ajustar.
          </span>
        ) : (
          <span>
            <b>Cansado de clicar todo dia?</b> Monte uma agenda automática e a equipe executa sua
            rotina sozinha.
          </span>
        )}
      </Link>

      <div className="grid gap-3 2xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel title="Ações de campanha" icon="megaphone">
          <div className="space-y-4">
            {(Object.keys(CATEGORY_LABEL) as (keyof typeof CATEGORY_LABEL)[]).map((cat) => (
              <div key={cat}>
                <div className="label mb-1.5">{CATEGORY_LABEL[cat]}</div>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {CAMPAIGN_ACTIONS.filter((a) => a.category === cat).map((a) => {
                    const cost = actionCost(game, a);
                    const affordable = campaign.money >= cost && campaign.energy >= a.energy;
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() =>
                          a.target === 'none'
                            ? act({ type: 'campaign/action', input: { actionId: a.id } })
                            : setDialog(a)
                        }
                        disabled={!affordable || game.phase !== 'campaign'}
                        className="card-hover flex flex-col gap-1 rounded-xl border-2 border-ink-600 bg-ink-900 p-2.5 text-left disabled:opacity-40"
                        data-testid={`action-${a.id}`}
                      >
                        <div className="flex items-center gap-2 font-display font-semibold">
                          <Icon name={a.icon} size={16} className="text-gold-400" />
                          {a.name}
                        </div>
                        <div className="line-clamp-2 text-[11px] text-muted">{a.description}</div>
                        <div className="mt-auto flex flex-wrap gap-1 pt-1">
                          <Badge tone="gold">{a.cost > 0 ? formatMoney(cost) : 'grátis'}</Badge>
                          <Badge tone="info">⚡{a.energy}</Badge>
                          <Badge>{a.days === 0 ? 'rápida' : `${a.days}d`}</Badge>
                          {a.risk >= 0.05 && <Badge tone="warn">risco</Badge>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <div className="space-y-3">
          <Panel title="Entrevistas" icon="mic">
            <div className="grid grid-cols-2 gap-2">
              {INTERVIEW_TYPES.map((t) => {
                const info = INTERVIEW_TYPE_INFO[t];
                const blocked = canStartInterview(game, t);
                return (
                  <Button
                    key={t}
                    size="sm"
                    icon={<Icon name={info.icon} size={14} />}
                    disabled={!!blocked}
                    onClick={() => act({ type: 'interview/start', interviewType: t })}
                    title={blocked ?? `Energia ${info.energy}`}
                    data-testid={`interview-${t}`}
                  >
                    {info.name}
                  </Button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted">
              Perguntas difíceis podem lembrar escândalos e promessas. Respostas viram notícia.
            </p>
          </Panel>

          <Panel
            title="Equipe"
            icon="users"
            actions={
              <Segmented
                options={[
                  { id: '1', label: 'Júnior' },
                  { id: '2', label: 'Pleno' },
                  { id: '3', label: 'Sênior' },
                ]}
                value={level}
                onChange={setLevel}
              />
            }
          >
            <ul className="space-y-1.5">
              {STAFF_ROLE_IDS.map((roleId: StaffRoleId) => {
                const role = STAFF_ROLES[roleId];
                const member = campaign.staff.find((s) => s.roleId === roleId);
                const lvl = Number(level) as 1 | 2 | 3;
                return (
                  <li
                    key={roleId}
                    className="flex items-center gap-2 rounded-lg bg-ink-900 px-2 py-1.5"
                  >
                    <Icon name={role.icon} size={15} className="shrink-0 text-gold-400" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold">{role.name}</div>
                      <div className="truncate text-[11px] text-muted">
                        {member
                          ? `${member.name} · ${STAFF_LEVELS[member.level].name}`
                          : role.description}
                      </div>
                    </div>
                    {member ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => act({ type: 'campaign/fire', staffId: member.id })}
                      >
                        Dispensar
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        disabled={hired.has(roleId)}
                        onClick={() => act({ type: 'campaign/hire', roleId, level: lvl })}
                        title={`Salário: ${formatMoney(role.dailySalary * STAFF_LEVELS[lvl].salary * campaign.moneyScale)}/dia`}
                        data-testid={`hire-${roleId}`}
                      >
                        {formatMoney(hiringCost(roleId, lvl, campaign.moneyScale))}
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          </Panel>

          <Panel
            title="Diário de campanha"
            icon="file-text"
            actions={
              <Link to="/jogo/impacto" className="text-xs font-bold text-gold-400 underline">
                Ver impacto
              </Link>
            }
          >
            {campaign.log.length === 0 ? (
              <p className="text-sm text-muted">Nenhuma ação ainda. O relógio está correndo!</p>
            ) : (
              <ul className="space-y-1.5 text-xs">
                {campaign.log.slice(0, 8).map((l, i) => (
                  <li key={i} className="rounded-lg bg-ink-900 px-2 py-1">
                    <span className="font-bold">{l.label}</span>{' '}
                    {l.auto && <Badge tone="info">agenda</Badge>}{' '}
                    <span className="text-muted">
                      · {l.date.split('-').reverse().slice(0, 2).join('/')}
                    </span>
                    {l.impact && (
                      <Badge
                        tone={
                          l.impact.share > 5e-5
                            ? 'good'
                            : l.impact.share < -5e-5
                              ? 'bad'
                              : 'neutral'
                        }
                        className="ml-1 normal-case"
                      >
                        {pp(l.impact.share)}
                      </Badge>
                    )}
                    {l.summary && <div className="text-muted">{l.summary}</div>}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
      {dialog && <ActionDialog action={dialog} onClose={() => setDialog(null)} />}
    </div>
  );
}
