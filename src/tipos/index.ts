// Tipos del PRD "Reservas Deportivas" (Villaguay). Se escriben una sola vez acá
// y no se tocan cuando llegue la API de la cátedra.

export interface Coordenadas {
  latitud: number;
  longitud: number;
}

// ---------- Espacio y Deporte ----------

export interface Espacio {
  id: string;
  nombre: string;
  deporteId: string;
  complejo: string;
  superficie: string;
  techado: boolean;
  iluminacion: boolean;
  capacidad: number;
  precioPorHora: number;
  coordenadas: Coordenadas;
  imagenes: string[];
  videoUrl: string | null;
  reglas: string;
  activo: boolean;
}

export interface Deporte {
  id: string;
  nombre: string;
  icono: string; // nombre del ícono de Ionicons
  color: string; // hexadecimal
}

// ---------- Turno ----------

export type EstadoTurno = "libre" | "reservado" | "fijo" | "mantenimiento";

export interface Turno {
  id: string;
  espacioId: string;
  fecha: string; // "AAAA-MM-DD"
  inicio: string; // "HH:MM"
  fin: string;
  estado: EstadoTurno;
  reservaId: string | null;
  motivoBloqueo: string | null;
  precio: number;
}

// ---------- Reserva ----------

export type EstadoReserva = "confirmada" | "cancelada" | "cumplida" | "ausente";

export interface Reserva {
  id: string;
  turnoId: string;
  espacioId: string;
  usuarioId: string;
  cantidadPersonas: number;
  codigoQr: string;
  estado: EstadoReserva;
  ingresoEn: string | null;
  creadaEn: string;
  cancelableHasta: string;
}

export interface ReservaFija {
  id: string;
  espacioId: string;
  titular: string;
  dia: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = domingo
  inicio: string;
  fin: string;
  desde: string;
  hasta: string | null;
  activa: boolean;
}

// ---------- Usuario ----------

export type Rol = "jugador" | "encargado" | "administrador";

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  rol: Rol;
  espaciosFavoritos: string[];
  cancelacionesTardias: number;
  ausencias: number;
}

// ---------- Forma de las respuestas de la API ----------

export interface MetaPagina {
  total: number;
  pagina: number;
  porPagina: number;
}

export interface RespuestaExito<T> {
  datos: T;
  meta?: MetaPagina;
}

export interface RespuestaError {
  error: { codigo: string; mensaje: string };
}

export type Respuesta<T> = RespuestaExito<T> | RespuestaError;

// Códigos de error que usa el PRD, más los propios de la app.
export type CodigoError =
  | "TURNO_OCUPADO"
  | "RESERVA_NO_ENCONTRADA"
  | "CANCELACION_TARDIA"
  | "LIMITE_RESERVAS"
  | "TURNO_PASADO"
  | "QR_INVALIDO"
  | "QR_OTRO_DIA"
  | "QR_OTRA_CANCHA"
  | "RESERVA_CANCELADA"
  | "YA_INGRESO"
  | "ESPACIO_NO_ENCONTRADO"
  | "TURNO_NO_ENCONTRADO"
  | "CANTIDAD_INVALIDA"
  | "TURNO_TODAVIA_NO_EMPEZO"
  | "NO_AUTORIZADO"
  | "NO_AUTENTICADO"
  | "CREDENCIALES_INVALIDAS"
  | "EMAIL_EN_USO"
  | "SIN_CONEXION"
  | (string & {});

// ---------- Autenticación (entradas y salidas de login/registro) ----------

/**
 * El profe pidió que el login lleve "usuario y contraseña". El PRD no define un
 * campo "usuario" en Usuario (solo email), así que por ahora `usuario` es el email
 * o el nombre antes de la @. Cuando llegue la API se ajusta en servicios/auth.ts.
 */
export interface CredencialesLogin {
  usuario: string;
  password: string;
}

export interface DatosRegistro {
  nombre: string;
  email: string;
  telefono: string;
  password: string;
}

export interface Sesion {
  token: string;
  usuario: Usuario;
}

// ---------- Resultados de la app ----------

/**
 * Una reserva con el espacio y el turno ya resueltos, listos para mostrar
 * ("Cancha 2 · sábado 19/09 de 19 a 20 hs"). El Reserva del PRD solo trae ids.
 */
export interface ReservaConTurno {
  reserva: Reserva;
  espacio: Espacio | null;
  turno: Turno | null;
}

/** Datos para bloquear turnos por mantenimiento o lluvia (cuenta de encargado/administrador). */
export interface PedidoBloqueo {
  espacioId: string;
  fecha: string; // "AAAA-MM-DD"
  inicio: string | null; // null = día entero
  fin: string | null;
  motivo: string;
}

// ---------- Propios de la app (no están en el PRD) ----------

/**
 * Bloqueo por mantenimiento o lluvia. El PRD lo menciona ("bloquear turnos o días
 * enteros... con un motivo escrito") pero no lo define como entidad; ver la lista
 * de dudas para Nahuel. Si inicio y fin son null, bloquea el día entero.
 */
export interface Bloqueo {
  id: string;
  espacioId: string;
  fecha: string; // "AAAA-MM-DD"
  inicio: string | null; // "HH:MM"
  fin: string | null;
  motivo: string;
}

export interface ResultadoBloqueo {
  bloqueo: Bloqueo;
  /** Reservas confirmadas que quedaron dentro del bloqueo y hay que avisar. */
  reservasAfectadas: ReservaConTurno[];
}

export interface FiltroEspacios {
  deporteId?: string | null;
  complejo?: string | null;
  busqueda?: string | null;
}

/** Cuando una lista sale del teléfono y no de la red, la pantalla lo avisa. */
export interface ConOrigen<T> {
  datos: T;
  desdeCache: boolean;
  /** Cuándo se guardó por última vez en el teléfono (ISO), si vino del caché. */
  guardadoEn: string | null;
}
