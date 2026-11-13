import * as THREE from "three";
import { rutasCargadas, simulacion, reloj, COLORES_GUAGUA, ESPERA_EN_CABECERA_MINUTOS, HUECOS_POR_RUTA } from "./config.js";
import { escena, camara } from "./escena.js";
import { posicionEnCamino } from "./camino.js";

// ---- Simulación: varias guaguas por sentido en cada ruta, con relevo en cada cabecera ----
let mallaGuaguas;
const objetoAuxiliar = new THREE.Object3D(), posicionActual = new THREE.Vector3(), direccionAvance = { x: 0, z: 1 };

export function construirGuaguas() {
  mallaGuaguas = new THREE.InstancedMesh(new THREE.BoxGeometry(0.6, 0.45, 1.6), new THREE.MeshBasicMaterial(), rutasCargadas.length * HUECOS_POR_RUTA);
  mallaGuaguas.frustumCulled = false;
  rutasCargadas.forEach((ruta, indiceRuta) => {
    for (let numeroGuagua = 0; numeroGuagua < HUECOS_POR_RUTA; numeroGuagua++) {
      mallaGuaguas.setColorAt(indiceRuta * HUECOS_POR_RUTA + numeroGuagua, COLORES_GUAGUA[ruta.indiceOperador]);
    }
  });
  mallaGuaguas.instanceColor.needsUpdate = true;
  escena.add(mallaGuaguas);
}

export function actualizarGuaguas(segundosTranscurridos) {
  segundosTranscurridos = Math.min(segundosTranscurridos, 0.1);
  if (simulacion.reproduciendo) {
    simulacion.minutos += (segundosTranscurridos * simulacion.velocidad) / 60;
    if (simulacion.minutos > 1700) simulacion.minutos = 360;
  }
  rutasCargadas.forEach((ruta, indiceRuta) => {
    const duracionIda = ruta.ida.durMin, duracionVuelta = ruta.vuelta.durMin;
    const duracionCiclo = duracionIda + duracionVuelta + 2 * ESPERA_EN_CABECERA_MINUTOS;
    const separacionEntreSalidas = ((duracionIda + duracionVuelta) / 2 + ESPERA_EN_CABECERA_MINUTOS) / simulacion.guaguasPorSentido;
    const minutoPrimeraSalida = ruta.ida.salida[0];
    for (let numeroGuagua = 0; numeroGuagua < HUECOS_POR_RUTA; numeroGuagua++) {
      const minutosDesdeSalida = simulacion.minutos - (minutoPrimeraSalida + numeroGuagua * separacionEntreSalidas);
      let estaEnMarcha = false;
      if (minutosDesdeSalida >= 0 && numeroGuagua < 2 * simulacion.guaguasPorSentido && ruta.mostrada) {
        const ciclosCompletados = Math.floor(minutosDesdeSalida / duracionCiclo);
        const minutoDentroDelCiclo = minutosDesdeSalida - ciclosCompletados * duracionCiclo;
        const minutoSalidaDelCiclo = minutoPrimeraSalida + numeroGuagua * separacionEntreSalidas + ciclosCompletados * duracionCiclo;
        if (minutoDentroDelCiclo < duracionIda && minutoSalidaDelCiclo <= ruta.ida.salida[1]) {
          posicionEnCamino(ruta.caminoIda, minutoDentroDelCiclo / duracionIda, posicionActual, direccionAvance);
          estaEnMarcha = true;
        } else if (
          minutoDentroDelCiclo >= duracionIda + ESPERA_EN_CABECERA_MINUTOS &&
          minutoDentroDelCiclo < duracionIda + ESPERA_EN_CABECERA_MINUTOS + duracionVuelta &&
          minutoSalidaDelCiclo + duracionIda + ESPERA_EN_CABECERA_MINUTOS <= ruta.vuelta.salida[1]
        ) {
          posicionEnCamino(ruta.caminoVuelta, (minutoDentroDelCiclo - duracionIda - ESPERA_EN_CABECERA_MINUTOS) / duracionVuelta, posicionActual, direccionAvance);
          estaEnMarcha = true;
        }
      }
      if (estaEnMarcha) {
        const tamanoGuagua = Math.min(Math.max(camara.position.distanceTo(posicionActual) * 0.012, 0.015), 1.6);
        objetoAuxiliar.position.set(posicionActual.x, posicionActual.y + tamanoGuagua * 0.3, posicionActual.z);
        objetoAuxiliar.rotation.y = Math.atan2(direccionAvance.x, direccionAvance.z);
        objetoAuxiliar.scale.setScalar(tamanoGuagua);
      } else objetoAuxiliar.scale.setScalar(0);
      objetoAuxiliar.updateMatrix();
      mallaGuaguas.setMatrixAt(indiceRuta * HUECOS_POR_RUTA + numeroGuagua, objetoAuxiliar.matrix);
    }
  });
  mallaGuaguas.instanceMatrix.needsUpdate = true;
  const minutoDelDia = Math.floor(simulacion.minutos) % 1440;
  reloj.texto = ("0" + Math.floor(minutoDelDia / 60)).slice(-2) + ":" + ("0" + (minutoDelDia % 60)).slice(-2) + (simulacion.minutos >= 1440 ? " (+1 día)" : "");
}
