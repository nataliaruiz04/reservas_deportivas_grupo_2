import {
  HORAS_LIMITE_CANCELACION,
  MAX_RESERVAS_ACTIVAS,
  POLITICA_CANCELACION_TARDIA,
} from "@/config/reglas";
import type {
  Bloqueo,
  CredencialesLogin,
  DatosRegistro,
  Deporte,
  Espacio,
  FiltroEspacios,
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
import {
  aInstante,
  aISO,
  aMinutos,
  fechaLarga,
  hoy,
  horaDeISO,
} from "@/utilidades/fechas";
import {
  armarGrilla,
  turnoPasado,
  type CeldaGrilla,
} from "@/utilidades/grilla";
import {
  CONTRASENA_DEMO,
  bloqueosIniciales,
  deportes,
  espacios as espaciosIniciales,
  nuevaReserva,
  reservasFijas as fijasIniciales,
  reservasIniciales,
  usuariosIniciales,
} from "./datos";

// Servidor de mentira. Hace lo que va a hacer la API de la cátedra: valida las
// reglas del PRD y guarda el estado en memoria mientras la app está abierta.
// Los servicios (src/servicios) lo llaman hoy; cuando llegue la API, los
// servicios hacen fetch y este archivo deja de usarse. Las pantallas no se enteran.

interface Estado {
  usuarios: Usuario[];
  contrasenas: Map<string, string>;
  espacios: Espacio[];
  reservas: Reserva[];
  fijas: ReservaFija[];
  bloqueos: Bloqueo[];
  contadorUsuarios: number;
  contadorBloqueos: number;
  contadorFijas: number;
}

function crearEstado(ahora: Date): Estado {
  const usuarios = usuariosIniciales();
  return {
    usuarios,
    contrasenas: new Map(usuarios.map((u) => [u.id, CONTRASENA_DEMO])),
    espacios: espaciosIniciales.map((e) => ({ ...e })),
    reservas: reservasIniciales(ahora),
    fijas: fijasIniciales.map((f) => ({ ...f })),
    bloqueos: bloqueosIniciales(ahora),
    contadorUsuarios: 400,
    contadorBloqueos: 100,
    contadorFijas: 100,
  };
}

let estado: Estado = crearEstado(new Date());

/** Vuelve todo al estado inicial. Lo usan las pruebas. */
export function reiniciarServidor(ahora: Date = new Date()): void {
  estado = crearEstado(ahora);
}

// ---------------------------------------------------------------------------
// Sesión
// ---------------------------------------------------------------------------

function clavesDeUsuario(u: Usuario): string[] {
  const email = u.email.toLowerCase();
  return [email, email.split("@")[0]];
}

export function iniciarSesion(c: CredencialesLogin): Sesion {
  const buscado = c.usuario.trim().toLowerCase();
  const usuario = estado.usuarios.find((u) => clavesDeUsuario(u).includes(buscado));
  if (!buscado || !usuario || estado.contrasenas.get(usuario.id) !== c.password) {
    throw new ErrorApi("CREDENCIALES_INVALIDAS", "Usuario o contraseña incorrectos.");
  }
  // Token determinístico: así la sesión guardada en el teléfono sigue valiendo
  // aunque se cierre la app y el servidor de mentira se reinicie.
  return { token: `tok-${usuario.id}`, usuario: { ...usuario } };
}

export function registrarUsuario(d: DatosRegistro): Sesion {
  const email = d.email.trim().toLowerCase();
  if (!d.nombre.trim() || !email.includes("@")) {
    throw new ErrorApi("CREDENCIALES_INVALIDAS", "Completá tu nombre y un email válido.");
  }
  if (d.password.length < 6) {
    throw new ErrorApi("CREDENCIALES_INVALIDAS", "La contraseña tiene que tener al menos 6 caracteres.");
  }
  if (estado.usuarios.some((u) => u.email.toLowerCase() === email)) {
    throw new ErrorApi("EMAIL_EN_USO", "Ya existe una cuenta con ese email.");
  }
  const usuario: Usuario = {
    id: `usr-${++estado.contadorUsuarios}`,
    nombre: d.nombre.trim(),
    email,
    telefono: d.telefono.trim(),
    rol: "jugador",
    espaciosFavoritos: [],
    cancelacionesTardias: 0,
    ausencias: 0,
  };
  estado.usuarios.push(usuario);
  estado.contrasenas.set(usuario.id, d.password);
  return iniciarSesion({ usuario: email, password: d.password });
}

function autenticar(token: string | null): Usuario {
  const id = token?.startsWith("tok-") ? token.slice(4) : undefined;
  const usuario = id ? estado.usuarios.find((u) => u.id === id) : undefined;
  if (!usuario) throw new ErrorApi("NO_AUTORIZADO", "Tenés que iniciar sesión.");
  return usuario;
}

function exigirPersonal(token: string | null): Usuario {
  const u = autenticar(token);
  if (u.rol === "jugador") {
    throw new ErrorApi("NO_AUTORIZADO", "Esta acción es solo para el encargado o el administrador.");
  }
  return u;
}

function exigirAdministrador(token: string | null): Usuario {
  const u = autenticar(token);
  if (u.rol !== "administrador") {
    throw new ErrorApi("NO_AUTORIZADO", "Esta acción es solo para el administrador.");
  }
  return u;
}

export function usuarioActual(token: string | null): Usuario {
  return { ...autenticar(token) };
}

export function alternarFavorito(token: string | null, espacioId: string): Usuario {
  const u = autenticar(token);
  obtenerEspacio(espacioId);
  const ya = u.espaciosFavoritos.includes(espacioId);
  u.espaciosFavoritos = ya
    ? u.espaciosFavoritos.filter((id) => id !== espacioId)
    : [...u.espaciosFavoritos, espacioId];
  return { ...u };
}

// ---------------------------------------------------------------------------
// Espacios y deportes
// ---------------------------------------------------------------------------

export function listarDeportes(): Deporte[] {
  return deportes.map((d) => ({ ...d }));
}

export function listarEspacios(filtro: FiltroEspacios = {}): Espacio[] {
  const texto = filtro.busqueda?.trim().toLowerCase() ?? "";
  return estado.espacios
    .filter((e) => e.activo)
    .filter((e) => !filtro.deporteId || e.deporteId === filtro.deporteId)
    .filter((e) => !filtro.complejo || e.complejo === filtro.complejo)
    .filter(
      (e) =>
        !texto ||
        e.nombre.toLowerCase().includes(texto) ||
        e.complejo.toLowerCase().includes(texto),
    )
    .map((e) => ({ ...e }));
}

export function obtenerEspacio(id: string): Espacio {
  const espacio = estado.espacios.find((e) => e.id === id && e.activo);
  if (!espacio) throw new ErrorApi("ESPACIO_NO_ENCONTRADO", "No existe ese espacio.");
  return { ...espacio };
}

export function cambiarPrecio(token: string | null, espacioId: string, precio: number): Espacio {
  exigirAdministrador(token);
  if (!Number.isFinite(precio) || precio < 0) {
    throw new ErrorApi("CANTIDAD_INVALIDA", "El precio tiene que ser un número mayor o igual a cero.");
  }
  const espacio = estado.espacios.find((e) => e.id === espacioId);
  if (!espacio) throw new ErrorApi("ESPACIO_NO_ENCONTRADO", "No existe ese espacio.");
  espacio.precioPorHora = precio;
  return { ...espacio };
}

// ---------------------------------------------------------------------------
// Grilla y turnos
// ---------------------------------------------------------------------------

const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const FORMATO_TURNO = /^tur-(.+)-(\d{4}-\d{2}-\d{2})-(\d{2})$/;

export function obtenerGrilla(espacioId: string, fecha: string): CeldaGrilla[] {
  if (!FORMATO_FECHA.test(fecha)) {
    throw new ErrorApi("TURNO_NO_ENCONTRADO", "La fecha tiene que ser AAAA-MM-DD.");
  }
  const espacio = obtenerEspacio(espacioId);
  return armarGrilla({
    espacio,
    fecha,
    reservas: estado.reservas,
    fijas: estado.fijas,
    bloqueos: estado.bloqueos,
  });
}

function partirTurnoId(turnoId: string): { espacioId: string; fecha: string; inicio: string } {
  const m = FORMATO_TURNO.exec(turnoId);
  if (!m) throw new ErrorApi("TURNO_NO_ENCONTRADO", "No existe ese turno.");
  return { espacioId: m[1], fecha: m[2], inicio: `${m[3]}:00` };
}

function celdaDeTurno(turnoId: string): CeldaGrilla {
  const { espacioId, fecha } = partirTurnoId(turnoId);
  const celda = obtenerGrilla(espacioId, fecha).find((c) => c.turno.id === turnoId);
  if (!celda) throw new ErrorApi("TURNO_NO_ENCONTRADO", "No existe ese turno.");
  return celda;
}

/** El turno de una reserva, tal como se reservó (aunque después se haya cancelado). */
function turnoDeReserva(r: Reserva, espacio: Espacio | undefined): Turno | null {
  try {
    const { fecha, inicio } = partirTurnoId(r.turnoId);
    const fin = `${String(aMinutos(inicio) / 60 + 1).padStart(2, "0")}:00`;
    return {
      id: r.turnoId,
      espacioId: r.espacioId,
      fecha,
      inicio,
      fin,
      estado: r.estado === "cancelada" ? "libre" : "reservado",
      reservaId: r.estado === "cancelada" ? null : r.id,
      motivoBloqueo: null,
      precio: espacio?.precioPorHora ?? 0,
    };
  } catch {
    return null;
  }
}

function conTurno(r: Reserva): ReservaConTurno {
  const espacio = estado.espacios.find((e) => e.id === r.espacioId);
  return {
    reserva: { ...r },
    espacio: espacio ? { ...espacio } : null,
    turno: turnoDeReserva(r, espacio),
  };
}

function inicioDe(r: Reserva): Date {
  const { fecha, inicio } = partirTurnoId(r.turnoId);
  return aInstante(fecha, inicio);
}

// ---------------------------------------------------------------------------
// Reservas
// ---------------------------------------------------------------------------

function reservaPropia(u: Usuario, id: string): Reserva {
  const r = estado.reservas.find((x) => x.id === id);
  const esPersonal = u.rol !== "jugador";
  if (!r || (r.usuarioId !== u.id && !esPersonal)) {
    throw new ErrorApi("RESERVA_NO_ENCONTRADA", "No existe esa reserva.");
  }
  return r;
}

export function misReservas(token: string | null): ReservaConTurno[] {
  const u = autenticar(token);
  return estado.reservas
    .filter((r) => r.usuarioId === u.id)
    .sort((a, b) => inicioDe(a).getTime() - inicioDe(b).getTime())
    .map(conTurno);
}

export function obtenerReserva(token: string | null, id: string): ReservaConTurno {
  const u = autenticar(token);
  return conTurno(reservaPropia(u, id));
}

export function crearReserva(
  token: string | null,
  pedido: { turnoId: string; cantidadPersonas: number },
  ahora: Date = new Date(),
): ReservaConTurno {
  const u = autenticar(token);
  const { espacioId, fecha, inicio } = partirTurnoId(pedido.turnoId);
  const celda = celdaDeTurno(pedido.turnoId);
  const espacio = obtenerEspacio(espacioId);

  if (turnoPasado(celda.turno, ahora)) {
    throw new ErrorApi("TURNO_PASADO", "Ese turno ya empezó o ya pasó.");
  }
  if (celda.turno.estado === "mantenimiento") {
    throw new ErrorApi(
      "TURNO_OCUPADO",
      `Ese turno está bloqueado: ${celda.turno.motivoBloqueo ?? "mantenimiento"}.`,
    );
  }
  if (celda.turno.estado !== "libre") {
    throw new ErrorApi("TURNO_OCUPADO", "Ese turno ya fue reservado.");
  }
  const personas = pedido.cantidadPersonas;
  if (!Number.isInteger(personas) || personas < 1 || personas > espacio.capacidad) {
    throw new ErrorApi(
      "CANTIDAD_INVALIDA",
      `Indicá entre 1 y ${espacio.capacidad} personas para este espacio.`,
    );
  }
  const activas = estado.reservas.filter(
    (r) =>
      r.usuarioId === u.id &&
      r.estado === "confirmada" &&
      inicioDe(r).getTime() > ahora.getTime(),
  ).length;
  if (activas >= MAX_RESERVAS_ACTIVAS) {
    throw new ErrorApi(
      "LIMITE_RESERVAS",
      `Ya tenés ${MAX_RESERVAS_ACTIVAS} reservas activas. Cancelá una o esperá a que pase para reservar otra.`,
    );
  }

  const reserva = nuevaReserva(
    { usuarioId: u.id, espacioId, fecha, inicio, personas, estado: "confirmada" },
    ahora,
  );
  estado.reservas.push(reserva);
  return conTurno(reserva);
}

export function cancelarReserva(
  token: string | null,
  reservaId: string,
  ahora: Date = new Date(),
): ReservaConTurno {
  const u = autenticar(token);
  const r = reservaPropia(u, reservaId);
  if (r.estado === "cancelada") {
    throw new ErrorApi("RESERVA_CANCELADA", "Esa reserva ya estaba cancelada.");
  }
  if (r.estado !== "confirmada") {
    throw new ErrorApi("RESERVA_NO_CANCELABLE", "Esa reserva ya se usó y no se puede cancelar.");
  }
  if (inicioDe(r).getTime() <= ahora.getTime()) {
    throw new ErrorApi("TURNO_PASADO", "Ese turno ya empezó o ya pasó.");
  }

  const esTarde = ahora.getTime() > new Date(r.cancelableHasta).getTime();
  const dueno = estado.usuarios.find((x) => x.id === r.usuarioId);
  if (esTarde) {
    const esPersonal = u.rol !== "jugador";
    if (!esPersonal && POLITICA_CANCELACION_TARDIA === "bloquear") {
      throw new ErrorApi(
        "CANCELACION_TARDIA",
        `Faltan menos de ${HORAS_LIMITE_CANCELACION} horas para el turno. Ya no se puede cancelar desde la app: avisale al encargado.`,
      );
    }
    // Se cancela igual (lo hizo el personal a pedido, o la política lo permite) y queda marcado.
    if (dueno) dueno.cancelacionesTardias += 1;
  }

  r.estado = "cancelada";
  return conTurno(r);
}

// ---------------------------------------------------------------------------
// Ingreso el día del turno (encargado)
// ---------------------------------------------------------------------------

export function validarIngreso(
  token: string | null,
  codigoQr: string,
  espacioId: string,
  ahora: Date = new Date(),
): ReservaConTurno {
  exigirPersonal(token);
  const codigo = codigoQr.trim();
  const r = estado.reservas.find((x) => x.codigoQr === codigo);
  if (!r) {
    throw new ErrorApi("QR_INVALIDO", "Ese código no es de una reserva de Villaguay.");
  }
  if (r.estado === "cancelada") {
    throw new ErrorApi("RESERVA_CANCELADA", "Esa reserva fue cancelada.");
  }
  if (r.ingresoEn) {
    throw new ErrorApi("YA_INGRESO", `Ese código ya se usó: ingresaron a las ${horaDeISO(r.ingresoEn)}.`);
  }
  const { fecha } = partirTurnoId(r.turnoId);
  if (fecha !== hoy(ahora)) {
    throw new ErrorApi("QR_OTRO_DIA", `Esa reserva es para el ${fechaLarga(fecha)}, no para hoy.`);
  }
  if (r.espacioId !== espacioId) {
    const otro = estado.espacios.find((e) => e.id === r.espacioId);
    throw new ErrorApi(
      "QR_OTRA_CANCHA",
      `Esa reserva es para ${otro?.nombre ?? "otra cancha"}, no para esta.`,
    );
  }
  r.ingresoEn = aISO(ahora);
  r.estado = "cumplida";
  return conTurno(r);
}

export function marcarAusente(
  token: string | null,
  reservaId: string,
  ahora: Date = new Date(),
): ReservaConTurno {
  exigirPersonal(token);
  const r = estado.reservas.find((x) => x.id === reservaId);
  if (!r) throw new ErrorApi("RESERVA_NO_ENCONTRADA", "No existe esa reserva.");
  if (r.estado !== "confirmada") {
    throw new ErrorApi("RESERVA_NO_CANCELABLE", "Solo se puede marcar ausente una reserva confirmada que no ingresó.");
  }
  if (inicioDe(r).getTime() > ahora.getTime()) {
    throw new ErrorApi("TURNO_TODAVIA_NO_EMPEZO", "El turno todavía no empezó.");
  }
  r.estado = "ausente";
  const dueno = estado.usuarios.find((x) => x.id === r.usuarioId);
  if (dueno) dueno.ausencias += 1;
  return conTurno(r);
}

/** Agenda del día de todos los espacios, para el encargado y el administrador. */
export function agendaDelDia(token: string | null, fecha: string): ReservaConTurno[] {
  exigirPersonal(token);
  return estado.reservas
    .filter((r) => r.estado !== "cancelada" && partirTurnoId(r.turnoId).fecha === fecha)
    .sort(
      (a, b) =>
        inicioDe(a).getTime() - inicioDe(b).getTime() ||
        a.espacioId.localeCompare(b.espacioId),
    )
    .map(conTurno);
}

// ---------------------------------------------------------------------------
// Bloqueos y reservas fijas (encargado / administrador)
// ---------------------------------------------------------------------------

export function listarBloqueos(token: string | null, fecha: string): Bloqueo[] {
  exigirPersonal(token);
  return estado.bloqueos.filter((b) => b.fecha === fecha).map((b) => ({ ...b }));
}

export function bloquearTurnos(token: string | null, pedido: PedidoBloqueo): ResultadoBloqueo {
  exigirPersonal(token);
  obtenerEspacio(pedido.espacioId);
  if (!FORMATO_FECHA.test(pedido.fecha)) {
    throw new ErrorApi("TURNO_NO_ENCONTRADO", "La fecha tiene que ser AAAA-MM-DD.");
  }
  if (!pedido.motivo.trim()) {
    throw new ErrorApi("CANTIDAD_INVALIDA", "Escribí el motivo del bloqueo.");
  }
  const diaEntero = pedido.inicio === null || pedido.fin === null;
  if (!diaEntero && aMinutos(pedido.inicio as string) >= aMinutos(pedido.fin as string)) {
    throw new ErrorApi("CANTIDAD_INVALIDA", "La hora de fin tiene que ser posterior a la de inicio.");
  }

  const bloqueo: Bloqueo = {
    id: `blq-${++estado.contadorBloqueos}`,
    espacioId: pedido.espacioId,
    fecha: pedido.fecha,
    inicio: diaEntero ? null : pedido.inicio,
    fin: diaEntero ? null : pedido.fin,
    motivo: pedido.motivo.trim(),
  };
  estado.bloqueos.push(bloqueo);

  const reservasAfectadas = estado.reservas
    .filter((r) => r.estado === "confirmada" && r.espacioId === pedido.espacioId)
    .filter((r) => {
      const t = partirTurnoId(r.turnoId);
      if (t.fecha !== pedido.fecha) return false;
      if (diaEntero) return true;
      const ini = aMinutos(t.inicio);
      return ini >= aMinutos(bloqueo.inicio as string) && ini < aMinutos(bloqueo.fin as string);
    })
    .map(conTurno);

  return { bloqueo: { ...bloqueo }, reservasAfectadas };
}

export function quitarBloqueo(token: string | null, bloqueoId: string): void {
  exigirPersonal(token);
  const i = estado.bloqueos.findIndex((b) => b.id === bloqueoId);
  if (i < 0) throw new ErrorApi("TURNO_NO_ENCONTRADO", "No existe ese bloqueo.");
  estado.bloqueos.splice(i, 1);
}

export function listarReservasFijas(token: string | null): ReservaFija[] {
  exigirPersonal(token);
  return estado.fijas.map((f) => ({ ...f }));
}

export function guardarReservaFija(
  token: string | null,
  fija: Omit<ReservaFija, "id"> & { id?: string },
): ReservaFija {
  exigirPersonal(token);
  obtenerEspacio(fija.espacioId);
  if (aMinutos(fija.inicio) >= aMinutos(fija.fin)) {
    throw new ErrorApi("CANTIDAD_INVALIDA", "La hora de fin tiene que ser posterior a la de inicio.");
  }
  if (fija.id) {
    const actual = estado.fijas.find((f) => f.id === fija.id);
    if (!actual) throw new ErrorApi("TURNO_NO_ENCONTRADO", "No existe esa reserva fija.");
    Object.assign(actual, fija);
    return { ...actual };
  }
  const nueva: ReservaFija = { ...fija, id: `fij-${++estado.contadorFijas}` };
  estado.fijas.push(nueva);
  return { ...nueva };
}
