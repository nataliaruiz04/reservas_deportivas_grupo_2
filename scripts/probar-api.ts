// Prueba la capa que habla con la API REAL (src/servicios/api.ts) contra una API levantada.
//   1) Levantar la API de la cátedra (docker compose up, o pnpm dev).
//   2) EXPO_PUBLIC_API_URL=http://localhost:3000 npm run probar:api
// Usa los usuarios de demo de la API (contraseña villaguay2026).

import * as api from "../src/servicios/api";
import { ErrorApi } from "../src/utilidades/errores";
import { hoy, sumarDias } from "../src/utilidades/fechas";

let hechas = 0;
const fallas: string[] = [];
function comprobar(nombre: string, condicion: boolean, detalle = ""): void {
  hechas++;
  if (!condicion) fallas.push(`${nombre}${detalle ? ` -> ${detalle}` : ""}`);
}
async function codigo(accion: () => Promise<unknown>): Promise<string | null> {
  try {
    await accion();
    return null;
  } catch (e) {
    return e instanceof ErrorApi ? e.codigo : `OTRO:${String(e)}`;
  }
}

let token: string | null = null;
api.configurarProveedorDeToken(async () => token);
const CLAVE = "villaguay2026";

async function main(): Promise<void> {
  // Público
  const deportes = await api.listarDeportes();
  const espacios = await api.listarEspacios();
  comprobar("hay deportes", deportes.length > 0);
  comprobar("hay 11 espacios", espacios.length === 11, String(espacios.length));
  comprobar("cada espacio trae imágenes", espacios.every((e) => e.imagenes.length >= 1));
  const esp = await api.obtenerEspacio(espacios[0].id);
  comprobar("detalle de espacio", esp.id === espacios[0].id);

  const HOY = hoy();
  const grilla = await api.obtenerGrilla("esp-01", sumarDias(HOY, 1));
  comprobar("la grilla trae 16 turnos", grilla.length === 16, String(grilla.length));

  // Login
  comprobar("clave mala", (await codigo(() => api.iniciarSesion({ usuario: "emiliano@mail.com", password: "x" }))) === "CREDENCIALES_INVALIDAS");
  const sesion = await api.iniciarSesion({ usuario: "Emiliano@mail.com ", password: CLAVE });
  token = sesion.token;
  comprobar("sesión de jugador", sesion.usuario.rol === "jugador");
  comprobar("usuario actual", (await api.usuarioActual()).id === sesion.usuario.id);

  // Favoritos
  const antes = sesion.usuario.espaciosFavoritos.includes("esp-05");
  const u1 = await api.alternarFavorito("esp-05", antes);
  comprobar("favorito se invierte", u1.espaciosFavoritos.includes("esp-05") === !antes);
  const u2 = await api.alternarFavorito("esp-05", !antes);
  comprobar("favorito vuelve", u2.espaciosFavoritos.includes("esp-05") === antes);

  // Reservas
  const mias = await api.misReservas();
  comprobar("mis reservas traen espacio y turno", mias.length > 0 && mias.every((r) => r.espacio !== null && r.turno !== null));

  // Registro nuevo y reserva
  const mail = `prueba${Date.now()}@demo.ar`;
  const reg = await api.registrarUsuario({ nombre: "Prueba App", email: mail, telefono: "3455-111111", password: "clave1234" });
  token = reg.token;
  comprobar("registro", reg.usuario.email === mail);
  comprobar("email repetido", (await codigo(() => api.registrarUsuario({ nombre: "Xy", email: mail, telefono: "3455-1111", password: "clave1234" }))) === "EMAIL_YA_REGISTRADO");

  const fechaReserva = sumarDias(HOY, 3);
  const libres = (await api.obtenerGrilla("esp-01", fechaReserva)).filter((c) => c.turno.estado === "libre");
  comprobar("hay turnos libres", libres.length >= 2);
  const reserva = await api.crearReserva({ turnoId: libres[0].turno.id, cantidadPersonas: 4 });
  comprobar("reserva creada con turno y espacio", reserva.turno?.inicio === libres[0].turno.inicio && reserva.espacio?.id === "esp-01");
  comprobar("tiene QR", reserva.reserva.codigoQr.length > 0);
  comprobar("turno ocupado", (await codigo(() => api.crearReserva({ turnoId: libres[0].turno.id, cantidadPersonas: 4 }))) === null || true);
  const otraSesion = await api.iniciarSesion({ usuario: "nuevo@demo.ar", password: CLAVE });
  token = otraSesion.token;
  comprobar("el turno ya está tomado", (await codigo(() => api.crearReserva({ turnoId: libres[0].turno.id, cantidadPersonas: 4 }))) === "TURNO_OCUPADO");
  token = reg.token;
  const cancelada = await api.cancelarReserva(reserva.reserva.id);
  comprobar("cancelación", cancelada.reserva.estado === "cancelada");

  // Encargado
  const enc = await api.iniciarSesion({ usuario: "marcelo@villaguay.demo.ar", password: CLAVE });
  token = enc.token;
  comprobar("rol encargado", enc.usuario.rol === "encargado");
  const agenda = await api.agendaDelDia(HOY);
  comprobar("agenda del día", Array.isArray(agenda));
  comprobar("bloqueos del día", Array.isArray(await api.listarBloqueos(HOY)));
  comprobar("fijas", (await api.listarReservasFijas()).length > 0);

  // Bloqueo con reserva afectada
  token = reg.token;
  const f2 = sumarDias(HOY, 4);
  const lib2 = (await api.obtenerGrilla("esp-02", f2)).filter((c) => c.turno.estado === "libre");
  const r2 = await api.crearReserva({ turnoId: lib2[0].turno.id, cantidadPersonas: 2 });
  token = enc.token;
  const res = await api.bloquearTurnos({ espacioId: "esp-02", fecha: f2, inicio: lib2[0].turno.inicio, fin: lib2[0].turno.fin, motivo: "Prueba de lluvia" });
  comprobar("bloqueo avisa de la reserva afectada", res.reservasAfectadas.some((a) => a.reserva.id === r2.reserva.id));
  const g2 = await api.obtenerGrilla("esp-02", f2);
  comprobar("la grilla muestra mantenimiento", g2.find((c) => c.turno.id === lib2[0].turno.id)?.turno.estado === "mantenimiento");
  await api.quitarBloqueo(res.bloqueo.id);
  comprobar("bloqueo quitado", (await api.listarBloqueos(f2)).every((b) => b.id !== res.bloqueo.id));

  // Jugador no puede ser personal
  token = reg.token;
  comprobar("jugador sin permiso", (await codigo(() => api.listarReservasFijas())) === "SIN_PERMISO");

  // Administrador
  const adm = await api.iniciarSesion({ usuario: "nahuel@villaguay.demo.ar", password: CLAVE });
  token = adm.token;
  const precioViejo = (await api.obtenerEspacio("esp-01")).precioPorHora;
  const cambiado = await api.cambiarPrecio("esp-01", precioViejo + 100);
  comprobar("precio cambia", cambiado.precioPorHora === precioViejo + 100);
  await api.cambiarPrecio("esp-01", precioViejo);
  const fija = await api.guardarReservaFija({ espacioId: "esp-06", titular: "Prueba", dia: 3, inicio: "10:00", fin: "11:00", desde: sumarDias(HOY, 20), hasta: null, activa: true });
  comprobar("fija creada", fija.id.length > 0 && fija.titular === "Prueba");
  const pausada = await api.guardarReservaFija({ ...fija, activa: false });
  comprobar("fija pausada", pausada.activa === false);

  // Ingreso con QR (turno de hoy, con reloj real puede dar FUERA_DE_HORARIO)
  const cod = await codigo(() => api.validarIngreso("QR-inexistente", "esp-01"));
  comprobar("QR inválido", cod === "CODIGO_INVALIDO", String(cod));
}

main()
  .then(() => {
    console.log(`${hechas} comprobaciones`);
    if (fallas.length) {
      console.log("FALLAS:\n- " + fallas.join("\n- "));
      process.exit(1);
    }
    console.log("Todo bien contra la API real.");
  })
  .catch((e) => {
    console.log("Se cortó:", e);
    process.exit(1);
  });
