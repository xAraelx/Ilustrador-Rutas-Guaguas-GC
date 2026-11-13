import GUI from "lil-gui";
import { rutasCargadas, simulacion, busqueda, reloj, estadoVisor, MAX_GUAGUAS_POR_SENTIDO } from "./config.js";
import { seleccionarRuta } from "./seleccion.js";

const casillasPorOperador = [[], []]; // casillas de cada línea, por operador

function aplicarVisibilidad() {
  const numerosBuscados = busqueda.texto.toLowerCase().split(/[\s,;]+/).filter(Boolean);
  rutasCargadas.forEach((ruta) => {
    // con búsqueda, manda la búsqueda; sin ella, mandan las casillas
    ruta.mostrada = numerosBuscados.length ? numerosBuscados.indexOf(ruta.numeroLinea.toLowerCase()) >= 0 : ruta.casillaLinea.visible;
    ruta.lineasEnEscena.visible = ruta.mostrada;
  });
  if (estadoVisor.rutaSeleccionada >= 0 && !rutasCargadas[estadoVisor.rutaSeleccionada].mostrada) seleccionarRuta(-1);
}

export function construirPanelControl(lineasPorOperador) {
  const panelControl = new GUI({ title: "Guaguas" });
  panelControl.add(reloj, "texto").name("Hora").listen().disable();
  panelControl.add(simulacion, "velocidad", 1, 1200, 1).name("Velocidad (x)");
  panelControl.add(simulacion, "reproduciendo").name("Reproducir");
  panelControl.add(simulacion, "guaguasPorSentido", 1, MAX_GUAGUAS_POR_SENTIDO, 1).name("Guaguas por sentido");
  panelControl.add(busqueda, "texto").name("Buscar línea (nº)").onChange(() => {
    aplicarVisibilidad();
    const rutasCoincidentes = [];
    rutasCargadas.forEach((ruta, indiceRuta) => { if (ruta.mostrada) rutasCoincidentes.push(indiceRuta); });
    if (busqueda.texto.trim() && rutasCoincidentes.length === 1) seleccionarRuta(rutasCoincidentes[0]);
  });
  ["Global", "Municipales"].forEach((nombreOperador, indiceOperador) => {
    const estadoOperador = {};
    estadoOperador[nombreOperador] = true;
    panelControl.add(estadoOperador, nombreOperador).name(nombreOperador + " (todas / ninguna)").onChange((marcado) => {
      Object.keys(lineasPorOperador[indiceOperador]).forEach((numeroLinea) => { lineasPorOperador[indiceOperador][numeroLinea].visible = marcado; });
      casillasPorOperador[indiceOperador].forEach((casilla) => casilla.updateDisplay());
      aplicarVisibilidad();
    });
  });
  ["Global", "Municipales"].forEach((nombreOperador, indiceOperador) => {
    const carpetaOperador = panelControl.addFolder("Líneas " + nombreOperador).close();
    const carpetasPorTramo = {}; // tramos de 50 en 50: 1–50, 51–100...
    Object.keys(lineasPorOperador[indiceOperador])
      .sort((lineaA, lineaB) => (parseInt(lineaA, 10) || 0) - (parseInt(lineaB, 10) || 0) || (lineaA < lineaB ? -1 : 1))
      .forEach((numeroLinea) => {
        const tramo = Math.floor(((parseInt(numeroLinea, 10) || 1) - 1) / 50);
        if (!carpetasPorTramo[tramo]) carpetasPorTramo[tramo] = carpetaOperador.addFolder(tramo * 50 + 1 + "–" + (tramo * 50 + 50)).close();
        casillasPorOperador[indiceOperador].push(
          carpetasPorTramo[tramo].add(lineasPorOperador[indiceOperador][numeroLinea], "visible").name("Línea " + numeroLinea).onChange(aplicarVisibilidad));
      });
  });
}
