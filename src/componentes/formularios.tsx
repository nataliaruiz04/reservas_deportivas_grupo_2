import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { ALTO_BOTON, useTema } from "@/tema";
import { Icono, Texto } from "./ui";

/** Campo de texto con su título arriba. Letra grande y borde marcado para usar al sol. */
export function Campo({
  etiqueta,
  error,
  ...props
}: { etiqueta: string; error?: string | null } & TextInputProps) {
  const { paleta } = useTema();
  const [enfocado, setEnfocado] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Texto negrita>{etiqueta}</Texto>
      <TextInput
        {...props}
        accessibilityLabel={etiqueta}
        placeholderTextColor={paleta.textoSuave}
        onFocus={(e) => {
          setEnfocado(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setEnfocado(false);
          props.onBlur?.(e);
        }}
        style={[
          estilos.campo,
          {
            color: paleta.texto,
            backgroundColor: paleta.superficie,
            borderColor: error ? paleta.peligro : enfocado ? paleta.primario : paleta.borde,
          },
        ]}
      />
      {error ? <Texto estilo={{ color: paleta.peligro, fontSize: 14 }}>{error}</Texto> : null}
    </View>
  );
}

/** Para elegir un número con botones grandes (cuántos van a jugar). */
export function Contador({
  etiqueta,
  valor,
  minimo,
  maximo,
  alCambiar,
  formato,
}: {
  etiqueta: string;
  valor: number;
  minimo: number;
  maximo: number;
  alCambiar: (n: number) => void;
  formato?: (n: number) => string;
}) {
  const { paleta } = useTema();
  const boton = (icono: string, descripcion: string, nuevo: number, activo: boolean) => (
    <Pressable
      onPress={() => alCambiar(nuevo)}
      disabled={!activo}
      accessibilityRole="button"
      accessibilityLabel={descripcion}
      style={[
        estilos.paso,
        { borderColor: paleta.primario, opacity: activo ? 1 : 0.35, backgroundColor: paleta.superficie },
      ]}
    >
      <Icono nombre={icono} tamano={26} color={paleta.primario} />
    </Pressable>
  );
  return (
    <View style={{ gap: 6 }}>
      <Texto negrita>{etiqueta}</Texto>
      <View style={estilos.fila}>
        {boton("remove", `Menos ${etiqueta}`, valor - 1, valor > minimo)}
        <Texto titulo estilo={{ minWidth: 90, textAlign: "center" }}>
          {formato ? formato(valor) : String(valor)}
        </Texto>
        {boton("add", `Más ${etiqueta}`, valor + 1, valor < maximo)}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  campo: {
    minHeight: ALTO_BOTON,
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 18,
  },
  fila: { flexDirection: "row", alignItems: "center", gap: 14 },
  paso: {
    width: ALTO_BOTON,
    height: ALTO_BOTON,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
