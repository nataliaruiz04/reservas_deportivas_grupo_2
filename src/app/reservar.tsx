import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { Contador } from "@/componentes/formularios";
import { Boton, Cargando, ErrorConReintento, EstadoVacio, Pantalla, Tarjeta, Texto } from "@/componentes/ui";
import { HORAS_LIMITE_CANCELACION, MAX_RESERVAS_ACTIVAS } from "@/config/reglas";
import { useSesion } from "@/contexto/sesion";
import { useCarga } from "@/hooks/useCarga";
import { programarRecordatorio } from "@/notificaciones";
import { obtenerEspacio } from "@/servicios/espacios";
import { crearReserva } from "@/servicios/reservas";
import { useTema } from "@/tema";
import { esErrorApi, mensajeDeError } from "@/utilidades/errores";
import { fechaLarga, precioTexto, rangoHoras } from "@/utilidades/fechas";

export default function ConfirmarReserva() {
  const params = useLocalSearchParams<{
    espacioId: string;
    turnoId: string;
    fecha: string;
    inicio: string;
    fin: string;
    precio: string;
  }>();
  const router = useRouter();
  const { paleta } = useTema();
  const { usuario } = useSesion();
  const espacio = useCarga(() => obtenerEspacio(params.espacioId), [params.espacioId]);

  const [personas, setPersonas] = useState<number | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turnoPerdido, setTurnoPerdido] = useState(false);

  // La cuenta se pide recién acá: para mirar la disponibilidad no hace falta.
  if (!usuario) {
    return (
      <Pantalla bordes={["bottom"]}>
        <EstadoVacio
          icono="person-circle-outline"
          titulo="Para confirmar la reserva necesitás iniciar sesión"
          detalle="Así guardamos tu reserva y te avisamos antes del turno. Mirar la disponibilidad sigue sin necesitar cuenta."
          accion={
            <View style={{ alignSelf: "stretch", gap: 10 }}>
              <Boton texto="Iniciar sesión" icono="log-in-outline" alPresionar={() => router.push("/login")} />
              <Boton texto="Crear cuenta" variante="secundario" alPresionar={() => router.push("/registro")} />
            </View>
          }
        />
      </Pantalla>
    );
  }

  if (espacio.cargando && !espacio.datos) {
    return (
      <Pantalla desplazable={false} bordes={["bottom"]}>
        <Cargando />
      </Pantalla>
    );
  }
  if (!espacio.datos) {
    return (
      <Pantalla desplazable={false} bordes={["bottom"]}>
        <ErrorConReintento mensaje={espacio.error ?? "No se pudo cargar el espacio."} alReintentar={espacio.recargar} />
      </Pantalla>
    );
  }

  const datos = espacio.datos;
  const cantidad = personas ?? datos.capacidad;
  const precio = Number(params.precio);

  async function confirmar() {
    setEnviando(true);
    setError(null);
    try {
      const resultado = await crearReserva({ turnoId: params.turnoId, cantidadPersonas: cantidad });
      // El recordatorio de 2 horas antes se programa acá, con una reserva real recién creada.
      programarRecordatorio(resultado).catch(() => {});
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.replace(`/reserva/${resultado.reserva.id}`);
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setError(mensajeDeError(e));
      if (esErrorApi(e) && (e.codigo === "TURNO_OCUPADO" || e.codigo === "TURNO_PASADO")) setTurnoPerdido(true);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Pantalla bordes={["bottom"]}>
      <Tarjeta>
        <Texto titulo>{datos.nombre}</Texto>
        <Texto suave>{datos.complejo}</Texto>
        <Texto negrita>
          {fechaLarga(params.fecha)} · {rangoHoras(params.inicio, params.fin)}
        </Texto>
        <Texto>
          {precioTexto(precio)} · <Texto negrita>se paga en el lugar</Texto>
        </Texto>
      </Tarjeta>

      <Contador
        etiqueta="¿Cuántos van a ser?"
        valor={cantidad}
        minimo={1}
        maximo={datos.capacidad}
        alCambiar={setPersonas}
        formato={(n) => `${n} ${n === 1 ? "persona" : "personas"}`}
      />

      <Tarjeta>
        <Texto suave>
          Podés cancelar desde la app hasta {HORAS_LIMITE_CANCELACION} horas antes del turno. Después hay que avisar al
          encargado. Cada persona puede tener hasta {MAX_RESERVAS_ACTIVAS} reservas activas.
        </Texto>
      </Tarjeta>

      {error ? (
        <Tarjeta estilo={{ borderColor: paleta.peligro, borderWidth: 2 }}>
          <Texto negrita estilo={{ color: paleta.peligro }}>
            No pudimos confirmar la reserva
          </Texto>
          <Texto>{error}</Texto>
        </Tarjeta>
      ) : null}

      {turnoPerdido ? (
        <Boton texto="Elegir otro turno" icono="arrow-back" alPresionar={() => router.back()} />
      ) : (
        <Boton texto="Confirmar reserva" icono="checkmark" cargando={enviando} alPresionar={confirmar} />
      )}
    </Pantalla>
  );
}
