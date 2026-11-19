/*
 * Horarios Semanales – Ferre Don Nico
 * Motor de reglas: lee los catálogos, arma la propuesta de la semana, la valida
 * y prepara los archivos de salida. No toca la pantalla, así que también se
 * puede probar con Node (cd horarios && node --test tests/).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.HorariosCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // =====================================================================
  // Copiado tal cual de rol-cajas/js/core.js (ya probado en operación).
  // tests/compartido.test.js revisa que se comporte igual que el original.
  // =====================================================================

  const DIAS = [
    { cod: 'JUE', nombre: 'JUEVES', dow: 4 },
    { cod: 'VIE', nombre: 'VIERNES', dow: 5 },
    { cod: 'SAB', nombre: 'SÁBADO', dow: 6 },
    { cod: 'DOM', nombre: 'DOMINGO', dow: 0 },
    { cod: 'LUN', nombre: 'LUNES', dow: 1 },
    { cod: 'MAR', nombre: 'MARTES', dow: 2 },
    { cod: 'MIE', nombre: 'MIÉRCOLES', dow: 3 },
  ];
  const FIN_DE_SEMANA = new Set(['SAB', 'DOM']);

  function aMin(txt) {
    if (txt == null || txt === '') return null;
    const m = String(txt).trim().match(/^(\d{1,2})(?::(\d{2}))?$/);
    if (!m) return null;
    const h = +m[1], mm = +(m[2] || 0);
    if (h > 24 || mm > 59) return null;
    return h * 60 + mm;
  }

  function aHora(min) {
    const h = Math.floor(min / 60), m = min % 60;
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  }

  function pad(n) { return String(n).padStart(2, '0'); }
  function fechaISO(y, m, d) { return y + '-' + pad(m) + '-' + pad(d); }

  function fechaValida(y, m, d) {
    if (m < 1 || m > 12 || d < 1 || d > 31) return false;
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
  }

  function desdeSerial(n) {
    const ms = Math.round((n - 25569) * 86400000);
    const dt = new Date(ms);
    return fechaISO(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
  }

  const MESES = { ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6, jul: 7, ago: 8, sep: 9, set: 9, oct: 10, nov: 11, dic: 12, jan: 1, apr: 4, aug: 8, dec: 12 };

  function parseFecha(v) {
    if (v == null || v === '') return null;
    if (v instanceof Date) {
      if (isNaN(v)) return null;
      return fechaISO(v.getFullYear(), v.getMonth() + 1, v.getDate());
    }
    if (typeof v === 'number') {
      if (v > 20000 && v < 80000) return desdeSerial(Math.floor(v));
      if (v > 19000101 && v < 21001231) return parseFecha(String(Math.floor(v)));
      return null;
    }
    const s = String(v).trim();
    let m = s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/);
    if (m) return fechaValida(+m[1], +m[2], +m[3]) ? fechaISO(+m[1], +m[2], +m[3]) : null;
    m = s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})/);
    if (m) {
      let d = +m[1], mo = +m[2], y = +m[3];
      if (y < 100) y += 2000;
      if (mo > 12 && d <= 12) { const t = d; d = mo; mo = t; }
      return fechaValida(y, mo, d) ? fechaISO(y, mo, d) : null;
    }
    m = s.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (m) return fechaValida(+m[1], +m[2], +m[3]) ? fechaISO(+m[1], +m[2], +m[3]) : null;
    m = s.toLowerCase().match(/^(\d{1,2})[\s\-\/.]+([a-zñ]{3,})\.?[\s\-\/.,]+(\d{4})/);
    if (m && MESES[m[2].slice(0, 3)]) {
      const mo = MESES[m[2].slice(0, 3)];
      return fechaValida(+m[3], mo, +m[1]) ? fechaISO(+m[3], mo, +m[1]) : null;
    }
    if (/^\d+(\.\d+)?$/.test(s)) return parseFecha(Number(s));
    return null;
  }

  function diaSemana(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  }
  function sumarDias(iso, n) {
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + n));
    return fechaISO(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
  }
  function inicioSemana(iso) {
    return sumarDias(iso, -((diaSemana(iso) - 4 + 7) % 7));
  }
  function fechaCorta(iso) {
    const [, m, d] = iso.split('-');
    return d + '/' + m;
  }

  function normNomina(v) {
    if (v == null) return '';
    return String(v).trim().replace(/\.0+$/, '').replace(/^0+(?=\d)/, '');
  }

  function normalizarClave(raw) {
    const s = String(raw == null ? '' : raw).trim().toUpperCase().replace(/\s+/g, '');
    if (s === 'D') return { estado: 'D', texto: 'D' };
    if (s === 'NP') return { estado: 'NP', texto: 'NP' };
    const m = s.match(/^(\d{1,2})(?::(\d{2}))?-(\d{1,2})(?::(\d{2}))?$/);
    if (m) {
      const ini = +m[1] * 60 + +(m[2] || 0);
      const fin = +m[3] * 60 + +(m[4] || 0);
      if (+m[1] <= 24 && +m[3] <= 24 && fin > ini) {
        return { estado: 'TRABAJA', ini, fin, texto: aHora(ini) + '-' + aHora(fin) };
      }
    }
    return { estado: 'OTRO', texto: s || '(vacío)' };
  }

  // =====================================================================
  // Textos y catálogos
  // =====================================================================

  const MESES_TXT = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  const TIPOS = {
    TRABAJA: { txt: 'Trabaja', corto: '' },
    D: { txt: 'Descanso', corto: 'D' },
    NP: { txt: 'Descanso por día festivo', corto: 'NP' },
    VAC: { txt: 'Vacaciones', corto: 'VAC', bloqueo: true },
    PTT: { txt: 'Pago de tiempo por tiempo', corto: 'PTT', bloqueo: true },
    INC: { txt: 'Incapacidad', corto: 'INC', bloqueo: true },
    COM: { txt: 'Comisión', corto: 'COM', bloqueo: true },
  };
  const esDescanso = (t) => t === 'D' || t === 'NP';
  const esBloqueo = (t) => !!(TIPOS[t] && TIPOS[t].bloqueo);

  const AREAS = ['FERRETERÍA MINA', 'CENTRO DE COLOR', 'RED BEREL', 'COMODINES'];
  // Colores por área (no chocan con gris = descanso, amarillo = vacaciones, azul = comisión).
  const COLOR_AREA = { 'FERRETERIA MINA': '#C6E0B4', 'CENTRO DE COLOR': '#D9C3E9', 'RED BEREL': '#F8CBAD', 'COMODINES': '#99E0DA' };

  // Hojas del libro de Google Sheets con sus columnas, en orden.
  const HOJAS = {
    Plantilla: ['nomina', 'nombre', 'ceco', 'puesto', 'area', 'sucursal_base', 'jornada_horas', 'descansos_semana', 'descanso_fijo', 'estatus', 'nombre_corto'],
    Tiendas: ['tienda', 'dia', 'abre', 'cierra', 'clave_apertura', 'clave_cierre'],
    Claves: ['clave', 'descripcion', 'horas_efectivas', 'activa'],
    Reglas: ['tipo', 'sujeto', 'valor', 'nota'],
    Novedades: ['nomina', 'tipo', 'desde', 'hasta', 'sucursal', 'nota'],
    Semanas: ['id_semana', 'fecha_inicio', 'estado', 'generado_por', 'fecha_generado', 'nota'],
    Dias: ['id_semana', 'nomina', 'fecha', 'clave', 'sucursal', 'nota', 'tipo'],
    Cambios: ['id_semana', 'fecha_hora', 'usuario', 'nomina', 'fecha', 'antes', 'despues', 'nota'],
  };

  function normTexto(s) {
    return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toUpperCase().replace(/\s+/g, ' ');
  }
  function lista(s) { return String(s == null ? '' : s).split(/[|,;]/).map((x) => x.trim()).filter(Boolean); }

  const NOMBRE_DIA = {};
  DIAS.forEach((d) => { NOMBRE_DIA[normTexto(d.nombre)] = d.cod; NOMBRE_DIA[d.cod] = d.cod; });
  function normDia(s) {
    const t = normTexto(s);
    if (!t) return null;
    if (NOMBRE_DIA[t]) return NOMBRE_DIA[t];
    // Abreviaturas: "Mier", "Sáb"… (el principio del nombre, al menos 3 letras)
    const d = t.length >= 3 && DIAS.find((x) => normTexto(x.nombre).startsWith(t.replace(/.$/, '')));
    return d ? d.cod : null;
  }
  const idxDia = (cod) => DIAS.findIndex((d) => d.cod === cod);

  function titulo(s) { return String(s || '').toLowerCase().replace(/(^|[\s(])([a-záéíóúñü])/g, (m, a, b) => a + b.toUpperCase()); }

  // "PEREZ LOPEZ JUAN CARLOS" -> "Juan Perez" (nombre de pila + primer apellido).
  // Si la Plantilla trae nombre_corto, se usa ese. Recibe el nombre o la persona.
  function nombreCorto(x) {
    if (x && typeof x === 'object') { if (x.corto) return x.corto; x = x.nombre; }
    const w = String(x || '').trim().split(/\s+/).filter(Boolean);
    if (w.length >= 3) return titulo(w[2] + ' ' + w[0]);
    if (w.length === 2) return titulo(w[1] + ' ' + w[0]);
    return titulo(w.join(' '));
  }

  function fechaLarga(iso) {
    const [, m, d] = iso.split('-').map(Number);
    return d + ' de ' + MESES_TXT[m - 1];
  }
  function nombreDiaDe(iso) { return DIAS.find((d) => d.dow === diaSemana(iso)).nombre; }

  // Convierte una hoja (arreglo de arreglos con títulos en la fila 1) en objetos.
  function objetos(aoa) {
    if (!aoa || !aoa.length) return [];
    const tit = aoa[0].map((h) => normTexto(h).toLowerCase().replace(/ /g, '_'));
    return aoa.slice(1).filter((f) => f && f.some((c) => c !== '' && c != null)).map((f) => {
      const o = {};
      tit.forEach((t, i) => { if (t) o[t] = f[i] == null ? '' : f[i]; });
      return o;
    });
  }
  function aoaDe(hoja, objs) {
    const cols = HOJAS[hoja];
    return [cols.slice()].concat((objs || []).map((o) => cols.map((c) => (o[c] == null ? '' : o[c]))));
  }

  const idDe = (p) => normNomina(p.nomina) || ('SN:' + normTexto(p.nombre));

  // Deja listos los catálogos para el motor.
  // libro = { plantilla, tiendas, claves, reglas } (arreglos de objetos, uno por fila)
  function prepararLibro(libro) {
    const avisos = [];
    const claves = new Map();
    (libro.claves || []).forEach((r) => {
      const raw = String(r.clave == null ? '' : r.clave).trim();
      if (!raw) return;
      const n = normalizarClave(raw);
      const activa = !/^(NO|N|0|FALSE|FALSO|INACTIVA|BAJA)$/.test(normTexto(r.activa));
      const horas = Number(String(r.horas_efectivas == null ? '' : r.horas_efectivas).replace(',', '.')) || 0;
      if (claves.has(n.texto)) avisos.push('La clave "' + raw + '" está dos veces en la hoja Claves; se usa la primera.');
      else claves.set(n.texto, { clave: raw, texto: n.texto, estado: n.estado, ini: n.ini, fin: n.fin, horas, activa, descripcion: r.descripcion || '' });
    });

    const tiendas = new Map();
    (libro.tiendas || []).forEach((r) => {
      const nombre = String(r.tienda || '').trim();
      const cod = normDia(r.dia);
      if (!nombre) return;
      if (!cod) { avisos.push('En la hoja Tiendas, "' + nombre + '" tiene un día que no reconozco: "' + r.dia + '". Escribe el día completo, por ejemplo "lunes".'); return; }
      const k = normTexto(nombre);
      if (!tiendas.has(k)) tiendas.set(k, { nombre, clave: k, dias: {} });
      const ap = normalizarClave(r.clave_apertura);
      const ci0 = normalizarClave(r.clave_cierre);
      const ci = ci0.estado === 'TRABAJA' ? ci0 : ap;
      const abre = aMin(r.abre) != null ? aMin(r.abre) : ap.ini;
      const cierra = aMin(r.cierra) != null ? aMin(r.cierra) : ci.fin;
      if (ap.estado !== 'TRABAJA') { avisos.push('En la hoja Tiendas, "' + nombre + '" el ' + titulo(DIAS[idxDia(cod)].nombre) + ' no tiene clave de apertura válida.'); return; }
      tiendas.get(k).dias[cod] = { abre, cierra, ap, ci, dosTurnos: ci.texto !== ap.texto };
    });

    const personas = [];
    const porId = new Map();
    (libro.plantilla || []).forEach((r) => {
      const nombre = String(r.nombre || '').trim();
      if (!nombre) return;
      const p = {
        nomina: normNomina(r.nomina), nombre, ceco: String(r.ceco || '').trim(), puesto: String(r.puesto || '').trim(),
        area: String(r.area || '').trim(), base: String(r.sucursal_base || '').trim(),
        jornada: Number(r.jornada_horas) || 48, descansos: r.descansos_semana === '' || r.descansos_semana == null ? 2 : Number(r.descansos_semana),
        fijo: new Set(lista(r.descanso_fijo).map(normDia).filter(Boolean)),
        activo: normTexto(r.estatus || 'activo') !== 'BAJA',
        corto: String(r.nombre_corto || '').trim(),
      };
      p.id = idDe(p);
      p.areaKey = normTexto(p.area);
      if (porId.has(p.id)) { avisos.push('La nómina ' + p.nomina + ' está dos veces en la Plantilla (' + porId.get(p.id).nombre + ' y ' + nombre + '). Corrige una.'); return; }
      personas.push(p);
      porId.set(p.id, p);
    });
    personas.forEach((p) => { p.tiendaBase = buscarTienda({ tiendas }, p.base); });

    const K = { personas, porId, tiendas, claves, parejas: [], puede: new Map(), pernocta: new Map(), rotaciones: [], relleno: [], avisos, tiendaCajas: 'FERRE MINA' };
    const persona = (s) => porId.get(normNomina(s)) || personas.find((p) => normTexto(p.nombre) === normTexto(s));
    (libro.reglas || []).forEach((r, i) => {
      const tipo = normTexto(r.tipo).toLowerCase().replace(/ /g, '_');
      const fila = 'Reglas, fila ' + (i + 2);
      if (tipo === 'descanso_fijo') {
        const p = persona(r.sujeto), cod = normDia(r.valor);
        if (!p || !cod) { avisos.push(fila + ': no encuentro a "' + r.sujeto + '" o el día "' + r.valor + '".'); return; }
        p.fijo.add(cod);
      } else if (tipo === 'pareja_cobertura') {
        const ts = lista(r.sujeto).map((t) => buscarTienda(K, t)).filter(Boolean);
        const chofer = r.valor ? persona(r.valor) : null;
        if (ts.length < 2) { avisos.push(fila + ': la pareja de cobertura necesita dos tiendas que existan en la hoja Tiendas.'); return; }
        K.parejas.push({ tiendas: ts.map((t) => t.clave), chofer: chofer ? chofer.id : null });
      } else if (tipo === 'puede_cubrir' || tipo === 'pernocta') {
        const p = persona(r.sujeto);
        if (!p) { avisos.push(fila + ': no encuentro a "' + r.sujeto + '" en la Plantilla.'); return; }
        const m = tipo === 'puede_cubrir' ? K.puede : K.pernocta;
        if (!m.has(p.id)) m.set(p.id, new Set());
        // "*" = todas; "!Tienda" = menos esa (por ejemplo "*|!Zinacantepec").
        lista(r.valor || '*').forEach((t) => {
          if (t === '*' || normTexto(t) === 'TODAS') { m.get(p.id).add('*'); return; }
          const no = /^[!-]/.test(t);
          const ti = buscarTienda(K, no ? t.slice(1) : t);
          if (ti) m.get(p.id).add((no ? '!' : '') + ti.clave); else avisos.push(fila + ': la tienda "' + t.replace(/^[!-]/, '') + '" no está en la hoja Tiendas.');
        });
      } else if (tipo === 'relleno') {
        // Tiendas donde ciertas personas (por omisión, los comodines) pueden hacer turnos cortos para cuadrar sus horas.
        const ts = lista(r.sujeto).map((t) => buscarTienda(K, t)).filter(Boolean);
        if (!ts.length) { avisos.push(fila + ': la regla relleno necesita en sujeto las tiendas (separadas con |) que existan en la hoja Tiendas.'); return; }
        const quien = lista(r.valor || 'COMODINES');
        K.relleno.push({ tiendas: ts.map((t) => t.clave), quien: quien.map((q) => { const p = persona(q); return p ? p.id : 'AREA:' + normTexto(q); }) });
      } else if (tipo === 'rotacion') {
        const ps = lista(r.sujeto).map(persona).filter(Boolean);
        const t = buscarTienda(K, r.valor) || (ps[0] && ps[0].tiendaBase);
        if (ps.length !== 2 || !t) { avisos.push(fila + ': la rotación necesita dos personas y la tienda donde rotan.'); return; }
        K.rotaciones.push({ a: ps[0].id, b: ps[1].id, tienda: t.clave });
      } else if (tipo) {
        avisos.push(fila + ': el tipo de regla "' + r.tipo + '" no lo conozco. Usa descanso_fijo, pareja_cobertura, puede_cubrir, pernocta, rotacion o relleno.');
      }
    });
    personas.forEach((p) => {
      if (p.activo && p.fijo.size > p.descansos) avisos.push(p.nombre + ' tiene ' + p.fijo.size + ' descansos fijos pero solo le tocan ' + p.descansos + ' a la semana.');
    });
    return K;
  }

  function buscarTienda(K, nombre) {
    const k = normTexto(nombre);
    if (!k) return null;
    if (K.tiendas.has(k)) return K.tiendas.get(k);
    for (const t of K.tiendas.values()) if (k.includes(t.clave) || t.clave.includes(k)) return t;
    return null;
  }
  function turnoTienda(K, tienda, i) {
    const t = typeof tienda === 'string' ? buscarTienda(K, tienda) : tienda;
    return t ? t.dias[DIAS[i].cod] || null : null;
  }

  function infoClave(K, texto) {
    const n = normalizarClave(texto);
    const c = K.claves.get(n.texto);
    return c || null;
  }
  // Horas de una clave según el catálogo. Si no está, se estima (y la validación la marca).
  function horasDe(K, texto) {
    const c = infoClave(K, texto);
    if (c) return c.horas;
    const n = normalizarClave(texto);
    if (n.estado !== 'TRABAJA') return 0;
    const h = (n.fin - n.ini) / 60;
    return h >= 9 ? h - 1 : h;
  }
  function clavesConEntrada(K, ini) {
    return [...K.claves.values()].filter((c) => c.activa && c.estado === 'TRABAJA' && c.ini === ini);
  }

  const enLista = (s, tienda) => !!s && !s.has('!' + tienda) && (s.has('*') || s.has(tienda));
  const puedeCubrir = (K, id, tienda) => enLista(K.puede.get(id), tienda);
  const sePuedeQuedar = (K, id, tienda) => enLista(K.pernocta.get(id), tienda);
  // Tiendas donde la persona puede hacer turnos cortos de relleno para cuadrar sus horas.
  function tiendasRelleno(K, p) {
    const out = [];
    (K.relleno || []).forEach((r) => {
      if (r.quien.some((q) => q === p.id || q === 'AREA:' + p.areaKey)) r.tiendas.forEach((t) => { if (!out.includes(t)) out.push(t); });
    });
    return out;
  }
  // Opciones de relleno en un día: cualquier clave activa que quepa en el horario de la tienda.
  function opcionesRelleno(K, p, i) {
    const out = [];
    tiendasRelleno(K, p).forEach((tk) => {
      const t = turnoTienda(K, tk, i);
      if (!t) return;
      K.claves.forEach((c) => {
        if (c.activa && c.estado === 'TRABAJA' && c.ini >= t.abre && c.fin <= t.cierra) out.push({ clave: c.texto, horas: c.horas, costo: 1.5, sucursal: K.tiendas.get(tk).nombre });
      });
    });
    return out;
  }
  const parejaDe = (K, tienda) => K.parejas.find((pr) => pr.tiendas.includes(tienda)) || null;
  const esComodin = (p) => p.areaKey === 'COMODINES';

  // =====================================================================
  // Semana: filas (como la hoja Dias) y celdas
  // =====================================================================

  function fechasDe(inicio) { return DIAS.map((_, i) => sumarDias(inicio, i)); }

  // Índice id -> [fila de cada día] (primera fila de ese día) y duplicados.
  function indexar(semana) {
    const idx = {};
    if (!semana) return idx;
    const pos = new Map(semana.fechas.map((f, i) => [f, i]));
    semana.filas.forEach((r) => {
      const i = pos.get(r.fecha);
      if (i == null) return;
      if (!idx[r.nomina]) idx[r.nomina] = Array(7).fill(null);
      if (!idx[r.nomina][i]) idx[r.nomina][i] = r;
    });
    return idx;
  }

  function celda(semana, id, i) {
    const f = semana.fechas[i];
    return semana.filas.find((r) => r.nomina === id && r.fecha === f) || null;
  }

  // Cambia una celda y regresa cómo estaba y cómo quedó (para el registro de cambios).
  function cambiarCelda(semana, id, i, nuevo) {
    const f = semana.fechas[i];
    const antes = celda(semana, id, i);
    const desc = (r) => (r ? (r.tipo === 'TRABAJA' ? r.clave + (r.sucursal ? ' · ' + r.sucursal : '') : TIPOS[r.tipo] ? TIPOS[r.tipo].corto + (esBloqueo(r.tipo) && r.clave ? ' (' + r.clave + ')' : '') : r.tipo) : '(vacío)');
    const txtAntes = desc(antes);
    const fila = Object.assign({ nomina: id, fecha: f, tipo: 'TRABAJA', clave: '', sucursal: '', nota: '' }, antes || {}, nuevo, { origen: 'manual' });
    if (esDescanso(fila.tipo)) { fila.clave = fila.tipo; fila.sucursal = ''; }
    delete fila.alerta;
    // Se reemplaza en su lugar para no desordenar el bloque de la persona.
    const k = semana.filas.findIndex((r) => r.nomina === id && r.fecha === f);
    semana.filas = semana.filas.filter((r, j) => j === k || !(r.nomina === id && r.fecha === f));
    if (k >= 0) semana.filas[semana.filas.findIndex((r) => r.nomina === id && r.fecha === f)] = fila;
    else {
      const ult = semana.filas.map((r) => r.nomina).lastIndexOf(id);
      semana.filas.splice(ult + 1, 0, fila);
      semana.filas.sort((a, b) => (a.nomina === b.nomina && a.nomina === id ? (a.fecha < b.fecha ? -1 : 1) : 0));
    }
    return { antes: txtAntes, despues: desc(fila), fila };
  }

  // =====================================================================
  // Generador
  // =====================================================================

  function numeroSemana(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return Math.floor(Date.UTC(y, m - 1, d) / (7 * 86400000));
  }

  function tipoNovedad(t) {
    const s = normTexto(t);
    if (/^VAC/.test(s)) return 'VAC';
    if (/^INC/.test(s)) return 'INC';
    if (/^COM/.test(s)) return 'COM';
    if (/^PTT|TIEMPO POR TIEMPO|^PAGO/.test(s)) return 'PTT';
    if (/^FEST|^NP/.test(s)) return 'FESTIVO';
    return null;
  }

  // Novedades de la hoja Novedades que caen en la semana.
  function novedadesDeSemana(K, novedades, inicio) {
    const fechas = fechasDe(inicio);
    const out = { bloqueos: [], festivos: [], avisos: [] };
    (novedades || []).forEach((n, k) => {
      const tipo = tipoNovedad(n.tipo);
      const desde = parseFecha(n.desde), hasta = parseFecha(n.hasta) || desde;
      if (!tipo || !desde) { out.avisos.push('Novedades, fila ' + (k + 2) + ': falta el tipo (vacaciones, incapacidad, comisión, PTT o festivo) o la fecha de inicio.'); return; }
      const dias = fechas.filter((f) => f >= desde && f <= hasta);
      if (!dias.length) return;
      if (tipo === 'FESTIVO') { dias.forEach((f) => out.festivos.push({ fecha: f, nota: n.nota || 'Día festivo' })); return; }
      const p = K.porId.get(normNomina(n.nomina)) || K.personas.find((x) => normTexto(x.nombre) === normTexto(n.nomina));
      if (!p) { out.avisos.push('Novedades, fila ' + (k + 2) + ': no encuentro la nómina "' + n.nomina + '" en la Plantilla.'); return; }
      out.bloqueos.push({ id: p.id, tipo, fechas: dias, sucursal: n.sucursal || '', nota: n.nota || '' });
    });
    return out;
  }

  // Quién de la pareja de rotación abrió la semana anterior (null si no se sabe).
  function quienAbrio(K, rot, anterior) {
    if (!anterior) return null;
    const idx = indexar(anterior);
    const cuenta = (id) => (idx[id] || []).filter((r, i) => {
      if (!r || r.tipo !== 'TRABAJA') return false;
      const t = turnoTienda(K, rot.tienda, i);
      const c = normalizarClave(r.clave);
      return t && c.estado === 'TRABAJA' && c.ini <= t.abre;
    }).length;
    const a = cuenta(rot.a), b = cuenta(rot.b);
    if (a === b) return null;
    return a > b ? rot.a : rot.b;
  }
  function abreEstaSemana(K, rot, anterior, inicio) {
    const previo = quienAbrio(K, rot, anterior);
    if (previo) return { abre: previo === rot.a ? rot.b : rot.a, porHistorial: true };
    return { abre: numeroSemana(inicio) % 2 === 0 ? rot.a : rot.b, porHistorial: false };
  }

  function combinaciones(arr, k) {
    const out = [];
    const rec = (start, acc) => {
      if (acc.length === k) { out.push(acc.slice()); return; }
      for (let i = start; i < arr.length; i++) { acc.push(arr[i]); rec(i + 1, acc); acc.pop(); }
    };
    if (k <= 0) return [[]];
    rec(0, []);
    return out;
  }

  // Busca claves (misma hora de entrada que la asignada) para que la semana sume la jornada.
  // dias: [{ fija: true, horas } | { opciones: [{clave, horas, costo}] } | null]
  function cuadrarHoras(dias, meta) {
    const M = Math.round(meta * 2);
    // Desempate: se prefieren días parejos (6 × 8 antes que 10 + 10 + 6…).
    const prom = meta / Math.max(1, dias.filter(Boolean).length);
    let estados = new Map([[0, { costo: 0, elec: [] }]]);
    dias.forEach((d) => {
      const sig = new Map();
      const opts = !d ? [{ horas: 0, costo: 0, clave: null }] : d.fija ? [{ horas: d.horas, costo: 0, clave: null }] : d.opciones;
      estados.forEach((e, s) => {
        opts.forEach((o) => {
          const s2 = s + Math.round(o.horas * 2);
          if (s2 > M + 40) return;
          const c = e.costo + o.costo + (d && !d.fija ? 0.3 * Math.abs(o.horas - prom) : 0);
          const prev = sig.get(s2);
          if (!prev || c < prev.costo) sig.set(s2, { costo: c, elec: e.elec.concat([o.clave == null ? null : o]) });
        });
      });
      estados = sig;
    });
    const r = estados.get(M);
    return r ? { ok: true, costo: r.costo, elec: r.elec.map((o) => (o ? o.clave : null)), opciones: r.elec } : { ok: false };
  }

  function opcionesMismaEntrada(K, clave, t, exigeCierre) {
    const n = normalizarClave(clave);
    if (n.estado !== 'TRABAJA') return [{ clave, horas: horasDe(K, clave), costo: 0 }];
    const ops = clavesConEntrada(K, n.ini).filter((c) => (!t || c.fin <= Math.max(t.cierra, n.fin)) && (!exigeCierre || !t || c.fin >= t.cierra));
    const out = ops.map((c) => ({ clave: c.texto, horas: c.horas, costo: c.texto === n.texto ? 0 : 1 }));
    if (!out.some((o) => o.clave === n.texto)) out.unshift({ clave: n.texto, horas: horasDe(K, clave), costo: 0 });
    return out;
  }

  function claveRol(t, rol) { return rol === 'cierre' ? t.ci.texto : t.ap.texto; }

  /*
   * Arma la propuesta de la semana.
   * op = { inicio, anterior (semana o null), novedades (filas de la hoja Novedades), festivos: [fechas extra] }
   * Orden: bloqueos → festivos → descansos fijos → descansos restantes → rotación → huecos → horas.
   * Lo que no puede resolver lo deja con `alerta` (celda) o en `pendientes` (tienda sin abrir). Nunca inventa.
   */
  function generarSemana(K, op) {
    const inicio = inicioSemana(parseFecha(op.inicio));
    const fechas = fechasDe(inicio);
    const nov = novedadesDeSemana(K, op.novedades, inicio);
    const festivos = new Set(nov.festivos.map((f) => f.fecha).concat((op.festivos || []).map(parseFecha).filter(Boolean)));
    const activos = K.personas.filter((p) => p.activo);
    const ant = indexar(op.anterior);
    const grid = {};
    activos.forEach((p) => { grid[p.id] = Array(7).fill(null); });
    const alertas = nov.avisos.map((t) => ({ texto: t }));
    const pendientes = [];
    const notas = [];
    const finde = (i) => FIN_DE_SEMANA.has(DIAS[i].cod);

    const descanso = (i, nota) => ({ tipo: festivos.has(fechas[i]) ? 'NP' : 'D', clave: festivos.has(fechas[i]) ? 'NP' : 'D', sucursal: '', nota, origen: 'descanso' });

    // Rol que tuvo la persona la semana pasada ese día (apertura / cierre) en su tienda.
    function rolPrevio(p, i) {
      const r = ant[p.id] && ant[p.id][i];
      const t = turnoTienda(K, p.tiendaBase, i);
      if (!r || r.tipo !== 'TRABAJA' || !t) return null;
      const c = normalizarClave(r.clave);
      if (c.estado !== 'TRABAJA') return null;
      if (c.ini <= t.abre) return 'apertura';
      if (c.fin >= t.cierra) return 'cierre';
      return null;
    }
    // Personal fijo por tienda (sin comodines: ellos se mueven).
    const staff = {};
    activos.forEach((p) => {
      if (!p.tiendaBase) return;
      (staff[p.tiendaBase.clave] = staff[p.tiendaBase.clave] || []).push(p);
    });
    const fijos = (tk) => (staff[tk] || []).filter((p) => !esComodin(p));
    // ¿Con puras claves de apertura (o de cierre) le alcanza para su jornada con sus descansos?
    function rolCabe(p, rol) {
      const fijosI = [...p.fijo].map(idxDia);
      const libresI = DIAS.map((_, i) => i).filter((i) => !fijosI.includes(i));
      return combinaciones(libresI, Math.max(0, p.descansos - fijosI.length)).some((resto) => cuadrarHoras(DIAS.map((_, i) => {
        if (fijosI.includes(i) || resto.includes(i)) return null;
        const t = turnoTienda(K, p.tiendaBase, i);
        return t ? { opciones: opcionesMismaEntrada(K, claveRol(t, rol), t, rol === 'cierre') } : { fija: true, horas: 0 };
      }), p.jornada).ok);
    }
    const rolDefecto = {};
    Object.keys(staff).forEach((tk) => {
      const gente = staff[tk].slice().sort((a, b) => (a.id < b.id ? -1 : 1));
      const dosTurnos = DIAS.some((_, i) => { const t = turnoTienda(K, tk, i); return t && t.dosTurnos; });
      // Rol preferido sin historial: el que le cuadra en horas; si le cuadran los dos, se reparte.
      const pref = {};
      if (dosTurnos) {
        const flex = [];
        gente.forEach((p) => {
          const ap = rolCabe(p, 'apertura'), ci = rolCabe(p, 'cierre');
          if (ap && !ci) pref[p.id] = 'apertura';
          else if (ci && !ap) pref[p.id] = 'cierre';
          else flex.push(p);
        });
        flex.forEach((p) => {
          const cierres = Object.values(pref).filter((x) => x === 'cierre').length;
          const aperturas = Object.values(pref).filter((x) => x === 'apertura').length;
          pref[p.id] = cierres < aperturas ? 'cierre' : 'apertura';
        });
      }
      gente.forEach((p) => {
        rolDefecto[p.id] = DIAS.map((_, i) => {
          const t = turnoTienda(K, p.tiendaBase, i);
          if (!t || !t.dosTurnos) return 'apertura';
          const r = rolPrevio(p, i);
          if (r) return r;
          const roles = DIAS.map((__, j) => rolPrevio(p, j)).filter(Boolean);
          const cierres = roles.filter((x) => x === 'cierre').length;
          if (roles.length) return cierres > roles.length / 2 ? 'cierre' : 'apertura';
          return pref[p.id] || 'apertura';
        });
      });
    });
    function claveDefecto(p, i) {
      const t = turnoTienda(K, p.tiendaBase, i);
      const r = ant[p.id] && ant[p.id][i];
      // Si la semana pasada trabajó ese día en su tienda con una clave del catálogo, se repite
      // (así cada quien conserva su turno de siempre: 09:00-18:00, 15:30-21:30, 08:00-14:00…).
      if (r && r.tipo === 'TRABAJA' && buscarTienda(K, r.sucursal) === p.tiendaBase && infoClave(K, r.clave) && infoClave(K, r.clave).activa && t) {
        const c = normalizarClave(r.clave);
        if (c.ini >= t.abre - 60 && c.fin <= t.cierra + 60) return c.texto;
      }
      if (t) return claveRol(t, rolDefecto[p.id] ? rolDefecto[p.id][i] : 'apertura');
      if (r && r.clave && r.tipo !== 'D' && r.tipo !== 'NP') return normalizarClave(r.clave).texto;
      return '';
    }

    // 1 · Bloqueos duros
    nov.bloqueos.forEach((b) => {
      const p = K.porId.get(b.id);
      if (!grid[b.id]) { alertas.push({ id: b.id, texto: p.nombre + ' está dado de baja; su novedad no se aplicó.' }); return; }
      b.fechas.forEach((f) => {
        const i = fechas.indexOf(f);
        grid[b.id][i] = { tipo: b.tipo, clave: claveDefecto(p, i), sucursal: b.tipo === 'COM' && b.sucursal ? b.sucursal : p.base, nota: b.nota || TIPOS[b.tipo].txt, origen: 'novedad' };
      });
    });

    // 2 y 3 · Festivos y descansos fijos (el descanso en día festivo sale como NP)
    activos.forEach((p) => p.fijo.forEach((cod) => {
      const i = idxDia(cod);
      const prev = grid[p.id][i];
      grid[p.id][i] = descanso(i, 'Descanso fijo' + (prev ? ' (dentro de ' + TIPOS[prev.tipo].txt.toLowerCase() + ')' : ''));
    }));

    // Descansos que faltan: se buscan los días que mejor reparten los huecos y cuadran las horas.
    const carga = Array(7).fill(0); // huecos de tienda que dejan los descansos de cada día
    const descTienda = {}; // tienda -> descansos por día
    const descCubre = Array(7).fill(0); // descansos de quienes pueden cubrir otras tiendas
    const diasPareja = {}; // índice de pareja -> días que descansa
    const libres = (p) => DIAS.map((_, i) => i).filter((i) => !grid[p.id][i]);
    const prevDesc = (p) => new Set(DIAS.map((_, i) => i).filter((i) => ant[p.id] && ant[p.id][i] && esDescanso(ant[p.id][i].tipo)));
    const faltanDesc = (p) => p.descansos - grid[p.id].filter((c) => c && esDescanso(c.tipo)).length;

    function horasPosibles(p, resto) {
      const dias = DIAS.map((_, i) => {
        const c = grid[p.id][i];
        if (resto.includes(i) || (c && esDescanso(c.tipo))) return null;
        if (c) return { fija: true, horas: horasDe(K, c.clave) };
        const t = turnoTienda(K, p.tiendaBase, i);
        const cl = claveDefecto(p, i);
        if (!cl) return { fija: true, horas: 0 };
        return { opciones: opcionesMismaEntrada(K, cl, t, false).concat(opcionesRelleno(K, p, i)) };
      });
      return cuadrarHoras(dias, p.jornada);
    }

    function costoCombo(p, combo, extra) {
      const h = horasPosibles(p, combo);
      let k = h.ok ? h.costo * 3 : 1000;
      const solo = p.tiendaBase && fijos(p.tiendaBase.clave).length === 1 && !esComodin(p);
      const prev = prevDesc(p);
      combo.forEach((i) => {
        if (solo) k += 10 * carga[i] + (finde(i) ? 4 : 0);
        else if (p.tiendaBase && !esComodin(p)) k += 6 * ((descTienda[p.tiendaBase.clave] || [])[i] || 0) + (finde(i) ? 3 : 0);
        if (esComodin(p) || K.puede.has(p.id)) k += 12 * carga[i] + 8 * descCubre[i];
        if (extra && extra.dias.has(i)) k += 60;
        if (extra && extra.choferNo && extra.choferNo.has(i)) k += 60;
        if (!prev.has(i)) k += 2;
        if (festivos.has(fechas[i])) k -= 2;
      });
      return k;
    }

    function ponerDescansos(p, combo, nota) {
      combo.forEach((i) => { grid[p.id][i] = descanso(i, nota); });
      const solo = p.tiendaBase && fijos(p.tiendaBase.clave).length === 1 && !esComodin(p);
      grid[p.id].forEach((c, i) => {
        if (!c || !esDescanso(c.tipo)) return;
        if (solo) carga[i]++;
        if (esComodin(p) || K.puede.has(p.id)) descCubre[i]++;
        if (p.tiendaBase) { const d = (descTienda[p.tiendaBase.clave] = descTienda[p.tiendaBase.clave] || Array(7).fill(0)); if (combo.includes(i)) d[i]++; }
      });
    }

    // Descanso cuando la persona ya no tiene días libres (todo bloqueado): se usa el día que descansó la semana pasada.
    function descansosEnBloqueo(p) {
      let falta = faltanDesc(p) - libres(p).length;
      if (falta <= 0) return;
      const prev = prevDesc(p);
      DIAS.forEach((_, i) => {
        const c = grid[p.id][i];
        if (falta > 0 && c && esBloqueo(c.tipo) && prev.has(i)) { grid[p.id][i] = descanso(i, 'Descanso (mismo día que la semana pasada, dentro de ' + TIPOS[c.tipo].txt.toLowerCase() + ')'); falta--; }
      });
      // Sin semana anterior: se propone el día que menos falta hace (entre semana) y se pide confirmarlo.
      const enBloqueo = DIAS.map((_, i) => i).filter((i) => grid[p.id][i] && esBloqueo(grid[p.id][i].tipo));
      // Se prefiere la combinación con la que le cuadran las horas (los días de novedad cuentan su horario regular).
      const horasSin = (combo) => DIAS.reduce((a, _, i) => a + (combo.includes(i) || !grid[p.id][i] || esDescanso(grid[p.id][i].tipo) ? 0 : horasDe(K, grid[p.id][i].clave)), 0);
      const combos = combinaciones(enBloqueo, Math.min(falta, enBloqueo.length))
        .map((c) => ({ c, k: (Math.abs(horasSin(c) - p.jornada) > 1e-9 ? 100 : 0) + c.filter(finde).length * 3 + c.reduce((a, i) => a + i, 0) * 0.01 }))
        .sort((a, b) => a.k - b.k);
      const orden = combos.length ? combos[0].c.slice() : [];
      const propuestos = [];
      while (falta > 0 && orden.length) {
        const i = orden.shift();
        const tipo = TIPOS[grid[p.id][i].tipo].txt.toLowerCase();
        grid[p.id][i] = descanso(i, 'Descanso propuesto dentro de ' + tipo + ': confírmalo');
        grid[p.id][i].alerta = 'No encontré qué día descansó la semana pasada. Confirma que su descanso sea este día.';
        propuestos.push(i);
        falta--;
      }
      if (propuestos.length) alertas.push({ id: p.id, aviso: true, texto: p.nombre + ': su ' + TIPOS[grid[p.id][propuestos[0]].tipo === 'NP' ? 'NP' : 'D'].txt.toLowerCase() + ' quedó el ' + propuestos.map((i) => titulo(DIAS[i].nombre).toLowerCase()).join(' y ') + ' dentro de su novedad. Confírmalo.' });
      if (falta > 0) alertas.push({ id: p.id, texto: p.nombre + ': no le queda día libre para ' + (falta === 1 ? 'su descanso' : falta + ' descansos') + '. Revisa el periodo de su novedad y marca a mano qué día descansa.' });
    }
    activos.forEach(descansosEnBloqueo);

    const hechos = new Set();
    const choferes = new Set(K.parejas.map((pr) => pr.chofer).filter(Boolean));
    // a) Tiendas en pareja: sus encargados descansan los mismos días.
    K.parejas.forEach((pr, kp) => {
      const miembros = activos.filter((p) => p.tiendaBase && pr.tiendas.includes(p.tiendaBase.clave) && !esComodin(p) && !choferes.has(p.id));
      // Descansan juntos los días que tienen en común (si uno tiene 2 y otro 1, comparten 1).
      const r = miembros.length ? Math.min(...miembros.map(faltanDesc)) : 0;
      if (miembros.length < 2 || r <= 0) return;
      const comunes = libres(miembros[0]).filter((i) => miembros.every((p) => !grid[p.id][i]));
      // Días en que el chofer no puede salir (descanso fijo o novedad): mejor no descansar ahí.
      // También cuando alguien de su tienda base ya descansa fijo o tiene novedad: el chofer se tendría que quedar.
      const ch = pr.chofer && grid[pr.chofer] ? K.porId.get(pr.chofer) : null;
      const companeros = ch && ch.tiendaBase ? activos.filter((p) => p !== ch && p.tiendaBase === ch.tiendaBase && !esComodin(p)) : [];
      const choferNo = new Set(ch ? DIAS.map((_, i) => i).filter((i) => grid[ch.id][i] || companeros.some((p) => grid[p.id][i])) : []);
      // Si el mismo chofer ya cubre otra pareja, esta no descansa esos días (no puede estar en dos viajes).
      K.parejas.forEach((otra, ko) => { if (ko !== kp && otra.chofer === pr.chofer && diasPareja[ko]) diasPareja[ko].forEach((i) => choferNo.add(i)); });
      let mejor = null;
      combinaciones(comunes, r).forEach((combo) => {
        const k = miembros.reduce((a, p) => a + costoCombo(p, combo, { dias: new Set(), choferNo }), 0);
        if (!mejor || k < mejor.k) mejor = { k, combo };
      });
      if (!mejor) return;
      miembros.forEach((p) => { ponerDescansos(p, mejor.combo, 'Descanso (descansa junto con ' + miembros.filter((x) => x !== p).map((x) => x.base).join(', ') + ')'); if (faltanDesc(p) <= 0) hechos.add(p.id); });
      diasPareja[kp] = new Set(mejor.combo);
    });
    // b) Los demás: primero quien deja su tienda sola, luego el personal de tiendas grandes, al final comodines y choferes.
    const orden = activos.filter((p) => !hechos.has(p.id)).sort((a, b) => {
      const grupo = (p) => (choferes.has(p.id) ? 3 : esComodin(p) || K.puede.has(p.id) ? 2 : p.tiendaBase && fijos(p.tiendaBase.clave).length === 1 ? 0 : 1);
      return grupo(a) - grupo(b) || libres(a).length - libres(b).length || (a.id < b.id ? -1 : 1);
    });
    orden.forEach((p) => {
      const r = Math.min(faltanDesc(p), libres(p).length);
      if (r <= 0) return;
      // El chofer, y quien comparte tienda con él, no descansan los días que sale a cubrir la pareja.
      const conChofer = choferes.has(p.id) || (p.tiendaBase && [...choferes].some((c) => K.porId.get(c).tiendaBase === p.tiendaBase));
      const extra = conChofer ? { dias: new Set(Object.values(diasPareja).flatMap((x) => [...x])) } : null;
      let mejor = null;
      combinaciones(libres(p), r).forEach((combo) => {
        const k = costoCombo(p, combo, extra);
        if (!mejor || k < mejor.k) mejor = { k, combo };
      });
      ponerDescansos(p, mejor.combo, 'Descanso');
    });

    // Días de trabajo con su clave normal.
    activos.forEach((p) => DIAS.forEach((_, i) => {
      if (grid[p.id][i]) return;
      const cl = claveDefecto(p, i);
      grid[p.id][i] = { tipo: 'TRABAJA', clave: cl, sucursal: p.base, nota: '', origen: 'auto', rol: rolDefecto[p.id] ? rolDefecto[p.id][i] : 'apertura' };
      if (!cl) grid[p.id][i].alerta = 'No sé qué clave darle: su tienda base "' + p.base + '" no está en la hoja Tiendas para este día.';
    }));

    // 4 · Rotación de apertura y cierre
    K.rotaciones.forEach((rot) => {
      if (!grid[rot.a] || !grid[rot.b]) return;
      const quien = abreEstaSemana(K, rot, op.anterior, inicio);
      const abre = quien.abre, cierra = abre === rot.a ? rot.b : rot.a;
      const nom = (id) => nombreCorto(K.porId.get(id));
      notas.push('Rotación: esta semana abre ' + nom(abre) + ' y cierra ' + nom(cierra) + (quien.porHistorial ? ' (la semana pasada fue al revés).' : ' (no encontré la semana pasada; se tomó por número de semana).'));
      // Claves propias de la pareja: las que usaron la semana pasada para abrir y para cerrar cada día
      // (por ejemplo 08:00-17:00 y 12:30-21:30). Si no hay historial, las de la hoja Tiendas.
      const propias = DIAS.map((_, i) => {
        const t = turnoTienda(K, rot.tienda, i);
        const out = { ap: null, ci: null };
        if (!t) return out;
        [rot.a, rot.b].forEach((id) => {
          const r = ant[id] && ant[id][i];
          if (!r || r.tipo !== 'TRABAJA' || buscarTienda(K, r.sucursal) !== K.tiendas.get(rot.tienda) || !infoClave(K, r.clave)) return;
          const c = normalizarClave(r.clave);
          if (c.ini <= t.abre) out.ap = c.texto; else out.ci = c.texto;
        });
        return out;
      });
      DIAS.forEach((_, i) => {
        const t = turnoTienda(K, rot.tienda, i);
        if (!t) return;
        const clAp = propias[i].ap || t.ap.texto, clCi = propias[i].ci || t.ci.texto;
        const ca = grid[abre][i], cc = grid[cierra][i];
        const trabaja = (c) => c && c.tipo === 'TRABAJA' && c.origen === 'auto';
        const abreTrabaja = trabaja(ca), cierraTrabaja = cc && cc.tipo === 'TRABAJA';
        if (trabaja(cc)) Object.assign(cc, { clave: clCi, rol: 'cierre', origen: 'rotacion', nota: 'Rotación: cierra esta semana' });
        if (abreTrabaja) {
          if (cierraTrabaja) Object.assign(ca, { clave: clAp, rol: 'apertura', origen: 'rotacion', nota: 'Rotación: abre esta semana' });
          else Object.assign(ca, { clave: clCi, rol: 'cierre', origen: 'rotacion', nota: 'Rotación: se recorre al cierre porque ' + nom(cierra) + ' no está' });
        }
      });
    });

    // 5 · Cobertura de tiendas
    const enTienda = (tk, i, sin) => activos.filter((p) => p.id !== sin && grid[p.id][i].tipo === 'TRABAJA' && (buscarTienda(K, grid[p.id][i].sucursal) || {}).clave === tk);
    function cubre(tk, i, sin) {
      const t = turnoTienda(K, tk, i);
      if (!t) return { apertura: true, cierre: true };
      const cs = enTienda(tk, i, sin).map((p) => normalizarClave(grid[p.id][i].clave)).filter((c) => c.estado === 'TRABAJA');
      return {
        apertura: cs.some((c) => c.ini <= t.abre && c.fin > t.abre),
        cierre: !t.dosTurnos || cs.some((c) => c.fin >= t.cierra && c.ini < t.cierra),
      };
    }
    const cierresDe = (id) => grid[id].filter((c) => c && c.rol === 'cierre').length;
    // Tiendas con varias personas: si falta apertura o cierre, se cambia de turno a alguien de la misma tienda.
    K.tiendas.forEach((tienda, tk) => DIAS.forEach((_, i) => {
      const t = turnoTienda(K, tk, i);
      if (!t || !t.dosTurnos) return;
      const c = cubre(tk, i);
      if (c.apertura && c.cierre) return;
      const falta = c.cierre ? 'apertura' : 'cierre';
      const otros = enTienda(tk, i).filter((p) => grid[p.id][i].origen === 'auto' && grid[p.id][i].rol !== falta);
      if (otros.length < 2) return;
      otros.sort((a, b) => (falta === 'cierre' ? cierresDe(a.id) - cierresDe(b.id) : cierresDe(b.id) - cierresDe(a.id)) || (a.id < b.id ? -1 : 1));
      const p = otros[0];
      Object.assign(grid[p.id][i], { clave: claveRol(t, falta), rol: falta, nota: 'Cambia a ' + falta + ' para que la tienda tenga ' + falta });
    }));

    const coberturas = {};
    // ¿El chofer de la pareja va ese día a alguna de sus tiendas?
    const choferVa = (pr, i) => !!pr.chofer && !!grid[pr.chofer] && grid[pr.chofer][i].tipo === 'TRABAJA' && pr.tiendas.includes((buscarTienda(K, grid[pr.chofer][i].sucursal) || {}).clave);
    const movible = (p, i) => {
      const c = grid[p.id][i];
      if (!c || c.tipo !== 'TRABAJA' || c.origen !== 'auto') return false;
      if (!p.tiendaBase) return true;
      const sin = cubre(p.tiendaBase.clave, i, p.id);
      return sin.apertura && sin.cierre;
    };
    const quienDescansa = (tk, i) => (staff[tk] || []).filter((p) => grid[p.id][i].tipo !== 'TRABAJA' || (buscarTienda(K, grid[p.id][i].sucursal) || {}).clave !== tk)
      .map((p) => nombreCorto(p) + ' ' + (grid[p.id][i].tipo === 'TRABAJA' ? 'está en ' + grid[p.id][i].sucursal : TIPOS[grid[p.id][i].tipo].txt.toLowerCase()));
    function asignar(p, tk, i, falta, nota) {
      const t = turnoTienda(K, tk, i);
      const tienda = K.tiendas.get(tk);
      const rol = falta.includes('apertura') ? 'apertura' : 'cierre';
      grid[p.id][i] = { tipo: 'TRABAJA', clave: claveRol(t, rol), sucursal: tienda.nombre, nota, origen: 'cobertura', rol };
      coberturas[p.id] = (coberturas[p.id] || 0) + 1;
    }
    // ¿Si cubre ese día con esa clave, todavía le cuadran las horas de la semana?
    function cuadraCon(p, i, clave, tk) {
      return cuadrarHoras(DIAS.map((_, j) => {
        const c = grid[p.id][j];
        if (esDescanso(c.tipo)) return null;
        if (j === i) return { opciones: opcionesMismaEntrada(K, clave, turnoTienda(K, tk, i), false) };
        if (c.tipo !== 'TRABAJA') return { fija: true, horas: horasDe(K, c.clave) };
        const t = turnoTienda(K, buscarTienda(K, c.sucursal), j);
        return { opciones: opcionesMismaEntrada(K, c.clave, t, false).concat(c.origen === 'auto' && movible(p, j) ? opcionesRelleno(K, p, j) : []) };
      }), p.jornada).ok;
    }
    const faltaDe = (tk, i) => { const c = cubre(tk, i); return [c.apertura ? null : 'apertura', c.cierre ? null : 'cierre'].filter(Boolean); };

    DIAS.forEach((_, i) => {
      // Primero las parejas (una sola salida con el chofer).
      K.parejas.forEach((pr) => {
        // El chofer va primero a la tienda que casi nadie más puede cubrir.
        const otrosPueden = (tk) => activos.filter((p) => p.id !== pr.chofer && puedeCubrir(K, p.id, tk) && movible(p, i)).length;
        const huecos = pr.tiendas.filter((tk) => faltaDe(tk, i).length).sort((a, b) => otrosPueden(a) - otrosPueden(b));
        if (!huecos.length) return;
        const chofer = pr.chofer ? activos.find((p) => p.id === pr.chofer) : null;
        // Si el chofer se tiene que quedar en su tienda, primero se busca quién lo releve ahí.
        if (chofer && !movible(chofer, i) && puedeCubrir(K, chofer.id, huecos[0]) && chofer.tiendaBase && grid[chofer.id][i].tipo === 'TRABAJA' && grid[chofer.id][i].origen === 'auto') {
          const tkb = chofer.tiendaBase.clave;
          const sin = cubre(tkb, i, chofer.id);
          const falta = [sin.apertura ? null : 'apertura', sin.cierre ? null : 'cierre'].filter(Boolean);
          const relevo = activos.filter((p) => p !== chofer && puedeCubrir(K, p.id, tkb) && movible(p, i) && cuadraCon(p, i, claveRol(turnoTienda(K, tkb, i), falta.includes('apertura') ? 'apertura' : 'cierre'), tkb))
            .sort((a, b) => (esComodin(b) - esComodin(a)) || ((coberturas[a.id] || 0) - (coberturas[b.id] || 0)) || (a.id < b.id ? -1 : 1))[0];
          if (falta.length && relevo) asignar(relevo, tkb, i, falta, 'Cubre ' + chofer.tiendaBase.nombre + ' para que ' + nombreCorto(chofer) + ' salga con la unidad (' + quienDescansa(tkb, i).filter((x) => !x.startsWith(nombreCorto(chofer))).join(', ') + ')');
        }
        if (chofer && movible(chofer, i) && puedeCubrir(K, chofer.id, huecos[0])) {
          asignar(chofer, huecos[0], i, faltaDe(huecos[0], i), 'Cubre ' + K.tiendas.get(huecos[0]).nombre + ' y lleva la unidad (' + quienDescansa(huecos[0], i).join(', ') + ')');
        }
      });
    });

    // Los demás huecos de la semana se acomodan juntos: se busca la combinación que cubre más tiendas
    // sin descuadrar las horas de nadie (un comodín de 2 descansos solo aguanta un día corto) y que
    // reparte las coberturas. Se prueba primero lo más prometedor y se corta si tarda demasiado.
    const huecos = [];
    DIAS.forEach((_, i) => K.tiendas.forEach((t, tk) => { if (faltaDe(tk, i).length) huecos.push({ tk, i }); }));
    huecos.forEach((h) => {
      const pr = parejaDe(K, h.tk);
      h.base = activos.filter((p) => puedeCubrir(K, p.id, h.tk) && (!pr || choferVa(pr, h.i) || sePuedeQuedar(K, p.id, h.tk)));
    });
    huecos.sort((x, y) => x.base.length - y.base.length || x.i - y.i);
    const plan = [];
    let mejor = null, nodos = 0;
    function buscar(k, costo) {
      if ((mejor && costo >= mejor.costo) || ++nodos > 6000) return;
      if (k === huecos.length) { mejor = { costo, plan: plan.slice() }; return; }
      const h = huecos[k];
      const falta = faltaDe(h.tk, h.i);
      if (!falta.length) { buscar(k + 1, costo); return; }
      const t = turnoTienda(K, h.tk, h.i);
      const cl = claveRol(t, falta.includes('apertura') ? 'apertura' : 'cierre');
      const ops = h.base.filter((p) => movible(p, h.i) && cuadraCon(p, h.i, cl, h.tk))
        .sort((x, y) => (esComodin(y) - esComodin(x)) || ((coberturas[x.id] || 0) - (coberturas[y.id] || 0)) || (x.id < y.id ? -1 : 1));
      for (const p of ops) {
        const previo = grid[p.id][h.i], cuenta = coberturas[p.id] || 0;
        asignar(p, h.tk, h.i, falta, '');
        plan.push({ id: p.id, tk: h.tk, i: h.i });
        buscar(k + 1, costo + 1 + 2 * cuenta + (esComodin(p) ? 0 : 3));
        plan.pop();
        grid[p.id][h.i] = previo;
        coberturas[p.id] = cuenta;
      }
      buscar(k + 1, costo + 1000); // si nadie puede, se deja en rojo
    }
    buscar(0, 0);
    (mejor ? mejor.plan : []).slice().sort((x, y) => x.i - y.i).forEach((a) => {
      const falta = faltaDe(a.tk, a.i);
      if (!falta.length) return;
      const p = K.porId.get(a.id);
      const pr = parejaDe(K, a.tk);
      const tienda = K.tiendas.get(a.tk);
      const como = pr ? (choferVa(pr, a.i) ? ', va y regresa en la unidad con ' + nombreCorto(K.porId.get(pr.chofer)) : ', se queda a dormir') : '';
      asignar(p, a.tk, a.i, falta, 'Cubre ' + tienda.nombre + como + ' (' + quienDescansa(a.tk, a.i).join(', ') + ')');
    });

    DIAS.forEach((_, i) => {
      K.tiendas.forEach((tienda, tk) => {
        const falta = faltaDe(tk, i);
        if (!falta.length) return;
        const pr = parejaDe(K, tk);
        const chofer = pr && pr.chofer ? K.porId.get(pr.chofer) : null;
        const motivo = 'Nadie libre para cubrirla' + (quienDescansa(tk, i).length ? ': ' + quienDescansa(tk, i).join(', ') : '') +
          (pr ? '. Es tienda foránea: solo pueden ir quienes se quedan a dormir o con la unidad de ' + (chofer ? nombreCorto(chofer) : 'su chofer') + '.' : '. Revisa quién tiene permiso de cubrirla en la hoja Reglas (puede_cubrir), o si a los comodines todavía les cuadran las horas.');
        pendientes.push({ tienda: tienda.nombre, i, fecha: fechas[i], falta, motivo });
      });
    });

    // 6 · Horas: se ajustan claves con la misma entrada para cerrar la jornada.
    function diasHoras(p) {
      return DIAS.map((_, i) => {
        const c = grid[p.id][i];
        if (esDescanso(c.tipo)) return null;
        // Días de novedad: llevan su horario regular, que se elige (misma entrada) para cerrar su jornada.
        if (esBloqueo(c.tipo) && c.origen === 'novedad') return { opciones: opcionesMismaEntrada(K, c.clave, turnoTienda(K, p.tiendaBase, i), false) };
        if (c.tipo !== 'TRABAJA' || c.origen === 'manual') return { fija: true, horas: horasDe(K, c.clave) };
        const tk = (buscarTienda(K, c.sucursal) || {}).clave;
        const t = tk ? turnoTienda(K, tk, i) : null;
        const soloCierre = t && t.dosTurnos && !cubre(tk, i, p.id).cierre;
        return { opciones: opcionesMismaEntrada(K, c.clave, t, !!soloCierre).concat(c.origen === 'auto' && movible(p, i) ? opcionesRelleno(K, p, i) : []) };
      });
    }
    const cuadra = (p) => cuadrarHoras(diasHoras(p), p.jornada);
    // Reparación: si a alguien no le cuadran las horas por una cobertura, se le pasa esa cobertura
    // a otra persona con permiso a la que sí le cuadren, y él regresa a su tienda.
    function repararCoberturas(p) {
      for (let i = 0; i < 7; i++) {
        const c = grid[p.id][i];
        if (c.origen !== 'cobertura') continue;
        const tk = (buscarTienda(K, c.sucursal) || {}).clave;
        const pr = parejaDe(K, tk);
        if (pr && pr.chofer === p.id) continue; // el chofer no se cambia: lleva la unidad
        const propio = Object.assign({}, c);
        const cl = claveDefecto(p, i);
        grid[p.id][i] = { tipo: 'TRABAJA', clave: cl, sucursal: p.base, nota: '', origen: 'auto', rol: rolDefecto[p.id] ? rolDefecto[p.id][i] : 'apertura' };
        const otros = activos.filter((q) => q !== p && puedeCubrir(K, q.id, tk) && movible(q, i) && (!pr || choferVa(pr, i) || sePuedeQuedar(K, q.id, tk)))
          .sort((a, b) => (esComodin(b) - esComodin(a)) || ((coberturas[a.id] || 0) - (coberturas[b.id] || 0)) || (a.id < b.id ? -1 : 1));
        const okP = cl && cuadra(p).ok;
        let hecho = false;
        if (okP) {
          for (const q of otros) {
            const previo = grid[q.id][i];
            grid[q.id][i] = Object.assign({}, propio, { nota: propio.nota });
            if (cuadra(q).ok) { coberturas[q.id] = (coberturas[q.id] || 0) + 1; coberturas[p.id]--; hecho = true; break; }
            grid[q.id][i] = previo;
          }
        }
        if (hecho) return true;
        grid[p.id][i] = propio;
      }
      return false;
    }
    activos.forEach((p) => { if (!cuadra(p).ok) repararCoberturas(p); });
    activos.forEach((p) => {
      const r = cuadra(p);
      const total = DIAS.reduce((a, _, i) => a + (esDescanso(grid[p.id][i].tipo) ? 0 : horasDe(K, grid[p.id][i].clave)), 0);
      if (r.ok) {
        r.opciones.forEach((o, i) => {
          if (!o) return;
          const c = grid[p.id][i];
          if (o.sucursal && o.sucursal !== c.sucursal) {
            Object.assign(c, { clave: o.clave, sucursal: o.sucursal, origen: 'relleno', rol: '', nota: 'Turno corto en ' + o.sucursal + ' para cerrar sus ' + p.jornada + ' h' });
          } else if (o.clave && o.clave !== c.clave) {
            const antes = c.clave;
            c.clave = o.clave;
            c.nota = (c.nota ? c.nota + '. ' : '') + 'Clave ajustada de ' + antes + ' para cerrar ' + p.jornada + ' h';
          }
        });
      } else {
        const dif = total - p.jornada;
        alertas.push({ id: p.id, texto: p.nombre + ': trae ' + total + ' h y su jornada es de ' + p.jornada + ' h (' + (dif > 0 ? 'sobran ' : 'faltan ') + Math.abs(dif) + ' h). No encontré claves con la misma hora de entrada que lo cuadren; ajústalo a mano.' });
      }
    });

    const filas = [];
    activos.forEach((p) => DIAS.forEach((_, i) => {
      const c = grid[p.id][i];
      const f = { nomina: p.id, fecha: fechas[i], tipo: c.tipo, clave: c.clave || '', sucursal: c.sucursal || '', nota: c.nota || '', origen: c.origen, rol: c.rol || '' };
      if (c.alerta) f.alerta = c.alerta;
      filas.push(f);
    }));
    alertas.forEach((a) => {
      if (a.id == null) return;
      filas.filter((f) => f.nomina === a.id).forEach((f) => { if (!f.alerta && f.tipo === 'TRABAJA') f.alertaPersona = a.texto; });
    });
    return { id: inicio, inicio, fechas, filas, pendientes, alertas, notas, festivos: [...festivos].sort(), estado: 'borrador' };
  }

  // =====================================================================
  // Validación: los nueve criterios
  // =====================================================================

  const CRITERIOS = [
    { n: 1, titulo: 'Cada tienda abre los siete días con alguien que entra a primera hora' },
    { n: 2, titulo: 'Centro de Color (y toda tienda de dos turnos) tiene apertura y cierre todos los días' },
    { n: 3, titulo: 'Siete filas por persona, ni una más ni una menos' },
    { n: 4, titulo: 'El bloque de cada persona empieza en jueves' },
    { n: 5, titulo: 'Todas las claves existen en la hoja Claves' },
    { n: 6, titulo: 'Cada quien tiene los descansos que le tocan' },
    { n: 7, titulo: 'Las horas de la semana cuadran con su jornada' },
    { n: 8, titulo: 'Se respetan los descansos fijos' },
    { n: 9, titulo: 'Nadie está en dos tiendas el mismo día' },
  ];

  function horasSemana(K, semana, id) {
    const idx = indexar(semana)[id] || [];
    return idx.reduce((a, r) => a + (r && !esDescanso(r.tipo) ? horasDe(K, r.clave) : 0), 0);
  }

  function validarSemana(K, semana) {
    const det = {};
    CRITERIOS.forEach((c) => { det[c.n] = []; });
    const nom = (id) => (K.porId.get(id) ? K.porId.get(id).nombre : id);
    const diaTxt = (i) => titulo(DIAS[i].nombre) + ' ' + fechaCorta(semana.fechas[i]);
    const activos = K.personas.filter((p) => p.activo);
    const pos = new Map(semana.fechas.map((f, i) => [f, i]));
    const porPersona = {};
    semana.filas.forEach((r) => { (porPersona[r.nomina] = porPersona[r.nomina] || []).push(r); });
    const idx = indexar(semana);

    // 1 y 2 · Aperturas y cierres
    K.tiendas.forEach((t, tk) => DIAS.forEach((_, i) => {
      const td = t.dias[DIAS[i].cod];
      if (!td) return;
      const cs = semana.filas.filter((r) => r.fecha === semana.fechas[i] && r.tipo === 'TRABAJA' && (buscarTienda(K, r.sucursal) || {}).clave === tk)
        .map((r) => normalizarClave(r.clave)).filter((c) => c.estado === 'TRABAJA');
      if (!cs.some((c) => c.ini <= td.abre && c.fin > td.abre)) {
        det[1].push({ tienda: t.nombre, i, texto: t.nombre + ' · ' + diaTxt(i) + ': ' + (cs.length ? 'hay gente, pero nadie entra a las ' + aHora(td.abre) + '. La tienda no abre.' : 'no hay nadie asignado.') });
      }
      if (td.dosTurnos && !cs.some((c) => c.fin >= td.cierra && c.ini < td.cierra)) {
        det[2].push({ tienda: t.nombre, i, texto: t.nombre + ' · ' + diaTxt(i) + ': nadie se queda al cierre de las ' + aHora(td.cierra) + '.' });
      }
    }));

    // 3 y 4 · Filas y bloques
    if (diaSemana(semana.inicio) !== 4) det[4].push({ texto: 'La semana empieza el ' + titulo(nombreDiaDe(semana.inicio)) + ' ' + fechaCorta(semana.inicio) + '; tiene que empezar en jueves.' });
    activos.forEach((p) => {
      const fs = porPersona[p.id] || [];
      const fuera = fs.filter((r) => !pos.has(r.fecha));
      const n = fs.length;
      if (n !== 7) det[3].push({ id: p.id, texto: p.nombre + ' tiene ' + n + ' fila' + (n === 1 ? '' : 's') + (n < 7 ? '; le faltan ' + (7 - n) + '.' : '; le sobran ' + (n - 7) + '.') });
      else if (fuera.length) det[3].push({ id: p.id, texto: p.nombre + ' tiene filas con fechas fuera de la semana (' + fuera.map((r) => r.fecha).join(', ') + ').' });
      const faltan = semana.fechas.filter((f) => !fs.some((r) => r.fecha === f));
      if (faltan.length && n >= 7) det[3].push({ id: p.id, texto: p.nombre + ' no tiene fila para ' + faltan.map((f) => diaTxt(pos.get(f))).join(', ') + '.' });
      if (fs.length && fs[0].fecha !== semana.inicio) det[4].push({ id: p.id, texto: p.nombre + ': su primera fila es del ' + titulo(nombreDiaDe(fs[0].fecha)) + ' ' + fechaCorta(fs[0].fecha) + '; GIRHA la rechaza si no empieza en jueves.' });
    });
    Object.keys(porPersona).forEach((id) => { if (!K.porId.has(id)) det[3].push({ id, texto: 'Hay filas de la nómina ' + id + ', que no está en la Plantilla.' }); });

    // 5 · Claves
    const dYnp = { D: infoClave(K, 'D'), NP: infoClave(K, 'NP') };
    semana.filas.forEach((r) => {
      const i = pos.get(r.fecha);
      if (i == null) return;
      const quien = nom(r.nomina) + ' · ' + diaTxt(i);
      if (esDescanso(r.tipo)) {
        if (!dYnp[r.tipo]) det[5].push({ id: r.nomina, i, texto: quien + ': la clave "' + r.tipo + '" no está en la hoja Claves. Agrégala.' });
        return;
      }
      const c = infoClave(K, r.clave);
      if (!r.clave) det[5].push({ id: r.nomina, i, texto: quien + ': no tiene clave de horario.' });
      else if (!c) {
        const n = normalizarClave(r.clave);
        const misma = n.estado === 'TRABAJA' ? clavesConEntrada(K, n.ini).map((x) => x.clave) : [];
        det[5].push({ id: r.nomina, i, texto: quien + ': la clave "' + r.clave + '" no está en el catálogo de GIRHA.' + (misma.length ? ' Con la misma entrada existen: ' + misma.join(', ') + '.' : ' Ninguna clave del catálogo entra a esa hora; cámbiala para que no salga "entrada tardía".') });
      } else if (!c.activa) det[5].push({ id: r.nomina, i, texto: quien + ': la clave "' + c.clave + '" está marcada como inactiva en la hoja Claves.' });
    });

    // 6, 7 y 8 · Descansos, horas y descansos fijos
    const resumen = {};
    activos.forEach((p) => {
      const dias = idx[p.id] || [];
      const desc = dias.filter((r) => r && esDescanso(r.tipo)).length;
      const horas = horasSemana(K, semana, p.id);
      resumen[p.id] = { horas, descansos: desc, dif: horas - p.jornada };
      if (desc !== p.descansos) det[6].push({ id: p.id, texto: p.nombre + ' tiene ' + desc + ' descanso' + (desc === 1 ? '' : 's') + ' y le toca' + (p.descansos === 1 ? '' : 'n') + ' ' + p.descansos + '.' });
      if (Math.abs(horas - p.jornada) > 1e-9) det[7].push({ id: p.id, dif: horas - p.jornada, texto: p.nombre + ': ' + horas + ' h de ' + p.jornada + ' h (' + (horas > p.jornada ? 'sobran ' : 'faltan ') + Math.abs(horas - p.jornada) + ' h).' });
      p.fijo.forEach((cod) => {
        const i = idxDia(cod);
        const r = dias[i];
        if (!r || !esDescanso(r.tipo)) det[8].push({ id: p.id, i, texto: p.nombre + ' descansa fijo el ' + titulo(DIAS[i].nombre).toLowerCase() + ' y ese día tiene ' + (r ? (r.tipo === 'TRABAJA' ? r.clave : TIPOS[r.tipo].txt.toLowerCase()) : 'nada') + '.' });
      });
    });

    // 9 · Dos tiendas el mismo día
    Object.keys(porPersona).forEach((id) => {
      const porFecha = {};
      porPersona[id].forEach((r) => { (porFecha[r.fecha] = porFecha[r.fecha] || []).push(r); });
      Object.keys(porFecha).forEach((f) => {
        const rs = porFecha[f];
        if (rs.length < 2) return;
        const tiendas = [...new Set(rs.filter((r) => r.tipo === 'TRABAJA').map((r) => r.sucursal || '(sin tienda)'))];
        det[9].push({ id, i: pos.get(f), texto: nom(id) + ' · ' + (pos.has(f) ? diaTxt(pos.get(f)) : f) + ': ' + (tiendas.length > 1 ? 'está en ' + tiendas.join(' y ') + '.' : 'tiene ' + rs.length + ' filas el mismo día.') });
      });
    });

    const criterios = CRITERIOS.map((c) => ({ n: c.n, titulo: c.titulo, estado: det[c.n].length ? 'error' : 'ok', detalles: det[c.n] }));
    return {
      criterios,
      ok: criterios.every((c) => c.estado === 'ok'),
      resumen,
      traslados: revisarTraslados(K, semana),
      sinNomina: activos.filter((p) => !p.nomina).map((p) => ({ id: p.id, nombre: p.nombre })),
      holgura: holgura(K, semana),
    };
  }

  // Reglas de traslado a tiendas foráneas (no bloquean, avisan).
  function revisarTraslados(K, semana) {
    const out = [];
    const idx = indexar(semana);
    K.parejas.forEach((pr) => {
      semana.fechas.forEach((f, i) => {
        const ahi = semana.filas.filter((r) => r.fecha === f && r.tipo === 'TRABAJA' && pr.tiendas.includes((buscarTienda(K, r.sucursal) || {}).clave));
        const choferVa = pr.chofer && ahi.some((r) => r.nomina === pr.chofer);
        ahi.forEach((r) => {
          const p = K.porId.get(r.nomina);
          if (!p || r.nomina === pr.chofer) return;
          const tk = buscarTienda(K, r.sucursal).clave;
          if (p.tiendaBase && p.tiendaBase.clave === tk) return;
          if (!choferVa && !sePuedeQuedar(K, p.id, tk)) {
            out.push({ id: p.id, i, texto: nombreCorto(p) + ' cubre ' + r.sucursal + ' el ' + titulo(DIAS[i].nombre).toLowerCase() + ' sin la unidad' + (pr.chofer ? ' de ' + nombreCorto(K.porId.get(pr.chofer)) : '') + ' y no está en la lista de quienes se quedan a dormir. Nadie se va en camión.' });
          }
          const prev = i > 0 && idx[p.id] && idx[p.id][i - 1];
          if (prev && prev.tipo === 'TRABAJA' && buscarTienda(K, prev.sucursal) && buscarTienda(K, prev.sucursal).clave === tk && !sePuedeQuedar(K, p.id, tk) && !choferVa) {
            out.push({ id: p.id, i, texto: nombreCorto(p) + ' estaría dos días seguidos en ' + r.sucursal + ' y no se puede quedar a dormir.' });
          }
        });
      });
    });
    return out;
  }

  // Turnos libres: gente que puede cubrir otra tienda, está trabajando en la suya y
  // puede salir sin dejarla sin apertura ni cierre. Es el margen para un imprevisto.
  function holgura(K, semana) {
    const idx = indexar(semana);
    const porDia = semana.fechas.map((f, i) => {
      const libres = K.personas.filter((p) => p.activo && K.puede.has(p.id)).filter((p) => {
        const r = idx[p.id] && idx[p.id][i];
        if (!r || r.tipo !== 'TRABAJA') return false;
        const t = buscarTienda(K, r.sucursal);
        if (!p.tiendaBase || !t || t.clave !== p.tiendaBase.clave) return false;
        const td = t.dias[DIAS[i].cod];
        if (!td) return true;
        const otros = semana.filas.filter((x) => x.fecha === f && x.nomina !== p.id && x.tipo === 'TRABAJA' && (buscarTienda(K, x.sucursal) || {}).clave === t.clave).map((x) => normalizarClave(x.clave));
        return otros.some((c) => c.ini <= td.abre && c.fin > td.abre) && (!td.dosTurnos || otros.some((c) => c.fin >= td.cierra));
      });
      return { i, fecha: f, libres: libres.map((p) => p.id) };
    });
    return { porDia, total: porDia.reduce((a, d) => a + d.libres.length, 0), finDeSemana: porDia.filter((d) => FIN_DE_SEMANA.has(DIAS[d.i].cod)).reduce((a, d) => a + d.libres.length, 0) };
  }

  // =====================================================================
  // Salidas
  // =====================================================================

  // Por área y, dentro de cada área, en el orden de las filas de la hoja Plantilla
  // (para mover a alguien en el tablero, el PDF y los archivos, se mueve su fila en la hoja).
  function personasOrdenadas(K) {
    const orden = (a) => { const k = AREAS.map(normTexto).indexOf(a.areaKey); return k < 0 ? 99 : k; };
    const fila = new Map(K.personas.map((p, i) => [p.id, i]));
    return K.personas.filter((p) => p.activo).slice().sort((a, b) => orden(a) - orden(b) || fila.get(a.id) - fila.get(b.id));
  }

  function claveExacta(K, texto) {
    const c = infoClave(K, texto);
    return c ? c.clave : null;
  }

  /*
   * A · Carga masiva de GIRHA. Fecha como texto aaaa-mm-dd; vacaciones, PTT, incapacidad y comisión
   * van con el horario regular. Quien no tiene nómina se excluye y se avisa.
   * op.solo = [ids] para exportar solo a algunas personas.
   */
  function filasGirha(K, semana, op) {
    const solo = op && op.solo ? new Set(op.solo) : null;
    const filas = [['Clave empresa', 'Clave empleado', 'Fecha', 'Clave horario']];
    const excluidos = [], errores = [];
    const idx = indexar(semana);
    personasOrdenadas(K).forEach((p) => {
      if (solo && !solo.has(p.id)) return;
      if (!p.nomina) { excluidos.push(p.nombre); return; }
      semana.fechas.forEach((f, i) => {
        const r = idx[p.id] && idx[p.id][i];
        const dia = titulo(DIAS[i].nombre) + ' ' + fechaCorta(f);
        if (!r) { errores.push(p.nombre + ' no tiene horario el ' + dia + '.'); return; }
        const texto = esDescanso(r.tipo) ? r.tipo : r.clave;
        const exacta = claveExacta(K, texto);
        if (!exacta) { errores.push(p.nombre + ' · ' + dia + ': la clave "' + (texto || 'vacía') + '" no está en la hoja Claves.'); return; }
        filas.push(['NSD', /^\d+$/.test(p.nomina) ? Number(p.nomina) : p.nomina, f, exacta]);
      });
    });
    return { filas, excluidos, errores };
  }

  /*
   * B · Rol de cajas de Ferre Mina. Mismo formato; todo día que no está en Ferre Mina va como D
   * (descanso, festivo, vacaciones, PTT, incapacidad, comisión o cobertura en otra tienda).
   */
  function filasRolCajas(K, semana) {
    const filas = [['Clave empresa', 'Clave empleado', 'Fecha', 'Clave horario']];
    const idx = indexar(semana);
    const caja = K.tiendaCajas;
    const enCaja = (r) => r && r.tipo === 'TRABAJA' && (buscarTienda(K, r.sucursal) || {}).clave === caja && normalizarClave(r.clave).estado === 'TRABAJA';
    const excluidos = [];
    personasOrdenadas(K).forEach((p) => {
      const dias = idx[p.id] || [];
      const esDeMina = p.tiendaBase && p.tiendaBase.clave === caja;
      if (!esDeMina && !dias.some(enCaja)) return;
      if (!p.nomina) { excluidos.push(p.nombre); return; }
      semana.fechas.forEach((f, i) => {
        const r = dias[i];
        filas.push(['NSD', /^\d+$/.test(p.nomina) ? Number(p.nomina) : p.nomina, f, enCaja(r) ? normalizarClave(r.clave).texto : 'D']);
      });
    });
    return { filas, excluidos };
  }

  // Colores que usa la app de Rol de Cajas para cada vendedor (los mismos de rol-cajas/js/core.js).
  const COLORES_CAJAS = ['#FFD966', '#9BC2E6', '#A9D08E', '#F4B084', '#C9A0DC', '#FF9F9F', '#8EA9DB',
    '#FFE699', '#C6E0B4', '#F8CBAD', '#B4C6E7', '#99E0DA', '#E6B8B7', '#D9D9D9'];
  // Puestos que por omisión no entran a Caja 1 / Caja 2 (se pueden marcar a mano en Rol de Cajas).
  const SIN_CAJA = new Set(['GDF', 'JEFOP', 'JADM', 'ESDFR', 'SUP COM']);

  /*
   * Prepara lo que la app de Rol de Cajas necesita para la semana, sin pasar por archivos.
   * estado = lo que Rol de Cajas ya tiene guardado en el navegador (o null). Regresa el estado nuevo.
   * - Agrega al catálogo de Rol de Cajas a quien falte (nombre corto y un color), sin tocar a los que ya están.
   * - Carga las filas de la semana como si fuera el archivo de GIRHA y deja la semana elegida.
   * - Marca para caja a todos menos gerencia y supervisión (si ya había selección de esa semana, la respeta).
   */
  function estadoRolCajas(K, semana, estado) {
    const S = Object.assign({}, estado || {});
    const { filas } = filasRolCajas(K, semana);
    const catalogo = (S.catalogo || []).slice();
    const tiene = new Set(catalogo.map((p) => normNomina(p.nomina)));
    const nominas = [...new Set(filas.slice(1).map((f) => normNomina(f[1])))];
    nominas.forEach((n) => {
      if (tiene.has(n)) return;
      const p = K.porId.get(n);
      catalogo.push({ nomina: n, nombre: (p ? nombreCorto(p) : 'Nómina ' + n).toUpperCase(), color: COLORES_CAJAS[catalogo.length % COLORES_CAJAS.length] });
      tiene.add(n);
    });
    const mismaSemana = S.semanaSel === semana.id && Array.isArray(S.seleccion) && S.seleccion.length;
    const seleccion = mismaSemana ? S.seleccion : nominas.filter((n) => { const p = K.porId.get(n); return !p || !SIN_CAJA.has(normTexto(p.puesto)); });
    return Object.assign(S, {
      catalogo,
      girha: { nombre: 'Horarios ' + fechaCorta(semana.fechas[0]) + ' al ' + fechaCorta(semana.fechas[6]) + ' (desde la app de Horarios)', filas },
      semanaSel: semana.id,
      seleccion,
      rol: S.rol && S.rol.semana === semana.id ? S.rol : null,
      tab: 'semana',
    });
  }

  // Revisa un archivo de carga (filas con títulos): 7 filas por persona y el bloque empieza en jueves.
  function revisarBloques(filas) {
    const errores = [];
    const bloques = [];
    filas.slice(1).forEach((f) => {
      const n = normNomina(f[1]);
      const u = bloques[bloques.length - 1];
      if (u && u.n === n) u.fechas.push(String(f[2])); else bloques.push({ n, fechas: [String(f[2])] });
    });
    const vistos = new Set();
    bloques.forEach((b) => {
      if (vistos.has(b.n)) errores.push('La nómina ' + b.n + ' aparece en dos bloques separados.');
      vistos.add(b.n);
      if (b.fechas.length !== 7) errores.push('La nómina ' + b.n + ' tiene ' + b.fechas.length + ' filas.');
      if (diaSemana(b.fechas[0]) !== 4) errores.push('El bloque de la nómina ' + b.n + ' empieza en ' + nombreDiaDe(b.fechas[0]) + '.');
      if (b.fechas.some((f) => !/^\d{4}-\d{2}-\d{2}$/.test(f))) errores.push('La nómina ' + b.n + ' tiene fechas que no están como aaaa-mm-dd.');
    });
    return errores;
  }

  // D · Mensajes de WhatsApp, uno por tienda.
  function mensajesWhatsApp(K, semana) {
    const idx = indexar(semana);
    const ini = semana.fechas[0], fin = semana.fechas[6];
    const [, m1, d1] = ini.split('-').map(Number), [, m2, d2] = fin.split('-').map(Number);
    const rango = 'Semana del jueves ' + d1 + (m1 !== m2 ? ' de ' + MESES_TXT[m1 - 1] : '') + ' al miércoles ' + d2 + ' de ' + MESES_TXT[m2 - 1];
    const out = [];
    K.tiendas.forEach((t, tk) => {
      const lineas = ['*' + t.nombre + '*', rango, ''];
      let alguien = false;
      semana.fechas.forEach((f, i) => {
        const aqui = [], fuera = [];
        K.personas.filter((p) => p.activo).forEach((p) => {
          const r = idx[p.id] && idx[p.id][i];
          if (!r) return;
          const enT = r.tipo === 'TRABAJA' && (buscarTienda(K, r.sucursal) || {}).clave === tk;
          if (enT) aqui.push({ p, r });
          else if (p.tiendaBase && p.tiendaBase.clave === tk && !esComodin(p)) fuera.push({ p, r });
        });
        if (!aqui.length && !fuera.length) return;
        alguien = true;
        aqui.sort((a, b) => normalizarClave(a.r.clave).ini - normalizarClave(b.r.clave).ini || a.p.nombre.localeCompare(b.p.nombre, 'es'));
        lineas.push('*' + titulo(DIAS[i].nombre) + ' ' + Number(f.slice(8)) + '*' + (semana.festivos && semana.festivos.includes(f) ? ' (festivo)' : ''));
        aqui.forEach(({ p, r }) => lineas.push('• *' + nombreCorto(p) + '* ' + normalizarClave(r.clave).texto + (p.tiendaBase && p.tiendaBase.clave !== tk ? ' (cubre)' : '')));
        if (!aqui.length) lineas.push('• Sin personal asignado');
        fuera.forEach(({ p, r }) => lineas.push('   ' + nombreCorto(p) + ': ' + (r.tipo === 'TRABAJA' ? 'en ' + r.sucursal : TIPOS[r.tipo].txt.toLowerCase())));
        lineas.push('');
      });
      if (alguien) out.push({ tienda: t.nombre, texto: lineas.join('\n').trim() });
    });
    return out;
  }

  // =====================================================================
  // Hoja Dias <-> semana
  // =====================================================================

  function semanaDesdeDias(dias, semanas, id) {
    const inicio = inicioSemana(parseFecha(id));
    const meta = (semanas || []).find((s) => parseFecha(s.id_semana) === inicio) || {};
    const filas = (dias || []).filter((r) => parseFecha(r.id_semana) === inicio).map((r) => {
      const n = normalizarClave(r.clave);
      let tipo = normTexto(r.tipo);
      if (!TIPOS[tipo]) tipo = n.estado === 'D' || n.estado === 'NP' ? n.estado : 'TRABAJA';
      const nomina = String(r.nomina || '').startsWith('SN:') ? String(r.nomina) : normNomina(r.nomina);
      return { nomina, fecha: parseFecha(r.fecha), tipo, clave: esDescanso(tipo) ? tipo : String(r.clave || '').trim(), sucursal: String(r.sucursal || '').trim(), nota: String(r.nota || ''), origen: 'guardado' };
    });
    if (!filas.length) return null;
    return {
      id: inicio, inicio, fechas: fechasDe(inicio), filas, pendientes: [], alertas: [], notas: [], festivos: [],
      estado: meta.estado || 'borrador', generado_por: meta.generado_por || '', fecha_generado: meta.fecha_generado || '', nota: meta.nota || '',
    };
  }

  // Quien se programó sin nómina queda guardado como "SN:NOMBRE". Cuando ya tiene nómina en la
  // Plantilla, sus filas se pasan a su nómina para que no se pierdan. Regresa cuántas filas cambió.
  function ligarSinNomina(K, semana) {
    let n = 0;
    semana.filas.forEach((r) => {
      if (!String(r.nomina).startsWith('SN:') || K.porId.has(r.nomina)) return;
      const nombre = r.nomina.slice(3);
      const p = K.personas.find((x) => normTexto(x.nombre) === nombre);
      if (p) { r.nomina = p.id; n++; }
    });
    return n;
  }

  function diasDesdeSemana(semana) {
    return semana.filas.slice().sort((a, b) => (a.nomina < b.nomina ? -1 : a.nomina > b.nomina ? 1 : a.fecha < b.fecha ? -1 : 1))
      .map((r) => ({ id_semana: semana.id, nomina: r.nomina, fecha: r.fecha, clave: r.clave, sucursal: r.sucursal, nota: r.nota || '', tipo: r.tipo }));
  }

  return {
    // compartido con rol-cajas
    DIAS, FIN_DE_SEMANA, aMin, aHora, parseFecha, diaSemana, sumarDias, inicioSemana, fechaCorta, fechaISO, normNomina, normalizarClave,
    // propio
    TIPOS, AREAS, COLOR_AREA, HOJAS, CRITERIOS, esDescanso, esBloqueo,
    normTexto, normDia, lista, titulo, nombreCorto, fechaLarga, nombreDiaDe, idDe, objetos, aoaDe,
    prepararLibro, buscarTienda, turnoTienda, infoClave, horasDe, clavesConEntrada, puedeCubrir, sePuedeQuedar,
    fechasDe, indexar, celda, cambiarCelda, novedadesDeSemana, quienAbrio, abreEstaSemana, cuadrarHoras,
    tiendasRelleno, generarSemana, validarSemana, horasSemana, revisarTraslados, holgura,
    personasOrdenadas, filasGirha, filasRolCajas, revisarBloques, mensajesWhatsApp,
    semanaDesdeDias, diasDesdeSemana, ligarSinNomina, estadoRolCajas,
  };
});
