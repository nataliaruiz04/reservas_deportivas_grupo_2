import * as servidor from "@/mocks/servidor";
import type { CeldaGrilla } from "@/utilidades/grilla";
import * as api from "./api";
import { MODO_MOCK } from "./config";
import { contraElMock } from "./ejecutar";

// API: GET /espacios/:id/turnos?fecha=AAAA-MM-DD
// La disponibilidad NO se guarda en el teléfono: un horario viejo mostraría libre lo
// que ya está tomado. Sin conexión, la pantalla muestra el error y deja reintentar.

export function obtenerGrilla(espacioId: string, fecha: string): Promise<CeldaGrilla[]> {
  return MODO_MOCK ? contraElMock(() => servidor.obtenerGrilla(espacioId, fecha)) : api.obtenerGrilla(espacioId, fecha);
}
