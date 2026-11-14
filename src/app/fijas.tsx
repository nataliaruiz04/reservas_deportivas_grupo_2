import { useCallback, useEffect, useState } from "react";
import { Switch, View } from "react-native";
import { Campo } from "@/componentes/formularios";
import { Boton, Chip, Cargando, ErrorConReintento, Etiqueta, Pantalla, Tarjeta, Texto } from "@/componentes/ui";
import { useCarga } from "@/hooks/useCarga";
import { listarEspacios } from "@/servicios/espacios";
import { guardarReservaFija, listarReservasFijas } from "@/servicios/personal";
import { useTema } from "@/tema";
import type { ReservaFija } from "@/tipos";
import { mensajeDeError } from "@/utilidades/errores";
import { hoy } from "@/utilidades/fechas";

// Reservas fijas: turnos que se repiten cada semana (por ejemplo "martes 21:00, Grupo de los martes").
// Mientras estén activas ocupan la grilla de esa cancha y nadie más puede reservarlos.

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const HORA = /^([01]\d|2[0-4]):00$/; // los turnos son de una hora exacta
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

interface Borrador {
  id?: string;
  espacioId: string | null;
  titular: string;
  dia: ReservaFija["dia"];
  inicio: string;
  fin: string;
  desde: string;
  hasta: string; // vacío = sin fecha de fin
  activa: boolean;
}

function borradorNuevo(): Borrador {
  return { espacioId: null, titular: "", dia: 2, inicio: "21:00", fin: "22:00", desde: hoy(), hasta: "", activa: true };
}

export default function ReservasFijas() {
  const { paleta } = useTema();
  const espacios = useCarga(() => listarEspacios(), []);
  const [fijas, setFijas] = useState<ReservaFija[] | null>(null);
  const [errorLista, setErrorLista] = useState<string | null>(null);
  const [borrador, setBorrador] = useState<Borrador | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setErrorLista(null);
    try {
      setFijas(await listarReservasFijas());
    } catch (e) {
      setErrorLista(mensajeDeError(e));
    }
  }, []);
  useEffect(() => {
    cargar();
  }, [cargar]);

  const nombreDe = (id: string) => (espacios.datos ?? []).find((e) => e.id === id)?.nombre ?? id;

  function editar(f: ReservaFija) {
    setError(null);
    setMensaje(null);
    setBorrador({ ...f, hasta: f.hasta ?? "" });
  }

  async function guardar() {
    if (!borrador) return;
    setError(null);
    if (!borrador.espacioId) return setError("Elegí una cancha.");
    if (!borrador.titular.trim()) return setError("Escribí quién tiene la reserva fija.");
    if (!HORA.test(borrador.inicio) || !HORA.test(borrador.fin)) return setError("Las horas van como HH:00, por ejemplo 21:00.");
    if (!FECHA.test(borrador.desde)) return setError("La fecha de inicio va como AAAA-MM-DD.");
    if (borrador.hasta && !FECHA.test(borrador.hasta)) return setError("La fecha de fin va como AAAA-MM-DD, o dejala vacía.");

    setGuardando(true);
    try {
      await guardarReservaFija({
        id: borrador.id,
        espacioId: borrador.espacioId,
        titular: borrador.titular.trim(),
        dia: borrador.dia,
        inicio: borrador.inicio,
        fin: borrador.fin,
        desde: borrador.desde,
        hasta: borrador.hasta || null,
        activa: borrador.activa,
      });
      setBorrador(null);
      setMensaje("Reserva fija guardada. Ya se ve en la grilla de esa cancha.");
      await cargar();
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setGuardando(false);
    }
  }

  if (errorLista && !fijas) {
    return (
      <Pantalla>
        <ErrorConReintento mensaje={errorLista} alReintentar={cargar} />
      </Pantalla>
    );
  }

  return (
    <Pantalla>
      <Texto titulo>Reservas fijas</Texto>
      <Texto suave>Turnos que se repiten cada semana. Mientras estén activas, nadie más puede reservar ese horario.</Texto>
      {mensaje ? <Texto negrita>{mensaje}</Texto> : null}

      {borrador ? (
        <Tarjeta>
          <Texto negrita>{borrador.id ? "Editar reserva fija" : "Nueva reserva fija"}</Texto>
          <Texto suave>Cancha</Texto>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {(espacios.datos ?? []).map((e) => (
              <Chip key={e.id} texto={e.nombre} activo={borrador.espacioId === e.id} alPresionar={() => setBorrador({ ...borrador, espacioId: e.id })} />
            ))}
          </View>
          <Campo etiqueta="Titular (quién la tiene)" value={borrador.titular} onChangeText={(t) => setBorrador({ ...borrador, titular: t })} />
          <Texto suave>Día de la semana</Texto>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {DIAS.map((d, i) => (
              <Chip key={d} texto={d} activo={borrador.dia === i} alPresionar={() => setBorrador({ ...borrador, dia: i as ReservaFija["dia"] })} />
            ))}
          </View>
          <Campo etiqueta="Desde la hora (HH:00)" value={borrador.inicio} onChangeText={(t) => setBorrador({ ...borrador, inicio: t })} />
          <Campo etiqueta="Hasta la hora (HH:00)" value={borrador.fin} onChangeText={(t) => setBorrador({ ...borrador, fin: t })} />
          <Campo etiqueta="Vale desde (AAAA-MM-DD)" value={borrador.desde} onChangeText={(t) => setBorrador({ ...borrador, desde: t })} />
          <Campo etiqueta="Vale hasta (AAAA-MM-DD, vacío = sin fin)" value={borrador.hasta} onChangeText={(t) => setBorrador({ ...borrador, hasta: t })} />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Texto estilo={{ flex: 1 }}>Activa</Texto>
            <Switch
              value={borrador.activa}
              onValueChange={(v) => setBorrador({ ...borrador, activa: v })}
              accessibilityLabel="Reserva fija activa"
              trackColor={{ true: paleta.primario, false: paleta.borde }}
            />
          </View>
          {error ? <Texto estilo={{ color: paleta.peligro }}>{error}</Texto> : null}
          <Boton texto="Guardar" icono="save-outline" cargando={guardando} alPresionar={guardar} />
          <Boton texto="Cancelar" variante="secundario" alPresionar={() => setBorrador(null)} />
        </Tarjeta>
      ) : (
        <Boton
          texto="Nueva reserva fija"
          icono="add-circle-outline"
          alPresionar={() => {
            setError(null);
            setMensaje(null);
            setBorrador(borradorNuevo());
          }}
        />
      )}

      {!fijas ? <Cargando texto="Cargando reservas fijas…" /> : null}
      {fijas && fijas.length === 0 ? <Texto suave>Todavía no hay reservas fijas.</Texto> : null}
      {(fijas ?? []).map((f) => (
        <Tarjeta key={f.id} alPresionar={() => editar(f)} descripcion={`Editar reserva fija de ${f.titular}`}>
          <Texto negrita>{f.titular}</Texto>
          <Texto suave>
            {nombreDe(f.espacioId)} · {DIAS[f.dia]} {f.inicio} a {f.fin}
          </Texto>
          <Texto suave>
            Desde {f.desde}
            {f.hasta ? ` hasta ${f.hasta}` : ", sin fecha de fin"}
          </Texto>
          <Etiqueta texto={f.activa ? "Activa" : "Pausada"} color={f.activa ? paleta.exito : paleta.textoSuave} icono={f.activa ? "checkmark-circle-outline" : "pause-circle-outline"} />
        </Tarjeta>
      ))}
    </Pantalla>
  );
}
