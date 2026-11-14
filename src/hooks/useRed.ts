import { useNetworkState } from "expo-network";

/** Devuelve true cuando el teléfono no tiene conexión a internet. */
export function useSinConexion(): boolean {
  const red = useNetworkState();
  return red.isConnected === false || red.isInternetReachable === false;
}
