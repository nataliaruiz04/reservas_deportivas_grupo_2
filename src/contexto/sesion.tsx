import * as LocalAuthentication from "expo-local-authentication";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { guardarBiometriaActiva, leerBiometriaActiva, leerUsuarioGuardado } from "@/almacenamiento/sesion";
import { registrarTelefonoParaPush } from "@/notificaciones";
import * as auth from "@/servicios/auth";
import type { CredencialesLogin, DatosRegistro, Usuario } from "@/tipos";

// Guarda quién inició sesión y lo comparte con todas las pantallas.
// También maneja el bloqueo con huella o rostro al abrir la app.

interface ValorSesion {
  usuario: Usuario | null;
  restaurando: boolean; // true mientras se revisa si había sesión guardada
  bloqueada: boolean; // true si hay que pasar la huella/rostro para seguir
  biometriaDisponible: boolean; // el teléfono tiene huella o rostro configurados
  biometriaActiva: boolean; // el usuario eligió usarla
  esPersonal: boolean; // encargado o administrador
  iniciarSesion: (c: CredencialesLogin) => Promise<void>;
  registrar: (d: DatosRegistro) => Promise<void>;
  cerrarSesion: () => Promise<void>;
  desbloquear: () => Promise<boolean>;
  cambiarBiometria: (activa: boolean) => Promise<boolean>;
  actualizarUsuario: (u: Usuario) => void;
}

const Contexto = createContext<ValorSesion | null>(null);

async function telefonoTieneBiometria(): Promise<boolean> {
  try {
    const hardware = await LocalAuthentication.hasHardwareAsync();
    const configurada = await LocalAuthentication.isEnrolledAsync();
    return hardware && configurada;
  } catch {
    return false;
  }
}

async function pedirBiometria(mensaje: string): Promise<boolean> {
  try {
    const r = await LocalAuthentication.authenticateAsync({ promptMessage: mensaje, cancelLabel: "Cancelar" });
    return r.success;
  } catch {
    return false;
  }
}

export function SesionProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [restaurando, setRestaurando] = useState(true);
  const [bloqueada, setBloqueada] = useState(false);
  const [biometriaDisponible, setBiometriaDisponible] = useState(false);
  const [biometriaActiva, setBiometriaActiva] = useState(false);

  // Al abrir la app: leer lo guardado, decidir si bloquear y confirmar el token con el servidor.
  useEffect(() => {
    let vivo = true;
    async function restaurar() {
      const disponible = await telefonoTieneBiometria();
      const activa = (await leerBiometriaActiva()) && disponible;
      const guardado = await leerUsuarioGuardado(); // sirve aunque no haya internet
      if (!vivo) return;

      setBiometriaDisponible(disponible);
      setBiometriaActiva(activa);
      setUsuario(guardado);
      setBloqueada(guardado !== null && activa);

      const confirmado = await auth.restaurarSesion();
      if (!vivo) return;
      setUsuario(confirmado);
      if (confirmado) registrarTelefonoParaPush().catch(() => {});
      if (!confirmado) setBloqueada(false);
      setRestaurando(false);
    }
    restaurar().catch(() => vivo && setRestaurando(false));
    return () => {
      vivo = false;
    };
  }, []);

  async function iniciarSesion(c: CredencialesLogin) {
    const sesion = await auth.iniciarSesion(c);
    setUsuario(sesion.usuario);
    setBloqueada(false);
    registrarTelefonoParaPush().catch(() => {});
  }

  async function registrar(d: DatosRegistro) {
    const sesion = await auth.registrar(d);
    setUsuario(sesion.usuario);
    setBloqueada(false);
    registrarTelefonoParaPush().catch(() => {});
  }

  async function cerrarSesion() {
    await auth.cerrarSesion();
    setUsuario(null);
    setBloqueada(false);
  }

  async function desbloquear() {
    const ok = await pedirBiometria("Ingresá para ver tus reservas");
    if (ok) setBloqueada(false);
    return ok;
  }

  async function cambiarBiometria(activa: boolean) {
    if (activa) {
      if (!biometriaDisponible) return false;
      const ok = await pedirBiometria("Confirmá tu huella o rostro para activar el ingreso rápido");
      if (!ok) return false;
    }
    await guardarBiometriaActiva(activa);
    setBiometriaActiva(activa);
    return true;
  }

  const valor: ValorSesion = {
    usuario,
    restaurando,
    bloqueada,
    biometriaDisponible,
    biometriaActiva,
    esPersonal: usuario !== null && usuario.rol !== "jugador",
    iniciarSesion,
    registrar,
    cerrarSesion,
    desbloquear,
    cambiarBiometria,
    actualizarUsuario: setUsuario,
  };
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSesion(): ValorSesion {
  const valor = useContext(Contexto);
  if (!valor) throw new Error("useSesion tiene que usarse dentro de SesionProvider");
  return valor;
}
