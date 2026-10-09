import type { ImpactReport, ImpactRow } from '@republica/game-engine';
import { Button, cn, Icon, Modal } from '@republica/ui';
import { useState } from 'react';

function fmtValue(r: ImpactRow, v: number): string {
  switch (r.unit) {
    case 'brl':
      return `R$ ${Math.round(v).toLocaleString('pt-BR')}`;
    case 'brl_bi':
      return `R$ ${Math.round(v).toLocaleString('pt-BR')} bi`;
    case 'price':
      return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    case 'points':
      return Math.round(v).toLocaleString('pt-BR');
    default:
      return v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }
}

function fmtDelta(r: ImpactRow): string {
  const sign = r.delta > 0 ? '+' : r.delta < 0 ? '−' : '±';
  const a = Math.abs(r.delta);
  switch (r.unit) {
    case 'pct':
      return `${sign}${(a * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
    case 'price':
      // Câmbio: variação absoluta (R$); bens: variação relativa do preço.
      return r.id === 'exchange'
        ? `${sign}R$ ${a.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}`
        : `${sign}${(a * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
    case 'pp':
      return `${sign}${a.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} p.p.`;
    case 'brl':
      return `${sign}R$ ${Math.round(a).toLocaleString('pt-BR')}`;
    case 'brl_bi':
      return `${sign}R$ ${Math.round(a).toLocaleString('pt-BR')} bi`;
    default:
      return `${sign}${a.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}`;
  }
}

/** Limiar abaixo do qual a variação é tratada como "sem efeito". */
function negligible(r: ImpactRow): boolean {
  if (r.unit === 'pct' || (r.unit === 'price' && r.id !== 'exchange')) return Math.abs(r.delta) < 0.005;
  if (r.unit === 'pp') return Math.abs(r.delta) < 0.05;
  if (r.unit === 'brl' || r.unit === 'brl_bi') return Math.abs(r.delta) < Math.max(0.5, Math.abs(r.base) * 0.002);
  if (r.id === 'exchange') return Math.abs(r.delta) < 0.01;
  return Math.abs(r.delta) < 0.5;
}

function Delta({ r }: { r: ImpactRow }) {
  if (negligible(r)) return <span className="text-muted">sem efeito</span>;
  const good = r.delta > 0 === r.goodWhenUp;
  return <span className={good ? 'text-good' : 'text-bad'}>{fmtDelta(r)}</span>;
}

function Section({ title, icon, rows, showValues = true, hint }: { title: string; icon: string; rows: ImpactRow[]; showValues?: boolean; hint?: string }) {
  if (rows.length === 0) return null;
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
        <Icon name={icon} size={13} className="text-gold-500" />
        {title}
      </div>
      {hint && <p className="mb-1 text-[11px] text-muted">{hint}</p>}
      <table className="w-full text-sm">
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-ink-700/60">
              <td className="py-1">{r.label}</td>
              {showValues && <td className="whitespace-nowrap text-right tabular-nums text-muted">{fmtValue(r, r.base)}</td>}
              {showValues && <td className="px-1 text-center text-muted">→</td>}
              {showValues && <td className="whitespace-nowrap text-right tabular-nums">{fmtValue(r, r.after)}</td>}
              <td className="w-32 whitespace-nowrap pl-2 text-right tabular-nums">
                <Delta r={r} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Relatório "o que muda": compara o futuro sem e com a decisão. */
export function ImpactReportView({ report }: { report: ImpactReport }) {
  const years = report.months / 12;
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted">
        O jogo simulou os próximos {report.months} meses ({years.toLocaleString('pt-BR')} anos) duas vezes, com a mesma sorte: uma sem a
        mudança e outra com ela em vigor. A diferença abaixo é o efeito da decisão segundo o modelo do jogo (sem contar eventos,
        crises e o Congresso, que podem mudar tudo).
      </p>
      <div className="rounded-lg border border-gold-500/30 bg-gold-500/5 p-3">
        <div className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gold-300">Principais efeitos</div>
        {report.headlines.length === 0 ? (
          <p className="text-sm text-muted">Efeito pequeno no período: a mudança quase não altera os grandes números.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {report.headlines.map((h) => (
              <li key={h.text} className="flex items-start gap-2">
                <Icon name={h.good ? 'trending-up' : 'trending-down'} size={15} className={cn('mt-0.5 shrink-0', h.good ? 'text-good' : 'text-bad')} />
                {h.text}
              </li>
            ))}
          </ul>
        )}
      </div>
      <Section title="País" icon="landmark" rows={report.economy} />
      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Setores da economia (produção)" icon="factory" rows={report.sectors} showValues={false} />
        <Section title="Preços" icon="store" rows={report.prices} showValues={false} hint="Variação do preço de cada bem no mercado nacional." />
        <Section title="Satisfação da população" icon="users" rows={report.pops} showValues={false} />
        <Section title="Grupos de interesse (aprovação)" icon="handshake" rows={report.groups} showValues={false} />
      </div>
    </div>
  );
}

/**
 * Botão "Simular impacto": roda a projeção (pesada, ~1 s) só quando o jogador pede e abre o relatório.
 */
export function ImpactButton({
  title,
  run,
  size = 'sm',
  label = 'Simular impacto',
}: {
  title: string;
  run: () => ImpactReport | null;
  size?: 'sm' | 'md';
  label?: string;
}) {
  const [report, setReport] = useState<ImpactReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const start = () => {
    setBusy(true);
    setFailed(false);
    // Deixa o navegador pintar o estado "simulando…" antes do cálculo.
    setTimeout(() => {
      const r = run();
      setBusy(false);
      if (r) setReport(r);
      else setFailed(true);
    }, 30);
  };
  return (
    <>
      <Button size={size} onClick={start} disabled={busy} icon={<Icon name="activity" size={14} />} data-testid="impact-simulate">
        {busy ? 'Simulando…' : label}
      </Button>
      {failed && <span className="text-xs text-bad">Não foi possível simular agora.</span>}
      <Modal open={!!report} title={`O que muda: ${title}`} icon="activity" size="xl" onClose={() => setReport(null)}>
        {report && <ImpactReportView report={report} />}
      </Modal>
    </>
  );
}
