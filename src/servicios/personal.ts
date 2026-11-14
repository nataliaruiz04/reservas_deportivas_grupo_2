import * as servidor from "@/mocks/servidor";
import type {
  Bloqueo,
  Espacio,
  PedidoBloqueo,
  ReservaConTurno,
  ReservaFija,
  ResultadoBloqueo,
} from "@/tipos";
import * as api from "./api";
import { MODO_MOCK } from "./config";
import { contraElMock } from "./ejecutar";

// Todo lo que hace la cuenta de encargado o de administrador.
// API real: POST /ingresos, POST /reservas/:id/ausente, GET /agenda?fecha=, /bloqueos, /reservas-fijas ...

export function validarIngreso(codigoQr: string, espacioId: string): Promise<ReservaConTurno> {
  return MODO_MOCK ? contraElMock((t) => servidor.validarIngreso(t, codigoQr, espacioId)) : api.validarIngreso(codigoQr, espacioId);
}

export function marcarAusente(reservaId: string): Promise<ReservaConTurno> {
  return MODO_MOCK ? contraElMock((t) => servidor.marcarAusente(t, reservaId)) : api.marcarAusente(reservaId);
}

export function agendaDelDia(fecha: string): Promise<ReservaConTurno[]> {
  return MODO_MOCK ? contraElMock((t) => servidor.agendaDelDia(t, fecha)) : api.agendaDelDia(fecha);
}

export function listarBloqueos(fecha: string): Promise<Bloqueo[]> {
  return MODO_MOCK ? contraElMock((t) => servidor.listarBloqueos(t, fecha)) : api.listarBloqueos(fecha);
}

export function bloquearTurnos(pedido: PedidoBloqueo): Promise<ResultadoBloqueo> {
  return MODO_MOCK ? contraElMock((t) => servidor.bloquearTurnos(t, pedido)) : api.bloquearTurnos(pedido);
}

export function quitarBloqueo(bloqueoId: string): Promise<void> {
  return MODO_MOCK ? contraElMock((t) => servidor.quitarBloqueo(t, bloqueoId)) : api.quitarBloqueo(bloqueoId);
}

export function listarReservasFijas(): Promise<ReservaFija[]> {
  return MODO_MOCK ? contraElMock((t) => servidor.listarReservasFijas(t)) : api.listarReservasFijas();
}

export function guardarReservaFija(
  fija: Omit<ReservaFija, "id"> & { id?: string },
): Promise<ReservaFija> {
  return MODO_MOCK ? contraElMock((t) => servidor.guardarReservaFija(t, fija)) : api.guardarReservaFija(fija);
}

export function cambiarPrecio(espacioId: string, precio: number): Promise<Espacio> {
  return MODO_MOCK ? contraElMock((t) => servidor.cambiarPrecio(t, espacioId, precio)) : api.cambiarPrecio(espacioId, precio);
}
