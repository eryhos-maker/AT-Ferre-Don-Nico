// Lo que se copió de rol-cajas tiene que seguir igual que allá.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const H = require('../js/core.js');

const RAIZ_CAJAS = path.join(__dirname, '..', '..', 'rol-cajas');
const hayCajas = fs.existsSync(path.join(RAIZ_CAJAS, 'js', 'core.js'));

test('funciones copiadas de rol-cajas se comportan igual', { skip: !hayCajas && 'no está la carpeta rol-cajas' }, () => {
  const R = require(path.join(RAIZ_CAJAS, 'js', 'core.js'));
  assert.deepEqual(H.DIAS, R.DIAS);
  const claves = ['8:00-18:00', '08:00-17:00', ' 9-18 ', 'd', 'np', 'VAC', '', null, '12:30-21:00', '18:00-08:00'];
  claves.forEach((c) => assert.deepEqual(H.normalizarClave(c), R.normalizarClave(c), 'clave ' + c));
  ['001027', 1027, '1027.0', ' 84 ', null, ''].forEach((n) => assert.equal(H.normNomina(n), R.normNomina(n)));
  const fechas = ['2026-11-19', '19/11/2026', '19.11.2026', '20261119', 46345, '1 nov 2026 0:00:00.0', 'xx', '2026-02-30'];
  fechas.forEach((f) => assert.equal(H.parseFecha(f), R.parseFecha(f), 'fecha ' + f));
  ['8:00', '08:30', '24:00', '25:00', 'x', ''].forEach((t) => assert.equal(H.aMin(t), R.aMin(t)));
  [0, 480, 1260].forEach((m) => assert.equal(H.aHora(m), R.aHora(m)));
  ['2026-11-19', '2026-11-22', '2026-11-25', '2026-12-31'].forEach((f) => {
    assert.equal(H.inicioSemana(f), R.inicioSemana(f));
    assert.equal(H.sumarDias(f, 9), R.sumarDias(f, 9));
  });
});

test('la hoja de estilos es idéntica a la de rol-cajas', { skip: !hayCajas && 'no está la carpeta rol-cajas' }, () => {
  const a = fs.readFileSync(path.join(__dirname, '..', 'css', 'estilos.css'));
  const b = fs.readFileSync(path.join(RAIZ_CAJAS, 'css', 'estilos.css'));
  assert.ok(a.equals(b), 'horarios/css/estilos.css cambió: cópialo otra vez desde rol-cajas/css/estilos.css');
});
