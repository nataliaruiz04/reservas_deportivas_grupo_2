import { View } from "react-native";
import type { EstadoReserva, ReservaConTurno } from "@/tipos";
import { useTema } from "@/tema";
import { fechaLarga, precioTexto, rangoHoras } from "@/utilidades/fechas";
import { Etiqueta, Tarjeta, Texto } from "./ui";

export function EtiquetaDeEstado({ estado }: { estado: EstadoReserva }) {
  const { paleta } = useTema();
  switch (estado) {
    case "confirmada":
      return <Etiqueta texto="Confirmada" color={paleta.libre} icono="checkmark-circle-outline" />;
    case "cumplida":
      return <Etiqueta texto="Cumplida" color={paleta.textoSuave} icono="checkmark-done-outline" />;
    case "ausente":
      return <Etiqueta texto="No te presentaste" color={paleta.aviso} icono="alert-circle-outline" />;
    case "cancelada":
      return <Etiqueta texto="Cancelada" color={paleta.ocupado} icono="close-circle-outline" />;
  }
}

/** Resumen de una reserva: qué cancha, qué día, a qué hora y cuánto se paga en el lugar. */
export function TarjetaReserva({
  datos,
  suspendidoPor,
  alPresionar,
}: {
  datos: ReservaConTurno;
  /** Motivo, si el turno quedó dentro de un bloqueo (lluvia o mantenimiento). */
  suspendidoPor?: string | null;
  alPresionar?: () => void;
}) {
  const { paleta } = useTema();
  const { reserva, espacio, turno } = datos;
  const titulo = espacio?.nombre ?? "Espacio";
  const cuando = turno ? `${fechaLarga(turno.fecha)} · ${rangoHoras(turno.inicio, turno.fin)}` : "Horario no disponible";
  return (
    <Tarjeta
      alPresionar={alPresionar}
      descripcion={`${titulo}, ${cuando}`}
      estilo={suspendidoPor ? { borderColor: paleta.mantenimiento, borderWidth: 2 } : undefined}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <Texto negrita lineas={2} estilo={{ flex: 1, fontSize: 18 }}>
          {titulo}
        </Texto>
        <EtiquetaDeEstado estado={reserva.estado} />
      </View>
      <Texto>{cuando}</Texto>
      {espacio ? <Texto suave>{espacio.complejo}</Texto> : null}
      {turno && reserva.estado === "confirmada" ? (
        <Texto suave>{precioTexto(turno.precio)} · se paga en el lugar</Texto>
      ) : null}
      {suspendidoPor ? (
        <Texto negrita estilo={{ color: paleta.mantenimiento }}>
          Turno suspendido: {suspendidoPor}
        </Texto>
      ) : null}
    </Tarjeta>
  );
}
