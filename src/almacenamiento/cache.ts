import * as SQLite from "expo-sqlite";
import { aISO } from "@/utilidades/fechas";

// Copia local de lo que se tiene que poder ver sin señal: el catálogo de espacios y
// las reservas con su código QR. Todo se guarda como JSON en una tabla de SQLite.
// La grilla de disponibilidad NO se guarda a propósito: un horario viejo mostraría
// "libre" algo que ya está tomado, que es justo el problema que quiere resolver el PRD.

let baseDeDatos: Promise<SQLite.SQLiteDatabase> | null = null;

function abrir(): Promise<SQLite.SQLiteDatabase> {
  if (!baseDeDatos) {
    baseDeDatos = SQLite.openDatabaseAsync("canchas.db").then(async (db) => {
      await db.execAsync(
        `CREATE TABLE IF NOT EXISTS cache (
           clave TEXT PRIMARY KEY NOT NULL,
           json TEXT NOT NULL,
           guardado_en TEXT NOT NULL
         );`,
      );
      return db;
    });
  }
  return baseDeDatos;
}

export interface EntradaDeCache<T> {
  valor: T;
  guardadoEn: string;
}

export async function guardarEnCache<T>(clave: string, valor: T): Promise<void> {
  const db = await abrir();
  await db.runAsync(
    "INSERT OR REPLACE INTO cache (clave, json, guardado_en) VALUES (?, ?, ?)",
    clave,
    JSON.stringify(valor),
    aISO(new Date()),
  );
}

export async function leerDeCache<T>(clave: string): Promise<EntradaDeCache<T> | null> {
  const db = await abrir();
  const fila = await db.getFirstAsync<{ json: string; guardado_en: string }>(
    "SELECT json, guardado_en FROM cache WHERE clave = ?",
    clave,
  );
  if (!fila) return null;
  try {
    return { valor: JSON.parse(fila.json) as T, guardadoEn: fila.guardado_en };
  } catch {
    return null;
  }
}

/** Borra las entradas cuya clave empieza con el prefijo (por ejemplo, las de un usuario que cerró sesión). */
export async function borrarCachePorPrefijo(prefijo: string): Promise<void> {
  const db = await abrir();
  await db.runAsync("DELETE FROM cache WHERE clave LIKE ?", `${prefijo}%`);
}
