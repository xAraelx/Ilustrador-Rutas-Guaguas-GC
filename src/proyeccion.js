import { OESTE, ESTE, SUR, NORTE, EXAGERACION_VERTICAL } from "./config.js";

// Todo en Web Mercator (km), centrado en la isla
const RADIO_TIERRA_METROS = 6378137;
export const CIRCUNFERENCIA_KM = (2 * Math.PI * RADIO_TIERRA_METROS) / 1000;
export const longitudAMercatorX = (longitud) => (longitud / 360) * CIRCUNFERENCIA_KM;
export const latitudAMercatorY = (latitud) =>
  (RADIO_TIERRA_METROS / 1000) * Math.log(Math.tan(Math.PI / 4 + (latitud * Math.PI) / 360));
export const centroMercatorX = longitudAMercatorX((OESTE + ESTE) / 2);
export const centroMercatorY = latitudAMercatorY((SUR + NORTE) / 2);
export const escalaVertical = EXAGERACION_VERTICAL / Math.cos((((SUR + NORTE) / 2) * Math.PI) / 180); // Mercator estira ~1.13
