import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, View } from "react-native";
import { TarjetaReserva } from "@/componentes/reservas";
import {
  AvisoDeConexion,
  Boton,
  Cargando,
  ErrorConReintento,
  EstadoVacio,
  Pantalla,
  Texto,
} from "@/componentes/ui";
import { useSesion } from "@/contexto/sesion";
import { useCarga } from "@/hooks/useCarga";
import { useSinConexion } from "@/hooks/useRed";
import { avisarSuspension, sincronizarRecordatorios } from "@/notificaciones";
import { misReservas } from "@/servicios/reservas";
import { obtenerGrilla } from "@/servicios/turnos";
import type { ConOrigen, ReservaConTurno } from "@/tipos";
import { aInstante } from "@/utilidades/fechas";

type Fila =
  | { tipo: "titulo"; id: string; texto: string }
  | { tipo: "reserva"; id: string; datos: ReservaConTurno };

function empiezaDespuesDe(r: ReservaConTurno, ahora: Date): boolean {
  return r.turno ? aInstante(r.turno.fecha, r.turno.inicio).getTime() > ahora.getTime() : false;
}

export default function MisReservas() {
  const router = useRouter();
  const { usuario } = useSesion();
  const sinConexion = useSinConexion();
  const [suspendidos, setSuspendidos] = useState<Record<string, string>>({});

  const carga = useCarga<ReservaConTurno[]>(
    async (): Promise<ConOrigen<ReservaConTurno[]>> =>
      usuario ? misReservas() : { datos: [], desdeCache: false, guardadoEn: null },
    [usuario?.id],
  );
  const recargar = carga.recargar;
  useFocusEffect(useCallback(() => { recargar(); }, [recargar]));

  // Cada vez que llega la lista real: se reprograman los recordatorios (por ejemplo, tras
  // cambiar de teléfono) y se revisa si algún turno quedó dentro de un bloqueo para avisar.
  useEffect(() => {
    const lista = carga.datos;
    if (!lista || carga.desdeCache) return;
    sincronizarRecordatorios(lista).catch(() => {});
    let vigente = true;
    (async () => {
      const ahora = new Date();
      const nuevos: Record<string, string> = {};
      const proximas = lista
        .filter((r) => r.reserva.estado === "confirmada" && empiezaDespuesDe(r, ahora))
        .slice(0, 10);
      for (const r of proximas) {
        if (!r.turno || !r.espacio) continue;
        try {
          const celdas = await obtenerGrilla(r.espacio.id, r.turno.fecha);
          const celda = celdas.find((c) => c.turno.inicio === r.turno?.inicio);
          if (celda?.turno.estado === "mantenimiento") {
            const motivo = celda.turno.motivoBloqueo ?? "mantenimiento";
            nuevos[r.reserva.id] = motivo;
            await avisarSuspension(r, motivo);
          }
        } catch {
          // Sin red no podemos revisar: no pasa nada, se revisa la próxima vez.
        }
      }
      if (vigente) setSuspendidos(nuevos);
    })();
    return () => {
      vigente = false;
    };
  }, [carga.datos, carga.desdeCache]);

  const filas = useMemo<Fila[]>(() => {
    const ahora = new Date();
    const todas = carga.datos ?? [];
    const proximas = todas.filter((r) => r.reserva.estado === "confirmada" && empiezaDespuesDe(r, ahora));
    const anteriores = todas.filter((r) => !proximas.includes(r)).reverse();
    const resultado: Fila[] = [];
    if (proximas.length > 0) {
      resultado.push({ tipo: "titulo", id: "t-prox", texto: "Próximas" });
      proximas.forEach((d) => resultado.push({ tipo: "reserva", id: d.reserva.id, datos: d }));
    }
    if (anteriores.length > 0) {
      resultado.push({ tipo: "titulo", id: "t-ant", texto: "Anteriores" });
      anteriores.forEach((d) => resultado.push({ tipo: "reserva", id: d.reserva.id, datos: d }));
    }
    return resultado;
  }, [carga.datos]);

  if (!usuario) {
    return (
      <Pantalla>
        <Texto titulo>Mis reservas</Texto>
        <EstadoVacio
          icono="ticket-outline"
          titulo="Iniciá sesión para ver tus reservas"
          detalle="Mirar los espacios y la disponibilidad no necesita cuenta. La cuenta sirve para reservar y guardar tus turnos."
          accion={
            <View style={{ alignSelf: "stretch", gap: 10 }}>
              <Boton texto="Iniciar sesión" icono="log-in-outline" alPresionar={() => router.push("/login")} />
              <Boton texto="Crear cuenta" variante="secundario" alPresionar={() => router.push("/registro")} />
            </View>
          }
        />
      </Pantalla>
    );
  }

  if (carga.cargando && !carga.datos) {
    return (
      <Pantalla desplazable={false}>
        <Cargando texto="Buscando tus reservas…" />
      </Pantalla>
    );
  }
  if (carga.error && !carga.datos) {
    return (
      <Pantalla desplazable={false}>
        <ErrorConReintento mensaje={carga.error} alReintentar={carga.recargar} />
      </Pantalla>
    );
  }

  return (
    <Pantalla desplazable={false} relleno={0}>
      <FlatList
        data={filas}
        keyExtractor={(f) => f.id}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}
        refreshing={carga.cargando}
        onRefresh={carga.recargar}
        ListHeaderComponent={
          <View style={{ gap: 10 }}>
            <Texto titulo>Mis reservas</Texto>
            <AvisoDeConexion sinConexion={sinConexion} desdeCache={carga.desdeCache} guardadoEn={carga.guardadoEn} />
          </View>
        }
        ListEmptyComponent={
          <EstadoVacio
            icono="calendar-outline"
            titulo="Todavía no tenés reservas"
            detalle="Elegí un espacio, mirá qué turnos hay libres y reservá en dos toques."
            accion={<Boton texto="Ver espacios" icono="football-outline" alPresionar={() => router.push("/(tabs)")} />}
          />
        }
        renderItem={({ item }) =>
          item.tipo === "titulo" ? (
            <Texto negrita estilo={{ fontSize: 20, marginTop: 6 }}>
              {item.texto}
            </Texto>
          ) : (
            <TarjetaReserva
              datos={item.datos}
              suspendidoPor={suspendidos[item.datos.reserva.id] ?? null}
              alPresionar={() => router.push(`/reserva/${item.datos.reserva.id}`)}
            />
          )
        }
      />
    </Pantalla>
  );
}
