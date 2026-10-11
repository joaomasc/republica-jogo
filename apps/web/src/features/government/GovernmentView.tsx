import {
  coalitionSeats,
  diffMonths,
  formatDateShort,
  getLawCategory,
  getLawOption,
  OFFICES,
  promiseOverview,
} from '@republica/game-engine';
import { Button, EmptyState, Panel, PartyEmblem, StatTile } from '@republica/ui';
import { useNavigate } from 'react-router';
import { LineChartBox } from '../../components/charts';
import { billions, num } from '../../lib/format';
import { useGame, useGameState } from '../../store/gameStore';
import { PromiseRow } from './PromiseRow';
import { StreetPanel } from './StreetPanel';


function ApprovalGauge({ value }: { value: number }) {
  const angle = (value / 100) * 180;
  const rad = ((180 - angle) * Math.PI) / 180;
  const x = 100 + Math.cos(rad) * 70;
  const y = 100 - Math.sin(rad) * 70;
  const color = value >= 55 ? '#3ddc97' : value >= 40 ? '#f2b51e' : '#ff6b6b';
  return (
    <svg viewBox="0 0 200 120" className="w-full max-w-60">
      <path
        d="M30 100 A70 70 0 0 1 170 100"
        fill="none"
        stroke="#1d2a48"
        strokeWidth="18"
        strokeLinecap="round"
      />
      <path
        d={`M30 100 A70 70 0 0 1 ${x} ${y}`}
        fill="none"
        stroke={color}
        strokeWidth="18"
        strokeLinecap="round"
      />
      <text
        x="100"
        y="96"
        textAnchor="middle"
        className="font-display"
        fontSize="34"
        fill="#eef2fb"
        fontWeight="700"
      >
        {Math.round(value)}%
      </text>
      <text x="100" y="114" textAnchor="middle" fontSize="11" fill="#93a3c5">
        aprovação
      </text>
    </svg>
  );
}

export function GovernmentView() {
  const game = useGameState();
  const act = useGame((s) => s.act);
  const navigate = useNavigate();
  const gov = game.government;
  if (!gov)
    return (
      <EmptyState
        icon="landmark"
        title="Você não ocupa um cargo agora"
        text="Vença uma eleição para governar ou legislar."
      />
    );
  const office = OFFICES[gov.officeId];
  const seats = coalitionSeats(game);
  const monthsLeft = Math.max(0, diffMonths(game.date, gov.endDate));
  const history = gov.approvalHistory.map((h) => ({
    label: h.date.slice(2, 7).split('-').reverse().join('/'),
    aprovacao: h.value,
  }));
  const promises = promiseOverview(game);
  const pendingVotes = game.laws.bills.filter(
    (b) => b.status === 'committee' && b.authorId === 'npc',
  );

  return (
    <div className="space-y-3">
      <StreetPanel />
      <div className="grid grid-cols-1 gap-3 @3xl:grid-cols-[300px_minmax(0,1fr)]">
        <Panel title={`${office.name} — ${gov.jurisdiction.label}`} icon={office.icon}>
          <div className="flex flex-col items-center">
            <ApprovalGauge value={gov.approval} />
            <div className="mt-2 grid w-full grid-cols-2 gap-2">
              <StatTile
                label="Capital político"
                icon="star"
                value={Math.round(gov.politicalCapital)}
                hint="Gasto ao propor leis e negociar"
              />
              <StatTile label="Estabilidade" icon="scale" value={Math.round(gov.stability)} />
              <StatTile
                label="Meses restantes"
                icon="calendar-check"
                value={monthsLeft}
                sub={`até ${formatDateShort(gov.endDate)}`}
              />
              <StatTile
                label="Base no Legislativo"
                icon="building-2"
                value={`${seats.coalition}/${seats.total}`}
                tone={seats.coalition > seats.total / 2 ? 'good' : 'bad'}
              />
            </div>
          </div>
        </Panel>
        <Panel title="Aprovação ao longo do mandato" icon="trending-up">
          {history.length >= 2 ? (
            <LineChartBox
              data={history}
              series={[{ key: 'aprovacao', name: 'Aprovação', color: '#3ddc97' }]}
              yFormatter={(v) => `${v}%`}
              domain={[0, 100]}
              height={230}
            />
          ) : (
            <EmptyState
              icon="trending-up"
              title="O mandato acabou de começar"
              text="Avance o tempo mês a mês."
            />
          )}
        </Panel>
      </div>

      <div className="grid gap-3 @3xl:grid-cols-3">
        {gov.branch === 'executive' ? (
          <Panel
            title="Equipe de governo"
            icon="users"
            actions={
              <Button size="sm" onClick={() => navigate('/jogo/congresso')}>
                Nomear
              </Button>
            }
          >
            {gov.ministers.length === 0 ? (
              <p className="text-sm text-muted">
                Nenhuma pasta preenchida. Oferecer pastas a partidos amplia sua base no Legislativo.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {gov.ministers.map((m) => {
                  const party = game.parties[m.partyId];
                  return (
                    <li
                      key={m.portfolio}
                      className="flex items-center gap-2 rounded-lg bg-ink-900 px-2 py-1.5 text-sm"
                    >
                      {party && <PartyEmblem party={party} size={22} />}
                      <div className="min-w-0 flex-1">
                        <div className="font-bold">{m.portfolio}</div>
                        <div className="text-xs text-muted">
                          {m.name} · competência {m.competence}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => act({ type: 'gov/dismiss', portfolio: m.portfolio })}
                      >
                        Exonerar
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        ) : (
          <Panel title="Votações em plenário" icon="vote">
            {pendingVotes.length === 0 ? (
              <p className="text-sm text-muted">Nenhum projeto do Executivo aguardando seu voto.</p>
            ) : (
              <ul className="space-y-2">
                {pendingVotes.map((b) => (
                  <li key={b.id} className="rounded-xl bg-ink-900 p-2.5">
                    <div className="text-sm font-bold">
                      {getLawOption(b.categoryId, b.optionId)?.name}
                    </div>
                    <div className="text-xs text-muted">
                      {getLawCategory(b.categoryId)?.name} · votação em{' '}
                      {formatDateShort(b.voteDate)}{' '}
                      {b.playerVote
                        ? `· seu voto: ${b.playerVote === 'yes' ? 'SIM' : b.playerVote === 'no' ? 'NÃO' : 'abstenção'}`
                        : ''}
                    </div>
                    <div className="mt-1.5 flex gap-1.5">
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => act({ type: 'gov/vote', billId: b.id, vote: 'yes' })}
                      >
                        Sim
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => act({ type: 'gov/vote', billId: b.id, vote: 'no' })}
                      >
                        Não
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => act({ type: 'gov/vote', billId: b.id, vote: 'abstain' })}
                      >
                        Abster-se
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-2 text-xs text-muted">
              Fidelidade partidária: {Math.round(gov.partyLoyalty)} · Projetos aprovados de sua
              autoria: {gov.billsPassed}
            </div>
          </Panel>
        )}
        <Panel title="Promessas de campanha" icon="file-text">
          {promises.length === 0 ? (
            <p className="text-sm text-muted">Nenhuma promessa registrada.</p>
          ) : (
            <ul className="space-y-1.5">
              {promises.map((p) => (
                <PromiseRow key={p.id} p={p} />
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-muted">
            Avaliadas no fim do mandato: afetam sua credibilidade e a próxima eleição.
          </p>
        </Panel>
        <Panel title="Indicadores" icon="trending-up">
          <div className="grid grid-cols-2 gap-2">
            <StatTile
              label="PIB"
              icon="trending-up"
              value={`${num(game.economy.growth)}%`}
              tone={game.economy.growth >= 2 ? 'good' : game.economy.growth < 0 ? 'bad' : 'neutral'}
            />
            <StatTile
              label="Inflação"
              icon="receipt"
              value={`${num(game.economy.inflation)}%`}
              tone={game.economy.inflation > 6 ? 'bad' : 'neutral'}
            />
            <StatTile
              label="Desemprego"
              icon="users"
              value={`${num(game.economy.unemployment)}%`}
            />
            <StatTile label="Dívida" icon="landmark" value={`${num(game.economy.debt, 0)}% PIB`} />
            {gov.budget && (
              <StatTile
                label="Saldo do caixa"
                icon="piggy-bank"
                value={billions(gov.budget.balance)}
                tone={gov.budget.balance < 0 ? 'bad' : 'good'}
              />
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {gov.branch === 'executive' && (
              <Button size="sm" onClick={() => navigate('/jogo/orcamento')}>
                Orçamento
              </Button>
            )}
            <Button size="sm" onClick={() => navigate('/jogo/leis')}>
              Leis
            </Button>
            <Button size="sm" onClick={() => navigate('/jogo/economia')}>
              Economia
            </Button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
