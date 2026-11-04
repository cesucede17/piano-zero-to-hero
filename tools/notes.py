"""Nombres de notas en español a partir del número MIDI.

Convención del curso: Do4 = Do central = MIDI 60 (la usan Yamaha, Roland y casi todo el software).
"""

NOMBRES = ["Do", "Do#", "Re", "Re#", "Mi", "Fa", "Fa#", "Sol", "Sol#", "La", "La#", "Si"]

NOTA_MAS_GRAVE_88 = 21   # La0
NOTA_MAS_AGUDA_88 = 108  # Do8


def nombre(midi: int) -> str:
    """60 -> 'Do4', 21 -> 'La0', 108 -> 'Do8'."""
    return f"{NOMBRES[midi % 12]}{midi // 12 - 1}"


def es_negra(midi: int) -> bool:
    return "#" in NOMBRES[midi % 12]
