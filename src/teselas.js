import * as THREE from "three";
import {
  OESTE, ESTE, SUR, NORTE, ZOOM_MINIMO, ZOOM_MAXIMO, FACTOR_DETALLE, SEGMENTOS_POR_TESELA,
  MAX_DESCARGAS_SIMULTANEAS, estadoVisor
} from "./config.js";
import { CIRCUNFERENCIA_KM, centroMercatorX, centroMercatorY, escalaVertical } from "./proyeccion.js";
import { alturaEnMetros } from "./altura.js";
import { renderizador, escena, camara } from "./escena.js";

// ---- Teselas de OSM con niveles de detalle ----
const cargadorTexturas = new THREE.TextureLoader();
cargadorTexturas.setCrossOrigin("anonymous");
const anisotropiaMaxima = renderizador.capabilities.getMaxAnisotropy();
const colaDescargas = [];
let descargasActivas = 0;

function procesarColaDescargas() {
  while (descargasActivas < MAX_DESCARGAS_SIMULTANEAS && colaDescargas.length) {
    const nodo = colaDescargas.shift();
    descargasActivas++;
    cargadorTexturas.load(
      "https://tile.openstreetmap.org/" + nodo.zoom + "/" + nodo.columna + "/" + nodo.fila + ".png",
      (textura) => {
        textura.colorSpace = THREE.SRGBColorSpace;
        textura.anisotropy = anisotropiaMaxima;
        nodo.malla.material.map = textura;
        nodo.malla.material.needsUpdate = true;
        terminarDescarga(nodo);
      },
      undefined,
      () => terminarDescarga(nodo)
    );
  }
}
function terminarDescarga(nodo) {
  nodo.lista = true;
  descargasActivas--;
  estadoVisor.necesitaActualizarTeselas = true;
  procesarColaDescargas();
}

const latitudDeTesela = (fraccionY) => (Math.atan(Math.sinh(Math.PI * (1 - 2 * fraccionY))) * 180) / Math.PI;
function teselaTocaLaIsla(zoom, columna, fila) {
  const teselasPorLado = Math.pow(2, zoom);
  const longitudOeste = (columna / teselasPorLado) * 360 - 180;
  const longitudEste = ((columna + 1) / teselasPorLado) * 360 - 180;
  return longitudEste > OESTE && longitudOeste < ESTE &&
    latitudDeTesela(fila / teselasPorLado) > SUR && latitudDeTesela((fila + 1) / teselasPorLado) < NORTE;
}

function crearNodoTesela(zoom, columna, fila) {
  const teselasPorLado = Math.pow(2, zoom), verticesPorLado = SEGMENTOS_POR_TESELA + 3;
  const posiciones = [], coordenadasTextura = [], indices = [];
  for (let filaVertice = -1; filaVertice <= SEGMENTOS_POR_TESELA + 1; filaVertice++) {
    for (let columnaVertice = -1; columnaVertice <= SEGMENTOS_POR_TESELA + 1; columnaVertice++) {
      const columnaAjustada = Math.min(Math.max(columnaVertice, 0), SEGMENTOS_POR_TESELA);
      const filaAjustada = Math.min(Math.max(filaVertice, 0), SEGMENTOS_POR_TESELA);
      const fraccionX = (columna + columnaAjustada / SEGMENTOS_POR_TESELA) / teselasPorLado;
      const fraccionY = (fila + filaAjustada / SEGMENTOS_POR_TESELA) / teselasPorLado;
      const latitud = latitudDeTesela(fraccionY), longitud = fraccionX * 360 - 180;
      const descensoFaldon = columnaVertice !== columnaAjustada || filaVertice !== filaAjustada ? 0.25 : 0; // tapa grietas entre niveles
      posiciones.push(
        (fraccionX - 0.5) * CIRCUNFERENCIA_KM - centroMercatorX,
        (alturaEnMetros(latitud, longitud) / 1000) * escalaVertical - descensoFaldon,
        -((0.5 - fraccionY) * CIRCUNFERENCIA_KM - centroMercatorY)
      );
      coordenadasTextura.push(columnaAjustada / SEGMENTOS_POR_TESELA, 1 - filaAjustada / SEGMENTOS_POR_TESELA);
    }
  }
  for (let filaCuadro = 0; filaCuadro < verticesPorLado - 1; filaCuadro++) {
    for (let columnaCuadro = 0; columnaCuadro < verticesPorLado - 1; columnaCuadro++) {
      const superiorIzquierda = filaCuadro * verticesPorLado + columnaCuadro, superiorDerecha = superiorIzquierda + 1;
      const inferiorIzquierda = superiorIzquierda + verticesPorLado, inferiorDerecha = inferiorIzquierda + 1;
      indices.push(superiorIzquierda, inferiorIzquierda, superiorDerecha, superiorDerecha, inferiorIzquierda, inferiorDerecha);
    }
  }
  const geometria = new THREE.BufferGeometry();
  geometria.setAttribute("position", new THREE.Float32BufferAttribute(posiciones, 3));
  geometria.setAttribute("uv", new THREE.Float32BufferAttribute(coordenadasTextura, 2));
  geometria.setIndex(indices);
  geometria.computeVertexNormals();
  geometria.computeBoundingSphere();
  const malla = new THREE.Mesh(geometria, new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide }));
  malla.visible = false;
  malla.frustumCulled = false;
  escena.add(malla);
  const nodo = { zoom, columna, fila, malla, esfera: geometria.boundingSphere, tamanoKm: CIRCUNFERENCIA_KM / teselasPorLado, lista: false, hijos: null };
  colaDescargas.push(nodo);
  procesarColaDescargas();
  return nodo;
}

function crearHijosSiFaltan(nodo) {
  if (nodo.hijos) return;
  nodo.hijos = [];
  for (let desplazamientoFila = 0; desplazamientoFila < 2; desplazamientoFila++) {
    for (let desplazamientoColumna = 0; desplazamientoColumna < 2; desplazamientoColumna++) {
      const columnaHijo = nodo.columna * 2 + desplazamientoColumna, filaHijo = nodo.fila * 2 + desplazamientoFila;
      if (teselaTocaLaIsla(nodo.zoom + 1, columnaHijo, filaHijo)) nodo.hijos.push(crearNodoTesela(nodo.zoom + 1, columnaHijo, filaHijo));
    }
  }
}

const volumenVisibleCamara = new THREE.Frustum(), matrizProyeccion = new THREE.Matrix4();
function ocultarNodo(nodo) { nodo.malla.visible = false; if (nodo.hijos) nodo.hijos.forEach(ocultarNodo); }
function actualizarNodo(nodo) {
  if (!volumenVisibleCamara.intersectsSphere(nodo.esfera)) { ocultarNodo(nodo); return; }
  const distanciaACamara = camara.position.distanceTo(nodo.esfera.center);
  if (nodo.zoom < ZOOM_MAXIMO && distanciaACamara < nodo.tamanoKm * FACTOR_DETALLE) {
    crearHijosSiFaltan(nodo);
    if (nodo.hijos.length && nodo.hijos.every((hijo) => hijo.lista)) {
      nodo.malla.visible = false;
      nodo.hijos.forEach(actualizarNodo);
      return;
    }
  }
  nodo.malla.visible = true;
  if (nodo.hijos) nodo.hijos.forEach(ocultarNodo);
}

const nodosRaiz = [];
export function construirTeselas() {
  const teselasPorLado = Math.pow(2, ZOOM_MINIMO);
  const filaDeTeselaParaLatitud = (latitud) =>
    (1 - Math.log(Math.tan((latitud * Math.PI) / 180) + 1 / Math.cos((latitud * Math.PI) / 180)) / Math.PI) / 2;
  const columnaMinima = Math.floor(((OESTE + 180) / 360) * teselasPorLado), columnaMaxima = Math.floor(((ESTE + 180) / 360) * teselasPorLado);
  const filaMinima = Math.floor(filaDeTeselaParaLatitud(NORTE) * teselasPorLado), filaMaxima = Math.floor(filaDeTeselaParaLatitud(SUR) * teselasPorLado);
  for (let fila = filaMinima; fila <= filaMaxima; fila++) {
    for (let columna = columnaMinima; columna <= columnaMaxima; columna++) nodosRaiz.push(crearNodoTesela(ZOOM_MINIMO, columna, fila));
  }
}

export function actualizarTeselas() {
  camara.updateMatrixWorld();
  volumenVisibleCamara.setFromProjectionMatrix(matrizProyeccion.multiplyMatrices(camara.projectionMatrix, camara.matrixWorldInverse));
  nodosRaiz.forEach(actualizarNodo);
}
