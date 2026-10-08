/* Rol de Cajas – Ferre Mina · pantallas */
(function () {
  'use strict';
  const C = window.RolCore;
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const CLAVE = 'rolCajasMina.v1';

  const PESTANAS = [
    { id: 'personal', txt: '1 · Personal' },
    { id: 'girha', txt: '2 · GIRHA' },
    { id: 'semana', txt: '3 · Vendedores' },
    { id: 'ventas', txt: '4 · Ventas' },
    { id: 'parametros', txt: '5 · Parámetros' },
    { id: 'rol', txt: '6 · Rol' },
    { id: 'dia', txt: '7 · Por día' },
  ];

  // ------------------------------------------------------------- estado
  let S = {
    tab: 'personal',
    catalogo: [],
    config: C.configInicial(),
    girha: null, // { nombre, filas }
    semanaSel: null,
    seleccion: [],
    ventas: null, // { nombre, demanda }
    rol: null,
    diaVista: 0,
  };
  let G = null; // resultado de leer GIRHA con el catálogo actual
  let SEM = null; // semana armada
  let sapTmp = null; // archivo de ventas en espera de elegir columnas
  // Histórico de ventas por hora que ya viene con la app (js/historico.js).
  const HIST = (typeof window !== 'undefined' && window.HISTORICO_VENTAS) || null;
  // Si no hay un reporte subido a mano, se usa el histórico. Siempre se toma la versión incluida más reciente.
  function ventasPorDefecto() {
    if (HIST && (!S.ventas || S.ventas.historico)) S.ventas = { nombre: HIST.nombre, demanda: HIST.demanda, historico: true };
  }
  const conPesos = (dem) => !!dem && !dem.sinImporte;

  function guardar() {
    try { localStorage.setItem(CLAVE, JSON.stringify(S)); } catch (e) { /* sin almacenamiento: no pasa nada */ }
  }
  function cargar() {
    try {
      const t = localStorage.getItem(CLAVE);
      if (t) S = Object.assign(S, JSON.parse(t));
      S.config = migrarConfig(S.config);
    } catch (e) { /* ignorar */ }
  }

  // Parámetros guardados con versiones anteriores (en el navegador o en un catálogo exportado):
  // antes la capacidad inicial era 30 tickets por caja; se bajó a 20 al revisar el cálculo con el histórico.
  function migrarConfig(cfg) {
    const vieja = !cfg || !(cfg.version >= 2);
    const c = Object.assign(C.configInicial(), cfg);
    if (vieja && c.capacidad === 30) c.capacidad = 20;
    c.version = C.configInicial().version;
    return c;
  }

  function aviso(txt) {
    const el = $('#aviso');
    el.textContent = txt;
    el.hidden = false;
    clearTimeout(aviso.t);
    aviso.t = setTimeout(() => { el.hidden = true; }, 3500);
  }

  function recalcularSemana() {
    G = null; SEM = null;
    if (!S.girha || !S.catalogo.length) return;
    G = C.leerGirha(S.girha.filas, S.catalogo);
    if (!G.semanas.length) return;
    if (!G.semanas.includes(S.semanaSel)) S.semanaSel = G.semanas[0];
    SEM = C.armarSemana(G.registros, S.semanaSel, S.catalogo);
  }

  const persona = (n) => S.catalogo.find((p) => C.normNomina(p.nomina) === n);
  const nombre = (n) => (persona(n) ? persona(n).nombre : 'Nómina ' + n);
  const color = (n) => (persona(n) ? persona(n).color : '#dddddd');
  function textoSobre(bg) {
    const c = (bg || '#ffffff').replace('#', '');
    const r = parseInt(c.substr(0, 2), 16), g = parseInt(c.substr(2, 2), 16), b = parseInt(c.substr(4, 2), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? '#1d2733' : '#ffffff';
  }
  const chipPersona = (n) => '<span class="persona"><i style="background:' + esc(color(n)) + '"></i>' + esc(nombre(n)) + '</span>';
  const nominasCatalogo = () => S.catalogo.map((p) => C.normNomina(p.nomina));
  function opts() { return { semana: SEM, catalogo: S.catalogo, config: S.config, seleccion: S.seleccion, demanda: S.ventas ? S.ventas.demanda : null }; }
  function rolVigente() { return S.rol && SEM && S.rol.semana === SEM.inicio ? S.rol : null; }

  // ------------------------------------------------------------ lectura
  function leerArchivo(file) {
    return new Promise((ok, mal) => {
      const r = new FileReader();
      const csv = /\.csv$/i.test(file.name);
      r.onload = () => {
        try {
          const wb = csv ? XLSX.read(r.result, { type: 'string', raw: true }) : XLSX.read(new Uint8Array(r.result), { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          ok(XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' }));
        } catch (e) { mal(e); }
      };
      r.onerror = () => mal(r.error);
      if (csv) r.readAsText(file, 'utf-8'); else r.readAsArrayBuffer(file);
    });
  }

  // ------------------------------------------------------------ pestañas
  function estadoPaso(id) {
    switch (id) {
      case 'personal': return S.catalogo.length ? 'ok' : '';
      case 'girha': return SEM ? (SEM.avisos.length ? 'alerta' : 'ok') : '';
      case 'semana': return SEM && S.seleccion.length ? 'ok' : '';
      case 'ventas': return S.ventas ? 'ok' : '';
      case 'parametros': return 'ok';
      case 'rol': {
        const rol = rolVigente();
        if (!rol) return '';
        return C.validarRol(rol, opts()).problemas.length ? 'alerta' : 'ok';
      }
      default: return rolVigente() ? 'ok' : '';
    }
  }
  function pintarPestanas() {
    $('#pestanas').innerHTML = PESTANAS.map((p) => {
      const e = estadoPaso(p.id);
      return '<button type="button" role="tab" data-tab="' + p.id + '" aria-selected="' + (S.tab === p.id) + '">' + p.txt + '<span class="punto ' + e + '"></span></button>';
    }).join('');
    PESTANAS.forEach((p) => { $('#tab-' + p.id).hidden = S.tab !== p.id; });
  }
  function ir(tab) { S.tab = tab; guardar(); pintar(); window.scrollTo(0, 0); }

  function pintar() {
    pintarPestanas();
    ({ personal: pintarPersonal, girha: pintarGirha, semana: pintarSemana, ventas: pintarVentas, parametros: pintarParametros, rol: pintarRol, dia: pintarDia })[S.tab]();
  }

  // ------------------------------------------------------------ 1. personal
  function pintarPersonal() {
    const cuerpo = $('#personal-cuerpo');
    if (!S.catalogo.length) {
      cuerpo.innerHTML = '<div class="caja-aviso info">Todavía no hay personal. Importa tu catálogo, agrega personas una por una, o usa <b>Probar con datos de ejemplo</b> para ver cómo funciona.</div>';
      return;
    }
    const cuenta = {};
    S.catalogo.forEach((p) => { const n = C.normNomina(p.nomina); cuenta[n] = (cuenta[n] || 0) + 1; });
    const dup = Object.keys(cuenta).filter((n) => cuenta[n] > 1 && n);
    cuerpo.innerHTML =
      (dup.length ? '<div class="caja-aviso error">Nómina repetida: ' + dup.map(esc).join(', ') + '. Corrígela para que la app no se confunda.</div>' : '') +
      '<div class="chips"><span class="chip"><b>' + S.catalogo.length + '</b> personas en Ferre Mina</span></div>' +
      '<div class="desliza"><table><thead><tr><th>Color</th><th>Nómina</th><th>Nombre corto</th><th></th></tr></thead><tbody>' +
      S.catalogo.map((p, i) => '<tr>' +
        '<td><input type="color" data-i="' + i + '" data-campo="color" value="' + esc(p.color) + '" aria-label="Color"></td>' +
        '<td><input type="text" inputmode="numeric" data-i="' + i + '" data-campo="nomina" value="' + esc(p.nomina) + '" size="10" aria-label="Nómina"></td>' +
        '<td><input type="text" data-i="' + i + '" data-campo="nombre" value="' + esc(p.nombre) + '" size="16" aria-label="Nombre corto"></td>' +
        '<td class="centro"><button class="btn chico" data-borrar="' + i + '" type="button">🗑️ Quitar</button></td></tr>').join('') +
      '</tbody></table></div>';
  }

  function exportarCatalogo() {
    const datos = { tipo: 'catalogo-rol-cajas', version: 1, sucursal: 'Ferre Mina', personal: S.catalogo, parametros: S.config };
    const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'catalogo_ferre_mina.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  async function importarCatalogo(file) {
    try {
      const d = JSON.parse(await file.text());
      const lista = Array.isArray(d) ? d : d.personal;
      if (!Array.isArray(lista)) throw new Error('formato');
      S.catalogo = lista.map((p, i) => ({ nomina: String(p.nomina || '').trim(), nombre: String(p.nombre || '').trim(), color: p.color || C.COLORES[i % C.COLORES.length] }));
      if (d.parametros) S.config = migrarConfig(d.parametros);
      recalcularSemana();
      guardar(); pintar();
      aviso('Catálogo cargado: ' + S.catalogo.length + ' personas.');
    } catch (e) { aviso('Ese archivo no parece un catálogo válido.'); }
  }

  async function cargarEjemplo() {
    if (location.protocol === 'file:') {
      alert('Para cargar el ejemplo automáticamente la app debe estar publicada (GitHub Pages o Vercel).\n\nDesde tu computadora, sube a mano los archivos de la carpeta "ejemplos": catalogo_ferre_mina.json, girha_ejemplo.xlsx y sap_ventas_ejemplo.xlsx.');
      return;
    }
    if (S.catalogo.length && !confirm('Esto reemplaza tu catálogo y archivos actuales por los de ejemplo. ¿Continuar?')) return;
    try {
      aviso('Cargando ejemplo…');
      const cat = await (await fetch('ejemplos/catalogo_ferre_mina.json')).json();
      S.catalogo = cat.personal;
      const g = await (await fetch('ejemplos/girha_ejemplo.xlsx')).arrayBuffer();
      const wb = XLSX.read(new Uint8Array(g), { type: 'array' });
      S.girha = { nombre: 'girha_ejemplo.xlsx', filas: XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: '' }) };
      S.semanaSel = null;
      S.rol = null;
      recalcularSemana();
      S.seleccion = nominasCatalogo();
      const sap = await (await fetch('ejemplos/sap_ventas_ejemplo.xlsx')).arrayBuffer();
      const wb2 = XLSX.read(new Uint8Array(sap), { type: 'array' });
      const filas = XLSX.utils.sheet_to_json(wb2.Sheets[wb2.SheetNames[0]], { header: 1, raw: true, defval: '' });
      S.ventas = { nombre: 'sap_ventas_ejemplo.xlsx', demanda: C.procesarVentas(filas.slice(1), { fecha: 0, hora: 1, ticket: 2, importe: 6 }) };
      guardar();
      ir('girha');
      aviso('Ejemplo cargado. Revisa cada paso y genera el rol en "3 · Vendedores".');
    } catch (e) { aviso('No se pudo cargar el ejemplo.'); }
  }

  // ------------------------------------------------------------ 2. GIRHA
  function pintarGirha() {
    const cuerpo = $('#girha-cuerpo');
    if (!S.catalogo.length) { cuerpo.innerHTML = '<div class="caja-aviso alerta">Primero carga el personal de Ferre Mina (paso 1). Sin catálogo la app no sabe quién es de esta sucursal.</div>'; return; }
    if (!S.girha) { cuerpo.innerHTML = '<div class="caja-aviso info">Aún no has subido el archivo de GIRHA.</div>'; return; }
    if (!G || !G.semanas.length) { cuerpo.innerHTML = '<div class="caja-aviso error">En <b>' + esc(S.girha.nombre) + '</b> no se encontró a nadie del catálogo con fechas válidas. Revisa que las nóminas coincidan.</div>'; return; }
    const encontrados = Object.keys(SEM.personas).filter((n) => SEM.personas[n].dias.some((d) => d.estado !== 'FALTA')).length;
    let h = '<div class="chips">' +
      '<span class="chip">Archivo: <b>' + esc(S.girha.nombre) + '</b></span>' +
      '<span class="chip"><b>' + encontrados + '</b> de ' + S.catalogo.length + ' personas de Ferre Mina</span>' +
      '<span class="chip"><b>' + G.ignorados + '</b> de otras sucursales (ignoradas)</span></div>';
    if (G.semanas.length > 1) {
      h += '<label class="campo" style="max-width:320px;margin-bottom:12px">Semana a usar<select id="sel-semana">' +
        G.semanas.map((s) => '<option value="' + s + '"' + (s === S.semanaSel ? ' selected' : '') + '>Jueves ' + C.fechaCorta(s) + ' a miércoles ' + C.fechaCorta(C.sumarDias(s, 6)) + '</option>').join('') + '</select></label>';
    }
    const avisos = G.avisos.concat(SEM.avisos.map((a) => '<b>' + esc(nombre(a.nomina)) + '</b> ' + esc(a.texto)));
    h += avisos.length
      ? '<div class="caja-aviso alerta"><b>Revisa esto antes de seguir:</b><ul>' + avisos.map((a) => '<li>' + a + '</li>').join('') + '</ul></div>'
      : '<div class="caja-aviso ok">✔ Todos tienen sus 7 días (jueves a miércoles).</div>';
    h += tablaSemana(false);
    h += '<div class="acciones" style="margin-top:14px"><button class="btn pri" type="button" data-ir="semana">Siguiente: elegir vendedores →</button></div>';
    cuerpo.innerHTML = h;
  }

  function celdaGirha(d) {
    if (d.estado === 'TRABAJA') return '<span class="hor">' + C.rangoCorto(d.ini, d.fin) + '</span>';
    if (d.estado === 'FALTA') return '<span class="estado-FALTA">FALTA</span>';
    return '<span class="estado-' + d.estado + '">' + esc(d.texto) + '</span>';
  }

  function tablaSemana(conCheck) {
    const sel = new Set(S.seleccion);
    return '<div class="desliza"><table><thead><tr>' + (conCheck ? '<th class="centro">Caja</th>' : '') + '<th>Vendedor</th>' +
      C.DIAS.map((d, i) => '<th class="centro">' + d.nombre.slice(0, 3) + '<br><small>' + C.fechaCorta(SEM.fechas[i]) + '</small></th>').join('') +
      '<th class="centro">Días</th></tr></thead><tbody>' +
      nominasCatalogo().map((n) => {
        const dias = SEM.personas[n].dias;
        const trabaja = dias.filter((d) => d.estado === 'TRABAJA').length;
        return '<tr>' + (conCheck ? '<td class="centro"><input type="checkbox" data-sel="' + esc(n) + '"' + (sel.has(n) ? ' checked' : '') + ' aria-label="Entra a caja" style="width:22px;height:22px"></td>' : '') +
          '<td>' + chipPersona(n) + '</td>' + dias.map((d) => '<td class="centro">' + celdaGirha(d) + '</td>').join('') +
          '<td class="centro">' + trabaja + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  // ------------------------------------------------------------ 3. semana
  function pintarSemana() {
    const cuerpo = $('#semana-cuerpo');
    if (!SEM) { cuerpo.innerHTML = '<div class="caja-aviso alerta">Primero sube el archivo de GIRHA (paso 2).</div>'; return; }
    const cap = C.capacidadSemana(SEM, S.seleccion, S.config);
    const porDia = C.DIAS.map((d, i) => S.seleccion.filter((n) => C.disponible(SEM, n, i)).length);
    let h = '<div class="caja-aviso ' + (cap.alcanza ? 'ok' : 'alerta') + '">' +
      '<b>¿Alcanza la gente?</b> Para tener Caja 1 y Caja 2 abiertas toda la semana se necesitan <b>al menos ' + cap.necesarios + ' turnos</b> (de máximo ' + S.config.turnoMax + ' h). ' +
      'Con los <b>' + S.seleccion.length + '</b> vendedores marcados alcanzan para <b>' + cap.posibles + ' turnos</b> (máximo ' + S.config.maxDias + ' días cada uno). ' +
      (cap.alcanza ? '✔ Sí alcanza.' : 'No alcanza: la app cubrirá primero la Caja 1 y marcará en rojo las horas de Caja 2 que falten. Para cerrar la diferencia, marca a más vendedores o sube el máximo de días en Parámetros.') + '</div>';
    h += '<div class="chips">' + C.DIAS.map((d, i) => '<span class="chip">' + d.nombre.slice(0, 3) + ': <b>' + porDia[i] + '</b> disponibles</span>').join('') + '</div>';
    h += '<div class="acciones"><button class="btn" type="button" id="btn-todos">☑️ Marcar todos</button><button class="btn" type="button" id="btn-ninguno">⬜ Quitar todos</button></div>';
    h += tablaSemana(true);
    h += '<div class="acciones" style="margin-top:14px"><button class="btn pri" type="button" id="btn-generar">⚙️ Generar rol</button>' +
      (S.ventas ? '' : '<span class="ayuda" style="margin:0;align-self:center">Sin reporte de ventas: los apoyos de Caja 3 se calculan después.</span>') + '</div>';
    cuerpo.innerHTML = h;
  }

  function generar() {
    if (!SEM) { aviso('Primero sube el archivo de GIRHA.'); return; }
    if (!S.seleccion.length) { aviso('Marca al menos a un vendedor.'); return; }
    const previo = rolVigente();
    if (previo && previo.dias.some((d) => d.turnos.some((t) => t.manual) || d.apoyos.some((a) => a.manual)) &&
      !confirm('Tienes cambios hechos a mano en el rol. Si lo generas de nuevo se pierden. ¿Continuar?')) return;
    S.rol = C.generarRol(opts());
    guardar();
    ir('rol');
    aviso(previo ? 'Rol generado de nuevo con las ventas y parámetros actuales.' : 'Rol generado. Toca cualquier celda para ver por qué se asignó.');
  }

  // ------------------------------------------------------------ 4. ventas
  // Prueba los patrones en orden (el más específico primero) y no repite columnas.
  function adivinar(titulos, patrones, usadas) {
    for (const p of patrones) {
      const i = titulos.findIndex((t, k) => !(usadas || []).includes(k) && p.test(String(t)));
      if (i >= 0) return i;
    }
    return -1;
  }

  function pintarVentas() {
    const cuerpo = $('#ventas-cuerpo');
    let h = '';
    if (sapTmp) {
      const t = sapTmp.filas[sapTmp.filaTitulos] || [];
      const opcion = (sel, extra) => (extra || '') + t.map((x, i) => '<option value="' + i + '"' + (i === sel ? ' selected' : '') + '>' + esc(String(x || 'Columna ' + (i + 1))) + '</option>').join('');
      h += '<div class="caja-aviso info"><b>' + esc(sapTmp.nombre) + '</b>: ' + (sapTmp.filas.length - sapTmp.filaTitulos - 1) + ' renglones. Indica qué columna es cada dato (ya elegí las que parecen correctas):</div>' +
        '<div class="rejilla">' +
        '<label class="campo">Fila de títulos<select id="sap-titulos">' + sapTmp.filas.slice(0, 15).map((f, i) => '<option value="' + i + '"' + (i === sapTmp.filaTitulos ? ' selected' : '') + '>Fila ' + (i + 1) + ': ' + esc(f.slice(0, 4).join(' | ')) + '</option>').join('') + '</select></label>' +
        '<label class="campo">Fecha<select id="sap-fecha">' + opcion(sapTmp.cols.fecha) + '</select></label>' +
        '<label class="campo">Hora<select id="sap-hora">' + opcion(sapTmp.cols.hora, '<option value="-1"' + (sapTmp.cols.hora < 0 ? ' selected' : '') + '>(la fecha ya trae la hora)</option>') + '</select></label>' +
        '<label class="campo">Número de ticket<select id="sap-ticket">' + opcion(sapTmp.cols.ticket) + '</select></label>' +
        '<label class="campo">Importe (opcional)<select id="sap-importe">' + opcion(sapTmp.cols.importe, '<option value="-1"' + (sapTmp.cols.importe < 0 ? ' selected' : '') + '>(no tiene)</option>') + '</select></label>' +
        '</div>' +
        '<h3>Vista previa</h3><div class="desliza"><table><thead><tr>' + t.map((x) => '<th>' + esc(x) + '</th>').join('') + '</tr></thead><tbody>' +
        sapTmp.filas.slice(sapTmp.filaTitulos + 1, sapTmp.filaTitulos + 6).map((f) => '<tr>' + f.map((x) => '<td>' + esc(x) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>' +
        '<div class="acciones" style="margin-top:14px"><button class="btn pri" type="button" id="btn-sap-calc">📈 Calcular cajas por hora</button><button class="btn" type="button" id="btn-sap-cancel">Cancelar</button></div>';
      cuerpo.innerHTML = h;
      return;
    }
    if (S.ventas && S.ventas.historico) h += '<div class="caja-aviso info"><b>Ya no necesitas subir ventas.</b> La app trae el histórico de un año de Ferre Mina y con él calcula las cajas por hora. Solo sube un reporte si quieres usar ventas más recientes.</div>';
    if (!S.ventas) {
      cuerpo.innerHTML = '<div class="caja-aviso info">Aún no hay reporte de ventas. No pasa nada: el rol de Caja 1 y Caja 2 se arma igual. Solo faltarán el mapa de calor y los apoyos de Caja 3.</div>';
      return;
    }
    const i = S.ventas.demanda.info;
    h += '<div class="chips"><span class="chip">' + (S.ventas.historico ? 'Histórico incluido' : 'Archivo') + ': <b>' + esc(S.ventas.nombre) + '</b></span>' +
      '<span class="chip"><b>' + i.ticketsUnicos.toLocaleString('es-MX') + '</b> tickets únicos</span>' +
      '<span class="chip">del <b>' + C.fechaCorta(i.desde) + '</b> al <b>' + C.fechaCorta(i.hasta) + '</b> (' + i.semanas + ' semanas)</span>' +
      (i.descartadas ? '<span class="chip">' + i.descartadas + ' renglones sin fecha/hora/ticket (ignorados)</span>' : '') + '</div>';
    h += mapaCalor();
    h += '<div class="acciones" style="margin-top:14px">' + (rolVigente() ? '<button class="btn pri" type="button" id="btn-apoyos2">🔁 Actualizar apoyos Caja 3 en el rol</button>' : '') +
      (S.ventas.historico ? '' : '<button class="btn" type="button" id="btn-sap-quitar">' + (HIST ? '↩️ Volver al histórico incluido' : '🗑️ Quitar reporte de ventas') + '</button>') + '</div>';
    cuerpo.innerHTML = h;
  }

  function mapaCalor() {
    const d = S.ventas.demanda;
    const cap = S.config.capacidad;
    const hs = C.DIAS.map((_, i) => ({ ab: C.aMin(S.config.horario[C.DIAS[i].cod].ab), ci: C.aMin(S.config.horario[C.DIAS[i].cod].ci) }));
    const h0 = Math.floor(Math.min(...hs.map((x) => x.ab)) / 60), h1 = Math.ceil(Math.max(...hs.map((x) => x.ci)) / 60);
    let h = '<h3>¿Cuántas cajas abrir? (tickets por hora en un día cargado)</h3>' +
      '<p class="ayuda">El número de cada cuadro es lo que se cobra en esa hora en un <b>día cargado</b>: 8 de cada 10 días se cobra eso o menos. Se planea con ese número y no con el promedio, porque con el promedio la tienda queda corta la mitad de los días. Pasa el cursor por un cuadro para ver también el promedio.</p>' +
      '<p class="leyenda"><span><span class="muestra n1"></span><b>1 caja</b>: basta Caja 1, Caja 2 en piso</span><span><span class="muestra n2"></span><b>2 cajas</b>: Caja 2 se queda cobrando</span><span><span class="muestra n3"></span><b>3 cajas</b>: desde ' + S.config.caja3 + ' tickets por hora, abrir Caja 3 con apoyo</span><span>Una caja atiende ' + cap + ' tickets por hora sin fila (se cambia en Parámetros)</span></p>' +
      '<div class="desliza"><table class="calor"><thead><tr><th class="dia">Día</th>';
    for (let x = h0; x < h1; x++) h += '<th>' + C.corta(x * 60) + '</th>';
    h += '</tr></thead><tbody>';
    C.DIAS.forEach((dia, i) => {
      h += '<tr><th class="dia">' + dia.nombre + '</th>';
      for (let x = h0; x < h1; x++) {
        const abierta = x * 60 >= hs[i].ab - 59 && x * 60 < hs[i].ci;
        const prom = d.tickets[dia.cod][x] || 0;
        const t = C.cargaHora(d, dia.cod, x);
        const pesos = d.importe[dia.cod][x] || 0;
        if (!abierta) { h += '<td class="n0">–</td>'; continue; }
        const n = C.nivelCajas(t, cap, S.config.caja3);
        h += '<td class="n' + n + '" title="' + dia.nombre + ' ' + x + ':00 · día cargado: ' + Math.round(t) + ' tickets · promedio: ' + prom.toFixed(1) + (conPesos(d) ? ' · $' + Math.round(pesos).toLocaleString('es-MX') : '') + '">' + Math.round(t) + (conPesos(d) ? '<small>$' + (pesos >= 1000 ? (pesos / 1000).toFixed(1) + 'k' : Math.round(pesos)) + '</small>' : '') + '</td>';
      }
      h += '</tr>';
    });
    return h + '</tbody></table></div>';
  }

  function prepararSap(nombreArchivo, filas) {
    let ft = filas.findIndex((f) => f.filter((x) => typeof x === 'string' && x.trim() && isNaN(x)).length >= 3);
    if (ft < 0 || ft > 14) ft = 0;
    sapTmp = { nombre: nombreArchivo, filas, filaTitulos: ft, cols: {} };
    adivinarColumnas();
  }
  function adivinarColumnas() {
    const t = (sapTmp.filas[sapTmp.filaTitulos] || []).map((x) => String(x).toLowerCase());
    const fecha = Math.max(0, adivinar(t, [/fecha/, /date/, /d[ií]a/]));
    const hora = adivinar(t, [/hora/, /time/], [fecha]);
    const ticket = adivinar(t, [/ticket/, /folio/, /n[uú]m.*doc/, /documento/, /factura/, /nota/, /doc/, /n[uú]m/], [fecha, hora]);
    const importe = adivinar(t, [/importe/, /total/, /monto/, /venta/, /neto/], [fecha, hora, ticket]);
    sapTmp.cols = { fecha, hora, ticket: Math.max(0, ticket), importe };
  }

  // ------------------------------------------------------------ 5. parámetros
  function pintarParametros() {
    const c = S.config;
    $('#parametros-cuerpo').innerHTML =
      '<h3>Horario de la tienda</h3><div class="desliza" style="max-width:520px"><table><thead><tr><th>Día</th><th>Abre</th><th>Cierra</th></tr></thead><tbody>' +
      C.DIAS.map((d) => '<tr><td>' + d.nombre + '</td><td><input type="time" step="1800" data-hor="' + d.cod + '" data-lado="ab" value="' + esc(c.horario[d.cod].ab) + '"></td><td><input type="time" step="1800" data-hor="' + d.cod + '" data-lado="ci" value="' + esc(c.horario[d.cod].ci) + '"></td></tr>').join('') +
      '</tbody></table></div>' +
      '<h3>Reglas de caja</h3><div class="rejilla">' +
      '<label class="campo">Días máximos en Caja 1 / Caja 2 por vendedor<input type="number" min="1" max="7" data-par="maxDias" value="' + c.maxDias + '"></label>' +
      '<label class="campo">Turno mínimo (horas)<input type="number" min="1" max="12" step="0.5" data-par="turnoMin" value="' + c.turnoMin + '"></label>' +
      '<label class="campo">Turno máximo (horas)<input type="number" min="1" max="12" step="0.5" data-par="turnoMax" value="' + c.turnoMax + '"></label>' +
      '<label class="campo">Bloques de<select data-par="paso"><option value="30"' + (c.paso === 30 ? ' selected' : '') + '>media hora</option><option value="60"' + (c.paso === 60 ? ' selected' : '') + '>hora completa</option></select></label>' +
      '<label class="campo">Tickets por hora que atiende una caja sin que se haga fila<input type="number" min="1" max="500" data-par="capacidad" value="' + c.capacidad + '"></label>' +
      '<label class="campo">Tickets por hora para abrir Caja 3 (apoyo)<input type="number" min="1" max="500" data-par="caja3" value="' + c.caja3 + '"></label>' +
      '</div><p class="ayuda" style="margin-top:10px"><b>¿Por qué 20?</b> Cobrando sin parar, una caja saca unos 40 tickets por hora, pero los clientes llegan en grupos y entre uno y otro hay espera. En el año de historia, la tienda ya puso a cobrar la segunda caja en más de la mitad de las horas con 15 a 20 tickets. Si ves fila con una sola caja, baja el número; si la segunda caja se queda sin clientes, súbelo.<br><b>¿Por qué 55 para la Caja 3?</b> En el año de historia una caja casi nunca pasó de 28 a 29 tickets en una hora; con las dos a ese ritmo se atienden unos 55. Solo arriba de eso se pide la Caja 3, y pasa casi únicamente los domingos a mediodía.</p>' +
      '<div class="acciones" style="margin-top:16px"><button class="btn" type="button" id="btn-restaurar">↩️ Restaurar valores iniciales</button></div>';
  }

  // ------------------------------------------------------------ 6. rol
  function problemasDe(V, dia, n) {
    return V.problemas.filter((p) => p.dia === dia && p.nomina === n);
  }

  function pintarRol() {
    const cuerpo = $('#rol-cuerpo');
    const rol = rolVigente();
    if (!rol) {
      cuerpo.innerHTML = '<div class="caja-aviso info">Todavía no hay rol para esta semana. Ve a <b>3 · Vendedores</b>, marca quién entra a caja y presiona <b>Generar rol</b>.</div>';
      return;
    }
    const V = C.validarRol(rol, opts());
    const filas = nominasCatalogo().filter((n) => S.seleccion.includes(n) || rol.dias.some((d) => d.turnos.some((t) => t.nomina === n)));
    const fin = C.sumarDias(SEM.inicio, 6);
    let h = '<div class="solo-pantalla">';
    if (!V.problemas.length) h += '<div class="caja-aviso ok">✔ El rol cumple todas las reglas.</div>';
    else {
      const huecos = V.problemas.filter((p) => p.hueco).length;
      h += '<div class="caja-aviso ' + (V.problemas.length - huecos ? 'error' : 'alerta') + '"><b>' + V.problemas.length + ' aviso(s)</b>. Los huecos en rojo muestran horas sin Caja 1 o Caja 2; tócalos para ver quién podría cubrirlos.<ul>' +
        V.problemas.slice(0, 40).map((p) => '<li>' + esc(p.texto) + '</li>').join('') + (V.problemas.length > 40 ? '<li>…</li>' : '') + '</ul></div>';
    }
    if (!rol.conVentas || !S.ventas) h += '<div class="caja-aviso info">Sin reporte de ventas: los apoyos de Caja 3 se calculan cuando lo subas (paso 4) y presiones <b>Actualizar apoyos Caja 3</b>. Mientras tanto, si no alcanza la gente, la Caja 2 se cubre primero sábado, domingo y viernes.</div>';
    else if (!rol.ordenConVentas && V.huecos.some((x) => x.caja === 2)) h += '<div class="caja-aviso info">Ya tienes el reporte de ventas y hay horas sin Caja 2. Si presionas <b>Generar rol de nuevo</b>, la Caja 2 se cubrirá primero en los días de más venta según el reporte (se pierden los cambios hechos a mano).</div>';
    h += porQueHuecos(rol, V);
    if (rol.prioriza) h += '<div class="caja-aviso info"><b>No alcanza la gente marcada para tener Caja 2 todo el día.</b> Por eso el rol puso la Caja 2 primero en las horas que piden 2 o 3 cajas según ventas, empezando cada día por sus horas más cargadas. Las horas tranquilas quedaron en amarillo: ahí basta la Caja 1. Para cubrir más, marca más vendedores en el paso 3 o sube el máximo de días en Parámetros.</div>';
    h += '</div>';

    h += '<div class="hoja"><h2 class="titulo">ROL DE CAJAS MINA</h2><p class="semana-txt">Semana del jueves ' + C.fechaCorta(SEM.inicio) + ' al miércoles ' + C.fechaCorta(fin) + '/' + fin.slice(0, 4) + '</p>';
    h += '<div class="desliza"><table class="rol"><thead><tr><th class="nombre">Vendedor</th>' +
      rol.dias.map((d) => '<th>' + d.nombre + '<small>' + C.fechaCorta(d.fecha) + ' · ' + C.rangoCorto(d.ab, d.ci) + '</small></th>').join('') +
      '<th class="cuenta">Días</th></tr></thead><tbody>';
    filas.forEach((n) => {
      const dias = V.resumen[n] ? V.resumen[n].dias : 0;
      h += '<tr><td class="nombre">' + chipPersona(n) + '</td>';
      rol.dias.forEach((d) => {
        const ts = d.turnos.filter((t) => t.nomina === n);
        const err = problemasDe(V, d.idx, n).length > 0;
        const g = SEM.personas[n].dias[d.idx];
        if (ts.length) {
          const bg = color(n);
          h += '<td style="background:' + esc(bg) + ';color:' + textoSobre(bg) + '"><button type="button" class="celda' + (err ? ' error' : '') + '" data-celda="' + d.idx + '|' + esc(n) + '">' +
            ts.map((t) => '<span class="blq">' + C.rangoCorto(t.ini, t.fin) + '</span><span class="et' + (t.caja === 2 ? ' c2' : '') + '">C' + t.caja + '</span>' + (t.manual ? ' <span class="mano" title="Editado a mano">✍️</span>' : '')).join('<br>') +
            (err ? ' ⚠️' : '') + '</button></td>';
        } else {
          const txt = g.estado === 'TRABAJA' ? '<span class="fantasma">' + C.rangoCorto(g.ini, g.fin) + '</span>' : '<span class="estado-' + g.estado + '">' + esc(g.estado === 'FALTA' ? '?' : g.texto) + '</span>';
          h += '<td' + (g.estado === 'D' || g.estado === 'NP' ? ' style="background:#eceff3"' : '') + '><button type="button" class="celda" data-celda="' + d.idx + '|' + esc(n) + '">' + txt + '</button></td>';
        }
      });
      h += '<td class="cuenta"' + (dias > S.config.maxDias ? ' style="background:#ffc7ce;color:#9c0006;font-weight:800"' : '') + '>' + dias + '/' + S.config.maxDias + '</td></tr>';
    });
    // huecos
    if (V.huecos.length) {
      h += '<tr class="fila-extra fila-hueco"><td class="nombre"><b>SIN CUBRIR</b><br>(menos de 2 cajas)</td>' + rol.dias.map((d) => '<td>' +
        V.huecos.map((x, k) => ({ x, k })).filter((o) => o.x.dia === d.idx).map((o) => '<button type="button" class="pastilla hueco' + (o.x.tranquilo ? ' tranquilo' : '') + '" title="' + (o.x.tranquilo ? 'Hora tranquila: según ventas basta la Caja 1' : 'Falta cubrir') + '" data-hueco="' + o.k + '">C' + o.x.caja + ' ' + C.rangoCorto(o.x.ini, o.x.fin) + '</button>').join('') +
        '</td>').join('') + '<td></td></tr>';
    }
    // apoyos caja 3
    h += '<tr class="fila-extra fila-apoyo"><td class="nombre"><b>APOYO CAJA 3</b><br>(horas pico)</td>';
    if (!rol.conVentas) h += '<td colspan="' + (rol.dias.length + 1) + '" style="color:#5b6878;font-size:.85rem">Se calcula con el reporte de ventas.</td>';
    else {
      h += rol.dias.map((d) => '<td>' + (d.apoyos.length ? d.apoyos.map((a, k) => {
        if (!a.nomina) return '<button type="button" class="pastilla sin" data-apoyo="' + d.idx + '|' + k + '">' + C.rangoCorto(a.ini, a.fin) + ' SIN NADIE</button>';
        const bg = color(a.nomina);
        return '<button type="button" class="pastilla apoyo" style="background:' + esc(bg) + ';color:' + textoSobre(bg) + '" data-apoyo="' + d.idx + '|' + k + '">' + C.rangoCorto(a.ini, a.fin) + ' ' + esc(nombre(a.nomina)) + (a.manual ? ' ✍️' : '') + '</button>';
      }).join('') : '<span style="color:#9aa5b3;font-size:.8rem">—</span>') + '</td>').join('') + '<td></td>';
    }
    h += '</tr></tbody></table></div>';
    h += '<p class="leyenda"><span><b>C1</b> Cajero fijo: nunca deja la caja.</span><span><b>C2</b> Cajero flotante: apoya en piso y regresa a cobrar cuando se junta fila.</span><span><b>C3</b> Apoyo solo en horas pico.</span><span>Mantenerse comunicados por radio.</span></p></div>';

    // resumen
    h += '<div class="salto"><h3>Resumen por vendedor</h3><div class="desliza"><table><thead><tr><th>Vendedor</th><th class="centro">Días C1/C2</th><th class="centro">Turnos C1</th><th class="centro">Turnos C2</th><th class="centro">Horas en caja</th><th class="centro">Cierres</th><th class="centro">Fin de semana</th><th class="centro">Apoyos C3</th></tr></thead><tbody>' +
      nominasCatalogo().filter((n) => V.resumen[n] || S.seleccion.includes(n)).map((n) => {
        const r = V.resumen[n] || { dias: 0, horas: 0, c1: 0, c2: 0, apoyos: 0, cierres: 0, finde: 0 };
        return '<tr><td>' + chipPersona(n) + (S.seleccion.includes(n) ? '' : ' <small>(no marcado)</small>') + '</td><td class="centro"' + (r.dias > S.config.maxDias ? ' style="color:#9c0006;font-weight:800"' : '') + '>' + r.dias + '/' + S.config.maxDias + '</td><td class="centro">' + r.c1 + '</td><td class="centro">' + r.c2 + '</td><td class="centro">' + C.horasTxt(r.horas) + '</td><td class="centro">' + r.cierres + '</td><td class="centro">' + r.finde + '</td><td class="centro">' + r.apoyos + '</td></tr>';
      }).join('') + '</tbody></table></div></div>';
    cuerpo.innerHTML = h;
  }

  // ------------------------------------------------------------ modal
  function opcionesHora(desde, hasta, sel) {
    let h = '';
    for (let t = desde; t <= hasta; t += S.config.paso) h += '<option value="' + t + '"' + (t === sel ? ' selected' : '') + '>' + C.aHora(t) + '</option>';
    return h;
  }
  function abrirModal(html) {
    $('#modal-cuerpo').innerHTML = html;
    const m = $('#modal');
    if (m.showModal) m.showModal(); else m.setAttribute('open', '');
  }
  function cerrarModal() { const m = $('#modal'); if (m.close) m.close(); else m.removeAttribute('open'); }

  function modalCelda(di, n) {
    const rol = rolVigente();
    const d = rol.dias[di];
    const g = SEM.personas[n].dias[di];
    const ts = d.turnos.filter((t) => t.nomina === n);
    const V = C.validarRol(rol, opts());
    const probs = problemasDe(V, di, n).concat(V.problemas.filter((p) => p.dia == null && p.nomina === n));
    const t = ts[0];
    let h = '<h3>' + chipPersona(n) + ' · ' + d.nombre + ' ' + C.fechaCorta(d.fecha) + '</h3>' +
      '<p>Horario GIRHA: <b>' + (g.estado === 'TRABAJA' ? C.rangoLargo(g.ini, g.fin) : esc(g.estado === 'FALTA' ? 'sin horario en el archivo' : g.texto + (g.estado === 'D' ? ' (descanso)' : g.estado === 'NP' ? ' (no programado)' : ''))) + '</b></p>';
    if (probs.length) h += '<div class="caja-aviso error"><ul>' + probs.map((p) => '<li>' + esc(p.texto) + '</li>').join('') + '</ul></div>';
    h += '<p class="porque"><b>¿Por qué?</b>\n' + (t ? esc(t.razon || 'Sin explicación.') : (g.estado === 'TRABAJA' ? 'No tiene turno de Caja 1 ni Caja 2 este día: está en piso de venta.' : 'No trabaja este día según GIRHA, por eso no se le asignó caja.')) + '</p>';
    h += '<h3>Cambiar a mano</h3><div class="edicion">' +
      '<label class="campo">Caja<select id="ed-caja"><option value="0">Sin caja</option><option value="1"' + (t && t.caja === 1 ? ' selected' : '') + '>Caja 1 (fija)</option><option value="2"' + (t && t.caja === 2 ? ' selected' : '') + '>Caja 2 (flotante)</option></select></label>' +
      '<label class="campo">Entra<select id="ed-ini">' + opcionesHora(d.ab, d.ci, t ? t.ini : (g.estado === 'TRABAJA' ? Math.max(g.ini, d.ab) : d.ab)) + '</select></label>' +
      '<label class="campo">Sale<select id="ed-fin">' + opcionesHora(d.ab, d.ci, t ? t.fin : (g.estado === 'TRABAJA' ? Math.min(g.fin, d.ci, Math.max(g.ini, d.ab) + S.config.turnoMax * 60) : d.ci)) + '</select></label></div>' +
      '<div class="pie-modal"><button class="btn" value="cerrar">Cerrar</button><button class="btn pri" type="button" id="ed-guardar" data-celda="' + di + '|' + esc(n) + '">Guardar cambio</button></div>';
    abrirModal(h);
  }

  function guardarCelda(di, n) {
    const rol = rolVigente();
    const d = rol.dias[di];
    const caja = +$('#ed-caja').value, ini = +$('#ed-ini').value, fin = +$('#ed-fin').value;
    if (caja && fin <= ini) { aviso('La hora de salida debe ser después de la entrada.'); return; }
    d.turnos = d.turnos.filter((t) => t.nomina !== n);
    if (caja) {
      d.turnos.push({ caja, nomina: n, ini, fin, manual: true, razon: 'Asignado a mano: Caja ' + caja + ' de ' + C.aHora(ini) + ' a ' + C.aHora(fin) + '.\nLa app revisa de nuevo las reglas y avisa si algo no cuadra.' });
      d.turnos.sort((a, b) => a.caja - b.caja || a.ini - b.ini);
    }
    guardar(); cerrarModal(); pintar();
    const V = C.validarRol(rol, opts());
    aviso(V.problemas.length ? 'Cambio guardado. Hay ' + V.problemas.length + ' aviso(s): revísalos arriba.' : 'Cambio guardado. ✔ Todo cumple las reglas.');
  }

  // Explica en palabras por qué quedan horas sin Caja 2 que sí la necesitan.
  function porQueHuecos(rol, V) {
    const rojos = V.huecos.filter((x) => x.caja === 2 && !x.tranquilo && !x.sugerencias.length);
    if (!rojos.length) return '';
    const max = S.config.maxDias;
    const grupos = {};
    rojos.forEach((x) => {
      const quien = x.presentes.map((p) => p.nomina).sort().join(',');
      (grupos[quien] = grupos[quien] || { pres: x.presentes, horas: [] }).horas.push(rol.dias[x.dia].nombre.slice(0, 3) + ' ' + C.rangoCorto(x.ini, x.fin));
    });
    let h = '<div class="caja-aviso alerta"><b>¿Por qué no hay Caja 2 en esas horas?</b> No es un error del cálculo: no queda nadie que pueda entrar.<ul>';
    Object.values(grupos).forEach((g) => {
      const llenos = g.pres.filter((p) => p.dias >= max);
      h += '<li><b>' + esc(g.horas.join(', ')) + '</b>: a esa hora solo están en tienda ' + (g.pres.length ? g.pres.map((p) => esc(nombre(p.nomina)) + ' (' + p.dias + '/' + max + (p.hoy ? ', hoy en C' + p.hoy : '') + ')').join(', ') : 'nadie del catálogo') + '. ' +
        (llenos.length === g.pres.length && g.pres.length ? 'Todos ya llegaron a ' + max + ' días en caja esta semana.' : 'Los demás ya están en caja a esa hora.') + '</li>';
    });
    return h + '</ul>Para cubrirlas: <b>1)</b> sube "Días máximos en Caja 1 / Caja 2" en Parámetros, <b>2)</b> pasa en GIRHA a alguien de la tarde a un horario de mañana, o <b>3)</b> acepta que en esas horas la Caja 2 es un vendedor de piso que entra cuando se junta fila.</div>';
  }

  function modalHueco(k) {
    const V = C.validarRol(rolVigente(), opts());
    const x = V.huecos[k];
    const d = rolVigente().dias[x.dia];
    let h = '<h3>Hueco · ' + d.nombre + ' · Caja ' + x.caja + '</h3>' +
      (x.tranquilo
        ? '<div class="caja-aviso alerta">Nadie cubre la Caja 2 de <b>' + C.aHora(x.ini) + ' a ' + C.aHora(x.fin) + '</b>, pero es una <b>hora tranquila</b>: según ventas basta la Caja 1. Si quieres cubrirla, elige a alguien.</div>'
        : '<div class="caja-aviso error">Nadie cubre la Caja ' + x.caja + ' de <b>' + C.aHora(x.ini) + ' a ' + C.aHora(x.fin) + '</b>. La app no inventa turnos: tú decides quién lo cubre.</div>');
    if (x.sugerencias.length) {
      h += '<p>Pueden cubrirlo según su horario GIRHA (y tienen menos de ' + S.config.maxDias + ' días en caja):</p><ul class="lista-sug">' +
        x.sugerencias.slice(0, 10).map((s) => '<li><span>' + chipPersona(s.nomina) + ' <small>GIRHA ' + esc(s.girha) + ' · ' + s.dias + '/' + S.config.maxDias + ' días' + (s.marcado ? '' : ' · <b>no marcado</b>') + (s.completo ? '' : ' · cubre solo una parte') + '</small></span>' +
          '<button class="btn chico" type="button" data-asignar="' + k + '|' + esc(s.nomina) + '">Asignar</button></li>').join('') + '</ul>';
    } else {
      h += '<div class="caja-aviso alerta">Nadie con horario a esa hora está libre ese día con menos de ' + S.config.maxDias + ' días en caja. Opciones: mover un turno a mano, marcar más vendedores o subir el máximo de días en Parámetros.</div>';
    }
    h += '<div class="pie-modal"><button class="btn" value="cerrar">Cerrar</button></div>';
    abrirModal(h);
  }

  function asignarHueco(k, n) {
    const rol = rolVigente();
    const x = C.validarRol(rol, opts()).huecos[k];
    const d = rol.dias[x.dia];
    const g = C.disponible(SEM, n, x.dia);
    const ini = Math.max(x.ini, g.ini);
    const fin = Math.min(x.fin, g.fin, ini + S.config.turnoMax * 60);
    d.turnos.push({ caja: x.caja, nomina: n, ini, fin, manual: true, razon: 'Asignado a mano para cubrir un hueco de Caja ' + x.caja + ' (' + C.rangoLargo(x.ini, x.fin) + ').\nQueda de ' + C.aHora(ini) + ' a ' + C.aHora(fin) + ' según su horario GIRHA.' });
    d.turnos.sort((a, b) => a.caja - b.caja || a.ini - b.ini);
    guardar(); cerrarModal(); pintar();
    const V = C.validarRol(rol, opts());
    aviso(V.problemas.length ? 'Asignado. Quedan ' + V.problemas.length + ' aviso(s).' : 'Asignado. ✔ Todo cumple las reglas.');
  }

  function modalApoyo(di, k) {
    const rol = rolVigente();
    const d = rol.dias[di];
    const a = d.apoyos[k];
    const cands = nominasCatalogo().filter((n) => C.enPiso(SEM, d, n, a.ini, a.fin));
    let h = '<h3>Apoyo Caja 3 · ' + d.nombre + ' ' + C.rangoLargo(a.ini, a.fin) + '</h3>' +
      '<p class="porque"><b>¿Por qué?</b>\n' + esc(a.razon) + '</p>' +
      '<h3>Cambiar a mano</h3><label class="campo" style="margin-bottom:14px">Quién apoya<select id="ed-apoyo"><option value="">(sin apoyo)</option>' +
      cands.map((n) => '<option value="' + esc(n) + '"' + (n === a.nomina ? ' selected' : '') + '>' + esc(nombre(n)) + (S.seleccion.includes(n) ? '' : ' (no marcado)') + '</option>').join('') +
      (a.nomina && !cands.includes(a.nomina) ? '<option value="' + esc(a.nomina) + '" selected>' + esc(nombre(a.nomina)) + ' (ya no está en piso)</option>' : '') +
      '</select></label>' +
      '<div class="pie-modal"><button class="btn" value="cerrar">Cerrar</button><button class="btn pri" type="button" id="ed-apoyo-guardar" data-apoyo="' + di + '|' + k + '">Guardar cambio</button></div>';
    abrirModal(h);
  }

  function guardarApoyo(di, k) {
    const a = rolVigente().dias[di].apoyos[k];
    const n = $('#ed-apoyo').value || null;
    a.nomina = n;
    a.manual = true;
    a.razon = a.razon.split('\n')[0] + '\n' + (n ? 'Asignado a mano: ' + nombre(n) + '.' : 'Se quitó el apoyo a mano.') + '\nEl apoyo en Caja 3 no cuenta dentro de los 3 días de caja.';
    guardar(); cerrarModal(); pintar();
  }

  // ------------------------------------------------------------ 7. por día
  function quienesEn(lista, h0, h1) {
    return lista.filter((t) => t.ini < h1 && t.fin > h0);
  }

  function pintarDia() {
    const cuerpo = $('#dia-cuerpo');
    const rol = rolVigente();
    if (!rol) { cuerpo.innerHTML = '<div class="caja-aviso info">Primero genera el rol.</div>'; return; }
    const d = rol.dias[S.diaVista] || rol.dias[0];
    const dem = S.ventas ? S.ventas.demanda : null;
    let h = '<div class="dias-btn">' + rol.dias.map((x) => '<button type="button" class="btn chico" data-dia="' + x.idx + '" aria-pressed="' + (x.idx === d.idx) + '">' + x.nombre.slice(0, 3) + ' ' + C.fechaCorta(x.fecha) + '</button>').join('') + '</div>';
    h += '<p class="ayuda"><b>' + d.nombre + ' ' + C.fechaCorta(d.fecha) + '</b> · tienda de ' + C.rangoLargo(d.ab, d.ci) + '. Cada renglón es una hora: quién cobra en cada caja.</p>';
    h += '<div class="desliza"><table class="linea"><thead><tr><th>Hora</th><th>Ventas</th><th>Caja 1 · fijo</th><th>Caja 2 · flotante</th><th>Caja 3 · apoyo</th></tr></thead><tbody>';
    const chip = (t, extra) => { const bg = color(t.nomina); return '<span class="quien" style="background:' + esc(bg) + ';color:' + textoSobre(bg) + '">' + esc(nombre(t.nomina)) + '</span>' + (extra || ''); };
    const detalle = (t, h0, h1) => (t.ini > h0 ? '<span class="nota">desde ' + C.aHora(t.ini) + '</span>' : '') + (t.fin < h1 ? '<span class="nota">hasta ' + C.aHora(t.fin) + '</span>' : '');
    for (let h0 = Math.floor(d.ab / 60) * 60; h0 < d.ci; h0 += 60) {
      const a = Math.max(h0, d.ab), b = Math.min(h0 + 60, d.ci);
      const tk = dem ? C.cargaHora(dem, d.cod, h0 / 60) : null;
      const n = dem ? C.nivelCajas(tk, S.config.capacidad, S.config.caja3) : 0;
      const c1 = quienesEn(d.turnos.filter((t) => t.caja === 1), a, b);
      const c2 = quienesEn(d.turnos.filter((t) => t.caja === 2), a, b);
      const c3 = quienesEn(d.apoyos, a, b);
      const cub = (lista) => { let t = a; lista.slice().sort((x, y) => x.ini - y.ini).forEach((x) => { if (x.ini <= t) t = Math.max(t, x.fin); }); return t >= b; };
      h += '<tr><td class="h">' + C.aHora(a) + '–' + C.aHora(b) + '</td>';
      h += '<td>' + (dem ? '<span class="quien n' + n + '">' + n + ' caja' + (n > 1 ? 's' : '') + '</span><span class="nota">' + Math.round(tk) + ' tickets' + (conPesos(dem) ? ' · $' + Math.round(dem.importe[d.cod][h0 / 60] || 0).toLocaleString('es-MX') : '') + '</span>' : '<span class="nota">sin reporte</span>') + '</td>';
      h += '<td>' + (c1.map((t) => chip(t, detalle(t, a, b))).join('') || '') + (cub(c1) ? '' : ' <span class="falta">FALTA</span>') + '</td>';
      h += '<td>' + (c2.map((t) => chip(t, detalle(t, a, b))).join('') || '') + (cub(c2) ? '' : ' <span class="falta">FALTA</span>') +
        (dem && c2.length ? '<span class="nota">' + (n >= 2 ? 'se queda cobrando' : 'puede estar en piso') + '</span>' : '') + '</td>';
      h += '<td>' + (c3.length ? c3.map((t) => (t.nomina ? chip(t) : '<span class="falta">SIN NADIE EN PISO</span>')).join('') : (n === 3 ? '<span class="falta">ABRIR</span>' : '<span class="nota">cerrada</span>')) + '</td></tr>';
    }
    cuerpo.innerHTML = h + '</tbody></table></div>';
  }

  // ------------------------------------------------------------ exportar
  function exportarExcel() {
    const rol = rolVigente();
    if (!rol) { aviso('Primero genera el rol.'); return; }
    const V = C.validarRol(rol, opts());
    const filasP = nominasCatalogo().filter((n) => S.seleccion.includes(n) || rol.dias.some((d) => d.turnos.some((t) => t.nomina === n)));
    const col = (i) => String.fromCharCode(65 + i);
    const aoa = [['ROL DE CAJAS MINA'], ['Semana del jueves ' + C.fechaCorta(SEM.inicio) + ' al miércoles ' + C.fechaCorta(C.sumarDias(SEM.inicio, 6)) + '/' + SEM.inicio.slice(0, 4)], []];
    const est = {};
    const borde = { border: true, center: true, wrap: true };
    est.A1 = { bold: true, size: 18, center: true };
    est.A2 = { center: true, color: '#5B6878' };
    aoa.push(['VENDEDOR'].concat(rol.dias.map((d) => d.nombre + '\n' + C.fechaCorta(d.fecha))).concat(['DÍAS']));
    for (let i = 0; i < 9; i++) est[col(i) + '4'] = Object.assign({ bold: true, fill: '#1F3864', color: '#FFFFFF' }, borde);
    const altos = [30, 18, 6, 32];
    filasP.forEach((n) => {
      const r = aoa.length + 1;
      const fila = [nombre(n)];
      est['A' + r] = { bold: true, border: true, fill: color(n), color: textoSobre(color(n)) };
      rol.dias.forEach((d, i) => {
        const ts = d.turnos.filter((t) => t.nomina === n);
        const g = SEM.personas[n].dias[d.idx];
        const ref = col(i + 1) + r;
        if (ts.length) {
          fila.push(ts.map((t) => C.rangoCorto(t.ini, t.fin) + '  C' + t.caja).join('\n'));
          est[ref] = Object.assign({ bold: true, fill: color(n), color: textoSobre(color(n)) }, borde);
        } else if (g.estado === 'D' || g.estado === 'NP') {
          fila.push(g.estado);
          est[ref] = Object.assign({ fill: '#ECEFF3', color: '#5B6878' }, borde);
        } else {
          fila.push('');
          est[ref] = borde;
        }
      });
      fila.push((V.resumen[n] ? V.resumen[n].dias : 0) + '/' + S.config.maxDias);
      est[col(8) + r] = borde;
      aoa.push(fila);
      altos.push(34);
    });
    if (V.huecos.length) {
      const r = aoa.length + 1;
      aoa.push(['SIN CUBRIR'].concat(rol.dias.map((d) => V.huecos.filter((x) => x.dia === d.idx).map((x) => 'C' + x.caja + ' ' + C.rangoCorto(x.ini, x.fin)).join('\n'))).concat(['']));
      for (let i = 0; i < 9; i++) est[col(i) + r] = Object.assign({ bold: true, fill: '#FFC7CE', color: '#9C0006' }, borde);
      altos.push(Math.max(30, 15 * Math.max(...rol.dias.map((d) => V.huecos.filter((x) => x.dia === d.idx).length))));
    }
    const r3 = aoa.length + 1;
    aoa.push(['APOYO CAJA 3'].concat(rol.dias.map((d) => (rol.conVentas ? d.apoyos.map((a) => C.rangoCorto(a.ini, a.fin) + ' ' + (a.nomina ? nombre(a.nomina) : 'SIN NADIE')).join('\n') : 'Sin reporte de ventas'))).concat(['']));
    for (let i = 0; i < 9; i++) est[col(i) + r3] = Object.assign({ bold: true, fill: '#FDE2C4', color: '#7A3D00' }, borde);
    altos.push(Math.max(30, 15 * Math.max(1, ...rol.dias.map((d) => d.apoyos.length))));
    aoa.push([]);
    aoa.push(['C1 = Cajero fijo, nunca deja la caja · C2 = Cajero flotante, apoya en piso y regresa a cobrar cuando se junta fila · C3 = Apoyo solo en horas pico · Mantenerse comunicados por radio.']);

    // hoja por hora
    const dem = S.ventas ? S.ventas.demanda : null;
    const porHora = [['Día', 'Fecha', 'Hora', 'Cajas recomendadas', 'Tickets en día cargado', 'Venta promedio ($)', 'Caja 1', 'Caja 2', 'Caja 3 (apoyo)']];
    rol.dias.forEach((d) => {
      for (let h0 = Math.floor(d.ab / 60) * 60; h0 < d.ci; h0 += 60) {
        const a = Math.max(h0, d.ab), b = Math.min(h0 + 60, d.ci);
        const nm = (l) => quienesEn(l, a, b).map((t) => (t.nomina ? nombre(t.nomina) : 'SIN NADIE')).join(' / ') || 'FALTA';
        const tk = dem ? C.cargaHora(dem, d.cod, h0 / 60) : '';
        porHora.push([d.nombre, d.fecha, C.aHora(a) + '-' + C.aHora(b), dem ? C.nivelCajas(tk, S.config.capacidad, S.config.caja3) : '', dem ? Math.round(tk * 10) / 10 : '', conPesos(dem) ? Math.round(dem.importe[d.cod][h0 / 60] || 0) : '',
          nm(d.turnos.filter((t) => t.caja === 1)), nm(d.turnos.filter((t) => t.caja === 2)), quienesEn(d.apoyos, a, b).map((t) => (t.nomina ? nombre(t.nomina) : 'SIN NADIE')).join(' / ')]);
      }
    });
    const resumen = [['Vendedor', 'Nómina', 'Días C1/C2', 'Turnos C1', 'Turnos C2', 'Horas en caja', 'Cierres', 'Fin de semana', 'Apoyos C3', 'Marcado esta semana']];
    nominasCatalogo().forEach((n) => {
      const r = V.resumen[n] || { dias: 0, horas: 0, c1: 0, c2: 0, apoyos: 0, cierres: 0, finde: 0 };
      if (!V.resumen[n] && !S.seleccion.includes(n)) return;
      resumen.push([nombre(n), n, r.dias + '/' + S.config.maxDias, r.c1, r.c2, r.horas / 60, r.cierres, r.finde, r.apoyos, S.seleccion.includes(n) ? 'Sí' : 'No']);
    });
    const avisos = [['Avisos']].concat(V.problemas.length ? V.problemas.map((p) => [p.texto]) : [['El rol cumple todas las reglas.']]);
    const bytes = ExcelRol.crearLibro([
      { nombre: 'Rol', aoa, estilos: est, cols: [16, 13, 13, 13, 13, 13, 13, 13, 8], filas: altos, merges: [{ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } }, { s: { r: aoa.length - 1, c: 0 }, e: { r: aoa.length - 1, c: 8 } }] },
      { nombre: 'Por hora', aoa: porHora, cols: [12, 11, 12, 12, 10, 12, 20, 20, 20] },
      { nombre: 'Resumen', aoa: resumen, cols: [14, 10, 10, 10, 10, 12, 8, 12, 10, 12] },
      { nombre: 'Avisos', aoa: avisos, cols: [110] },
    ]);
    ExcelRol.descargar(bytes, 'rol_cajas_mina_' + SEM.inicio + '.xlsx');
  }

  function imprimir() {
    if (!rolVigente()) { aviso('Primero genera el rol.'); return; }
    if (S.tab !== 'rol') ir('rol');
    setTimeout(() => window.print(), 100);
  }

  // ------------------------------------------------------------ eventos
  document.addEventListener('click', (e) => {
    const b = e.target.closest('button, [data-ir]');
    if (!b) return;
    if (b.dataset.tab) return ir(b.dataset.tab);
    if (b.dataset.ir) return ir(b.dataset.ir);
    if (b.dataset.borrar != null) {
      const p = S.catalogo[+b.dataset.borrar];
      if (confirm('¿Quitar a ' + (p.nombre || p.nomina) + ' del catálogo?')) { S.catalogo.splice(+b.dataset.borrar, 1); recalcularSemana(); guardar(); pintar(); }
      return;
    }
    if (b.id === 'ed-guardar') { const [di, n] = b.dataset.celda.split('|'); return guardarCelda(+di, n); }
    if (b.id === 'ed-apoyo-guardar') { const [di, k] = b.dataset.apoyo.split('|'); return guardarApoyo(+di, +k); }
    if (b.dataset.celda) { const [di, n] = b.dataset.celda.split('|'); return modalCelda(+di, n); }
    if (b.dataset.hueco) return modalHueco(+b.dataset.hueco);
    if (b.dataset.asignar) { const [k, n] = b.dataset.asignar.split('|'); return asignarHueco(+k, n); }
    if (b.dataset.apoyo) { const [di, k] = b.dataset.apoyo.split('|'); return modalApoyo(+di, +k); }
    if (b.dataset.dia) { S.diaVista = +b.dataset.dia; guardar(); return pintar(); }
    switch (b.id) {
      case 'btn-exp-catalogo': if (!S.catalogo.length) return aviso('El catálogo está vacío.'); return exportarCatalogo();
      case 'btn-agregar':
        S.catalogo.push({ nomina: '', nombre: '', color: C.COLORES[S.catalogo.length % C.COLORES.length] });
        guardar(); pintar();
        { const ins = document.querySelectorAll('[data-campo="nomina"]'); if (ins.length) ins[ins.length - 1].focus(); }
        return;
      case 'btn-ejemplo': return cargarEjemplo();
      case 'btn-todos': S.seleccion = nominasCatalogo().filter((n) => SEM.personas[n].dias.some((d) => d.estado === 'TRABAJA')); guardar(); return pintar();
      case 'btn-ninguno': S.seleccion = []; guardar(); return pintar();
      case 'btn-generar': case 'btn-generar2': return generar();
      case 'btn-apoyos': case 'btn-apoyos2': {
        const rol = rolVigente();
        if (!rol) return aviso('Primero genera el rol.');
        if (!S.ventas) return aviso('Sube primero el reporte de ventas (paso 4).');
        C.calcularApoyos(rol, opts());
        guardar();
        ir('rol');
        return aviso('Apoyos de Caja 3 actualizados. Caja 1 y Caja 2 no se tocaron.');
      }
      case 'btn-excel': return exportarExcel();
      case 'btn-imprimir': return imprimir();
      case 'btn-sap-cancel': sapTmp = null; return pintar();
      case 'btn-sap-quitar':
        if (!confirm(HIST ? '¿Volver al histórico incluido? Los apoyos de Caja 3 del rol se recalculan con el histórico.' : '¿Quitar el reporte de ventas? Los apoyos de Caja 3 del rol también se quitan.')) return;
        S.ventas = null;
        ventasPorDefecto();
        if (rolVigente()) C.calcularApoyos(rolVigente(), opts());
        guardar(); return pintar();
      case 'btn-sap-calc': {
        const cols = { fecha: +$('#sap-fecha').value, hora: +$('#sap-hora').value, ticket: +$('#sap-ticket').value, importe: +$('#sap-importe').value };
        const dem = C.procesarVentas(sapTmp.filas.slice(sapTmp.filaTitulos + 1), cols);
        if (!dem.info.ticketsUnicos) return aviso('No se encontraron tickets con fecha y hora. Revisa las columnas elegidas.');
        S.ventas = { nombre: sapTmp.nombre, demanda: dem };
        sapTmp = null;
        const rol = rolVigente();
        if (rol && confirm('¿Actualizar ahora los apoyos de Caja 3 en el rol? (Caja 1 y Caja 2 no cambian)')) C.calcularApoyos(rol, opts());
        guardar(); pintar();
        return aviso('Listo: ' + dem.info.ticketsUnicos.toLocaleString('es-MX') + ' tickets en ' + dem.info.dias + ' días.');
      }
      case 'btn-borrar-rol':
        if (!rolVigente()) return aviso('No hay rol que borrar.');
        if (!confirm('¿Borrar el rol de esta semana? Se pierden los cambios hechos a mano. El personal, GIRHA y los parámetros no se tocan.')) return;
        S.rol = null;
        guardar();
        ir('semana');
        return aviso('Rol borrado. Marca quién entra a caja y presiona Generar rol.');
      case 'btn-restaurar':
        if (confirm('¿Regresar todos los parámetros a los valores iniciales?')) { S.config = C.configInicial(); guardar(); pintar(); }
        return;
      default:
    }
  });

  document.addEventListener('change', async (e) => {
    const el = e.target;
    if (el.id === 'in-catalogo' && el.files[0]) { await importarCatalogo(el.files[0]); el.value = ''; return; }
    if (el.id === 'in-girha' && el.files[0]) {
      const f = el.files[0];
      try {
        const filas = await leerArchivo(f);
        S.girha = { nombre: f.name, filas };
        const antes = SEM ? SEM.inicio : null;
        S.semanaSel = null;
        recalcularSemana();
        if (SEM && SEM.inicio !== antes) S.seleccion = nominasCatalogo().filter((n) => SEM.personas[n].dias.some((d) => d.estado === 'TRABAJA'));
        guardar(); pintar();
        aviso(SEM ? 'GIRHA cargado.' : 'No se encontró personal del catálogo en el archivo.');
      } catch (err) { aviso('No se pudo leer el archivo. ¿Es Excel o CSV?'); }
      el.value = '';
      return;
    }
    if (el.id === 'in-sap' && el.files[0]) {
      const f = el.files[0];
      aviso('Leyendo reporte…');
      try { prepararSap(f.name, await leerArchivo(f)); S.tab = 'ventas'; pintar(); } catch (err) { aviso('No se pudo leer el archivo. ¿Es Excel o CSV?'); }
      el.value = '';
      return;
    }
    if (el.id === 'sap-titulos') { sapTmp.filaTitulos = +el.value; adivinarColumnas(); return pintar(); }
    if (el.id === 'sel-semana') { S.semanaSel = el.value; recalcularSemana(); S.seleccion = nominasCatalogo().filter((n) => SEM.personas[n].dias.some((d) => d.estado === 'TRABAJA')); guardar(); return pintar(); }
    if (el.dataset.sel) {
      const n = el.dataset.sel;
      S.seleccion = el.checked ? [...new Set(S.seleccion.concat(n))] : S.seleccion.filter((x) => x !== n);
      guardar(); return pintar();
    }
    if (el.dataset.campo) {
      const p = S.catalogo[+el.dataset.i];
      p[el.dataset.campo] = el.value.trim();
      if (el.dataset.campo === 'nombre') p.nombre = p.nombre.toUpperCase();
      recalcularSemana(); guardar(); pintarPestanas();
      if (el.dataset.campo !== 'color') pintar();
      return;
    }
    if (el.dataset.hor) {
      if (C.aMin(el.value) == null) return;
      S.config.horario[el.dataset.hor][el.dataset.lado] = el.value;
      guardar(); return aviso('Guardado. Genera el rol de nuevo para aplicarlo.');
    }
    if (el.dataset.par) {
      const v = +el.value;
      if (!(v > 0)) return;
      S.config[el.dataset.par] = v;
      if (S.config.turnoMin > S.config.turnoMax) aviso('Ojo: el turno mínimo es mayor que el máximo.');
      else aviso('Guardado. Genera el rol de nuevo para aplicarlo.');
      guardar();
    }
  });

  $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') cerrarModal(); });

  // ------------------------------------------------------------ inicio
  cargar();
  ventasPorDefecto();
  recalcularSemana();
  pintar();
})();
