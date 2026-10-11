import { citiesOf, type StateId } from '@republica/game-engine';
import { cn } from '@republica/ui';
import { cityPopulationLabel } from '../lib/cities';

/** Seletor das cidades jogáveis do estado (`null` = capital). */
export function CitySelect({
  stateId,
  value,
  onChange,
  disabled,
  className,
  testId = 'office-city',
}: {
  stateId: StateId;
  value: string | null;
  onChange: (cityId: string | null) => void;
  disabled?: boolean;
  className?: string;
  testId?: string;
}) {
  const cities = citiesOf(stateId);
  const groups = [
    { label: 'Capital', list: cities.filter((c) => c.capital) },
    { label: 'Cidades-polo (IBGE)', list: cities.filter((c) => !c.capital && c.regic !== 'metro') },
    { label: 'Região metropolitana', list: cities.filter((c) => c.regic === 'metro') },
  ].filter((g) => g.list.length > 0);
  const capital = cities.find((c) => c.capital);
  return (
    <select
      className={cn('game-select', className)}
      value={value ?? capital?.id ?? ''}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value === capital?.id ? null : e.target.value)}
      data-testid={testId}
    >
      {groups.map((g) => (
        <optgroup key={g.label} label={g.label}>
          {g.list.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} · {cityPopulationLabel(c)}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
