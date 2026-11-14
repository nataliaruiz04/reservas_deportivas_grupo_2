import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useColorScheme } from "react-native";
import { guardarTema, leerTema, type PreferenciaTema } from "@/almacenamiento/sesion";

// Colores de la app. Hay dos juegos (claro y oscuro) con contraste alto,
// porque el PRD pide que se pueda usar de noche y al sol.

export interface Paleta {
  fondo: string;
  superficie: string;
  texto: string;
  textoSuave: string;
  borde: string;
  primario: string;
  textoSobrePrimario: string;
  peligro: string;
  aviso: string;
  exito: string;
  libre: string;
  ocupado: string;
  fijo: string;
  mantenimiento: string;
}

const CLARA: Paleta = {
  fondo: "#F4F6F5", superficie: "#FFFFFF", texto: "#14201B", textoSuave: "#4A5A53",
  borde: "#CBD5D0", primario: "#0B6E4F", textoSobrePrimario: "#FFFFFF",
  peligro: "#B3261E", aviso: "#8A5A00", exito: "#1B7A3E",
  libre: "#1B7A3E", ocupado: "#8C2F39", fijo: "#5B4B9A", mantenimiento: "#9A6700",
};

const OSCURA: Paleta = {
  fondo: "#0E1512", superficie: "#18221D", texto: "#EAF2EE", textoSuave: "#A9B9B1",
  borde: "#2E3D36", primario: "#3DBE8B", textoSobrePrimario: "#06210F",
  peligro: "#FF8A80", aviso: "#FFCC66", exito: "#6FD99A",
  libre: "#6FD99A", ocupado: "#FF9AA2", fijo: "#BDB0F2", mantenimiento: "#FFCC66",
};

interface ValorTema {
  paleta: Paleta;
  esOscuro: boolean;
  preferencia: PreferenciaTema;
  cambiarPreferencia: (p: PreferenciaTema) => void;
}

const ContextoTema = createContext<ValorTema | null>(null);

export function TemaProvider({ children }: { children: ReactNode }) {
  const sistema = useColorScheme(); // "light" | "dark" según el teléfono
  const [preferencia, setPreferencia] = useState<PreferenciaTema>("sistema");

  // Al abrir la app se recupera la preferencia guardada.
  useEffect(() => {
    leerTema().then(setPreferencia).catch(() => {});
  }, []);

  function cambiarPreferencia(p: PreferenciaTema) {
    setPreferencia(p);
    guardarTema(p).catch(() => {});
  }

  const esOscuro = preferencia === "oscuro" || (preferencia === "sistema" && sistema === "dark");
  const valor: ValorTema = { paleta: esOscuro ? OSCURA : CLARA, esOscuro, preferencia, cambiarPreferencia };
  return <ContextoTema.Provider value={valor}>{children}</ContextoTema.Provider>;
}

export function useTema(): ValorTema {
  const valor = useContext(ContextoTema);
  if (!valor) throw new Error("useTema tiene que usarse dentro de TemaProvider");
  return valor;
}

/** Alto mínimo de los botones: cómodo para tocar con una mano. */
export const ALTO_BOTON = 52;
