// Archivos de salida: carga masiva de GIRHA, rol de cajas, WhatsApp y hoja Dias.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const XLSX = require('../vendor/xlsx.full.min.js');
const E = require('../js/excel.js')(XLSX);
const { C, catalogos, semana, fila, diasCon } = require('./ayuda.js');

const K = catalogos();
const sem = () => semana(K, { inicio: '2026-11-26' }); // trae vacaciones, comisión y PTT
const porNomina = (filas, n) => filas.filter((f) => String(f[1]) === n);

test('A · GIRHA: 4 columnas, empresa NSD, fecha como texto aaaa-mm-dd', () => {
  const { filas, errores } = C.filasGirha(K, sem());
  assert.deepEqual(errores, []);
  assert.deepEqual(filas[0], ['Clave empresa', 'Clave empleado', 'Fecha', 'Clave horario']);
  filas.slice(1).forEach((f) => {
    assert.equal(f.length, 4);
    assert.equal(f[0], 'NSD');
    assert.equal(typeof f[2], 'string');
    assert.match(f[2], /^\d{4}-\d{2}-\d{2}$/);
  });
  assert.deepEqual(C.revisarBloques(filas), []);
});

test('A · GIRHA: en el Excel la fecha queda como texto, no como fecha de Excel', () => {
  const { filas } = C.filasGirha(K, sem());
  const wb = XLSX.read(E.cargaMasiva(filas), { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  for (let r = 2; r <= filas.length; r++) {
    assert.equal(ws['C' + r].t, 's', 'C' + r);
    assert.equal(ws['C' + r].v, filas[r - 1][2]);
    assert.equal(ws['D' + r].t, 's');
  }
});

test('A · GIRHA: siete filas por persona y cada bloque empieza en jueves', () => {
  const { filas } = C.filasGirha(K, sem());
  const nominas = [...new Set(filas.slice(1).map((f) => String(f[1])))];
  assert.equal(nominas.length, 28);
  nominas.forEach((n) => {
    const b = porNomina(filas, n);
    assert.equal(b.length, 7);
    assert.equal(C.diaSemana(b[0][2]), 4);
  });
});

test('A · GIRHA: vacaciones, comisión y PTT van con su horario regular; descansos D o NP', () => {
  const s = semana(K, { inicio: '2026-11-26', festivos: ['2026-11-30'] });
  const { filas } = C.filasGirha(K, s);
  const claves = new Set([...K.claves.values()].map((c) => c.clave));
  filas.slice(1).forEach((f) => assert.ok(claves.has(f[3]), 'clave ' + f[3]));
  assert.ok(!filas.some((f) => /VAC|COM|PTT|INC/.test(f[3])));
  porNomina(filas, '9003').filter((f) => f[3] !== 'D' && f[3] !== 'NP').forEach((f) => assert.match(f[3], /^\d\d:\d\d-\d\d:\d\d$/));
  assert.ok(filas.some((f) => f[3] === 'NP'));
});

test('A · GIRHA: quien no tiene nómina se excluye y se avisa con su nombre', () => {
  const r = C.filasGirha(K, sem());
  assert.deepEqual(r.excluidos, ['VENDEDOR MINA 11']);
  assert.ok(!r.filas.some((f) => f[1] === '' || f[1] == null));
});

test('A · GIRHA: la clave sale escrita como en el catálogo (8:00-18:00 sin cero)', () => {
  const s = sem();
  const i = diasCon(s, '9002', (r) => r.tipo === 'TRABAJA')[0];
  C.cambiarCelda(s, '9002', i, { clave: '08:00-18:00' });
  const f = porNomina(C.filasGirha(K, s).filas, '9002')[i];
  assert.equal(f[3], '8:00-18:00');
});

test('A · GIRHA: ninguna clave fuera del catálogo sale en la carga', () => {
  const s = sem();
  C.cambiarCelda(s, '9002', 0, { tipo: 'TRABAJA', clave: '07:30-16:30' });
  const r = C.filasGirha(K, s);
  assert.equal(r.errores.length, 1);
  assert.match(r.errores[0], /VENDEDOR MINA 02 · Jueves 26\/11: la clave "07:30-16:30" no está en la hoja Claves/);
  assert.ok(!r.filas.some((f) => f[3] === '07:30-16:30'));
});

test('A · GIRHA: exportar solo a las personas seleccionadas', () => {
  const r = C.filasGirha(K, sem(), { solo: ['9002', '7011', 'SN:VENDEDOR MINA 11'] });
  assert.equal(r.filas.length, 1 + 14);
  assert.deepEqual([...new Set(r.filas.slice(1).map((f) => f[1]))].sort(), [7011, 9002]);
  assert.deepEqual(r.excluidos, ['VENDEDOR MINA 11']);
});

test('B · rol de cajas: todo lo que no es caja de Ferre Mina va como D (y el festivo también)', () => {
  const s = semana(K, { inicio: '2026-11-26', festivos: ['2026-11-30'] });
  const { filas } = C.filasRolCajas(K, s);
  assert.ok(!filas.some((f) => f[3] === 'NP'));
  const idx = C.indexar(s);
  filas.slice(1).forEach((f) => {
    const n = String(f[1]);
    const r = idx[n][s.fechas.indexOf(f[2])];
    const enMina = r.tipo === 'TRABAJA' && C.buscarTienda(K, r.sucursal).clave === 'FERRE MINA';
    assert.equal(f[3] === 'D', !enMina, n + ' ' + f[2]);
  });
  // vacaciones, comisión y PTT
  assert.equal(porNomina(filas, '9003').filter((f) => f[3] === 'D').length, 7);
  assert.equal(porNomina(filas, '9005')[1][3], 'D');
  assert.equal(porNomina(filas, '9007')[4][3], 'D');
  // un comodín que cubre otra tienda ese día
  const cob = s.filas.find((r) => r.origen === 'cobertura' && /^\d+$/.test(r.nomina) && C.buscarTienda(K, C.celda(s, r.nomina, 0) ? K.porId.get(r.nomina).base : '').clave === 'FERRE MINA');
  if (cob) assert.equal(porNomina(filas, cob.nomina)[s.fechas.indexOf(cob.fecha)][3], 'D');
});

test('B · rol de cajas: solo va el personal de Ferre Mina y quien trabaje ahí esa semana', () => {
  const { filas } = C.filasRolCajas(K, sem());
  const ns = new Set(filas.slice(1).map((f) => String(f[1])));
  assert.ok(ns.has('7002') && ns.has('7012'));
  assert.ok(!ns.has('7007')); // Josué está en Tepeji
  assert.deepEqual(C.revisarBloques(filas), []);
});

const CAJAS = path.join(__dirname, '..', '..', 'rol-cajas', 'js', 'core.js');
test('B · el archivo lo lee la app de rol-cajas sin tocar nada (leerGirha)', { skip: !fs.existsSync(CAJAS) && 'no está rol-cajas' }, () => {
  const R = require(CAJAS);
  const s = sem();
  const { filas } = C.filasRolCajas(K, s);
  // Igual que rol-cajas/js/app.js: Excel → sheet_to_json(header:1, raw:true)
  const wb = XLSX.read(E.cargaMasiva(filas), { type: 'array' });
  const leidas = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: '' });
  const catalogo = [...new Set(filas.slice(1).map((f) => String(f[1])))].map((n) => ({ nomina: n, nombre: n, color: '#ccc' }));
  const g = R.leerGirha(leidas, catalogo);
  assert.deepEqual(g.avisos, []);
  assert.deepEqual(g.semanas, [s.inicio]);
  const semCajas = R.armarSemana(g.registros, s.inicio, catalogo);
  assert.deepEqual(semCajas.avisos, []); // nadie con días faltantes ni claves raras
  const idx = C.indexar(s);
  catalogo.forEach(({ nomina }) => semCajas.personas[nomina].dias.forEach((d, i) => {
    const r = idx[nomina][i];
    if (d.estado === 'TRABAJA') assert.equal(d.texto, C.normalizarClave(r.clave).texto);
    else assert.equal(d.estado, 'D');
  }));
});

test('D · WhatsApp: un bloque por tienda, nombres en negritas y saltos de línea', () => {
  const m = C.mensajesWhatsApp(K, sem());
  assert.equal(m.length, 9);
  const mina = m.find((x) => x.tienda === 'Ferre Mina');
  assert.match(mina.texto, /^\*Ferre Mina\*\nSemana del jueves 26 de noviembre al miércoles 2 de diciembre/);
  assert.match(mina.texto, /\*Jueves 26\*\n• \*[^*]+\* \d\d:\d\d-\d\d:\d\d/);
  const tepeji = m.find((x) => x.tienda === 'Tepeji').texto;
  assert.match(tepeji, /Enc. Tepeji: descanso/);
  assert.match(tepeji, /\(cubre\)/);
});

test('hoja Dias: guardar y volver a leer da la misma semana', () => {
  const s = sem();
  const dias = C.diasDesdeSemana(s);
  assert.equal(dias.length, s.filas.length);
  // Como llega desde Google Sheets: todo texto, nómina como número
  const crudas = dias.map((d) => Object.assign({}, d, { nomina: /^\d+$/.test(d.nomina) ? Number(d.nomina) : d.nomina }));
  const s2 = C.semanaDesdeDias(crudas, [{ id_semana: s.id, estado: 'autorizado', generado_por: 'Eryho' }], s.id);
  assert.equal(s2.estado, 'autorizado');
  const clave = (r) => [r.nomina, r.fecha, r.tipo, r.clave, r.sucursal].join('|');
  assert.deepEqual(s2.filas.map(clave).sort(), s.filas.map(clave).sort());
  assert.deepEqual(C.validarSemana(K, s2).criterios.map((c) => c.estado), C.validarSemana(K, s).criterios.map((c) => c.estado));
  void fila;
});

test('cuando llega la nómina de alguien nuevo, sus días guardados se ligan a ella', () => {
  const s = sem();
  const dias = C.diasDesdeSemana(s);
  assert.equal(dias.filter((d) => d.nomina === 'SN:VENDEDOR MINA 11').length, 7);
  const K2 = catalogos((d) => { d.plantilla.find((p) => p.nombre === 'VENDEDOR MINA 11').nomina = '9011'; });
  const s2 = C.semanaDesdeDias(dias, [], s.id);
  assert.equal(C.ligarSinNomina(K2, s2), 7);
  assert.deepEqual(C.validarSemana(K2, s2).criterios[2].detalles, []);
  assert.equal(porNomina(C.filasGirha(K2, s2).filas, '9011').length, 7);
});

test('el tablero sigue el orden de la hoja Plantilla dentro de cada área', () => {
  const orden = C.personasOrdenadas(K).map((p) => p.id);
  const filas = K.personas.filter((p) => p.activo);
  // Dentro de un área, el que va antes en la hoja va antes en el tablero.
  ['FERRETERIA MINA', 'CENTRO DE COLOR', 'RED BEREL', 'COMODINES'].forEach((a) => {
    const enHoja = filas.filter((p) => p.areaKey === a).map((p) => p.id);
    assert.deepEqual(orden.filter((id) => enHoja.includes(id)), enHoja);
  });
  // Las áreas van en su orden fijo: Ferretería Mina, Centro de Color, Red Berel, Comodines.
  const areas = [...new Set(C.personasOrdenadas(K).map((p) => p.areaKey))];
  assert.deepEqual(areas, ['FERRETERIA MINA', 'CENTRO DE COLOR', 'RED BEREL', 'COMODINES']);
});

test('B · Rol de Cajas desde la misma app: el motor de rol-cajas lee la semana y arma el rol', { skip: !fs.existsSync(CAJAS) && 'no está rol-cajas' }, () => {
  const R = require(CAJAS);
  const s = sem();
  const previo = { catalogo: [{ nomina: '9001', nombre: 'YA ESTABA', color: '#000000' }], config: R.configInicial() };
  const S = C.estadoRolCajas(K, s, previo);
  // Respeta lo que ya había en el catálogo y agrega a los demás con nombre y color.
  assert.equal(S.catalogo.find((p) => p.nomina === '9001').nombre, 'YA ESTABA');
  assert.ok(S.catalogo.length > 10);
  S.catalogo.forEach((p) => assert.match(p.color, /^#[0-9A-F]{6}$/i));
  // Supervisión y gerencia no van marcadas para caja; los vendedores sí.
  assert.ok(!S.seleccion.includes('7002') && !S.seleccion.includes('7003') && !S.seleccion.includes('7001'));
  assert.ok(S.seleccion.includes('9001'));
  assert.equal(S.semanaSel, s.id);
  assert.equal(S.tab, 'semana');
  // Lo mismo que hace rol-cajas/js/app.js al abrir: lee GIRHA, arma la semana y genera el rol.
  const g = R.leerGirha(S.girha.filas, S.catalogo);
  assert.deepEqual(g.semanas, [s.id]);
  const semCajas = R.armarSemana(g.registros, S.semanaSel, S.catalogo);
  assert.deepEqual(semCajas.avisos, []);
  const rol = R.generarRol({ semana: semCajas, catalogo: S.catalogo, config: R.configInicial(), seleccion: S.seleccion });
  assert.equal(rol.dias.length, 7);
  assert.ok(rol.dias.every((d) => d.turnos.length > 0));
  // Si se vuelve a mandar la misma semana, se conserva la selección que haya hecho el usuario.
  const S2 = C.estadoRolCajas(K, s, Object.assign({}, S, { seleccion: ['9001'] }));
  assert.deepEqual(S2.seleccion, ['9001']);
});
