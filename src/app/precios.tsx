import { useEffect, useState } from "react";
import { Campo } from "@/componentes/formularios";
import { Boton, Cargando, ErrorConReintento, EstadoVacio, Pantalla, Tarjeta, Texto } from "@/componentes/ui";
import { useSesion } from "@/contexto/sesion";
import { useCarga } from "@/hooks/useCarga";
import { listarEspacios } from "@/servicios/espacios";
import { cambiarPrecio } from "@/servicios/personal";
import { useTema } from "@/tema";
import type { Espacio } from "@/tipos";
import { mensajeDeError } from "@/utilidades/errores";
import { precioTexto } from "@/utilidades/fechas";

// Solo el administrador puede cambiar el precio por hora de una cancha.

function FilaDePrecio({ espacio }: { espacio: Espacio }) {
  const { paleta } = useTema();
  const [texto, setTexto] = useState(String(espacio.precioPorHora));
  const [actual, setActual] = useState(espacio.precioPorHora);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    setError(null);
    setOk(false);
    const precio = Number(texto.replace(",", "."));
    if (texto.trim() === "" || !Number.isFinite(precio) || precio < 0) {
      return setError("Escribí un número mayor o igual a cero.");
    }
    setGuardando(true);
    try {
      const guardado = await cambiarPrecio(espacio.id, precio);
      setActual(guardado.precioPorHora);
      setOk(true);
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Tarjeta>
      <Texto negrita>{espacio.nombre}</Texto>
      <Texto suave>
        {espacio.complejo} · hoy {precioTexto(actual)} por hora
      </Texto>
      <Campo etiqueta="Precio por hora ($)" value={texto} onChangeText={setTexto} keyboardType="numeric" />
      {error ? <Texto estilo={{ color: paleta.peligro }}>{error}</Texto> : null}
      {ok ? <Texto estilo={{ color: paleta.exito }}>Precio actualizado.</Texto> : null}
      <Boton texto="Guardar precio" icono="save-outline" cargando={guardando} alPresionar={guardar} />
    </Tarjeta>
  );
}

export default function Precios() {
  const { usuario } = useSesion();
  const espacios = useCarga(() => listarEspacios(), []);

  if (usuario?.rol !== "administrador") {
    return (
      <Pantalla>
        <EstadoVacio icono="lock-closed-outline" titulo="Solo para el administrador" detalle="Entrá con una cuenta de administrador para cambiar precios." />
      </Pantalla>
    );
  }
  if (espacios.cargando && !espacios.datos) {
    return (
      <Pantalla desplazable={false}>
        <Cargando texto="Cargando canchas…" />
      </Pantalla>
    );
  }
  if (espacios.error && !espacios.datos) {
    return (
      <Pantalla desplazable={false}>
        <ErrorConReintento mensaje={espacios.error} alReintentar={espacios.recargar} />
      </Pantalla>
    );
  }

  return (
    <Pantalla>
      <Texto titulo>Precios</Texto>
      <Texto suave>Cambiá el precio por hora de cada cancha. Los turnos nuevos ya salen con el valor actualizado.</Texto>
      {(espacios.datos ?? []).map((e) => (
        <FilaDePrecio key={e.id} espacio={e} />
      ))}
    </Pantalla>
  );
}
