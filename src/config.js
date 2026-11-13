import * as THREE from "three";

// ---- Límites del mapa de alturas (gran_canaria_altura_limites.json) ----
export const OESTE = -15.84546, ESTE = -15.33995, SUR = 27.67844, NORTE = 28.18252;
export const ALTURA_MAXIMA_METROS = 1950;
export const EXAGERACION_VERTICAL = 1.6;
export const ZOOM_MINIMO = 9, ZOOM_MAXIMO = 14;   // niveles de zoom de las teselas
export const FACTOR_DETALLE = 1.6;                // más alto = más detalle (más teselas)
export const SEGMENTOS_POR_TESELA = 24;
export const MAX_DESCARGAS_SIMULTANEAS = 4;

// ---- Guaguas ----
export const MAX_GUAGUAS_POR_SENTIDO = 3;
export const HUECOS_POR_RUTA = 2 * MAX_GUAGUAS_POR_SENTIDO; // ida + vuelta
export const ESPERA_EN_CABECERA_MINUTOS = 2;
export const COLORES_LINEA = { Global: 0x1a3a8f, Municipales: 0x9a7a00 };
export const COLORES_GUAGUA = [new THREE.Color(0x1f6fff), new THREE.Color(0xffd400)]; // azul Global, amarillo Municipales

// ---- Estado compartido ----
export const simulacion = { minutos: 360, velocidad: 60, reproduciendo: true, guaguasPorSentido: 1 }; // minutos desde las 00:00
export const estadoVisor = { necesitaActualizarTeselas: true, rutaSeleccionada: -1 };
export const rutasCargadas = [];
export const busqueda = { texto: "" };
export const reloj = { texto: "06:00" };
export const materialesLinea = [
  new THREE.LineBasicMaterial({ color: COLORES_LINEA.Global, transparent: true }),
  new THREE.LineBasicMaterial({ color: COLORES_LINEA.Municipales, transparent: true })
];
