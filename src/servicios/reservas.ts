import { leerUsuarioGuardado } from "@/almacenamiento/sesion";
import * as servidor from "@/mocks/servidor";
import type { ConOrigen, ReservaConTurno } from "@/tipos";
import * as api from "./api";
import { MODO_MOCK } from "./config";
import { contraElMock } from "./ejecutar";
import { conRespaldo } from "./respaldo";

// API: GET /reservas (las mías), POST /reservas, GET /reservas/:id, DELETE /reservas/:id
// Las reservas y su código QR se guardan en el teléfono: el QR se muestra en la puerta
// de la cancha, donde la señal es mala.

async function claveDeMisReservas(): Promise<string> {
  const usuario = await leerUsuarioGuardado();
  return `reservas:${usuario?.id ?? "anonimo"}`;
}

export async function misReservas(): Promise<ConOrigen<ReservaConTurno[]>> {
  const clave = await claveDeMisReservas();
  return conRespaldo(clave, () => (MODO_MOCK ? contraElMock((t) => servidor.misReservas(t)) : api.misReservas()));
}

export async function obtenerReserva(id: string): Promise<ConOrigen<ReservaConTurno>> {
  return conRespaldo(`${await claveDeMisReservas()}:${id}`, () =>
    MODO_MOCK ? contraElMock((t) => servidor.obtenerReserva(t, id)) : api.obtenerReserva(id),
  );
}

export function crearReserva(pedido: {
  turnoId: string;
  cantidadPersonas: number;
}): Promise<ReservaConTurno> {
  return MODO_MOCK ? contraElMock((t) => servidor.crearReserva(t, pedido)) : api.crearReserva(pedido);
}

export function cancelarReserva(reservaId: string): Promise<ReservaConTurno> {
  return MODO_MOCK ? contraElMock((t) => servidor.cancelarReserva(t, reservaId)) : api.cancelarReserva(reservaId);
}
