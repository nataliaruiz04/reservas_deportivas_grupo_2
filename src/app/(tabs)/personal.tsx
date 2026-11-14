import * as Haptics from "expo-haptics";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, View } from "react-native";
import { Campo } from "@/componentes/formularios";
import { Boton, Cargando, Chip, EstadoVacio, Etiqueta, Pantalla, Tarjeta, Texto } from "@/componentes/ui";
import { useSesion } from "@/contexto/sesion";
import { useCarga } from "@/hooks/useCarga";
import { listarEspacios } from "@/servicios/espacios";
import { cancelarReserva } from "@/servicios/reservas";
import { agendaDelDia, marcarAusente, validarIngreso } from "@/servicios/personal";
import { useTema } from "@/tema";
import type { ReservaConTurno } from "@/tipos";
import { mensajeDeError } from "@/utilidades/errores";
import { hoy, rangoHoras } from "@/utilidades/fechas";

type Resultado = { ok: boolean; texto: string } | null;

export default function Personal() {
  const router = useRouter();
  const { paleta } = useTema();
  const { esPersonal, usuario } = useSesion();
  const [permiso, pedirPermiso] = useCameraPermissions();
  const espacios = useCarga(() => listarEspacios(), []);
  const [espacioId, setEspacioId] = useState<string | null>(null);
  const [codigo, setCodigo] = useState("");
  const [resultado, setResultado] = useState<Resultado>(null);
  const [agenda, setAgenda] = useState<ReservaConTurno[]>([]);
  const [escaneando, setEscaneando] = useState(false);
  const ocupado = useRef(false);

  const lista = espacios.datos ?? [];
  useEffect(() => {
    if (!espacioId && lista.length > 0) setEspacioId(lista[0].id);
  }, [lista, espacioId]);

  const cargarAgenda = useCallback(async () => {
    if (!espacioId) return;
    try {
      setAgenda((await agendaDelDia(hoy())).filter((r) => r.espacio?.id === espacioId));
    } catch {
      setAgenda([]);
    }
  }, [espacioId]);
  useEffect(() => {
    cargarAgenda();
  }, [cargarAgenda]);

  const validar = useCallback(
    async (texto: string) => {
      if (!espacioId || ocupado.current) return;
      ocupado.current = true;
      try {
        const r = await validarIngreso(texto.trim(), espacioId);
        setResultado({ ok: true, texto: `Ingreso correcto: ${r.espacio?.nombre ?? ""} ${(r.turno ? rangoHoras(r.turno.inicio, r.turno.fin) : "")}` });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        cargarAgenda();
      } catch (e) {
        setResultado({ ok: false, texto: mensajeDeError(e) });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      } finally {
        setTimeout(() => {
          ocupado.current = false;
        }, 1500);
      }
    },
    [espacioId, cargarAgenda],
  );

  if (!esPersonal) {
    return (
      <Pantalla>
        <EstadoVacio icono="lock-closed-outline" titulo="Solo para el personal" detalle="Esta sección es para encargados y administradores." />
      </Pantalla>
    );
  }

  return (
    <Pantalla>
      <Texto titulo>Control de ingreso</Texto>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {espacios.cargando && lista.length === 0 ? <Cargando texto="Cargando canchas…" /> : null}
        {lista.map((e) => (
          <Chip key={e.id} texto={e.nombre} activo={espacioId === e.id} alPresionar={() => { setEspacioId(e.id); setResultado(null); }} />
        ))}
      </View>

      {resultado ? (
        <Tarjeta>
          <Etiqueta
            texto={resultado.ok ? "VÁLIDO" : "NO VÁLIDO"}
            color={resultado.ok ? paleta.exito : paleta.peligro}
            icono={resultado.ok ? "checkmark-circle-outline" : "close-circle-outline"}
          />
          <Texto negrita>{resultado.texto}</Texto>
        </Tarjeta>
      ) : null}

      {escaneando && permiso?.granted ? (
        <View style={{ height: 280, borderRadius: 16, overflow: "hidden" }}>
          <CameraView
            style={{ flex: 1 }}
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={(r) => validar(r.data)}
          />
        </View>
      ) : null}
      <Boton
        texto={escaneando ? "Cerrar cámara" : "Escanear código QR"}
        icono="qr-code-outline"
        alPresionar={async () => {
          if (!escaneando && !permiso?.granted) {
            const p = await pedirPermiso();
            if (!p.granted) return;
          }
          setEscaneando(!escaneando);
        }}
      />

      <Campo etiqueta="O escribí el código a mano" value={codigo} onChangeText={setCodigo} autoCapitalize="characters" />
      <Boton texto="Validar código" variante="secundario" deshabilitado={!codigo.trim()} alPresionar={() => validar(codigo)} />

      <Texto negrita>Agenda de hoy</Texto>
      {agenda.length === 0 ? <Texto suave>No hay reservas para hoy en esta cancha.</Texto> : null}
      {agenda.map((r) => (
        <Tarjeta key={r.reserva.id}>
          <Texto negrita>{(r.turno ? rangoHoras(r.turno.inicio, r.turno.fin) : "")} · {r.reserva.estado}</Texto>
          <Texto suave>{r.reserva.cantidadPersonas} personas</Texto>
          {r.reserva.estado === "confirmada" ? (
            <Boton
              texto="Cancelar (el jugador avisó)"
              icono="close-circle-outline"
              variante="peligro"
              alPresionar={() =>
                Alert.alert(
                  "Cancelar reserva",
                  "Si faltan menos de 4 horas, la cancelación tardía queda anotada en el jugador. ¿Cancelar igual?",
                  [
                    { text: "No", style: "cancel" },
                    {
                      text: "Sí, cancelar",
                      style: "destructive",
                      onPress: async () => {
                        try {
                          await cancelarReserva(r.reserva.id);
                          setResultado({ ok: true, texto: "Reserva cancelada. El turno quedó libre." });
                          cargarAgenda();
                        } catch (e) {
                          setResultado({ ok: false, texto: mensajeDeError(e) });
                        }
                      },
                    },
                  ],
                )
              }
            />
          ) : null}
          {r.reserva.estado === "confirmada" ? (
            <Boton
              texto="Marcar ausente"
              variante="secundario"
              alPresionar={async () => {
                try {
                  await marcarAusente(r.reserva.id);
                  cargarAgenda();
                } catch (e) {
                  setResultado({ ok: false, texto: mensajeDeError(e) });
                }
              }}
            />
          ) : null}
        </Tarjeta>
      ))}

      <Boton texto="Bloquear turnos" icono="construct-outline" variante="secundario" alPresionar={() => router.push("/bloqueo")} />
      <Boton texto="Reservas fijas" icono="repeat-outline" variante="secundario" alPresionar={() => router.push("/fijas")} />
      {usuario?.rol === "administrador" ? (
        <Boton texto="Precios" icono="cash-outline" variante="secundario" alPresionar={() => router.push("/precios")} />
      ) : null}
    </Pantalla>
  );
}
