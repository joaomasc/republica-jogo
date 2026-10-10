import {
  ATTRIBUTE_POINT_BUY,
  baseAttributes,
  FIRST_NAMES_F,
  FIRST_NAMES_M,
  FIRST_NAMES_N,
  getScenario,
  LAST_NAMES,
  neutralIdeology,
  OFFICES,
  pointsSpent,
  randomAppearance,
  Rng,
  STATE_LIST,
  validateNewGame,
  validatePartyInput,
  initParties,
  partyIdForWorld,
  partySeeds,
  type Gender,
  type NewGameConfig,
} from '@republica/game-engine';
import { Avatar, Button, cn, Icon, Panel } from '@republica/ui';
import { ArrowLeft, ArrowRight, Dices, Rocket } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { PageShell } from '../../components/PageShell';
import { useGame } from '../../store/gameStore';
import { useSettings } from '../../store/settingsStore';
import { AvatarEditor } from './AvatarEditor';
import { PlatformPicker } from '../platform/PlatformPicker';
import { AttributesStep, IdeologyStep, OfficeStep, PartyStep, ReviewStep } from './steps';
import type { WizardPreset, WizardState } from './wizardTypes';

const STEPS = [
  { id: 'identity', label: 'Identidade', icon: 'smile' },
  { id: 'attributes', label: 'Origem e atributos', icon: 'award' },
  { id: 'ideology', label: 'Ideias', icon: 'compass' },
  { id: 'platform', label: 'Bandeiras', icon: 'scroll-text' },
  { id: 'party', label: 'Partido', icon: 'flag' },
  { id: 'office', label: 'Cargo', icon: 'landmark' },
  { id: 'review', label: 'Começar', icon: 'rocket' },
] as const;

function randomIdentity(gender: Gender, rng: Rng) {
  const pool =
    gender === 'male' ? FIRST_NAMES_M : gender === 'female' ? FIRST_NAMES_F : FIRST_NAMES_N;
  return { firstName: rng.pick(pool), lastName: rng.pick(LAST_NAMES) };
}

function initialState(
  preset: WizardPreset | null,
  defaultDifficulty: WizardState['difficulty'],
): WizardState {
  const rng = new Rng(Date.now() >>> 0);
  const gender: Gender = rng.chance(0.5) ? 'female' : 'male';
  const { firstName, lastName } = randomIdentity(gender, rng);
  const world = preset?.world ?? 'real';
  const age = 42;
  return {
    firstName,
    lastName,
    ballotName: '',
    age,
    gender,
    homeStateId: preset?.stateId ?? 'SP',
    appearance: randomAppearance(rng, gender === 'female' ? 'feminine' : 'masculine', age),
    backgroundId: preset?.backgroundId ?? 'lawyer',
    attributes: baseAttributes(),
    ideology: neutralIdeology(),
    platform: {},
    party: { kind: 'existing', partyId: partyIdForWorld(preset?.partyId, world) },
    officeId: preset?.officeId ?? 'presidente',
    stateId: preset?.stateId ?? 'SP',
    difficulty: preset?.difficulty ?? defaultDifficulty,
    world,
    weekly: true,
  };
}

export function NewGamePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const start = useGame((s) => s.start);
  const defaultDifficulty = useSettings((s) => s.defaultDifficulty);

  const preset = useMemo<WizardPreset | null>(() => {
    const scenario = getScenario(params.get('cenario') ?? '');
    if (scenario) {
      return {
        mode: 'scenario',
        scenarioId: scenario.id,
        officeId: scenario.officeId,
        stateId: scenario.stateId,
        year: scenario.year,
        difficulty: scenario.difficulty,
        economy: scenario.economy,
        ...(scenario.partyId ? { partyId: scenario.partyId } : {}),
        ...(scenario.backgroundId ? { backgroundId: scenario.backgroundId } : {}),
        ...(scenario.fame !== undefined ? { sandbox: { fame: scenario.fame } } : {}),
        lockOffice: true,
      };
    }
    return (location.state as WizardPreset | null) ?? null;
  }, [params, location.state]);

  const [state, setState] = useState<WizardState>(() => initialState(preset, defaultDifficulty));
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const update = (patch: Partial<WizardState>) => {
    setError(null);
    setState((s) => ({ ...s, ...patch }));
  };

  const stepError = (index: number): string | null => {
    const id = STEPS[index]?.id;
    if (id === 'identity') {
      if (state.firstName.trim().length < 2 || state.lastName.trim().length < 2)
        return 'Informe nome e sobrenome.';
      if (state.age < 18 || state.age > 90) return 'Idade entre 18 e 90 anos.';
    }
    if (id === 'attributes' && pointsSpent(state.attributes) > ATTRIBUTE_POINT_BUY.freePoints)
      return 'Você distribuiu pontos demais.';
    if (id === 'party' && state.party.kind === 'new')
      return validatePartyInput(state.party.input, initParties(state.world));
    if (id === 'office' && state.age < OFFICES[state.officeId].minAge)
      return `Idade mínima para ${OFFICES[state.officeId].name}: ${OFFICES[state.officeId].minAge} anos.`;
    return null;
  };

  const next = () => {
    const err = stepError(step);
    if (err) {
      setError(err);
      return;
    }
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };

  const begin = () => {
    for (let i = 0; i < STEPS.length; i++) {
      const err = stepError(i);
      if (err) {
        setStep(i);
        setError(err);
        return;
      }
    }
    const config: NewGameConfig = {
      difficulty: state.difficulty,
      world: state.world,
      weekly: state.weekly,
      mode: preset?.mode ?? 'career',
      scenarioId: preset?.scenarioId ?? null,
      candidate: {
        firstName: state.firstName,
        lastName: state.lastName,
        ...(state.ballotName.trim() ? { ballotName: state.ballotName } : {}),
        age: state.age,
        gender: state.gender,
        appearance: state.appearance,
        attributes: state.attributes,
        ideology: state.ideology,
        backgroundId: state.backgroundId,
        homeStateId: state.homeStateId,
        platform: state.platform,
      },
      party:
        state.party.kind === 'existing'
          ? state.party
          : {
              kind: 'new',
              input: {
                ...state.party.input,
                lawPositions: state.party.input.lawPositions ?? state.platform,
                ideology: state.ideology,
                leaderName: `${state.firstName} ${state.lastName}`,
              },
            },
      office: {
        officeId: state.officeId,
        stateId: OFFICES[state.officeId].unitsKind === 'states' ? state.homeStateId : state.stateId,
      },
      ...(preset?.year ? { year: preset.year } : {}),
      ...(preset?.economy ? { economy: preset.economy } : {}),
      ...(preset?.sandbox ? { sandbox: preset.sandbox } : {}),
    };
    const err = validateNewGame(config);
    if (err) {
      setError(err);
      return;
    }
    start(config);
    navigate('/jogo');
  };

  const current = STEPS[step] ?? STEPS[0];
  const partyColor =
    state.party.kind === 'existing'
      ? (partySeeds(state.world).find(
          (p) => p.id === (state.party.kind === 'existing' ? state.party.partyId : ''),
        )?.color ?? '#2c3d63')
      : state.party.input.color;
  const reroll = () => {
    const rng = new Rng(Date.now() >>> 0);
    update({ appearance: randomAppearance(rng, state.appearance.presentation, state.age) });
  };

  return (
    <PageShell
      title={
        preset?.mode === 'scenario'
          ? `Cenário: ${getScenario(preset.scenarioId ?? '')?.name ?? ''}`
          : preset?.mode === 'sandbox'
            ? 'Sandbox — novo personagem'
            : 'Novo jogo'
      }
      subtitle="Crie seu político. Tudo pode mudar ao longo da carreira."
    >
      <ol className="flex flex-wrap gap-2" aria-label="Etapas">
        {STEPS.map((s, i) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => (i <= step ? setStep(i) : undefined)}
              className={cn(
                'flex items-center gap-1.5 rounded-xl border-2 px-3 py-1.5 font-display text-sm font-semibold',
                i === step
                  ? 'border-gold-400 bg-gold-500 text-ink-950'
                  : i < step
                    ? 'border-good/50 bg-ink-800 text-good'
                    : 'border-ink-600 bg-ink-900 text-muted',
              )}
            >
              <Icon name={s.icon} size={14} />
              {i + 1}. {s.label}
            </button>
          </li>
        ))}
      </ol>

      <Panel title={current.label} icon={current.icon}>
        {current.id === 'identity' && (
          <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
            <div className="flex flex-col items-center gap-3">
              <Avatar
                config={state.appearance}
                size={220}
                background={partyColor}
                partyColor={partyColor}
                age={state.age}
              />
              <Button size="sm" icon={<Dices size={14} />} onClick={reroll}>
                Visual aleatório
              </Button>
            </div>
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="label">Nome</span>
                  <input
                    className="game-input mt-1"
                    value={state.firstName}
                    onChange={(e) => update({ firstName: e.target.value })}
                    maxLength={30}
                    data-testid="input-first-name"
                  />
                </label>
                <label className="block">
                  <span className="label">Sobrenome</span>
                  <input
                    className="game-input mt-1"
                    value={state.lastName}
                    onChange={(e) => update({ lastName: e.target.value })}
                    maxLength={30}
                    data-testid="input-last-name"
                  />
                </label>
                <label className="block">
                  <span className="label">Nome de urna (opcional)</span>
                  <input
                    className="game-input mt-1"
                    placeholder={`${state.firstName} ${state.lastName}`}
                    value={state.ballotName}
                    onChange={(e) => update({ ballotName: e.target.value })}
                    maxLength={40}
                  />
                </label>
                <label className="block">
                  <span className="label">Idade</span>
                  <input
                    type="number"
                    className="game-input mt-1"
                    min={18}
                    max={90}
                    value={state.age}
                    onChange={(e) => update({ age: Number(e.target.value) })}
                    data-testid="input-age"
                  />
                </label>
                <label className="block">
                  <span className="label">Gênero</span>
                  <select
                    className="game-select mt-1 w-full"
                    value={state.gender}
                    onChange={(e) => update({ gender: e.target.value as Gender })}
                  >
                    <option value="female">Mulher</option>
                    <option value="male">Homem</option>
                    <option value="nonbinary">Não binário</option>
                  </select>
                </label>
                <label className="block">
                  <span className="label">Estado de origem</span>
                  <select
                    className="game-select mt-1 w-full"
                    value={state.homeStateId}
                    onChange={(e) =>
                      update({
                        homeStateId: e.target.value as WizardState['homeStateId'],
                        ...(preset?.lockOffice
                          ? {}
                          : { stateId: e.target.value as WizardState['stateId'] }),
                      })
                    }
                  >
                    {STATE_LIST.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <AvatarEditor
                value={state.appearance}
                onChange={(appearance) => update({ appearance })}
              />
            </div>
          </div>
        )}
        {current.id === 'attributes' && <AttributesStep state={state} update={update} />}
        {current.id === 'ideology' && <IdeologyStep state={state} update={update} />}
        {current.id === 'platform' && (
          <PlatformPicker
            value={state.platform}
            onChange={(platform) => update({ platform })}
            ideology={state.ideology}
            onApplyIdeology={(ideology) => update({ ideology })}
          />
        )}
        {current.id === 'party' && <PartyStep state={state} update={update} />}
        {current.id === 'office' && (
          <OfficeStep
            state={state}
            update={update}
            {...(preset?.lockOffice ? { locked: true } : {})}
          />
        )}
        {current.id === 'review' && <ReviewStep state={state} update={update} />}
      </Panel>

      {error && (
        <p
          className="rounded-xl border-2 border-bad/50 bg-bad/10 px-4 py-2 text-sm text-bad"
          role="alert"
        >
          {error}
        </p>
      )}
      <div className="flex justify-between">
        <Button
          icon={<ArrowLeft size={16} />}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
        >
          Anterior
        </Button>
        {current.id === 'review' ? (
          <Button
            variant="primary"
            size="lg"
            icon={<Rocket size={18} />}
            onClick={begin}
            data-testid="start-game"
          >
            Começar campanha
          </Button>
        ) : (
          <Button variant="primary" onClick={next} data-testid="wizard-next">
            Próximo <ArrowRight size={16} />
          </Button>
        )}
      </div>
    </PageShell>
  );
}
