/** WebGL disponível neste navegador? (sem ele, o mapa fica no 2D). Separado da cena: sem three.js. */
export function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') ?? c.getContext('webgl'));
  } catch {
    return false;
  }
}
