import * as THREE from "three";
import { estadoVisor } from "./config.js";
import { renderizador, escena, camara, controles } from "./escena.js";
import { cargarAltura } from "./altura.js";
import { construirTeselas, actualizarTeselas } from "./teselas.js";
import { construirRutas } from "./rutas.js";
import { construirPanelControl } from "./gui.js";
import { construirGuaguas, actualizarGuaguas } from "./simulacion.js";

// Primero el mapa de alturas; después todo lo demás
cargarAltura(() => {
  construirTeselas();
  construirPanelControl(construirRutas());
  construirGuaguas();
  const relojInterno = new THREE.Clock();
  controles.addEventListener("change", () => { estadoVisor.necesitaActualizarTeselas = true; });
  renderizador.setAnimationLoop(() => {
    actualizarGuaguas(relojInterno.getDelta());
    controles.panSpeed = 1 + 3 * (1 - Math.min(camara.position.distanceTo(controles.target) / 20, 1)); // más rápido al acercarse
    controles.update();
    if (estadoVisor.necesitaActualizarTeselas) {
      estadoVisor.necesitaActualizarTeselas = false;
      actualizarTeselas();
    }
    renderizador.render(escena, camara);
  });
});