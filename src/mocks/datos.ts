import { idTurno } from "@/utilidades/grilla";
import { aInstante, aISO, hoy, sumarDias } from "@/utilidades/fechas";
import { HORAS_LIMITE_CANCELACION } from "@/config/reglas";
import type { Bloqueo, Deporte, Espacio, Reserva, ReservaFija, Usuario } from "@/tipos";

// Datos inventados, tipados con los mismos tipos del PRD. Si algo de acá no
// compila, está mal el mock, no el tipo.
// Las fechas se calculan a partir de "hoy", así la demo siempre tiene turnos
// futuros para reservar y nunca queda vieja.

export const CONTRASENA_DEMO = "demo1234";

export const deportes: Deporte[] = [
  { id: "dep-futbol5", nombre: "Fútbol 5", icono: "football-outline", color: "#2E7D32" },
  { id: "dep-futbol11", nombre: "Fútbol 11", icono: "football-outline", color: "#1B5E20" },
  { id: "dep-basquet", nombre: "Básquet", icono: "basketball-outline", color: "#E65100" },
  { id: "dep-voley", nombre: "Vóley", icono: "ellipse-outline", color: "#1565C0" },
  { id: "dep-tenis", nombre: "Tenis", icono: "tennisball-outline", color: "#9E9D24" },
  { id: "dep-gimnasio", nombre: "Gimnasio", icono: "barbell-outline", color: "#6A1B9A" },
];

const POLI = { latitud: -31.8642, longitud: -59.0281 };
const BERDUC = { latitud: -31.8689, longitud: -59.0207 };
const GIMNASIO = { latitud: -31.8655, longitud: -59.0345 };

// Medios de ejemplo para poder probar el reproductor y las fotos mientras la API no existe.
// (Las direcciones reales van a ser de api.villaguay.gob.ar; ver servicios/config.ts.)
// Fotos de ejemplo: dibujos de cada tipo de cancha guardados dentro de la app (assets/canchas),
// así se ven siempre, aun sin internet. "asset:<nombre>" lo resuelve utilidades/imagenesLocales.ts.
const fotos = (deporte: string) => [`asset:${deporte}-1`, `asset:${deporte}-2`];
const VIDEO_DE_PRUEBA = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";
const video = (_nombre: string) => VIDEO_DE_PRUEBA;

// Un texto larguísimo a propósito: tiene que entrar sin romper el diseño.
const REGLAS_LARGAS =
  "Se ingresa con zapatillas de suela blanda o descalzo en la zona de aparatos. " +
  "No se permite el ingreso con comida ni con bebidas en envases de vidrio. " +
  "Es obligatorio el uso de toalla en los equipos. " +
  "Los menores de 16 años deben estar acompañados por un adulto responsable durante todo el turno. " +
  "El encargado puede suspender el turno si detecta mal uso de las instalaciones. " +
  "Cualquier daño en los equipos será responsabilidad de quien hizo la reserva. " +
  "Los vestuarios cierran media hora después del último turno del día. " +
  "No se guardan pertenencias personales en el gimnasio: la Municipalidad no se hace responsable por objetos perdidos. " +
  "Ante una emergencia seguí las indicaciones del encargado y usá las salidas señalizadas. " +
  "Respetá el horario: el turno termina a la hora en punto aunque hayan empezado tarde.";

export const espacios: Espacio[] = [
  {
    id: "esp-01", nombre: "Cancha 1 — Fútbol 5", deporteId: "dep-futbol5",
    complejo: "Polideportivo Municipal", superficie: "césped sintético",
    techado: false, iluminacion: true, capacidad: 10, precioPorHora: 12000,
    coordenadas: POLI, imagenes: fotos("soccer-5"), videoUrl: video("cancha1"),
    reglas: "No se permite calzado con tapones de aluminio.", activo: true,
  },
  {
    id: "esp-02", nombre: "Cancha 2 — Fútbol 5", deporteId: "dep-futbol5",
    complejo: "Polideportivo Municipal", superficie: "césped sintético",
    techado: false, iluminacion: true, capacidad: 10, precioPorHora: 12000,
    coordenadas: POLI, imagenes: fotos("soccer-5"), videoUrl: video("cancha2"),
    reglas: "No se permite calzado con tapones de aluminio.", activo: true,
  },
  {
    id: "esp-03", nombre: "Cancha — Fútbol 11", deporteId: "dep-futbol11",
    complejo: "Polideportivo Municipal", superficie: "césped natural",
    techado: false, iluminacion: true, capacidad: 22, precioPorHora: 30000,
    coordenadas: { latitud: -31.8636, longitud: -59.0292 },
    imagenes: fotos("soccer-11"), videoUrl: video("futbol11"),
    reglas: "Se prohíbe el ingreso de vehículos al campo de juego.", activo: true,
  },
  {
    id: "esp-04", nombre: "Cancha de Básquet 1", deporteId: "dep-basquet",
    complejo: "Polideportivo Municipal", superficie: "cemento alisado",
    techado: true, iluminacion: true, capacidad: 10, precioPorHora: 8000,
    coordenadas: POLI, imagenes: fotos("basketball"), videoUrl: video("basquet1"),
    reglas: "Calzado deportivo obligatorio.", activo: true,
  },
  {
    id: "esp-05", nombre: "Cancha de Básquet 2", deporteId: "dep-basquet",
    complejo: "Polideportivo Municipal", superficie: "cemento alisado",
    techado: true, iluminacion: true, capacidad: 10, precioPorHora: 8000,
    coordenadas: POLI,
    // Caso feo: espacio sin fotos ni video.
    imagenes: [], videoUrl: null,
    reglas: "Calzado deportivo obligatorio.", activo: true,
  },
  {
    id: "esp-06", nombre: "Cancha de Básquet 3", deporteId: "dep-basquet",
    complejo: "Polideportivo Municipal", superficie: "cemento alisado",
    techado: true, iluminacion: true, capacidad: 10, precioPorHora: 8000,
    coordenadas: POLI, imagenes: fotos("basketball"), videoUrl: video("basquet3"),
    reglas: "Calzado deportivo obligatorio.", activo: true,
  },
  {
    id: "esp-07", nombre: "Cancha de Vóley 1", deporteId: "dep-voley",
    complejo: "Polideportivo Municipal", superficie: "cemento alisado",
    techado: true, iluminacion: true, capacidad: 12, precioPorHora: 7000,
    coordenadas: POLI, imagenes: fotos("volleyball"), videoUrl: video("voley1"),
    reglas: "Se pide dejar la red como estaba al terminar.", activo: true,
  },
  {
    id: "esp-08", nombre: "Cancha de Vóley 2", deporteId: "dep-voley",
    complejo: "Polideportivo Municipal", superficie: "cemento alisado",
    techado: true, iluminacion: true, capacidad: 12, precioPorHora: 7000,
    coordenadas: POLI, imagenes: fotos("volleyball"), videoUrl: video("voley2"),
    reglas: "Se pide dejar la red como estaba al terminar.", activo: true,
  },
  {
    id: "esp-09", nombre: "Cancha de Tenis 1", deporteId: "dep-tenis",
    complejo: "Parque Berduc", superficie: "polvo de ladrillo",
    // Caso feo: una cancha sin luz, no se puede jugar de noche.
    techado: false, iluminacion: false, capacidad: 4, precioPorHora: 6000,
    coordenadas: BERDUC, imagenes: fotos("tenis"), videoUrl: video("tenis1"),
    reglas: "Se juega con calzado de suela lisa. Mojar el polvo antes de jugar en verano.", activo: true,
  },
  {
    id: "esp-10", nombre: "Cancha de Tenis 2", deporteId: "dep-tenis",
    complejo: "Parque Berduc", superficie: "polvo de ladrillo",
    techado: false, iluminacion: true, capacidad: 4, precioPorHora: 6000,
    coordenadas: BERDUC, imagenes: fotos("tenis"), videoUrl: video("tenis2"),
    reglas: "Se juega con calzado de suela lisa.", activo: true,
  },
  {
    id: "esp-11", nombre: "Gimnasio Cerrado", deporteId: "dep-gimnasio",
    complejo: "Gimnasio Municipal", superficie: "piso flotante",
    techado: true, iluminacion: true, capacidad: 30, precioPorHora: 15000,
    coordenadas: GIMNASIO, imagenes: fotos("gym"),
    // Caso feo: sin video + reglas larguísimas.
    videoUrl: null,
    reglas: REGLAS_LARGAS, activo: true,
  },
];

export const reservasFijas: ReservaFija[] = [
  // La del PRD: "el grupo que tiene la cancha todos los martes a las 21".
  { id: "fij-07", espacioId: "esp-02", titular: "Grupo de los martes", dia: 2, inicio: "21:00", fin: "22:00", desde: "2026-03-01", hasta: null, activa: true },
  // Un club con dos horas seguidas, dos días por semana.
  { id: "fij-08", espacioId: "esp-04", titular: "Club Villaguay — Básquet", dia: 1, inicio: "18:00", fin: "20:00", desde: "2026-03-01", hasta: null, activa: true },
  { id: "fij-09", espacioId: "esp-04", titular: "Club Villaguay — Básquet", dia: 3, inicio: "18:00", fin: "20:00", desde: "2026-03-01", hasta: null, activa: true },
  { id: "fij-10", espacioId: "esp-07", titular: "Escuela N° 12 — Vóley", dia: 4, inicio: "19:00", fin: "21:00", desde: "2026-03-01", hasta: "2026-12-18", activa: true },
  // Una fija dada de baja: no tiene que ocupar nada.
  { id: "fij-11", espacioId: "esp-01", titular: "Grupo del sábado (baja)", dia: 6, inicio: "10:00", fin: "12:00", desde: "2026-03-01", hasta: null, activa: false },
];

export function bloqueosIniciales(ahora: Date = new Date()): Bloqueo[] {
  const h = hoy(ahora);
  return [
    // Caso feo: día entero bloqueado por lluvia.
    { id: "blq-01", espacioId: "esp-02", fecha: sumarDias(h, 2), inicio: null, fin: null, motivo: "Cancha anegada por la lluvia" },
    // El del dibujo del PRD: "20:00 MANTENIMIENTO".
    { id: "blq-02", espacioId: "esp-02", fecha: sumarDias(h, 1), inicio: "20:00", fin: "21:00", motivo: "Mantenimiento del césped" },
    { id: "blq-03", espacioId: "esp-10", fecha: sumarDias(h, 3), inicio: "08:00", fin: "12:00", motivo: "Pintura de líneas" },
  ];
}

export function usuariosIniciales(): Usuario[] {
  return [
    { id: "usr-207", nombre: "Emiliano Ruiz", email: "jugador@demo.com", telefono: "3455-401122", rol: "jugador", espaciosFavoritos: ["esp-02"], cancelacionesTardias: 1, ausencias: 0 },
    { id: "usr-208", nombre: "Lucía Paz", email: "lucia@demo.com", telefono: "3455-402233", rol: "jugador", espaciosFavoritos: [], cancelacionesTardias: 0, ausencias: 2 },
    { id: "usr-003", nombre: "Marcelo Benítez", email: "encargado@demo.com", telefono: "3455-403344", rol: "encargado", espaciosFavoritos: [], cancelacionesTardias: 0, ausencias: 0 },
    { id: "usr-001", nombre: "Nahuel Ojeda", email: "admin@demo.com", telefono: "3455-404455", rol: "administrador", espaciosFavoritos: [], cancelacionesTardias: 0, ausencias: 0 },
    { id: "usr-300", nombre: "Grupo del Viernes", email: "viernes@demo.com", telefono: "3455-405566", rol: "jugador", espaciosFavoritos: [], cancelacionesTardias: 0, ausencias: 0 },
  ];
}

let contadorReserva = 1180;

export function siguienteNumeroDeReserva(): number {
  return contadorReserva++;
}

/** Código del PRD: "VGY-1180-0219-19" (reserva, mes y día, hora de inicio). */
export function codigoQrDe(numero: number, fecha: string, inicio: string): string {
  const mmdd = fecha.slice(5, 7) + fecha.slice(8, 10);
  return `VGY-${numero}-${mmdd}-${inicio.slice(0, 2)}`;
}

interface PedidoReserva {
  usuarioId: string;
  espacioId: string;
  fecha: string;
  inicio: string;
  personas: number;
  estado: Reserva["estado"];
  ingresoEn?: string | null;
}

function nuevaReserva(p: PedidoReserva, ahora: Date): Reserva {
  const numero = siguienteNumeroDeReserva();
  const inicioInstante = aInstante(p.fecha, p.inicio);
  const limite = new Date(inicioInstante.getTime() - HORAS_LIMITE_CANCELACION * 3_600_000);
  return {
    id: `res-${numero}`,
    turnoId: idTurno(p.espacioId, p.fecha, p.inicio),
    espacioId: p.espacioId,
    usuarioId: p.usuarioId,
    cantidadPersonas: p.personas,
    codigoQr: codigoQrDe(numero, p.fecha, p.inicio),
    estado: p.estado,
    ingresoEn: p.ingresoEn ?? null,
    creadaEn: aISO(ahora),
    cancelableHasta: aISO(limite),
  };
}

export function reservasIniciales(ahora: Date = new Date()): Reserva[] {
  const h = hoy(ahora);
  const lista: PedidoReserva[] = [
    // De Emiliano: una próxima, otra mañana, una ya cumplida, una ausente y una cancelada.
    { usuarioId: "usr-207", espacioId: "esp-02", fecha: sumarDias(h, 3), inicio: "19:00", personas: 10, estado: "confirmada" },
    { usuarioId: "usr-207", espacioId: "esp-10", fecha: sumarDias(h, 1), inicio: "17:00", personas: 4, estado: "confirmada" },
    { usuarioId: "usr-207", espacioId: "esp-01", fecha: sumarDias(h, -5), inicio: "20:00", personas: 8, estado: "cumplida", ingresoEn: aISO(aInstante(sumarDias(h, -5), "20:02")) },
    { usuarioId: "usr-207", espacioId: "esp-01", fecha: sumarDias(h, -10), inicio: "19:00", personas: 10, estado: "ausente" },
    { usuarioId: "usr-207", espacioId: "esp-07", fecha: sumarDias(h, 4), inicio: "18:00", personas: 6, estado: "cancelada" },
    // De otra persona: el turno de las 18 figura OCUPADO, como en el dibujo del PRD.
    { usuarioId: "usr-208", espacioId: "esp-02", fecha: sumarDias(h, 3), inicio: "18:00", personas: 10, estado: "confirmada" },
  ];

  // Caso feo: una grilla completa, sin ningún turno libre (16 reservas seguidas).
  for (let hora = 8; hora < 24; hora++) {
    lista.push({
      usuarioId: "usr-300",
      espacioId: "esp-06",
      fecha: sumarDias(h, 1),
      inicio: `${String(hora).padStart(2, "0")}:00`,
      personas: 10,
      estado: "confirmada",
    });
  }

  return lista.map((p) => nuevaReserva(p, ahora));
}

export { nuevaReserva };
