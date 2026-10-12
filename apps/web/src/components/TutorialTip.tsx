import { Button, Icon } from '@republica/ui';
import type { ReactNode } from 'react';
import { useSettings } from '../store/settingsStore';

/**
 * Dica contextual da primeira partida: aparece uma vez por assunto (até o jogador clicar em
 * "Entendi") e some de vez se as dicas forem desligadas nas configurações.
 */
export function TutorialTip({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  const showTips = useSettings((s) => s.showTips);
  const seen = useSettings((s) => s.seenTips);
  const update = useSettings((s) => s.update);
  if (!showTips || seen.includes(id)) return null;
  return (
    <div
      className="flex items-start gap-2.5 rounded-xl border-2 border-info/50 bg-info/10 p-2.5 text-sm"
      data-testid={`tip-${id}`}
      role="note"
    >
      <Icon name="lightbulb" size={18} className="mt-0.5 shrink-0 text-info" />
      <div className="min-w-0 flex-1">
        <div className="font-bold">{title}</div>
        <div className="text-xs text-paper/85">{children}</div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <Button size="sm" onClick={() => update({ seenTips: [...seen, id] })}>
            Entendi
          </Button>
          <Button size="sm" variant="ghost" onClick={() => update({ showTips: false })}>
            Desligar dicas
          </Button>
        </div>
      </div>
    </div>
  );
}
