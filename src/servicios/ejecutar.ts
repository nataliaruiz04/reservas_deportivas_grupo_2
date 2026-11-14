import { esperar, redCaida } from "@/mocks/red";
import { leerToken } from "@/almacenamiento/sesion";
import { ErrorApi } from "@/utilidades/errores";
import { LATENCIA_MS } from "./config";

/**
 * Corre una acción contra el servidor de mentira como si fuera una llamada de red:
 * con demora, con posibilidad de "sin conexión" y con el token de la sesión guardada.
 * Es el único lugar que conoce ese truco; al pasar a la API real deja de usarse.
 */
export async function contraElMock<T>(accion: (token: string | null) => T): Promise<T> {
  await esperar(LATENCIA_MS);
  if (redCaida()) {
    throw new ErrorApi("SIN_CONEXION", "No hay conexión. Revisá tu internet e intentá de nuevo.");
  }
  const token = await leerToken();
  return accion(token);
}
