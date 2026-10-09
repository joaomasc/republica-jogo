import { Icon } from '@republica/ui';
import { Fragment, useState } from 'react';
import { useNavigate } from 'react-router';

const KEY = 'republica:how-it-connects';

interface Step {
  icon: string;
  title: string;
  text: string;
  link?: { path: string; label: string };
}

/** O ciclo de causa e efeito do jogo: das leis à economia, às pessoas e de volta à política. */
const STEPS: Step[] = [
  {
    icon: 'scale',
    title: '1. Leis e decretos',
    text: 'Definem impostos, tarifas, salário mínimo, quem pode investir, quem é dono das empresas.',
    link: { path: 'leis', label: 'Leis' },
  },
  {
    icon: 'factory',
    title: '2. Empresas',
    text: 'Cada fábrica compra insumos, paga salários e vende. Se o lucro cai, contrata menos; se sobe, investe e expande.',
    link: { path: 'industria', label: 'Indústria' },
  },
  {
    icon: 'store',
    title: '3. Mercado',
    text: 'Oferta e demanda fazem os preços. Falta de um bem encarece tudo que depende dele; importados entram pela tarifa e pelo câmbio.',
    link: { path: 'mercado', label: 'Mercado' },
  },
  {
    icon: 'users',
    title: '4. Empregos e renda',
    text: 'Empregos e salários viram renda dos Pops. Preços altos (inflação) comem essa renda; desemprego a derruba.',
    link: { path: 'eleitores', label: 'População' },
  },
  {
    icon: 'handshake',
    title: '5. Satisfação e grupos',
    text: 'Pops satisfeitos aprovam o governo. Grupos de interesse reagem às leis e à economia; insatisfeitos se radicalizam e fazem greve.',
    link: { path: 'grupos', label: 'Grupos' },
  },
  {
    icon: 'building-2',
    title: '6. Política',
    text: 'Aprovação, capital político e o humor dos grupos decidem quantos votos você tem no Congresso para mudar as leis — e o ciclo recomeça.',
    link: { path: 'congresso', label: 'Congresso' },
  },
];

function readOpen(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'closed';
  } catch {
    return true;
  }
}

export function HowItConnects() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(readOpen);
  const toggle = () => {
    const next = !open;
    setOpen(next);
    try {
      localStorage.setItem(KEY, next ? 'open' : 'closed');
    } catch {
      /* armazenamento indisponível: só não lembra a preferência */
    }
  };
  return (
    <section className="rounded-[6px] border border-gold-500/30 bg-gold-500/5 px-3 py-2">
      <button onClick={toggle} className="flex w-full items-center gap-2 text-left">
        <Icon name="circle-help" size={16} className="text-gold-400" />
        <span className="font-display text-sm font-semibold text-gold-300">Como tudo se conecta</span>
        <span className="text-xs text-muted">— o caminho de uma decisão até o voto</span>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={15} className="ml-auto text-muted" />
      </button>
      {open && (
        <>
          <div className="mt-2 flex flex-col items-stretch gap-1.5 xl:flex-row">
            {STEPS.map((s, i) => (
              <Fragment key={s.title}>
                {i > 0 && (
                  <div className="flex items-center justify-center text-gold-500">
                    <Icon name="chevron-right" size={16} className="hidden xl:block" />
                    <Icon name="chevron-down" size={16} className="xl:hidden" />
                  </div>
                )}
                <div className="flex-1 rounded-lg border border-ink-600 bg-ink-900 p-2">
                  <div className="flex items-center gap-1.5 text-[12.5px] font-semibold">
                    <Icon name={s.icon} size={14} className="text-gold-400" />
                    {s.title}
                  </div>
                  <p className="mt-0.5 text-[11.5px] leading-snug text-muted">{s.text}</p>
                  {s.link && (
                    <button className="mt-1 text-[11px] text-gold-300 hover:underline" onClick={() => navigate(`/jogo/${s.link!.path}`)}>
                      {s.link.label} →
                    </button>
                  )}
                </div>
              </Fragment>
            ))}
          </div>
          <p className="mt-2 text-[11.5px] text-muted">
            Dica: na tela de Leis, escolha uma opção e use <b className="text-paper">Simular impacto</b> para ver, com números, o que
            ela muda em cada etapa desse ciclo. Passe o mouse sobre os efeitos sublinhados para ler o que cada um causa.
          </p>
        </>
      )}
    </section>
  );
}
