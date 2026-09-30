// Genera los archivos de ejemplo: node rol-cajas/ejemplos/generar-ejemplos.js
const fs = require('fs');
const path = require('path');
const XLSX = require('../vendor/xlsx.full.min.js');

const dir = __dirname;

// ------------------------------------------------ catálogo Ferre Mina
const personal = [
  { nomina: '1001', nombre: 'ANA', color: '#FFD966' },
  { nomina: '1002', nombre: 'BETO', color: '#9BC2E6' },
  { nomina: '1003', nombre: 'CARLA', color: '#A9D08E' },
  { nomina: '1004', nombre: 'DIEGO', color: '#F4B084' },
  { nomina: '1005', nombre: 'ELENA', color: '#C9A0DC' },
  { nomina: '1006', nombre: 'FER', color: '#FF9F9F' },
  { nomina: '1007', nombre: 'GABY', color: '#8EA9DB' },
  { nomina: '1008', nombre: 'HUGO', color: '#FFE699' },
  { nomina: '1009', nombre: 'IVÁN', color: '#C6E0B4' },
  { nomina: '1010', nombre: 'JUANA', color: '#F8CBAD' },
];
fs.writeFileSync(path.join(dir, 'catalogo_ferre_mina.json'), JSON.stringify({
  tipo: 'catalogo-rol-cajas', version: 1, sucursal: 'Ferre Mina', personal,
}, null, 2));

// ------------------------------------------------ GIRHA semana 01–07 oct 2026
// Orden de días: JUE VIE SAB DOM LUN MAR MIE
const fechas = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07'];
const M = '8:00-17:00'; // sin cero inicial a propósito
const T = '12:00-21:00';
const X = '10:00-19:00';
const DM = '08:00-15:00'; // domingo mañana
const DT = '12:00-19:00'; // domingo tarde
const horarios = {
  1001: [M, M, M, DM, 'D', M, M],
  1002: [T, T, T, DT, T, 'D', T],
  1003: [M, 'D', M, DM, M, M, M],
  1004: [T, T, 'D', DT, T, T, T],
  1005: [X, X, X, 'D', X, X, X],
  1006: ['D', M, M, DM, M, M, 'NP'],
  1007: [T, T, T, DT, 'D', T, T],
  1008: [M, M, M, 'NP', M, 'D', M],
  1009: ['16:00-21:00', '16:00-21:00', T, 'D', '16:00-21:00', '16:00-21:00', T], // horario corto
  1010: [T, 'D', T, DT, T, null, T], // falta el martes
};
const filas = [['Clave empresa', 'Clave empleado', 'Fecha', 'Clave horario']];
Object.keys(horarios).forEach((n) => {
  horarios[n].forEach((h, i) => { if (h) filas.push(['NSD', n, fechas[i], h]); });
});
// Personal de otras sucursales (la app debe ignorarlo)
[2001, 2002, 2003, 2004, 2005].forEach((n, k) => {
  fechas.forEach((f, i) => filas.push(['NSD', String(n), f, (i + k) % 7 === 0 ? 'D' : '9:00-18:00']));
});
const wbG = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wbG, XLSX.utils.aoa_to_sheet(filas), 'GIRHA');
fs.writeFileSync(path.join(dir, 'girha_ejemplo.xlsx'), XLSX.write(wbG, { type: 'buffer', bookType: 'xlsx', compression: true }));
fs.writeFileSync(path.join(dir, 'girha_ejemplo.csv'), filas.map((r) => r.join(',')).join('\n'));

// ------------------------------------------------ SAP: 4 semanas (03–30 sep 2026)
let semilla = 7;
const azar = () => { semilla = (semilla * 16807) % 2147483647; return (semilla - 1) / 2147483646; };
// Tickets promedio por hora (8 a 20) según tipo de día
const entreSemana = [8, 15, 24, 30, 38, 44, 40, 34, 38, 48, 55, 42, 20];
const viernes = [10, 18, 28, 36, 45, 52, 48, 40, 45, 58, 66, 50, 24];
const sabado = [12, 24, 40, 62, 72, 75, 64, 50, 46, 50, 52, 40, 22];
const domingo = [14, 30, 52, 68, 74, 66, 50, 38, 30, 20, 12, 0, 0];
const materiales = [
  ['TR-10234', 'MARTILLO UÑA 16 OZ', 189], ['BR-5510', 'PINTURA VINIL BLANCO 19L', 1459],
  ['TR-22011', 'DESARMADOR PLANO 1/4', 65], ['FE-0012', 'TORNILLO 1/4 X 2 (PZA)', 3.5],
  ['BR-7720', 'ESMALTE ROJO 1L', 229], ['FE-3310', 'CINTA DE AISLAR', 28],
  ['TR-4400', 'LLAVE PERICA 10', 245], ['BR-9001', 'BROCHA 3 PULG', 79],
];
const sap = [['Fecha doc.', 'Hora', 'Ticket', 'Material', 'Descripción', 'Cantidad', 'Importe']];
let folio = 500000;
for (let d = 0; d < 28; d++) {
  const dt = new Date(Date.UTC(2026, 8, 3 + d));
  const dow = dt.getUTCDay();
  const perfil = dow === 6 ? sabado : dow === 0 ? domingo : dow === 5 ? viernes : entreSemana;
  const fecha = String(dt.getUTCDate()).padStart(2, '0') + '.' + String(dt.getUTCMonth() + 1).padStart(2, '0') + '.' + dt.getUTCFullYear();
  perfil.forEach((base, k) => {
    const h = 8 + k;
    const n = Math.round(base * (0.9 + azar() * 0.2));
    for (let t = 0; t < n; t++) {
      folio++;
      const min = Math.floor(azar() * 60), seg = Math.floor(azar() * 60);
      const hora = String(h).padStart(2, '0') + ':' + String(min).padStart(2, '0') + ':' + String(seg).padStart(2, '0');
      const renglones = 1 + Math.floor(azar() * 4); // varias filas por ticket
      for (let r = 0; r < renglones; r++) {
        const [mat, desc, precio] = materiales[Math.floor(azar() * materiales.length)];
        const cant = 1 + Math.floor(azar() * 3);
        sap.push([fecha, hora, 'T-' + folio, mat, desc, cant, Math.round(precio * cant * 100) / 100]);
      }
    }
  });
}
const wbS = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wbS, XLSX.utils.aoa_to_sheet(sap), 'Ventas');
fs.writeFileSync(path.join(dir, 'sap_ventas_ejemplo.xlsx'), XLSX.write(wbS, { type: 'buffer', bookType: 'xlsx', compression: true }));

console.log('GIRHA:', filas.length - 1, 'filas · SAP:', sap.length - 1, 'filas,', folio - 500000, 'tickets');
