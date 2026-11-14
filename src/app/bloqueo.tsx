import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { Campo } from "@/componentes/formularios";
import { Boton, Chip, Pantalla, Texto } from "@/componentes/ui";
import { useCarga } from "@/hooks/useCarga";
import { listarEspacios } from "@/servicios/espacios";
import { bloquearTurnos } from "@/servicios/personal";
import { mensajeDeError } from "@/utilidades/errores";
import { hoy } from "@/utilidades/fechas";

export default function Bloqueo() {
  const router = useRouter();
  const espacios = useCarga(() => listarEspacios(), []);
  const [espacioId, setEspacioId] = useState<string | null>(null);
  const [fecha, setFecha] = useState(hoy());
  const [diaEntero, setDiaEntero] = useState(true);
  const [inicio, setInicio] = useState("08:00");
  const [fin, setFin] = useState("12:00");
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function guardar() {
    setError(null);
    if (!espacioId) return setError("Elegí una cancha.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return setError("La fecha va como AAAA-MM-DD.");
    if (!motivo.trim()) return setError("Escribí el motivo.");
    setEnviando(true);
    try {
      const r = await bloquearTurnos({
        espacioId,
        fecha,
        inicio: diaEntero ? null : inicio,
        fin: diaEntero ? null : fin,
        motivo: motivo.trim(),
      });
      setMensaje(`Bloqueo guardado. Reservas afectadas: ${r.reservasAfectadas.length}.`);
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Pantalla>
      <Texto titulo>Bloquear turnos</Texto>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {(espacios.datos ?? []).map((e) => (
          <Chip key={e.id} texto={e.nombre} activo={espacioId === e.id} alPresionar={() => setEspacioId(e.id)} />
        ))}
      </View>
      <Campo etiqueta="Fecha (AAAA-MM-DD)" value={fecha} onChangeText={setFecha} />
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Chip texto="Día entero" activo={diaEntero} alPresionar={() => setDiaEntero(true)} />
        <Chip texto="Por horas" activo={!diaEntero} alPresionar={() => setDiaEntero(false)} />
      </View>
      {!diaEntero ? (
        <>
          <Campo etiqueta="Desde (HH:MM)" value={inicio} onChangeText={setInicio} />
          <Campo etiqueta="Hasta (HH:MM)" value={fin} onChangeText={setFin} />
        </>
      ) : null}
      <Campo etiqueta="Motivo (lluvia, mantenimiento…)" value={motivo} onChangeText={setMotivo} />
      {error ? <Texto>{error}</Texto> : null}
      {mensaje ? <Texto negrita>{mensaje}</Texto> : null}
      <Boton texto="Guardar bloqueo" cargando={enviando} alPresionar={guardar} />
      <Boton texto="Volver" variante="secundario" alPresionar={() => router.back()} />
    </Pantalla>
  );
}
