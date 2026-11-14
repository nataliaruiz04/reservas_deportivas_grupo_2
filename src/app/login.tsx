import { useRouter } from "expo-router";
import { useState } from "react";
import { Campo } from "@/componentes/formularios";
import { Boton, Pantalla, Tarjeta, Texto } from "@/componentes/ui";
import { useSesion } from "@/contexto/sesion";
import { MODO_MOCK } from "@/servicios/config";
import { useTema } from "@/tema";
import { mensajeDeError } from "@/utilidades/errores";

export default function IniciarSesion() {
  const router = useRouter();
  const { paleta } = useTema();
  const { iniciarSesion } = useSesion();
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar() {
    if (!usuario.trim() || !password) {
      setError("Escribí tu usuario y tu contraseña.");
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      await iniciarSesion({ usuario, password });
      if (router.canGoBack()) router.back();
      else router.replace("/(tabs)");
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Pantalla bordes={["bottom"]}>
      <Texto suave>Entrá para reservar, ver tus reservas y guardar tus espacios favoritos.</Texto>
      <Campo
        etiqueta="Usuario"
        value={usuario}
        onChangeText={setUsuario}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username"
        textContentType="username"
        placeholder="Tu usuario o email"
        returnKeyType="next"
      />
      <Campo
        etiqueta="Contraseña"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="current-password"
        textContentType="password"
        placeholder="Tu contraseña"
        returnKeyType="done"
        onSubmitEditing={entrar}
      />
      {error ? (
        <Tarjeta estilo={{ borderColor: paleta.peligro, borderWidth: 2 }}>
          <Texto estilo={{ color: paleta.peligro }} negrita>
            {error}
          </Texto>
        </Tarjeta>
      ) : null}
      <Boton texto="Entrar" icono="log-in-outline" cargando={enviando} alPresionar={entrar} />
      <Boton texto="Crear una cuenta" variante="secundario" alPresionar={() => router.replace("/registro")} />
      {MODO_MOCK ? (
        <Tarjeta>
          <Texto negrita>Versión de prueba con datos de ejemplo</Texto>
          <Texto suave>
            Usuarios: jugador, lucia, encargado o admin. Contraseña de todos: demo1234.
          </Texto>
        </Tarjeta>
      ) : null}
    </Pantalla>
  );
}
