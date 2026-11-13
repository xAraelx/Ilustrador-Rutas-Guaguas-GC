import * as THREE from "three";
import { rutasCargadas, estadoVisor, materialesLinea } from "./config.js";
import { longitudAMercatorX, latitudAMercatorY, centroMercatorX, centroMercatorY, escalaVertical } from "./proyeccion.js";
import { alturaEnMetros } from "./altura.js";
import { escena, camara, renderizador, controles } from "./escena.js";

// ---- Clic en una ruta: resaltado, paradas y panel de información ----
const estilos = document.createElement("style");
estilos.textContent =
  "#panel-ruta{position:fixed;left:8px;top:8px;width:300px;max-height:85vh;display:none;flex-direction:column;font:13px system-ui,sans-serif;background:#fff;border-radius:10px;box-shadow:0 4px 18px #0005;overflow:hidden}" +
  "#panel-ruta .cabecera{display:flex;align-items:center;gap:10px;padding:10px 12px}" +
  "#panel-ruta .numero-linea{background:#fff;color:#111;font:700 20px system-ui,sans-serif;min-width:46px;text-align:center;padding:4px 6px;border-radius:6px}" +
  "#panel-ruta .titulo{flex:1;line-height:1.3} #panel-ruta .cerrar{cursor:pointer;font-size:18px}" +
  "#panel-ruta .cuerpo{padding:6px 12px 0} #panel-ruta a.boton-horarios{display:inline-block;margin:4px 0;padding:5px 12px;border-radius:14px;background:#00bcd4;color:#fff;text-decoration:none;font-weight:600}" +
  "#panel-ruta .pestanas{display:flex;gap:6px;margin:8px 0} #panel-ruta .pestana{flex:1;text-align:center;padding:5px;border-radius:6px;background:#eef1f4;cursor:pointer;font-weight:600} #panel-ruta .pestana.activa{background:#00bcd4;color:#fff}" +
  "#panel-ruta ol{list-style:none;margin:0;padding:6px 12px 12px 18px} #panel-ruta li{position:relative;padding:4px 0 4px 16px;border-left:2px solid #00bcd4}" +
  "#panel-ruta li:before{content:'';position:absolute;left:-8px;top:8px;width:10px;height:10px;border-radius:50%;background:#fff;border:2px solid #00bcd4} #panel-ruta li.extremo:before{background:#00bcd4} #panel-ruta li.extremo{font-weight:600}" +
  "#panel-ruta .aviso{color:#b00;font-size:12px;margin:4px 0} #panel-ruta small{color:#666}" +
  "#panel-ruta.sentido-vuelta .pestana.activa{background:#ffa000} #panel-ruta.sentido-vuelta li{border-left-color:#ffa000} #panel-ruta.sentido-vuelta li:before{border-color:#ffa000} #panel-ruta.sentido-vuelta li.extremo:before{background:#ffa000}";
document.head.appendChild(estilos);
const panelInformacion = document.createElement("div");
panelInformacion.id = "panel-ruta";
document.body.appendChild(panelInformacion);
const escaparHtml = (texto) => String(texto).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
let lineaResaltada = null, paradasResaltadas = null;

function rellenarPanel(ruta) {
  panelInformacion.className = "";
  const datosRuta = ruta.datosRuta;
  const estiloCabecera = ruta.indiceOperador ? "background:#d9a800;color:#222" : "background:#1f6fff;color:#fff";
  const listaDeParadas = (sentido) => {
    const cantidadParadas = sentido.paradas.length;
    return "<ol>" + sentido.paradas.map((parada, posicion) =>
      '<li class="' + (posicion === 0 || posicion === cantidadParadas - 1 ? "extremo" : "") + '">' + escaparHtml(parada.n) + "</li>").join("") + "</ol>";
  };
  panelInformacion.innerHTML =
    '<div class="cabecera" style="' + estiloCabecera + '"><div class="numero-linea">' + escaparHtml(datosRuta.linea) + '</div><div class="titulo"><b>' + escaparHtml(datosRuta.operador) + "</b><br>" +
    escaparHtml(ruta.ida.from) + " ⇄ " + escaparHtml(ruta.ida.to) + '</div><div class="cerrar" id="boton-cerrar">✕</div></div>' +
    '<div class="cuerpo"><a class="boton-horarios" href="' + escaparHtml(datosRuta.info) + '" target="_blank" rel="noopener">Ver horarios</a>' +
    (datosRuta.dudosa ? '<div class="aviso">La vuelta es una variante distinta de la ida.</div>' : "") +
    '<div class="pestanas"><div class="pestana activa" id="pestana-ida">Ida · ' + ruta.ida.paradas.length + '</div><div class="pestana" id="pestana-vuelta">Vuelta · ' + ruta.vuelta.paradas.length + "</div></div>" +
    (ruta.ida.paradasAprox || ruta.vuelta.paradasAprox ? "<small>Posición de algunas paradas aproximada</small>" : "") + "</div>" +
    '<div id="lista-paradas" style="overflow:auto;flex:1;min-height:0">' + listaDeParadas(ruta.ida) + "</div>";
  const mostrarSentido = (indiceSentido) => { // 0 = ida, 1 = vuelta
    mostrarParadasEnMapa(ruta, indiceSentido);
    panelInformacion.className = indiceSentido ? "sentido-vuelta" : "";
    document.getElementById("lista-paradas").innerHTML = listaDeParadas(indiceSentido ? ruta.vuelta : ruta.ida);
    document.getElementById("pestana-ida").className = "pestana" + (indiceSentido ? "" : " activa");
    document.getElementById("pestana-vuelta").className = "pestana" + (indiceSentido ? " activa" : "");
  };
  document.getElementById("pestana-ida").onclick = () => mostrarSentido(0);
  document.getElementById("pestana-vuelta").onclick = () => mostrarSentido(1);
  document.getElementById("boton-cerrar").onclick = () => seleccionarRuta(-1);
}

const COLOR_PARADAS_POR_SENTIDO = [0x00e5ff, 0xffb300]; // ida: cian, vuelta: ámbar
function mostrarParadasEnMapa(ruta, indiceSentido) {
  if (paradasResaltadas) { escena.remove(paradasResaltadas); paradasResaltadas.children[0].geometry.dispose(); paradasResaltadas = null; }
  const posicionesParadas = [];
  (indiceSentido ? ruta.vuelta : ruta.ida).paradas.forEach((parada) => {
    const latitud = parada.p[0], longitud = parada.p[1];
    posicionesParadas.push(
      longitudAMercatorX(longitud) - centroMercatorX,
      (alturaEnMetros(latitud, longitud) / 1000) * escalaVertical + 0.08,
      -(latitudAMercatorY(latitud) - centroMercatorY));
  });
  const geometria = new THREE.BufferGeometry();
  geometria.setAttribute("position", new THREE.Float32BufferAttribute(posicionesParadas, 3));
  const puntosBorde = new THREE.Points(geometria, new THREE.PointsMaterial({ color: 0x003c46, size: 14, sizeAttenuation: false }));
  const puntosCentro = new THREE.Points(geometria, new THREE.PointsMaterial({ color: COLOR_PARADAS_POR_SENTIDO[indiceSentido], size: 8, sizeAttenuation: false }));
  puntosCentro.position.y = 0.015;
  puntosBorde.frustumCulled = puntosCentro.frustumCulled = false;
  paradasResaltadas = new THREE.Group();
  paradasResaltadas.add(puntosBorde, puntosCentro);
  escena.add(paradasResaltadas);
}

export function seleccionarRuta(indiceRuta) { // -1 = ninguna
  estadoVisor.rutaSeleccionada = indiceRuta;
  if (lineaResaltada) { escena.remove(lineaResaltada); lineaResaltada.geometry.dispose(); lineaResaltada = null; }
  if (paradasResaltadas) { escena.remove(paradasResaltadas); paradasResaltadas.children[0].geometry.dispose(); paradasResaltadas = null; }
  materialesLinea.forEach((material) => { material.opacity = indiceRuta < 0 ? 1 : 0.2; });
  panelInformacion.style.display = indiceRuta < 0 ? "none" : "flex";
  if (indiceRuta < 0) return;
  const ruta = rutasCargadas[indiceRuta];
  const geometriaResaltada = new THREE.BufferGeometry();
  geometriaResaltada.setAttribute("position", new THREE.Float32BufferAttribute(ruta.segmentosIda.concat(ruta.segmentosVuelta), 3));
  lineaResaltada = new THREE.LineSegments(geometriaResaltada, new THREE.LineBasicMaterial({ color: 0xe60000 }));
  lineaResaltada.position.y = 0.02;
  lineaResaltada.frustumCulled = false;
  escena.add(lineaResaltada);
  mostrarParadasEnMapa(ruta, 0);
  rellenarPanel(ruta);
}

const rayo = new THREE.Raycaster(), posicionRaton = new THREE.Vector2();
let posicionPulsado = null;
renderizador.domElement.addEventListener("pointerdown", (evento) => { posicionPulsado = [evento.clientX, evento.clientY]; });
renderizador.domElement.addEventListener("pointerup", (evento) => {
  if (!posicionPulsado || Math.hypot(evento.clientX - posicionPulsado[0], evento.clientY - posicionPulsado[1]) > 4) return; // era un arrastre, no un clic
  posicionRaton.set((evento.clientX / window.innerWidth) * 2 - 1, -(evento.clientY / window.innerHeight) * 2 + 1);
  rayo.setFromCamera(posicionRaton, camara);
  rayo.params.Line.threshold = Math.max(camara.position.distanceTo(controles.target) * 0.004, 0.03);
  let mejorInterseccion = null, indiceMejorRuta = -1;
  rutasCargadas.forEach((ruta, indiceRuta) => {
    if (!ruta.mostrada) return;
    const interseccion = rayo.intersectObject(ruta.lineasEnEscena)[0];
    if (interseccion && (!mejorInterseccion || interseccion.distance < mejorInterseccion.distance)) { mejorInterseccion = interseccion; indiceMejorRuta = indiceRuta; }
  });
  seleccionarRuta(indiceMejorRuta);
});
window.addEventListener("keydown", (evento) => { if (evento.key === "Escape") seleccionarRuta(-1); });
