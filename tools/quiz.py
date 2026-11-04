"""Motor de quiz para los labs teóricos (modo "sin piano").

Las preguntas van en un JSON: [{"pregunta", "opciones": [...], "correcta": índice, "explicacion"}].
"""

import json
import random
from pathlib import Path

from rich.console import Console
from rich.panel import Panel
from rich.prompt import Prompt

consola = Console()
LETRAS = "abcd"


def cargar(ruta: Path) -> list[dict]:
    return json.loads(ruta.read_text(encoding="utf-8"))


def hacer_quiz(preguntas: list[dict], titulo: str, barajar: bool = True) -> tuple[int, int]:
    """Pregunta una a una y devuelve (aciertos, total)."""
    consola.print(Panel.fit(f"[bold]{titulo}[/]\nResponde con la letra y pulsa Enter.", border_style="cyan"))
    aciertos = 0
    for i, p in enumerate(preguntas, 1):
        opciones = list(enumerate(p["opciones"]))
        if barajar:
            random.shuffle(opciones)
        consola.print(f"\n[bold]{i}/{len(preguntas)}. {p['pregunta']}[/]")
        for letra, (_, texto) in zip(LETRAS, opciones):
            consola.print(f"   [cyan]{letra})[/] {texto}")
        resp = Prompt.ask("   Tu respuesta", choices=list(LETRAS[:len(opciones)]), show_choices=False)
        elegida = opciones[LETRAS.index(resp)][0]
        if elegida == p["correcta"]:
            aciertos += 1
            consola.print("   [green]✔ Correcto.[/] " + p["explicacion"])
        else:
            consola.print(f"   [red]✘ No.[/] La buena era: [bold]{p['opciones'][p['correcta']]}[/]. "
                          + p["explicacion"])
    return aciertos, len(preguntas)
