import { guardarEnCache, leerDeCache } from "@/almacenamiento/cache";
import type { ConOrigen } from "@/tipos";
import { esSinConexion } from "@/utilidades/errores";

/**
 * Pide los datos a la red y los guarda en el teléfono. Si no hay conexión devuelve la
 * última copia guardada y avisa que es vieja (`desdeCache`), para que la pantalla lo diga.
 * Si tampoco hay copia, el error de red sigue su camino.
 */
export async function conRespaldo<T>(
  clave: string,
  obtener: () => Promise<T>,
): Promise<ConOrigen<T>> {
  try {
    const datos = await obtener();
    guardarEnCache(clave, datos).catch(() => {});
    return { datos, desdeCache: false, guardadoEn: null };
  } catch (e) {
    if (!esSinConexion(e)) throw e;
    const copia = await leerDeCache<T>(clave);
    if (!copia) throw e;
    return { datos: copia.valor, desdeCache: true, guardadoEn: copia.guardadoEn };
  }
}
