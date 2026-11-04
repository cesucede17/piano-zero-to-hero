// Motor de escenas de los vídeos. Cada frame es función del tiempo t (determinista),
// así Playwright puede capturar frame a frame: window.__renderAt(t).
//
// URL: index.html?leccion=lessons/01-elegir-piano[&render=1][&t=12.5]
//   render=1 -> espera a que Python llame a __setTimeline(); sin él carga video/build/timeline.json
//   t=12.5   -> dibuja solo ese instante (para revisar un frame)

import * as THREE from 'three';
import { buildKeyboard, esNegra } from './keyboard.js';

const W = 1920, H = 1080;
const params = new URLSearchParams(location.search);
const leccion = params.get('leccion');
const modoRender = params.has('render');
if (modoRender) document.body.classList.add('render');

// ---------- Escena base ----------
const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById('lienzo'), antialias: true, preserveDrawingBuffer: true,
});
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07080c);
scene.fog = new THREE.Fog(0x07080c, 260, 620);

const camera = new THREE.PerspectiveCamera(35, W / H, 1, 2000);

scene.add(new THREE.HemisphereLight(0xb8c4ff, 0x0c0c14, 0.55));
const sol = new THREE.DirectionalLight(0xfff1dc, 2.2);
sol.position.set(60, 160, 110);
sol.castShadow = true;
sol.shadow.mapSize.set(2048, 2048);
Object.assign(sol.shadow.camera, { left: -160, right: 160, top: 120, bottom: -120, near: 10, far: 500 });
sol.shadow.bias = -0.0004;
scene.add(sol);
const contra = new THREE.DirectionalLight(0x6f8cff, 0.9);
contra.position.set(-80, 70, -120);
scene.add(contra);

const suelo = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000),
  new THREE.MeshStandardMaterial({ color: 0x0e1016, roughness: 0.95 }));
suelo.rotation.x = -Math.PI / 2;
suelo.receiveShadow = true;
scene.add(suelo);

const piano = buildKeyboard(THREE);
scene.add(piano.group);

// ---------- Utilidades para las escenas ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, u) => a + (b - a) * u;
const ease = (u) => { u = clamp(u); return u * u * (3 - 2 * u); };
const seg = (t, a, b) => ease((t - a) / (b - a));
const v3 = (a) => new THREE.Vector3(...a);

const capaPaneles = document.getElementById('paneles');
const elTitulo = document.getElementById('titulo');
const elSub = document.getElementById('sub');

const ctx = {
  THREE, scene, camera, renderer, piano, buildKeyboard, esNegra,
  clamp, lerp, ease, seg, v3,
  grupo: null, notasEn: piano, t: 0, timeline: null, escena: null,

  /** Cámara por keyframes: [{t, pos:[x,y,z], look:[x,y,z]}] */
  cam(local, keys) {
    let i = 0;
    while (i < keys.length - 1 && local >= keys[i + 1].t) i++;
    const a = keys[i], b = keys[Math.min(i + 1, keys.length - 1)];
    const u = b === a ? 0 : seg(local, a.t, b.t);
    camera.position.lerpVectors(v3(a.pos), v3(b.pos), u);
    camera.lookAt(v3(a.look).lerp(v3(b.look), u));
  },

  /** Opacidad que entra en tIn y sale en tOut */
  fade(local, tIn, tOut = Infinity, d = 0.45) {
    const sale = Number.isFinite(tOut) ? 1 - seg(local, tOut - d, tOut) : 1;
    return Math.min(seg(local, tIn, tIn + d), sale);
  },

  /** Panel HTML (se crea una vez por escena). pos: {left, top, right, bottom} en px */
  panel(clave, html, pos = {}, clase = '') {
    ctx._paneles ??= new Map();
    let el = ctx._paneles.get(clave);
    if (!el) {
      el = document.createElement('div');
      el.className = 'panel ' + clase;
      el.innerHTML = html;
      for (const [k, v] of Object.entries(pos)) el.style[k] = typeof v === 'number' ? v + 'px' : v;
      capaPaneles.appendChild(el);
      ctx._paneles.set(clave, el);
    }
    return el;
  },

  /** Lista de tarjetas que aparecen una a una: items [{t, html, clase}] */
  tarjetas(clave, local, items, pos = { right: 80, top: 170 }, salida = Infinity) {
    const cont = ctx.panel(clave, items.map((it) => `<div class="tarjeta ${it.clase || ''}">${it.html}</div>`).join(''),
      pos, 'tarjetas');
    cont.style.opacity = Number.isFinite(salida) ? 1 - seg(local, salida - 0.45, salida) : 1;
    [...cont.children].forEach((el, i) => {
      const u = seg(local, items[i].t, items[i].t + 0.45);
      el.style.opacity = u;
      el.style.transform = `translateX(${(1 - u) * 40}px)`;
    });
    return cont;
  },

  titulo(html, opacidad) {
    if (elTitulo.dataset.html !== html) { elTitulo.innerHTML = html; elTitulo.dataset.html = html; }
    elTitulo.style.opacity = opacidad;
  },

  /** Etiqueta de texto 3D (sprite que siempre mira a cámara). alto en cm */
  etiqueta(texto, { alto = 6, color = '#eef1f7', fondo = 'rgba(14,18,28,0.85)', peso = 700 } = {}) {
    const c = document.createElement('canvas');
    const g = c.getContext('2d');
    const fs = 96;
    g.font = `${peso} ${fs}px "Segoe UI", system-ui, sans-serif`;
    const w = Math.ceil(g.measureText(texto).width) + fs;
    c.width = w; c.height = fs * 1.7;
    g.font = `${peso} ${fs}px "Segoe UI", system-ui, sans-serif`;
    if (fondo) { g.fillStyle = fondo; g.beginPath(); g.roundRect(0, 0, c.width, c.height, fs * 0.3); g.fill(); }
    g.fillStyle = color; g.textBaseline = 'middle'; g.textAlign = 'center';
    g.fillText(texto, c.width / 2, c.height / 2 + fs * 0.05);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    sp.scale.set(alto * c.width / c.height, alto, 1);
    sp.renderOrder = 10;
    return sp;
  },

  /** Notas sonando en el instante actual (de toda la línea de tiempo) */
  notasActivas() {
    return (ctx.timeline?.notas ?? []).filter((n) => ctx.t >= n.t && ctx.t < n.t + n.dur);
  },
};

// ---------- Cambio de escena ----------
let modulo = null;
let indiceActual = -1;

function liberar(obj) {
  obj.traverse((o) => {
    o.geometry?.dispose();
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    mats.forEach((m) => { m.map?.dispose(); m.dispose(); });
  });
}

function entrar(indice) {
  const anterior = ctx.escena && modulo.escenas[ctx.escena.id];
  anterior?.exit?.(ctx);
  if (ctx.grupo) { scene.remove(ctx.grupo); liberar(ctx.grupo); }
  ctx._paneles?.forEach((el) => el.remove());
  ctx._paneles = new Map();
  ctx.grupo = new THREE.Group();
  scene.add(ctx.grupo);
  piano.reset();
  piano.group.visible = true;
  piano.group.position.set(0, 0, 0);
  piano.group.rotation.set(0, 0, 0);
  ctx.notasEn = piano;
  ctx.titulo('', 0);
  ctx.escena = ctx.timeline.escenas[indice];
  modulo.escenas[ctx.escena.id]?.enter?.(ctx);
  indiceActual = indice;
}

const COLOR_SUAVE = new THREE.Color(0x38bdf8), COLOR_FUERTE = new THREE.Color(0xf97316);

function aplicarNotas() {
  const kb = ctx.notasEn;
  if (!kb) return;
  const pulsadas = new Map();
  for (const n of ctx.timeline.notas) {
    const dt = ctx.t - n.t;
    if (dt < 0 || dt > n.dur + 0.15) continue;
    const amt = dt < n.dur ? seg(dt, 0, 0.04) : 1 - seg(dt, n.dur, n.dur + 0.12);
    if (amt > (pulsadas.get(n.midi)?.amt ?? 0)) pulsadas.set(n.midi, { amt, vel: n.vel });
  }
  for (const [m, k] of kb.keys) {
    const p = pulsadas.get(m);
    kb.press(m, p ? p.amt : 0);
    if (p) kb.tint(m, COLOR_SUAVE.clone().lerp(COLOR_FUERTE, p.vel / 127), p.amt);
    else if (!ctx._tintesFijos) kb.tint(m, 0, 0);
  }
}

function subtitulos() {
  const s = ctx.timeline.subs.find((x) => ctx.t >= x.a && ctx.t < x.b);
  if (s) {
    if (elSub.dataset.txt !== s.texto) { elSub.textContent = s.texto; elSub.dataset.txt = s.texto; }
    elSub.style.opacity = Math.min(seg(ctx.t, s.a, s.a + 0.2), 1 - seg(ctx.t, s.b - 0.2, s.b));
  } else elSub.style.opacity = 0;
}

function dibujar(t) {
  const tl = ctx.timeline;
  ctx.t = t;
  let i = tl.escenas.findIndex((e) => t >= e.inicio && t < e.inicio + e.dur);
  if (i < 0) i = t < 0 ? 0 : tl.escenas.length - 1;
  if (i !== indiceActual) entrar(i);
  const e = tl.escenas[i];
  ctx._tintesFijos = false;
  modulo.escenas[e.id]?.update?.(ctx, t - e.inicio, e.dur);
  aplicarNotas();
  subtitulos();
  renderer.render(scene, camera);
}

// ---------- API para Playwright y modo vista previa ----------
window.__setTimeline = (tl) => { ctx.timeline = tl; indiceActual = -1; };
window.__renderAt = (t) => new Promise((ok) => {
  dibujar(t);
  requestAnimationFrame(() => requestAnimationFrame(ok));
});

function ajustarVentana() {
  if (modoRender) return;
  const k = Math.min(innerWidth / W, innerHeight / H);
  document.getElementById('escenario').style.transform = `scale(${k})`;
}

async function iniciar() {
  modulo = (await import(`/${leccion}/video/escenas.js`)).default;
  window.__listo = true;
  if (modoRender) return;

  ajustarVentana();
  addEventListener('resize', ajustarVentana);
  const tl = await (await fetch(`/${leccion}/video/build/timeline.json`)).json();
  window.__setTimeline(tl);
  if (params.has('t')) { dibujar(parseFloat(params.get('t'))); return; }

  const audio = new Audio(`/${leccion}/video/build/audio.wav`);
  addEventListener('click', () => (audio.paused ? audio.play() : audio.pause()));
  addEventListener('keydown', (ev) => {
    if (ev.key === 'ArrowRight') audio.currentTime += 5;
    if (ev.key === 'ArrowLeft') audio.currentTime = Math.max(0, audio.currentTime - 5);
  });
  const bucle = () => { dibujar(audio.currentTime); requestAnimationFrame(bucle); };
  bucle();
}

iniciar();
