/*
 * Datos de PRUEBA para el libro de horarios. Las personas reales llevan solo lo que
 * sabemos de ellas; los demás ("Vendedor 01", "Encargado Canalejas"…) son de relleno
 * para completar a los 29. Cámbialos por la plantilla real en Google Sheets.
 * Lo usan: las pruebas (tests/), el generador del libro de ejemplo y el botón
 * "Probar con datos de ejemplo" de la app.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DATOS_EJEMPLO = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const JILO = 'Jilotepec (Berel Centro)';
  const SOYA = 'Soyaniquilpan (Berel San Francisco)';
  const BEREL = [JILO, 'Tepeji', 'Canalejas', SOYA, 'Jocotitlán', 'Atlacomulco', 'Zinacantepec'];
  const SEMANA = ['jueves', 'viernes', 'sábado', 'domingo', 'lunes', 'martes', 'miércoles'];

  const p = (nomina, nombre, corto, ceco, puesto, area, base, jornada, descansos, fijo) =>
    ({ nomina, nombre, ceco, puesto, area, sucursal_base: base, jornada_horas: jornada, descansos_semana: descansos, descanso_fijo: fijo || '', estatus: 'activo', nombre_corto: corto });

  const plantilla = [
    p('7001', 'LOPEZ RUIZ MARIO ALBERTO', 'Mario López', 'NSDN F', 'GDF', 'FERRETERÍA MINA', 'Ferre Mina', 48, 1, ''),
    p('7002', 'SUPERVISOR UNO', 'Supervisor 1', 'NSDN F', 'SUP COM', 'FERRETERÍA MINA', 'Ferre Mina', 48, 1, 'viernes'),
    p('7003', 'SUPERVISORA DOS', 'Supervisora 2', 'NSDN F', 'SUP COM', 'FERRETERÍA MINA', 'Ferre Mina', 48, 1, 'lunes'),
    p('7004', 'VENDEDOR VIAJERO', 'Viajero', 'NSDN F', 'VEND', 'FERRETERÍA MINA', 'Ferre Mina', 48, 1, ''),
  ];
  for (let k = 1; k <= 11; k++) {
    const n = String(k).padStart(2, '0');
    // El Vendedor 11 es un ingreso nuevo: todavía no tiene nómina.
    plantilla.push(p(k === 11 ? '' : String(9000 + k), 'VENDEDOR MINA ' + n, 'Vendedor ' + n, 'NSDN F', 'VEND', 'FERRETERÍA MINA', 'Ferre Mina', 48, 1, ''));
  }
  plantilla.push(
    // Rosa María: encargada de Centro de Color, va 6 × 8.
    p('7005', 'ENCARGADA COLOR', 'Enc. Color', 'NSDN CC', 'ENC', 'CENTRO DE COLOR', 'Centro de Color', 48, 1, ''),
    p('9101', 'COLORISTA APERTURA', 'Colorista A', 'NSDN CC', 'COLORISTA', 'CENTRO DE COLOR', 'Centro de Color', 40, 2, ''),
    p('9102', 'COLORISTA CIERRE', 'Colorista C', 'NSDN CC', 'COLORISTA', 'CENTRO DE COLOR', 'Centro de Color', 36, 1, ''),
    p('7006', 'ENCARGADO JILOTEPEC', 'Enc. Jilotepec', 'SBJT', 'ENC', 'RED BEREL', JILO, 48, 2, ''),
    p('7007', 'ENCARGADO TEPEJI', 'Enc. Tepeji', 'SBT', 'ENC', 'RED BEREL', 'Tepeji', 48, 2, 'domingo'),
    p('9201', 'ENCARGADO CANALEJAS', 'Enc. Canalejas', 'POR DEFINIR', 'ENC', 'RED BEREL', 'Canalejas', 48, 2, ''),
    p('9202', 'ENCARGADO SOYANIQUILPAN', 'Enc. Soyaniquilpan', 'SSY', 'ENC', 'RED BEREL', SOYA, 48, 2, ''),
    p('7008', 'ENCARGADA JOCOTITLAN', 'Enc. Jocotitlán', 'POR DEFINIR', 'ENC', 'RED BEREL', 'Jocotitlán', 48, 2, ''),
    p('7009', 'ENCARGADO ATLACOMULCO', 'Enc. Atlacomulco', 'SBA', 'ENC', 'RED BEREL', 'Atlacomulco', 48, 2, ''),
    p('7010', 'ENCARGADO ZINACANTEPEC', 'Enc. Zinacantepec', 'SBZ', 'ENC', 'RED BEREL', 'Zinacantepec', 48, 1, ''),
    p('7011', 'COORDINADOR CHOFER', 'Coordinador', 'SBJT', 'COORD BEREL', 'RED BEREL', JILO, 48, 1, ''),
    p('7012', 'COMODIN UNO', 'Comodín 1', 'NSDN F', 'COMODÍN', 'COMODINES', 'Ferre Mina', 48, 2, ''),
    p('7013', 'COMODIN DOS', 'Comodín 2', 'NSDN F', 'COMODÍN', 'COMODINES', 'Ferre Mina', 48, 2, ''),
    p('7014', 'COMODIN TRES', 'Comodín 3', 'NSDN F', 'COMODÍN', 'COMODINES', 'Ferre Mina', 48, 2, 'sábado'),
  );

  // Una fila por tienda y día.
  const tiendas = [];
  const fila = (tienda, dia, abre, cierra, ap, ci) => tiendas.push({ tienda, dia, abre, cierra, clave_apertura: ap, clave_cierre: ci || ap });
  SEMANA.forEach((d) => {
    const sab = d === 'sábado', dom = d === 'domingo';
    fila('Ferre Mina', d, '08:00', dom ? '19:00' : '21:00', dom ? '08:00-16:00' : '08:00-17:00', dom ? '11:00-19:00' : '12:00-21:00');
    fila('Centro de Color', d, '08:00', dom ? '19:00' : '21:00', '08:00-17:00', dom ? '13:00-19:00' : '15:00-21:00');
    fila(JILO, d, sab || dom ? '09:00' : '08:00', sab || dom ? '18:00' : '19:00', sab || dom ? '09:00-18:00' : '08:00-19:00');
    ['Tepeji', 'Canalejas', SOYA, 'Jocotitlán', 'Atlacomulco'].forEach((t) =>
      fila(t, d, '08:00', dom ? '16:00' : sab ? '17:00' : '19:00', dom ? '08:00-16:00' : sab ? '08:00-17:00' : '08:00-19:00'));
    fila('Zinacantepec', d, dom ? '08:00' : '09:00', dom ? '16:00' : '18:00', dom ? '08:00-16:00' : '09:00-18:00');
  });

  const c = (clave, descripcion, horas) => ({ clave, descripcion, horas_efectivas: horas, activa: 'sí' });
  const claves = [
    c('D', 'Descanso', 0),
    c('NP', 'Descanso por día festivo', 0),
    c('08:00-19:00', 'Jornada larga 10 h', 10),
    c('08:00-17:00', 'Apertura 8 h', 8),
    c('09:00-18:00', 'Apertura 8 h (entrada 9)', 8),
    c('08:00-16:00', 'Domingo 8 h', 8),
    c('08:00-14:00', 'Medio turno 6 h', 6),
    c('12:00-21:00', 'Cierre Ferre Mina 8 h', 8),
    c('11:00-19:00', 'Cierre domingo Ferre Mina 8 h', 8),
    c('15:00-21:00', 'Cierre Centro de Color 6 h', 6),
    c('13:00-19:00', 'Cierre domingo Centro de Color 6 h', 6),
    c('8:00-18:00', 'Jornada 9 h (escrita sin cero en GIRHA)', 9),
  ];

  const r = (tipo, sujeto, valor, nota) => ({ tipo, sujeto, valor, nota: nota || '' });
  const berel = BEREL.join('|');
  const berelSinZina = BEREL.filter((t) => t !== 'Zinacantepec').join('|');
  const reglas = [
    r('descanso_fijo', '7006', 'sábado', 'Uno de sus dos descansos va fijo en sábado'),
    r('pareja_cobertura', 'Jocotitlán|Atlacomulco', '7011', 'Descansan juntas y se cubren en la misma salida con la unidad de Gabriel'),
    r('puede_cubrir', '7012', '*|!Zinacantepec', 'Comodín: todas menos Zinacantepec'),
    r('puede_cubrir', '7013', '*|!Zinacantepec', 'Comodín: todas menos Zinacantepec'),
    r('puede_cubrir', '7014', JILO + '|' + SOYA, 'Daniela: solo Berel Jilotepec y Berel San Francisco'),
    r('puede_cubrir', '7011', berel, 'Coordinador Berel: el único que puede cubrir Zinacantepec'),
    r('puede_cubrir', '7004', berelSinZina, ''),
    r('relleno', 'Centro de Color|' + JILO, 'COMODINES', 'Los comodines pueden hacer turnos cortos aquí para cuadrar sus horas'),
    r('pernocta', '7012', 'Jocotitlán', ''),
    r('pernocta', '7013', 'Jocotitlán', ''),
    r('pernocta', '7011', 'Jocotitlán', ''),
    r('pernocta', '7004', 'Jocotitlán', ''),
    r('rotacion', '7002|7003', 'Ferre Mina', 'Supervisores comerciales: rotan apertura y cierre cada semana'),
  ];

  const n = (nomina, tipo, desde, hasta, sucursal, nota) => ({ nomina, tipo, desde, hasta, sucursal: sucursal || '', nota: nota || '' });
  const novedades = [
    n('', 'festivo', '2026-11-16', '', '', 'Revolución Mexicana'),
    n('', 'festivo', '2026-12-25', '', '', 'Navidad'),
    n('', 'festivo', '2027-01-01', '', '', 'Año Nuevo'),
    n('9003', 'vacaciones', '2026-11-26', '2026-12-02', '', 'Vacaciones aprobadas'),
    n('9005', 'comisión', '2026-11-27', '2026-11-28', 'Capacitación Berel', 'Curso de producto'),
    n('9007', 'PTT', '2026-11-30', '', '', 'Pago de tiempo por tiempo'),
  ];

  return { plantilla, tiendas, claves, reglas, novedades, semanas: [], dias: [], cambios: [] };
});
