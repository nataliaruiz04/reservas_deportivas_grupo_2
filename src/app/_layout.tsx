import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Boton, Cargando, Icono, Pantalla, Texto } from "@/componentes/ui";
import { SesionProvider, useSesion } from "@/contexto/sesion";
import { configurarNotificaciones } from "@/notificaciones";
import { TemaProvider, useTema } from "@/tema";

function PantallaBloqueada() {
  const { desbloquear, cerrarSesion } = useSesion();

  useEffect(() => {
    // Apenas abre la app pide la huella o el rostro; si se cancela queda el botón para reintentar.
    desbloquear();
  }, [desbloquear]);

  return (
    <Pantalla desplazable={false} bordes={["top", "bottom"]}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 18 }}>
        <Icono nombre="finger-print" tamano={72} />
        <Texto titulo estilo={{ textAlign: "center" }}>
          Entrá con tu huella o rostro
        </Texto>
        <Texto suave estilo={{ textAlign: "center" }}>
          Tus reservas están guardadas en este teléfono.
        </Texto>
        <Boton texto="Entrar" icono="lock-open-outline" alPresionar={() => desbloquear()} estilo={{ alignSelf: "stretch" }} />
        <Boton
          texto="Usar mi usuario y contraseña"
          variante="secundario"
          alPresionar={() => cerrarSesion()}
          estilo={{ alignSelf: "stretch" }}
        />
      </View>
    </Pantalla>
  );
}

function Navegacion() {
  const { paleta, esOscuro } = useTema();
  const { restaurando, bloqueada } = useSesion();

  if (restaurando) {
    return (
      <Pantalla desplazable={false} bordes={["top", "bottom"]}>
        <Cargando texto="Abriendo Canchas Villaguay…" />
      </Pantalla>
    );
  }
  if (bloqueada) return <PantallaBloqueada />;

  return (
    <>
      <StatusBar style={esOscuro ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: paleta.superficie },
          headerTintColor: paleta.texto,
          headerTitleStyle: { fontWeight: "700" },
          contentStyle: { backgroundColor: paleta.fondo },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="espacio/[id]" options={{ title: "Espacio" }} />
        <Stack.Screen name="reserva/[id]" options={{ title: "Mi reserva" }} />
        <Stack.Screen name="reservar" options={{ title: "Confirmar reserva",  }} />
        <Stack.Screen name="login" options={{ title: "Iniciar sesión",  }} />
        <Stack.Screen name="registro" options={{ title: "Crear cuenta",  }} />
        <Stack.Screen name="bloqueo" options={{ title: "Bloquear turnos",  }} />
        <Stack.Screen name="fijas" options={{ title: "Reservas fijas" }} />
        <Stack.Screen name="precios" options={{ title: "Precios" }} />
      </Stack>
    </>
  );
}

export default function RaizDeLaApp() {
  useEffect(() => {
    configurarNotificaciones().catch(() => {});
  }, []);

  return (
    <SafeAreaProvider>
      <TemaProvider>
        <SesionProvider>
          <Navegacion />
        </SesionProvider>
      </TemaProvider>
    </SafeAreaProvider>
  );
}
