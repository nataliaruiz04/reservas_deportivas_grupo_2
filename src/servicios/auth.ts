import {
  borrarToken,
  borrarUsuarioGuardado,
  guardarToken,
  guardarUsuario,
  leerToken,
  leerUsuarioGuardado,
} from "@/almacenamiento/sesion";
import { borrarCachePorPrefijo } from "@/almacenamiento/cache";
import * as servidor from "@/mocks/servidor";
import type { CredencialesLogin, DatosRegistro, Sesion, Usuario } from "@/tipos";
import { esErrorApi, esSinConexion } from "@/utilidades/errores";
import * as api from "./api";
import { MODO_MOCK } from "./config";
import { contraElMock } from "./ejecutar";

// API real: POST /auth/ingreso, POST /auth/registro, GET /yo, PUT/DELETE /yo/espacios-favoritos/:id.

async function guardarSesion(sesion: Sesion): Promise<Sesion> {
  await guardarToken(sesion.token);
  await guardarUsuario(sesion.usuario);
  return sesion;
}

export async function iniciarSesion(credenciales: CredencialesLogin): Promise<Sesion> {
  const sesion = await (MODO_MOCK ? contraElMock(() => servidor.iniciarSesion(credenciales)) : api.iniciarSesion(credenciales));
  return guardarSesion(sesion);
}

export async function registrar(datos: DatosRegistro): Promise<Sesion> {
  const sesion = await (MODO_MOCK ? contraElMock(() => servidor.registrarUsuario(datos)) : api.registrarUsuario(datos));
  return guardarSesion(sesion);
}

export async function cerrarSesion(): Promise<void> {
  const usuario = await leerUsuarioGuardado();
  await borrarToken();
  await borrarUsuarioGuardado();
  if (usuario) await borrarCachePorPrefijo(`reservas:${usuario.id}`);
}

/**
 * Al abrir la app: si hay un token guardado, la sesión sigue. Con red se confirma
 * que el token siga valiendo; sin red se confía en el usuario guardado en el teléfono.
 */
export async function restaurarSesion(): Promise<Usuario | null> {
  const token = await leerToken();
  if (!token) return null;
  const guardado = await leerUsuarioGuardado();
  try {
    const usuario = await (MODO_MOCK ? contraElMock((t) => servidor.usuarioActual(t)) : api.usuarioActual());
    await guardarUsuario(usuario);
    return usuario;
  } catch (e) {
    if (esSinConexion(e)) return guardado;
    if (esErrorApi(e) && (e.codigo === "NO_AUTORIZADO" || e.codigo === "NO_AUTENTICADO")) {
      await borrarToken();
      await borrarUsuarioGuardado();
      return null;
    }
    return guardado;
  }
}

export async function alternarFavorito(espacioId: string): Promise<Usuario> {
  const actual = await leerUsuarioGuardado();
  const yaEra = actual?.espaciosFavoritos.includes(espacioId) ?? false;
  const usuario = await (MODO_MOCK
    ? contraElMock((t) => servidor.alternarFavorito(t, espacioId))
    : api.alternarFavorito(espacioId, yaEra));
  await guardarUsuario(usuario);
  return usuario;
}
