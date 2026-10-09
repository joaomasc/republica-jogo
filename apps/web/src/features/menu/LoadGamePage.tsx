import {
  loadGame,
  parseEnvelope,
  type SaveSlotInfo,
  type SaveStorage,
} from '@republica/game-engine';
import { Badge, Button, EmptyState, Panel, Segmented } from '@republica/ui';
import { Trash2, Upload } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { PageShell } from '../../components/PageShell';
import { PHASE_LABELS } from '../../lib/format';
import { localSaves, serverSaves } from '../../services/storage';
import { useGame } from '../../store/gameStore';

const DIFF_LABEL: Record<string, string> = {
  easy: 'Fácil',
  normal: 'Normal',
  hard: 'Difícil',
  simulation: 'Simulação',
};

export function LoadGamePage() {
  const navigate = useNavigate();
  const load = useGame((s) => s.load);
  const toast = useGame((s) => s.toast);
  const [source, setSource] = useState<'local' | 'server'>('local');
  const [saves, setSaves] = useState<SaveSlotInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const storage: SaveStorage = source === 'local' ? localSaves : serverSaves;

  const refresh = useCallback(() => {
    storage
      .list()
      .then((list) => {
        setSaves(list);
        setError(null);
      })
      .catch((e: unknown) => {
        setSaves([]);
        setError(e instanceof Error ? e.message : 'Falha ao listar saves');
      });
  }, [storage]);

  useEffect(refresh, [refresh]);

  const open = async (slotId: string) => {
    try {
      const state = await loadGame(storage, slotId);
      if (!state) throw new Error('Save não encontrado');
      load(state, slotId === 'autosave' ? null : slotId);
      navigate('/jogo');
    } catch (e) {
      toast({ tone: 'bad', title: e instanceof Error ? e.message : 'Falha ao carregar' });
    }
  };

  const importFile = async (file: File) => {
    try {
      const env = parseEnvelope(await file.text());
      load(env.state, null);
      toast({ tone: 'good', title: 'Save importado!' });
      navigate('/jogo');
    } catch (e) {
      toast({ tone: 'bad', title: e instanceof Error ? e.message : 'Arquivo inválido' });
    }
  };

  return (
    <PageShell
      title="Carregar jogo"
      subtitle="Saves locais ficam no seu navegador. Com o servidor ativo, você também pode salvar no PostgreSQL."
      actions={
        <div className="flex items-center gap-2">
          <Segmented
            options={[
              { id: 'local', label: 'Navegador' },
              { id: 'server', label: 'Servidor' },
            ]}
            value={source}
            onChange={setSource}
          />
          <Button size="sm" icon={<Upload size={14} />} onClick={() => fileRef.current?.click()}>
            Importar arquivo
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && void importFile(e.target.files[0])}
          />
        </div>
      }
    >
      <Panel title="Saves" icon="file-stack">
        {error && <p className="mb-3 text-sm text-bad">{error}</p>}
        {saves.length === 0 ? (
          <EmptyState
            icon="file-stack"
            title="Nenhum jogo salvo"
            text="Comece um novo jogo — o salvamento automático guarda seu progresso."
            action={
              <Button variant="primary" onClick={() => navigate('/novo')}>
                Novo jogo
              </Button>
            }
          />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {saves.map((s) => (
              <li
                key={s.slotId}
                className="flex items-center gap-3 rounded-2xl border-2 border-ink-600 bg-ink-900 p-3"
                data-testid="save-slot"
              >
                <span
                  className="h-12 w-2 shrink-0 rounded-full"
                  style={{ background: s.summary.partyColor }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-lg font-semibold">
                      {s.summary.playerName}
                    </span>
                    {s.slotId === 'autosave' && <Badge tone="info">Automático</Badge>}
                    <Badge>{DIFF_LABEL[s.summary.difficulty] ?? s.summary.difficulty}</Badge>
                  </div>
                  <div className="truncate text-sm text-muted">
                    {s.summary.partyAcronym} · {s.summary.officeName} ·{' '}
                    {PHASE_LABELS[s.summary.phase]} · {s.summary.dateLabel}
                  </div>
                  <div className="text-[11px] text-ink-400">
                    Salvo em {new Date(s.savedAt).toLocaleString('pt-BR')}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Button size="sm" variant="primary" onClick={() => void open(s.slotId)}>
                    Carregar
                  </Button>
                  {confirmDelete === s.slotId ? (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() =>
                        void storage.remove(s.slotId).then(() => {
                          setConfirmDelete(null);
                          refresh();
                        })
                      }
                    >
                      Confirmar
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<Trash2 size={14} />}
                      onClick={() => setConfirmDelete(s.slotId)}
                    >
                      Apagar
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </PageShell>
  );
}
