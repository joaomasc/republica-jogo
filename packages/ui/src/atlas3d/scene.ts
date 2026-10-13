import * as THREE from 'three';
import { MapControls } from 'three/addons/controls/MapControls.js';
import type { AtlasRegion } from '../atlas/Atlas';
import type { Bounds, Insets } from '../atlas/camera';
import { BRAZIL_OUTLINE, CONTEXT_LAND, RIVERS } from '../atlas/contextGeometry.generated';
import type { RegionPaint } from '../atlas/scales';
import { projectLonLat } from '../map/brazilGeometry.generated';
import { groupPolygons, parseRings, pointInRing, type Polygon } from './rings';

/**
 * Cena 3D do Atlas (three.js), sem React. O mapa fica num grupo "chão" girado para o plano
 * XZ: dentro dele, x = leste, y = norte, z = altura. Cada região é um prisma cuja altura é o valor
 * do modo ativo; mudar o dado anima a subida/descida. Renderiza sob demanda (só quando algo muda).
 */

/** Altura mínima de qualquer estado e altura extra máxima (unidades do mapa ≈ 4,3 km). */
export const BASE_HEIGHT = 6;
export const HEIGHT_RANGE = 80;

const LAND = new THREE.Color('#22343b');
const NO_DATA = new THREE.Color('#2a3a40');
const DIM = new THREE.Color('#071016');
const GOLD = new THREE.Color('#f0d68a');
const WHITE = new THREE.Color('#f3ead2');
const OUTLINE = new THREE.Color('#06111a');
const PULSE_GOOD = new THREE.Color('#7fe0a6');
const PULSE_BAD = new THREE.Color('#ff8a70');

export interface SceneCallbacks {
  onHover: (id: string | null) => void;
  onClick: (id: string) => void;
  /** Depois de cada quadro desenhado (para reposicionar rótulos e a bússola). */
  onFrame: () => void;
}

interface RegionMesh {
  id: string;
  mesh: THREE.Mesh;
  cap: THREE.MeshStandardMaterial;
  side: THREE.MeshStandardMaterial;
  outline: THREE.LineBasicMaterial;
  polys: Polygon[];
  color: THREE.Color;
  /** Altura atual e alvo (0..1). */
  h: number;
  target: number;
  pulse: { t0: number; color: THREE.Color } | null;
}

export interface Highlight {
  hover: string | null;
  selected: string | null;
  marked: readonly string[];
  focus: readonly string[] | null;
}

function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

export class AtlasScene {
  readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(32, 1, 5, 20000);
  private readonly controls: MapControls;
  private readonly ground = new THREE.Group();
  private readonly raycaster = new THREE.Raycaster();
  private readonly regions = new Map<string, RegionMesh>();
  private readonly cx: number;
  private readonly cy: number;
  private readonly size: number;
  private rivers: { geo: THREE.BufferGeometry; owner: (RegionMesh | null)[] } | null = null;
  private width = 1;
  private height = 1;
  private insets: Insets = { top: 0, right: 0, bottom: 0, left: 0 };
  private dirty = true;
  private frame = 0;
  private flight: {
    from: [THREE.Vector3, THREE.Vector3];
    to: [THREE.Vector3, THREE.Vector3];
    t0: number;
    ms: number;
  } | null = null;
  private highlight: Highlight = { hover: null, selected: null, marked: [], focus: null };
  private down: { x: number; y: number } | null = null;
  private lastHover: string | null = null;
  private pointer: { x: number; y: number } | null = null;
  private pointerMoved = false;
  userMoved = false;

  constructor(
    container: HTMLElement,
    world: Bounds,
    private readonly cb: SceneCallbacks,
    context: boolean,
  ) {
    this.cx = (world[0] + world[2]) / 2;
    this.cy = (world[1] + world[3]) / 2;
    this.size = Math.max(world[2] - world[0], world[3] - world[1]);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.setClearColor('#071319');
    this.renderer.domElement.className = 'atlas3d-canvas';
    container.appendChild(this.renderer.domElement);

    this.scene.fog = new THREE.Fog('#071319', this.size * 1.6, this.size * 4.5);
    this.ground.rotation.x = -Math.PI / 2;
    this.scene.add(this.ground);

    // Luz: céu frio + sol quente vindo do noroeste, com sombra dos prismas no chão.
    this.scene.add(new THREE.HemisphereLight('#cfe3ea', '#0b141a', 1.15));
    const sun = new THREE.DirectionalLight('#fff1d6', 2.1);
    sun.position.set(-this.size * 0.55, this.size * 0.9, -this.size * 0.35);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.left = sc.bottom = -this.size * 0.8;
    sc.right = sc.top = this.size * 0.8;
    sc.near = 10;
    sc.far = this.size * 3;
    sun.shadow.bias = -0.0006;
    this.scene.add(sun);

    this.buildSea(context);

    this.controls = new MapControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.12;
    this.controls.maxPolarAngle = THREE.MathUtils.degToRad(72);
    this.controls.minDistance = this.size * 0.12;
    this.controls.maxDistance = this.size * 3;
    this.controls.zoomToCursor = true;
    this.controls.addEventListener('change', () => (this.dirty = true));
    this.controls.addEventListener('start', () => {
      this.userMoved = true;
      this.flight = null;
    });

    const el = this.renderer.domElement;
    el.addEventListener('pointermove', this.onPointerMove);
    el.addEventListener('pointerdown', this.onPointerDown);
    el.addEventListener('pointerup', this.onPointerUp);
    el.addEventListener('pointerleave', this.onPointerLeave);
    this.loop();
  }

  // --- Coordenadas ---------------------------------------------------------------------------

  /** Ponto do mapa (coordenadas do SVG) → plano do chão (x leste, y norte). */
  private ground2(wx: number, wy: number): [number, number] {
    return [wx - this.cx, this.cy - wy];
  }

  private shapesOf(polys: Polygon[]): THREE.Shape[] {
    return polys.map((p) => {
      const shape = new THREE.Shape(
        p.outer.map(([x, y]) => new THREE.Vector2(...this.ground2(x, y))),
      );
      for (const h of p.holes)
        shape.holes.push(
          new THREE.Path(h.map(([x, y]) => new THREE.Vector2(...this.ground2(x, y)))),
        );
      return shape;
    });
  }

  // --- Cenário ---------------------------------------------------------------------------------

  private buildSea(context: boolean) {
    const sea = new THREE.Mesh(
      new THREE.PlaneGeometry(this.size * 8, this.size * 8),
      new THREE.MeshStandardMaterial({ color: '#0b1f29', roughness: 0.95, metalness: 0 }),
    );
    sea.receiveShadow = true;
    this.ground.add(sea);
    if (!context) return;

    // Graticulado a cada 5°.
    const pts: number[] = [];
    const [ax, ay] = projectLonLat(-86, 14);
    const [bx, by] = projectLonLat(-24, -42);
    for (let lon = -85; lon <= -25; lon += 5) {
      const [x] = projectLonLat(lon, 0);
      pts.push(...this.ground2(x, ay), 0.4, ...this.ground2(x, by), 0.4);
    }
    for (let lat = -40; lat <= 10; lat += 5) {
      const [, y] = projectLonLat(0, lat);
      pts.push(...this.ground2(ax, y), 0.4, ...this.ground2(bx, y), 0.4);
    }
    const grid = new THREE.BufferGeometry();
    grid.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    this.ground.add(
      new THREE.LineSegments(
        grid,
        new THREE.LineBasicMaterial({ color: '#6f97a3', transparent: true, opacity: 0.16 }),
      ),
    );

    // Vizinhos e a base do Brasil: lajes baixas de terra apagada.
    const landMat = new THREE.MeshStandardMaterial({ color: '#1c2a2e', roughness: 1 });
    for (const d of [...CONTEXT_LAND.map((c) => c.d), BRAZIL_OUTLINE]) {
      const geo = new THREE.ExtrudeGeometry(this.shapesOf(groupPolygons(parseRings(d))), {
        depth: 2.5,
        bevelEnabled: false,
        curveSegments: 1,
      });
      const mesh = new THREE.Mesh(geo, landMat);
      mesh.receiveShadow = true;
      this.ground.add(mesh);
    }
  }

  /** Estados (ou zonas) como prismas; rios apoiados no topo de cada um. */
  setRegions(regions: AtlasRegion[], context: boolean) {
    for (const r of this.regions.values()) {
      r.mesh.geometry.dispose();
      r.cap.dispose();
      r.side.dispose();
      r.outline.dispose();
      this.ground.remove(r.mesh);
    }
    this.regions.clear();
    for (const r of regions) {
      const polys = groupPolygons(parseRings(r.d));
      if (!polys.length) continue;
      const geo = new THREE.ExtrudeGeometry(this.shapesOf(polys), {
        depth: 1,
        bevelEnabled: false,
        curveSegments: 2,
      });
      const cap = new THREE.MeshStandardMaterial({ color: LAND, roughness: 0.72, metalness: 0.04 });
      const side = new THREE.MeshStandardMaterial({ color: LAND, roughness: 0.9, metalness: 0 });
      const mesh = new THREE.Mesh(geo, [cap, side]);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.scale.z = BASE_HEIGHT;
      mesh.userData.regionId = r.id;
      // Contorno do topo (filho do prisma: sobe junto).
      const outline = new THREE.LineBasicMaterial({
        color: OUTLINE,
        transparent: true,
        opacity: 0.9,
      });
      for (const p of polys) {
        const line = new THREE.BufferGeometry().setFromPoints(
          p.outer.map(([x, y]) => new THREE.Vector3(...this.ground2(x, y), 1.002)),
        );
        mesh.add(new THREE.LineLoop(line, outline));
      }
      this.ground.add(mesh);
      this.regions.set(r.id, {
        id: r.id,
        mesh,
        cap,
        side,
        outline,
        polys,
        color: LAND.clone(),
        h: 0,
        target: 0,
        pulse: null,
      });
    }
    this.buildRivers(context);
    this.dirty = true;
  }

  private buildRivers(context: boolean) {
    if (this.rivers) {
      this.rivers.geo.dispose();
      this.ground.children.filter((c) => c.userData.rivers).forEach((c) => this.ground.remove(c));
      this.rivers = null;
    }
    if (!context) return;
    const pos: number[] = [];
    const owner: (RegionMesh | null)[] = [];
    const all = [...this.regions.values()];
    for (const river of RIVERS) {
      if (river.rank > 5) continue;
      for (const line of parseRings(river.d)) {
        for (let i = 0; i + 1 < line.length; i++) {
          for (const pt of [line[i]!, line[i + 1]!]) {
            pos.push(...this.ground2(pt[0], pt[1]), 2.8);
            owner.push(all.find((r) => r.polys.some((p) => pointInRing(pt, p.outer))) ?? null);
          }
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const lines = new THREE.LineSegments(
      geo,
      new THREE.LineBasicMaterial({ color: '#7fb0c4', transparent: true, opacity: 0.75 }),
    );
    lines.userData.rivers = true;
    this.ground.add(lines);
    this.rivers = { geo, owner };
  }

  /** Rios acompanham a altura do estado em que cada trecho passa. */
  private updateRivers() {
    if (!this.rivers) return;
    const attr = this.rivers.geo.getAttribute('position') as THREE.BufferAttribute;
    this.rivers.owner.forEach((r, i) => attr.setZ(i, r ? this.heightOf(r) + 0.5 : 2.8));
    attr.needsUpdate = true;
  }

  private heightOf(r: RegionMesh): number {
    return BASE_HEIGHT + r.h * HEIGHT_RANGE;
  }

  // --- Dados -----------------------------------------------------------------------------------

  /** Cores e alturas (0..1) de cada região; a altura anima até o alvo. */
  setData(paint: Record<string, RegionPaint>, heights: Record<string, number>) {
    for (const r of this.regions.values()) {
      const p = paint[r.id];
      r.color = p
        ? p.noData
          ? NO_DATA.clone()
          : LAND.clone().lerp(new THREE.Color(p.fill), p.opacity)
        : LAND.clone();
      r.target = p?.noData ? 0 : Math.max(0, Math.min(1, heights[r.id] ?? 0));
    }
    this.applyColors();
  }

  setHighlight(h: Highlight) {
    this.highlight = h;
    this.applyColors();
  }

  pulse(ids: { id: string; tone: 'good' | 'bad' }[]) {
    const now = performance.now();
    for (const { id, tone } of ids) {
      const r = this.regions.get(id);
      if (r) r.pulse = { t0: now, color: tone === 'good' ? PULSE_GOOD : PULSE_BAD };
    }
  }

  private applyColors() {
    const { hover, selected, marked, focus } = this.highlight;
    for (const r of this.regions.values()) {
      const dim = focus && !focus.includes(r.id);
      const c = dim ? r.color.clone().lerp(DIM, 0.62) : r.color;
      r.cap.color.copy(c);
      r.side.color.copy(c).multiplyScalar(0.62);
      const emissive =
        r.id === selected ? GOLD : marked.includes(r.id) ? GOLD : r.id === hover ? WHITE : null;
      r.cap.emissive.copy(emissive ?? new THREE.Color(0));
      r.cap.emissiveIntensity = r.id === selected ? 0.45 : marked.includes(r.id) ? 0.25 : 0.16;
      r.outline.color.copy(r.id === selected || marked.includes(r.id) ? GOLD : OUTLINE);
    }
    this.dirty = true;
  }

  // --- Câmera ----------------------------------------------------------------------------------

  resize(width: number, height: number) {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.renderer.setSize(this.width, this.height, false);
    this.camera.aspect = this.width / this.height;
    this.applyViewOffset();
    this.dirty = true;
  }

  /** A parte da tela coberta pela interface: o centro da imagem vai para o meio da área livre. */
  setInsets(insets: Insets) {
    this.insets = insets;
    this.applyViewOffset();
    this.dirty = true;
  }

  private freeInsets(): Insets {
    const i = this.insets;
    return this.width - i.left - i.right < 420 ? { ...i, right: 0 } : i;
  }

  private applyViewOffset() {
    const i = this.freeInsets();
    const shift = (i.left - i.right) / 2;
    this.camera.setViewOffset(this.width, this.height, -shift, 0, this.width, this.height);
    this.camera.updateProjectionMatrix();
  }

  /** Distância que enquadra uma extensão do mapa na área livre, na inclinação padrão. */
  private fitDistance(extent: number): number {
    const i = this.freeInsets();
    const freeW = Math.max(240, this.width - i.left - i.right);
    const tan = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const byH = (extent * 0.56) / tan;
    const byW = (extent * 0.55) / (tan * (freeW / this.height));
    return Math.min(this.size * 2.6, Math.max(byH, byW));
  }

  private homeView(): [THREE.Vector3, THREE.Vector3] {
    const dist = this.fitDistance(this.size);
    const phi = THREE.MathUtils.degToRad(46);
    return [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, dist * Math.cos(phi), dist * Math.sin(phi)),
    ];
  }

  /** Volta ao Brasil inteiro, de frente para o norte. */
  home(animate = true) {
    this.userMoved = false;
    const [target, position] = this.homeView();
    this.flyTo(target, position, animate);
  }

  /** Voa até uma região, mantendo a direção de onde a câmera olha. */
  focusRegion(id: string) {
    const r = this.regions.get(id);
    if (!r) return;
    const box = new THREE.Box3().setFromObject(r.mesh);
    const center = box.getCenter(new THREE.Vector3());
    const extent = Math.max(box.max.x - box.min.x, box.max.z - box.min.z);
    const dist = Math.min(
      this.fitDistance(this.size),
      Math.max(this.size * 0.5, this.fitDistance(extent) * 1.7),
    );
    const dir = this.camera.position.clone().sub(this.controls.target).normalize();
    this.userMoved = false;
    this.flyTo(center.setY(0), center.clone().setY(0).add(dir.multiplyScalar(dist)));
  }

  zoom(factor: number) {
    const target = this.controls.target.clone();
    const offset = this.camera.position
      .clone()
      .sub(target)
      .multiplyScalar(1 / factor);
    const len = THREE.MathUtils.clamp(
      offset.length(),
      this.controls.minDistance,
      this.controls.maxDistance,
    );
    this.userMoved = true;
    this.flyTo(target, target.clone().add(offset.setLength(len)));
  }

  private flyTo(target: THREE.Vector3, position: THREE.Vector3, animate = true) {
    if (!animate || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      this.controls.target.copy(target);
      this.camera.position.copy(position);
      this.flight = null;
      this.controls.update();
      this.dirty = true;
      return;
    }
    this.flight = {
      from: [this.controls.target.clone(), this.camera.position.clone()],
      to: [target, position],
      t0: -1,
      ms: 750,
    };
  }

  /** Ângulo da câmera em torno do eixo vertical (para girar a rosa dos ventos). */
  azimuth(): number {
    return this.controls.getAzimuthalAngle();
  }

  /** Posição na tela do topo de uma região (null se atrás da câmera). */
  project(id: string, out: THREE.Vector3): boolean {
    const r = this.regions.get(id);
    if (!r) return false;
    return this.projectGround(
      r.mesh.userData.anchor as [number, number] | undefined,
      this.heightOf(r),
      out,
    );
  }

  setAnchor(id: string, wx: number, wy: number) {
    const r = this.regions.get(id);
    if (r) r.mesh.userData.anchor = this.ground2(wx, wy);
  }

  /** Ponto do mapa (coordenadas do SVG) na tela, a uma altura dada. */
  projectPoint(wx: number, wy: number, z: number, out: THREE.Vector3): boolean {
    return this.projectGround(this.ground2(wx, wy), z, out);
  }

  regionHeight(id: string): number {
    const r = this.regions.get(id);
    return r ? this.heightOf(r) : BASE_HEIGHT;
  }

  private projectGround(p: [number, number] | undefined, z: number, out: THREE.Vector3): boolean {
    if (!p) return false;
    out.set(p[0], p[1], z);
    this.ground.localToWorld(out);
    out.project(this.camera);
    if (out.z > 1) return false;
    out.x = ((out.x + 1) / 2) * this.width;
    out.y = ((1 - out.y) / 2) * this.height;
    return true;
  }

  // --- Interação -------------------------------------------------------------------------------

  private pick(clientX: number, clientY: number): string | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(ndc, this.camera);
    const hits = this.raycaster.intersectObjects(
      [...this.regions.values()].map((r) => r.mesh),
      false,
    );
    return (hits[0]?.object.userData.regionId as string | undefined) ?? null;
  }

  private onPointerMove = (e: PointerEvent) => {
    this.pointer = { x: e.clientX, y: e.clientY };
    this.pointerMoved = true;
  };

  private onPointerDown = (e: PointerEvent) => {
    this.down = { x: e.clientX, y: e.clientY };
  };

  private onPointerUp = (e: PointerEvent) => {
    const d = this.down;
    this.down = null;
    if (!d || e.button !== 0 || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 5) return;
    const id = this.pick(e.clientX, e.clientY);
    if (id) this.cb.onClick(id);
  };

  private onPointerLeave = () => {
    this.pointer = null;
    if (this.lastHover !== null) {
      this.lastHover = null;
      this.cb.onHover(null);
    }
  };

  // --- Laço ------------------------------------------------------------------------------------

  private loop = () => {
    this.frame = requestAnimationFrame(this.loop);
    const now = performance.now();
    if (this.controls.update()) this.dirty = true;

    if (this.flight) {
      const f = this.flight;
      if (f.t0 < 0) f.t0 = now;
      const t = Math.min(1, (now - f.t0) / f.ms);
      const k = easeInOut(t);
      this.controls.target.lerpVectors(f.from[0], f.to[0], k);
      this.camera.position.lerpVectors(f.from[1], f.to[1], k);
      this.camera.lookAt(this.controls.target);
      if (t >= 1) this.flight = null;
      this.dirty = true;
    }

    let heightsMoved = false;
    for (const r of this.regions.values()) {
      if (Math.abs(r.target - r.h) > 0.0008) {
        r.h += (r.target - r.h) * 0.14;
        r.mesh.scale.z = this.heightOf(r);
        heightsMoved = true;
      }
      if (r.pulse) {
        const t = (now - r.pulse.t0) / 1900;
        if (t >= 1) {
          r.pulse = null;
          this.applyColors();
        } else {
          const glow = Math.sin(Math.min(1, t * 5) * Math.PI * 0.5) * (1 - t);
          r.cap.emissive.copy(r.pulse.color);
          r.cap.emissiveIntensity = glow * 0.55;
        }
        this.dirty = true;
      }
    }
    if (heightsMoved) {
      this.updateRivers();
      this.dirty = true;
    }

    // Raycast só quando o mouse ou a cena mudaram.
    if (this.pointer && !this.down && (this.pointerMoved || this.dirty)) {
      this.pointerMoved = false;
      const id = this.pick(this.pointer.x, this.pointer.y);
      if (id !== this.lastHover) {
        this.lastHover = id;
        this.cb.onHover(id);
      }
    }

    if (!this.dirty) return;
    this.dirty = false;
    this.renderer.render(this.scene, this.camera);
    this.cb.onFrame();
  };

  dispose() {
    cancelAnimationFrame(this.frame);
    this.controls.dispose();
    const el = this.renderer.domElement;
    el.removeEventListener('pointermove', this.onPointerMove);
    el.removeEventListener('pointerdown', this.onPointerDown);
    el.removeEventListener('pointerup', this.onPointerUp);
    el.removeEventListener('pointerleave', this.onPointerLeave);
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else mat?.dispose();
    });
    this.renderer.dispose();
    el.remove();
  }
}
