// Simula la red para el servidor de mentira: una demora corta y, si se pide,
// una caída total. Sirve para probar el caso feo "error de red" sin cortar el wifi.

let caida = false;

export function simularCaidaDeRed(valor: boolean): void {
  caida = valor;
}

export function redCaida(): boolean {
  return caida;
}

export function esperar(ms: number): Promise<void> {
  return new Promise((resolver) => setTimeout(resolver, ms));
}
