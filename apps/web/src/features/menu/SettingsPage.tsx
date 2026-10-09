import { DIFFICULTIES, DIFFICULTY_IDS } from '@republica/game-engine';
import { Badge, Button, Panel, Segmented, Slider } from '@republica/ui';
import type { HealthResponse } from '@republica/shared';
import { API_ROUTES } from '@republica/shared';
import { useEffect, useState } from 'react';
import { PageShell } from '../../components/PageShell';
import { useSettings } from '../../store/settingsStore';

function Toggle({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div>
        <div className="font-bold">{label}</div>
        <div className="text-sm text-muted">{description}</div>
      </div>
      <Segmented
        options={[
          { id: 'on', label: 'Ligado' },
          { id: 'off', label: 'Desligado' },
        ]}
        value={value ? 'on' : 'off'}
        onChange={(v) => onChange(v === 'on')}
      />
    </div>
  );
}

export function SettingsPage() {
  const s = useSettings();
  const [health, setHealth] = useState<HealthResponse | null | 'offline'>(null);

  useEffect(() => {
    fetch(API_ROUTES.health, { signal: AbortSignal.timeout(3000) })
      .then((r) => (r.ok ? (r.json() as Promise<HealthResponse>) : Promise.reject()))
      .then(setHealth)
      .catch(() => setHealth('offline'));
  }, []);

  return (
    <PageShell title="Configurações" subtitle="Preferências ficam salvas neste navegador.">
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Jogo" icon="flag">
          <Toggle
            label="Salvamento automático"
            description="Salva a partida a cada ação (slot 'Automático')."
            value={s.autosave}
            onChange={(v) => s.update({ autosave: v })}
          />
          <Toggle
            label="Animações"
            description="Transições e efeitos visuais."
            value={s.animations}
            onChange={(v) => s.update({ animations: v })}
          />
          <Toggle
            label="Dicas"
            description="Mostrar dicas de jogo nas telas."
            value={s.showTips}
            onChange={(v) => s.update({ showTips: v })}
          />
          <div className="py-2">
            <div className="mb-2 font-bold">Dificuldade padrão</div>
            <Segmented
              options={DIFFICULTY_IDS.map((id) => ({ id, label: DIFFICULTIES[id].name }))}
              value={s.defaultDifficulty}
              onChange={(v) => s.update({ defaultDifficulty: v })}
            />
            <p className="mt-1 text-sm text-muted">
              {DIFFICULTIES[s.defaultDifficulty].description}
            </p>
          </div>
          <div className="py-2">
            <Slider
              label="Velocidade do avanço automático"
              value={s.autoPlaySpeedMs}
              min={300}
              max={2000}
              step={100}
              onChange={(v) => s.update({ autoPlaySpeedMs: v })}
              display={`${(s.autoPlaySpeedMs / 1000).toFixed(1)} s/dia`}
              leftLabel="Rápido"
              rightLabel="Lento"
            />
          </div>
        </Panel>
        <Panel title="Servidor, saves e IA" icon="cpu">
          <div className="mb-3 flex items-center gap-2 text-sm">
            Status do servidor:
            {health === null ? (
              <Badge>Verificando…</Badge>
            ) : health === 'offline' ? (
              <Badge tone="warn">Offline (o jogo funciona mesmo assim)</Badge>
            ) : (
              <Badge tone="good">
                Online · banco: {health.database} · IA: {health.ai.provider}
              </Badge>
            )}
          </div>
          <div className="py-2">
            <div className="mb-1 font-bold">Onde salvar manualmente</div>
            <Segmented
              options={[
                { id: 'local', label: 'Navegador (localStorage)' },
                { id: 'server', label: 'Servidor (PostgreSQL)' },
              ]}
              value={s.storage}
              onChange={(v) => s.update({ storage: v })}
            />
          </div>
          <div className="py-2">
            <div className="mb-1 font-bold">Textos gerados por IA</div>
            <Segmented
              options={[
                { id: 'local', label: 'Procedural (offline)' },
                { id: 'server', label: 'IA do servidor' },
              ]}
              value={s.aiMode}
              onChange={(v) => s.update({ aiMode: v })}
            />
            <p className="mt-2 text-sm text-muted">
              A IA só escreve textos (perguntas de entrevista, notícias). Votos, efeitos e
              resultados são sempre calculados pelo motor de simulação. Nenhuma chave de API fica no
              navegador.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={s.reset}>
            Restaurar padrões
          </Button>
        </Panel>
      </div>
    </PageShell>
  );
}
