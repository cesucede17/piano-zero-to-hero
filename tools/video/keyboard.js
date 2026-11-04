// Teclado de piano 3D con proporciones reales (unidades: cm).
// buildKeyboard(THREE, {low, high}) -> { group, width, xOf(midi), press(midi, amt), tint(midi, color, k), reset() }

const NEGRAS = new Set([1, 3, 6, 8, 10]);
// Desplazamiento real de cada tecla negra respecto a la junta entre blancas (fracción de su ancho)
const OFFSET_NEGRA = { 1: -0.12, 3: 0.12, 6: -0.16, 8: 0, 10: 0.16 };

export const MEDIDAS = {
  blancaAncho: 2.35, hueco: 0.12, blancaLargo: 15, blancaAlto: 2.2,
  negraAncho: 1.3, negraLargo: 9.5, negraAlto: 1.3, base: 4,
};

export const esNegra = (midi) => NEGRAS.has(midi % 12);

export function buildKeyboard(THREE, { low = 21, high = 108, caja = true, colorCaja = 0x1b1c21 } = {}) {
  const M = MEDIDAS;
  const group = new THREE.Group();
  const blancas = [];
  for (let m = low; m <= high; m++) if (!esNegra(m)) blancas.push(m);
  const width = blancas.length * M.blancaAncho;
  const xBlanca = new Map(blancas.map((m, i) => [m, -width / 2 + (i + 0.5) * M.blancaAncho]));

  const xOf = (midi) => {
    if (!esNegra(midi)) return xBlanca.get(midi);
    const junta = xBlanca.get(midi - 1) + M.blancaAncho / 2;
    return junta + OFFSET_NEGRA[midi % 12] * M.blancaAncho;
  };

  const geoBlanca = new THREE.BoxGeometry(M.blancaAncho - M.hueco, M.blancaAlto, M.blancaLargo);
  const geoNegra = new THREE.BoxGeometry(M.negraAncho, M.negraAlto, M.negraLargo);
  const baseBlanca = new THREE.Color(0xf3efe6);
  const baseNegra = new THREE.Color(0x101013);
  const pivotZ = -M.blancaLargo / 2 - 4; // las teclas reales pivotan bastante por detrás

  const keys = new Map();
  for (let m = low; m <= high; m++) {
    const negra = esNegra(m);
    const mat = new THREE.MeshStandardMaterial({
      color: negra ? baseNegra : baseBlanca, roughness: negra ? 0.28 : 0.4, metalness: 0.0,
    });
    const mesh = new THREE.Mesh(negra ? geoNegra : geoBlanca, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const pivot = new THREE.Group();
    pivot.position.set(xOf(m), M.base, pivotZ);
    const zCentro = negra ? -M.blancaLargo / 2 + M.negraLargo / 2 : 0;
    const yCentro = negra ? M.blancaAlto + M.negraAlto / 2 : M.blancaAlto / 2;
    mesh.position.set(0, yCentro, zCentro - pivotZ);
    pivot.add(mesh);
    group.add(pivot);
    keys.set(m, { pivot, mesh, mat, negra, base: negra ? baseNegra : baseBlanca });
  }

  if (caja) {
    const matCaja = new THREE.MeshStandardMaterial({ color: colorCaja, roughness: 0.55, metalness: 0.2 });
    const fondo = M.blancaLargo + 13;
    const base = new THREE.Mesh(new THREE.BoxGeometry(width + 7, M.base, fondo), matCaja);
    base.position.set(0, M.base / 2, M.blancaLargo / 2 + 0.6 - fondo / 2);
    base.castShadow = base.receiveShadow = true;
    group.add(base);
    // Mejillas laterales y panel trasero
    for (const s of [-1, 1]) {
      const mejilla = new THREE.Mesh(new THREE.BoxGeometry(3.2, 5.5, fondo), matCaja);
      mejilla.position.set(s * (width / 2 + 1.9), M.base + 2.2, base.position.z);
      mejilla.castShadow = true;
      group.add(mejilla);
    }
    const trasero = new THREE.Mesh(new THREE.BoxGeometry(width + 7, 6.5, 12.4), matCaja);
    trasero.position.set(0, M.base + 3.2, -M.blancaLargo / 2 - 6.2);
    trasero.castShadow = true;
    group.add(trasero);
    const fieltro = new THREE.Mesh(new THREE.BoxGeometry(width, 0.6, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x7a1020, roughness: 0.9 }));
    fieltro.position.set(0, M.base + M.blancaAlto + 0.6, -M.blancaLargo / 2 - 0.1);
    group.add(fieltro);
  }

  const tmp = new THREE.Color();
  return {
    group, keys, width, xOf, low, high,
    fondo: M.blancaLargo + 13,
    /** amt 0..1: cuánto está hundida la tecla */
    press(midi, amt) {
      const k = keys.get(midi);
      if (k) k.pivot.rotation.x = amt * (k.negra ? 0.05 : 0.042);
    },
    /** Tiñe una tecla: k=0 color original, k=1 color completo */
    tint(midi, color, k = 1) {
      const key = keys.get(midi);
      if (!key) return;
      tmp.set(color);
      key.mat.color.copy(key.base).lerp(tmp, k);
      key.mat.emissive.copy(tmp).multiplyScalar(0.45 * k);
    },
    reset() {
      for (const [m, k] of keys) {
        k.pivot.rotation.x = 0;
        k.mat.color.copy(k.base);
        k.mat.emissive.setRGB(0, 0, 0);
      }
    },
  };
}
