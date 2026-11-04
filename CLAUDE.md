# PROMPT PARA CLAUDE CODE — "Piano Zero to Hero"

## Notas de implementación (mantener al día)
- Entorno Python 3.12 en `%USERPROFILE%\.venvs\piano` (fuera de OneDrive). Lo crea `setup.ps1` con uv.
- Los `.ps1` deben guardarse en **UTF-8 con BOM** (PowerShell 5.1 rompe los acentos si no).
- Vídeos: `tools/render_video.py` + motor `tools/video/engine.js` (frame = función de t). Cada lección
  aporta `video/guion.json` (texto + notas) y `video/escenas.js` (escenas por id). Revisar con
  `--frames t1,t2` antes del render completo; `video/build/` está en .gitignore.
- Nombres de notas: Do4 = MIDI 60 (`tools/notes.py`).
- Progreso: `tools/progress.registrar()` → `progress/log.csv` (ignorado en git).
- Pendiente: evaluador de ejercicios por MIDI (notas %, ms, velocidad, mano) + metrónomo, a partir de
  la lección 2–4; partituras MusicXML; audio FluidSynth + Salamander en lugar de la síntesis aditiva.
- Lab final: incluir *Runaway* (Kanye West) evaluada desde un MusicXML/MIDI **aportado por César**
  (no meter la partitura en el repo por copyright). Va en `assets/partituras/privado/` (gitignored).
  Arreglo: Alex Patience (Westworld), Mi mayor, ♩=160; metas parciales en curriculum.md.
- Usuario: tiene poco espacio en casa → solo pianos digitales portátiles; mesa o soporte en Z plegable.

> Copia todo este archivo como primer mensaje en Claude Code (o guárdalo como `CLAUDE.md` en la raíz del repo).

---

## 1. Contexto

Soy César, adulto, **cero total en música y piano**. Quiero aprender como hobby, poco a poco (20–30 min/día, 5 días/semana), hasta un **nivel competente**: leer partituras con soltura, tocar con las dos manos piezas de nivel intermedio (equivalente a grado 4–5 ABRSM / final de grado elemental de conservatorio) y acompañar canciones con acordes. Horizonte realista: 2–3 años.

**Importante sobre mí como usuario:**
- No sé leer ni escribir código. Tú (Claude Code) construyes y ejecutas todo. Yo solo debo copiar/pegar comandos simples y probar.
- Mi PC es **Windows**. Dame los comandos para PowerShell.
- Hablo español; inglés C1 (puedo usar material en inglés).
- Tendré un **piano digital con USB-MIDI** conectado al PC → úsalo para que los laboratorios me evalúen automáticamente.

## 2. Objetivo del repo

Crear un repo de GitHub `piano-zero-to-hero` que sea un curso completo con:
1. **Lecciones** en Markdown, claras y cortas (teoría mínima + práctica).
2. **Vídeos explicativos 3D** generados por código para cada lección.
3. **Laboratorios** prácticos con evaluación automática vía MIDI.
4. **Seguimiento de progreso** (log de práctica + métricas).

## 3. Vídeos 3D (cómo generarlos)

- Pipeline: **Three.js** (escena 3D de un teclado de 88 teclas, cámara animada, teclas que se iluminan/hunden, manos esquemáticas o marcadores de dedos 1–5 con colores) → render frame a frame con **Playwright (Chromium headless)** → montaje con **ffmpeg** (H.264, `-preset veryfast`, 1080p, 30 fps).
- Narración: texto en pantalla (subtítulos) + opcionalmente voz TTS en español (edge-tts o similar, gratis). Audio del piano: sintetizado desde MIDI (FluidSynth + un soundfont de piano libre, p. ej. Salamander).
- Cada vídeo: 1–4 min, un solo concepto. Estilo: fondo oscuro, teclado realista, partitura sincronizada en la parte superior cuando aplique.
- Para conceptos de pentagrama/teoría, puedes usar **Manim** si queda mejor que Three.js.
- Todo reproducible con un solo comando: `python tools/render_video.py lessons/01-xx`.
- Sé honesto conmigo: si algo (p. ej. animar manos realistas) queda mal, usa una representación esquemática y avísame. Donde un vídeo real sea mejor (postura, relajación de muñeca), enlaza 1–2 vídeos de YouTube de referencia en vez de forzarlo.

## 4. Laboratorios

Cada lección tiene `lab/` con:
- `ejercicio.mid` (lo que debo tocar) + partitura (MusicXML → PDF/PNG con MuseScore o LilyPond).
- `python lab/run.py`: muestra el ejercicio, pone metrónomo, **escucha mi piano por MIDI** (librería `mido` + `python-rtmidi`), y me da nota: notas correctas (%), precisión rítmica (ms de desviación), dinámica/velocidad, mano. Resultado en consola con colores + se guarda en `progress/log.csv`.
- Criterio de superación (p. ej. ≥90 % notas, desviación media <80 ms, a X bpm) antes de pasar a la siguiente.
- Modo "sin piano" para labs teóricos (quiz de lectura de notas, intervalos, reconocimiento auditivo).

## 5. Estructura del repo

```
piano-zero-to-hero/
├── README.md              # cómo empezar, setup en Windows paso a paso
├── CLAUDE.md              # este prompt
├── curriculum.md          # mapa completo de niveles y lecciones
├── lessons/
│   └── 01-elegir-piano/
│       ├── leccion.md
│       ├── video/ (fuente Three.js + mp4 final)
│       └── lab/
├── tools/                 # render de vídeos, motor MIDI, evaluador, metrónomo
├── assets/                # soundfont, partituras, modelos 3D
├── progress/              # log.csv + dashboard (Streamlit) de mi progreso
└── requirements.txt
```

## 6. Currículo (from zero to hero)

**Nivel 0 — Setup (semana 1–2)**
1. Elegir piano y material ← **PRIMERA LECCIÓN**
2. Montaje: altura de banqueta, postura, posición de mano, conectar USB-MIDI al PC y probar el lab
3. Geografía del teclado: grupos de 2 y 3 teclas negras, nombres de notas, octavas, Do central

**Nivel 1 — Fundamentos (meses 1–3)**
4. Digitación 1–5 y posición de Do
5. Pulso y ritmo: redonda, blanca, negra; metrónomo
6. Clave de sol (mano derecha)
7. Clave de fa (mano izquierda)
8. Manos juntas: primeras melodías con acompañamiento simple
9. Silencios, ligaduras, compases 2/4, 3/4, 4/4
10. Posición de Sol y cambios de posición
11. Dinámica básica (p, f) y legato/staccato

**Nivel 2 — Bases sólidas (meses 3–6)**
12. Corcheas y puntillo
13. Sostenidos, bemoles, tonos y semitonos
14. Escalas mayores (Do, Sol, Re, Fa) con paso del pulgar
15. Tríadas mayores/menores e inversiones
16. Pedal de sustain (pedal sincopado)
17. Lectura a primera vista (rutina diaria)
18. Primeras piezas reales (nivel Faber 1 / Anna Magdalena)

**Nivel 3 — Intermedio inicial (meses 6–12)**
19. Tonalidades menores y escalas menores
20. Progresiones I–IV–V–vi y leer cifrado americano (acordes de canciones)
21. Patrones de acompañamiento (bajo Alberti, arpegiado, pop)
22. Arpegios
23. Fraseo y articulación
24. Repertorio: Burgmüller Op.100, minuetos de Bach, piezas pop arregladas

**Nivel 4 — Competente (año 2–3)**
25. Técnica: escalas en todas las tonalidades, ejercicios seleccionados (no Hanon a lo bruto)
26. Polifonía e independencia de manos
27. Improvisación básica sobre progresiones
28. Ritmos compuestos (6/8), tresillos, síncopas
29. Repertorio objetivo: sonatinas de Clementi, Preludio en Mi menor de Chopin, Gymnopédie n.º 1 de Satie, Einaudi, arreglos de bandas sonoras
30. Proyecto final: grabar 3 piezas (MIDI + audio) y evaluación global

Para cada lección: objetivos, vídeo, teoría (máx. 1 página), práctica guiada, lab con criterio de superación, y tiempo estimado.

## 7. Lección 1 — Elegir piano (contenido requerido)

Explica, con vídeo 3D comparativo (acción de teclas, tamaño, conexiones):
- **Por qué digital y no acústico** para empezar (precio, volumen/auriculares, MIDI para los labs).
- **Requisitos no negociables**: 88 teclas, teclas contrapesadas con acción de martillo graduada, sensibilidad a la velocidad, polifonía ≥64, **USB-MIDI** (imprescindible para el curso), salida de auriculares.
- **Qué evitar**: teclados de 61 teclas sin peso, teclas "semi-weighted", pedal de interruptor cuadrado como único pedal.
- **Comparativa de modelos actuales** (busca precios actualizados en España antes de escribirla): Yamaha P-145BT, Roland FP-10 (gama ~500 €); Roland FP-30X, Kawai ES120, Yamaha P-225 (gama ~700 €); Casio PX-S1100 como opción fina/portátil. Incluye tabla: acción, sonido, altavoces, Bluetooth MIDI/audio, peso, precio.
- **Accesorios**: soporte estable (mejor en Z o mueble que en X), banqueta regulable en altura, pedal tipo piano (no el cuadrado que viene en la caja), auriculares cerrados, cable USB-B, atril.
- **Método/libro complementario**: Faber *Adult Piano Adventures All-in-One Book 1* o Alfred's *Adult All-in-One*.
- Checklist final de compra + lab: "Quiz de elección" (5 preguntas) y script que **detecta el piano por MIDI** cuando llegue.

## 8. Reglas de trabajo

- Empieza por: README + `curriculum.md` + estructura + **Lección 1 completa (con vídeo y lab)**. Para y espera mi feedback antes de seguir.
- Después, una lección por sesión. Haz commits claros y push a GitHub.
- Todo instalable en Windows con un `setup.ps1`.
- Explícame cada cosa como a alguien que no programa: qué comando ejecutar, qué debería ver y qué hacer si falla.
- Recomiéndame, cada 1–2 meses, una clase puntual con profesor real para corregir postura y tensión (eso no lo puede evaluar el MIDI).
