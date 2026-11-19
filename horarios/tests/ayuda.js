// Utilidades compartidas por las pruebas.
const C = require('../js/core.js');
const DATOS = require('../ejemplos/datos-ejemplo.js');

const INICIO = '2026-11-19'; // jueves
const clonar = (x) => JSON.parse(JSON.stringify(x));

// Libro de ejemplo, opcionalmente modificado: libro((d) => { d.reglas.push(...) })
function libro(cambios) {
  const d = clonar(DATOS);
  if (cambios) cambios(d);
  return d;
}
function catalogos(cambios) {
  const d = libro(cambios);
  const K = C.prepararLibro(d);
  K.novedades = d.novedades;
  return K;
}

function semana(K, op) {
  return C.generarSemana(K, Object.assign({ inicio: INICIO, novedades: K.novedades || DATOS.novedades }, op));
}

const fila = (s, nomina, i) => C.celda(s, nomina, i);
const criterio = (v, n) => v.criterios.find((c) => c.n === n);
const textos = (v, n) => criterio(v, n).detalles.map((d) => d.texto);
// Días (0 = jueves … 6 = miércoles) en que la persona tiene cierto tipo.
const diasCon = (s, nomina, pred) => [0, 1, 2, 3, 4, 5, 6].filter((i) => pred(fila(s, nomina, i)));
const enTienda = (K, s, tienda, i) => s.filas.filter((r) => r.fecha === s.fechas[i] && r.tipo === 'TRABAJA' && C.buscarTienda(K, r.sucursal) === C.buscarTienda(K, tienda));

module.exports = { C, DATOS, INICIO, clonar, libro, catalogos, semana, fila, criterio, textos, diasCon, enTienda };
