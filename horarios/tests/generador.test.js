// Reglas del generador: orden de aplicación, descansos, rotación, coberturas y horas.
const test = require('node:test');
const assert = require('node:assert/strict');
const { C, DATOS, INICIO, catalogos, semana, fila, textos, diasCon, enTienda } = require('./ayuda.js');

const K = catalogos();
const trabaja = (r) => r && r.tipo === 'TRABAJA';
const descansa = (r) => r && C.esDescanso(r.tipo);
const tiendaDe = (r) => C.buscarTienda(K, r.sucursal);

test('la semana va de jueves a miércoles aunque se pida otro día', () => {
  const s = semana(K, { inicio: '2026-11-22' }); // domingo
  assert.equal(s.inicio, INICIO);
  assert.equal(C.diaSemana(s.fechas[0]), 4);
  assert.equal(s.fechas[6], '2026-11-25');
});

test('siete filas por persona activa; las bajas no salen', () => {
  const K2 = catalogos((d) => { d.plantilla.find((p) => p.nomina === '9010').estatus = 'baja'; });
  const s = semana(K2);
  const activos = K2.personas.filter((p) => p.activo);
  assert.equal(activos.length, 28);
  assert.equal(s.filas.length, 28 * 7);
  assert.ok(!s.filas.some((r) => r.nomina === '9010'));
});

test('el generador da siempre lo mismo con los mismos datos', () => {
  assert.deepEqual(semana(K).filas, semana(K).filas);
});

test('1 · bloqueos duros: vacaciones, comisión y PTT no se tocan y llevan su horario regular', () => {
  const s = semana(K, { inicio: '2026-11-26' });
  const vac = diasCon(s, '9003', (r) => r.tipo === 'VAC');
  assert.equal(vac.length, 6); // 7 días menos su descanso
  vac.forEach((i) => assert.match(fila(s, '9003', i).clave, /^\d\d:\d\d-\d\d:\d\d$/));
  assert.equal(diasCon(s, '9003', descansa).length, 1);
  assert.deepEqual(diasCon(s, '9005', (r) => r.tipo === 'COM'), [1, 2]);
  assert.equal(fila(s, '9005', 1).sucursal, 'Capacitación Berel');
  assert.deepEqual(diasCon(s, '9007', (r) => r.tipo === 'PTT'), [4]);
  assert.deepEqual(textos(C.validarSemana(K, s), 7), []); // los días de novedad cuentan sus horas
});

test('1 · el descanso fijo se respeta aunque caiga en vacaciones', () => {
  const K2 = catalogos((d) => { d.novedades.push({ nomina: '7007', tipo: 'vacaciones', desde: '2026-11-19', hasta: '2026-11-25' }); });
  const s = semana(K2);
  assert.equal(fila(s, '7007', 3).tipo, 'D'); // domingo
  assert.equal(diasCon(s, '7007', (r) => r.tipo === 'VAC').length, 5);
  assert.equal(diasCon(s, '7007', descansa).length, 2);
});

test('2 · día festivo: el descanso se marca NP, no D', () => {
  const s = semana(K, { festivos: ['2026-11-23'] }); // lunes
  const ese = s.filas.filter((r) => r.fecha === '2026-11-23');
  assert.ok(ese.some((r) => r.tipo === 'NP'));
  assert.ok(!ese.some((r) => r.tipo === 'D'));
  assert.equal(fila(s, '7003', 4).tipo, 'NP'); // Rocío descansa fijo el lunes
  assert.ok(C.validarSemana(K, s).ok);
});

test('2 · los festivos se toman de la hoja Novedades', () => {
  const s = semana(K, { inicio: '2026-11-12' });
  assert.deepEqual(s.festivos, ['2026-11-16']);
  assert.ok(s.filas.filter((r) => r.fecha === '2026-11-16').every((r) => r.tipo !== 'D'));
});

test('3 · descansos fijos de la Plantilla y de la hoja Reglas', () => {
  const s = semana(K);
  assert.equal(fila(s, '7007', 3).tipo, 'D'); // Josué domingo
  assert.equal(fila(s, '7006', 2).tipo, 'D'); // Daniel sábado (hoja Reglas)
  assert.equal(fila(s, '7014', 2).tipo, 'D'); // Daniela sábado
  assert.equal(fila(s, '7002', 1).tipo, 'D'); // Esteban viernes
  assert.equal(fila(s, '7003', 4).tipo, 'D'); // Rocío lunes
});

test('3 · cada quien tiene sus descansos: 2 en Red Berel, 1 para quien va 6 × 8', () => {
  const s = semana(K);
  ['7006', '7007', '9201', '9202', '7008', '7009', '7014', '7012', '7013'].forEach((n) => assert.equal(diasCon(s, n, descansa).length, 2, n));
  ['7005', '7011', '7010'].forEach((n) => assert.equal(diasCon(s, n, descansa).length, 1, n)); // Rosa, Gabriel y Alfredo van 6 × 8
});

test('48 horas: Red Berel va 4 × 10 más un día de fin de semana', () => {
  const s = semana(K);
  ['7007', '9201', '9202', '7008', '7009'].forEach((n) => {
    const dias = diasCon(s, n, trabaja);
    assert.equal(dias.length, 5, n);
    assert.equal(dias.filter((i) => i === 2 || i === 3).length, 1, n + ' trabaja un solo día de fin de semana');
    assert.equal(C.horasSemana(K, s, n), 48, n);
  });
  ['7005', '7011', '7010'].forEach((n) => {
    assert.equal(diasCon(s, n, trabaja).length, 6);
    assert.equal(C.horasSemana(K, s, n), 48);
  });
});

test('cuando descansa Fredi (Atlacomulco) descansa Maira (Jocotitlán) y se cubren en la misma salida', () => {
  const s = semana(K);
  const dm = diasCon(s, '7008', descansa), df = diasCon(s, '7009', descansa);
  assert.deepEqual(df, dm);
  df.forEach((i) => {
    const joco = enTienda(K, s, 'Jocotitlán', i), atla = enTienda(K, s, 'Atlacomulco', i);
    assert.equal(joco.length, 1);
    assert.equal(atla.length, 1);
    const chofer = joco.concat(atla).some((r) => r.nomina === '7011');
    const pernocta = (r) => C.sePuedeQuedar(K, r.nomina, C.buscarTienda(K, r.sucursal).clave);
    // Nadie se va en camión: o va Gabriel con la unidad, o quien va se puede quedar a dormir.
    joco.concat(atla).forEach((r) => assert.ok(chofer || pernocta(r), r.nomina));
  });
  assert.deepEqual(C.validarSemana(K, s).traslados, []);
});

test('sin la unidad de Gabriel, Jocotitlán solo lo cubre quien se queda a dormir y Atlacomulco queda en rojo', () => {
  const K2 = catalogos((d) => { d.plantilla.find((p) => p.nomina === '7011').estatus = 'baja'; });
  const s = semana(K2);
  const dias = diasCon(s, '7009', descansa);
  dias.forEach((i) => {
    enTienda(K2, s, 'Jocotitlán', i).forEach((r) => assert.ok(C.sePuedeQuedar(K2, r.nomina, C.buscarTienda(K2, 'Jocotitlán').clave), r.nomina));
    assert.equal(enTienda(K2, s, 'Atlacomulco', i).length, 0, 'no inventa a nadie para Atlacomulco');
    const p = s.pendientes.find((x) => x.tienda === 'Atlacomulco' && x.i === i);
    assert.ok(p, 'queda marcado el hueco');
    assert.match(p.motivo, /solo pueden ir quienes se quedan a dormir/);
  });
});

test('4 · rotación: Esteban y Rocío se invierten cada semana', () => {
  const s1 = semana(K);
  const s2 = semana(K, { inicio: '2026-11-26', anterior: s1 });
  const s3 = semana(K, { inicio: '2026-12-03', anterior: s2 });
  const abre = (s) => C.quienAbrio(K, K.rotaciones[0], s);
  assert.ok(abre(s1));
  assert.notEqual(abre(s2), abre(s1));
  assert.equal(abre(s3), abre(s1));
  assert.match(s2.notas.join(' '), /la semana pasada fue al revés/);
});

test('4 · rotación: si al que le toca cerrar descansa, el otro se recorre al cierre', () => {
  [semana(K), semana(K, { inicio: '2026-11-26', anterior: semana(K) })].forEach((s) => {
    const abreId = C.quienAbrio(K, K.rotaciones[0], s);
    const cierraId = abreId === '7002' ? '7003' : '7002';
    const diaDescanso = diasCon(s, cierraId, descansa)[0];
    const r = fila(s, abreId, diaDescanso);
    assert.equal(r.tipo, 'TRABAJA');
    const t = C.turnoTienda(K, 'Ferre Mina', diaDescanso);
    assert.ok(C.normalizarClave(r.clave).fin >= t.cierra, 'cierra ' + r.clave);
    assert.match(r.nota, /se recorre al cierre/);
  });
});

test('5 · los huecos los cubre un comodín con permiso (puede_cubrir) y queda el motivo', () => {
  const s = semana(K);
  const cob = s.filas.filter((r) => r.origen === 'cobertura');
  assert.ok(cob.length >= 8);
  cob.forEach((r) => {
    assert.ok(C.puedeCubrir(K, r.nomina, tiendaDe(r).clave), r.nomina + ' en ' + r.sucursal);
    assert.match(r.nota, /^Cubre /);
  });
});

test('5 · sin reglas de cobertura no inventa a nadie: deja las tiendas en rojo', () => {
  const K2 = catalogos((d) => { d.reglas = d.reglas.filter((r) => r.tipo !== 'puede_cubrir'); });
  const s = semana(K2);
  assert.equal(s.filas.filter((r) => r.origen === 'cobertura').length, 0);
  assert.ok(s.pendientes.length >= 8);
  s.pendientes.forEach((p) => assert.ok(p.motivo.length > 10));
  const v = C.validarSemana(K2, s);
  assert.equal(v.criterios[0].detalles.length, s.pendientes.length);
});

test('6 · horas: el ajuste respeta la hora de entrada', () => {
  const s = semana(K);
  s.filas.filter((r) => /Clave ajustada de/.test(r.nota)).forEach((r) => {
    const antes = r.nota.match(/Clave ajustada de (\S+)/)[1];
    assert.equal(C.normalizarClave(antes).ini, C.normalizarClave(r.clave).ini, r.nomina);
  });
  assert.deepEqual(textos(C.validarSemana(K, s), 7), []);
});

test('6 · si no se pueden cuadrar las horas lo avisa con el motivo', () => {
  const K2 = catalogos((d) => { d.plantilla.find((p) => p.nomina === '9001').jornada_horas = 30; });
  const s = semana(K2);
  const a = s.alertas.find((x) => x.id === '9001');
  assert.ok(a);
  assert.match(a.texto, /su jornada es de 30 h/);
  assert.match(textos(C.validarSemana(K2, s), 7).join('\n'), /VENDEDOR MINA 01/);
});

test('personal sin nómina sí se programa', () => {
  const s = semana(K);
  assert.equal(diasCon(s, 'SN:VENDEDOR MINA 11', () => true).length, 7);
  assert.deepEqual(C.validarSemana(K, s).sinNomina.map((x) => x.nombre), ['VENDEDOR MINA 11']);
});

test('turnos libres: el margen baja cuando hay menos comodines', () => {
  const h1 = C.validarSemana(K, semana(K)).holgura;
  const K2 = catalogos((d) => { d.plantilla.find((p) => p.nomina === '7012').estatus = 'baja'; });
  const h2 = C.validarSemana(K2, semana(K2)).holgura;
  assert.ok(h1.total > 0);
  assert.ok(h2.total < h1.total);
  assert.equal(h1.porDia.length, 7);
});

test('avisa reglas mal escritas en vez de fallar', () => {
  const K2 = catalogos((d) => {
    d.reglas.push({ tipo: 'puede_cubrir', sujeto: '5555', valor: '*' });
    d.reglas.push({ tipo: 'vuela', sujeto: '1', valor: '2' });
    d.tiendas.push({ tienda: 'Ferre Mina', dia: 'juernes', abre: '8:00', cierra: '21:00', clave_apertura: '08:00-17:00', clave_cierre: '' });
  });
  const t = K2.avisos.join('\n');
  assert.match(t, /no encuentro a "5555"/);
  assert.match(t, /"vuela" no lo conozco/);
  assert.match(t, /"juernes"/);
  void DATOS;
});

test('si Gabriel tiene que quedarse en su tienda, un comodín lo releva para que salga con la unidad', () => {
  const K2 = catalogos((d) => { d.plantilla.find((p) => p.nomina === '7006').estatus = 'baja'; });
  const s = semana(K2);
  // la pareja Jocotitlán–Atlacomulco queda cubierta (puede faltar otra tienda si ya no alcanzan los comodines)
  assert.deepEqual(s.pendientes.filter((p) => /Jocotitl|Atlacomulco/.test(p.tienda)), []);
  s.pendientes.forEach((p) => assert.ok(p.motivo.length > 10));
  const relevos = s.filas.filter((r) => /para que Coordinador salga con la unidad/.test(r.nota));
  assert.ok(relevos.length >= 1);
  relevos.forEach((r) => assert.equal(C.buscarTienda(K2, r.sucursal).nombre, 'Jilotepec (Berel Centro)'));
  assert.deepEqual(C.validarSemana(K2, s).traslados, []);
});

test('vacaciones toda la semana sin historial: propone sus descansos de modo que le cuadren las horas y pide confirmarlos', () => {
  const K2 = catalogos((d) => { d.novedades.push({ nomina: '9201', tipo: 'vacaciones', desde: '2026-11-19', hasta: '2026-11-25' }); });
  const s = semana(K2);
  const desc = diasCon(s, '9201', descansa);
  assert.equal(desc.length, 2);
  assert.equal(desc.filter((i) => i === 2 || i === 3).length, 1, 'uno de los descansos en fin de semana');
  assert.equal(C.horasSemana(K2, s, '9201'), 48);
  assert.ok(desc.every((i) => fila(s, '9201', i).alerta));
  assert.match(s.alertas.find((a) => a.id === '9201').texto, /Confírmalo/);
});

test('al cubrir huecos nunca descuadra las horas de nadie: prefiere dejar la tienda en rojo', () => {
  // Con Alfredo fuera, Zinacantepec necesita a Gabriel toda la semana y no alcanza.
  const K2 = catalogos((d) => { d.plantilla.find((p) => p.nomina === '7010').estatus = 'baja'; });
  const s = semana(K2);
  const v = C.validarSemana(K2, s);
  assert.deepEqual(textos(v, 7), []);
  assert.ok(s.pendientes.length > 0);
  assert.equal(v.criterios[0].detalles.length, s.pendientes.length);
});

test('Gabriel es el único que cubre Zinacantepec', () => {
  const s = semana(K);
  const i = diasCon(s, '7010', descansa)[0];
  const ahi = enTienda(K, s, 'Zinacantepec', i);
  assert.deepEqual(ahi.map((r) => r.nomina), ['7011']);
  const K2 = catalogos((d) => { d.plantilla.find((p) => p.nomina === '7011').estatus = 'baja'; });
  const s2 = semana(K2);
  diasCon(s2, '7010', descansa).forEach((j) => {
    assert.equal(enTienda(K2, s2, 'Zinacantepec', j).length, 0, 'sin Gabriel nadie más va a Zinacantepec');
    assert.ok(s2.pendientes.some((p) => p.tienda === 'Zinacantepec' && p.i === j));
  });
});

test('puede_cubrir acepta exclusiones: "*|!Zinacantepec"', () => {
  const zina = C.buscarTienda(K, 'Zinacantepec').clave, tepeji = C.buscarTienda(K, 'Tepeji').clave;
  assert.equal(C.puedeCubrir(K, '7012', zina), false);
  assert.equal(C.puedeCubrir(K, '7012', tepeji), true);
  assert.equal(C.puedeCubrir(K, '7011', zina), true);
});

test('Daniela solo cubre Berel Jilotepec y Berel San Francisco (Soyaniquilpan)', () => {
  const ok = new Set([C.buscarTienda(K, 'Jilotepec').clave, C.buscarTienda(K, 'Berel San Francisco').clave]);
  assert.equal(C.buscarTienda(K, 'Berel San Francisco').nombre, 'Soyaniquilpan (Berel San Francisco)');
  [semana(K), semana(K, { inicio: '2026-11-26' })].forEach((s) => s.filas.filter((r) => r.nomina === '7014' && r.origen === 'cobertura')
    .forEach((r) => assert.ok(ok.has(C.buscarTienda(K, r.sucursal).clave), r.sucursal)));
});

test('relleno: los comodines pueden hacer turnos cortos en Centro de Color o Jilotepec para cuadrar', () => {
  assert.deepEqual(C.tiendasRelleno(K, K.porId.get('7012')).map((t) => K.tiendas.get(t).nombre), ['Centro de Color', 'Jilotepec (Berel Centro)']);
  assert.deepEqual(C.tiendasRelleno(K, K.porId.get('9001')), []);
  // Un comodín cuya tienda base solo tiene turnos de 8 h no llega a 48 h con 2 descansos:
  // la app lo manda a relleno (turnos de otra duración) en vez de dejarlo descuadrado.
  const K2 = catalogos((d) => { d.plantilla.find((p) => p.nomina === '7012').sucursal_base = 'Zinacantepec'; });
  const s = semana(K2);
  assert.equal(C.horasSemana(K2, s, '7012'), 48);
  const rell = s.filas.filter((r) => r.nomina === '7012' && r.origen === 'relleno');
  assert.ok(rell.length >= 1);
  rell.forEach((r) => assert.match(r.sucursal, /Centro de Color|Jilotepec/));
});
