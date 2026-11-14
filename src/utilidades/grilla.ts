import { HORA_APERTURA, HORA_CIERRE } from "@/config/reglas";
import type { Bloqueo, Espacio, Reserva, ReservaFija, Turno } from "@/tipos";
import { aInstante, aMinutos, diaDeSemana, horaTexto } from "./fechas";

// El PRD lo dice sin vueltas: "La grilla de un día se arma cruzando los turnos
// reservados con las fijas vigentes y con los bloqueos de mantenimiento".
// Este archivo es ese cruce. No depende de React ni de Expo, así que se puede
// probar con `npm run probar`.

/**
 * Una celda de la grilla. El Turno del PRD no trae el nombre del titular de una
 * reserva fija, pero la pantalla lo muestra ("FIJO - Grupo del martes"), por eso
 * va aparte.
 */
export interface CeldaGrilla {
  turno: Turno;
  titularFija: string | null;
}

/** Id estable de un turno. Incluye el espacio para no chocar entre canchas. */
export function idTurno(espacioId: string, fecha: string, inicio: string): string {
  return `tur-${espacioId}-${fecha}-${inicio.slice(0, 2)}`;
}

function seSolapan(aIni: number, aFin: number, bIni: number, bFin: number): boolean {
  return aIni < bFin && aFin > bIni;
}

/** Una reserva fija vale ese día si está activa, cae en su día de semana y en su rango de fechas. */
export function fijaVigente(fija: ReservaFija, fecha: string): boolean {
  if (!fija.activa) return false;
  if (diaDeSemana(fecha) !== fija.dia) return false;
  if (fecha < fija.desde) return false;
  if (fija.hasta !== null && fecha > fija.hasta) return false;
  return true;
}

/** Una reserva cancelada libera el turno; las demás lo siguen ocupando. */
export function ocupaTurno(reserva: Reserva): boolean {
  return reserva.estado !== "cancelada";
}

interface EntradaGrilla {
  espacio: Espacio;
  fecha: string;
  reservas: Reserva[];
  fijas: ReservaFija[];
  bloqueos: Bloqueo[];
}

/**
 * Arma los 16 turnos de un espacio en un día.
 * Si un mismo turno cae en varias reglas gana la más fuerte:
 *   mantenimiento > fijo > reservado > libre.
 * (Si llueve un martes a las 21, el turno figura bloqueado y no "fijo", para no
 * mandar a nadie a una cancha anegada.)
 */
export function armarGrilla(entrada: EntradaGrilla): CeldaGrilla[] {
  const { espacio, fecha } = entrada;

  const bloqueosDelDia = entrada.bloqueos.filter(
    (b) => b.espacioId === espacio.id && b.fecha === fecha,
  );
  const fijasDelDia = entrada.fijas.filter(
    (f) => f.espacioId === espacio.id && fijaVigente(f, fecha),
  );
  const reservasDelEspacio = entrada.reservas.filter(
    (r) => r.espacioId === espacio.id && ocupaTurno(r),
  );

  const celdas: CeldaGrilla[] = [];

  for (let hora = HORA_APERTURA; hora < HORA_CIERRE; hora++) {
    const inicio = horaTexto(hora);
    const fin = horaTexto(hora + 1);
    const id = idTurno(espacio.id, fecha, inicio);
    const ini = aMinutos(inicio);
    const fn = aMinutos(fin);

    const turno: Turno = {
      id,
      espacioId: espacio.id,
      fecha,
      inicio,
      fin,
      estado: "libre",
      reservaId: null,
      motivoBloqueo: null,
      precio: espacio.precioPorHora,
    };
    let titularFija: string | null = null;

    const bloqueo = bloqueosDelDia.find((b) =>
      b.inicio === null || b.fin === null
        ? true
        : seSolapan(ini, fn, aMinutos(b.inicio), aMinutos(b.fin)),
    );
    const fija = fijasDelDia.find((f) =>
      seSolapan(ini, fn, aMinutos(f.inicio), aMinutos(f.fin)),
    );
    const reserva = reservasDelEspacio.find((r) => r.turnoId === id);

    if (bloqueo) {
      turno.estado = "mantenimiento";
      turno.motivoBloqueo = bloqueo.motivo;
    } else if (fija) {
      turno.estado = "fijo";
      titularFija = fija.titular;
    } else if (reserva) {
      turno.estado = "reservado";
      turno.reservaId = reserva.id;
    }

    celdas.push({ turno, titularFija });
  }

  return celdas;
}

/** "Que un turno que ya pasó no se pueda reservar, aunque figure libre." */
export function turnoPasado(turno: Turno, ahora: Date = new Date()): boolean {
  return aInstante(turno.fecha, turno.inicio).getTime() <= ahora.getTime();
}

/** Un turno se puede reservar solo si está libre y todavía no empezó. */
export function esReservable(turno: Turno, ahora: Date = new Date()): boolean {
  return turno.estado === "libre" && !turnoPasado(turno, ahora);
}

/** Resumen de la jornada: sirve para pintar "sin turnos libres" o "día bloqueado". */
export function resumenDeGrilla(celdas: CeldaGrilla[], ahora: Date = new Date()) {
  const libres = celdas.filter((c) => esReservable(c.turno, ahora)).length;
  const bloqueados = celdas.filter((c) => c.turno.estado === "mantenimiento").length;
  return {
    libres,
    diaBloqueado: bloqueados === celdas.length,
    sinLugar: libres === 0,
  };
}
