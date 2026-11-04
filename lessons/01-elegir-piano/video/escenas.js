// Escenas 3D de la lección 1. Cada clave coincide con un "id" de guion.json.
// enter(ctx): crea objetos en ctx.grupo (se borran solos al cambiar de escena)
// update(ctx, t, dur): coloca todo en el instante t (segundos desde el inicio de la escena)

const AMBAR = 0xf5b841, ROJO = 0xef4444, VERDE = 0x22c55e;

function mat(ctx, color, extra = {}) {
  return new ctx.THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.1, ...extra });
}

function caja(ctx, w, h, d, color, extra) {
  const m = new ctx.THREE.Mesh(new ctx.THREE.BoxGeometry(w, h, d), mat(ctx, color, extra));
  m.castShadow = m.receiveShadow = true;
  return m;
}

/** Pulsación periódica 0..1 (baja rápido, sube despacio) */
function pulso(t, periodo, desfase = 0) {
  const u = (((t + desfase) % periodo) + periodo) % periodo / periodo;
  if (u < 0.12) return u / 0.12;
  if (u < 0.45) return 1;
  if (u < 0.65) return 1 - (u - 0.45) / 0.2;
  return 0;
}

/** Línea de cota (barra fina + topes) entre dos puntos en el plano XZ */
function cota(ctx, a, b, texto) {
  const { THREE } = ctx;
  const g = new THREE.Group();
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
  const largo = va.distanceTo(vb);
  const barra = caja(ctx, largo, 0.5, 0.5, AMBAR, { emissive: AMBAR, emissiveIntensity: 0.6 });
  barra.position.copy(va).lerp(vb, 0.5);
  barra.lookAt(vb);
  barra.rotateY(Math.PI / 2);
  g.add(barra);
  for (const p of [va, vb]) {
    const tope = caja(ctx, 0.6, 0.6, 4, AMBAR, { emissive: AMBAR, emissiveIntensity: 0.6 });
    tope.position.copy(p);
    tope.lookAt(barra.position);
    tope.rotateY(Math.PI / 2);
    g.add(tope);
  }
  const et = ctx.etiqueta(texto, { alto: 7, color: '#f5b841' });
  et.position.copy(barra.position).add(new THREE.Vector3(0, 6, 0));
  g.add(et);
  return g;
}

function transparente(obj, opacidad) {
  obj.traverse((o) => {
    if (o.material) { o.material.transparent = true; o.material.opacity = opacidad; }
  });
  obj.visible = opacidad > 0.01;
}

export default {
  escenas: {
    // ---------------------------------------------------------------- 1
    intro: {
      update(ctx, t, dur) {
        ctx.cam(t, [
          { t: 0, pos: [-95, 22, 38], look: [-35, 5, 0] },
          { t: dur * 0.55, pos: [70, 28, 50], look: [25, 5, 0] },
          { t: dur, pos: [0, 78, 112], look: [0, 3, 0] },
        ]);
        ctx.titulo('<div class="num">LECCIÓN 1</div><h1>Elegir tu piano</h1><p>Qué comprar para aprender desde cero</p>',
          ctx.fade(t, 0.3, dur - 0.6, 0.8));
      },
    },

    // ---------------------------------------------------------------- 2
    digital: {
      enter(ctx) {
        // Piano vertical esquemático (medidas reales aproximadas)
        const v = new ctx.THREE.Group();
        const madera = 0x4a2c1c;
        const cuerpo = caja(ctx, 150, 125, 36, madera, { roughness: 0.3, metalness: 0.15 });
        cuerpo.position.set(0, 62.5, -12);
        const mesa = caja(ctx, 150, 9, 30, madera, { roughness: 0.25 });
        mesa.position.set(0, 68, 12);
        const teclas = caja(ctx, 122, 2.2, 15, 0xf3efe6);
        teclas.position.set(0, 73.6, 16);
        const tapa = caja(ctx, 126, 26, 3, 0x2a1d17, { roughness: 0.2 });
        tapa.position.set(0, 95, 6);
        for (const s of [-1, 1]) {
          const pata = caja(ctx, 6, 64, 6, madera);
          pata.position.set(s * 70, 32, 22);
          v.add(pata);
        }
        v.add(cuerpo, mesa, teclas, tapa);
        v.position.set(-105, 0, -10);
        ctx.grupo.add(v);
        ctx.vertical = v;

        const e1 = ctx.etiqueta('Acústico · ≈ 200 kg · 3.000 €+', { alto: 8 });
        e1.position.set(-105, 145, 0);
        const e2 = ctx.etiqueta('Digital · ≈ 12 kg · 370–700 €', { alto: 8, color: '#f5b841' });
        e2.position.set(70, 40, 0);
        ctx.grupo.add(e1, e2);
        ctx.etiquetas = [e1, e2];
      },
      update(ctx, t, dur) {
        const u = ctx.seg(t, dur * 0.42, dur * 0.55);
        ctx.piano.group.position.x = 70;
        transparente(ctx.vertical, 1 - u);
        ctx.etiquetas[0].material.opacity = 1 - u;
        ctx.etiquetas[1].material.opacity = ctx.fade(t, 1.2, dur * 0.5);
        ctx.cam(t, [
          { t: 0, pos: [-20, 115, 340], look: [-20, 55, 0] },
          { t: dur * 0.4, pos: [-15, 105, 320], look: [-15, 50, 0] },
          { t: dur * 0.6, pos: [5, 66, 150], look: [42, 6, 0] },
          { t: dur, pos: [0, 60, 140], look: [42, 4, 0] },
        ]);
        ctx.tarjetas('ventajas', t, [
          { t: dur * 0.55, html: '<b>10× más barato</b><small>370–700 € frente a 3.000 €+</small>' },
          { t: dur * 0.62, html: '🎧 <b>Auriculares</b><small>practica a las 23:00 sin molestar</small>' },
          { t: dur * 0.69, html: '🔧 <b>Nunca se desafina</b>' },
          { t: dur * 0.76, html: '🔌 <b>USB-MIDI</b><small>el PC te escucha y te pone nota</small>', clase: 'bien' },
        ], { left: 80, top: 150 });
      },
    },

    // ---------------------------------------------------------------- 3
    espacio: {
      enter(ctx) {
        const ancho = ctx.piano.width + 7;
        const zFrente = 8.1, zFondo = zFrente - ctx.piano.fondo;
        ctx.cotaAncho = cota(ctx, [-ancho / 2, 1, zFrente + 9], [ancho / 2, 1, zFrente + 9], '≈ 130 cm');
        ctx.cotaFondo = cota(ctx, [ancho / 2 + 9, 1, zFrente], [ancho / 2 + 9, 1, zFondo], '23–31 cm');
        ctx.grupo.add(ctx.cotaAncho, ctx.cotaFondo);
      },
      update(ctx, t, dur) {
        ctx.cam(t, [
          { t: 0, pos: [0, 78, 112], look: [0, 3, 0] },
          { t: 2.2, pos: [8, 225, 70], look: [8, 0, -2] },
          { t: dur, pos: [8, 230, 62], look: [8, 0, -2] },
        ]);
        transparente(ctx.cotaAncho, ctx.seg(t, 2.0, 2.8));
        transparente(ctx.cotaFondo, ctx.seg(t, 3.4, 4.2));
        ctx.tarjetas('opciones', t, [
          { t: dur * 0.5, html: '🪑 <b>Mesa firme</b><small>+ silla regulable</small>' },
          { t: dur * 0.62, html: '📐 <b>Soporte en Z</b><small>se pliega contra la pared</small>' },
          { t: dur * 0.74, html: '🛏️ <b>Guardarlo</b><small>11–15 kg, bajo la cama</small>' },
        ], { left: 150, top: 110 }).classList.add('fila');
      },
    },

    // ---------------------------------------------------------------- 4
    teclas88: {
      enter(ctx) {
        const kb = ctx.buildKeyboard(ctx.THREE, { low: 36, high: 96, colorCaja: 0x2a2b33 });
        kb.group.position.set(ctx.piano.xOf(36) - kb.xOf(36), 0, 46);
        ctx.grupo.add(kb.group);
        ctx.kb61 = kb;
        const e88 = ctx.etiqueta('88 teclas ✔', { alto: 7, color: '#22c55e' });
        e88.position.set(0, 26, -14);
        const e61 = ctx.etiqueta('61 teclas ✘', { alto: 7, color: '#ef4444' });
        e61.position.set(kb.group.position.x, 3, 72);
        ctx.grupo.add(e88, e61);
        ctx.et = [e88, e61];
      },
      update(ctx, t, dur) {
        ctx.cam(t, [
          { t: 0, pos: [0, 120, 175], look: [0, 0, 18] },
          { t: dur, pos: [0, 128, 165], look: [0, 0, 20] },
        ]);
        ctx.kb61.group.position.y = -18 * (1 - ctx.seg(t, 0.6, 2.2));
        ctx.et[0].material.opacity = ctx.seg(t, 0.4, 1.0);
        ctx.et[1].material.opacity = ctx.seg(t, 2.0, 2.6);
        // Teclas que le faltan al de 61: en rojo sobre el de 88
        const k = ctx.seg(t, 3.0, 3.8) * (0.75 + 0.25 * Math.sin(t * 5));
        ctx._tintesFijos = true;
        for (let m = 21; m <= 108; m++) ctx.piano.tint(m, ROJO, m < 36 || m > 96 ? k : 0);
      },
    },

    // ---------------------------------------------------------------- 5
    martillo: {
      enter(ctx) {
        const { THREE } = ctx;
        const crear = (x, conMartillo) => {
          const g = new THREE.Group();
          g.position.set(x, 40, 0);
          const pivTecla = new THREE.Group();
          pivTecla.position.set(-20, 0, 0);
          const tecla = caja(ctx, 42, 3, 4, 0xf3efe6);
          tecla.position.set(21, 0, 0);
          pivTecla.add(tecla);
          const eje = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 6, 20), mat(ctx, 0x8892a6, { metalness: 0.3 }));
          eje.rotation.x = Math.PI / 2;
          eje.position.set(-20, 0, 0);
          const bancada = caja(ctx, 54, 2, 8, 0x2a2b33);
          bancada.position.set(2, -14, 0);
          g.add(pivTecla, eje, bancada);
          const r = { g, pivTecla };
          if (conMartillo) {
            const empujador = caja(ctx, 1.4, 4.2, 1.4, 0x8892a6, { metalness: 0.3 });
            empujador.position.set(6, -3.4, 0); // relativo a la tecla: 27 cm desde el pivote
            tecla.add(empujador);
            const pivBrazo = new THREE.Group();
            pivBrazo.position.set(0, -7, 0);
            const brazo = caja(ctx, 28, 1.3, 1.6, 0x8892a6, { metalness: 0.3 });
            brazo.position.set(-7, 0, 0);
            const peso = caja(ctx, 7, 5.5, 3.4, AMBAR, { metalness: 0.5, roughness: 0.3 });
            peso.position.set(-19, 1.4, 0);
            pivBrazo.add(brazo, peso);
            const ejeB = eje.clone();
            ejeB.position.set(0, -7, 0);
            g.add(pivBrazo, ejeB);
            r.pivBrazo = pivBrazo;
          } else {
            const puntos = [];
            for (let i = 0; i <= 160; i++) {
              const a = i / 160 * Math.PI * 2 * 5;
              puntos.push(new THREE.Vector3(Math.cos(a) * 2.4, -i / 160 * 12.5, Math.sin(a) * 2.4));
            }
            const muelle = new THREE.Mesh(
              new THREE.TubeGeometry(new THREE.CatmullRomCurve3(puntos), 400, 0.4, 8),
              mat(ctx, 0xd6dce8, { metalness: 0.2, roughness: 0.35, emissive: 0x334155 }));
            muelle.position.set(12, -1.5, 0);
            g.add(muelle);
            r.muelle = muelle;
          }
          ctx.grupo.add(g);
          return r;
        };
        ctx.mecA = crear(-48, true);
        ctx.mecB = crear(42, false);
        const eA = ctx.etiqueta('Martillo ✔', { alto: 6.5, color: '#22c55e' });
        eA.position.set(-46, 62, 0);
        const eB = ctx.etiqueta('Muelle ✘', { alto: 6.5, color: '#ef4444' });
        eB.position.set(44, 62, 0);
        const eG = ctx.etiqueta('más peso  ◀', { alto: 6, color: '#f97316' });
        eG.position.set(-48, 20, 8);
        const eL = ctx.etiqueta('▶  menos peso', { alto: 6, color: '#38bdf8' });
        eL.position.set(48, 20, 8);
        ctx.grupo.add(eA, eB, eG, eL);
        ctx.et = [eA, eB, eG, eL];
      },
      update(ctx, t, dur) {
        const fin = dur * 0.68;
        ctx.cam(t, [
          { t: 0, pos: [0, 50, 140], look: [0, 36, 0] },
          { t: fin - 1, pos: [0, 52, 132], look: [0, 36, 0] },
          { t: fin + 1.2, pos: [0, 82, 118], look: [0, 3, 0] },
          { t: dur, pos: [0, 80, 112], look: [0, 3, 0] },
        ]);
        const p = pulso(t, 1.8);
        // Tecla con martillo: la parte delantera baja y el peso de detrás sube
        const a = 0.085 * p;
        ctx.mecA.pivTecla.rotation.z = -a;
        const bajada = 26 * Math.sin(a);
        ctx.mecA.pivBrazo.rotation.z = -Math.asin(Math.min(0.9, bajada / 7)) * 0.9;
        ctx.mecB.pivTecla.rotation.z = -a;
        ctx.mecB.muelle.scale.y = 1 - 0.2 * p;
        const verMec = 1 - ctx.seg(t, fin, fin + 0.8);
        transparente(ctx.mecA.g, verMec);
        transparente(ctx.mecB.g, verMec);
        ctx.et[0].material.opacity = ctx.et[1].material.opacity = Math.min(verMec, ctx.seg(t, 0.4, 1));
        const verGrad = ctx.seg(t, fin + 0.8, fin + 1.8);
        ctx.et[2].material.opacity = ctx.et[3].material.opacity = verGrad;
        // Graduada: pinta el teclado de naranja (graves) a azul (agudos)
        ctx._tintesFijos = true;
        const c = new ctx.THREE.Color();
        for (let m = 21; m <= 108; m++) {
          c.set(0xf97316).lerp(new ctx.THREE.Color(0x38bdf8), (m - 21) / 87);
          ctx.piano.tint(m, c, verGrad * 0.85);
        }
      },
    },

    // ---------------------------------------------------------------- 6
    velocidad: {
      enter(ctx) {
        ctx.medidor = ctx.panel('medidor', '<div class="medidor">Velocidad MIDI<div class="valor">0</div>' +
          '<div class="barra"><div class="relleno"></div></div><div class="tipo" style="margin-top:12px;color:#9fb3d9">—</div></div>',
          { right: 100, top: 160 });
      },
      update(ctx, t, dur) {
        ctx.cam(t, [
          { t: 0, pos: [-30, 60, 95], look: [0, 3, 0] },
          { t: dur, pos: [8, 30, 52], look: [0, 4, 0] },
        ]);
        const notas = ctx.timeline.notas.filter((n) => n.t >= ctx.escena.inicio && n.t <= ctx.t);
        const ultima = notas[notas.length - 1];
        ctx.medidor.style.opacity = ctx.fade(t, 1, dur - 0.4);
        const vel = ultima ? ultima.vel : 0;
        const k = ultima ? 1 - ctx.seg(ctx.t - ultima.t, ultima.dur, ultima.dur + 0.8) * 0.3 : 0;
        ctx.medidor.querySelector('.valor').textContent = vel;
        ctx.medidor.querySelector('.relleno').style.width = `${(vel / 127) * 100 * k}%`;
        ctx.medidor.querySelector('.tipo').textContent = !ultima ? 'toca una tecla…' : vel < 64 ? 'suave (piano)' : 'fuerte (forte)';
      },
    },

    // ---------------------------------------------------------------- 7
    polifonia: {
      enter(ctx) {
        ctx.contador = ctx.panel('contador', '<div class="medidor">Notas sonando a la vez<div class="valor">0</div>' +
          '<div style="color:#9fb3d9;margin-top:8px">Mínimo recomendado: <b style="color:#f5b841">64</b></div></div>',
          { left: 80, top: 140 });
      },
      update(ctx, t, dur) {
        ctx.cam(t, [
          { t: 0, pos: [0, 80, 120], look: [0, 3, 0] },
          { t: dur, pos: [0, 98, 128], look: [0, 3, 0] },
        ]);
        ctx.contador.style.opacity = ctx.fade(t, 0.4, dur - 0.3);
        ctx.contador.querySelector('.valor').textContent = ctx.notasActivas().length;
      },
    },

    // ---------------------------------------------------------------- 8
    conexiones: {
      enter(ctx) {
        const { THREE } = ctx;
        const zTrasera = -7.5 - 12.4 - 0.05;
        const puerto = (x, w, h, color) => {
          const p = caja(ctx, w, h, 0.8, color, { roughness: 0.3, metalness: 0.3 });
          p.position.set(x, 7.4, zTrasera);
          ctx.grupo.add(p);
          return p;
        };
        // USB-B: cuadrado con esquinas achaflanadas (aprox.) y su lengüeta interior
        puerto(42, 1.4, 1.2, 0xbfc6d4);
        const interior = caja(ctx, 0.8, 0.5, 0.4, 0x3b82f6, { emissive: 0x3b82f6, emissiveIntensity: 0.4 });
        interior.position.set(42, 7.3, zTrasera - 0.4);
        ctx.grupo.add(interior);
        for (const [x, nombre] of [[50, 'pedal'], [56, 'auric']]) {
          const jack = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.8, 24),
            mat(ctx, 0xbfc6d4, { metalness: 0.3, roughness: 0.25 }));
          jack.rotation.x = Math.PI / 2;
          jack.position.set(x, 7.4, zTrasera);
          ctx.grupo.add(jack);
          const agujero = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1, 16), mat(ctx, 0x050505));
          agujero.rotation.x = Math.PI / 2;
          agujero.position.set(x, 7.4, zTrasera - 0.2);
          ctx.grupo.add(agujero);
          ctx[nombre] = jack;
        }
        const etUSB = ctx.etiqueta('USB to Host', { alto: 3.2, color: '#60a5fa' });
        etUSB.position.set(42, 13.5, zTrasera - 1);
        const etPedal = ctx.etiqueta('Pedal', { alto: 2.6 });
        etPedal.position.set(50, 11.6, zTrasera - 1);
        const etAur = ctx.etiqueta('Auriculares', { alto: 2.6 });
        etAur.position.set(57.5, 13.8, zTrasera - 1);
        ctx.grupo.add(etUSB, etPedal, etAur);
        ctx.et = [etUSB, etPedal, etAur];

        // Portátil y cable
        const portatil = new THREE.Group();
        const base = caja(ctx, 34, 1.6, 24, 0x3a3f4b, { metalness: 0.3 });
        const pantalla = caja(ctx, 34, 22, 1, 0x3a3f4b, { metalness: 0.3 });
        pantalla.position.set(0, 11, -12);
        pantalla.rotation.x = -0.25;
        const brillo = new THREE.Mesh(new THREE.PlaneGeometry(31, 19),
          new THREE.MeshBasicMaterial({ color: 0x0f172a }));
        brillo.position.set(0, 0, 0.55);
        pantalla.add(brillo);
        portatil.add(base, pantalla);
        portatil.position.set(12, 0.8, -66);
        portatil.rotation.y = 1.96;
        ctx.grupo.add(portatil);
        ctx.pantalla = brillo;
        // Luz de apoyo: la parte trasera del piano queda en sombra
        const foco = new THREE.PointLight(0xfff1dc, 2600, 0, 2);
        foco.position.set(70, 32, -62);
        ctx.grupo.add(foco);

        const curva = new THREE.CatmullRomCurve3([
          new THREE.Vector3(42, 7.3, zTrasera - 0.8), new THREE.Vector3(42, 6, zTrasera - 10),
          new THREE.Vector3(34, 0.6, -44), new THREE.Vector3(22, 0.6, -56),
          new THREE.Vector3(17, 1.5, -60),
        ]);
        const cable = new THREE.Mesh(new THREE.TubeGeometry(curva, 120, 0.45, 10), mat(ctx, 0x1f2937, { roughness: 0.7 }));
        cable.castShadow = true;
        ctx.grupo.add(cable);
        ctx.curva = curva;
        ctx.datos = [];
        for (let i = 0; i < 8; i++) {
          const d = new THREE.Mesh(new THREE.SphereGeometry(0.75, 12, 12),
            new THREE.MeshBasicMaterial({ color: 0x60a5fa, transparent: true }));
          ctx.grupo.add(d);
          ctx.datos.push(d);
        }
      },
      update(ctx, t, dur) {
        ctx.cam(t, [
          { t: 0, pos: [0, 78, 112], look: [0, 3, 0] },
          { t: 3.0, pos: [95, 36, -95], look: [48, 6, -22] },
          { t: dur * 0.62, pos: [80, 26, -70], look: [48, 7, -21] },
          { t: dur * 0.85, pos: [105, 48, -120], look: [35, 5, -38] },
          { t: dur, pos: [108, 50, -124], look: [35, 5, -38] },
        ]);
        ctx.et[0].material.opacity = ctx.seg(t, 3, 3.6);
        ctx.et[1].material.opacity = ctx.seg(t, 4, 4.6);
        ctx.et[2].material.opacity = ctx.seg(t, dur * 0.7, dur * 0.7 + 0.6);
        ctx.auric.material.emissive.setHex(0xf5b841);
        ctx.auric.material.emissiveIntensity = ctx.seg(t, dur * 0.7, dur * 0.72) * (0.6 + 0.4 * Math.sin(t * 6));
        const sonando = ctx.notasActivas().length > 0;
        ctx.datos.forEach((d, i) => {
          const u = (t * 0.45 + i / ctx.datos.length) % 1;
          d.position.copy(ctx.curva.getPointAt(u));
          d.material.opacity = sonando ? 1 : 0.15;
        });
        ctx.pantalla.material.color.setHex(sonando ? 0x1d4ed8 : 0x0f172a);
      },
    },

    // ---------------------------------------------------------------- 9
    pedal: {
      enter(ctx) {
        const { THREE } = ctx;
        // Interruptor cuadrado
        const a = new THREE.Group();
        const baseA = caja(ctx, 8, 2.5, 9, 0x222428);
        baseA.position.y = 1.25;
        const pivA = new THREE.Group();
        pivA.position.set(0, 2.6, -4.2);
        const tapaA = caja(ctx, 7.6, 1.2, 8.6, 0x34373d);
        tapaA.position.set(0, 0.6, 4.3);
        pivA.add(tapaA);
        a.add(baseA, pivA);
        a.position.set(-26, 0, 0);
        // Tipo piano
        const b = new THREE.Group();
        const baseB = caja(ctx, 11, 3, 24, 0x111114, { roughness: 0.3 });
        baseB.position.set(0, 1.5, 0);
        const pivB = new THREE.Group();
        pivB.position.set(0, 4.5, -4);
        const palanca = caja(ctx, 6.5, 1.2, 17, 0xd4af37, { metalness: 0.3, roughness: 0.25 });
        palanca.position.set(0, 0, 8);
        palanca.rotation.x = 0.0;
        pivB.add(palanca);
        b.add(baseB, pivB);
        b.position.set(26, 0, 0);
        ctx.grupo.add(a, b);
        ctx.pedA = { g: a, piv: pivA };
        ctx.pedB = { g: b, piv: pivB };
        const eA = ctx.etiqueta('Interruptor ✘', { alto: 4.5, color: '#ef4444' });
        eA.position.set(-26, 15, 0);
        const eB = ctx.etiqueta('Tipo piano ✔', { alto: 4.5, color: '#22c55e' });
        eB.position.set(26, 15, 0);
        ctx.grupo.add(eA, eB);
        ctx.et = [eA, eB];
        const medidor = (clave, pos) => ctx.panel(clave, '<div class="medidor" style="width:420px">Señal del pedal<div class="valor">0</div>' +
          '<div class="barra"><div class="relleno"></div></div></div>', pos);
        ctx.mA = medidor('mA', { left: 150, top: 40 });
        ctx.mB = medidor('mB', { right: 150, top: 40 });
      },
      update(ctx, t, dur) {
        ctx.piano.group.visible = false;
        ctx.cam(t, [
          { t: 0, pos: [0, 42, 72], look: [0, 4, 0] },
          { t: dur, pos: [0, 36, 64], look: [0, 5, 0] },
        ]);
        // Pisa poco a poco y suelta: el interruptor solo da 0 o 127, el de piano todo el recorrido
        const u = (t % 3.2) / 3.2;
        const p = u < 0.5 ? ctx.ease(u / 0.5) : 1 - ctx.ease((u - 0.5) / 0.5);
        ctx.pedA.piv.rotation.x = 0.12 * p;
        ctx.pedB.piv.rotation.x = 0.16 * p;
        ctx.pedA.g.position.x = -26 - Math.floor(t / 3.2) * 1.2 - p * 0.4; // y además resbala
        const valA = p > 0.5 ? 127 : 0, valB = Math.round(p * 127);
        for (const [m, v] of [[ctx.mA, valA], [ctx.mB, valB]]) {
          m.style.opacity = ctx.fade(t, 1.0, dur - 0.3);
          m.querySelector('.valor').textContent = v;
          m.querySelector('.relleno').style.width = `${(v / 127) * 100}%`;
        }
        ctx.et[0].material.opacity = ctx.et[1].material.opacity = ctx.seg(t, 0.5, 1.1);
      },
    },

    // ---------------------------------------------------------------- 10
    modelos: {
      enter(ctx) {
        ctx.tabla = ctx.panel('tabla', `
          <table class="modelos">
            <tr><th>Modelo</th><th>Para quién</th><th style="text-align:right">Precio aprox.</th></tr>
            <tr class="grupo"><td colspan="3">Entrada</td></tr>
            <tr data-r="1"><td><b>Roland FP-10</b></td><td>Mejor tacto por el precio</td><td class="precio">370–400 €</td></tr>
            <tr data-r="2"><td><b>Yamaha P-145BT</b></td><td>Básico y fiable</td><td class="precio">370–400 €</td></tr>
            <tr class="grupo"><td colspan="3">Fino / portátil</td></tr>
            <tr data-r="3"><td><b>Casio PX-S1100</b></td><td>Solo 23 cm de fondo</td><td class="precio">≈ 490 €</td></tr>
            <tr class="grupo"><td colspan="3">Gama media (te dura todo el curso)</td></tr>
            <tr data-r="4"><td><b>Yamaha P-225</b></td><td>Sonido CFX</td><td class="precio">≈ 570 €</td></tr>
            <tr data-r="5"><td><b>Kawai ES120</b></td><td>Tacto más pesado</td><td class="precio">≈ 580 €</td></tr>
            <tr data-r="6"><td><b>Roland FP-30X</b></td><td>Más potencia y polifonía</td><td class="precio">630–690 €</td></tr>
          </table>
          <div style="font-size:22px;color:#9fb3d9;margin-top:12px">Precios orientativos Thomann.es · 4 nov 2026 · comprueba antes de comprar</div>`,
          { left: 470, top: 120 });
      },
      update(ctx, t, dur) {
        const ang = -0.6 + t * 0.05;
        ctx.camera.position.set(Math.sin(ang) * 190, 95, Math.cos(ang) * 190);
        ctx.camera.lookAt(0, -10, 0);
        ctx.tabla.style.opacity = ctx.fade(t, 0.5, dur - 0.4);
        const filas = [...ctx.tabla.querySelectorAll('tr[data-r]')];
        // Resalta cada grupo cuando lo nombra la voz (aprox. por proporción del texto)
        const marcas = [[0.05, 0.3, [1, 2]], [0.3, 0.48, [3]], [0.48, 0.85, [4, 5, 6]]];
        filas.forEach((f) => {
          const r = +f.dataset.r;
          const activa = marcas.some(([a, b, rs]) => rs.includes(r) && t >= a * dur && t < b * dur);
          f.style.background = activa ? 'rgba(245,184,65,.14)' : 'transparent';
        });
      },
    },

    // ---------------------------------------------------------------- 11
    accesorios: {
      enter(ctx) {
        const { THREE } = ctx;
        const metal = 0x5b6270;
        const losa = () => caja(ctx, 64, 7, 16, 0x1b1c21);
        // Soporte en X
        const x = new THREE.Group();
        for (const s of [-1, 1]) {
          const barra = caja(ctx, 3, 86, 3, metal, { metalness: 0.3 });
          barra.rotation.z = s * 0.62;
          barra.position.set(0, 36, 0);
          x.add(barra);
        }
        const lx = losa();
        lx.position.y = 74;
        x.add(lx);
        x.position.set(-100, 0, 0);
        // Soporte en Z (dos laterales en Z + travesaño)
        const z = new THREE.Group();
        for (const s of [-1, 1]) {
          const arriba = caja(ctx, 3, 3, 18, metal, { metalness: 0.3 });
          arriba.position.set(s * 28, 69, 0);
          const diagonal = caja(ctx, 3, 72, 3, metal, { metalness: 0.3 });
          diagonal.position.set(s * 28, 35, 0);
          diagonal.rotation.x = 0.26;
          const abajo = caja(ctx, 3, 3, 28, metal, { metalness: 0.3 });
          abajo.position.set(s * 28, 1.5, 0);
          z.add(arriba, diagonal, abajo);
        }
        const trav = caja(ctx, 56, 3, 3, metal, { metalness: 0.3 });
        trav.position.set(0, 20, 3);
        const lz = losa();
        lz.position.y = 74;
        z.add(trav, lz);
        z.position.set(-15, 0, 0);
        ctx.grupo.add(x, z);
        ctx.sx = x;
        const eX = ctx.etiqueta('En X: se balancea ✘', { alto: 6, color: '#ef4444' });
        eX.position.set(-100, 92, 0);
        const eZ = ctx.etiqueta('En Z: estable ✔', { alto: 6, color: '#22c55e' });
        eZ.position.set(-15, 92, 0);
        ctx.grupo.add(eX, eZ);
        ctx.et = [eX, eZ];
      },
      update(ctx, t, dur) {
        ctx.piano.group.visible = false;
        ctx.cam(t, [
          { t: 0, pos: [-25, 95, 250], look: [-5, 45, 0] },
          { t: dur, pos: [5, 85, 245], look: [5, 42, 0] },
        ]);
        ctx.sx.rotation.z = Math.sin(t * 7) * 0.018 * ctx.seg(t, 1, 2);
        ctx.et[0].material.opacity = ctx.et[1].material.opacity = ctx.seg(t, 0.6, 1.2);
        ctx.tarjetas('acc', t, [
          { t: dur * 0.35, html: '🪑 <b>Banqueta regulable</b><small>40–80 €</small>' },
          { t: dur * 0.48, html: '🎧 <b>Auriculares cerrados</b><small>50–100 €</small>' },
          { t: dur * 0.6, html: '🔌 <b>Cable USB-B</b><small>(o USB-C a USB-B) · 5–10 €</small>' },
          { t: dur * 0.75, html: '📖 <b>Atril</b><small>viene con el piano</small>', clase: 'bien' },
        ], { right: 70, top: 150 });
      },
    },

    // ---------------------------------------------------------------- 12
    cierre: {
      enter(ctx) {
        ctx.cmd = ctx.panel('cmd', '<div style="text-align:center"><div style="font-size:30px;color:#9fb3d9;margin-bottom:16px">Tu siguiente paso</div>' +
          '<div class="comando">.\\piano.ps1 lab 1</div>' +
          '<div style="font-size:28px;color:#9fb3d9;margin-top:18px">Quiz de elección · Detector de piano por USB-MIDI</div></div>',
          { left: 0, right: 0, top: 170 });
      },
      update(ctx, t, dur) {
        ctx.cam(t, [
          { t: 0, pos: [-60, 60, 130], look: [0, 3, 0] },
          { t: dur, pos: [0, 70, 120], look: [0, 3, 0] },
        ]);
        ctx.cmd.style.opacity = ctx.fade(t, 0.5, dur - 3.0);
        ctx.titulo('<div class="num">SIGUIENTE</div><h1>Lección 2</h1><p>Montaje, postura y conexión</p>',
          ctx.fade(t, dur - 2.8, dur + 1));
      },
    },
  },
};
