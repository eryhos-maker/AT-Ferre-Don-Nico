/*
 * Genera js/historico.js: el histórico de ventas por hora que la app trae incluido.
 *
 * Uso:  node datos/generar-historico.js <reporte_SAP.txt> ["Nombre que se muestra"] [--con-importe]
 *
 * El reporte de SAP viene separado por ";" con las columnas:
 *   # ; U_SO1_FECHA ; U_SO1_HORACADENA ; Name (ticket) ; U_SO1_TOTALNETO ; U_SO1_ESTACION
 * Solo se guardan PROMEDIOS de tickets por día de la semana y hora (no el detalle de tickets).
 * Los pesos no se guardan salvo que se pida con --con-importe, porque la app es pública.
 */
const fs = require('fs');
const path = require('path');
const C = require('../js/core.js');

const args = process.argv.slice(2);
const conImporte = args.includes('--con-importe');
const [archivo, nombreArg] = args.filter((a) => !a.startsWith('--'));
if (!archivo) { console.error('Falta el archivo del reporte de SAP.'); process.exit(1); }

const lineas = fs.readFileSync(archivo, 'latin1').split(/\r?\n/).filter((l) => l.trim());
const filas = lineas.slice(1).map((l) => l.split(';').map((x) => x.trim()));
const dem = C.procesarVentas(filas, { fecha: 1, hora: 2, ticket: 3, importe: 4 });
if (dem.info.descartadas) console.warn('Renglones ignorados:', dem.info.descartadas);

const estaciones = {};
filas.forEach((f) => { if (f[5]) estaciones[f[5]] = (estaciones[f[5]] || 0) + 1; });

const r2 = (x) => Math.round(x * 100) / 100;
C.DIAS.forEach((d) => {
  for (let h = 0; h < 24; h++) {
    dem.tickets[d.cod][h] = r2(dem.tickets[d.cod][h]);
    dem.importe[d.cod][h] = conImporte ? Math.round(dem.importe[d.cod][h]) : 0;
  }
});
if (!conImporte) dem.sinImporte = true;
dem.info.estaciones = estaciones;

const nombre = nombreArg || 'Histórico SAP ' + C.fechaCorta(dem.info.desde) + ' a ' + C.fechaCorta(dem.info.hasta);
const salida = '/* Generado con datos/generar-historico.js. No editar a mano. */\n' +
  '(function (g) { g.HISTORICO_VENTAS = ' + JSON.stringify({ nombre, demanda: dem }) + '; })(typeof window !== \'undefined\' ? window : globalThis);\n';
fs.writeFileSync(path.join(__dirname, '..', 'js', 'historico.js'), salida);
console.log(nombre, '·', dem.info.ticketsUnicos, 'tickets ·', dem.info.dias, 'días ·', JSON.stringify(estaciones));
