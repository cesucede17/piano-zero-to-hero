"""Lab de la lección 1: quiz de elección + detector de piano por MIDI.

    .\\piano.ps1 lab 1           (menú)
    .\\piano.ps1 lab 1 --demo    (detector con un piano simulado)
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from rich.console import Console  # noqa: E402
from rich.prompt import Prompt  # noqa: E402

from tools import midi_check, quiz  # noqa: E402
from tools.progress import leer, registrar  # noqa: E402

LECCION = "01"
MINIMO_QUIZ = 4
consola = Console()


def hacer_quiz() -> None:
    aciertos, total = quiz.hacer_quiz(quiz.cargar(Path(__file__).with_name("quiz.json")),
                                      "Lección 1 · Quiz de elección")
    ok = aciertos >= MINIMO_QUIZ
    registrar("lab", LECCION, "quiz-eleccion", puntuacion=f"{aciertos}/{total}", superado=ok)
    if ok:
        consola.print(f"\n[bold green]¡Aprobado! {aciertos}/{total}.[/] Ya sabes qué comprar.")
    else:
        consola.print(f"\n[bold yellow]{aciertos}/{total}.[/] Necesitas {MINIMO_QUIZ}. "
                      "Repasa 'Requisitos' y 'Qué evitar' en leccion.md y vuelve a intentarlo.")


def detectar(demo: bool) -> None:
    res = midi_check.comprobar(demo=demo)
    if res is None or demo:
        if demo:
            consola.print("\n[dim]Modo demo: el resultado no se guarda.[/]")
        return
    registrar("lab", LECCION, "detector-midi", superado=midi_check.aprobado(res),
              detalles=f"{res['puerto']} | teclas={res['teclas']} | vel={res['rango_velocidad']}")


def estado() -> str:
    hechos = {r["actividad"] for r in leer() if r["leccion"] == LECCION and r["superado"] == "si"}
    marca = lambda a: "[green]✔[/]" if a in hechos else "[dim]·[/]"  # noqa: E731
    if {"quiz-eleccion", "detector-midi"} <= hechos:
        consola.print("[bold green]🎉 Lección 1 superada. Puedes pasar a la lección 2.[/]")
    return f"{marca('quiz-eleccion')} 1) Quiz de elección (sin piano)\n" \
           f"{marca('detector-midi')} 2) Detector de piano por USB-MIDI\n" \
           f"  3) Detector en modo demo (sin piano)\n  0) Salir"


def main() -> None:
    if "--demo" in sys.argv:
        detectar(demo=True)
        return
    while True:
        consola.print("\n[bold cyan]Lección 1 · Laboratorio[/]")
        consola.print(estado())
        op = Prompt.ask("Elige", choices=["1", "2", "3", "0"], show_choices=False)
        if op == "1":
            hacer_quiz()
        elif op == "2":
            detectar(demo=False)
        elif op == "3":
            detectar(demo=True)
        else:
            break


if __name__ == "__main__":
    main()
