// Los nueve criterios de validación: la semana generada los cumple y cada uno detecta su error.
const test = require('node:test');
const assert = require('node:assert/strict');
const { C, catalogos, semana, fila, criterio, textos, diasCon, enTienda } = require('./ayuda.js');

const K = catalogos();
const base = () => semana(K);
const validar = (s) => C.validarSemana(K, s);
const trabaja = (r) => r && r.tipo === 'TRABAJA';

test('la semana de ejemplo cumple los nueve criterios', () => {
  const v = validar(base());
  v.criterios.forEach((c) => assert.deepEqual(c.detalles.map((d) => d.texto), [], 'criterio ' + c.n));
  assert.equal(v.ok, true);
});

test('1 · detecta tienda sin apertura, aunque haya gente de cierre', () => {
  const s = base();
  const i = diasCon(s, '7007', trabaja)[0]; // un día que Josué abre Tepeji
  C.cambiarCelda(s, '7007', i, { tipo: 'TRABAJA', clave: '12:00-21:00', sucursal: 'Tepeji' });
  assert.match(textos(validar(s), 1).join('\n'), /Tepeji .*nadie entra a las 08:00\. La tienda no abre/);
  C.cambiarCelda(s, '7007', i, { tipo: 'D' });
  assert.match(textos(validar(s), 1).join('\n'), /Tepeji .*no hay nadie asignado/);
});

test('2 · detecta Centro de Color sin cierre', () => {
  const s = base();
  const i = 0;
  enTienda(K, s, 'Centro de Color', i).forEach((r) => {
    const c = C.normalizarClave(r.clave);
    if (c.fin >= 21 * 60) C.cambiarCelda(s, r.nomina, i, { clave: '08:00-17:00', sucursal: 'Centro de Color' });
  });
  const t = textos(validar(s), 2);
  assert.equal(t.length, 1);
  assert.match(t[0], /Centro de Color .*nadie se queda al cierre de las 21:00/);
});

test('3 · detecta personas con filas de menos o de más', () => {
  const s = base();
  s.filas = s.filas.filter((r) => !(r.nomina === '9001' && r.fecha === s.fechas[3]));
  s.filas.push(Object.assign({}, fila(s, '9002', 0), { fecha: '2026-11-26' }));
  const t = textos(validar(s), 3).join('\n');
  assert.match(t, /VENDEDOR MINA 01 tiene 6 filas; le faltan 1/);
  assert.match(t, /VENDEDOR MINA 02 tiene 8 filas; le sobran 1/);
});

test('4 · detecta bloques que no empiezan en jueves', () => {
  const s = base();
  const jueves = fila(s, '9004', 0);
  s.filas = s.filas.filter((r) => r !== jueves).concat([jueves]); // el jueves queda al final de su bloque
  assert.match(textos(validar(s), 4).join('\n'), /VENDEDOR MINA 04: su primera fila es del Viernes 20\/11/);
  const s2 = base();
  s2.inicio = '2026-11-20';
  assert.match(textos(validar(s2), 4).join('\n'), /tiene que empezar en jueves/);
});

test('5 · detecta claves fuera del catálogo e inactivas; acepta la misma clave escrita sin cero', () => {
  const K2 = catalogos((d) => { d.claves.find((c) => c.clave === '08:00-14:00').activa = 'no'; });
  const s = semana(K2);
  const [i1, i2, i3] = diasCon(s, '9002', trabaja);
  C.cambiarCelda(s, '9002', i1, { clave: '07:30-16:30' });
  C.cambiarCelda(s, '9002', i2, { clave: '08:00-14:00' });
  C.cambiarCelda(s, '9002', i3, { clave: '08:00-18:00' }); // en el catálogo está como 8:00-18:00
  const t = C.validarSemana(K2, s);
  const txt = textos(t, 5).join('\n');
  assert.match(txt, /"07:30-16:30" no está en el catálogo/);
  assert.match(txt, /"08:00-14:00" está marcada como inactiva/);
  assert.doesNotMatch(txt, /08:00-18:00/);
  assert.equal(textos(t, 5).length, 2);
});

test('6 · detecta descansos mal contados', () => {
  const s = base();
  const i = diasCon(s, '9001', (r) => r.tipo === 'D')[0];
  C.cambiarCelda(s, '9001', i, { tipo: 'TRABAJA', clave: '12:00-21:00', sucursal: 'Ferre Mina' });
  const j = diasCon(s, '9201', trabaja)[0];
  C.cambiarCelda(s, '9201', j, { tipo: 'D' });
  const t = textos(validar(s), 6).join('\n');
  assert.match(t, /VENDEDOR MINA 01 tiene 0 descansos y le toca 1/);
  assert.match(t, /ENCARGADO CANALEJAS tiene 3 descansos y le tocan 2/);
});

test('6 · el NP cuenta como descanso', () => {
  const s = base();
  const i = diasCon(s, '9001', (r) => r.tipo === 'D')[0];
  C.cambiarCelda(s, '9001', i, { tipo: 'NP' });
  assert.deepEqual(textos(validar(s), 6), []);
});

test('7 · detecta horas de más o de menos contra la jornada', () => {
  const s = base();
  const i = diasCon(s, '9004', (r) => trabaja(r) && r.clave === '08:00-17:00')[0];
  C.cambiarCelda(s, '9004', i, { clave: '08:00-19:00' });
  const v = validar(s);
  assert.match(textos(v, 7).join('\n'), /VENDEDOR MINA 04: 50 h de 48 h \(sobran 2 h\)/);
  assert.equal(v.resumen['9004'].dif, 2);
});

test('8 · detecta descanso fijo movido', () => {
  const s = base();
  const dom = 3, otro = diasCon(s, '7007', trabaja)[0];
  C.cambiarCelda(s, '7007', dom, { tipo: 'TRABAJA', clave: '08:00-16:00', sucursal: 'Tepeji' });
  C.cambiarCelda(s, '7007', otro, { tipo: 'D' });
  const v = validar(s);
  assert.match(textos(v, 8).join('\n'), /ENCARGADO TEPEJI descansa fijo el domingo y ese día tiene 08:00-16:00/);
  assert.deepEqual(textos(v, 6), []); // los descansos siguen siendo dos
});

test('9 · detecta a alguien en dos tiendas el mismo día', () => {
  const s = base();
  const i = diasCon(s, '7012', trabaja)[0];
  s.filas.push(Object.assign({}, fila(s, '7012', i), { sucursal: s.filas.find((r) => r.nomina === '7012' && r.fecha === s.fechas[i]).sucursal === 'Ferre Mina' ? 'Tepeji' : 'Ferre Mina' }));
  const v = validar(s);
  assert.match(textos(v, 9).join('\n'), /COMODIN UNO · .*: está en .* y .*\./);
  assert.match(textos(v, 3).join('\n'), /COMODIN UNO tiene 8 filas/);
});

test('el semáforo marca en rojo solo el criterio que falla', () => {
  const s = base();
  const i = diasCon(s, '9004', (r) => trabaja(r) && r.clave === '08:00-17:00')[0];
  C.cambiarCelda(s, '9004', i, { clave: '08:00-19:00' });
  const v = validar(s);
  assert.deepEqual(v.criterios.filter((c) => c.estado === 'error').map((c) => c.n), [7]);
  assert.equal(v.ok, false);
  void criterio;
});
