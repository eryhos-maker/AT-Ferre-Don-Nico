/*
 * Rol de Cajas – Ferre Mina
 * Motor de reglas: lectura de GIRHA y SAP, armado del rol y validación.
 * No toca la pantalla, así que también se puede probar con Node.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RolCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---------------------------------------------------------------- días

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
  const COD_POR_DOW = {};
  DIAS.forEach((d) => { COD_POR_DOW[d.dow] = d.cod; });

  const COLORES = [
    '#FFD966', '#9BC2E6', '#A9D08E', '#F4B084', '#C9A0DC', '#FF9F9F', '#8EA9DB',
    '#FFE699', '#C6E0B4', '#F8CBAD', '#B4C6E7', '#99E0DA', '#E6B8B7', '#D9D9D9',
  ];

  function configInicial() {
    return {
      horario: {
        JUE: { ab: '08:00', ci: '21:00' },
        VIE: { ab: '08:00', ci: '21:00' },
        SAB: { ab: '08:00', ci: '21:00' },
        DOM: { ab: '08:00', ci: '19:00' },
        LUN: { ab: '08:00', ci: '21:00' },
        MAR: { ab: '08:00', ci: '21:00' },
        MIE: { ab: '08:00', ci: '21:00' },
      },
      // Tickets por hora que atiende una caja SIN que se haga fila. En ráfaga una caja cobra más
      // (unos 40 por hora), pero los clientes llegan en grupos: en el histórico de Ferre Mina
      // la tienda ya abre la segunda caja en más de la mitad de las horas con 15 a 20 tickets.
      capacidad: 20,
      // Tickets por hora desde los que se abre la Caja 3 de apoyo. Con dos cajas cobrando a su
      // máximo real (en el histórico, una caja casi nunca pasa de 28 a 29 por hora) se atienden
      // unos 55; arriba de eso se junta fila aunque estén las dos.
      caja3: 55,
      version: 3,
      maxDias: 3, // días máximos en Caja 1 / Caja 2 por vendedor
      turnoMin: 3, // horas
      turnoMax: 6, // horas
      paso: 30, // minutos (30 = medias horas, 60 = horas completas)
    };
  }

  // --------------------------------------------------------------- horas

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

  // Formato corto estilo rol en Excel: 600 -> "10", 870 -> "2:30"
  function corta(min) {
    let h = Math.floor(min / 60) % 12;
    if (h === 0) h = 12;
    const m = min % 60;
    return m ? h + ':' + String(m).padStart(2, '0') : String(h);
  }
  function rangoCorto(ini, fin) { return corta(ini) + '–' + corta(fin); }
  function rangoLargo(ini, fin) { return aHora(ini) + '–' + aHora(fin); }
  function horasTxt(min) {
    const h = min / 60;
    return (Number.isInteger(h) ? h : h.toFixed(1)) + ' h';
  }

  // -------------------------------------------------------------- fechas

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

  // Acepta: Date, número de serie de Excel, "YYYY-MM-DD", "DD/MM/YYYY",
  // "DD.MM.YYYY" (SAP), "YYYYMMDD" y cualquiera de ellas con hora después.
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
      if (mo > 12 && d <= 12) { const t = d; d = mo; mo = t; } // venía como MM/DD
      return fechaValida(y, mo, d) ? fechaISO(y, mo, d) : null;
    }
    m = s.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (m) return fechaValida(+m[1], +m[2], +m[3]) ? fechaISO(+m[1], +m[2], +m[3]) : null;
    // "1 sep 2025 0:00:00.0" (así sale el reporte de ventas por hora de SAP)
    m = s.toLowerCase().match(/^(\d{1,2})[\s\-\/.]+([a-zñ]{3,})\.?[\s\-\/.,]+(\d{4})/);
    if (m && MESES[m[2].slice(0, 3)]) {
      const mo = MESES[m[2].slice(0, 3)];
      return fechaValida(+m[3], mo, +m[1]) ? fechaISO(+m[3], mo, +m[1]) : null;
    }
    if (/^\d+(\.\d+)?$/.test(s)) return parseFecha(Number(s));
    return null;
  }

  // Devuelve la hora (0–23) o null. Acepta fracción de día de Excel,
  // fecha-hora de Excel, "14:35", "14:35:22", "2:35 p. m.", "143522" (SAP).
  function parseHora(v) {
    if (v == null || v === '') return null;
    if (v instanceof Date) return isNaN(v) ? null : v.getHours();
    if (typeof v === 'number') {
      if (v >= 0 && v < 1) return Math.floor(v * 24 + 1e-9) % 24;
      if (v > 20000) return Math.floor((v % 1) * 24 + 1e-9) % 24;
      if (Number.isInteger(v) && v >= 0 && v <= 23) return v;
      if (Number.isInteger(v) && v >= 10000 && v <= 235959) return Math.floor(v / 10000);
      return null;
    }
    const s = String(v).trim().toLowerCase();
    let m = s.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*([ap])?\.?\s*m?/);
    if (m) {
      let h = +m[1];
      if (m[3] === 'p' && h < 12) h += 12;
      if (m[3] === 'a' && h === 12) h = 0;
      return h <= 23 ? h : null;
    }
    m = s.match(/^(\d{2})(\d{2})(\d{2})$/);
    if (m) return +m[1] <= 23 ? +m[1] : null;
    if (/^\d{1,2}$/.test(s)) return +s <= 23 ? +s : null;
    if (/^\d+(\.\d+)?$/.test(s)) return parseHora(Number(s));
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
  // Jueves en que empieza la semana de esa fecha
  function inicioSemana(iso) {
    return sumarDias(iso, -((diaSemana(iso) - 4 + 7) % 7));
  }
  function fechaCorta(iso) {
    const [, m, d] = iso.split('-');
    return d + '/' + m;
  }

  // -------------------------------------------------------------- GIRHA

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

  // filas: arreglo de arreglos [empresa, nómina, fecha, clave]
  function leerGirha(filas, catalogo) {
    const cat = new Map(catalogo.map((p) => [normNomina(p.nomina), p]));
    const registros = [];
    const ignorados = new Set();
    const avisos = [];
    let invalidas = 0, otraEmpresa = 0;
    filas.forEach((fila, i) => {
      if (!fila || fila.every((c) => c === '' || c == null)) return;
      const [emp, nom, fec, cla] = fila;
      const fecha = parseFecha(fec);
      if (!fecha) { if (i > 0) invalidas++; return; }
      const n = normNomina(nom);
      if (!n) { invalidas++; return; }
      if (!cat.has(n)) { ignorados.add(n); return; }
      if (emp && String(emp).trim().toUpperCase() !== 'NSD') otraEmpresa++;
      registros.push({ nomina: n, fecha, clave: normalizarClave(cla), fila: i + 1 });
    });
    if (invalidas) avisos.push(invalidas + ' fila(s) sin fecha o nómina válida no se tomaron en cuenta.');
    if (otraEmpresa) avisos.push(otraEmpresa + ' fila(s) con clave de empresa distinta a "NSD" (se usaron igual).');
    const semanas = [...new Set(registros.map((r) => inicioSemana(r.fecha)))].sort();
    return { registros, semanas, ignorados: ignorados.size, avisos };
  }

  function armarSemana(registros, inicio, catalogo) {
    const fechas = DIAS.map((_, i) => sumarDias(inicio, i));
    const idxFecha = new Map(fechas.map((f, i) => [f, i]));
    const personas = {};
    const avisos = [];
    const vistos = {};
    catalogo.forEach((p) => {
      personas[normNomina(p.nomina)] = {
        dias: fechas.map((f) => ({ fecha: f, estado: 'FALTA', texto: '—' })),
      };
    });
    registros.forEach((r) => {
      const i = idxFecha.get(r.fecha);
      if (i == null || !personas[r.nomina]) return;
      const k = r.nomina + '|' + r.fecha;
      if (vistos[k]) avisos.push({ tipo: 'duplicado', nomina: r.nomina, texto: 'viene dos veces el ' + fechaCorta(r.fecha) + ' (se usó la fila ' + r.fila + ').' });
      vistos[k] = true;
      personas[r.nomina].dias[i] = Object.assign({ fecha: r.fecha }, r.clave);
      if (r.clave.estado === 'OTRO') avisos.push({ tipo: 'clave', nomina: r.nomina, texto: 'clave "' + r.clave.texto + '" no reconocida el ' + fechaCorta(r.fecha) + '; se toma como no disponible.' });
    });
    Object.keys(personas).forEach((n) => {
      const falt = personas[n].dias.filter((d) => d.estado === 'FALTA');
      if (falt.length === 7) avisos.push({ tipo: 'ausente', nomina: n, texto: 'no aparece en el archivo esta semana.' });
      else if (falt.length) avisos.push({ tipo: 'faltan', nomina: n, texto: 'le faltan ' + falt.length + ' día(s): ' + falt.map((d) => DIAS[idxFecha.get(d.fecha)].nombre + ' ' + fechaCorta(d.fecha)).join(', ') + '.' });
    });
    return { inicio, fechas, personas, avisos };
  }

  function disponible(semana, nomina, i) {
    const p = semana.personas[nomina];
    if (!p) return null;
    const d = p.dias[i];
    return d && d.estado === 'TRABAJA' ? d : null;
  }

  // ---------------------------------------------------------- ventas SAP

  // filas: arreglo de arreglos (ya sin la fila de títulos)
  // cols: { fecha, hora (-1 si la fecha trae la hora), ticket, importe (-1 si no hay) }
  function procesarVentas(filas, cols) {
    const tickets = new Map(); // clave ticket -> {fecha, hora, importe}
    let descartadas = 0;
    filas.forEach((f) => {
      if (!f) return;
      const fecha = parseFecha(f[cols.fecha]);
      const hora = parseHora(cols.hora >= 0 ? f[cols.hora] : f[cols.fecha]);
      const tk = f[cols.ticket] == null ? '' : String(f[cols.ticket]).trim();
      if (!fecha || hora == null || !tk) { descartadas++; return; }
      let imp = 0;
      if (cols.importe >= 0) {
        const v = f[cols.importe];
        imp = typeof v === 'number' ? v : parseFloat(String(v).replace(/[$,\s]/g, '')) || 0;
      }
      // El ticket se cuenta una vez, en la fecha y hora de su primer renglón.
      const k = fecha + '|' + tk;
      const t = tickets.get(k);
      if (t) t.importe += imp;
      else tickets.set(k, { fecha, hora, importe: imp });
    });
    const tot = {}, imp = {}, fechasPorDia = {};
    DIAS.forEach((d) => { tot[d.cod] = {}; imp[d.cod] = {}; fechasPorDia[d.cod] = new Set(); });
    const fechas = new Set();
    const porFecha = {}; // fecha -> { hora: tickets }
    tickets.forEach((t) => {
      const cod = COD_POR_DOW[diaSemana(t.fecha)];
      if (!porFecha[t.fecha]) porFecha[t.fecha] = {};
      porFecha[t.fecha][t.hora] = (porFecha[t.fecha][t.hora] || 0) + 1;
      fechas.add(t.fecha);
      fechasPorDia[cod].add(t.fecha);
      tot[cod][t.hora] = (tot[cod][t.hora] || 0) + 1;
      imp[cod][t.hora] = (imp[cod][t.hora] || 0) + t.importe;
    });
    // "alto" = tickets de un día cargado: 8 de cada 10 días de ese día de la semana
    // vendieron eso o menos en esa hora. Con ese número se decide cuántas cajas abrir,
    // porque planear con el promedio deja corta a la tienda la mitad de los días.
    const tickets_ = {}, importe = {}, diasContados = {}, alto = {};
    DIAS.forEach((d) => {
      const lista = [...fechasPorDia[d.cod]];
      const n = lista.length;
      diasContados[d.cod] = n;
      tickets_[d.cod] = {};
      importe[d.cod] = {};
      alto[d.cod] = {};
      for (let h = 0; h < 24; h++) {
        tickets_[d.cod][h] = n ? (tot[d.cod][h] || 0) / n : 0;
        importe[d.cod][h] = n ? (imp[d.cod][h] || 0) / n : 0;
        const v = lista.map((f) => porFecha[f][h] || 0).sort((a, b) => a - b);
        alto[d.cod][h] = n ? v[Math.floor(0.8 * (n - 1))] : 0;
      }
    });
    const lista = [...fechas].sort();
    return {
      tickets: tickets_,
      alto,
      importe,
      diasContados,
      info: {
        filas: filas.length,
        descartadas,
        ticketsUnicos: tickets.size,
        desde: lista[0] || null,
        hasta: lista[lista.length - 1] || null,
        dias: lista.length,
        semanas: new Set(lista.map(inicioSemana)).size,
      },
    };
  }

  // Tickets por hora con los que se decide cuántas cajas abrir: los de un día cargado.
  // Si el reporte es de una versión anterior y no los trae, se usa el promedio.
  function cargaHora(demanda, cod, h) {
    if (!demanda) return 0;
    const t = demanda.alto && demanda.alto[cod] ? demanda.alto[cod][h] : demanda.tickets[cod][h];
    return t || 0;
  }

  // 1, 2 o 3 cajas. Con umbral de Caja 3 (caja3): 3 solo desde ese número de tickets por hora.
  // Sin él (versiones anteriores) se usa el doble de la capacidad.
  function nivelCajas(tickets, capacidad, caja3) {
    if (!tickets) return 1;
    const n = Math.max(1, Math.min(3, Math.ceil(tickets / capacidad - 1e-9)));
    if (!caja3) return n;
    if (tickets >= caja3) return 3;
    return Math.min(n, 2);
  }

  // --------------------------------------------------- armado del rol

  function horarioDia(config, i) {
    const h = config.horario[DIAS[i].cod];
    return { ab: aMin(h.ab), ci: aMin(h.ci) };
  }

  function statsVacios() {
    return { dias: 0, horas: 0, cierres: 0, aperturas: 0, finde: 0, c1: 0, c2: 0, apoyos: 0 };
  }

  function numeroSemana(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return Math.floor(Date.UTC(y, m - 1, d) / (7 * 86400000));
  }

  function nombreDe(catalogo, nomina) {
    const p = catalogo.find((x) => normNomina(x.nomina) === nomina);
    return p ? p.nombre : 'Nómina ' + nomina;
  }

  // Busca la mejor forma de cubrir una caja un día, en tramos de min–max
  // horas, sin repetir persona. Si no alcanza la gente, deja huecos.
  // Arma el día completo pensando en cuántas personas hay en caja a cada hora, no en dos cajas
  // por separado: con 1 persona está abierta la Caja 1; con 2, también la Caja 2. Así, por ejemplo,
  // quien llega a las 10 entra de una vez como Caja 2 y, cuando sale el de la mañana, pasa a Caja 1.
  // ctx.falta(a, b, n) = costo de tener n personas en caja (0 o 1) entre a y b.
  function resolverDia(ctx) {
    const { ab, ci, cands, min, max, paso, costoTurno, falta, eventos } = ctx;
    const LIMITE = 60000;
    let nodos = 0;
    let mejor = { cost: Infinity, segs: [] };
    const segs = [];
    const usados = new Set();
    const finesPosibles = (c, t) => {
      const tope = Math.min(c.fin, ci, t + max);
      const set = new Set([tope]);
      eventos.forEach((e) => { if (e >= t + min && e < tope) set.add(e); });
      if (t + min <= tope) set.add(t + min);
      return [...set].filter((e) => e >= t + min && e <= tope && (e - t) % paso === 0 || e === tope && e - t >= min).sort((a, b) => b - a);
    };
    function siguiente(t) {
      let x = ci;
      segs.forEach((s) => { if (s.fin > t && s.fin < x) x = s.fin; });
      eventos.forEach((e) => { if (e > t && e < x) x = e; });
      return x;
    }
    function dfs(t, cost, desde) {
      if (cost >= mejor.cost || ++nodos > LIMITE) return;
      if (t >= ci) { mejor = { cost, segs: segs.slice() }; return; }
      const act = segs.filter((s) => s.ini <= t && s.fin > t).length;
      if (act < 2) {
        const opts = [];
        cands.forEach((c, i) => {
          if (i < desde || usados.has(c.nomina) || c.ini > t || c.fin - t < min || ci - t < Math.min(min, ci - ab)) return;
          finesPosibles(c, t).forEach((e) => opts.push({ c, i, e, k: costoTurno(c, t, e) }));
        });
        opts.sort((a, b) => a.k - b.k || b.e - a.e);
        for (const o of opts) {
          usados.add(o.c.nomina);
          segs.push({ nomina: o.c.nomina, ini: t, fin: o.e });
          dfs(t, cost + o.k, o.i + 1);
          segs.pop();
          usados.delete(o.c.nomina);
        }
      }
      const t2 = siguiente(t);
      dfs(t2, cost + falta(t, t2, Math.min(2, act)), 0);
    }
    dfs(ab, 0, 0);
    return mejor.segs;
  }

  // Pone la etiqueta de caja: el primero en llegar es Caja 1 (fijo) y el segundo, Caja 2 (flotante).
  // Cuando sale el de Caja 1, el de Caja 2 pasa a Caja 1 y la Caja 2 queda para piso.
  function etiquetarCajas(personas) {
    const out = [];
    const ev = [];
    personas.forEach((p) => { ev.push({ t: p.ini, tipo: 1, p }); ev.push({ t: p.fin, tipo: 0, p }); });
    ev.sort((a, b) => a.t - b.t || a.tipo - b.tipo);
    let c1 = null, c2 = null;
    const abrir = (p, caja, t) => { p.actual = { caja, nomina: p.nomina, ini: t, fin: null }; out.push(p.actual); };
    ev.forEach((e) => {
      if (e.tipo === 0) {
        e.p.actual.fin = e.t;
        if (c1 === e.p) {
          c1 = null;
          if (c2) { c2.actual.fin = e.t; c1 = c2; c2 = null; abrir(c1, 1, e.t); }
        } else if (c2 === e.p) c2 = null;
      } else if (!c1) { c1 = e.p; abrir(e.p, 1, e.t); } else { c2 = e.p; abrir(e.p, 2, e.t); }
    });
    return out.filter((s) => s.fin > s.ini);
  }

  function generarRol(opts) {
    const { semana, catalogo, config } = opts;
    const seleccion = new Set((opts.seleccion || []).map(normNomina));
    const demanda = opts.demanda || null;
    const min = config.turnoMin * 60, max = config.turnoMax * 60, paso = config.paso;
    const elegidos = [...seleccion].filter((n) => semana.personas[n]).sort();
    const semilla = numeroSemana(semana.inicio);
    const rango = {};
    elegidos.forEach((n, i) => { rango[n] = (i + semilla) % Math.max(1, elegidos.length); });
    const nivelHora = (dia, h) => (demanda ? nivelCajas(cargaHora(demanda, dia.cod, h), config.capacidad, config.caja3) : 2);
    // Sin nadie en caja: muy caro. Con una sola persona: caro en horas que piden 2 cajas
    // (más mientras más tickets), barato en horas tranquilas.
    const falta = (dia, a, b, n, soloC1) => {
      if (n >= 2 || (soloC1 && n >= 1)) return 0;
      let k = 0;
      for (let h = Math.floor(a / 60); h * 60 < b; h++) {
        const m = Math.min(b, (h + 1) * 60) - Math.max(a, h * 60);
        if (n === 0) k += m * 5000; // la Caja 1 vacía nunca se cambia por cubrir la Caja 2
        else if (!demanda) k += m * 200;
        else k += m * (nivelHora(dia, h) >= 2 ? 200 * cargaHora(demanda, dia.cod, h) / config.capacidad : 6);
      }
      return k;
    };
    let stats = {};
    const diasBase = DIAS.map((d, i) => {
      const { ab, ci } = horarioDia(config, i);
      return { idx: i, cod: d.cod, nombre: d.nombre, fecha: semana.fechas[i], ab, ci };
    });

    function candidatos(dia, libre) {
      return elegidos.map((n) => {
        const d = disponible(semana, n, dia.idx);
        if (!d || libre(n) <= 0) return null;
        const ini = Math.max(d.ini, dia.ab), fin = Math.min(d.fin, dia.ci);
        return fin - ini >= Math.min(min, dia.ci - dia.ab) ? { nomina: n, ini, fin, girha: d } : null;
      }).filter(Boolean);
    }

    // Qué tanto le falta gente al día: horas que piden 2 cajas contra horas de gente disponible.
    function apretado(dia) {
      let oferta = 0;
      elegidos.forEach((n) => {
        const d = disponible(semana, n, dia.idx);
        if (d) oferta += Math.max(0, Math.min(d.fin, dia.ci) - Math.max(d.ini, dia.ab));
      });
      let pide = 0;
      for (let h = Math.floor(dia.ab / 60); h * 60 < dia.ci; h++) pide += 60 * (nivelHora(dia, h) >= 2 ? 2 : 1);
      return oferta / Math.max(1, pide);
    }
    // Primero los días más apretados; en empate, los de más venta.
    const PRIORIDAD_SIN_VENTAS = { SAB: 3, DOM: 2, VIE: 1 };
    const carga = (dia) => {
      if (!demanda) return PRIORIDAD_SIN_VENTAS[dia.cod] || 0;
      let k = 0;
      for (let h = Math.floor(dia.ab / 60); h * 60 < dia.ci; h++) k += cargaHora(demanda, dia.cod, h);
      return k;
    };
    // Horas de caja que le tocarían a cada quien, en proporción a su tiempo en tienda:
    // quien está 8 horas debe tener más caja que quien está 6.
    const pideTotal = diasBase.reduce((a, d) => {
      let k = 0;
      for (let h = Math.floor(d.ab / 60); h * 60 < d.ci; h++) k += (Math.min(d.ci, (h + 1) * 60) - Math.max(d.ab, h * 60)) * (nivelHora(d, h) >= 2 ? 2 : 1.3);
      return a + k;
    }, 0);
    const enTienda = {};
    elegidos.forEach((n) => { enTienda[n] = minutosEnTienda(semana, n, diasBase); });
    const sumaTienda = elegidos.reduce((a, n) => a + enTienda[n], 0) || 1;
    const meta = {};
    elegidos.forEach((n) => { meta[n] = pideTotal * enTienda[n] / sumaTienda / 60; });

    // soloC1: arma solo lo mínimo para que la Caja 1 nunca quede vacía (sirve para apartar gente).
    // reservas[día] = quiénes hacen falta ese día para la Caja 1; no se les gastan días antes.
    function armar(orden, soloC1, reservas) {
    stats = {};
    catalogo.forEach((p) => { stats[normNomina(p.nomina)] = statsVacios(); });
    const dias = diasBase.map((d) => Object.assign({}, d, { turnos: [], apoyos: [] }));
    const pendientes = new Set(dias.map((d) => d.idx));

    orden.map((x) => dias[x.idx]).forEach((dia) => {
      pendientes.delete(dia.idx);
      const apartados = (n) => (reservas ? [...pendientes].filter((i) => reservas[i].has(n)).length : 0);
      const cands = candidatos(dia, (n) => config.maxDias - stats[n].dias - apartados(n));
      const finde = FIN_DE_SEMANA.has(dia.cod);
      const futuro = {};
      cands.forEach((c) => { futuro[c.nomina] = [...pendientes].filter((i) => disponible(semana, c.nomina, i)).length; });
      // Reserva: en los días que faltan, ¿a qué hora sería esta persona de las pocas disponibles?
      // Por ejemplo, de 2 a 3:30 solo están los de medio día: conviene no gastarles días antes.
      const libresDe = (n) => config.maxDias - stats[n].dias - apartados(n);
      const reserva = {};
      cands.forEach((c) => { reserva[c.nomina] = 0; });
      [...pendientes].forEach((i) => {
        const dd = dias[i];
        const presentes = elegidos.filter((n) => libresDe(n) > 0 && disponible(semana, n, i));
        cands.forEach((c) => {
          const dc = disponible(semana, c.nomina, i);
          if (!dc) return;
          let peor = 0;
          for (let m = dd.ab; m < dd.ci; m += 30) {
            if (dc.ini > m || dc.fin <= m) continue;
            const n = presentes.filter((x) => { const d = disponible(semana, x, i); return d.ini <= m && d.fin > m; }).length;
            if (n) peor = Math.max(peor, 1 / n);
          }
          reserva[c.nomina] += peor / Math.max(1, libresDe(c.nomina));
        });
      });
      // Reparto parejo: pesa más a quien ya lleva días y horas de caja.
      const costoTurno = (c, ini, fin) => {
        const s = stats[c.nomina];
        let k = s.dias * 700 + (s.horas / 60) * 90 + rango[c.nomina];
        // Pasarse de las horas que le tocarían cuesta cada vez más: así no carga uno con 24 h y otro con 6.
        const pasa = Math.max(0, (s.horas + fin - ini) / 60 - meta[c.nomina]);
        k += pasa * pasa * 120 + pasa * 250;
        if (fin === dia.ci) k += s.cierres * 200;
        if (ini === dia.ab) k += s.aperturas * 120;
        if (finde) k += s.finde * 200;
        k += futuro[c.nomina] * 40; // usar antes a quien tiene menos días libres después
        k += reserva[c.nomina] * 1500; // cuidar a quien hará falta en horas donde casi no hay gente
        k += Math.max(0, ini - c.ini) / 60 * 60; // de preferencia entra a caja cuando llega, no horas después
        return k + 300; // cada relevo cuesta: se prefieren turnos largos
      };
      const eventos = new Set();
      cands.forEach((c) => { eventos.add(c.ini); eventos.add(c.fin); });
      for (let h = Math.floor(dia.ab / 60) + 1; h * 60 < dia.ci; h++) if ((nivelHora(dia, h) >= 2) !== (nivelHora(dia, h - 1) >= 2)) eventos.add(h * 60);
      const ev = [...eventos].filter((e) => e > dia.ab && e < dia.ci);
      const personas = resolverDia({ ab: dia.ab, ci: dia.ci, cands, min, max, paso, costoTurno, falta: (a, b, n) => falta(dia, a, b, n, soloC1), eventos: ev });
      const segs = etiquetarCajas(personas.map((p) => Object.assign({}, p)));
      personas.forEach((p) => {
        const s = stats[p.nomina];
        const c = cands.find((x) => x.nomina === p.nomina);
        const suyos = segs.filter((x) => x.nomina === p.nomina);
        const alternos = cands.filter((x) => x.nomina !== p.nomina && !personas.some((o) => o.nomina === x.nomina) && x.ini <= p.ini && x.fin > p.ini)
          .map((x) => nombreDe(catalogo, x.nomina) + ' (' + stats[x.nomina].dias + '/' + config.maxDias + ')');
        const razon = [
          suyos.length > 1
            ? 'Entra a las ' + aHora(p.ini) + ' como Caja 2 (flotante) y a las ' + aHora(suyos[1].ini) + ', cuando sale quien estaba en Caja 1, pasa a Caja 1 hasta las ' + aHora(p.fin) + '.'
            : (suyos[0].caja === 1 ? 'Caja 1 – cajero fijo, no deja la caja.' : 'Caja 2 – cajero flotante: apoya en piso y regresa a cobrar cuando se junta fila.'),
          dia.nombre + ' ' + rangoLargo(p.ini, p.fin) + ' (' + horasTxt(p.fin - p.ini) + ' en caja).',
          'Su horario GIRHA ese día es ' + rangoLargo(c.girha.ini, c.girha.fin) + ': el turno queda dentro.',
          'Al asignarlo llevaba ' + s.dias + ' de ' + config.maxDias + ' días y ' + horasTxt(s.horas) + ' en caja esta semana.',
          alternos.length
            ? 'También podían entrar a esa hora: ' + alternos.join(', ') + '. Se reparte para que nadie cargue con muchas más horas de caja que los demás.'
            : 'Era la única persona marcada disponible para entrar a esa hora.',
        ].join('\n');
        suyos.forEach((x) => dia.turnos.push({ caja: x.caja, nomina: x.nomina, ini: x.ini, fin: x.fin, razon, manual: false }));
        s.dias++;
        s.horas += p.fin - p.ini;
        suyos.forEach((x) => { s['c' + x.caja]++; });
        if (p.fin === dia.ci) s.cierres++;
        if (p.ini === dia.ab) s.aperturas++;
        if (finde) s.finde++;
      });
      dia.turnos.sort((a, b) => a.caja - b.caja || a.ini - b.ini);
    });
    return { dias, stats };
    }

    // Calificación de un rol: horas sin caja (lo más grave), horas que piden 2 cajas con una sola
    // y diferencia de horas de caja entre la gente con más y menos.
    function calificar(r) {
      let k = 0;
      const faltaC1 = [];
      r.dias.forEach((dia) => {
        const cortes = new Set([dia.ab, dia.ci]);
        dia.turnos.forEach((t) => { cortes.add(t.ini); cortes.add(t.fin); });
        const cs = [...cortes].sort((a, b) => a - b);
        let sinCaja = 0;
        for (let i = 0; i + 1 < cs.length; i++) {
          const n = new Set(dia.turnos.filter((t) => t.ini <= cs[i] && t.fin > cs[i]).map((t) => t.nomina)).size;
          if (n === 0) sinCaja += cs[i + 1] - cs[i];
          k += falta(dia, cs[i], cs[i + 1], n);
        }
        faltaC1.push(sinCaja);
      });
      // diferencia contra lo que le toca a cada quien por su tiempo en tienda
      const dif = elegidos.filter((n) => enTienda[n] > 0).map((n) => r.stats[n].horas / 60 - meta[n]);
      if (dif.length) k += (Math.max(...dif) - Math.min(...dif)) * 400;
      return { k, faltaC1 };
    }

    // Se prueban varios órdenes de días y se queda el mejor: primero los días más apretados, luego
    // los de más venta, y se repite pasando al frente los días donde quedó la caja sola o vacía.
    const base = diasBase.slice();
    const ordenes = [
      base.slice().sort((a, b) => apretado(a) - apretado(b) || carga(b) - carga(a) || a.idx - b.idx),
      base.slice().sort((a, b) => carga(b) - carga(a) || a.idx - b.idx),
    ];
    let mejor = null;
    // Primero se aparta a quien hace falta para la Caja 1 cada día; luego se arma el día completo.
    const probar = (orden) => {
      const c1 = armar(orden, true, null);
      const reservas = c1.dias.map((d) => new Set(d.turnos.map((t) => t.nomina)));
      const r = armar(orden, false, reservas);
      const c = calificar(r);
      if (!mejor || c.k < mejor.c.k) mejor = { r, c, orden };
    };
    ordenes.forEach(probar);
    for (let i = 0; i < 5; i++) {
      const faltan = mejor.orden.filter((d) => mejor.c.faltaC1[d.idx] > 0);
      if (!faltan.length) break;
      const antes = mejor.c.k;
      probar(faltan.concat(mejor.orden.filter((d) => !faltan.includes(d))));
      if (mejor.c.k >= antes) break;
    }
    const dias = mejor.r.dias;

    const rol = { semana: semana.inicio, generado: new Date().toISOString(), dias, conVentas: !!demanda, ordenConVentas: !!demanda };
    rol.dias.forEach((d) => { d.apoyos = []; });
    calcularApoyos(rol, { semana, catalogo, config, demanda });
    return rol;
  }

  // ------------------------------------------------------------ Caja 3

  function horasPico(dia, demanda, config) {
    const bloques = [];
    if (!demanda) return bloques;
    let actual = null;
    for (let h = Math.floor(dia.ab / 60); h * 60 < dia.ci; h++) {
      const t = cargaHora(demanda, dia.cod, h);
      if (nivelCajas(t, config.capacidad, config.caja3) === 3) {
        const ini = Math.max(h * 60, dia.ab), fin = Math.min((h + 1) * 60, dia.ci);
        if (actual && actual.fin === ini) { actual.fin = fin; actual.tickets.push(t); }
        else { actual = { ini, fin, tickets: [t] }; bloques.push(actual); }
      } else actual = null;
    }
    return bloques;
  }

  function enCaja(dia, nomina, ini, fin) {
    return dia.turnos.some((t) => t.nomina === nomina && t.ini < fin && t.fin > ini);
  }

  // Minutos que la persona está en tienda en la semana (su horario GIRHA dentro del horario de la tienda).
  function minutosEnTienda(semana, n, dias) {
    let m = 0;
    dias.forEach((d) => {
      const g = disponible(semana, n, d.idx);
      if (g) m += Math.max(0, Math.min(g.fin, d.ci) - Math.max(g.ini, d.ab));
    });
    return m;
  }

  // Carga de caja de la semana por persona: horas en caja, horas en tienda y qué parte de su tiempo
  // en tienda pasa en caja. Lo parejo es que todos pasen la misma parte (así los de 8 h tienen más
  // horas de caja que los de 6 h). "dif" = horas de más (+) o de menos (−) contra lo parejo.
  function cargaSemana(rol, semana, catalogo) {
    const personas = {};
    let caja = 0, tienda = 0;
    catalogo.map((p) => normNomina(p.nomina)).forEach((n) => {
      if (!semana.personas[n]) return;
      const t = minutosEnTienda(semana, n, rol.dias);
      let c = 0;
      rol.dias.forEach((d) => d.turnos.forEach((x) => { if (x.nomina === n) c += x.fin - x.ini; }));
      if (!t && !c) return;
      personas[n] = { caja: c, tienda: t };
      caja += c; tienda += t;
    });
    const parte = tienda ? caja / tienda : 0;
    Object.values(personas).forEach((p) => {
      p.pct = p.tienda ? p.caja / p.tienda : 0;
      p.dif = p.caja - parte * p.tienda;
    });
    return { personas, parte };
  }

  // Hasta qué hora puede alguien estar en piso desde t sin pasar de tope (t si no puede).
  function finEnPiso(semana, dia, nomina, t, tope) {
    const d = disponible(semana, nomina, dia.idx);
    if (!d || d.ini > t || d.fin <= t) return t;
    let e = Math.min(d.fin, tope);
    for (const x of dia.turnos) {
      if (x.nomina !== nomina || x.fin <= t || x.ini >= e) continue;
      if (x.ini <= t) return t;
      e = x.ini;
    }
    return e;
  }

  function enPiso(semana, dia, nomina, ini, fin) {
    const d = disponible(semana, nomina, dia.idx);
    return !!d && d.ini <= ini && d.fin >= fin && !enCaja(dia, nomina, ini, fin);
  }

  // Caja 2 de piso: en las horas en que nadie tiene turno de Caja 2, se nombra a un vendedor
  // que está en piso para que entre a cobrar cuando se junte fila. Así opera la tienda cuando no
  // alcanza la gente (sobre todo en la mañana). No cuenta en sus días de caja. Se calcula cada vez
  // a partir del rol, así que siempre va de acuerdo con los cambios hechos a mano.
  function cajaPiso(rol, opts) {
    const { semana, catalogo } = opts;
    const todos = catalogo.map((p) => normNomina(p.nomina)).sort();
    const semilla = numeroSemana(semana.inicio);
    const rango = {}, veces = {};
    todos.forEach((n, i) => { rango[n] = (i + semilla) % Math.max(1, todos.length); veces[n] = 0; });
    return rol.dias.map((dia) => {
      const out = [];
      const hasta = (n, t, tope) => {
        let f = finEnPiso(semana, dia, n, t, tope);
        (dia.apoyos || []).forEach((x) => { if (x.nomina === n && x.fin > t && x.ini < f) f = x.ini <= t ? t : x.ini; });
        return f;
      };
      libres(dia.ab, dia.ci, dia.turnos.filter((t) => t.caja === 2).sort((a, b) => a.ini - b.ini)).forEach((g) => {
        let t = g.ini;
        while (t < g.fin) {
          let mejor = null;
          todos.forEach((n) => {
            const f = hasta(n, t, g.fin);
            if (f <= t) return;
            if (!mejor || f > mejor.f || (f === mejor.f && (veces[n] - veces[mejor.n] || rango[n] - rango[mejor.n]) < 0)) mejor = { n, f };
          });
          if (!mejor) {
            // nadie en piso: se avanza hasta que alguien llegue o termine el hueco
            let f = g.fin;
            todos.forEach((n) => { const d = disponible(semana, n, dia.idx); if (d && d.ini > t && d.ini < f) f = d.ini; });
            const ult = out[out.length - 1];
            if (ult && !ult.nomina && ult.fin === t) ult.fin = f; else out.push({ ini: t, fin: f, nomina: null });
            t = f;
            continue;
          }
          out.push({ ini: t, fin: mejor.f, nomina: mejor.n });
          veces[mejor.n]++;
          t = mejor.f;
        }
      });
      return out;
    });
  }

  // Recalcula solo los apoyos de Caja 3; no toca Caja 1 ni Caja 2.
  function calcularApoyos(rol, opts) {
    const { semana, catalogo, config, demanda } = opts;
    rol.conVentas = !!demanda;
    const todos = catalogo.map((p) => normNomina(p.nomina)).sort();
    const semilla = numeroSemana(semana.inicio);
    const rango = {};
    todos.forEach((n, i) => { rango[n] = (i + semilla) % Math.max(1, todos.length); });
    const apoyos = {}, horasCaja = {};
    todos.forEach((n) => { apoyos[n] = 0; horasCaja[n] = 0; });
    rol.dias.forEach((d) => d.turnos.forEach((t) => { horasCaja[t.nomina] = (horasCaja[t.nomina] || 0) + t.fin - t.ini; }));

    rol.dias.forEach((dia) => {
      dia.apoyos = [];
      horasPico(dia, demanda, config).forEach((b) => {
        const prom = Math.round(b.tickets.reduce((a, x) => a + x, 0) / b.tickets.length);
        // El pico se cubre con la menor cantidad de personas: desde cada momento se elige a quien
        // puede quedarse más tiempo en piso (y entre ellas, a quien lleva menos apoyos).
        const tramos = [];
        let t = b.ini;
        while (t < b.fin) {
          let e = t;
          todos.forEach((n) => { e = Math.max(e, finEnPiso(semana, dia, n, t, b.fin)); });
          if (e <= t) e = Math.min(b.fin, (Math.floor(t / 60) + 1) * 60); // nadie en piso: se avisa por hora
          const ult = tramos[tramos.length - 1];
          const nadie = !todos.some((n) => enPiso(semana, dia, n, t, e));
          if (nadie && ult && ult.nadie && ult.fin === t) ult.fin = e;
          else tramos.push({ ini: t, fin: e, nadie });
          t = e;
        }
        tramos.forEach((tr) => {
          const cands = todos.filter((n) => enPiso(semana, dia, n, tr.ini, tr.fin));
          cands.sort((a, c) => apoyos[a] - apoyos[c] || horasCaja[a] - horasCaja[c] || rango[a] - rango[c]);
          const elegido = cands[0] || null;
          const base = 'Hora pico ' + dia.nombre + ' ' + rangoLargo(tr.ini, tr.fin) + ': en un día cargado se cobran ' + prom + ' tickets por hora; desde ' + (config.caja3 || config.capacidad * 2) + ' por hora ni las dos cajas alcanzan y se abre la Caja 3.';
          let razon;
          if (elegido) {
            const d = disponible(semana, elegido, dia.idx);
            razon = [
              base,
              nombreDe(catalogo, elegido) + ' está en piso a esa hora según GIRHA (' + rangoLargo(d.ini, d.fin) + ') y no está en Caja 1 ni Caja 2.',
              'Llevaba ' + apoyos[elegido] + ' apoyo(s) en Caja 3 esta semana; se rota a quien lleva menos.',
              cands.length > 1 ? 'También podrían apoyar: ' + cands.slice(1, 6).map((n) => nombreDe(catalogo, n)).join(', ') + '.' : 'Era la única persona en piso a esa hora.',
              'El apoyo en Caja 3 no cuenta dentro de sus 3 días de caja.',
            ].join('\n');
            apoyos[elegido]++;
          } else {
            razon = base + '\nNo hay ningún vendedor en piso a esa hora según GIRHA (todos están en caja, en descanso o fuera de horario).';
          }
          dia.apoyos.push({ ini: tr.ini, fin: tr.fin, nomina: elegido, tickets: prom, razon, manual: false });
        });
      });
    });
    return rol;
  }

  // ------------------------------------------------------------ validación

  function libres(ab, ci, turnos) {
    const out = [];
    let t = ab;
    turnos.slice().sort((a, b) => a.ini - b.ini).forEach((x) => {
      if (x.ini > t) out.push({ ini: t, fin: Math.min(x.ini, ci) });
      t = Math.max(t, x.fin);
    });
    if (t < ci) out.push({ ini: t, fin: ci });
    return out.filter((g) => g.fin > g.ini);
  }

  function validarRol(rol, opts) {
    const { semana, catalogo, config } = opts;
    const demanda = opts.demanda || null;
    const seleccion = new Set((opts.seleccion || []).map(normNomina));
    const problemas = [];
    const huecos = [];
    const min = config.turnoMin * 60, max = config.turnoMax * 60;
    const resumen = {};
    const r = (n) => (resumen[n] = resumen[n] || { dias: 0, horas: 0, c1: 0, c2: 0, apoyos: 0, piso: 0, cierres: 0, finde: 0 });
    const piso = cajaPiso(rol, opts);
    piso.forEach((lista) => lista.forEach((x) => { if (x.nomina) r(x.nomina).piso++; }));
    const nom = (n) => nombreDe(catalogo, n);

    rol.dias.forEach((dia) => {
      const porPersona = {};
      dia.turnos.forEach((t) => {
        (porPersona[t.nomina] = porPersona[t.nomina] || []).push(t);
        const d = semana.personas[t.nomina] ? semana.personas[t.nomina].dias[dia.idx] : null;
        const q = (texto) => problemas.push({ dia: dia.idx, nomina: t.nomina, texto: dia.nombre + ' · ' + nom(t.nomina) + ' (C' + t.caja + ' ' + rangoLargo(t.ini, t.fin) + '): ' + texto });
        if (!d || d.estado !== 'TRABAJA') q('ese día no trabaja según GIRHA (' + (d ? d.texto : 'sin horario') + ').');
        else if (t.ini < d.ini || t.fin > d.fin) q('el turno sale de su horario GIRHA (' + rangoLargo(d.ini, d.fin) + ').');
        const dur = t.fin - t.ini;
        if (t.ini < dia.ab || t.fin > dia.ci) q('sale del horario de la tienda (' + rangoLargo(dia.ab, dia.ci) + ').');
        const s = r(t.nomina);
        s.horas += dur;
        s['c' + t.caja]++;
        if (t.fin === dia.ci) s.cierres++;
        if (FIN_DE_SEMANA.has(dia.cod)) s.finde++;
      });
      Object.keys(porPersona).forEach((n) => {
        r(n).dias++;
        // Un turno puede ir en dos tramos seguidos (entra en Caja 2 y pasa a Caja 1): cuenta como uno.
        const tramos = porPersona[n].slice().sort((a, b) => a.ini - b.ini);
        const unidos = [];
        tramos.forEach((t) => { const u = unidos[unidos.length - 1]; if (u && u.fin === t.ini) u.fin = t.fin; else unidos.push({ ini: t.ini, fin: t.fin, caja: t.caja }); });
        if (unidos.length > 1) problemas.push({ dia: dia.idx, nomina: n, texto: dia.nombre + ' · ' + nom(n) + ' tiene ' + unidos.length + ' turnos de caja; solo se permite 1 por día.' });
        unidos.forEach((u) => {
          const dur = u.fin - u.ini;
          const q = (texto) => problemas.push({ dia: dia.idx, nomina: n, texto: dia.nombre + ' · ' + nom(n) + ' (' + rangoLargo(u.ini, u.fin) + '): ' + texto });
          // Un turno más corto que el mínimo solo se permite si cubre todo lo que le queda a la tienda.
          if (dur < min && !(dur === dia.ci - dia.ab)) q('dura ' + horasTxt(dur) + ', menos del mínimo de ' + config.turnoMin + ' h.');
          if (dur > max) q('dura ' + horasTxt(dur) + ', más del máximo de ' + config.turnoMax + ' h.');
        });
      });
      [1, 2].forEach((caja) => {
        const ts = dia.turnos.filter((t) => t.caja === caja).sort((a, b) => a.ini - b.ini);
        for (let i = 1; i < ts.length; i++) {
          if (ts[i].ini < ts[i - 1].fin) problemas.push({ dia: dia.idx, texto: dia.nombre + ' · Caja ' + caja + ': ' + nom(ts[i - 1].nomina) + ' y ' + nom(ts[i].nomina) + ' se enciman de ' + aHora(ts[i].ini) + ' a ' + aHora(Math.min(ts[i].fin, ts[i - 1].fin)) + '.' });
        }
        const sinCajero = libres(dia.ab, dia.ci, ts);
        // En Caja 2, lo que cubre un vendedor de piso ya no es hueco; solo queda donde no hay nadie.
        const faltan = caja === 1 ? sinCajero : piso[dia.idx].filter((x) => !x.nomina);
        faltan.forEach((g) => {
          const sug = catalogo.map((p) => normNomina(p.nomina)).filter((n) => {
            const d = disponible(semana, n, dia.idx);
            return d && d.ini < g.fin && d.fin > g.ini && !porPersona[n];
          }).map((n) => {
            const d = disponible(semana, n, dia.idx);
            const usa = rol.dias.filter((x) => x.turnos.some((t) => t.nomina === n)).length;
            return { nomina: n, completo: d.ini <= g.ini && d.fin >= g.fin, marcado: seleccion.has(n), dias: usa, girha: d.texto };
          }).filter((s) => s.dias < config.maxDias)
            .sort((a, b) => (b.completo - a.completo) || (a.dias - b.dias));
          // Hueco de Caja 2 en horas tranquilas: según ventas basta la Caja 1.
          let tranquilo = caja === 2 && !!demanda;
          if (tranquilo) for (let h = Math.floor(g.ini / 60); h * 60 < g.fin; h++) if (nivelCajas(cargaHora(demanda, dia.cod, h), config.capacidad, config.caja3) >= 2) tranquilo = false;
          // Quién está en tienda a esa hora (para explicar por qué nadie puede cubrir).
          const presentes = catalogo.map((p) => normNomina(p.nomina)).filter((n) => {
            const d = disponible(semana, n, dia.idx);
            return d && d.ini < g.fin && d.fin > g.ini;
          }).map((n) => ({ nomina: n, dias: rol.dias.filter((x) => x.turnos.some((t) => t.nomina === n)).length, hoy: porPersona[n] ? porPersona[n][0].caja : 0 }));
          huecos.push({ dia: dia.idx, caja, ini: g.ini, fin: g.fin, sugerencias: sug, tranquilo, presentes });
        });
      });
      dia.apoyos.forEach((a) => {
        if (!a.nomina) return;
        r(a.nomina).apoyos++;
        const d = disponible(semana, a.nomina, dia.idx);
        if (!d || d.ini > a.ini || d.fin < a.fin) problemas.push({ dia: dia.idx, nomina: a.nomina, texto: dia.nombre + ' · Apoyo Caja 3 ' + rangoLargo(a.ini, a.fin) + ': ' + nom(a.nomina) + ' no está en piso a esa hora según GIRHA.' });
        else if (enCaja(dia, a.nomina, a.ini, a.fin)) problemas.push({ dia: dia.idx, nomina: a.nomina, texto: dia.nombre + ' · Apoyo Caja 3 ' + rangoLargo(a.ini, a.fin) + ': ' + nom(a.nomina) + ' ya está en Caja 1 o Caja 2 a esa hora.' });
      });
    });
    Object.keys(resumen).forEach((n) => {
      if (resumen[n].dias > config.maxDias) problemas.push({ nomina: n, texto: nom(n) + ' tiene ' + resumen[n].dias + ' días en Caja 1/Caja 2; el máximo es ' + config.maxDias + '.' });
    });
    huecos.forEach((h) => {
      const dia = rol.dias[h.dia];
      problemas.push({ dia: h.dia, hueco: true, tranquilo: !!h.tranquilo, texto: dia.nombre + ' · Caja ' + h.caja + ' sin cubrir de ' + aHora(h.ini) + ' a ' + aHora(h.fin) + (h.tranquilo ? ': hora tranquila, según ventas basta la Caja 1.' : ': quedan menos de 2 cajas abiertas.') });
    });
    const sinApoyo = [];
    rol.dias.forEach((d) => d.apoyos.forEach((a) => { if (!a.nomina) sinApoyo.push({ dia: d.idx, ini: a.ini, fin: a.fin }); }));
    sinApoyo.forEach((a) => problemas.push({ dia: a.dia, texto: rol.dias[a.dia].nombre + ' · Hora pico ' + rangoLargo(a.ini, a.fin) + ': no hay vendedor en piso para abrir Caja 3.' }));
    return { problemas, huecos, resumen, sinApoyo, piso };
  }

  // Cuántos turnos se necesitan contra cuántos alcanzan con la gente marcada.
  function capacidadSemana(semana, seleccion, config) {
    let necesarios = 0;
    DIAS.forEach((_, i) => {
      const { ab, ci } = horarioDia(config, i);
      necesarios += 2 * Math.ceil((ci - ab) / (config.turnoMax * 60));
    });
    let posibles = 0;
    (seleccion || []).map(normNomina).forEach((n) => {
      if (!semana.personas[n]) return;
      const dias = semana.personas[n].dias.filter((d) => d.estado === 'TRABAJA').length;
      posibles += Math.min(config.maxDias, dias);
    });
    return { necesarios, posibles, alcanza: posibles >= necesarios };
  }

  return {
    DIAS, FIN_DE_SEMANA, COLORES,
    configInicial, aMin, aHora, corta, rangoCorto, rangoLargo, horasTxt,
    parseFecha, parseHora, diaSemana, sumarDias, inicioSemana, fechaCorta,
    normNomina, normalizarClave, leerGirha, armarSemana, disponible,
    procesarVentas, cargaHora, nivelCajas, horasPico, cajaPiso, cargaSemana, minutosEnTienda,
    generarRol, calcularApoyos, validarRol, capacidadSemana, nombreDe, enPiso,
  };
});
