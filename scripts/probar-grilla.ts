// Pruebas de la lógica que no depende del teléfono: el cruce de la grilla y las
// reglas del PRD (turnos, reservas fijas, bloqueos, límites, cancelación, ingreso).
// Se corren con:  npm run probar

import * as servidor from "../src/mocks/servidor";
import { aInstante, hoy, sumarDias } from "../src/utilidades/fechas";
import { esReservable, resumenDeGrilla } from "../src/utilidades/grilla";
import { ErrorApi } from "../src/utilidades/errores";
import type { CodigoError } from "../src/tipos";

let hechas = 0;
const fallas: string[] = [];

function comprobar(nombre: string, condicion: boolean, detalle = ""): void {
  hechas++;
  if (!condicion) fallas.push(`${nombre}${detalle ? ` -> ${detalle}` : ""}`);
}

function codigoDeError(accion: () => unknown): CodigoError | null {
  try {
    accion();
    return null;
  } catch (e) {
    return e instanceof ErrorApi ? e.codigo : `OTRO:${String(e)}`;
  }
}

// Sábado 17/10/2026, 21:45 en Argentina.
const AHORA = aInstante("2026-10-17", "21:45");
const HOY = hoy(AHORA);
const dia = (n: number) => sumarDias(HOY, n);

servidor.reiniciarServidor(AHORA);

const estadoDe = (espacioId: string, fecha: string, inicio: string) =>
  servidor.obtenerGrilla(espacioId, fecha).find((c) => c.turno.inicio === inicio)!;

// ---- La grilla -------------------------------------------------------------

{
  const g = servidor.obtenerGrilla("esp-02", dia(3)); // martes 20/10
  comprobar("la grilla tiene 16 turnos de 8 a 24", g.length === 16 && g[0].turno.inicio === "08:00" && g[15].turno.fin === "24:00");
  comprobar("martes 08:00 libre", estadoDe("esp-02", dia(3), "08:00").turno.estado === "libre");
  comprobar("martes 18:00 ocupado por otra persona", estadoDe("esp-02", dia(3), "18:00").turno.estado === "reservado");
  comprobar("martes 19:00 reservado y con reservaId", estadoDe("esp-02", dia(3), "19:00").turno.reservaId !== null);
  const fijo = estadoDe("esp-02", dia(3), "21:00");
  comprobar("martes 21:00 es fijo del grupo de los martes", fijo.turno.estado === "fijo" && fijo.titularFija === "Grupo de los martes");
  comprobar("un miércoles 21:00 NO es fijo", estadoDe("esp-02", dia(4), "21:00").turno.estado === "libre");
  comprobar("antes de que empiece la fija (marzo 2026) no ocupaba", servidor.obtenerGrilla("esp-02", "2026-02-24").every((c) => c.turno.estado !== "fijo"));
}

{
  const g = servidor.obtenerGrilla("esp-02", dia(2)); // lunes 19/10, lluvia
  comprobar("día de lluvia: todos los turnos en mantenimiento", g.every((c) => c.turno.estado === "mantenimiento"));
  comprobar("día de lluvia: trae el motivo", g[0].turno.motivoBloqueo === "Cancha anegada por la lluvia");
  const r = resumenDeGrilla(g, AHORA);
  comprobar("resumen: día bloqueado y sin lugar", r.diaBloqueado && r.sinLugar && r.libres === 0);
}

{
  const g = servidor.obtenerGrilla("esp-02", dia(1)); // domingo 18/10
  comprobar("mantenimiento de una sola hora: 20:00", estadoDe("esp-02", dia(1), "20:00").turno.estado === "mantenimiento");
  comprobar("el resto de ese domingo sigue libre", g.filter((c) => c.turno.estado === "libre").length === 15);
}

{
  const g = servidor.obtenerGrilla("esp-06", dia(1)); // grilla completa
  comprobar("grilla completa: los 16 turnos reservados", g.every((c) => c.turno.estado === "reservado"));
  const r = resumenDeGrilla(g, AHORA);
  comprobar("grilla completa: resumen sin lugar y sin bloqueo", r.sinLugar && !r.diaBloqueado);
}

{
  comprobar("fija de dos horas: lunes 18:00 y 19:00 fijos, 20:00 libre",
    estadoDe("esp-04", dia(2), "18:00").turno.estado === "fijo" &&
    estadoDe("esp-04", dia(2), "19:00").turno.estado === "fijo" &&
    estadoDe("esp-04", dia(2), "20:00").turno.estado === "libre");
  comprobar("fija con fecha de fin: jueves 22/10 ocupa", estadoDe("esp-07", "2026-10-22", "19:00").turno.estado === "fijo");
  comprobar("fija con fecha de fin: jueves 24/12 ya no ocupa", estadoDe("esp-07", "2026-12-24", "19:00").turno.estado === "libre");
  comprobar("fija dada de baja no ocupa", estadoDe("esp-01", "2026-10-24", "10:00").turno.estado === "libre");
  comprobar("reserva cancelada libera el turno", estadoDe("esp-07", dia(4), "18:00").turno.estado === "libre");
}

{
  const hoyGrilla = servidor.obtenerGrilla("esp-01", HOY);
  const t21 = hoyGrilla.find((c) => c.turno.inicio === "21:00")!.turno;
  const t22 = hoyGrilla.find((c) => c.turno.inicio === "22:00")!.turno;
  comprobar("un turno que ya empezó no se puede reservar aunque figure libre", t21.estado === "libre" && !esReservable(t21, AHORA));
  comprobar("el turno de las 22 sí", esReservable(t22, AHORA));
}

// ---- Reservar --------------------------------------------------------------

const jugador = servidor.iniciarSesion({ usuario: "jugador", password: "demo1234" });
const tok = jugador.token;

comprobar("login por parte del email antes de la @", jugador.usuario.rol === "jugador");
comprobar("login por email completo", servidor.iniciarSesion({ usuario: "JUGADOR@demo.com", password: "demo1234" }).usuario.id === "usr-207");
comprobar("contraseña incorrecta", codigoDeError(() => servidor.iniciarSesion({ usuario: "jugador", password: "x" })) === "CREDENCIALES_INVALIDAS");
comprobar("sin sesión no se reserva", codigoDeError(() => servidor.crearReserva(null, { turnoId: "tur-esp-01-2026-10-20-10", cantidadPersonas: 4 }, AHORA)) === "NO_AUTORIZADO");

const turnoLibre = estadoDe("esp-01", dia(2), "10:00").turno.id;
comprobar("cantidad mayor a la capacidad", codigoDeError(() => servidor.crearReserva(tok, { turnoId: turnoLibre, cantidadPersonas: 11 }, AHORA)) === "CANTIDAD_INVALIDA");
comprobar("turno pasado", codigoDeError(() => servidor.crearReserva(tok, { turnoId: estadoDe("esp-01", HOY, "21:00").turno.id, cantidadPersonas: 4 }, AHORA)) === "TURNO_PASADO");
comprobar("turno inexistente", codigoDeError(() => servidor.crearReserva(tok, { turnoId: "tur-esp-99-2026-10-20-10", cantidadPersonas: 4 }, AHORA)) === "ESPACIO_NO_ENCONTRADO");
comprobar("turno en día de lluvia", codigoDeError(() => servidor.crearReserva(tok, { turnoId: estadoDe("esp-02", dia(2), "10:00").turno.id, cantidadPersonas: 4 }, AHORA)) === "TURNO_OCUPADO");
comprobar("turno fijo", codigoDeError(() => servidor.crearReserva(tok, { turnoId: estadoDe("esp-02", dia(3), "21:00").turno.id, cantidadPersonas: 4 }, AHORA)) === "TURNO_OCUPADO");

const nueva = servidor.crearReserva(tok, { turnoId: turnoLibre, cantidadPersonas: 8 }, AHORA);
comprobar("se crea la reserva confirmada con QR", nueva.reserva.estado === "confirmada" && /^VGY-\d+-\d{4}-\d{2}$/.test(nueva.reserva.codigoQr));
comprobar("cancelableHasta es 4 horas antes del turno", nueva.reserva.cancelableHasta === "2026-10-19T06:00:00-03:00");
comprobar("ese turno pasa a reservado", estadoDe("esp-01", dia(2), "10:00").turno.estado === "reservado");
comprobar("no se puede reservar dos veces el mismo turno", codigoDeError(() => servidor.crearReserva(tok, { turnoId: turnoLibre, cantidadPersonas: 4 }, AHORA)) === "TURNO_OCUPADO");
// Emiliano tenía 2 activas (esp-02 +3 y esp-10 +1) + la nueva = 3 (el máximo).
comprobar("máximo de tres reservas activas", codigoDeError(() => servidor.crearReserva(tok, { turnoId: estadoDe("esp-01", dia(5), "10:00").turno.id, cantidadPersonas: 4 }, AHORA)) === "LIMITE_RESERVAS");

// ---- Cancelar --------------------------------------------------------------

{
  const aCancelar = servidor.misReservas(tok).find((x) => x.reserva.espacioId === "esp-10" && x.reserva.estado === "confirmada")!;
  const manianaTemprano = aInstante(dia(1), "14:00"); // pasadas las 13:00 de mañana: ya es tarde para las 17:00
  comprobar("cancelación tardía bloqueada por la política provisoria", codigoDeError(() => servidor.cancelarReserva(tok, aCancelar.reserva.id, manianaTemprano)) === "CANCELACION_TARDIA");
  const ok = servidor.cancelarReserva(tok, aCancelar.reserva.id, AHORA);
  comprobar("cancelar a tiempo funciona", ok.reserva.estado === "cancelada");
  comprobar("el turno cancelado queda libre", estadoDe("esp-10", dia(1), "17:00").turno.estado === "libre");
  comprobar("no se cancela dos veces", codigoDeError(() => servidor.cancelarReserva(tok, aCancelar.reserva.id, AHORA)) === "RESERVA_CANCELADA");
  comprobar("al cancelar se libera un lugar del máximo", codigoDeError(() => servidor.crearReserva(tok, { turnoId: estadoDe("esp-01", dia(5), "10:00").turno.id, cantidadPersonas: 4 }, AHORA)) === null);
}

// ---- Ingreso el día del turno ----------------------------------------------

{
  const personal = servidor.iniciarSesion({ usuario: "encargado", password: "demo1234" }).token;
  // Lucía (otra jugadora) reserva el turno de hoy a las 22:00.
  const tokLucia = servidor.iniciarSesion({ usuario: "lucia", password: "demo1234" }).token;
  const hoyTurno = servidor.crearReserva(tokLucia, { turnoId: estadoDe("esp-01", HOY, "22:00").turno.id, cantidadPersonas: 6 }, AHORA);
  const qr = hoyTurno.reserva.codigoQr;

  comprobar("un jugador no puede escanear", codigoDeError(() => servidor.validarIngreso(tokLucia, qr, "esp-01", AHORA)) === "NO_AUTORIZADO");
  comprobar("QR que no es nuestro", codigoDeError(() => servidor.validarIngreso(personal, "https://otra-cosa.com", "esp-01", AHORA)) === "QR_INVALIDO");
  comprobar("QR de otro día", codigoDeError(() => servidor.validarIngreso(personal, nueva.reserva.codigoQr, "esp-01", AHORA)) === "QR_OTRO_DIA");
  comprobar("QR de otra cancha", codigoDeError(() => servidor.validarIngreso(personal, qr, "esp-02", AHORA)) === "QR_OTRA_CANCHA");
  const ingreso = servidor.validarIngreso(personal, qr, "esp-01", AHORA);
  comprobar("ingreso correcto registra la hora", ingreso.reserva.ingresoEn !== null && ingreso.reserva.estado === "cumplida");
  comprobar("el mismo QR no se usa dos veces", codigoDeError(() => servidor.validarIngreso(personal, qr, "esp-01", AHORA)) === "YA_INGRESO");

  const ausente = servidor.misReservas(tokLucia).find((x) => x.reserva.estado === "confirmada")!;
  comprobar("no se marca ausente un turno que no empezó", codigoDeError(() => servidor.marcarAusente(personal, ausente.reserva.id, AHORA)) === "TURNO_TODAVIA_NO_EMPEZO");
}

// ---- Bloqueos --------------------------------------------------------------

{
  const personal = servidor.iniciarSesion({ usuario: "encargado", password: "demo1234" }).token;
  const r = servidor.bloquearTurnos(personal, { espacioId: "esp-01", fecha: dia(2), inicio: "09:00", fin: "11:00", motivo: "Riego del césped" });
  comprobar("el bloqueo avisa qué reservas quedaron afectadas", r.reservasAfectadas.some((x) => x.reserva.id === nueva.reserva.id));
  comprobar("la grilla refleja el bloqueo", estadoDe("esp-01", dia(2), "10:00").turno.estado === "mantenimiento");
  servidor.quitarBloqueo(personal, r.bloqueo.id);
  comprobar("al quitar el bloqueo el turno vuelve a su estado", estadoDe("esp-01", dia(2), "10:00").turno.estado === "reservado");
  comprobar("un jugador no puede bloquear", codigoDeError(() => servidor.bloquearTurnos(tok, { espacioId: "esp-01", fecha: dia(2), inicio: null, fin: null, motivo: "x" })) === "NO_AUTORIZADO");
}

// ---- Administración: reservas fijas y precios -------------------------------

{
  const personal = servidor.iniciarSesion({ usuario: "encargado", password: "demo1234" }).token;
  const admin = servidor.iniciarSesion({ usuario: "admin", password: "demo1234" }).token;
  const jugador = servidor.iniciarSesion({ usuario: "jugador", password: "demo1234" }).token;

  // Una reserva fija nueva: todos los lunes 15:00 a 16:00 en esp-01, desde hoy.
  const fecha = (() => {
    for (let n = 1; n <= 7; n++) {
      if (new Date(`${dia(n)}T12:00:00Z`).getUTCDay() === 1) return dia(n);
    }
    return dia(1);
  })();
  const antes = estadoDe("esp-01", fecha, "15:00").turno.estado;
  const creada = servidor.guardarReservaFija(personal, {
    espacioId: "esp-01", titular: "Escuelita de prueba", dia: 1, inicio: "15:00", fin: "16:00",
    desde: HOY, hasta: null, activa: true,
  });
  comprobar("la reserva fija nueva ocupa el turno en la grilla", antes === "libre" && estadoDe("esp-01", fecha, "15:00").turno.estado === "fijo");
  comprobar("la reserva fija nueva se lista", servidor.listarReservasFijas(personal).some((f) => f.id === creada.id));

  servidor.guardarReservaFija(personal, { ...creada, activa: false });
  comprobar("al pausar la reserva fija el turno vuelve a quedar libre", estadoDe("esp-01", fecha, "15:00").turno.estado === "libre");
  comprobar("fin anterior al inicio se rechaza", codigoDeError(() => servidor.guardarReservaFija(personal, { ...creada, inicio: "12:00", fin: "11:00" })) === "CANTIDAD_INVALIDA");
  comprobar("un jugador no puede crear reservas fijas", codigoDeError(() => servidor.guardarReservaFija(jugador, { ...creada, id: undefined })) === "NO_AUTORIZADO");

  const precioViejo = servidor.obtenerEspacio("esp-01").precioPorHora;
  servidor.cambiarPrecio(admin, "esp-01", precioViejo + 500);
  comprobar("el administrador cambia el precio", servidor.obtenerEspacio("esp-01").precioPorHora === precioViejo + 500);
  comprobar("el encargado no puede cambiar precios", codigoDeError(() => servidor.cambiarPrecio(personal, "esp-01", 1)) === "NO_AUTORIZADO");
  comprobar("un precio negativo se rechaza", codigoDeError(() => servidor.cambiarPrecio(admin, "esp-01", -5)) === "CANTIDAD_INVALIDA");
}

// ---- Resultado -------------------------------------------------------------

if (fallas.length > 0) {
  console.error(`\nFALLARON ${fallas.length} de ${hechas} comprobaciones:\n`);
  for (const f of fallas) console.error(`  x ${f}`);
  process.exit(1);
}
console.log(`\nTodo bien: ${hechas} comprobaciones pasaron.\n`);
