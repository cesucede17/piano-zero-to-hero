"""Conexión con el piano digital por USB-MIDI (mido + python-rtmidi).

`abrir_entrada()` devuelve un puerto con `.poll()` (mensaje o None) y `.close()`.
Con `demo=True` devuelve un puerto simulado que "toca solo", para probar los labs sin piano.
"""

import time

import mido

# Palabras que suelen aparecer en el nombre del puerto USB de un piano digital
MARCAS = ["roland", "yamaha", "kawai", "casio", "digital piano", "fp-", "p-1", "p-2", "es1", "px-", "korg", "nord"]


def listar_entradas() -> list[str]:
    try:
        return mido.get_input_names()
    except Exception:
        return []


def elegir_puerto(nombres: list[str]) -> str | None:
    if not nombres:
        return None
    for n in nombres:
        if any(m in n.lower() for m in MARCAS):
            return n
    # Windows siempre añade puertos virtuales que no son un piano
    reales = [n for n in nombres if "microsoft" not in n.lower() and "wavetable" not in n.lower()]
    return (reales or nombres)[0]


def abrir_entrada(nombre: str | None = None, demo: bool = False):
    if demo:
        return PuertoDemo()
    return mido.open_input(nombre)


class PuertoDemo:
    """Puerto falso: va soltando mensajes MIDI cuando se le piden, como si alguien tocara."""

    name = "Piano de demostración (simulado)"

    def __init__(self):
        self._cola: list[tuple[float, mido.Message]] = []
        self._inicio = time.monotonic()

    def programar(self, mensajes: list[tuple[float, mido.Message]]) -> None:
        """Encola mensajes a `t` segundos desde ahora."""
        ahora = time.monotonic() - self._inicio
        self._cola = sorted(self._cola + [(ahora + t, m) for t, m in mensajes], key=lambda x: x[0])

    def poll(self):
        if self._cola and self._cola[0][0] <= time.monotonic() - self._inicio:
            return self._cola.pop(0)[1]
        return None

    def close(self) -> None:
        pass


def tecla(midi: int, vel: int, t: float, dur: float = 0.3) -> list[tuple[float, mido.Message]]:
    """Ayuda para el modo demo: pulsar y soltar una tecla."""
    return [(t, mido.Message("note_on", note=midi, velocity=vel)),
            (t + dur, mido.Message("note_off", note=midi, velocity=0))]


def es_pulsacion(msg) -> bool:
    return msg.type == "note_on" and msg.velocity > 0
