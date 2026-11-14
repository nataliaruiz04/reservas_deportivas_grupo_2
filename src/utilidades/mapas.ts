import { Linking, Platform } from "react-native";
import type { Coordenadas } from "@/tipos";

/**
 * Abre la aplicación de mapas del teléfono con la ruta hasta el lugar
 * (el PRD pide "Cómo llegar"). Devuelve false si no se pudo abrir.
 */
export async function abrirComoLlegar(destino: Coordenadas, nombre: string): Promise<boolean> {
  const { latitud, longitud } = destino;
  const etiqueta = encodeURIComponent(nombre);
  const direcciones = Platform.select({
    ios: [`http://maps.apple.com/?daddr=${latitud},${longitud}&q=${etiqueta}`],
    default: [
      `geo:${latitud},${longitud}?q=${latitud},${longitud}(${etiqueta})`,
      `https://www.google.com/maps/dir/?api=1&destination=${latitud},${longitud}`,
    ],
  });
  for (const url of direcciones ?? []) {
    try {
      await Linking.openURL(url);
      return true;
    } catch {
      // probamos con la siguiente
    }
  }
  return false;
}
