import * as Location from "expo-location";
import { useCallback, useEffect, useState } from "react";
import type { Coordenadas } from "@/tipos";

export type PermisoUbicacion = "desconocido" | "concedido" | "denegado";

/**
 * Pide la ubicación una vez. Si la persona la niega, o el GPS está apagado, la app
 * sigue andando: simplemente no aparece "a X metros" ni el punto en el mapa.
 */
export function useUbicacion() {
  const [coordenadas, setCoordenadas] = useState<Coordenadas | null>(null);
  const [permiso, setPermiso] = useState<PermisoUbicacion>("desconocido");

  const pedir = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setPermiso("denegado");
        return;
      }
      setPermiso("concedido");
      const posicion = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setCoordenadas({
        latitud: posicion.coords.latitude,
        longitud: posicion.coords.longitude,
      });
    } catch {
      // GPS apagado o sin señal: seguimos sin ubicación.
    }
  }, []);

  useEffect(() => {
    pedir();
  }, [pedir]);

  return { coordenadas, permiso, pedir };
}
