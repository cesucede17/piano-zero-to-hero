"""Genera el vídeo de una lección:  python tools/render_video.py lessons/01-elegir-piano

Pasos:
  1. Lee video/guion.json (texto de cada escena y notas que suenan).
  2. Voz en español con edge-tts (se guarda en caché en video/build/tts).
  3. Calcula la línea de tiempo y los subtítulos, sintetiza el piano y mezcla el audio.
  4. Abre la escena Three.js en Chromium sin ventana (Playwright) y captura cada frame.
  5. Monta el MP4 con ffmpeg (H.264, 1080p, 30 fps).

Opciones:
  --borrador       15 fps y 960x540: para revisar rápido
  --solo-audio     solo pasos 1-3 (para la vista previa en el navegador)
  --frames 5,42.3  guarda PNG de esos segundos en video/build/ en vez de hacer el vídeo
  --sin-voz        sin narración (solo subtítulos y piano)
"""

import argparse
import asyncio
import functools
import hashlib
import http.server
import json
import re
import subprocess
import sys
import threading
import wave
from pathlib import Path

import imageio_ffmpeg
import numpy as np
from rich.console import Console
from rich.progress import BarColumn, Progress, TextColumn, TimeRemainingColumn

REPO = Path(__file__).resolve().parents[1]
SR = 44100
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
consola = Console()


# ---------------------------------------------------------------- voz

async def _tts(texto: str, voz: str, ritmo: str) -> tuple[bytes, list]:
    import edge_tts

    try:
        com = edge_tts.Communicate(texto, voz, rate=ritmo, boundary="SentenceBoundary")
    except TypeError:  # versiones antiguas de edge-tts
        com = edge_tts.Communicate(texto, voz, rate=ritmo)
    audio, frases = bytearray(), []
    async for trozo in com.stream():
        if trozo["type"] == "audio":
            audio += trozo["data"]
        elif trozo["type"] in ("SentenceBoundary", "WordBoundary"):
            frases.append((trozo["type"], trozo["offset"] / 1e7, trozo["duration"] / 1e7, trozo["text"]))
    return bytes(audio), frases


def voz(texto: str, voz_id: str, ritmo: str, cache: Path) -> tuple[np.ndarray, list]:
    """Devuelve (muestras float32 mono, [(inicio, duración, texto)]) usando caché."""
    h = hashlib.sha1(f"{voz_id}|{ritmo}|{texto}".encode()).hexdigest()[:12]
    mp3, meta = cache / f"{h}.mp3", cache / f"{h}.json"
    if not mp3.exists():
        cache.mkdir(parents=True, exist_ok=True)
        audio, frases = asyncio.run(_tts(texto, voz_id, ritmo))
        mp3.write_bytes(audio)
        meta.write_text(json.dumps(frases, ensure_ascii=False), encoding="utf-8")
    frases = json.loads(meta.read_text(encoding="utf-8"))
    pcm = subprocess.run([FFMPEG, "-v", "error", "-i", str(mp3), "-f", "s16le", "-ac", "1", "-ar", str(SR), "-"],
                         capture_output=True, check=True).stdout
    muestras = np.frombuffer(pcm, dtype=np.int16).astype(np.float32) / 32768
    # Si llegan palabras sueltas en vez de frases, las agrupa en frases por la puntuación
    if frases and frases[0][0] == "WordBoundary":
        frases = _agrupar_palabras(frases, texto)
    else:
        frases = [(a, d, txt) for _, a, d, txt in frases]
    if not frases:
        frases = [(0.0, len(muestras) / SR, texto)]
    return muestras, frases


def _agrupar_palabras(palabras, texto):
    frases_txt = [f for f in re.split(r"(?<=[.!?¿:])\s+", texto) if f]
    res, i = [], 0
    for f in frases_txt:
        n = len(re.findall(r"\w+", f))
        grupo = palabras[i:i + max(n, 1)]
        i += max(n, 1)
        if grupo:
            a = grupo[0][1]
            res.append((a, grupo[-1][1] + grupo[-1][2] - a, f))
    return res


def trocear(inicio: float, dur: float, texto: str, maximo: int = 52) -> list[dict]:
    """Parte una frase larga en subtítulos de ≤ maximo caracteres, repartiendo el tiempo."""
    trozos, actual = [], ""
    for palabra in texto.split():
        prueba = (actual + " " + palabra).strip()
        if len(prueba) > maximo and actual:
            trozos.append(actual)
            actual = palabra
        else:
            actual = prueba
        if actual.endswith((",", ";")) and len(actual) > maximo * 0.55:
            trozos.append(actual)
            actual = ""
    if actual:
        trozos.append(actual)
    total = sum(len(t) for t in trozos)
    subs, t = [], inicio
    for tr in trozos:
        d = dur * len(tr) / total
        subs.append({"a": round(t, 3), "b": round(t + d, 3), "texto": tr})
        t += d
    return subs


# ---------------------------------------------------------------- piano sintetizado

def nota_piano(midi: int, vel: int, dur: float) -> np.ndarray:
    """Piano sencillo por síntesis aditiva (armónicos con caída). No es un sample real."""
    f = 440 * 2 ** ((midi - 69) / 12)
    largo = dur + 0.6
    t = np.arange(int(largo * SR)) / SR
    tau = float(np.clip(3.2 * (261.6 / f) ** 0.6, 0.35, 7))
    brillo = vel / 127
    s = np.zeros_like(t)
    for k in range(1, 13):
        fk = f * k * np.sqrt(1 + 0.0004 * k * k)
        if fk > SR / 2.2:
            break
        amp = (1 / k) ** 1.15 * brillo ** (0.35 * (k - 1))
        s += amp * np.sin(2 * np.pi * fk * t) * np.exp(-t * (1 + 0.45 * k) / tau)
    env = np.minimum(t / 0.004, 1)
    env *= np.where(t > dur, np.exp(-(t - dur) / 0.12), 1)
    return (s * env * brillo ** 1.6 * 0.25).astype(np.float32)


# ---------------------------------------------------------------- línea de tiempo y audio

def preparar(leccion: Path, sin_voz: bool = False) -> dict:
    vdir = leccion / "video"
    guion = json.loads((vdir / "guion.json").read_text(encoding="utf-8"))
    build = vdir / "build"
    build.mkdir(exist_ok=True)

    escenas, subs, notas, pistas = [], [], [], []
    t = 0.0
    with consola.status("Generando la voz…"):
        for e in guion["escenas"]:
            entrada, pausa = e.get("entrada", 0.6), e.get("pausa", 1.0)
            if sin_voz:
                muestras = np.zeros(int(len(e["texto"]) * 0.065 * SR), dtype=np.float32)
                frases = [(0.0, len(muestras) / SR, e["texto"])]
            else:
                muestras, frases = voz(e["texto"], guion["voz"], guion.get("ritmo", "+0%"), build / "tts")
            largo_voz = len(muestras) / SR
            dur = max(e.get("min", 0), entrada + largo_voz + pausa)
            pistas.append((t + entrada, muestras))
            for a, d, txt in frases:
                subs += trocear(t + entrada + a, d, txt)
            base = t + (entrada + largo_voz if e.get("notas_desde") == "fin_voz" else 0)
            for nt, midi, vel, nd in e.get("notas", []):
                notas.append({"t": round(base + nt, 3), "midi": midi, "vel": vel, "dur": nd})
            escenas.append({"id": e["id"], "inicio": round(t, 3), "dur": round(dur, 3)})
            t += dur

    duracion = t
    mezcla = np.zeros(int((duracion + 1) * SR), dtype=np.float32)
    piano = np.zeros_like(mezcla)
    for inicio, m in pistas:
        i = int(inicio * SR)
        mezcla[i:i + len(m)] += m[:len(mezcla) - i]
    for n in notas:
        s = nota_piano(n["midi"], n["vel"], n["dur"])
        i = int(n["t"] * SR)
        piano[i:i + len(s)] += s[:len(piano) - i]
    pico = np.abs(piano).max() or 1
    mezcla += piano * min(1.0, 0.55 / pico)
    mezcla = np.tanh(mezcla * 1.1) * 0.92
    with wave.open(str(build / "audio.wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((mezcla * 32767).astype(np.int16).tobytes())

    timeline = {"titulo": guion["titulo"], "duracion": round(duracion, 3), "escenas": escenas,
                "subs": subs, "notas": notas}
    (build / "timeline.json").write_text(json.dumps(timeline, ensure_ascii=False, indent=1), encoding="utf-8")
    consola.print(f"[green]✔[/] Audio y línea de tiempo: {duracion:.0f} s, {len(escenas)} escenas, {len(notas)} notas")
    return timeline


# ---------------------------------------------------------------- servidor local + captura

class _Silencioso(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map,
                      ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json",
                      ".wav": "audio/wav", ".css": "text/css"}

    def log_message(self, *args):
        pass


def servidor() -> tuple[http.server.ThreadingHTTPServer, int]:
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(_Silencioso, directory=str(REPO)))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, srv.server_address[1]


def abrir_pagina(pw, puerto: int, leccion: Path, timeline: dict):
    navegador = pw.chromium.launch(args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader",
                                         "--ignore-gpu-blocklist"])
    pagina = navegador.new_page(viewport={"width": 1920, "height": 1080})
    errores = []
    pagina.on("pageerror", lambda e: errores.append(str(e)))
    pagina.on("console", lambda m: m.type == "error" and errores.append(m.text))
    rel = leccion.relative_to(REPO).as_posix()
    pagina.goto(f"http://127.0.0.1:{puerto}/tools/video/index.html?leccion={rel}&render=1")
    try:
        pagina.wait_for_function("window.__listo === true", timeout=30000)
    except Exception:
        raise SystemExit("La escena no ha cargado:\n" + "\n".join(errores))
    pagina.evaluate("tl => window.__setTimeline(tl)", timeline)
    return navegador, pagina, errores


def capturar(leccion: Path, timeline: dict, fps: int, salida: Path, ancho: int) -> None:
    from playwright.sync_api import sync_playwright

    audio = leccion / "video" / "build" / "audio.wav"
    total = int(timeline["duracion"] * fps)
    cmd = [FFMPEG, "-y", "-v", "error", "-f", "image2pipe", "-framerate", str(fps), "-c:v", "mjpeg", "-i", "-",
           "-i", str(audio), "-vf", f"scale={ancho}:-2", "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
           "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-shortest", "-movflags", "+faststart", str(salida)]
    srv, puerto = servidor()
    ff = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    try:
        with sync_playwright() as pw:
            navegador, pagina, errores = abrir_pagina(pw, puerto, leccion, timeline)
            with Progress(TextColumn("Grabando frames"), BarColumn(), TextColumn("{task.completed}/{task.total}"),
                          TimeRemainingColumn(), console=consola) as prog:
                tarea = prog.add_task("", total=total)
                for i in range(total):
                    pagina.evaluate(f"window.__renderAt({i / fps})")
                    ff.stdin.write(pagina.screenshot(type="jpeg", quality=92))
                    prog.advance(tarea)
                    if errores:
                        raise SystemExit("Error en la escena:\n" + "\n".join(errores))
            navegador.close()
    finally:
        ff.stdin.close()
        ff.wait()
        srv.shutdown()
    if ff.returncode != 0:
        raise SystemExit("ffmpeg ha fallado al montar el vídeo")


def frames_sueltos(leccion: Path, timeline: dict, tiempos: list[float]) -> None:
    from playwright.sync_api import sync_playwright

    srv, puerto = servidor()
    try:
        with sync_playwright() as pw:
            navegador, pagina, errores = abrir_pagina(pw, puerto, leccion, timeline)
            for t in tiempos:
                pagina.evaluate(f"window.__renderAt({t})")
                ruta = leccion / "video" / "build" / f"frame_{t:06.1f}.png"
                pagina.screenshot(path=str(ruta))
                consola.print(f"[green]✔[/] {ruta}")
            if errores:
                consola.print("[red]Errores en la escena:[/]\n" + "\n".join(errores))
            navegador.close()
    finally:
        srv.shutdown()


def main() -> None:
    ap = argparse.ArgumentParser(description="Genera el vídeo de una lección")
    ap.add_argument("leccion", help="carpeta de la lección, p. ej. lessons/01-elegir-piano")
    ap.add_argument("--borrador", action="store_true")
    ap.add_argument("--solo-audio", action="store_true")
    ap.add_argument("--frames")
    ap.add_argument("--sin-voz", action="store_true")
    args = ap.parse_args()

    leccion = Path(args.leccion).resolve()
    if not (leccion / "video" / "guion.json").exists():
        sys.exit(f"No encuentro {leccion / 'video' / 'guion.json'}")

    timeline = preparar(leccion, sin_voz=args.sin_voz)
    if args.solo_audio:
        return
    if args.frames:
        frames_sueltos(leccion, timeline, [float(x) for x in args.frames.split(",")])
        return

    num = leccion.name.split("-")[0]
    salida = leccion / "video" / (f"leccion{num}_borrador.mp4" if args.borrador else f"leccion{num}.mp4")
    fps, ancho = (15, 960) if args.borrador else (30, 1920)
    capturar(leccion, timeline, fps, salida, ancho)
    mb = salida.stat().st_size / 1e6
    consola.print(f"[bold green]✔ Vídeo listo:[/] {salida}  ({timeline['duracion']:.0f} s, {mb:.1f} MB)")


if __name__ == "__main__":
    main()
