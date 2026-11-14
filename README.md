# Canchas Villaguay – Reservas Deportivas

# Repositorio de la materia Desarrollo para Móviles – Grupo 2.

. App móvil de reservas de canchas y espacios deportivos de Villaguay, hecha con React Native + Expo (SDK 58) y Expo Router.

# Integrantes
- Victoria Avalos
- Marcela Carina Machuca
- Camila Abigail Wagner
- Natalia Noemi Ruiz
- Leandro Vallejos

# Cómo correrla
`npm install --legacy-peer-deps`
`npx expo start`

Escanear el QR con Expo Go (celular y computadora  en la misma red wifi).

Por defecto la app usa datos de prueba (modo mock), así que funciona sin servidor. Usuarios demo (clave demo1234): jugador@demo.com, encargado@demo.com, admin@demo.com.

# APK
`npx eas-cli login`
`npx eas-cli build --platform android --profile preview`

# Usar la API real de la cátedra

Crear un archivo .env en la raíz con una sola línea (la IP de la compu, no localhost):

EXPO_PUBLIC_API_URL=http://192.168.0.10:3000

y reiniciar con npx expo start -c. Si la variable queda vacía, la app vuelve al modo mock.

# Estructura
src/app/: pantallas (Expo Router).
src/servicios/: capa de servicios que usan las pantallas. Usa axios contra la API real o el servidor de prueba (src/mocks/).
src/almacenamiento/: token en expo-secure-store, caché en SQLite.
src/utilidades/grilla.ts: lógica de la grilla de turnos.