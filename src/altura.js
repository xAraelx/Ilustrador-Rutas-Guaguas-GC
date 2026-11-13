import urlImagenAltura from "./gran_canaria_altura.png";
import { OESTE, ESTE, SUR, NORTE, ALTURA_MAXIMA_METROS } from "./config.js";

let pixelesAltura, anchoImagen, altoImagen;

export function alturaEnMetros(latitud, longitud) {
  const columnaDecimal = ((longitud - OESTE) / (ESTE - OESTE)) * (anchoImagen - 1);
  const filaDecimal = ((NORTE - latitud) / (NORTE - SUR)) * (altoImagen - 1);
  if (columnaDecimal < 0 || filaDecimal < 0 || columnaDecimal > anchoImagen - 1 || filaDecimal > altoImagen - 1) return 0;
  const columnaIzquierda = Math.floor(columnaDecimal), filaSuperior = Math.floor(filaDecimal);
  const columnaDerecha = Math.min(columnaIzquierda + 1, anchoImagen - 1), filaInferior = Math.min(filaSuperior + 1, altoImagen - 1);
  const pesoHorizontal = columnaDecimal - columnaIzquierda, pesoVertical = filaDecimal - filaSuperior;
  const grisEn = (columna, fila) => pixelesAltura[(fila * anchoImagen + columna) * 4];
  const grisInterpolado =
    (grisEn(columnaIzquierda, filaSuperior) * (1 - pesoHorizontal) + grisEn(columnaDerecha, filaSuperior) * pesoHorizontal) * (1 - pesoVertical) +
    (grisEn(columnaIzquierda, filaInferior) * (1 - pesoHorizontal) + grisEn(columnaDerecha, filaInferior) * pesoHorizontal) * pesoVertical;
  return (grisInterpolado / 255) * ALTURA_MAXIMA_METROS;
}

export function cargarAltura(alTerminarDeCargar) {
  const imagenAltura = new Image();
  imagenAltura.crossOrigin = "anonymous";
  imagenAltura.onload = () => {
    const lienzo = document.createElement("canvas");
    anchoImagen = lienzo.width = imagenAltura.width;
    altoImagen = lienzo.height = imagenAltura.height;
    const contexto = lienzo.getContext("2d");
    contexto.drawImage(imagenAltura, 0, 0);
    pixelesAltura = contexto.getImageData(0, 0, anchoImagen, altoImagen).data;
    alTerminarDeCargar();
  };
  imagenAltura.src = urlImagenAltura;
}
