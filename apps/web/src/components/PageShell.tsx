import { Button, Ornament } from '@republica/ui';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { Logo } from './Logo';

/** Moldura das telas fora da partida (menus, criação, carregar). */
export function PageShell({
  title,
  subtitle,
  children,
  back = '/',
  actions,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  back?: string;
  actions?: ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <div className="@container mx-auto flex min-h-full w-full max-w-6xl flex-col gap-5 px-4 py-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <Button
            variant="secondary"
            size="sm"
            icon={<ArrowLeft size={16} />}
            onClick={() => navigate(back)}
          >
            Voltar
          </Button>
          <Logo size="sm" />
        </div>
        {actions}
      </header>
      <div>
        <h1
          className="font-display text-3xl font-semibold tracking-[0.05em] text-paper"
          style={{ textShadow: '0 2px 10px rgb(0 0 0 / 0.6)' }}
        >
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
        <Ornament className="mt-3 max-w-md" />
      </div>
      {children}
    </div>
  );
}
