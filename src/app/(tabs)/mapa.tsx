import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { AvisoDeConexion, Boton, Cargando, ErrorConReintento, Pantalla, Tarjeta, Texto } from "@/componentes/ui";
import { useCarga } from "@/hooks/useCarga";
import { useSinConexion } from "@/hooks/useRed";
import { useUbicacion } from "@/hooks/useUbicacion";
import { listarEspacios } from "@/servicios/espacios";
import type { Coordenadas, Espacio } from "@/tipos";
import { distanciaMetros, distanciaTexto } from "@/utilidades/fechas";
import { abrirComoLlegar } from "@/utilidades/mapas";

interface Complejo {
  nombre: string;
  coordenadas: Coordenadas;
  espacios: Espacio[];
}

// Villaguay, por si no hay ubicación ni complejos para centrar el mapa.
const CENTRO_POR_DEFECTO: Coordenadas = { latitud: -31.8642, longitud: -59.0281 };

export default function Mapa() {
  const router = useRouter();
  const sinConexion = useSinConexion();
  const espacios = useCarga(() => listarEspacios(), []);
  const { coordenadas, permiso } = useUbicacion();
  const [elegido, setElegido] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const complejos = useMemo<Complejo[]>(() => {
    const porNombre = new Map<string, Complejo>();
    for (const e of espacios.datos ?? []) {
      const existente = porNombre.get(e.complejo);
      if (existente) existente.espacios.push(e);
      else porNombre.set(e.complejo, { nombre: e.complejo, coordenadas: e.coordenadas, espacios: [e] });
    }
    return Array.from(porNombre.values());
  }, [espacios.datos]);

  const seleccionado = complejos.find((c) => c.nombre === elegido) ?? null;
  const centro = coordenadas ?? complejos[0]?.coordenadas ?? CENTRO_POR_DEFECTO;

  if (espacios.cargando && !espacios.datos) {
    return (
      <Pantalla desplazable={false}>
        <Cargando texto="Cargando el mapa…" />
      </Pantalla>
    );
  }
  if (espacios.error && !espacios.datos) {
    return (
      <Pantalla desplazable={false}>
        <ErrorConReintento mensaje={espacios.error} alReintentar={espacios.recargar} />
      </Pantalla>
    );
  }

  return (
    <Pantalla desplazable={false} relleno={0}>
      <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 8 }}>
        <Texto titulo>Mapa</Texto>
        <AvisoDeConexion sinConexion={sinConexion} desdeCache={espacios.desdeCache} guardadoEn={espacios.guardadoEn} />
        {permiso === "denegado" ? (
          <Texto suave>Sin tu ubicación no mostramos tu punto ni las distancias, pero el mapa funciona igual.</Texto>
        ) : null}
      </View>
      <View style={{ flex: 1, marginTop: 8 }}>
        <MapView
          style={{ flex: 1 }}
          initialRegion={{
            latitude: centro.latitud,
            longitude: centro.longitud,
            latitudeDelta: 0.03,
            longitudeDelta: 0.03,
          }}
          showsUserLocation={permiso === "concedido"}
          onPress={() => setElegido(null)}
        >
          {complejos.map((c) => (
            <Marker
              key={c.nombre}
              coordinate={{ latitude: c.coordenadas.latitud, longitude: c.coordenadas.longitud }}
              title={c.nombre}
              description={`${c.espacios.length} ${c.espacios.length === 1 ? "espacio" : "espacios"}`}
              onPress={() => {
                setElegido(c.nombre);
                setError(null);
              }}
            />
          ))}
        </MapView>
      </View>
      {seleccionado ? (
        <View style={{ padding: 16 }}>
          <Tarjeta>
            <Texto titulo>{seleccionado.nombre}</Texto>
            <Texto suave>
              {seleccionado.espacios.length} {seleccionado.espacios.length === 1 ? "espacio" : "espacios"}
              {coordenadas ? ` · a ${distanciaTexto(distanciaMetros(coordenadas, seleccionado.coordenadas))}` : ""}
            </Texto>
            {seleccionado.espacios.map((e) => (
              <Boton
                key={e.id}
                texto={e.nombre}
                variante="secundario"
                alPresionar={() => router.push(`/espacio/${e.id}`)}
              />
            ))}
            <Boton
              texto="Cómo llegar"
              icono="navigate"
              alPresionar={async () => {
                const abrio = await abrirComoLlegar(seleccionado.coordenadas, seleccionado.nombre);
                setError(abrio ? null : "No encontramos una aplicación de mapas para abrir la ruta.");
              }}
            />
            {error ? <Texto suave>{error}</Texto> : null}
          </Tarjeta>
        </View>
      ) : null}
    </Pantalla>
  );
}
