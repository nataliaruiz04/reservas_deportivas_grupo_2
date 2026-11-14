import { Directory, File, Paths } from "expo-file-system";

// Guarda en el teléfono las fotos y el video de cada cancha, para verlos sin datos.
// Usa la API nueva de expo-file-system (File, Directory, Paths); la vieja tira error
// en tiempo de ejecución.

function carpetaDeMedios(): Directory {
  const carpeta = new Directory(Paths.document, "medios");
  if (!carpeta.exists) carpeta.create({ idempotent: true });
  return carpeta;
}

function nombreDeArchivo(url: string): string {
  const limpio = url.split("?")[0];
  const sinProtocolo = limpio.replace(/^https?:\/\//, "");
  return sinProtocolo.replace(/[^a-zA-Z0-9._-]/g, "_");
}

/** Devuelve la ruta local de un archivo ya descargado, o null si todavía no está. */
export function rutaLocalDe(url: string): string | null {
  try {
    const archivo = new File(carpetaDeMedios(), nombreDeArchivo(url));
    return archivo.exists ? archivo.uri : null;
  } catch {
    return null;
  }
}

/** Descarga un archivo (si no estaba) y devuelve su ruta local. Tira error si no hay red. */
export async function descargarMedio(url: string): Promise<string> {
  const carpeta = carpetaDeMedios();
  const destino = new File(carpeta, nombreDeArchivo(url));
  if (destino.exists) return destino.uri;
  const descargado = await File.downloadFileAsync(url, destino, { idempotent: true });
  return descargado.uri;
}

/** Lo que tiene que reproducir o mostrar la pantalla: lo local si existe, si no la dirección de la red. */
export function fuenteDe(url: string): string {
  return rutaLocalDe(url) ?? url;
}

export function quitarMedio(url: string): void {
  try {
    const archivo = new File(carpetaDeMedios(), nombreDeArchivo(url));
    if (archivo.exists) archivo.delete();
  } catch {
    // Si no se pudo borrar no pasa nada: queda como estaba.
  }
}
