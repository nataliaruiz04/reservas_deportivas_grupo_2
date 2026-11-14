import { Pressable, StyleSheet, View } from "react-native";
import { useTema } from "@/tema";
import type { Deporte, Espacio } from "@/tipos";
import { distanciaTexto, precioTexto } from "@/utilidades/fechas";
import { Foto } from "./medios";
import { Etiqueta, Icono, Tarjeta, Texto } from "./ui";

/** Tarjeta de un espacio en el listado: foto, nombre, complejo, precio y datos útiles. */
export function TarjetaEspacio({
  espacio, deporte, distanciaMetros, esFavorito, alPresionar,
}: {
  espacio: Espacio;
  deporte: Deporte | undefined;
  distanciaMetros: number | null; // null si no se conoce la ubicación del usuario
  esFavorito: boolean;
  alPresionar: () => void;
}) {
  const { paleta } = useTema();
  const precio = precioTexto(espacio.precioPorHora);

  return (
    <Tarjeta
      alPresionar={alPresionar}
      estilo={{ padding: 0, overflow: "hidden" }}
      descripcion={`${espacio.nombre}, ${espacio.complejo}, ${precio} por hora`}
    >
      <Foto url={espacio.imagenes[0]} alto={130} icono={deporte?.icono ?? "image-outline"} color={deporte?.color} />
      <View style={estilos.cuerpo}>
        <View style={estilos.fila}>
          <Texto negrita lineas={2} estilo={{ flex: 1, fontSize: 18 }}>{espacio.nombre}</Texto>
          {esFavorito ? <Icono nombre="heart" color={paleta.peligro} /> : null}
        </View>
        <Texto suave>{espacio.complejo}</Texto>
        <View style={[estilos.fila, { flexWrap: "wrap" }]}>
          <Etiqueta texto={`${precio} / hora`} color={paleta.primario} />
          {espacio.iluminacion
            ? <Etiqueta texto="Con luz" color={paleta.textoSuave} icono="bulb-outline" />
            : <Etiqueta texto="Sin luz de noche" color={paleta.aviso} icono="moon-outline" />}
          {espacio.techado ? <Etiqueta texto="Techado" color={paleta.textoSuave} icono="umbrella-outline" /> : null}
          {distanciaMetros !== null
            ? <Etiqueta texto={distanciaTexto(distanciaMetros)} color={paleta.textoSuave} icono="navigate-outline" />
            : null}
        </View>
      </View>
    </Tarjeta>
  );
}

/** Botón cuadrado solo con ícono (corazón, volver, etc.). Mide 48 px para que sea fácil de tocar. */
export function BotonIcono({
  icono, descripcion, alPresionar, color,
}: {
  icono: string;
  descripcion: string;
  alPresionar: () => void;
  color?: string;
}) {
  return (
    <Pressable
      onPress={alPresionar}
      accessibilityRole="button"
      accessibilityLabel={descripcion}
      hitSlop={8}
      style={estilos.botonIcono}
    >
      <Icono nombre={icono} tamano={26} color={color} />
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  cuerpo: { padding: 14, paddingTop: 6, gap: 6 },
  fila: { flexDirection: "row", alignItems: "center", gap: 8 },
  botonIcono: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
});
