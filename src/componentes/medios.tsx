import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { descargarMedio, fuenteDe, rutaLocalDe } from "@/almacenamiento/archivos";
import { useTema } from "@/tema";
import { imagenLocal } from "@/utilidades/imagenesLocales";
import { Boton, Icono, Texto } from "./ui";

/** Foto de una cancha. Si no hay foto o no carga, muestra un cuadro de color con un ícono. */
export function Foto({
  url, alto = 180, icono = "image-outline", color,
}: {
  url: string | null | undefined;
  alto?: number;
  icono?: string;
  color?: string;
}) {
  const { paleta } = useTema();
  const [fallo, setFallo] = useState(false);

  return (
    <View style={[estilos.foto, { height: alto, backgroundColor: color ?? paleta.borde }]}>
      {url && !fallo ? (
        <Image
          source={imagenLocal(url) ?? { uri: fuenteDe(url) }} // imagen de la app, o copia local si ya se descargó
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
          onError={() => setFallo(true)}
        />
      ) : (
        <View style={estilos.centro}>
          <Icono nombre={icono} tamano={40} color="#FFFFFF" />
          {!url ? <Texto estilo={{ color: "#FFFFFF" }}>Sin foto</Texto> : null}
        </View>
      )}
    </View>
  );
}

/** Video de la cancha con controles de reproducción, y botón para guardarlo y verlo sin datos. */
export function ReproductorDeVideo({ url }: { url: string }) {
  const { paleta } = useTema();
  const [guardado, setGuardado] = useState(rutaLocalDe(url) !== null);
  const [descargando, setDescargando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [fallo, setFallo] = useState(false);

  const player = useVideoPlayer(fuenteDe(url), (p) => {
    p.loop = false;
  });

  // El reproductor avisa cuando cambia de estado; si es "error" mostramos el cartel.
  useEffect(() => {
    const suscripcion = player.addListener("statusChange", ({ status }) => setFallo(status === "error"));
    return () => suscripcion.remove();
  }, [player]);

  async function guardar() {
    setDescargando(true);
    setMensaje(null);
    try {
      await descargarMedio(url);
      setGuardado(true);
      setMensaje("Listo: el video quedó guardado en tu teléfono.");
    } catch {
      setMensaje("No se pudo guardar el video. Revisá tu conexión e intentá de nuevo.");
    } finally {
      setDescargando(false);
    }
  }

  return (
    <View style={{ gap: 10 }}>
      <View style={[estilos.video, { borderColor: paleta.borde }]}>
        <VideoView player={player} style={StyleSheet.absoluteFill} nativeControls contentFit="contain" />
        {fallo ? (
          <View style={[StyleSheet.absoluteFill, estilos.centro, { backgroundColor: "#000000CC" }]}>
            <Icono nombre="videocam-off-outline" tamano={36} color="#FFFFFF" />
            <Texto estilo={{ color: "#FFFFFF", textAlign: "center" }}>
              No se pudo cargar el video. Sin conexión solo se ve si lo guardaste antes.
            </Texto>
          </View>
        ) : null}
      </View>

      {guardado ? (
        <Texto suave>Video guardado en tu teléfono: se ve sin datos.</Texto>
      ) : (
        <Boton
          texto="Guardar para verlo sin datos"
          icono="download-outline"
          variante="secundario"
          cargando={descargando}
          alPresionar={guardar}
        />
      )}
      {mensaje ? <Texto suave>{mensaje}</Texto> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  foto: { width: "100%", borderRadius: 14, overflow: "hidden" },
  centro: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, padding: 12 },
  video: { width: "100%", aspectRatio: 16 / 9, borderRadius: 14, overflow: "hidden", borderWidth: 1, backgroundColor: "#000000" },
});
