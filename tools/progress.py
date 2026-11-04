"""Log de progreso: cada lab superado o sesión de práctica es una fila de progress/log.csv.

Uso desde consola:
    python -m tools.progress practica 25 "escalas de Do"
"""

import csv
import sys
from datetime import datetime
from pathlib import Path

LOG = Path(__file__).resolve().parents[1] / "progress" / "log.csv"
COLUMNAS = ["fecha", "tipo", "leccion", "actividad", "minutos", "puntuacion", "superado", "detalles"]


def registrar(tipo: str, leccion: str = "", actividad: str = "", minutos: float | str = "",
              puntuacion: float | str = "", superado: bool | str = "", detalles: str = "") -> None:
    nuevo = not LOG.exists()
    LOG.parent.mkdir(exist_ok=True)
    with LOG.open("a", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        if nuevo:
            w.writerow(COLUMNAS)
        if isinstance(superado, bool):
            superado = "si" if superado else "no"
        w.writerow([datetime.now().isoformat(timespec="seconds"), tipo, leccion, actividad,
                    minutos, puntuacion, superado, detalles])


def leer() -> list[dict]:
    if not LOG.exists():
        return []
    with LOG.open(encoding="utf-8") as f:
        return list(csv.DictReader(f))


def _cli(args: list[str]) -> None:
    if len(args) >= 2 and args[0] == "practica":
        try:
            minutos = float(args[1].replace(",", "."))
        except ValueError:
            print('Uso: .\\piano.ps1 practica 25 "qué has practicado"')
            sys.exit(1)
        nota = " ".join(args[2:])
        registrar("practica", actividad=nota, minutos=minutos)
        total = sum(float(r["minutos"] or 0) for r in leer() if r["tipo"] == "practica")
        print(f"Apuntado: {minutos:g} min. Total acumulado: {total / 60:.1f} h")
    else:
        print('Uso: .\\piano.ps1 practica 25 "qué has practicado"')


if __name__ == "__main__":
    _cli(sys.argv[1:])
