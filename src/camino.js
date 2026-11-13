// Camino continuo con distancia acumulada, a partir de una lista de segmentos (6 números por segmento)
export function crearCaminoDesdeSegmentos(segmentos) {
  const cantidadPuntos = segmentos.length / 6 + 1;
  const coordenadas = new Float32Array(cantidadPuntos * 3), distanciaAcumulada = new Float32Array(cantidadPuntos);
  coordenadas[0] = segmentos[0]; coordenadas[1] = segmentos[1]; coordenadas[2] = segmentos[2];
  for (let indiceSegmento = 0; indiceSegmento < cantidadPuntos - 1; indiceSegmento++) {
    const destino = 3 * (indiceSegmento + 1), origen = 3 * indiceSegmento;
    coordenadas[destino] = segmentos[6 * indiceSegmento + 3];
    coordenadas[destino + 1] = segmentos[6 * indiceSegmento + 4];
    coordenadas[destino + 2] = segmentos[6 * indiceSegmento + 5];
    distanciaAcumulada[indiceSegmento + 1] = distanciaAcumulada[indiceSegmento] + Math.hypot(
      coordenadas[destino] - coordenadas[origen], coordenadas[destino + 1] - coordenadas[origen + 1], coordenadas[destino + 2] - coordenadas[origen + 2]);
  }
  return { coordenadas, distanciaAcumulada, cantidadPuntos };
}

// Posición a lo largo del camino (progreso entre 0 y 1). Guarda en direccion hacia dónde avanza
export function posicionEnCamino(camino, progreso, posicionDestino, direccion) {
  const distanciaRecorrida = progreso * camino.distanciaAcumulada[camino.cantidadPuntos - 1];
  let indiceInferior = 0, indiceSuperior = camino.cantidadPuntos - 1;
  while (indiceSuperior - indiceInferior > 1) {
    const indiceMedio = (indiceInferior + indiceSuperior) >> 1;
    if (camino.distanciaAcumulada[indiceMedio] <= distanciaRecorrida) indiceInferior = indiceMedio; else indiceSuperior = indiceMedio;
  }
  const longitudTramo = camino.distanciaAcumulada[indiceSuperior] - camino.distanciaAcumulada[indiceInferior];
  const fraccionTramo = longitudTramo > 0 ? (distanciaRecorrida - camino.distanciaAcumulada[indiceInferior]) / longitudTramo : 0;
  const inicio = 3 * indiceInferior, fin = 3 * indiceSuperior, c = camino.coordenadas;
  posicionDestino.set(
    c[inicio] + (c[fin] - c[inicio]) * fraccionTramo,
    c[inicio + 1] + (c[fin + 1] - c[inicio + 1]) * fraccionTramo,
    c[inicio + 2] + (c[fin + 2] - c[inicio + 2]) * fraccionTramo
  );
  direccion.x = c[fin] - c[inicio]; direccion.z = c[fin + 2] - c[inicio + 2];
}
