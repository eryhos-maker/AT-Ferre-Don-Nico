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
  const v = C.validarRol(rol, { semana: sem, catalogo: cat, config, seleccion, demanda: extra && extra.demanda });
  return { rol, v, config };
}
// Turnos por persona en un día, uniendo los tramos seguidos (Caja 2 que pasa a Caja 1).
function unidos(dia) {
  const por = {};
  dia.turnos.slice().sort((a, b) => a.ini - b.ini).forEach((t) => {
    const l = (por[t.nomina] = por[t.nomina] || []);
    const u = l[l.length - 1];
    if (u && u.fin === t.ini) u.fin = t.fin; else l.push({ nomina: t.nomina, ini: t.ini, fin: t.fin, razon: t.razon });
  });
  return Object.values(por).flat();
}
// Personas en caja a una hora (minuto m).
const enCajaA = (dia, m) => new Set(dia.turnos.filter((t) => t.ini <= m && t.fin > m).map((t) => t.nomina)).size;
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
  rol.dias.forEach((d) => unidos(d).forEach((t) => {
    assert.ok(t.fin - t.ini >= 180 && t.fin - t.ini <= 360, 'duración ' + (t.fin - t.ini));
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

test('sin reporte de ventas y sin gente suficiente: la Caja 1 nunca queda vacía', () => {
  const cat = catalogo(10);
  const h = {};
  cat.forEach((p, i) => { h[p.nomina] = [M, T, M, DM, T, M, T].map((x, k) => (k === (i + 4) % 7 && k !== 2 ? 'D' : i % 2 ? (x === M ? T : x === T ? M : x === DM ? DT : DM) : x)); });
  const { rol, v } = generar(cat, semanaDe(cat, h));
  sinFaltas(v);
  assert.ok(rol.dias.some((d) => v.piso[d.idx].length > 0), 'con 10 personas no alcanza para 2 cajeros todo el día');
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

// ------------------------------------- Caja 2 primero en las horas de 2 cajas
// Semana tipo Ferre Mina: 2 de mañana (8 a 2), Lucía 10 a 7, Axel 8 a 5, Luis 12 a 9 y 5 de tarde (3:30 a 9:30).
function semanaMina() {
  const M6 = '08:00-14:00', T6 = '15:30-21:30', TD = '13:00-19:00', L = '10:00-19:00', X = '12:00-21:00', A8 = '08:00-17:00';
  const P = [
    [T6, T6, T6, TD, T6, T6, 'D'], [X, X, X, '11:00-19:00', X, 'D', X], [T6, 'D', T6, TD, T6, 'D', T6],
    [T6, T6, T6, TD, T6, T6, 'D'], [T6, T6, T6, TD, 'D', T6, T6], [L, L, L, '08:00-16:00', L, 'D', L],
    ['D', A8, A8, A8, A8, A8, A8], [M6, 'D', M6, M6, M6, M6, 'D'], [M6, M6, M6, 'D', M6, M6, M6], [T6, T6, T6, TD, T6, T6, 'D'],
  ];
  const cat = catalogo(P.length);
  return { cat, sem: semanaDe(cat, Object.fromEntries(cat.map((p, i) => [p.nomina, P[i]]))), lucia: cat[5].nomina, tarde: [0, 2, 3, 4, 9].map((i) => cat[i].nomina) };
}

test('semana tipo Mina: Caja 1 nunca vacía, el domingo en la mañana hay 2 en caja y las horas se reparten', () => {
  require('../js/historico.js');
  const d = globalThis.HISTORICO_VENTAS.demanda;
  [3, 4].forEach((maxDias) => {
    const { cat, sem, lucia, tarde } = semanaMina();
    const { rol, v } = generar(cat, sem, { demanda: d, config: { maxDias } });
    sinFaltas(v);
    assert.ok(!v.huecos.some((x) => x.caja === 1), maxDias + ' días: la Caja 1 nunca queda vacía');
    const dom = rol.dias.find((x) => x.cod === 'DOM');
    for (let m = 9 * 60; m < 13 * 60; m += 30) assert.equal(enCajaA(dom, m), 2, 'domingo ' + C.aHora(m) + ' con 2 en caja');
    // quien llega a las 10 no se queda en piso esperando a las 2 mientras la Caja 2 está sola:
    // si entra a caja más tarde, es porque otra persona ya cubre la Caja 2 desde las 10
    rol.dias.forEach((dia) => unidos(dia).filter((t) => t.nomina === lucia && dia.cod !== 'DOM' && t.ini > 10 * 60).forEach((t) => {
      assert.equal(enCajaA(dia, 10 * 60 + 30), 2, dia.nombre + ': Lucía entra a las ' + C.aHora(t.ini) + ' y a las 10:30 hay una sola caja');
    }));
    // los de la tarde entran a caja cuando llegan (3:30), no a las 6
    rol.dias.forEach((dia) => unidos(dia).filter((t) => tarde.includes(t.nomina) && dia.cod !== 'DOM').forEach((t) => assert.ok(t.ini <= 17 * 60, dia.nombre + ': turno de tarde desde ' + C.aHora(t.ini))));
    // cuando hay 2 en caja, uno es Caja 1 y el otro Caja 2; si sale el de Caja 1, el de Caja 2 pasa a Caja 1
    rol.dias.forEach((dia) => { for (let m = dia.ab; m < dia.ci; m += 30) { const c1 = dia.turnos.filter((t) => t.caja === 1 && t.ini <= m && t.fin > m).length; const c2 = dia.turnos.filter((t) => t.caja === 2 && t.ini <= m && t.fin > m).length; assert.ok(c1 <= 1 && c2 <= 1 && (c2 === 0 || c1 === 1), dia.nombre + ' ' + C.aHora(m)); } });
    if (maxDias === 3) {
      const horas = cat.map((p) => (v.resumen[p.nomina] ? v.resumen[p.nomina].horas : 0) / 60);
      assert.ok(Math.max(...horas) - Math.min(...horas) <= 9, 'reparto de horas: ' + horas.join(', '));
    }
  });
});

test('si alcanza la gente, las dos cajas se cubren todo el día aunque haya horas tranquilas', () => {
  require('../js/historico.js');
  const d = globalThis.HISTORICO_VENTAS.demanda;
  const cat = catalogo(16);
  const sem = semanaDe(cat, Object.fromEntries(cat.map((p, i) => [p.nomina, Array(7).fill(i % 2 ? '08:00-17:00' : '12:00-21:00')])));
  const { rol, v } = generar(cat, sem, { demanda: d });
  sinFaltas(v);
  assert.equal(v.huecos.length, 0);
});

// ------------------------------------------------ Caja 3 y explicación de huecos
test('la Caja 3 solo se abre desde el umbral de tickets y cada pico se cubre con pocas personas', () => {
  assert.equal(C.nivelCajas(45, 20, 55), 2);
  assert.equal(C.nivelCajas(55, 20, 55), 3);
  assert.equal(C.nivelCajas(12, 20, 55), 1);
  require('../js/historico.js');
  const d = globalThis.HISTORICO_VENTAS.demanda;
  const cat = catalogo(14);
  const sem = semanaDe(cat, Object.fromEntries(cat.map((p, i) => [p.nomina, Array(7).fill(i % 2 ? '08:00-17:00' : '12:00-21:00')])));
  const { rol, v, config } = generar(cat, sem, { demanda: d });
  sinFaltas(v);
  assert.equal(config.caja3, 55);
  // con el histórico la Caja 3 solo se pide el domingo a mediodía
  rol.dias.forEach((dia) => { if (dia.cod !== 'DOM') assert.equal(dia.apoyos.length, 0, dia.nombre); });
  const dom = rol.dias.find((x) => x.cod === 'DOM');
  assert.ok(dom.apoyos.length >= 1 && dom.apoyos.length <= 2, 'apoyos domingo: ' + dom.apoyos.length);
  assert.ok(dom.apoyos.every((a) => a.nomina));
});

test('cada hueco dice quién está en tienda a esa hora y cuántos días de caja lleva', () => {
  const cat = catalogo(2);
  const sem = semanaDe(cat, { 1001: Array(7).fill('08:00-14:00'), 1002: Array(7).fill('15:00-21:00') });
  const { v } = generar(cat, sem);
  const h = v.huecos.find((x) => x.caja === 2 && x.ini === 8 * 60);
  assert.ok(h);
  // el hueco va de 8 a 21: están los dos, cada uno con sus días de caja y la caja en la que está hoy
  assert.deepEqual(h.presentes.map((p) => p.nomina).sort(), ['1001', '1002']);
  h.presentes.forEach((p) => { assert.ok(p.dias >= 1 && p.dias <= 3); assert.equal(p.hoy, 1); });
});

// ------------------------------------------------------------ Caja 2 de piso
test('donde no hay cajero de Caja 2, un vendedor de piso la cubre y no cuenta en sus días', () => {
  const cat = catalogo(4);
  // 1001 y 1002 en la mañana, 1003 y 1004 en la tarde: solo 1 día de caja cada uno
  const sem = semanaDe(cat, { 1001: Array(7).fill('08:00-14:00'), 1002: Array(7).fill('08:00-14:00'), 1003: Array(7).fill('15:00-21:00'), 1004: Array(7).fill('15:00-21:00') });
  const { rol, v, config } = generar(cat, sem, { config: { maxDias: 1, turnoMax: 7 } });
  sinFaltas(v);
  v.piso.forEach((lista, i) => {
    const dia = rol.dias[i];
    lista.forEach((x) => {
      if (!x.nomina) return;
      // está en tienda y no tiene turno de caja a esa hora
      const d = C.disponible(sem, x.nomina, i);
      assert.ok(d && d.ini <= x.ini && d.fin >= x.fin, 'en horario');
      assert.ok(!dia.turnos.some((t) => t.nomina === x.nomina && t.ini < x.fin && t.fin > x.ini), 'no está en caja');
    });
  });
  // la Caja 2 de piso no suma días de caja
  Object.values(v.resumen).forEach((r) => assert.ok(r.dias <= config.maxDias));
  assert.ok(Object.values(v.resumen).some((r) => r.piso > 0));
  // ya no se marca como hueco lo que cubre alguien de piso
  v.huecos.filter((x) => x.caja === 2).forEach((x) => {
    assert.ok(v.piso[x.dia].some((p) => !p.nomina && p.ini === x.ini && p.fin === x.fin));
  });
});
