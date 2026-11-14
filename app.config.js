// Toma todo de app.json y le suma la clave de Google Maps, que no se escribe en el repo:
// se pasa como variable GOOGLE_MAPS_API_KEY (en eas.json, perfil "preview", dentro de "env").
// Sin clave, el APK abre igual pero el mapa sale gris. En Expo Go no hace falta.
module.exports = ({ config }) => {
  const clave = (process.env.GOOGLE_MAPS_API_KEY || "").trim();
  if (!clave) return config;
  return {
    ...config,
    android: {
      ...config.android,
      config: { ...(config.android && config.android.config), googleMaps: { apiKey: clave } },
    },
  };
};
