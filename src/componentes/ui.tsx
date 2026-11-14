import { Ionicons } from "@react-native-vector-icons/ionicons";
import type { ComponentProps, ReactNode } from "react";
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View,
  type StyleProp, type TextStyle, type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ALTO_BOTON, useTema } from "@/tema";

// Piezas de interfaz que se repiten en todas las pantallas.
// Botones grandes y letra legible: la app se usa con una mano y al sol.

export type NombreIcono = ComponentProps<typeof Ionicons>["name"];

export function Icono({ nombre, tamano = 22, color }: { nombre: string; tamano?: number; color?: string }) {
  const { paleta } = useTema();
  return <Ionicons name={nombre as NombreIcono} size={tamano} color={color ?? paleta.texto} />;
}

/** Contenedor de cada pantalla: respeta la zona segura y (opcional) permite desplazarse. */
export function Pantalla({
  children,
  desplazable = true,
  relleno = 16,
  bordes = ["top"],
}: {
  children: ReactNode;
  desplazable?: boolean;
  relleno?: number;
  bordes?: ("top" | "bottom" | "left" | "right")[];
}) {
  const { paleta } = useTema();
  return (
    <SafeAreaView edges={bordes} style={{ flex: 1, backgroundColor: paleta.fondo }}>
      {desplazable ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: relleno, gap: 14, paddingBottom: relleno + 24 }}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, padding: relleno, gap: 14 }}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Texto({
  children, estilo, suave, titulo, negrita, lineas,
}: {
  children: ReactNode;
  estilo?: StyleProp<TextStyle>;
  suave?: boolean;
  titulo?: boolean;
  negrita?: boolean;
  lineas?: number;
}) {
  const { paleta } = useTema();
  const base: TextStyle = {
    color: suave ? paleta.textoSuave : paleta.texto,
    fontSize: titulo ? 24 : 16,
    lineHeight: titulo ? 30 : 22,
    fontWeight: titulo || negrita ? "700" : "400",
  };
  return (
    <Text numberOfLines={lineas} style={[base, estilo]}>
      {children}
    </Text>
  );
}

export function Tarjeta({
  children, estilo, alPresionar, descripcion,
}: {
  children: ReactNode;
  estilo?: StyleProp<ViewStyle>;
  alPresionar?: () => void;
  descripcion?: string;
}) {
  const { paleta } = useTema();
  const caja: ViewStyle = {
    backgroundColor: paleta.superficie,
    borderColor: paleta.borde,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 8,
  };
  if (!alPresionar) return <View style={[caja, estilo]}>{children}</View>;
  return (
    <Pressable
      onPress={alPresionar}
      accessibilityRole="button"
      accessibilityLabel={descripcion}
      style={({ pressed }) => [caja, estilo, pressed && { opacity: 0.85 }]}
    >
      {children}
    </Pressable>
  );
}

export function Boton({
  texto, alPresionar, variante = "primario", icono, cargando, deshabilitado, estilo,
}: {
  texto: string;
  alPresionar: () => void;
  variante?: "primario" | "secundario" | "peligro";
  icono?: string;
  cargando?: boolean;
  deshabilitado?: boolean;
  estilo?: StyleProp<ViewStyle>;
}) {
  const { paleta } = useTema();
  const inactivo = !!deshabilitado || !!cargando;

  let fondo = "transparent";
  let letra = paleta.primario;
  if (variante === "primario") { fondo = paleta.primario; letra = paleta.textoSobrePrimario; }
  if (variante === "peligro") { fondo = paleta.peligro; letra = "#FFFFFF"; }

  return (
    <Pressable
      onPress={alPresionar}
      disabled={inactivo}
      accessibilityRole="button"
      accessibilityLabel={texto}
      accessibilityState={{ disabled: inactivo, busy: !!cargando }}
      style={({ pressed }) => [
        estilos.boton,
        { backgroundColor: fondo, borderColor: variante === "secundario" ? paleta.primario : fondo },
        inactivo && { opacity: 0.5 },
        pressed && { opacity: 0.8 },
        estilo,
      ]}
    >
      {cargando ? (
        <ActivityIndicator color={letra} />
      ) : (
        <>
          {icono ? <Icono nombre={icono} color={letra} /> : null}
          <Text style={{ color: letra, fontSize: 17, fontWeight: "700" }}>{texto}</Text>
        </>
      )}
    </Pressable>
  );
}

/** Rótulo chico con borde (por ejemplo "Confirmada", "Con luz"). */
export function Etiqueta({ texto, color, icono }: { texto: string; color: string; icono?: string }) {
  return (
    <View style={[estilos.etiqueta, { borderColor: color }]}>
      {icono ? <Icono nombre={icono} tamano={14} color={color} /> : null}
      <Text style={{ color, fontSize: 13, fontWeight: "700" }}>{texto}</Text>
    </View>
  );
}

/** Botón redondeado de filtro; el activo se pinta con el color principal. */
export function Chip({
  texto, activo, alPresionar, icono,
}: {
  texto: string;
  activo: boolean;
  alPresionar: () => void;
  icono?: string;
}) {
  const { paleta } = useTema();
  const letra = activo ? paleta.textoSobrePrimario : paleta.texto;
  return (
    <Pressable
      onPress={alPresionar}
      accessibilityRole="button"
      accessibilityState={{ selected: activo }}
      style={[
        estilos.chip,
        { backgroundColor: activo ? paleta.primario : paleta.superficie, borderColor: activo ? paleta.primario : paleta.borde },
      ]}
    >
      {icono ? <Icono nombre={icono} tamano={18} color={letra} /> : null}
      <Text style={{ color: letra, fontSize: 15, fontWeight: "600" }}>{texto}</Text>
    </Pressable>
  );
}

export function Cargando({ texto = "Cargando…" }: { texto?: string }) {
  const { paleta } = useTema();
  return (
    <View style={estilos.centro} accessibilityLiveRegion="polite">
      <ActivityIndicator size="large" color={paleta.primario} />
      <Texto suave>{texto}</Texto>
    </View>
  );
}

/** Pantalla "no hay nada para mostrar", con una acción opcional. */
export function EstadoVacio({
  icono = "file-tray-outline", titulo, detalle, accion,
}: {
  icono?: string;
  titulo: string;
  detalle?: string;
  accion?: ReactNode;
}) {
  const { paleta } = useTema();
  return (
    <View style={estilos.centro}>
      <Icono nombre={icono} tamano={44} color={paleta.textoSuave} />
      <Texto negrita estilo={{ textAlign: "center" }}>{titulo}</Texto>
      {detalle ? <Texto suave estilo={{ textAlign: "center" }}>{detalle}</Texto> : null}
      {accion}
    </View>
  );
}

export function ErrorConReintento({ mensaje, alReintentar }: { mensaje: string; alReintentar: () => void }) {
  const { paleta } = useTema();
  return (
    <View style={estilos.centro} accessibilityLiveRegion="assertive">
      <Icono nombre="cloud-offline-outline" tamano={44} color={paleta.peligro} />
      <Texto negrita estilo={{ textAlign: "center" }}>No pudimos cargar esto</Texto>
      <Texto suave estilo={{ textAlign: "center" }}>{mensaje}</Texto>
      <Boton texto="Reintentar" icono="refresh" alPresionar={alReintentar} />
    </View>
  );
}

/** "27/10 14:30" a partir de "2026-10-27T14:30:00-03:00". */
function diaYHora(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)} ${iso.slice(11, 16)}`;
}

/** Franja que avisa cuando no hay internet o cuando lo que se ve es una copia guardada. */
export function AvisoDeConexion({
  sinConexion, desdeCache, guardadoEn,
}: {
  sinConexion: boolean;
  desdeCache?: boolean;
  guardadoEn?: string | null;
}) {
  const { paleta } = useTema();
  if (!sinConexion && !desdeCache) return null;

  const texto = desdeCache
    ? `Sin conexión: mostramos lo último que guardamos${guardadoEn ? ` (${diaYHora(guardadoEn)})` : ""}.`
    : "Sin conexión: algunas cosas pueden no estar al día.";
  return (
    <View accessibilityRole="alert" style={[estilos.aviso, { backgroundColor: paleta.superficie, borderColor: paleta.aviso }]}>
      <Icono nombre="cloud-offline-outline" color={paleta.aviso} />
      <Text style={{ color: paleta.texto, flex: 1, fontSize: 15 }}>{texto}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  boton: {
    minHeight: ALTO_BOTON, borderRadius: 14, borderWidth: 2, paddingHorizontal: 18,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  etiqueta: {
    flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1.5, borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 3, alignSelf: "flex-start",
  },
  chip: {
    minHeight: 44, borderRadius: 999, borderWidth: 1.5, paddingHorizontal: 14,
    flexDirection: "row", alignItems: "center", gap: 6,
  },
  centro: { alignItems: "center", justifyContent: "center", gap: 12, padding: 28 },
  aviso: { borderWidth: 1, borderRadius: 12, padding: 12, flexDirection: "row", gap: 8, alignItems: "center" },
});
