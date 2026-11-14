import { DESFASE_HORAS, DESFASE_TEXTO } from "@/config/reglas";

// Todas las fechas viajan como texto ISO 8601 con zona ("2026-09-19T19:00:00-03:00").
// Un día suelto es "AAAA-MM-DD" y una hora de grilla es "HH:MM".
// Nunca se guarda un objeto Date: se convierte recién al mostrar.

const MS_HORA = 3_600_000;
const MS_DIA = 24 * MS_HORA;

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const DIAS_CORTOS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const pad = (n: number) => String(n).padStart(2, "0");

/** Fecha y hora de Argentina para un instante, expresada con campos UTC. */
function enArgentina(instante: Date): Date {
  return new Date(instante.getTime() + DESFASE_HORAS * MS_HORA);
}

/** "AAAA-MM-DD" del día de Argentina en el que cae el instante. */
export function diaDe(instante: Date): string {
  return enArgentina(instante).toISOString().slice(0, 10);
}

/** "AAAA-MM-DD" de hoy según el reloj del teléfono, en hora argentina. */
export function hoy(ahora: Date = new Date()): string {
  return diaDe(ahora);
}

function partes(fecha: string): [number, number, number] {
  const [a, m, d] = fecha.split("-").map(Number);
  return [a, m, d];
}

/** Suma (o resta) días a un "AAAA-MM-DD". */
export function sumarDias(fecha: string, dias: number): string {
  const [a, m, d] = partes(fecha);
  return new Date(Date.UTC(a, m - 1, d) + dias * MS_DIA).toISOString().slice(0, 10);
}

/** 0 = domingo ... 6 = sábado, igual que el campo `dia` de los tipos. */
export function diaDeSemana(fecha: string): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  const [a, m, d] = partes(fecha);
  return new Date(Date.UTC(a, m - 1, d)).getUTCDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

/** "HH:MM" -> minutos desde medianoche. "24:00" vale 1440. */
export function aMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Hora entera -> "HH:00". La hora 24 se escribe "24:00". */
export function horaTexto(hora: number): string {
  return `${pad(hora)}:00`;
}

/** Instante exacto de una fecha "AAAA-MM-DD" y una hora "HH:MM" (acepta "24:00"). */
export function aInstante(fecha: string, hhmm: string): Date {
  const minutos = aMinutos(hhmm);
  const [a, m, d] = partes(fecha);
  const medianocheUtc = Date.UTC(a, m - 1, d) - DESFASE_HORAS * MS_HORA;
  return new Date(medianocheUtc + minutos * 60_000);
}

/** Instante -> texto ISO con la zona de Argentina, sin milisegundos. */
export function aISO(instante: Date): string {
  const local = enArgentina(instante).toISOString().slice(0, 19);
  return `${local}${DESFASE_TEXTO}`;
}

/** Texto ISO -> Date (recién acá se convierte, al mostrar o comparar). */
export function desdeISO(iso: string): Date {
  return new Date(iso);
}

/** "sábado 19 de septiembre" */
export function fechaLarga(fecha: string): string {
  const [, m, d] = partes(fecha);
  return `${DIAS[diaDeSemana(fecha)]} ${d} de ${MESES[m - 1]}`;
}

/** "sáb 19/09" */
export function fechaCorta(fecha: string): string {
  const [, m, d] = partes(fecha);
  return `${DIAS_CORTOS[diaDeSemana(fecha)]} ${pad(d)}/${pad(m)}`;
}

/** "19 a 20 hs" a partir de "19:00" y "20:00". */
export function rangoHoras(inicio: string, fin: string): string {
  return `${aMinutos(inicio) / 60} a ${aMinutos(fin) / 60} hs`;
}

/** Hora "HH:MM" de un instante ISO, en hora argentina. */
export function horaDeISO(iso: string): string {
  const local = enArgentina(new Date(iso));
  return `${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}`;
}

/** "$ 12.000" */
export function precioTexto(precio: number): string {
  if (precio === 0) return "Gratis";
  return `$ ${Math.round(precio).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

/** Distancia en metros entre dos puntos (fórmula de haversine). */
export function distanciaMetros(
  a: { latitud: number; longitud: number },
  b: { latitud: number; longitud: number },
): number {
  const R = 6_371_000;
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b.latitud - a.latitud);
  const dLon = rad(b.longitud - a.longitud);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitud)) * Math.cos(rad(b.latitud)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** "850 m" o "1,4 km" */
export function distanciaTexto(metros: number): string {
  if (metros < 1000) return `${Math.round(metros)} m`;
  return `${(metros / 1000).toFixed(1).replace(".", ",")} km`;
}
