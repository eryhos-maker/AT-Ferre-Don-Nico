// Pruebas de las reglas del rol: cd rol-cajas && node --test tests/
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../js/core.js');

const INICIO = '2026-10-01'; // jueves
const FECHAS = C.DIAS.map((_, i) => C.sumarDias(INICIO, i));

function catalogo(n) {
  return Array.from({ length: n }, (_, i) => ({ nomina: String(1001 + i), nombre: 'V' + (i + 1), color: C.COLORES[i % C.COLORES.length] }));
}
// horarios: { nomina: [7 claves JUE..MIE] }
function semanaDe(cat, horarios) {
  const filas = [['Clave empresa', 'Clave empleado', 'Fecha', 'Clave horario']];
  Object.keys(horarios).forEach((n) => horarios[n].forEach((h, i) => { if (h != null) filas.push(['NSD', n, FECHAS[i], h]); }));
  const g = C.leerGirha(filas, cat);
  return C.armarSemana(g.registros, INICIO, cat);
}
function generar(cat, sem, extra) {
  const config = Object.assign(C.configInicial(), extra && extra.config);
  const seleccion = (extra && extra.seleccion) || cat.map((p) => p.nomina);
  const rol = C.generarRol({ semana: sem, catalogo: cat, config, seleccion, demanda: extra && extra.demanda });
  const v = C.validarRol(rol, { semana: sem, catalogo: cat, config, seleccion });
  return { rol, v, config };
}
// Regla general: ningún turno generado rompe las reglas (solo puede haber huecos).
function sinFaltas(v) {
  const faltas = v.problemas.filter((p) => !p.hueco && !/no hay vendedor en piso/.test(p.texto));
  assert.deepEqual(faltas.map((p) => p.texto), []);
}
const M = '08:00-17:00', T = '12:00-21:00', DM = '08:00-15:00', DT = '12:00-19:00';

test('lee GIRHA: normaliza horas sin cero, D, NP e ignora a quien no está en el catálogo', () => {
  const cat = catalogo(2);
  const filas = [
    ['NSD', '1001', '2026-10-01', '8:00-18:00'],
    ['NSD', '01002', '2026-10-01', 'D'],
    ['NSD', '1002', '2026-10-02', 'np'],
    ['NSD', '9999', '2026-10-01', '9:00-18:00'],
  ];
  const g = C.leerGirha(filas, cat);
  assert.equal(g.ignorados, 1);
  const sem = C.armarSemana(g.registros, INICIO, cat);
  const d = sem.personas['1001'].dias[0];
  assert.equal(d.estado, 'TRABAJA');
  assert.equal(d.texto, '08:00-18:00');
  assert.equal(sem.personas['1002'].dias[0].estado, 'D');
  assert.equal(sem.personas['1002'].dias[1].estado, 'NP');
  assert.ok(sem.avisos.some((a) => a.nomina === '1001' && a.tipo === 'faltan'), 'avisa días faltantes');
});

test('vendedor en descanso (D) o NP nunca entra a caja ese día', () => {
  const cat = catalogo(12);
  const h = {};
  cat.forEach((p, i) => { h[p.nomina] = [M, T, M, DM, T, M, T].map((x, k) => (k === i % 7 ? 'D' : x)); });
  h['1001'] = ['D', 'D', 'NP', 'D', M, M, M];
  const sem = semanaDe(cat, h);
  const { rol, v } = generar(cat, sem);
  sinFaltas(v);
  [0, 1, 2, 3].forEach((i) => assert.ok(!rol.dias[i].turnos.some((t) => t.nomina === '1001'), 'no trabaja el día ' + i));
});

test('reglas básicas: máximo 3 días, 1 turno por día, 3 a 6 h y dentro de su horario', () => {
  const cat = catalogo(16);
  const h = {};
  cat.forEach((p, i) => { h[p.nomina] = [M, T, M, DM, T, M, T].map((x, k) => (k === i % 7 ? 'D' : i % 2 ? (x === M ? T : x === T ? M : x === DM ? DT : DM) : x)); });
  const sem = semanaDe(cat, h);
  const { rol, v } = generar(cat, sem);
  sinFaltas(v);
  assert.equal(v.huecos.length, 0, 'con 16 personas se cubre todo');
  Object.values(v.resumen).forEach((r) => assert.ok(r.dias <= 3));
  rol.dias.forEach((d) => d.turnos.forEach((t) => {
    assert.ok(t.fin - t.ini >= 180 && t.fin - t.ini <= 360);
    const g = sem.personas[t.nomina].dias[d.idx];
    assert.ok(t.ini >= g.ini && t.fin <= g.fin);
    assert.ok(t.razon.length > 20, 'trae explicación');
  }));
  // reparto equilibrado: nadie con 3 días mientras otro tiene 0 o 1
  const dias = Object.keys(h).map((n) => (v.resumen[n] ? v.resumen[n].dias : 0));
  assert.ok(Math.max(...dias) - Math.min(...dias) <= 2, 'reparto parejo: ' + dias.join(','));
});

test('vendedor con horario corto (5 h) solo recibe turnos que caben en su horario', () => {
  const cat = catalogo(16);
  const h = {};
  cat.forEach((p, i) => { h[p.nomina] = [M, T, M, DM, T, M, T].map((x, k) => (k === i % 7 ? 'D' : i % 2 ? (x === M ? T : x === T ? M : x === DM ? DT : DM) : x)); });
  h['1001'] = ['16:00-21:00', '16:00-21:00', '16:00-21:00', '17:00-19:00', '16:00-21:00', '16:00-21:00', 'D'];
  const sem = semanaDe(cat, h);
  const { rol, v } = generar(cat, sem);
  sinFaltas(v);
  rol.dias.forEach((d) => d.turnos.filter((t) => t.nomina === '1001').forEach((t) => {
    assert.ok(t.ini >= 16 * 60 && t.fin <= 21 * 60);
    assert.notEqual(d.cod, 'DOM', 'el domingo solo tiene 2 h: no alcanza el mínimo de 3 h');
  }));
});

test('semana sin suficiente gente: no inventa, marca huecos y sugiere a quien no está marcado', () => {
  const cat = catalogo(8);
  const h = {};
  cat.forEach((p) => { h[p.nomina] = [M, M, M, DM, M, M, M]; });
  h['1007'] = [T, T, T, DT, T, T, T];
  h['1008'] = [T, T, T, DT, T, T, T];
  const sem = semanaDe(cat, h);
  const seleccion = ['1001', '1002', '1003', '1004'];
  const { rol, v } = generar(cat, sem, { seleccion });
  sinFaltas(v);
  rol.dias.forEach((d) => d.turnos.forEach((t) => assert.ok(seleccion.includes(t.nomina), 'solo usa a los marcados')));
  assert.ok(v.huecos.length > 0, 'hay huecos');
  const tarde = v.huecos.find((x) => x.fin === 21 * 60);
  assert.ok(tarde, 'la tarde queda sin cubrir');
  assert.ok(tarde.sugerencias.some((s) => (s.nomina === '1007' || s.nomina === '1008') && !s.marcado), 'sugiere a un no marcado de la tarde');
  assert.ok(v.problemas.some((p) => /menos de 2 cajas/.test(p.texto)));
  const cap = C.capacidadSemana(sem, seleccion, C.configInicial());
  assert.equal(cap.alcanza, false);
});

test('domingo con horario reducido (8 a 19): no hay turnos después de las 19:00', () => {
  const cat = catalogo(16);
  const h = {};
  cat.forEach((p, i) => { h[p.nomina] = [M, T, M, i % 2 ? '08:00-21:00' : DM, T, M, T].map((x, k) => (k === i % 7 && k !== 3 ? 'D' : x)); });
  const sem = semanaDe(cat, h);
  const { rol, v } = generar(cat, sem);
  sinFaltas(v);
  const dom = rol.dias[3];
  assert.equal(dom.cod, 'DOM');
  assert.equal(dom.ci, 19 * 60);
  dom.turnos.forEach((t) => assert.ok(t.fin <= 19 * 60));
  [1, 2].forEach((c) => assert.equal(Math.max(...dom.turnos.filter((t) => t.caja === c).map((t) => t.fin)), 19 * 60, 'Caja ' + c + ' cierra a las 19'));
});

function demandaPico(cod, horas, tickets) {
  const d = { tickets: {}, importe: {} };
  C.DIAS.forEach((x) => { d.tickets[x.cod] = {}; d.importe[x.cod] = {}; for (let h = 0; h < 24; h++) { d.tickets[x.cod][h] = 20; d.importe[x.cod][h] = 0; } });
  horas.forEach((h) => { d.tickets[cod][h] = tickets; });
  return d;
}

test('hora pico: sugiere apoyo de Caja 3 con alguien en piso que no está en C1/C2 (aunque no esté marcado)', () => {
  const cat = catalogo(16);
  const h = {};
  cat.forEach((p, i) => { h[p.nomina] = [M, T, M, DM, T, M, T].map((x, k) => (k === i % 7 ? 'D' : i % 2 ? (x === M ? T : x === T ? M : x === DM ? DT : DM) : x)); });
  const seleccion = cat.slice(0, 14).map((p) => p.nomina);
  const demanda = demandaPico('SAB', [12, 13], 80);
  const { rol, v } = generar(cat, semanaDe(cat, h), { seleccion, demanda });
  sinFaltas(v);
  const sab = rol.dias[2];
  assert.equal(sab.apoyos.length, 1);
  const a = sab.apoyos[0];
  assert.equal(a.ini, 12 * 60);
  assert.equal(a.fin, 14 * 60);
  assert.ok(a.nomina, 'hay apoyo');
  assert.ok(!sab.turnos.some((t) => t.nomina === a.nomina && t.ini < a.fin && t.fin > a.ini), 'no está en C1/C2');
  assert.ok(/no cuenta dentro de sus 3 días/.test(a.razon));
  assert.equal(v.resumen[a.nomina].apoyos, 1);
});

test('hora pico sin nadie en piso: avisa y no inventa apoyo', () => {
  const cat = catalogo(6);
  const h = {};
  cat.forEach((p) => { h[p.nomina] = ['D', 'D', 'D', 'D', 'D', 'D', 'D']; });
  h['1001'] = ['D', 'D', '08:00-14:00', 'D', 'D', 'D', 'D'];
  h['1002'] = ['D', 'D', '14:00-21:00', 'D', 'D', 'D', 'D'];
  h['1003'] = ['D', 'D', '08:00-14:00', 'D', 'D', 'D', 'D'];
  h['1004'] = ['D', 'D', '14:00-21:00', 'D', 'D', 'D', 'D'];
  const demanda = demandaPico('SAB', [12], 90);
  const { rol, v } = generar(cat, semanaDe(cat, h), { demanda });
  const a = rol.dias[2].apoyos[0];
  assert.equal(a.nomina, null);
  assert.ok(/No hay ningún vendedor en piso/.test(a.razon));
  assert.ok(v.problemas.some((p) => /no hay vendedor en piso para abrir Caja 3/.test(p.texto)));
});

test('los apoyos de Caja 3 rotan entre vendedores', () => {
  const cat = catalogo(16);
  const h = {};
  cat.forEach((p, i) => { h[p.nomina] = [M, T, M, DM, T, M, T].map((x, k) => (k === i % 7 ? 'D' : i % 2 ? (x === M ? T : x === T ? M : x === DM ? DT : DM) : x)); });
  const demanda = demandaPico('JUE', [], 0);
  ['JUE', 'VIE', 'SAB', 'LUN', 'MAR', 'MIE'].forEach((c) => { demanda.tickets[c][13] = 80; });
  const { rol } = generar(cat, semanaDe(cat, h), { seleccion: cat.slice(0, 12).map((p) => p.nomina), demanda });
  const quienes = rol.dias.flatMap((d) => d.apoyos.map((a) => a.nomina)).filter(Boolean);
  assert.equal(quienes.length, 6);
  assert.equal(new Set(quienes).size, 6, 'seis apoyos, seis personas distintas: ' + quienes.join(','));
});

test('actualizar apoyos Caja 3 después (llega el archivo de ventas) no cambia Caja 1 ni Caja 2', () => {
  const cat = catalogo(16);
  const h = {};
  cat.forEach((p, i) => { h[p.nomina] = [M, T, M, DM, T, M, T].map((x, k) => (k === i % 7 ? 'D' : i % 2 ? (x === M ? T : x === T ? M : x === DM ? DT : DM) : x)); });
  const sem = semanaDe(cat, h);
  const { rol, config } = generar(cat, sem);
  rol.dias[0].turnos[0].manual = true; // edición a mano
  const antes = JSON.stringify(rol.dias.map((d) => d.turnos));
  assert.ok(rol.dias.every((d) => d.apoyos.length === 0));
  C.calcularApoyos(rol, { semana: sem, catalogo: cat, config, demanda: demandaPico('SAB', [12, 13], 80) });
  assert.equal(JSON.stringify(rol.dias.map((d) => d.turnos)), antes);
  assert.equal(rol.dias[2].apoyos.length, 1);
});

test('edición a mano: la validación detecta más de 3 días, fuera de horario y menos de 2 cajas', () => {
  const cat = catalogo(16);
  const h = {};
  cat.forEach((p, i) => { h[p.nomina] = [M, T, M, DM, T, M, T].map((x, k) => (k === i % 7 ? 'D' : i % 2 ? (x === M ? T : x === T ? M : x === DM ? DT : DM) : x)); });
  const sem = semanaDe(cat, h);
  const { rol, config } = generar(cat, sem);
  const opts = { semana: sem, catalogo: cat, config, seleccion: cat.map((p) => p.nomina) };
  // 1) Quitar un turno de Caja 1 -> hueco
  const quitado = rol.dias[0].turnos.shift();
  let v = C.validarRol(rol, opts);
  assert.ok(v.problemas.some((p) => /Caja 1 sin cubrir/.test(p.texto)));
  rol.dias[0].turnos.unshift(quitado);
  // 2) Turno fuera de horario GIRHA
  const t = rol.dias[1].turnos[0];
  const g = sem.personas[t.nomina].dias[1];
  const iniOriginal = t.ini;
  t.ini = g.ini - 60;
  v = C.validarRol(rol, opts);
  assert.ok(v.problemas.some((p) => /sale de su horario GIRHA/.test(p.texto)));
  t.ini = iniOriginal;
  // 3) Cuarto día para alguien que ya tiene 3
  const tres = Object.keys(C.validarRol(rol, opts).resumen).find((n) => C.validarRol(rol, opts).resumen[n].dias === 3);
  const libre = rol.dias.find((d) => !d.turnos.some((x) => x.nomina === tres));
  libre.turnos.push({ caja: 2, nomina: tres, ini: libre.ab, fin: libre.ab + 180, manual: true, razon: '' });
  v = C.validarRol(rol, opts);
  assert.ok(v.problemas.some((p) => /4 días en Caja 1\/Caja 2/.test(p.texto)));
});

test('ventas SAP: cuenta tickets únicos (no renglones) y promedia por día de la semana', () => {
  const filas = [
    // jueves 03.09.2026 a las 10: ticket A con 3 renglones, ticket B con 1
    ['03.09.2026', '10:05:00', 'A', 100], ['03.09.2026', '10:05:00', 'A', 50], ['03.09.2026', '10:06:10', 'A', 25],
    ['03.09.2026', '10:40:00', 'B', 10],
    // jueves siguiente: 1 ticket a las 10, con hora en formato 12 h
    ['10.09.2026', '10:15 a. m.', 'C', 40],
    // fecha-hora en una sola columna (serial de Excel): viernes 04/09/2026 14:30
    [46269.6041667, '', 'D', 5],
  ];
  const d = C.procesarVentas(filas.slice(0, 5), { fecha: 0, hora: 1, ticket: 2, importe: 3 });
  assert.equal(d.info.ticketsUnicos, 3);
  assert.equal(d.diasContados.JUE, 2);
  assert.equal(d.tickets.JUE[10], 1.5); // (2 + 1) / 2 jueves
  assert.equal(d.importe.JUE[10], (185 + 40) / 2);
  const d2 = C.procesarVentas([filas[5]], { fecha: 0, hora: -1, ticket: 2, importe: 3 });
  assert.equal(d2.tickets.VIE[14], 1);
  assert.equal(C.nivelCajas(25, 30), 1);
  assert.equal(C.nivelCajas(31, 30), 2);
  assert.equal(C.nivelCajas(95, 30), 3);
});

test('fechas y horas en distintos formatos', () => {
  assert.equal(C.parseFecha('2026-10-01'), '2026-10-01');
  assert.equal(C.parseFecha('01/10/2026'), '2026-10-01');
  assert.equal(C.parseFecha('01.10.2026 14:22'), '2026-10-01');
  assert.equal(C.parseFecha('20261001'), '2026-10-01');
  assert.equal(C.parseFecha(46296), '2026-10-01');
  assert.equal(C.parseHora('14:35:22'), 14);
  assert.equal(C.parseHora('2:35 p. m.'), 14);
  assert.equal(C.parseHora(0.5), 12);
  assert.equal(C.parseHora('143522'), 14);
  assert.equal(C.inicioSemana('2026-10-07'), '2026-10-01');
  assert.equal(C.rangoCorto(600, 960), '10–4');
  assert.equal(C.rangoCorto(510, 870), '8:30–2:30');
});

test('sin reporte de ventas y sin gente suficiente: la Caja 2 se cubre primero el fin de semana', () => {
  const cat = catalogo(10);
  const h = {};
  cat.forEach((p, i) => { h[p.nomina] = [M, T, M, DM, T, M, T].map((x, k) => (k === (i + 4) % 7 && k !== 2 ? 'D' : i % 2 ? (x === M ? T : x === T ? M : x === DM ? DT : DM) : x)); });
  const { rol, v } = generar(cat, semanaDe(cat, h));
  sinFaltas(v);
  assert.ok(v.huecos.length > 0, 'con 10 personas no alcanza');
  const sab = rol.dias[2];
  assert.equal(sab.cod, 'SAB');
  assert.ok(!v.huecos.some((x) => x.dia === 2 && x.caja === 2), 'el sábado tiene Caja 2 completa');
  assert.ok(!v.huecos.some((x) => x.caja === 1), 'la Caja 1 siempre queda cubierta');
});

// ---------------------------------------------------- histórico incluido
test('lee fechas con mes en letras, como salen del reporte de SAP', () => {
  assert.equal(C.parseFecha('1 sep 2025 0:00:00.0'), '2025-09-01');
  assert.equal(C.parseFecha('31 ago 2026 0:00:00.0'), '2026-08-31');
  assert.equal(C.parseFecha('15-dic-2025'), '2025-12-15');
  assert.equal(C.parseFecha('31 feb 2026'), null);
  assert.equal(C.parseHora('01:04PM'), 13);
  assert.equal(C.parseHora('12:41PM'), 12);
});

test('el histórico incluido tiene la forma que usa la app y marca el domingo como día pico', () => {
  require('../js/historico.js');
  const H = globalThis.HISTORICO_VENTAS;
  assert.ok(H && H.nombre && H.demanda);
  const d = H.demanda;
  C.DIAS.forEach((dia) => {
    for (let h = 0; h < 24; h++) {
      assert.equal(typeof d.tickets[dia.cod][h], 'number');
      assert.equal(typeof d.importe[dia.cod][h], 'number');
    }
    assert.ok(d.diasContados[dia.cod] >= 50);
  });
  assert.ok(d.info.ticketsUnicos > 100000);
  const cap = C.configInicial().capacidad;
  const nivel = (cod, h) => C.nivelCajas(C.cargaHora(d, cod, h), cap);
  // Se planea con el día cargado, no con el promedio
  assert.ok(d.alto.LUN[11] > d.tickets.LUN[11]);
  assert.equal(nivel('DOM', 13), 3); // domingo a mediodía: pico
  assert.equal(nivel('LUN', 8), 1); // apertura: basta una caja
  assert.equal(nivel('MIE', 9), 1);
  // Entre semana, de 10 de la mañana a 2 de la tarde y de 5 a 8 de la noche la Caja 2 debe estar cobrando
  ['LUN', 'MAR', 'MIE', 'JUE', 'VIE'].forEach((cod) => { [10, 11, 12, 13, 17, 18, 19].forEach((h) => assert.ok(nivel(cod, h) >= 2, cod + ' ' + h)); });
  // Sirve para armar un rol completo
  const cat = catalogo(14);
  const sem = semanaDe(cat, Object.fromEntries(cat.map((p, i) => [p.nomina, Array(7).fill(i % 2 ? '08:00-17:00' : '12:00-21:00')])));
  const { rol, v } = generar(cat, sem, { demanda: d });
  assert.equal(rol.conVentas, true);
  sinFaltas(v);
});

test('con un reporte subido se calcula el día cargado (8 de cada 10 días)', () => {
  // 5 jueves: a las 10 se cobran 10, 12, 14, 30 y 40 tickets
  const filas = [];
  [10, 12, 14, 30, 40].forEach((n, i) => {
    const fecha = C.sumarDias('2026-10-01', i * 7);
    for (let k = 0; k < n; k++) filas.push([fecha, '10:15', 'T' + i + '-' + k, 100]);
  });
  const d = C.procesarVentas(filas, { fecha: 0, hora: 1, ticket: 2, importe: 3 });
  assert.equal(d.tickets.JUE[10], 21.2); // promedio
  assert.equal(d.alto.JUE[10], 30); // día cargado
  assert.equal(C.cargaHora(d, 'JUE', 10), 30);
  // Un reporte guardado con la versión anterior (sin "alto") sigue funcionando con el promedio
  assert.equal(C.cargaHora({ tickets: d.tickets }, 'JUE', 10), 21.2);
});
