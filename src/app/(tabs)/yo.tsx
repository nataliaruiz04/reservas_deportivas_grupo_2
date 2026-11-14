import { useRouter } from "expo-router";
import { useState } from "react";
import { Switch, View } from "react-native";
import { Boton, Chip, Etiqueta, Pantalla, Tarjeta, Texto } from "@/componentes/ui";
import { useSesion } from "@/contexto/sesion";
import { useCarga } from "@/hooks/useCarga";
import { redCaida, simularCaidaDeRed } from "@/mocks/red";
import { listarEspacios } from "@/servicios/espacios";
import { MODO_MOCK } from "@/servicios/config";
import { useTema } from "@/tema";
import type { PreferenciaTema } from "@/almacenamiento/sesion";

const TEMAS: { valor: PreferenciaTema; texto: string }[] = [
  { valor: "sistema", texto: "Como el teléfono" },
  { valor: "claro", texto: "Claro" },
  { valor: "oscuro", texto: "Oscuro" },
];

export default function Yo() {
  const router = useRouter();
  const { paleta, preferencia, cambiarPreferencia } = useTema();
  const { usuario, cerrarSesion, biometriaDisponible, biometriaActiva, cambiarBiometria } = useSesion();
  const [sinRedSimulada, setSinRedSimulada] = useState(redCaida());
  const [mensaje, setMensaje] = useState<string | null>(null);
  const espacios = useCarga(() => listarEspacios(), []);

  const favoritos = (espacios.datos ?? []).filter((e) => usuario?.espaciosFavoritos.includes(e.id));
  const rol = usuario?.rol === "administrador" ? "Administrador" : usuario?.rol === "encargado" ? "Encargado" : "Jugador";

  return (
    <Pantalla>
      <Texto titulo>Yo</Texto>

      {usuario ? (
        <Tarjeta>
          <Texto titulo>{usuario.nombre}</Texto>
          <Texto suave>{usuario.email}</Texto>
          {usuario.telefono ? <Texto suave>{usuario.telefono}</Texto> : null}
          <Etiqueta texto={rol} color={paleta.primario} icono="person-outline" />
          {usuario.rol === "jugador" ? (
            <Texto suave>
              Cancelaciones tardías: {usuario.cancelacionesTardias} · Ausencias: {usuario.ausencias}
            </Texto>
          ) : null}
        </Tarjeta>
      ) : (
        <Tarjeta>
          <Texto negrita>No iniciaste sesión</Texto>
          <Texto suave>Podés mirar espacios y disponibilidad sin cuenta. Para reservar necesitás una.</Texto>
          <Boton texto="Iniciar sesión" icono="log-in-outline" alPresionar={() => router.push("/login")} />
          <Boton texto="Crear cuenta" variante="secundario" alPresionar={() => router.push("/registro")} />
        </Tarjeta>
      )}

      {usuario ? (
        <View style={{ gap: 8 }}>
          <Texto negrita>
            Mis espacios favoritos
          </Texto>
          {favoritos.length === 0 ? (
            <Texto suave>Marcá con el corazón los espacios que más usás desde su ficha.</Texto>
          ) : (
            favoritos.map((e) => (
              <Tarjeta key={e.id} alPresionar={() => router.push(`/espacio/${e.id}`)} descripcion={e.nombre}>
                <Texto negrita>{e.nombre}</Texto>
                <Texto suave>{e.complejo}</Texto>
              </Tarjeta>
            ))
          )}
        </View>
      ) : null}

      <View style={{ gap: 8 }}>
        <Texto negrita>Apariencia</Texto>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {TEMAS.map((t) => (
            <Chip key={t.valor} texto={t.texto} activo={preferencia === t.valor} alPresionar={() => cambiarPreferencia(t.valor)} />
          ))}
        </View>
      </View>

      {usuario && biometriaDisponible ? (
        <Tarjeta>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Texto negrita>Entrar con huella o rostro</Texto>
              <Texto suave>Al abrir la app te pedimos tu huella en lugar de la contraseña.</Texto>
            </View>
            <Switch
              value={biometriaActiva}
              onValueChange={async (v) => {
                const ok = await cambiarBiometria(v);
                setMensaje(ok ? null : "No se pudo confirmar tu huella o rostro.");
              }}
              accessibilityLabel="Entrar con huella o rostro"
              trackColor={{ true: paleta.primario, false: paleta.borde }}
            />
          </View>
        </Tarjeta>
      ) : null}

      {MODO_MOCK ? (
        <Tarjeta>
          <Texto negrita>Versión de prueba</Texto>
          <Texto suave>La app usa datos de ejemplo hasta que la cátedra habilite la API.</Texto>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Texto>Simular que no hay conexión</Texto>
              <Texto suave>Sirve para probar los mensajes y el uso sin señal.</Texto>
            </View>
            <Switch
              value={sinRedSimulada}
              onValueChange={(v) => {
                simularCaidaDeRed(v);
                setSinRedSimulada(v);
              }}
              accessibilityLabel="Simular que no hay conexión"
              trackColor={{ true: paleta.primario, false: paleta.borde }}
            />
          </View>
        </Tarjeta>
      ) : null}

      {mensaje ? <Texto suave>{mensaje}</Texto> : null}

      {usuario ? (
        <Boton texto="Cerrar sesión" icono="log-out-outline" variante="peligro" alPresionar={() => cerrarSesion()} />
      ) : null}
    </Pantalla>
  );
}
