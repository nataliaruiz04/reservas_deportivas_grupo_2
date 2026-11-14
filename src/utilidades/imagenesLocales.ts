import type { ImageSourcePropType } from "react-native";

// Fotos que viajan dentro de la app (assets/canchas). Se usan en el modo mock y como
// reemplazo cuando una foto no carga. Metro necesita que cada require sea literal.
const LOCALES: Record<string, ImageSourcePropType> = {
  "soccer-5-1": require("../../assets/canchas/soccer-5-1.png"),
  "soccer-5-2": require("../../assets/canchas/soccer-5-2.png"),
  "soccer-11-1": require("../../assets/canchas/soccer-11-1.png"),
  "soccer-11-2": require("../../assets/canchas/soccer-11-2.png"),
  "basketball-1": require("../../assets/canchas/basketball-1.png"),
  "basketball-2": require("../../assets/canchas/basketball-2.png"),
  "volleyball-1": require("../../assets/canchas/volleyball-1.png"),
  "volleyball-2": require("../../assets/canchas/volleyball-2.png"),
  "tenis-1": require("../../assets/canchas/tenis-1.png"),
  "tenis-2": require("../../assets/canchas/tenis-2.png"),
  "gym-1": require("../../assets/canchas/gym-1.png"),
  "gym-2": require("../../assets/canchas/gym-2.png"),
};

const PREFIJO = "asset:";

/** Devuelve la imagen incluida en la app si la dirección es "asset:<nombre>"; si no, null. */
export function imagenLocal(url: string): ImageSourcePropType | null {
  if (!url.startsWith(PREFIJO)) return null;
  return LOCALES[url.slice(PREFIJO.length)] ?? null;
}
