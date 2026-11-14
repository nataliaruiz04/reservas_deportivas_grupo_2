import { useRouter } from "expo-router";
import { useState } from "react";
import { Campo } from "@/componentes/formularios";
import { Boton, Pantalla, Tarjeta, Texto } from "@/componentes/ui";
import { useSesion } from "@/contexto/sesion";
import { useTema } from "@/tema";
import { mensajeDeError } from "@/utilidades/errores";

export default function CrearCuenta() {
  const router = useRouter();
  const { paleta } = useTema();
  const { registrar } = useSesion();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [password, setPassword] = useState("");
  const [repetida, setRepetida] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function crear() {
    if (!nombre.trim() || !email.trim() || !password) {
      setError("Completá tu nombre, tu email y una contraseña.");
      return;
    }
    if (password !== repetida) {
      setError("Las dos contraseñas tienen que ser iguales.");
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      await registrar({ nombre, email, telefono, password });
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
      <Texto suave>Con tu cuenta guardamos tus reservas y te avisamos antes de cada turno.</Texto>
      <Campo etiqueta="Nombre y apellido" value={nombre} onChangeText={setNombre} autoComplete="name" />
      <Campo
        etiqueta="Email (también es tu usuario)"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        autoComplete="email"
      />
      <Campo etiqueta="Teléfono" value={telefono} onChangeText={setTelefono} keyboardType="phone-pad" autoComplete="tel" />
      <Campo
        etiqueta="Contraseña (mínimo 6 caracteres)"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
      />
      <Campo
        etiqueta="Repetí la contraseña"
        value={repetida}
        onChangeText={setRepetida}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
      />
      {error ? (
        <Tarjeta estilo={{ borderColor: paleta.peligro, borderWidth: 2 }}>
          <Texto estilo={{ color: paleta.peligro }} negrita>
            {error}
          </Texto>
        </Tarjeta>
      ) : null}
      <Boton texto="Crear cuenta" icono="person-add-outline" cargando={enviando} alPresionar={crear} />
      <Boton texto="Ya tengo cuenta" variante="secundario" alPresionar={() => router.replace("/login")} />
    </Pantalla>
  );
}
