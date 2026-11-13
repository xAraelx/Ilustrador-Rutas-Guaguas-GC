import * as THREE from "three";
import datosGuaguas from "./guaguas.json";
import { rutasCargadas, materialesLinea } from "./config.js";
import { longitudAMercatorX, latitudAMercatorY, centroMercatorX, centroMercatorY, escalaVertical } from "./proyeccion.js";
import { alturaEnMetros } from "./altura.js";
import { escena } from "./escena.js";
import { crearCaminoDesdeSegmentos } from "./camino.js";

// ---- Rutas pegadas al terreno ----
function agregarTrazadoAlRelieve(trazado, segmentosSalida) {
  let puntoAnterior = null;
  for (let indicePunto = 0; indicePunto < trazado.length - 1; indicePunto++) {
    const puntoInicial = trazado[indicePunto], puntoFinal = trazado[indicePunto + 1];
    const longitudTramoKm = Math.hypot(
      longitudAMercatorX(puntoFinal[1]) - longitudAMercatorX(puntoInicial[1]),
      latitudAMercatorY(puntoFinal[0]) - latitudAMercatorY(puntoInicial[0]));
    const subdivisiones = Math.max(1, Math.ceil(longitudTramoKm / 0.15)); // un punto cada ~150 m para seguir el relieve
    for (let paso = indicePunto === 0 ? 0 : 1; paso <= subdivisiones; paso++) {
      const fraccion = paso / subdivisiones;
      const latitud = puntoInicial[0] + (puntoFinal[0] - puntoInicial[0]) * fraccion;
      const longitud = puntoInicial[1] + (puntoFinal[1] - puntoInicial[1]) * fraccion;
      const puntoEnEscena = [
        longitudAMercatorX(longitud) - centroMercatorX,
        (alturaEnMetros(latitud, longitud) / 1000) * escalaVertical + 0.04,
        -(latitudAMercatorY(latitud) - centroMercatorY)
      ];
      if (puntoAnterior) segmentosSalida.push(...puntoAnterior, ...puntoEnEscena);
      puntoAnterior = puntoEnEscena;
    }
  }
}

export function construirRutas() {
  const lineasPorOperador = [{}, {}]; // [Global, Municipales]: número de línea -> casilla de visibilidad
  datosGuaguas.rutas.forEach((datosRuta) => {
    if (!datosRuta.ida || !datosRuta.vuelta) return;
    const indiceOperador = datosRuta.operador === "Global" ? 0 : 1;
    const segmentosIda = [], segmentosVuelta = [];
    agregarTrazadoAlRelieve(datosRuta.ida.trazado, segmentosIda);
    agregarTrazadoAlRelieve(datosRuta.vuelta.trazado, segmentosVuelta);
    if (segmentosIda.length < 6 || segmentosVuelta.length < 6) return;
    const geometria = new THREE.BufferGeometry();
    geometria.setAttribute("position", new THREE.Float32BufferAttribute(segmentosIda.concat(segmentosVuelta), 3));
    const lineasEnEscena = new THREE.LineSegments(geometria, materialesLinea[indiceOperador]);
    lineasEnEscena.frustumCulled = false;
    escena.add(lineasEnEscena);
    const casillaLinea = lineasPorOperador[indiceOperador][datosRuta.linea] || (lineasPorOperador[indiceOperador][datosRuta.linea] = { visible: true });
    rutasCargadas.push({
      indiceOperador, numeroLinea: String(datosRuta.linea), casillaLinea, lineasEnEscena, mostrada: true, datosRuta,
      ida: datosRuta.ida, vuelta: datosRuta.vuelta,
      caminoIda: crearCaminoDesdeSegmentos(segmentosIda), caminoVuelta: crearCaminoDesdeSegmentos(segmentosVuelta),
      segmentosIda, segmentosVuelta
    });
  });
  return lineasPorOperador;
}
