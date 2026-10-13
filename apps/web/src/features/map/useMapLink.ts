import { useEffect, useRef } from 'react';
import { useUi, type MapFocus } from '../../store/uiStore';

/**
 * O painel pede ao mapa um recorte (produção de um bem, níveis de um edifício) enquanto estiver
 * montado. `null` devolve o mapa ao modo normal. O mapa resolve o recorte no motor a cada estado
 * novo — nada derivado do jogo fica guardado na store.
 */
export function useMapFocus(focus: MapFocus | null): void {
  const setMapFocus = useUi((s) => s.setMapFocus);
  const kind = focus?.kind ?? null;
  const id = focus?.id ?? null;
  useEffect(() => {
    setMapFocus(kind && id ? ({ kind, id } as MapFocus) : null);
  }, [kind, id, setMapFocus]);
  useEffect(() => () => setMapFocus(null), [setMapFocus]);
}

/**
 * O painel usa o mapa como seletor enquanto estiver montado: clicar num estado chama `onPick`
 * (em vez de abrir o painel da região) e `selected` fica marcado. `enabled = false` desliga.
 */
export function useMapPick(
  hint: string,
  selected: readonly string[],
  onPick: (unitId: string) => void,
  enabled = true,
): void {
  const setMapPick = useUi((s) => s.setMapPick);
  // O callback mais recente, sem re-registrar a cada renderização.
  const latest = useRef(onPick);
  useEffect(() => {
    latest.current = onPick;
  });
  // Lista como chave estável: um array novo com os mesmos ids não re-registra.
  const key = selected.join(',');
  useEffect(() => {
    setMapPick(
      enabled
        ? { hint, selected: key ? key.split(',') : [], pick: (id) => latest.current(id) }
        : null,
    );
  }, [hint, key, enabled, setMapPick]);
  useEffect(() => () => setMapPick(null), [setMapPick]);
}
