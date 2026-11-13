import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { estadoVisor } from "./config.js";

export const renderizador = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
renderizador.setPixelRatio(window.devicePixelRatio);
renderizador.setSize(window.innerWidth, window.innerHeight);
document.getElementById("app").appendChild(renderizador.domElement);
export const escena = new THREE.Scene();
escena.background = new THREE.Color(0xaad3df);
export const camara = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.05, 1000);
camara.position.set(0, 95, 70);
escena.add(new THREE.AmbientLight(0xffffff, 0.75));
const luzSolar = new THREE.DirectionalLight(0xffffff, 0.8);
luzSolar.position.set(-50, 80, -30);
escena.add(luzSolar);
export const controles = new OrbitControls(camara, renderizador.domElement);
controles.enableDamping = true;
controles.zoomToCursor = true;
controles.minDistance = 0.15;
controles.maxDistance = 160;
controles.maxPolarAngle = 1.45;
controles.zoomSpeed = 1.6;
window.addEventListener("resize", () => {
  camara.aspect = window.innerWidth / window.innerHeight;
  camara.updateProjectionMatrix();
  renderizador.setSize(window.innerWidth, window.innerHeight);
  estadoVisor.necesitaActualizarTeselas = true;
});

const textoCreditos = document.createElement("div");
textoCreditos.textContent = "© OpenStreetMap contributors · Relieve: CNIG/IGN · Rutas: Global y Guaguas Municipales";
textoCreditos.style.cssText = "position:fixed;right:6px;bottom:4px;font:11px sans-serif;background:#fffc;padding:2px 6px;border-radius:3px";
document.body.appendChild(textoCreditos);
