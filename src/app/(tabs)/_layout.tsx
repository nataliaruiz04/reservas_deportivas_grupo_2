import { Tabs } from "expo-router";
import { Icono } from "@/componentes/ui";
import { useSesion } from "@/contexto/sesion";
import { useTema } from "@/tema";

export default function Pestanas() {
  const { paleta } = useTema();
  const { esPersonal } = useSesion();

  const icono = (nombre: string) =>
    function IconoDePestana({ focused }: { focused: boolean }) {
      return <Icono nombre={nombre} color={focused ? paleta.primario : paleta.textoSuave} tamano={26} />;
    };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: paleta.primario,
        tabBarInactiveTintColor: paleta.textoSuave,
        tabBarStyle: { backgroundColor: paleta.superficie, borderTopColor: paleta.borde, minHeight: 64 },
        tabBarLabelStyle: { fontSize: 13, fontWeight: "600" },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Espacios", tabBarIcon: icono("football-outline") }} />
      <Tabs.Screen name="mapa" options={{ title: "Mapa", tabBarIcon: icono("map-outline") }} />
      <Tabs.Screen name="reservas" options={{ title: "Mis reservas", tabBarIcon: icono("ticket-outline") }} />
      <Tabs.Screen
        name="personal"
        options={{
          title: "Ingreso",
          tabBarIcon: icono("qr-code-outline"),
          // Solo el encargado y el administrador ven esta pestaña.
          href: esPersonal ? undefined : null,
        }}
      />
      <Tabs.Screen name="yo" options={{ title: "Yo", tabBarIcon: icono("person-outline") }} />
    </Tabs>
  );
}
