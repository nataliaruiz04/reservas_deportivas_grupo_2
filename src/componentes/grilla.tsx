import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useTema, type Paleta } from "@/tema";
import { aMinutos, fechaCorta, precioTexto, sumarDias } from "@/utilidades/fechas";
import { esReservable, turnoPasado, type CeldaGrilla } from "@/utilidades/grilla";
import { Chip, Icono, Texto } from "./ui";

/** Fila de chips con los próximos días: "Hoy", "Mañana", "mar 20/10"… */
export function SelectorDeDia({
  hoy, elegido, dias, alElegir,
}: {
  hoy: string;
  elegido: string;
  dias: number;
  alElegir: (fecha: string) => void;
}) {
  const fechas: string[] = [];
  for (let i = 0; i < dias; i++) fechas.push(sumarDias(hoy, i));

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {fechas.map((f, i) => (
        <Chip
          key={f}
          texto={i === 0 ? "Hoy" : i === 1 ? "Mañana" : fechaCorta(f)}
          activo={f === elegido}
          alPresionar={() => alElegir(f)}
        />
      ))}
    </ScrollView>
  );
}

interface Aspecto {
  etiqueta: string;
  detalle: string | null;
  color: string;
  icono: string;
}

/** Qué texto, color e ícono lleva cada turno. Nunca se distingue solo por color. */
function aspectoDe(c: CeldaGrilla, pasado: boolean, paleta: Paleta): Aspecto {
  const { turno } = c;
  if (turno.estado === "mantenimiento")
    return { etiqueta: "Bloqueado", detalle: turno.motivoBloqueo, color: paleta.mantenimiento, icono: "construct-outline" };
  if (turno.estado === "fijo")
    return { etiqueta: "Reserva fija", detalle: c.titularFija, color: paleta.fijo, icono: "repeat-outline" };
  if (turno.estado === "reservado")
    return { etiqueta: "Ocupado", detalle: null, color: paleta.ocupado, icono: "close-circle-outline" };
  if (pasado)
    return { etiqueta: "Ya pasó", detalle: null, color: paleta.textoSuave, icono: "time-outline" };
  return { etiqueta: "Libre", detalle: precioTexto(turno.precio), color: paleta.libre, icono: "checkmark-circle-outline" };
}

/** Los turnos de un día, uno debajo del otro. Solo se puede tocar un turno libre y que no empezó. */
export function GrillaDeTurnos({
  celdas, ahora, elegidoId, alElegir,
}: {
  celdas: CeldaGrilla[];
  ahora: Date;
  elegidoId: string | null;
  alElegir: (celda: CeldaGrilla) => void;
}) {
  const { paleta } = useTema();

  return (
    <View style={{ gap: 8 }}>
      {celdas.map((c) => {
        const { turno } = c;
        const reservable = esReservable(turno, ahora);
        const elegido = turno.id === elegidoId;
        const a = aspectoDe(c, turnoPasado(turno, ahora), paleta);

        // El turno elegido se pinta con el color principal, así que su texto va en el color "sobre primario".
        const colorTitulo = elegido ? paleta.textoSobrePrimario : a.color;
        const colorDetalle = elegido ? paleta.textoSobrePrimario : paleta.textoSuave;

        return (
          <Pressable
            key={turno.id}
            disabled={!reservable}
            onPress={() => alElegir(c)}
            accessibilityRole="button"
            accessibilityState={{ disabled: !reservable, selected: elegido }}
            accessibilityLabel={`${turno.inicio} a ${turno.fin}, ${a.etiqueta}${a.detalle ? `, ${a.detalle}` : ""}`}
            style={[
              estilos.fila,
              {
                backgroundColor: elegido ? paleta.primario : paleta.superficie,
                borderColor: elegido ? paleta.primario : paleta.borde,
                opacity: reservable || elegido ? 1 : 0.7,
              },
            ]}
          >
            <View style={[estilos.barra, { backgroundColor: colorTitulo }]} />
            <Texto negrita estilo={{ width: 58, color: elegido ? paleta.textoSobrePrimario : paleta.texto }}>
              {turno.inicio}
            </Texto>
            <Icono nombre={a.icono} color={colorTitulo} />
            <View style={{ flex: 1 }}>
              <Texto negrita lineas={1} estilo={{ color: colorTitulo }}>{a.etiqueta}</Texto>
              {a.detalle ? <Texto lineas={2} estilo={{ fontSize: 14, color: colorDetalle }}>{a.detalle}</Texto> : null}
            </View>
            {elegido ? <Icono nombre="radio-button-on" color={paleta.textoSobrePrimario} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

/** Cuántas horas dura un turno o una reserva ("19:00" a "21:00" = 2). */
export function duracionEnHoras(inicio: string, fin: string): number {
  return (aMinutos(fin) - aMinutos(inicio)) / 60;
}

const estilos = StyleSheet.create({
  fila: {
    minHeight: 60, borderWidth: 1.5, borderRadius: 12, paddingVertical: 8, paddingRight: 12,
    flexDirection: "row", alignItems: "center", gap: 10, overflow: "hidden",
  },
  barra: { width: 6, alignSelf: "stretch", borderRadius: 3, marginLeft: 6 },
});
