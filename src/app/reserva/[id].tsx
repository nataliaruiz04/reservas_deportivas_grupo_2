import * as Haptics from "expo-haptics";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { EtiquetaDeEstado } from "@/componentes/reservas";
import {
  AvisoDeConexion,
  Boton,
  Cargando,
  ErrorConReintento,
  Pantalla,
  Tarjeta,
  Texto,
} from "@/componentes/ui";
import { POLITICA_CANCELACION_TARDIA } from "@/config/reglas";
import { useCarga } from "@/hooks/useCarga";
import { useSinConexion } from "@/hooks/useRed";
import { cancelarRecordatorio } from "@/notificaciones";
import { cancelarReserva, misReservas } from "@/servicios/reservas";
import { useTema } from "@/tema";
import { ErrorApi, mensajeDeError } from "@/utilidades/errores";
import { fechaLarga, hoy, horaDeISO, precioTexto, rangoHoras } from "@/utilidades/fechas";
import { abrirComoLlegar } from "@/utilidades/mapas";

export default function DetalleDeReserva() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { paleta } = useTema();
  const sinConexion = useSinConexion();

  // Se lee de la lista guardada en el teléfono: así el QR se ve aunque no haya señal en la puerta.
  const carga = useCarga(async () => {
    const lista = await misReservas();
    const encontrada = lista.datos.find((x) => x.reserva.id === id);
    if (!encontrada) throw new ErrorApi("RESERVA_NO_ENCONTRADA", "No encontramos esa reserva.");
    return { datos: encontrada, desdeCache: lista.desdeCache, guardadoEn: lista.guardadoEn };
  }, [id]);
  const recargar = carga.recargar;
  useFocusEffect(useCallback(() => { recargar(); }, [recargar]));

  const [cancelando, setCancelando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  if (carga.cargando && !carga.datos) {
    return (
      <Pantalla desplazable={false} bordes={["bottom"]}>
        <Cargando texto="Cargando tu reserva…" />
      </Pantalla>
    );
  }
  if (!carga.datos) {
    return (
      <Pantalla desplazable={false} bordes={["bottom"]}>
        <ErrorConReintento mensaje={carga.error ?? "No se pudo cargar la reserva."} alReintentar={carga.recargar} />
      </Pantalla>
    );
  }

  const { reserva, espacio, turno } = carga.datos;
  const confirmada = reserva.estado === "confirmada";
  const limite = new Date(reserva.cancelableHasta);
  const ahora = new Date();
  const esTarde = ahora.getTime() > limite.getTime();
  const turnoYaEmpezo = turno ? new Date(`${turno.fecha}T${turno.inicio}:00-03:00`).getTime() <= ahora.getTime() : false;
  const bloqueadaPorTarde = esTarde && POLITICA_CANCELACION_TARDIA === "bloquear";

  function pedirConfirmacion() {
    Alert.alert("¿Cancelar la reserva?", "El turno va a quedar libre para otras personas.", [
      { text: "No, la mantengo", style: "cancel" },
      { text: "Sí, cancelar", style: "destructive", onPress: cancelar },
    ]);
  }

  async function cancelar() {
    setCancelando(true);
    setAviso(null);
    try {
      await cancelarReserva(reserva.id);
      await cancelarRecordatorio(reserva.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      await carga.recargar();
      setAviso("Reserva cancelada. El turno quedó libre.");
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setAviso(mensajeDeError(e));
    } finally {
      setCancelando(false);
    }
  }

  const textoLimite = turno
    ? `${horaDeISO(reserva.cancelableHasta)} hs${
        reserva.cancelableHasta.slice(0, 10) === hoy(ahora) ? " de hoy" : ` del ${fechaLarga(reserva.cancelableHasta.slice(0, 10))}`
      }`
    : "";

  return (
    <Pantalla bordes={["bottom"]}>
      <AvisoDeConexion sinConexion={sinConexion} desdeCache={carga.desdeCache} guardadoEn={carga.guardadoEn} />

      <Tarjeta>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <Texto titulo lineas={2} estilo={{ flex: 1 }}>
            {espacio?.nombre ?? "Espacio"}
          </Texto>
          <EtiquetaDeEstado estado={reserva.estado} />
        </View>
        {espacio ? <Texto suave>{espacio.complejo}</Texto> : null}
        {turno ? (
          <Texto negrita>
            {fechaLarga(turno.fecha)} · {rangoHoras(turno.inicio, turno.fin)}
          </Texto>
        ) : null}
        <Texto>
          {reserva.cantidadPersonas} {reserva.cantidadPersonas === 1 ? "persona" : "personas"}
          {turno ? ` · ${precioTexto(turno.precio)} · se paga en el lugar` : ""}
        </Texto>
        {reserva.ingresoEn ? <Texto suave>Ingresaron a las {horaDeISO(reserva.ingresoEn)} hs.</Texto> : null}
      </Tarjeta>

      {confirmada ? (
        <Tarjeta estilo={{ alignItems: "center" }}>
          <Texto negrita>Mostrale este código al encargado</Texto>
          <View style={{ backgroundColor: "#FFFFFF", padding: 16, borderRadius: 12 }}>
            <QRCode value={reserva.codigoQr} size={220} color="#000000" backgroundColor="#FFFFFF" />
          </View>
          <Texto suave>{reserva.codigoQr}</Texto>
          <Texto suave estilo={{ textAlign: "center" }}>
            Está guardado en tu teléfono: se ve aunque no haya señal.
          </Texto>
        </Tarjeta>
      ) : null}

      {espacio ? (
        <Boton
          texto="Cómo llegar"
          icono="navigate"
          variante="secundario"
          alPresionar={async () => {
            const abrio = await abrirComoLlegar(espacio.coordenadas, espacio.nombre);
            if (!abrio) setAviso("No encontramos una aplicación de mapas para abrir la ruta.");
          }}
        />
      ) : null}

      {confirmada && !turnoYaEmpezo ? (
        <View style={{ gap: 8 }}>
          {bloqueadaPorTarde ? (
            <Tarjeta estilo={{ borderColor: paleta.aviso, borderWidth: 2 }}>
              <Texto negrita>Ya no se puede cancelar desde la app</Texto>
              <Texto>Faltan menos de 4 horas para el turno. Avisale al encargado del complejo.</Texto>
            </Tarjeta>
          ) : (
            <Texto suave>Se puede cancelar sin aviso hasta las {textoLimite}.</Texto>
          )}
          <Boton
            texto="Cancelar reserva"
            icono="close-circle-outline"
            variante="peligro"
            cargando={cancelando}
            deshabilitado={bloqueadaPorTarde}
            alPresionar={pedirConfirmacion}
          />
        </View>
      ) : null}

      {aviso ? (
        <Tarjeta>
          <Texto>{aviso}</Texto>
        </Tarjeta>
      ) : null}

      <Boton texto="Ver todas mis reservas" variante="secundario" alPresionar={() => router.replace("/(tabs)/reservas")} />
    </Pantalla>
  );
}
