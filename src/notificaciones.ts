import Constants, { ExecutionEnvironment } from "expo-constants";
import Storage from "expo-sqlite/kv-store";
import { Platform } from "react-native";
import { HORAS_RECORDATORIO } from "@/config/reglas";
import type { ReservaConTurno } from "@/tipos";
import { MODO_MOCK } from "@/servicios/config";
import { registrarDispositivo as anotarEnLaApi } from "@/servicios/api";
import { aInstante, fechaLarga, rangoHoras } from "@/utilidades/fechas";

// Notificaciones locales (las programa el propio teléfono, no hace falta servidor):
//  1. recordatorio 2 horas antes del turno;
//  2. aviso cuando un turno reservado queda suspendido por un bloqueo.
// Si el usuario no da permiso, o si el módulo no existe (pasa en Expo Go), la app funciona igual
// y simplemente no avisa. En el APK instalado sí funcionan.

type Modulo = typeof import("expo-notifications");

const CANAL = "reservas";
const HORA_EN_MS = 3_600_000;

let modulo: Modulo | null | undefined; // undefined = todavía no se intentó cargar

/** Carga expo-notifications recién cuando hace falta. Devuelve null si el teléfono no lo tiene. */
function cargarModulo(): Modulo | null {
  if (modulo === undefined) {
    // Dentro de Expo Go (SDK 57) el módulo nativo de notificaciones no existe y cargarlo
    // muestra un error en pantalla aunque se atrape. Por eso ni se intenta.
    if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
      modulo = null;
      return modulo;
    }
    try {
      // require y no import: así, si falta el módulo nativo, el error se atrapa acá
      // y no tumba toda la app al arrancar.
      modulo = require("expo-notifications") as Modulo;
    } catch {
      modulo = null;
    }
  }
  return modulo;
}

/** Se llama una vez al abrir la app. */
export async function configurarNotificaciones(): Promise<void> {
  const N = cargarModulo();
  if (!N) return;
  try {
    N.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
    if (Platform.OS === "android") {
      await N.setNotificationChannelAsync(CANAL, {
        name: "Reservas",
        importance: N.AndroidImportance.HIGH,
      });
    }
  } catch {
    // sin notificaciones, la app sigue andando
  }
}

async function conPermiso(N: Modulo): Promise<boolean> {
  const estado = await N.getPermissionsAsync();
  if (estado.granted) return true;
  if (!estado.canAskAgain) return false;
  return (await N.requestPermissionsAsync()).granted;
}

function idDelRecordatorio(reservaId: string): string {
  return `recordatorio-${reservaId}`;
}

/** Programa el recordatorio. Devuelve false si no se pudo (sin permiso, sin módulo o aviso ya vencido). */
export async function programarRecordatorio(r: ReservaConTurno): Promise<boolean> {
  const N = cargarModulo();
  if (!N || !r.turno || r.reserva.estado !== "confirmada") return false;

  try {
    const inicio = aInstante(r.turno.fecha, r.turno.inicio);
    const avisarA = new Date(inicio.getTime() - HORAS_RECORDATORIO * HORA_EN_MS);
    if (avisarA.getTime() <= Date.now()) return false;
    if (!(await conPermiso(N))) return false;

    const id = idDelRecordatorio(r.reserva.id);
    await N.cancelScheduledNotificationAsync(id).catch(() => {}); // evita duplicados
    await N.scheduleNotificationAsync({
      identifier: id,
      content: {
        title: "Tu turno es en 2 horas",
        body: `${r.espacio?.nombre ?? "Tu cancha"} · ${rangoHoras(r.turno.inicio, r.turno.fin)}. Mostrale el QR al encargado.`,
        data: { reservaId: r.reserva.id },
      },
      trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: avisarA, channelId: CANAL },
    });
    return true;
  } catch {
    return false;
  }
}

export async function cancelarRecordatorio(reservaId: string): Promise<void> {
  const N = cargarModulo();
  if (!N) return;
  await N.cancelScheduledNotificationAsync(idDelRecordatorio(reservaId)).catch(() => {});
}

/** Deja los recordatorios al día: programa los de reservas confirmadas y quita los demás. */
export async function sincronizarRecordatorios(reservas: ReservaConTurno[]): Promise<void> {
  for (const r of reservas) {
    if (r.reserva.estado === "confirmada") await programarRecordatorio(r).catch(() => {});
    else await cancelarRecordatorio(r.reserva.id);
  }
}

/** Avisa que el turno se suspendió. Una sola vez por reserva (se guarda que ya se avisó). */
export async function avisarSuspension(r: ReservaConTurno, motivo: string): Promise<void> {
  const N = cargarModulo();
  if (!N || !r.turno) return;
  try {
    const clave = `avisado.suspension.${r.reserva.id}`;
    if ((await Storage.getItemAsync(clave)) === "si") return;
    if (!(await conPermiso(N))) return;

    await N.scheduleNotificationAsync({
      content: {
        title: "Tu turno quedó suspendido",
        body: `${r.espacio?.nombre ?? "La cancha"}, ${fechaLarga(r.turno.fecha)}, ${rangoHoras(r.turno.inicio, r.turno.fin)}: ${motivo}.`,
        data: { reservaId: r.reserva.id },
      },
      trigger: null, // null = mostrar ya
    });
    await Storage.setItemAsync(clave, "si");
  } catch {
    // sin notificaciones, la app sigue andando
  }
}

/**
 * Push del servidor (por ejemplo "se liberó un turno"): pide el token de Expo de este teléfono
 * y se lo anota a la API en POST /dispositivos. Todo es "si se puede": sin API real, sin permiso,
 * en Expo Go, sin proyecto de EAS o con la API todavía sin esa parte (responde 501), la app sigue igual.
 * Los recordatorios y avisos locales de arriba no dependen de esto.
 */
export async function registrarTelefonoParaPush(): Promise<void> {
  if (MODO_MOCK) return;
  const N = cargarModulo();
  if (!N) return;
  try {
    const projectId: string | undefined =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return;
    if (!(await conPermiso(N))) return;
    const { data } = await N.getExpoPushTokenAsync({ projectId });
    await anotarEnLaApi(data, Platform.OS === "ios" ? "ios" : "android");
  } catch {
    // sin push del servidor, la app sigue andando
  }
}
