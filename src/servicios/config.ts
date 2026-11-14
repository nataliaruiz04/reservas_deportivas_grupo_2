// Interruptor del origen de los datos.
//   - Sin dirección de API  -> la app usa el servidor de mentira de src/mocks (modo mock).
//   - Con dirección de API  -> la app le habla a la API real con src/servicios/api.ts.
//
// La dirección se define con la variable EXPO_PUBLIC_API_URL, sin tocar el código:
//   * Para probar en Expo Go: archivo `.env` en la raíz con
//         EXPO_PUBLIC_API_URL=http://192.168.0.10:3000
//     (la IP de la compu donde corre la API, no "localhost") y `npx expo start -c`.
//   * Para el APK: en eas.json, perfil "preview", dentro de "env".
// Si la variable no está o está vacía, todo sigue andando con los mocks.
export const URL_BASE: string = (process.env.EXPO_PUBLIC_API_URL ?? "").trim().replace(/\/+$/, "");

export const MODO_MOCK: boolean = URL_BASE === "";

/** Demora artificial del servidor de mentira, para que se vean los estados de carga. */
export const LATENCIA_MS = 350;

/** La API gratis de Render tarda cerca de un minuto en despertar: no cortamos antes. */
export const TIEMPO_MAXIMO_MS = 70_000;
