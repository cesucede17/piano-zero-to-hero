"""Panel de progreso. Se abre con:  .\\piano.ps1 progreso"""

import sys
from pathlib import Path

import pandas as pd
import streamlit as st

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from tools.progress import leer  # noqa: E402

st.set_page_config(page_title="Mi progreso al piano", page_icon="🎹", layout="wide")
st.title("🎹 Mi progreso al piano")

filas = leer()
if not filas:
    st.info("Aún no hay nada registrado. Haz el lab 1 (`.\\piano.ps1 lab 1`) o apunta práctica con "
            "`.\\piano.ps1 practica 25 \"qué he practicado\"`.")
    st.stop()

df = pd.DataFrame(filas)
df["fecha"] = pd.to_datetime(df["fecha"])
df["minutos"] = pd.to_numeric(df["minutos"], errors="coerce").fillna(0)

practica = df[df["tipo"] == "practica"]
labs = df[df["tipo"] == "lab"]
superadas = sorted(labs.loc[labs["superado"] == "si", "leccion"].unique())

hoy = pd.Timestamp.now().normalize()
semana = practica[practica["fecha"] >= hoy - pd.Timedelta(days=6)]
# Racha: semanas seguidas con al menos 2 días de práctica (la semana en curso cuenta si ya llega a 2)
dias_por_semana = practica["fecha"].dt.normalize().drop_duplicates().dt.to_period("W").value_counts()
semana_actual = hoy.to_period("W")
racha = 0
p = semana_actual if dias_por_semana.get(semana_actual, 0) >= 2 else semana_actual - 1
while dias_por_semana.get(p, 0) >= 2:
    racha += 1
    p -= 1

c1, c2, c3, c4 = st.columns(4)
c1.metric("Horas totales", f"{practica['minutos'].sum() / 60:.1f}")
c2.metric("Minutos esta semana", f"{semana['minutos'].sum():.0f}", help="Objetivo: 90–120 (2 sesiones de 45–60 min)")
c3.metric("Semanas seguidas", racha, help="Semanas con al menos 2 sesiones de práctica")
c4.metric("Lecciones superadas", f"{len(superadas)} / 30")

if not practica.empty:
    st.subheader("Práctica por semana (minutos)")
    por_semana = practica.set_index("fecha")["minutos"].resample("W-MON", label="left").sum()
    st.bar_chart(por_semana)

st.subheader("Laboratorios")
if labs.empty:
    st.write("Todavía no has hecho ningún lab.")
else:
    st.dataframe(labs[["fecha", "leccion", "actividad", "puntuacion", "superado", "detalles"]]
                 .sort_values("fecha", ascending=False), hide_index=True, use_container_width=True)

with st.expander("Registro completo"):
    st.dataframe(df.sort_values("fecha", ascending=False), hide_index=True, use_container_width=True)
