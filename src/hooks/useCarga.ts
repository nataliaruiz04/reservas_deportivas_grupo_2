import { useCallback, useEffect, useRef, useState } from "react";
import { mensajeDeError } from "@/utilidades/errores";
import type { ConOrigen } from "@/tipos";

export interface EstadoDeCarga<T> {
  datos: T | null;
  cargando: boolean;
  error: string | null;
  /** true si lo que se muestra salió de la copia guardada en el teléfono. */
  desdeCache: boolean;
  guardadoEn: string | null;
  recargar: () => Promise<void>;
}

function esConOrigen(valor: unknown): valor is ConOrigen<unknown> {
  return (
    typeof valor === "object" &&
    valor !== null &&
    "datos" in valor &&
    "desdeCache" in valor &&
    "guardadoEn" in valor
  );
}

/**
 * Corre una carga asíncrona y expone los tres estados que pide la cátedra: cargando,
 * error (con reintento) y datos. Si la función devuelve un ConOrigen, desempaqueta los
 * datos y avisa si vinieron del caché. Ignora respuestas viejas si cambian los parámetros.
 */
export function useCarga<T>(
  cargar: () => Promise<T | ConOrigen<T>>,
  dependencias: readonly unknown[],
): EstadoDeCarga<T> {
  const [datos, setDatos] = useState<T | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [desdeCache, setDesdeCache] = useState(false);
  const [guardadoEn, setGuardadoEn] = useState<string | null>(null);
  const numeroDePedido = useRef(0);

  const recargar = useCallback(async () => {
    const pedido = ++numeroDePedido.current;
    setCargando(true);
    setError(null);
    try {
      const resultado = await cargar();
      if (pedido !== numeroDePedido.current) return;
      if (esConOrigen(resultado)) {
        setDatos(resultado.datos as T);
        setDesdeCache(resultado.desdeCache);
        setGuardadoEn(resultado.guardadoEn);
      } else {
        setDatos(resultado as T);
        setDesdeCache(false);
        setGuardadoEn(null);
      }
    } catch (e) {
      if (pedido !== numeroDePedido.current) return;
      setError(mensajeDeError(e));
    } finally {
      if (pedido === numeroDePedido.current) setCargando(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencias);

  useEffect(() => {
    recargar();
  }, [recargar]);

  return { datos, cargando, error, desdeCache, guardadoEn, recargar };
}
