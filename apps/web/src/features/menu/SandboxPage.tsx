import {
  defaultPartyId,
  DIFFICULTIES,
  DIFFICULTY_IDS,
  ECONOMIC_SITUATIONS,
  formatMoney,
  OFFICE_LIST,
  OFFICES,
  partySeeds,
  STATE_LIST,
  type DifficultyId,
  type EconomicSituation,
  type OfficeId,
  type StateId,
} from '@republica/game-engine';
import { Button, Panel, Segmented, Slider } from '@republica/ui';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { PageShell } from '../../components/PageShell';
import type { WizardPreset } from '../newgame/wizardTypes';

export function SandboxPage() {
  const navigate = useNavigate();
  const [officeId, setOfficeId] = useState<OfficeId>('governador');
  const [stateId, setStateId] = useState<StateId>('SP');
  const [year, setYear] = useState(2026);
  const [difficulty, setDifficulty] = useState<DifficultyId>('normal');
  const [economy, setEconomy] = useState<EconomicSituation>('normal');
  const [money, setMoney] = useState(5);
  const [popularity, setPopularity] = useState(45);
  const [fame, setFame] = useState(15);
  const [popScale, setPopScale] = useState(1);
  const [days, setDays] = useState(60);
  const [partyId, setPartyId] = useState(defaultPartyId('real'));
  const office = OFFICES[officeId];
  const cycleYears = Array.from(
    { length: 5 },
    (_, i) => (office.cycle === 'general' ? 2026 : 2028) + i * 4,
  );
  const effectiveYear = cycleYears.includes(year) ? year : (cycleYears[0] ?? 2026);

  const start = () => {
    const preset: WizardPreset = {
      mode: 'sandbox',
      officeId,
      stateId,
      year: effectiveYear,
      difficulty,
      economy,
      partyId,
      sandbox: {
        startingMoney: Math.round(money * 1_000_000),
        popularity,
        fame,
        economy,
        populationScale: popScale,
        campaignDays: days,
      },
    };
    navigate('/novo', { state: preset });
  };

  return (
    <PageShell title="Sandbox" subtitle="Monte a situação que quiser. Depois, crie seu personagem.">
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Disputa" icon="vote">
          <div className="space-y-4">
            <div>
              <div className="label mb-1">Cargo</div>
              <select
                className="game-select w-full"
                value={officeId}
                onChange={(e) => setOfficeId(e.target.value as OfficeId)}
                data-testid="sandbox-office"
              >
                {OFFICE_LIST.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
            {office.unitsKind !== 'states' && (
              <div>
                <div className="label mb-1">Estado</div>
                <select
                  className="game-select w-full"
                  value={stateId}
                  onChange={(e) => setStateId(e.target.value as StateId)}
                >
                  {STATE_LIST.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <div className="label mb-1">Ano da eleição</div>
              <Segmented
                options={cycleYears.map((y) => ({ id: String(y), label: String(y) }))}
                value={String(effectiveYear)}
                onChange={(v) => setYear(Number(v))}
              />
            </div>
            <div>
              <div className="label mb-1">Partido sugerido</div>
              <select
                className="game-select w-full"
                value={partyId}
                onChange={(e) => setPartyId(e.target.value)}
              >
                {partySeeds('real').map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.acronym} — {p.name}
                  </option>
                ))}
              </select>
            </div>
            <Slider
              label="Duração da campanha"
              value={days}
              min={20}
              max={120}
              step={5}
              onChange={setDays}
              display={`${days} dias`}
            />
          </div>
        </Panel>
        <Panel title="Mundo" icon="globe">
          <div className="space-y-4">
            <div>
              <div className="label mb-1">Dificuldade</div>
              <Segmented
                options={DIFFICULTY_IDS.map((id) => ({ id, label: DIFFICULTIES[id].name }))}
                value={difficulty}
                onChange={setDifficulty}
              />
            </div>
            <div>
              <div className="label mb-1">Situação econômica</div>
              <Segmented
                options={(Object.keys(ECONOMIC_SITUATIONS) as EconomicSituation[]).map((id) => ({
                  id,
                  label: ECONOMIC_SITUATIONS[id].name,
                }))}
                value={economy}
                onChange={setEconomy}
              />
            </div>
            <Slider
              label="Dinheiro inicial"
              value={money}
              min={0.2}
              max={200}
              step={0.2}
              onChange={setMoney}
              display={formatMoney(money * 1_000_000)}
              leftLabel="Pouco"
              rightLabel="Muito"
            />
            <Slider
              label="Popularidade inicial"
              value={popularity}
              min={5}
              max={95}
              onChange={setPopularity}
            />
            <Slider
              label="Conhecimento público inicial"
              value={fame}
              min={1}
              max={90}
              onChange={setFame}
            />
            <Slider
              label="Tamanho da população"
              value={popScale}
              min={0.25}
              max={2}
              step={0.05}
              onChange={setPopScale}
              display={`${Math.round(popScale * 100)}%`}
            />
          </div>
        </Panel>
      </div>
      <div className="flex justify-end">
        <Button variant="primary" size="lg" onClick={start} data-testid="sandbox-continue">
          Criar personagem
        </Button>
      </div>
    </PageShell>
  );
}
