import * as SecureStore from "expo-secure-store";
import Storage from "expo-sqlite/kv-store";
import type { Usuario } from "@/tipos";

// Regla del PRD: el token va en expo-secure-store, nunca en kv-store.
// En kv-store (sin cifrar) va solo lo que no es secreto: el usuario para mostrar
// el nombre sin red y las preferencias.

const CLAVE_TOKEN = "sesion.token";
const CLAVE_USUARIO = "sesion.usuario";
const CLAVE_BIOMETRIA = "preferencias.biometria";
const CLAVE_TEMA = "preferencias.tema";

export async function guardarToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(CLAVE_TOKEN, token);
}

export async function leerToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(CLAVE_TOKEN);
  } catch {
    return null;
  }
}

export async function borrarToken(): Promise<void> {
  await SecureStore.deleteItemAsync(CLAVE_TOKEN);
}

export async function guardarUsuario(usuario: Usuario): Promise<void> {
  await Storage.setItemAsync(CLAVE_USUARIO, JSON.stringify(usuario));
}

export async function leerUsuarioGuardado(): Promise<Usuario | null> {
  try {
    const texto = await Storage.getItemAsync(CLAVE_USUARIO);
    return texto ? (JSON.parse(texto) as Usuario) : null;
  } catch {
    return null;
  }
}

export async function borrarUsuarioGuardado(): Promise<void> {
  await Storage.removeItemAsync(CLAVE_USUARIO);
}

/** Si el usuario eligió reingresar con huella o rostro. */
export async function leerBiometriaActiva(): Promise<boolean> {
  return (await Storage.getItemAsync(CLAVE_BIOMETRIA)) === "si";
}

export async function guardarBiometriaActiva(activa: boolean): Promise<void> {
  await Storage.setItemAsync(CLAVE_BIOMETRIA, activa ? "si" : "no");
}

export type PreferenciaTema = "claro" | "oscuro" | "sistema";

export async function leerTema(): Promise<PreferenciaTema> {
  const valor = await Storage.getItemAsync(CLAVE_TEMA);
  return valor === "claro" || valor === "oscuro" ? valor : "sistema";
}

export async function guardarTema(tema: PreferenciaTema): Promise<void> {
  await Storage.setItemAsync(CLAVE_TEMA, tema);
}
