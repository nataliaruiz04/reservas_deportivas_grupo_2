import type {
  Bloqueo,
  CredencialesLogin,
  DatosRegistro,
  Deporte,
  Espacio,
  PedidoBloqueo,
  Reserva,
  ReservaConTurno,
  ReservaFija,
  ResultadoBloqueo,
  Sesion,
  Turno,
  Usuario,
} from "@/tipos";
import { ErrorApi } from "@/utilidades/errores";
import { aMinutos } from "@/utilidades/fechas";
import type { CeldaGrilla } from "@/utilidades/grilla";
import { pedir } from "./cliente";

// Las llamadas a la API REAL de la cátedra (repositorio api-reservas-deportivas).
// Cada función de acá tiene su gemela en src/mocks/servidor.ts con la misma forma de
// resultado, así que las pantallas no se enteran de cuál de las dos se está usando.
// Los servicios (auth.ts, espacios.ts, ...) eligen según MODO_MOCK de config.ts.

// ---------------------------------------------------------------------------
// Base: token + sobre de respuesta
// ---------------------------------------------------------------------------

type ProveedorDeToken = () => Promise<string | null>;

/** Por defecto el token sale de expo-secure-store; las pruebas en Node lo reemplazan. */
let proveedorDeToken: ProveedorDeToken = async () => {
  // require diferido: así este archivo se puede cargar fuera del teléfono.
  const { leerToken } = require("@/almacenamiento/sesion") as typeof import("@/almacenamiento/sesion");
  return leerToken();
};

export function configurarProveedorDeToken(proveedor: ProveedorDeToken): void {
  proveedorDeToken = proveedor;
}

type Consulta = Record<string, string | number | null | undefined>;

async function llamar<T>(
  ruta: string,
  opciones: { metodo?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"; cuerpo?: unknown; consulta?: Consulta } = {},
): Promise<T> {
  const token = await proveedorDeToken();
  const respuesta = await pedir<T>(ruta, { ...opciones, token });
  return respuesta.datos;
}

/** Listas: la API pagina (máximo 100 por página). Con 11 espacios y 16 turnos alcanza con pedir una página grande. */
function lista<T>(ruta: string, consulta: Consulta = {}): Promise<T[]> {
  return llamar<T[]>(ruta, { consulta: { porPagina: 100, ...consulta } });
}

// ---------------------------------------------------------------------------
// Id de turno de la API: tur-<espacioId>-<AAAAMMDD>-<HH>   (ej.: tur-esp-01-20261114-21)
// ---------------------------------------------------------------------------

const FORMATO_TURNO = /^tur-(esp-[A-Za-z0-9_-]+)-(\d{4})(\d{2})(\d{2})-(\d{2})$/;

export function partirTurnoIdApi(turnoId: string): { espacioId: string; fecha: string; inicio: string } | null {
  const m = FORMATO_TURNO.exec(turnoId);
  if (!m) return null;
  return { espacioId: m[1], fecha: `${m[2]}-${m[3]}-${m[4]}`, inicio: `${m[5]}:00` };
}

function horaSiguiente(inicio: string): string {
  const hora = Number(inicio.slice(0, 2)) + 1;
  return `${String(hora).padStart(2, "0")}:00`;
}

// ---------------------------------------------------------------------------
// Espacios y deportes
// ---------------------------------------------------------------------------

export function listarDeportes(): Promise<Deporte[]> {
  return lista<Deporte>("/deportes");
}

export function listarEspacios(): Promise<Espacio[]> {
  return lista<Espacio>("/espacios");
}

export function obtenerEspacio(id: string): Promise<Espacio> {
  return llamar<Espacio>(`/espacios/${encodeURIComponent(id)}`);
}

/** Espacios por id, para completar las reservas. Se guarda en memoria y se refresca si falta alguno. */
let espaciosEnMemoria = new Map<string, Espacio>();

async function espacioPorId(id: string): Promise<Espacio | null> {
  let espacio = espaciosEnMemoria.get(id);
  if (!espacio) {
    try {
      espaciosEnMemoria = new Map((await listarEspacios()).map((e) => [e.id, e]));
    } catch (e) {
      if (e instanceof ErrorApi) return null;
      throw e;
    }
    espacio = espaciosEnMemoria.get(id);
  }
  return espacio ?? null;
}

export async function cambiarPrecio(espacioId: string, precio: number): Promise<Espacio> {
  const espacio = await llamar<Espacio>(`/espacios/${encodeURIComponent(espacioId)}`, {
    metodo: "PATCH",
    cuerpo: { precioPorHora: precio },
  });
  espaciosEnMemoria.set(espacio.id, espacio);
  return espacio;
}

// ---------------------------------------------------------------------------
// Turnos
// ---------------------------------------------------------------------------

export async function obtenerGrilla(espacioId: string, fecha: string): Promise<CeldaGrilla[]> {
  const turnos = await lista<Turno>(`/espacios/${encodeURIComponent(espacioId)}/turnos`, { fecha });
  // La API ya cruza reservas, fijas y bloqueos. El Turno del PRD no trae el titular de una fija.
  return turnos.map((turno) => ({ turno, titularFija: null }));
}

// ---------------------------------------------------------------------------
// Reservas
// ---------------------------------------------------------------------------

/** La API devuelve la Reserva con ids; la app muestra espacio y turno, así que se completan acá. */
async function conTurno(reserva: Reserva): Promise<ReservaConTurno> {
  const espacio = await espacioPorId(reserva.espacioId);
  const partes = partirTurnoIdApi(reserva.turnoId);
  const turno: Turno | null = partes
    ? {
        id: reserva.turnoId,
        espacioId: reserva.espacioId,
        fecha: partes.fecha,
        inicio: partes.inicio,
        fin: horaSiguiente(partes.inicio),
        estado: "reservado",
        reservaId: reserva.id,
        motivoBloqueo: null,
        precio: espacio?.precioPorHora ?? 0,
      }
    : null;
  return { reserva, espacio, turno };
}

function conTurnos(reservas: Reserva[]): Promise<ReservaConTurno[]> {
  return Promise.all(reservas.map(conTurno));
}

function inicioDe(r: ReservaConTurno): string {
  return r.turno ? `${r.turno.fecha}T${r.turno.inicio}` : "";
}

export async function misReservas(): Promise<ReservaConTurno[]> {
  const [proximas, pasadas] = await Promise.all([
    lista<Reserva>("/yo/reservas", { cuando: "proximas" }),
    lista<Reserva>("/yo/reservas", { cuando: "pasadas" }),
  ]);
  const todas = await conTurnos([...proximas, ...pasadas]);
  return todas.sort((a, b) => inicioDe(a).localeCompare(inicioDe(b)));
}

export async function obtenerReserva(id: string): Promise<ReservaConTurno> {
  return conTurno(await llamar<Reserva>(`/reservas/${encodeURIComponent(id)}`));
}

export async function crearReserva(pedido: { turnoId: string; cantidadPersonas: number }): Promise<ReservaConTurno> {
  return conTurno(await llamar<Reserva>("/reservas", { metodo: "POST", cuerpo: pedido }));
}

export async function cancelarReserva(reservaId: string): Promise<ReservaConTurno> {
  return conTurno(
    await llamar<Reserva>(`/reservas/${encodeURIComponent(reservaId)}/cancelacion`, { metodo: "POST", cuerpo: {} }),
  );
}

// ---------------------------------------------------------------------------
// Sesión
// ---------------------------------------------------------------------------

export function iniciarSesion(c: CredencialesLogin): Promise<Sesion> {
  // La API entra con email y contraseña. En la pantalla el campo se llama "usuario".
  return llamar<Sesion>("/auth/ingreso", {
    metodo: "POST",
    cuerpo: { email: c.usuario.trim().toLowerCase(), contrasena: c.password },
  });
}

export function registrarUsuario(d: DatosRegistro): Promise<Sesion> {
  return llamar<Sesion>("/auth/registro", {
    metodo: "POST",
    cuerpo: { nombre: d.nombre.trim(), email: d.email.trim().toLowerCase(), contrasena: d.password, telefono: d.telefono.trim() },
  });
}

export function usuarioActual(): Promise<Usuario> {
  return llamar<Usuario>("/yo");
}

/** Si el espacio ya es favorito lo saca; si no, lo agrega. Devuelve el usuario actualizado. */
export async function alternarFavorito(espacioId: string, yaEsFavorito: boolean): Promise<Usuario> {
  const ruta = `/yo/espacios-favoritos/${encodeURIComponent(espacioId)}`;
  if (yaEsFavorito) {
    await llamar<null>(ruta, { metodo: "DELETE" });
    return usuarioActual();
  }
  return llamar<Usuario>(ruta, { metodo: "PUT" });
}

// ---------------------------------------------------------------------------
// Encargado y administrador
// ---------------------------------------------------------------------------

export async function validarIngreso(codigoQr: string, espacioId: string): Promise<ReservaConTurno> {
  return conTurno(await llamar<Reserva>("/ingresos", { metodo: "POST", cuerpo: { codigoQr: codigoQr.trim(), espacioId } }));
}

export async function marcarAusente(reservaId: string): Promise<ReservaConTurno> {
  return conTurno(await llamar<Reserva>(`/reservas/${encodeURIComponent(reservaId)}/ausente`, { metodo: "POST", cuerpo: {} }));
}

export async function agendaDelDia(fecha: string): Promise<ReservaConTurno[]> {
  const reservas = await lista<Reserva>("/reservas", { fecha });
  const completas = await conTurnos(reservas.filter((r) => r.estado !== "cancelada"));
  return completas.sort(
    (a, b) => inicioDe(a).localeCompare(inicioDe(b)) || a.reserva.espacioId.localeCompare(b.reserva.espacioId),
  );
}

export async function listarBloqueos(fecha: string): Promise<Bloqueo[]> {
  const bloqueos = await lista<Bloqueo>("/bloqueos", { desde: fecha });
  return bloqueos.filter((b) => b.fecha === fecha);
}

export async function bloquearTurnos(pedido: PedidoBloqueo): Promise<ResultadoBloqueo> {
  // La API cancela las reservas confirmadas dentro del bloqueo, pero no dice cuáles.
  // Se miran antes para poder avisarle al encargado a quiénes hay que llamar.
  const delDia = await lista<Reserva>("/reservas", { fecha: pedido.fecha, espacioId: pedido.espacioId });
  const afectadas = (await conTurnos(delDia.filter((r) => r.estado === "confirmada"))).filter((r) => {
    if (!r.turno) return false;
    if (pedido.inicio === null || pedido.fin === null) return true;
    return aMinutos(r.turno.inicio) < aMinutos(pedido.fin) && aMinutos(r.turno.fin) > aMinutos(pedido.inicio);
  });

  const cuerpo: Record<string, unknown> = {
    espacioIds: [pedido.espacioId],
    fecha: pedido.fecha,
    motivo: pedido.motivo.trim(),
  };
  if (pedido.inicio !== null && pedido.fin !== null) {
    cuerpo.inicio = pedido.inicio;
    cuerpo.fin = pedido.fin;
  }
  const creados = await llamar<Bloqueo[]>("/bloqueos", { metodo: "POST", cuerpo });
  return { bloqueo: creados[0], reservasAfectadas: afectadas };
}

export async function quitarBloqueo(bloqueoId: string): Promise<void> {
  await llamar<null>(`/bloqueos/${encodeURIComponent(bloqueoId)}`, { metodo: "DELETE" });
}

export function listarReservasFijas(): Promise<ReservaFija[]> {
  return lista<ReservaFija>("/fijas");
}

export function guardarReservaFija(fija: Omit<ReservaFija, "id"> & { id?: string }): Promise<ReservaFija> {
  const { id, ...campos } = fija;
  if (id) {
    // El espacio de una fija no se edita.
    const { espacioId: _espacioId, ...editables } = campos;
    return llamar<ReservaFija>(`/fijas/${encodeURIComponent(id)}`, { metodo: "PATCH", cuerpo: editables });
  }
  const { activa: _activa, ...nueva } = campos;
  return llamar<ReservaFija>("/fijas", { metodo: "POST", cuerpo: nueva });
}

// ---------------------------------------------------------------------------
// Notificaciones push del servidor
// ---------------------------------------------------------------------------

/** Anota el token de Expo de este teléfono. La API responde 501 hasta que el grupo programe esa parte. */
export async function registrarDispositivo(tokenExpo: string, plataforma: "ios" | "android"): Promise<void> {
  await llamar<unknown>("/dispositivos", { metodo: "POST", cuerpo: { tokenExpo, plataforma } });
}

export async function darDeBajaDispositivo(tokenExpo: string): Promise<void> {
  await llamar<null>(`/dispositivos/${encodeURIComponent(tokenExpo)}`, { metodo: "DELETE" });
}
