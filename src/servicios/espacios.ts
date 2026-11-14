import * as servidor from "@/mocks/servidor";
import type { ConOrigen, Deporte, Espacio } from "@/tipos";
import * as api from "./api";
import { MODO_MOCK } from "./config";
import { contraElMock } from "./ejecutar";
import { conRespaldo } from "./respaldo";

// API real: GET /deportes, GET /espacios, GET /espacios/:id
// El catálogo es chico (11 espacios), así que se trae entero y la pantalla filtra y
// ordena por distancia en el teléfono. Eso además permite filtrar sin conexión.

export function listarDeportes(): Promise<ConOrigen<Deporte[]>> {
  return conRespaldo("deportes", () => (MODO_MOCK ? contraElMock(() => servidor.listarDeportes()) : api.listarDeportes()));
}

export function listarEspacios(): Promise<ConOrigen<Espacio[]>> {
  return conRespaldo("espacios", () => (MODO_MOCK ? contraElMock(() => servidor.listarEspacios()) : api.listarEspacios()));
}

export function obtenerEspacio(id: string): Promise<ConOrigen<Espacio>> {
  return conRespaldo(`espacio:${id}`, () =>
    MODO_MOCK ? contraElMock(() => servidor.obtenerEspacio(id)) : api.obtenerEspacio(id),
  );
}
