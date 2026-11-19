// Genera ejemplos/libro_horarios_ejemplo.xlsx: el libro con todas sus hojas y datos de prueba,
// listo para importarlo a Google Sheets (Archivo > Importar > Reemplazar hoja de cálculo).
// Uso: cd horarios && node ejemplos/generar-libro.js
const fs = require('fs');
const path = require('path');
const XLSX = require('../vendor/xlsx.full.min.js');
const E = require('../js/excel.js')(XLSX);
const C = require('../js/core.js');
const D = require('./datos-ejemplo.js');

const K = C.prepararLibro(D);
// Una semana ya generada y autorizada, para que la app tenga historial (y la rotación, semana anterior).
const s = C.generarSemana(K, { inicio: '2026-11-19', novedades: D.novedades });
const semanas = [{ id_semana: s.id, fecha_inicio: s.id, estado: 'autorizado', generado_por: 'Ejemplo', fecha_generado: '2026-11-18 10:00', nota: 'Semana de ejemplo' }];
const cambios = [{ id_semana: s.id, fecha_hora: '2026-11-18 10:00', usuario: 'Ejemplo', nomina: '', fecha: '', antes: '', despues: '', nota: 'Generó la semana' }];

const hojas = {};
Object.keys(C.HOJAS).forEach((n) => {
  const datos = { Semanas: semanas, Dias: C.diasDesdeSemana(s), Cambios: cambios }[n] || D[n.toLowerCase()] || [];
  hojas[n] = C.aoaDe(n, datos);
});
const salida = path.join(__dirname, 'libro_horarios_ejemplo.xlsx');
fs.writeFileSync(salida, E.libroCompleto(hojas));
console.log('Listo: ' + salida);
Object.keys(hojas).forEach((n) => console.log('  ' + n.padEnd(10) + (hojas[n].length - 1) + ' filas'));
