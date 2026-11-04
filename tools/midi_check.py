"""Detector de piano: comprueba por USB-MIDI que tu piano cumple los requisitos del curso.

    python -m tools.midi_check          (con el piano conectado)
    python -m tools.midi_check --demo   (sin piano: simula uno para ver cómo funciona)

Pruebas: conexión, 88 teclas (La0 a Do8), sensibilidad a la velocidad y pedal (y si es continuo).
"""

import sys
import time

import mido
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from tools import midi_io
from tools.notes import NOTA_MAS_AGUDA_88, NOTA_MAS_GRAVE_88, nombre

try:
    import msvcrt  # Windows: permite saltar una prueba pulsando Enter
except ImportError:
    msvcrt = None

consola = Console()
ESPERA = 30  # segundos máximos por prueba


def _enter_pulsado() -> bool:
    if msvcrt and msvcrt.kbhit():
        return msvcrt.getwch() in "\r\n"
    return False


def _esperar(puerto, condicion, segundos=ESPERA):
    """Lee mensajes hasta que `condicion(msg)` devuelva algo distinto de None, o se acabe el tiempo."""
    fin = time.monotonic() + segundos
    while time.monotonic() < fin:
        msg = puerto.poll()
        if msg is not None:
            r = condicion(msg)
            if r is not None:
                return r
        elif _enter_pulsado():
            return None
        else:
            time.sleep(0.002)
    return None


def _barra(vel: int) -> str:
    n = round(vel / 127 * 30)
    color = "green" if vel < 50 else "yellow" if vel < 95 else "red"
    return f"[{color}]{'█' * n}[/]{'░' * (30 - n)} {vel}"


def _paso(titulo: str, instruccion: str) -> None:
    consola.print(f"\n[bold cyan]{titulo}[/]  {instruccion}  [dim](Enter para saltar, máx. {ESPERA} s)[/]")


def comprobar(demo: bool = False) -> dict | None:
    consola.print(Panel.fit("[bold]Detector de piano por USB-MIDI[/]", border_style="cyan"))

    if demo:
        nombre_puerto = midi_io.PuertoDemo.name
    else:
        nombres = midi_io.listar_entradas()
        nombre_puerto = midi_io.elegir_puerto(nombres)
        if nombre_puerto is None:
            consola.print(Panel(
                "[bold red]No veo ningún piano conectado.[/]\n\n"
                "1. Enciende el piano [bold]antes[/] de abrir este programa.\n"
                "2. Usa el cable [bold]USB-B[/] (el puerto cuadrado de detrás del piano, rotulado "
                "USB TO HOST o COMPUTER), no el USB pequeño para pendrives.\n"
                "3. Prueba otro puerto USB del PC, sin hub.\n"
                "4. Cierra otros programas de música: en Windows solo uno a la vez puede usar el piano.\n"
                "5. Si sigue sin salir, instala el driver de la marca (Yamaha Steinberg USB Driver, "
                "Roland o Kawai USB MIDI driver).\n\n"
                "Para ver cómo funciona sin piano:  [bold].\\piano.ps1 midi --demo[/]",
                title="Sin conexión", border_style="red"))
            return None
        if len(nombres) > 1:
            consola.print(f"[dim]Puertos MIDI encontrados: {', '.join(nombres)}[/]")

    puerto = midi_io.abrir_entrada(nombre_puerto, demo=demo)
    consola.print(f"[green]✔ Conectado a:[/] [bold]{nombre_puerto}[/]")
    resultado = {"puerto": nombre_puerto}

    try:
        # 1. Cualquier tecla
        _paso("Prueba 1/4", "Toca [bold]cualquier tecla[/].")
        if demo:
            puerto.programar(midi_io.tecla(60, 80, 1.0))
        msg = _esperar(puerto, lambda m: m if midi_io.es_pulsacion(m) else None)
        resultado["tecla"] = msg is not None
        if msg:
            consola.print(f"  Has tocado [bold]{nombre(msg.note)}[/] (MIDI {msg.note})  {_barra(msg.velocity)}")
        else:
            consola.print("  [red]No ha llegado ninguna nota.[/]")

        # 2. Extremos del teclado
        _paso("Prueba 2/4", "Toca la tecla [bold]más grave[/] (la primera de la izquierda).")
        if demo:
            puerto.programar(midi_io.tecla(NOTA_MAS_GRAVE_88, 70, 1.0))
        grave = _esperar(puerto, lambda m: m.note if midi_io.es_pulsacion(m) else None)
        _paso("        ", "Ahora la [bold]más aguda[/] (la última de la derecha).")
        if demo:
            puerto.programar(midi_io.tecla(NOTA_MAS_AGUDA_88, 70, 1.0))
        aguda = _esperar(puerto, lambda m: m.note if midi_io.es_pulsacion(m) else None)
        if grave is not None and aguda is not None:
            teclas = aguda - grave + 1
            consola.print(f"  De {nombre(grave)} a {nombre(aguda)} → [bold]{teclas} teclas[/]")
            resultado["teclas"] = teclas
        else:
            resultado["teclas"] = None

        # 3. Sensibilidad a la velocidad
        velocidades = {}
        for modo, demo_vel in (("suave", 28), ("fuerte", 112)):
            _paso("Prueba 3/4", f"Toca una tecla [bold]3 veces muy {modo}[/].")
            if demo:
                puerto.programar([m for i in range(3) for m in midi_io.tecla(64, demo_vel + i * 4, 0.8 + i * 0.6)])
            vs = []
            for _ in range(3):
                v = _esperar(puerto, lambda m: m.velocity if midi_io.es_pulsacion(m) else None)
                if v is None:
                    break
                vs.append(v)
                consola.print(f"  {_barra(v)}")
            velocidades[modo] = sum(vs) / len(vs) if vs else None
        if velocidades["suave"] is not None and velocidades["fuerte"] is not None:
            resultado["rango_velocidad"] = round(velocidades["fuerte"] - velocidades["suave"])
        else:
            resultado["rango_velocidad"] = None

        # 4. Pedal de sustain (control 64)
        _paso("Prueba 4/4", "Pisa [bold]despacio[/] el pedal hasta el fondo y suéltalo.")
        if demo:
            puerto.programar([(0.8 + i * 0.05, mido.Message("control_change", control=64, value=v))
                              for i, v in enumerate([0, 20, 45, 70, 98, 127, 127, 80, 30, 0])])
        valores = []

        def pedal(m):
            if m.type == "control_change" and m.control == 64:
                valores.append(m.value)
                if m.value == 0 and max(valores) > 0:
                    return True
            return None

        _esperar(puerto, pedal)
        intermedios = {v for v in valores if 0 < v < 127}
        resultado["pedal"] = bool(valores)
        resultado["pedal_continuo"] = len(intermedios) >= 3
        if valores:
            tipo = "continuo (permite medio pedal)" if resultado["pedal_continuo"] else "de interruptor (on/off)"
            consola.print(f"  Pedal detectado: [bold]{tipo}[/]")
        else:
            consola.print("  [yellow]No ha llegado señal de pedal.[/]")
    finally:
        puerto.close()

    _resumen(resultado)
    return resultado


def _resumen(r: dict) -> None:
    def fila(nombre_prueba, ok, texto):
        icono = "[green]✔[/]" if ok is True else "[yellow]?[/]" if ok is None else "[red]✘[/]"
        tabla.add_row(icono, nombre_prueba, texto)

    tabla = Table(title="Resultado", show_lines=False)
    tabla.add_column("")
    tabla.add_column("Requisito")
    tabla.add_column("Detalle")
    fila("Conexión USB-MIDI", r["tecla"], r["puerto"] if r["tecla"] else "no llegan notas")
    t = r["teclas"]
    fila("88 teclas", None if t is None else t == 88,
         "sin medir" if t is None else f"{t} teclas" + ("" if t == 88 else " — ¿tocaste las de los extremos?"))
    rv = r["rango_velocidad"]
    fila("Sensible a la velocidad", None if rv is None else rv >= 30,
         "sin medir" if rv is None else f"diferencia suave/fuerte: {rv}")
    fila("Pedal de sustain", r["pedal"] or None,
         ("continuo ✨" if r["pedal_continuo"] else "on/off: sirve, pero mejor uno tipo piano")
         if r["pedal"] else "sin señal: ¿está enchufado en DAMPER/SUSTAIN?")
    consola.print()
    consola.print(tabla)
    if aprobado(r):
        consola.print("[bold green]Tu piano está listo para los laboratorios del curso.[/]")


def aprobado(r: dict | None) -> bool:
    return bool(r and r["tecla"] and r["teclas"] == 88 and (r["rango_velocidad"] or 0) >= 30 and r["pedal"])


if __name__ == "__main__":
    from tools.progress import registrar

    res = comprobar(demo="--demo" in sys.argv)
    if res and "--demo" not in sys.argv:
        registrar("lab", "00", "detector-midi", superado=aprobado(res),
                  detalles=f"{res['puerto']} | teclas={res['teclas']} | vel={res['rango_velocidad']} | "
                           f"pedal={'continuo' if res['pedal_continuo'] else res['pedal']}")
