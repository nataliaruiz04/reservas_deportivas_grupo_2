import type { CodigoError, RespuestaError } from "@/tipos";

/** Error con la misma forma que devuelve la API: un código y un mensaje legible. */
export class ErrorApi extends Error {
  readonly codigo: CodigoError;

  constructor(codigo: CodigoError, mensaje: string) {
    super(mensaje);
    this.name = "ErrorApi";
    this.codigo = codigo;
  }
}

export function esErrorApi(e: unknown): e is ErrorApi {
  return e instanceof ErrorApi;
}

export function esSinConexion(e: unknown): boolean {
  return esErrorApi(e) && e.codigo === "SIN_CONEXION";
}

/** Convierte cualquier cosa que se haya tirado en un texto para mostrar en pantalla. */
export function mensajeDeError(e: unknown): string {
  if (esErrorApi(e)) return e.message;
  if (e instanceof Error) return e.message;
  return "Ocurrió un error inesperado. Probá de nuevo.";
}

/** Arma el cuerpo de error del PRD: { error: { codigo, mensaje } }. */
export function cuerpoDeError(e: ErrorApi): RespuestaError {
  return { error: { codigo: e.codigo, mensaje: e.message } };
}
