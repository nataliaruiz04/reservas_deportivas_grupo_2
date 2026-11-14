import axios, { type AxiosResponse } from "axios";
import type { RespuestaExito, RespuestaError } from "@/tipos";
import { ErrorApi } from "@/utilidades/errores";
import { TIEMPO_MAXIMO_MS, URL_BASE } from "./config";



type Metodo = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface Opciones {
  metodo?: Metodo;
  cuerpo?: unknown;
  token?: string | null;
  consulta?: Record<string, string | number | null | undefined>;
}

function armarUrl(ruta: string, consulta?: Opciones["consulta"]): string {
  const url = new URL(ruta, URL_BASE);
  for (const [clave, valor] of Object.entries(consulta ?? {})) {
    if (valor !== null && valor !== undefined) url.searchParams.set(clave, String(valor));
  }
  return url.toString();
}

export async function pedir<T>(ruta: string, opciones: Opciones = {}): Promise<RespuestaExito<T>> {
  const { metodo = "GET", cuerpo, token, consulta } = opciones;
  const cabeceras: Record<string, string> = { Accept: "application/json" };
  if (cuerpo !== undefined) cabeceras["Content-Type"] = "application/json";
  if (token) cabeceras.Authorization = `Bearer ${token}`;

  let respuesta: AxiosResponse<unknown>;
  try {
    respuesta = await axios.request<unknown>({
      url: armarUrl(ruta, consulta),
      method: metodo,
      headers: cabeceras,
      data: cuerpo,
      // Si el servidor no contesta a tiempo se corta, para que la pantalla muestre el error y deje reintentar.
      timeout: TIEMPO_MAXIMO_MS,
      // Axios tira error con cualquier 4xx o 5xx. Acá no: la API explica el problema en el cuerpo
      // ({ error: { codigo, mensaje } }) y lo leemos nosotros. Solo la falta de red es un error de axios.
      validateStatus: () => true,
    });
  } catch {
    throw new ErrorApi("SIN_CONEXION", "No hay conexión. Revisá tu internet e intentá de nuevo.");
  }

  // DELETE que sale bien: 204 sin cuerpo.
  if (respuesta.status === 204) return { datos: null as T };

  const json = respuesta.data;
  if (typeof json === "object" && json !== null && "error" in json) {
    const { codigo, mensaje } = (json as RespuestaError).error;
    throw new ErrorApi(codigo, mensaje);
  }
  const ok = respuesta.status >= 200 && respuesta.status < 300;
  if (!ok || typeof json !== "object" || json === null || !("datos" in json)) {
    throw new ErrorApi("RESPUESTA_INVALIDA", "El servidor respondió algo que la app no entiende.");
  }
  return json as RespuestaExito<T>;
}
