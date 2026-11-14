// Reglas de negocio que salen del PRD de Villaguay. Están todas acá para que, si
// Nahuel cambia algo, se toque un solo archivo.

/** Los turnos son de una hora, de 8:00 a 24:00 (16 turnos por día). */
export const HORA_APERTURA = 8;
export const HORA_CIERRE = 24;

/** "Hasta cuatro horas antes se cancela sola; después hay que avisarnos." */
export const HORAS_LIMITE_CANCELACION = 4;

/** "Un máximo de tres reservas activas por persona." */
export const MAX_RESERVAS_ACTIVAS = 3;

/** "Un recordatorio dos horas antes del turno." */
export const HORAS_RECORDATORIO = 2;

/** "Poder mirar los próximos siete días." */
export const DIAS_VISIBLES = 7;

/** Argentina no tiene horario de verano: el desfase es fijo. */
export const DESFASE_HORAS = -3;
export const DESFASE_TEXTO = "-03:00";

/**
 * DECISIÓN PROVISORIA (pendiente de confirmar con Nahuel).
 * El PRD dice que pasadas las 4 h "hay que avisarnos", pero también quiere marcar
 * a quien "cancela tarde repetidas veces". Las dos cosas no encajan sin aclarar.
 *  - "bloquear": después del límite la app NO cancela; muestra cómo avisar al encargado.
 *  - "permitir_y_marcar": la app cancela igual y suma una cancelación tardía al usuario.
 */
export const POLITICA_CANCELACION_TARDIA: "bloquear" | "permitir_y_marcar" =
  "bloquear";
