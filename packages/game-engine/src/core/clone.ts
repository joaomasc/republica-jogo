/**
 * Cópia profunda independente de ambiente (navegador, Node, workers).
 * Usa `structuredClone` quando disponível; caso contrário, JSON (o estado do jogo é sempre JSON-serializável).
 */
export function deepClone<T>(value: T): T {
  const native = (globalThis as { structuredClone?: <V>(v: V) => V }).structuredClone;
  return native ? native(value) : (JSON.parse(JSON.stringify(value)) as T);
}
