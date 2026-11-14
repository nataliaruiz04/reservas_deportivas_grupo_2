import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ScrollView, useWindowDimensions, View } from "react-native";
import { BotonIcono } from "@/componentes/espacios";
import { GrillaDeTurnos, SelectorDeDia } from "@/componentes/grilla";
import { Foto, ReproductorDeVideo } from "@/componentes/medios";
import {
  AvisoDeConexion,
  Boton,
  Cargando,
  ErrorConReintento,
  Etiqueta,
  Pantalla,
  Tarjeta,
  Texto,
} from "@/componentes/ui";
import { useSesion } from "@/contexto/sesion";
import { DIAS_VISIBLES } from "@/config/reglas";
import { useCarga } from "@/hooks/useCarga";
import { useSinConexion } from "@/hooks/useRed";
import * as authServicio from "@/servicios/auth";
import { listarDeportes, obtenerEspacio } from "@/servicios/espacios";
import { obtenerGrilla } from "@/servicios/turnos";
import { useTema } from "@/tema";
import { mensajeDeError } from "@/utilidades/errores";
import { fechaLarga, hoy, precioTexto, rangoHoras } from "@/utilidades/fechas";
import { resumenDeGrilla, type CeldaGrilla } from "@/utilidades/grilla";
import { abrirComoLlegar } from "@/utilidades/mapas";

export default function FichaDelEspacio() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { paleta } = useTema();
  const { usuario, actualizarUsuario, esPersonal } = useSesion();
  const sinConexion = useSinConexion();
  const { width } = useWindowDimensions();

  const espacio = useCarga(() => obtenerEspacio(id), [id]);
  const deportes = useCarga(() => listarDeportes(), []);

  const [fecha, setFecha] = useState(() => hoy());
  const [ahora, setAhora] = useState(() => new Date());
  const [elegida, setElegida] = useState<CeldaGrilla | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const grilla = useCarga(() => obtenerGrilla(id, fecha), [id, fecha]);
  const recargarGrilla = grilla.recargar;

  // Al volver a esta pantalla (por ejemplo después de reservar) se pide la grilla de nuevo:
  // la disponibilidad nunca se muestra vieja.
  useFocusEffect(
    useCallback(() => {
      setAhora(new Date());
      setElegida(null);
      recargarGrilla();
    }, [recargarGrilla]),
  );

  const datos = espacio.datos;
  const deporte = deportes.datos?.find((d) => d.id === datos?.deporteId);
  const esFavorito = !!datos && (usuario?.espaciosFavoritos.includes(datos.id) ?? false);

  const resumen = useMemo(
    () => (grilla.datos ? resumenDeGrilla(grilla.datos, ahora) : null),
    [grilla.datos, ahora],
  );

  async function alternarFavorito() {
    if (!usuario) {
      router.push("/login");
      return;
    }
    try {
      actualizarUsuario(await authServicio.alternarFavorito(id));
    } catch (e) {
      setAviso(mensajeDeError(e));
    }
  }

  function reservar() {
    if (!elegida || !datos) return;
    // Mirar la disponibilidad no pide cuenta; la cuenta se pide recién en la pantalla de confirmación.
    router.push({
      pathname: "/reservar",
      params: {
        espacioId: datos.id,
        turnoId: elegida.turno.id,
        fecha: elegida.turno.fecha,
        inicio: elegida.turno.inicio,
        fin: elegida.turno.fin,
        precio: String(elegida.turno.precio),
      },
    });
  }

  if (espacio.cargando && !datos) {
    return (
      <Pantalla desplazable={false} bordes={[]}>
        <Cargando texto="Cargando el espacio…" />
      </Pantalla>
    );
  }
  if (espacio.error && !datos) {
    return (
      <Pantalla desplazable={false} bordes={[]}>
        <ErrorConReintento mensaje={espacio.error} alReintentar={espacio.recargar} />
      </Pantalla>
    );
  }
  if (!datos) return null;

  const anchoFoto = width - 32;

  return (
    <Pantalla desplazable={false} relleno={0} bordes={["bottom"]}>
      <Stack.Screen
        options={{
          title: datos.nombre,
          headerRight: () => (
            <BotonIcono
              icono={esFavorito ? "heart" : "heart-outline"}
              descripcion={esFavorito ? "Quitar de favoritos" : "Marcar como favorito"}
              color={esFavorito ? paleta.peligro : paleta.texto}
              alPresionar={alternarFavorito}
            />
          ),
        }}
      />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}>
        <AvisoDeConexion sinConexion={sinConexion} desdeCache={espacio.desdeCache} guardadoEn={espacio.guardadoEn} />

        {datos.imagenes.length > 0 ? (
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {datos.imagenes.map((url) => (
              <View key={url} style={{ width: anchoFoto }}>
                <Foto url={url} alto={200} icono={deporte?.icono} color={deporte?.color} />
              </View>
            ))}
          </ScrollView>
        ) : (
          <Foto url={null} alto={160} icono={deporte?.icono} color={deporte?.color} />
        )}

        <View style={{ gap: 6 }}>
          <Texto titulo>{datos.nombre}</Texto>
          <Texto suave>{datos.complejo}</Texto>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
            <Etiqueta texto={`${precioTexto(datos.precioPorHora)} / hora`} color={paleta.primario} />
            <Etiqueta texto={datos.superficie} color={paleta.textoSuave} icono="layers-outline" />
            <Etiqueta texto={`Hasta ${datos.capacidad} personas`} color={paleta.textoSuave} icono="people-outline" />
            {datos.techado ? <Etiqueta texto="Techado" color={paleta.textoSuave} icono="umbrella-outline" /> : null}
            {datos.iluminacion ? (
              <Etiqueta texto="Con luz de noche" color={paleta.textoSuave} icono="bulb-outline" />
            ) : (
              <Etiqueta texto="Sin luz de noche" color={paleta.aviso} icono="moon-outline" />
            )}
          </View>
        </View>

        <Tarjeta>
          <Texto negrita>Reglas del lugar</Texto>
          <Texto>{datos.reglas}</Texto>
        </Tarjeta>

        {datos.videoUrl ? (
          <View style={{ gap: 8 }}>
            <Texto negrita>Recorrido en video</Texto>
            <ReproductorDeVideo url={datos.videoUrl} />
          </View>
        ) : (
          <Texto suave>Este espacio todavía no tiene video.</Texto>
        )}

        <Boton
          texto="Cómo llegar"
          icono="navigate"
          variante="secundario"
          alPresionar={async () => {
            const abrio = await abrirComoLlegar(datos.coordenadas, datos.nombre);
            setAviso(abrio ? null : "No encontramos una aplicación de mapas para abrir la ruta.");
          }}
        />
        {aviso ? <Texto suave>{aviso}</Texto> : null}

        <View style={{ gap: 12 }}>
          <Texto titulo>Disponibilidad</Texto>
          <SelectorDeDia hoy={hoy(ahora)} elegido={fecha} dias={DIAS_VISIBLES} alElegir={(f) => { setFecha(f); setElegida(null); }} />
          <Texto negrita>{fechaLarga(fecha)}</Texto>

          {grilla.cargando && !grilla.datos ? <Cargando texto="Buscando turnos libres…" /> : null}
          {grilla.error ? (
            <ErrorConReintento mensaje={grilla.error} alReintentar={grilla.recargar} />
          ) : null}

          {grilla.datos && !grilla.error ? (
            <>
              {resumen?.diaBloqueado ? (
                <Tarjeta estilo={{ borderColor: paleta.mantenimiento, borderWidth: 2 }}>
                  <Texto negrita estilo={{ color: paleta.mantenimiento }}>
                    Este día no se puede reservar
                  </Texto>
                  <Texto>{grilla.datos[0]?.turno.motivoBloqueo ?? "El espacio está bloqueado."}</Texto>
                </Tarjeta>
              ) : resumen?.sinLugar ? (
                <Tarjeta>
                  <Texto negrita>No quedan turnos libres este día</Texto>
                  <Texto suave>Probá con otro día de la lista de arriba.</Texto>
                </Tarjeta>
              ) : null}
              <GrillaDeTurnos
                celdas={grilla.datos}
                ahora={ahora}
                elegidoId={elegida?.turno.id ?? null}
                alElegir={(c) => setElegida(c.turno.id === elegida?.turno.id ? null : c)}
              />
            </>
          ) : null}
        </View>
      </ScrollView>

      {elegida ? (
        <View
          style={{
            padding: 16,
            gap: 8,
            borderTopWidth: 1,
            borderColor: paleta.borde,
            backgroundColor: paleta.superficie,
          }}
        >
          <Texto negrita>
            {fechaLarga(elegida.turno.fecha)} · {rangoHoras(elegida.turno.inicio, elegida.turno.fin)} ·{" "}
            {precioTexto(elegida.turno.precio)}
          </Texto>
          {esPersonal ? (
            <Texto suave>Tu cuenta es de personal del complejo: reservá con una cuenta de jugador.</Texto>
          ) : null}
          <Boton
            texto={usuario ? "Reservar este turno" : "Reservar (te pedimos iniciar sesión)"}
            icono="ticket-outline"
            alPresionar={reservar}
          />
        </View>
      ) : null}
    </Pantalla>
  );
}
