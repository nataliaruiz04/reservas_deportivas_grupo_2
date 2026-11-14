import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, TextInput, View } from "react-native";
import { TarjetaEspacio } from "@/componentes/espacios";
import {
  AvisoDeConexion,
  Cargando,
  Chip,
  ErrorConReintento,
  EstadoVacio,
  Icono,
  Pantalla,
  Texto,
} from "@/componentes/ui";
import { useSesion } from "@/contexto/sesion";
import { useCarga } from "@/hooks/useCarga";
import { useSinConexion } from "@/hooks/useRed";
import { useUbicacion } from "@/hooks/useUbicacion";
import { listarDeportes, listarEspacios } from "@/servicios/espacios";
import { ALTO_BOTON, useTema } from "@/tema";
import { distanciaMetros } from "@/utilidades/fechas";

export default function ListaDeEspacios() {
  const router = useRouter();
  const { paleta } = useTema();
  const { usuario } = useSesion();
  const sinConexion = useSinConexion();
  const { coordenadas } = useUbicacion();

  const espacios = useCarga(() => listarEspacios(), []);
  const deportes = useCarga(() => listarDeportes(), []);

  const [deporteId, setDeporteId] = useState<string | null>(null);
  const [complejo, setComplejo] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");

  const complejos = useMemo(
    () => Array.from(new Set((espacios.datos ?? []).map((e) => e.complejo))),
    [espacios.datos],
  );

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    const filtrados = (espacios.datos ?? [])
      .filter((e) => !deporteId || e.deporteId === deporteId)
      .filter((e) => !complejo || e.complejo === complejo)
      .filter(
        (e) =>
          !texto ||
          e.nombre.toLowerCase().includes(texto) ||
          e.complejo.toLowerCase().includes(texto),
      )
      .map((e) => ({
        espacio: e,
        distancia: coordenadas ? distanciaMetros(coordenadas, e.coordenadas) : null,
      }));
    // Con ubicación, lo más cercano primero; sin ella, el orden del catálogo.
    if (coordenadas) filtrados.sort((a, b) => (a.distancia ?? 0) - (b.distancia ?? 0));
    return filtrados;
  }, [espacios.datos, deporteId, complejo, busqueda, coordenadas]);

  const deporteDe = (id: string) => deportes.datos?.find((d) => d.id === id);

  if (espacios.cargando && !espacios.datos) {
    return (
      <Pantalla desplazable={false}>
        <Cargando texto="Buscando espacios…" />
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
      <FlatList
        data={visibles}
        keyExtractor={(item) => item.espacio.id}
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 32 }}
        refreshing={espacios.cargando}
        onRefresh={espacios.recargar}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={{ gap: 12 }}>
            <Texto titulo>Canchas y espacios</Texto>
            <Texto suave>Elegí un espacio para ver qué turnos hay libres. No hace falta cuenta para mirar.</Texto>
            <AvisoDeConexion
              sinConexion={sinConexion}
              desdeCache={espacios.desdeCache}
              guardadoEn={espacios.guardadoEn}
            />
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                borderWidth: 2,
                borderColor: paleta.borde,
                backgroundColor: paleta.superficie,
                borderRadius: 12,
                paddingHorizontal: 12,
                minHeight: ALTO_BOTON,
              }}
            >
              <Icono nombre="search" color={paleta.textoSuave} />
              <TextInput
                value={busqueda}
                onChangeText={setBusqueda}
                placeholder="Buscar por nombre o complejo"
                placeholderTextColor={paleta.textoSuave}
                accessibilityLabel="Buscar espacios"
                style={{ flex: 1, color: paleta.texto, fontSize: 17 }}
              />
            </View>
            <FlatList
              horizontal
              data={deportes.datos ?? []}
              keyExtractor={(d) => d.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
              ListHeaderComponent={
                <Chip texto="Todos" activo={deporteId === null} alPresionar={() => setDeporteId(null)} />
              }
              ItemSeparatorComponent={() => <View style={{ width: 8 }} />}
              renderItem={({ item }) => (
                <Chip
                  texto={item.nombre}
                  icono={item.icono}
                  activo={deporteId === item.id}
                  alPresionar={() => setDeporteId(deporteId === item.id ? null : item.id)}
                />
              )}
            />
            {complejos.length > 1 ? (
              <FlatList
                horizontal
                data={complejos}
                keyExtractor={(c) => c}
                showsHorizontalScrollIndicator={false}
                ItemSeparatorComponent={() => <View style={{ width: 8 }} />}
                ListHeaderComponent={
                  <Chip texto="Todos los complejos" activo={complejo === null} alPresionar={() => setComplejo(null)} />
                }
                renderItem={({ item }) => (
                  <Chip
                    texto={item}
                    icono="business-outline"
                    activo={complejo === item}
                    alPresionar={() => setComplejo(complejo === item ? null : item)}
                  />
                )}
              />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <EstadoVacio
            icono="search-outline"
            titulo="No encontramos espacios con ese filtro"
            detalle="Probá con otro deporte, otro complejo o borrá la búsqueda."
          />
        }
        renderItem={({ item }) => (
          <TarjetaEspacio
            espacio={item.espacio}
            deporte={deporteDe(item.espacio.deporteId)}
            distanciaMetros={item.distancia}
            esFavorito={usuario?.espaciosFavoritos.includes(item.espacio.id) ?? false}
            alPresionar={() => router.push(`/espacio/${item.espacio.id}`)}
          />
        )}
      />
    </Pantalla>
  );
}
