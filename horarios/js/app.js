/* Horarios Semanales – Ferre Don Nico · pantallas */
(function () {
  'use strict';
  const C = window.HorariosCore;
  const X = window.ExcelHorarios;
  const D = window.Datos;
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const CLAVE_UI = 'horariosDonNico.ui.v1';

  const PESTANAS = [
    { id: 'catalogos', txt: '1 · Catálogos' },
    { id: 'generar', txt: '2 · Generar semana' },
    { id: 'tablero', txt: '3 · Tablero' },
    { id: 'validacion', txt: '4 · Validación' },
    { id: 'exportar', txt: '5 · Exportar' },
    { id: 'historial', txt: '6 · Historial' },
  ];
  const HOJAS_CATALOGO = ['Plantilla', 'Tiendas', 'Claves', 'Reglas', 'Novedades'];
  const AYUDA_HOJA = {
    Plantilla: 'Una fila por colaborador. Deja la nómina vacía si todavía no llega: la persona se programa y la app la saca sola del archivo de GIRHA. Estatus: activo o baja.',
    Tiendas: 'Una fila por tienda y por día. La clave de apertura dice a qué hora tiene que entrar alguien; si la tienda tiene cierre distinto (Centro de Color, Ferre Mina), va en clave de cierre.',
    Claves: 'El catálogo de GIRHA. Solo estas claves pueden salir en la carga masiva. Escríbelas igual que en GIRHA (por ejemplo 8:00-18:00 sin cero): la app exporta la forma exacta de esta hoja.',
    Reglas: 'Tipos: descanso_fijo (persona y día), pareja_cobertura (tiendas separadas con | y en valor el chofer), puede_cubrir (persona y tiendas, * = todas), pernocta (persona y tienda donde se puede quedar), rotacion (dos personas separadas con | y la tienda).',
    Novedades: 'Vacaciones, incapacidades, comisiones, pago de tiempo por tiempo (PTT) y días festivos. Para un festivo deja la nómina vacía. Hasta = mismo día si es uno solo.',
  };

  // ------------------------------------------------------------ estado
  let HOJAS = null; // { hoja: [[títulos], ...] } tal como está en el libro
  let LIB = null; // objetos por hoja
  let K = null; // catálogos listos para el motor
  let SEM = null; // semana abierta
  let V = null; // validación de SEM
  let cargando = false, errorCarga = '';
  const UI = { tab: 'catalogos', hoja: 'Plantilla', semana: null, pedida: null, seleccion: [], hist: null, editando: {} };
  let cambiosPorSubir = [];
  let temporizador = null, guardando = false, sinGuardar = false;

  try { Object.assign(UI, JSON.parse(localStorage.getItem(CLAVE_UI) || '{}'), { editando: {} }); } catch (e) { /* nada */ }
  function guardarUI() {
    try { localStorage.setItem(CLAVE_UI, JSON.stringify({ tab: UI.tab, hoja: UI.hoja, semana: UI.semana, pedida: UI.pedida, seleccion: UI.seleccion, hist: UI.hist })); } catch (e) { /* nada */ }
  }

  function aviso(txt, largo) {
    const el = $('#aviso');
    el.textContent = txt;
    el.hidden = false;
    clearTimeout(aviso.t);
    aviso.t = setTimeout(() => { el.hidden = true; }, largo ? 7000 : 3500);
  }
  function fallo(e) { console.error(e); aviso(e && e.message ? e.message : 'Algo no salió bien. Vuelve a intentar.', true); }

  const hoyISO = () => { const d = new Date(); return C.fechaISO(d.getFullYear(), d.getMonth() + 1, d.getDate()); };
  const ahora = () => { const d = new Date(); return hoyISO() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
  // Quién hace el cambio. Con Google sale de la cuenta; en esta computadora se pregunta una vez.
  function usuario() {
    let u = D.usuario;
    if (!u) {
      u = (window.prompt('¿Cómo te llamas? Se guarda en el historial de cambios.') || '').trim();
      if (u) { D.configurar({ usuario: u }); pintarEstado(); }
    }
    return u || 'Sin nombre';
  }
  const rangoTxt = (ini) => 'Jueves ' + C.fechaLarga(ini) + ' al miércoles ' + C.fechaLarga(C.sumarDias(ini, 6));
  const tit = (s) => C.titulo(s);

  // ------------------------------------------------------------ libro
  function objetosDe(h) {
    return {
      plantilla: C.objetos(h.Plantilla), tiendas: C.objetos(h.Tiendas), claves: C.objetos(h.Claves), reglas: C.objetos(h.Reglas),
      novedades: C.objetos(h.Novedades), semanas: C.objetos(h.Semanas), dias: C.objetos(h.Dias), cambios: C.objetos(h.Cambios),
    };
  }
  async function cargarLibro() {
    cargando = true; errorCarga = '';
    pintarEstado();
    try {
      HOJAS = await D.leerTodo();
      LIB = objetosDe(HOJAS);
      K = C.prepararLibro(LIB);
      UI.editando = {};
      abrirSemana(UI.semana, true);
    } catch (e) { errorCarga = e.message || String(e); HOJAS = null; LIB = null; K = null; SEM = null; }
    cargando = false;
    pintar();
  }
  function hayCatalogo() { return K && K.personas.length && K.tiendas.size && K.claves.size; }

  function abrirSemana(id, silencioso) {
    SEM = null; V = null;
    if (!id || !LIB) return;
    SEM = C.semanaDesdeDias(LIB.dias, LIB.semanas, id);
    if (SEM) {
      SEM.festivos = C.novedadesDeSemana(K, LIB.novedades, SEM.inicio).festivos.map((f) => f.fecha);
      // Si a alguien ya le llegó su nómina, sus días guardados se ligan a ella (y se guarda al primer cambio).
      if (C.ligarSinNomina(K, SEM) && !silencioso) aviso('Se ligaron a su nómina los días de quien antes no tenía.');
      UI.semana = SEM.id;
    } else if (!silencioso) aviso('No hay horario guardado para esa semana. Genéralo en "2 · Generar semana".');
    revalidar();
  }
  function revalidar() { V = SEM && K ? C.validarSemana(K, SEM) : null; }

  // Guarda la semana abierta en las hojas Semanas y Dias, y sube el registro de cambios.
  function programarGuardado() {
    sinGuardar = true;
    pintarEstado();
    clearTimeout(temporizador);
    temporizador = setTimeout(guardarSemana, 1200);
  }
  async function guardarSemana() {
    if (!SEM || guardando) { if (guardando) programarGuardado(); return; }
    guardando = true; pintarEstado();
    try {
      const id = SEM.id;
      LIB.dias = LIB.dias.filter((r) => C.parseFecha(r.id_semana) !== id).concat(C.diasDesdeSemana(SEM));
      const meta = { id_semana: id, fecha_inicio: id, estado: SEM.estado || 'borrador', generado_por: SEM.generado_por || '', fecha_generado: SEM.fecha_generado || '', nota: SEM.nota || '' };
      LIB.semanas = LIB.semanas.filter((s) => C.parseFecha(s.id_semana) !== id).concat([meta]).sort((a, b) => (String(a.id_semana) < String(b.id_semana) ? -1 : 1));
      await D.escribirHoja('Semanas', C.aoaDe('Semanas', LIB.semanas));
      await D.escribirHoja('Dias', C.aoaDe('Dias', LIB.dias));
      const subir = cambiosPorSubir;
      cambiosPorSubir = [];
      if (subir.length) {
        await D.agregarFilas('Cambios', C.aoaDe('Cambios', subir).slice(1));
        LIB.cambios = LIB.cambios.concat(subir);
      }
      sinGuardar = false;
    } catch (e) { fallo(e); }
    guardando = false;
    pintarEstado();
  }
  function registrar(nomina, fecha, antes, despues, nota) {
    cambiosPorSubir.push({ id_semana: SEM.id, fecha_hora: ahora(), usuario: usuario(), nomina: nomina || '', fecha: fecha || '', antes: antes || '', despues: despues || '', nota: nota || '' });
  }

  // ------------------------------------------------------------ pestañas
  function estadoPaso(id) {
    switch (id) {
      case 'catalogos': return !HOJAS ? '' : K && K.avisos.length ? 'alerta' : hayCatalogo() ? 'ok' : '';
      case 'generar': return SEM ? 'ok' : '';
      case 'tablero': case 'validacion': return SEM ? (V && V.ok ? 'ok' : 'alerta') : '';
      case 'exportar': return SEM && SEM.estado !== 'borrador' ? 'ok' : '';
      default: return LIB && LIB.semanas.length ? 'ok' : '';
    }
  }
  function pintarPestanas() {
    $('#pestanas').innerHTML = PESTANAS.map((p) => '<button type="button" role="tab" data-tab="' + p.id + '" aria-selected="' + (UI.tab === p.id) + '">' + p.txt + '<span class="punto ' + estadoPaso(p.id) + '"></span></button>').join('');
    PESTANAS.forEach((p) => { $('#tab-' + p.id).hidden = UI.tab !== p.id; });
  }
  function pintarEstado() {
    const cx = D.modo === 'google' ? (D.conectado() ? '🟢 Google Sheets' + (D.usuario ? ' · ' + D.usuario : '') : '⚪ Google Sheets (sin entrar)') : '💻 Datos en esta computadora' + (D.usuario ? ' · ' + D.usuario : '');
    $('#estado-conexion').textContent = cargando ? 'Cargando libro…' : cx;
    $('#estado-guardado').textContent = guardando ? 'Guardando…' : sinGuardar ? 'Cambios sin guardar' : SEM ? 'Todo guardado ✔' : '';
  }
  function ir(tab) { UI.tab = tab; guardarUI(); pintar(); window.scrollTo(0, 0); }
  function pintar() {
    pintarPestanas();
    pintarEstado();
    ({ catalogos: pintarCatalogos, generar: pintarGenerar, tablero: pintarTablero, validacion: pintarValidacion, exportar: pintarExportar, historial: pintarHistorial })[UI.tab]();
  }
  const sinLibro = () => (D.modo === 'google' && !D.conectado()
    ? '<div class="caja-aviso info">Entra con tu cuenta de Google para abrir el libro de horarios.' +
      '<div class="acciones" style="margin:10px 0 0"><button class="btn pri" type="button" id="btn-conectar">🔐 Entrar con Google</button></div></div>'
    : '<div class="caja-aviso info">Primero conecta el libro de Google Sheets o usa los datos de ejemplo en <b>1 · Catálogos</b>.' +
      '<div class="acciones" style="margin:10px 0 0"><button class="btn pri" type="button" data-ir="catalogos">Ir a Catálogos</button></div></div>');
  const sinSemana = () => '<div class="caja-aviso info">No hay ninguna semana abierta. Genera una en <b>2 · Generar semana</b> o abre una del <b>6 · Historial</b>.' +
    '<div class="acciones" style="margin:10px 0 0"><button class="btn pri" type="button" data-ir="generar">Generar semana</button><button class="btn" type="button" data-ir="historial">Ver historial</button></div></div>';

  // ------------------------------------------------------------ 1. catálogos
  function pintarCatalogos() {
    const cfg = D.config;
    let h = '<div class="tarjetas">';
    if (D.modo === 'google' && D.conectado()) {
      h += '<div class="tarjeta"><h3>🟢 Conectado a Google Sheets</h3><p>Entraste como <b>' + esc(D.usuario || D.correo) + '</b>. Los cambios se guardan directo en el libro y los ven Eryho, Gabriel e Itzel.</p>' +
        '<div class="acciones"><button class="btn" type="button" id="btn-recargar">🔄 Volver a leer el libro</button><button class="btn" type="button" id="btn-preparar">🧩 Crear hojas que falten</button>' +
        (HOJAS && C.objetos(HOJAS.Plantilla).length === 0 ? '<button class="btn sec" type="button" id="btn-llenar">🧪 Llenar el libro vacío con datos de ejemplo</button>' : '') +
        '<button class="btn" type="button" id="btn-local">💻 Trabajar en esta computadora</button></div></div>';
    } else {
      h += '<div class="tarjeta"><h3>Conectar con Google Sheets</h3>' +
        '<label class="campo">ID de cliente de Google<input type="text" id="cx-cliente" value="' + esc(cfg.clientId) + '" placeholder="123456-abc.apps.googleusercontent.com"></label>' +
        '<label class="campo" style="margin-top:8px">Enlace del libro de Google Sheets<input type="text" id="cx-libro" value="' + esc(cfg.libro) + '" placeholder="https://docs.google.com/spreadsheets/d/…"></label>' +
        '<p class="ayuda" style="margin:8px 0">Se abre la ventana de Google para que entres con tu cuenta. El README explica cómo sacar el ID de cliente (se hace una sola vez).</p>' +
        '<div class="acciones"><button class="btn pri" type="button" id="btn-conectar">🔐 Conectar con Google</button></div></div>';
      h += '<div class="tarjeta"><h3>💻 Trabajar en esta computadora</h3><p class="ayuda" style="margin-bottom:8px">Para probar la app o si no hay internet. Lo que hagas aquí solo lo ves tú; descárgalo en Excel para no perderlo.</p>' +
        '<label class="campo">Tu nombre (para el historial)<input type="text" id="cx-usuario" value="' + esc(cfg.usuario) + '" placeholder="Por ejemplo: Eryho"></label>' +
        '<div class="acciones" style="margin-top:10px"><button class="btn sec" type="button" id="btn-ejemplo">🧪 Probar con datos de ejemplo</button>' +
        '<label class="btn">📂 Abrir libro (Excel)<input type="file" id="in-libro" accept=".xlsx" hidden></label>' +
        (HOJAS ? '<button class="btn" type="button" id="btn-bajar-libro">💾 Descargar libro (Excel)</button>' : '') + '</div></div>';
    }
    h += '</div>';
    if (errorCarga) h += '<div class="caja-aviso error"><b>No se pudo leer el libro.</b> ' + esc(errorCarga) + '</div>';
    $('#conexion-cuerpo').innerHTML = h;

    const cuerpo = $('#catalogos-cuerpo');
    if (!HOJAS) { cuerpo.innerHTML = cargando ? '<p>Cargando…</p>' : ''; return; }
    let c = '';
    if (K.avisos.length) c += '<div class="caja-aviso alerta"><b>Revisa esto en los catálogos:</b><ul>' + K.avisos.map((a) => '<li>' + esc(a) + '</li>').join('') + '</ul></div>';
    c += '<div class="chips"><span class="chip"><b>' + K.personas.filter((p) => p.activo).length + '</b> colaboradores activos</span><span class="chip"><b>' + K.tiendas.size + '</b> tiendas</span><span class="chip"><b>' + K.claves.size + '</b> claves</span><span class="chip"><b>' + K.personas.filter((p) => p.activo && !p.nomina).length + '</b> sin nómina</span></div>';
    c += '<div class="subpestanas">' + HOJAS_CATALOGO.map((n) => '<button class="btn chico" type="button" data-hoja="' + n + '" aria-pressed="' + (UI.hoja === n) + '">' + n + (UI.editando[n] ? ' •' : '') + '</button>').join('') + '</div>';
    c += '<p class="ayuda">' + esc(AYUDA_HOJA[UI.hoja]) + '</p>';
    const aoa = UI.editando[UI.hoja] || HOJAS[UI.hoja] || [C.HOJAS[UI.hoja].slice()];
    const cols = C.HOJAS[UI.hoja];
    const tits = (aoa[0] || []).map((t) => C.normTexto(t).toLowerCase().replace(/ /g, '_'));
    const pos = cols.map((col) => tits.indexOf(col));
    c += '<div class="acciones">' + (UI.hoja === 'Plantilla' ? '<button class="btn pri" type="button" id="btn-alta">➕ Alta de personal</button>' : '') +
      '<button class="btn" type="button" id="btn-fila">➕ Agregar fila</button>' +
      '<button class="btn' + (UI.editando[UI.hoja] ? ' pri' : '') + '" type="button" id="btn-guardar-hoja"' + (UI.editando[UI.hoja] ? '' : ' disabled') + '>💾 Guardar ' + esc(UI.hoja) + '</button>' +
      (UI.editando[UI.hoja] ? '<button class="btn" type="button" id="btn-descartar">Descartar cambios</button>' : '') + '</div>';
    c += '<div class="desliza editor"><table><thead><tr>' + cols.map((col) => '<th>' + esc(col) + '</th>').join('') + '<th></th></tr></thead><tbody>' +
      aoa.slice(1).map((f, r) => '<tr>' + cols.map((col, k) => '<td' + (col === 'nombre' || col === 'nota' ? ' class="ancho"' : '') + '><input type="text" data-ed="' + (r + 1) + '|' + k + '" value="' + esc(pos[k] >= 0 ? f[pos[k]] : '') + '" aria-label="' + esc(col) + '"></td>').join('') +
        '<td><button class="btn chico" type="button" data-quitar-fila="' + (r + 1) + '" title="Quitar fila">🗑️</button></td></tr>').join('') +
      '</tbody></table></div>';
    cuerpo.innerHTML = c;
  }

  // Copia de trabajo de la hoja, con las columnas en el orden estándar.
  function copiaHoja(n) {
    if (UI.editando[n]) return UI.editando[n];
    const aoa = HOJAS[n] || [C.HOJAS[n].slice()];
    UI.editando[n] = C.aoaDe(n, C.objetos(aoa));
    return UI.editando[n];
  }
  async function guardarHoja(n) {
    const aoa = UI.editando[n];
    if (!aoa) return;
    const limpio = [aoa[0]].concat(aoa.slice(1).filter((f) => f.some((x) => String(x).trim() !== '')));
    try {
      aviso('Guardando ' + n + '…');
      await D.escribirHoja(n, limpio);
      HOJAS[n] = limpio;
      delete UI.editando[n];
      LIB = objetosDe(HOJAS);
      K = C.prepararLibro(LIB);
      if (SEM) SEM.festivos = C.novedadesDeSemana(K, LIB.novedades, SEM.inicio).festivos.map((f) => f.fecha);
      revalidar();
      pintar();
      aviso(n + ' guardada.' + (K.avisos.length ? ' Hay avisos en los catálogos: revísalos arriba.' : ''));
    } catch (e) { fallo(e); }
  }

  function modalAlta() {
    const tiendas = [...K.tiendas.values()].map((t) => t.nombre);
    abrirModal('<h3>➕ Alta de personal</h3>' +
      '<p class="ayuda">Si la nómina todavía no llega, déjala vacía: la persona aparece en el tablero y en el PDF, y la app la saca sola del archivo de GIRHA hasta que la captures.</p>' +
      '<div class="rejilla">' +
      '<label class="campo">Nómina<input type="text" id="al-nomina" inputmode="numeric" placeholder="Vacía si aún no llega"></label>' +
      '<label class="campo">Nombre completo<input type="text" id="al-nombre" placeholder="APELLIDO APELLIDO NOMBRE"></label>' +
      '<label class="campo">Nombre corto<input type="text" id="al-corto" placeholder="Como sale en WhatsApp"></label>' +
      '<label class="campo">Área<select id="al-area">' + C.AREAS.map((a) => '<option>' + esc(a) + '</option>').join('') + '</select></label>' +
      '<label class="campo">Puesto<input type="text" id="al-puesto" placeholder="VEND, ENC, COMODÍN…"></label>' +
      '<label class="campo">CECO<input type="text" id="al-ceco"></label>' +
      '<label class="campo">Tienda base<select id="al-base">' + tiendas.map((t) => '<option>' + esc(t) + '</option>').join('') + '</select></label>' +
      '<label class="campo">Jornada<select id="al-jornada"><option>48</option><option>40</option><option>36</option></select></label>' +
      '<label class="campo">Descansos por semana<select id="al-desc"><option value="1">1 (va 6 días de 8 h)</option><option value="2">2 (4 × 10 + un día de fin de semana)</option></select></label>' +
      '<label class="campo">Descanso fijo<select id="al-fijo"><option value="">Ninguno</option>' + C.DIAS.map((d) => '<option value="' + tit(d.nombre).toLowerCase() + '">' + tit(d.nombre) + '</option>').join('') + '</select></label>' +
      '</div><div class="pie-modal" style="margin-top:14px"><button class="btn" value="cerrar">Cancelar</button><button class="btn pri" type="button" id="al-guardar">Dar de alta</button></div>');
  }
  async function guardarAlta() {
    const v = (id) => $(id).value.trim();
    const nombre = v('#al-nombre').toUpperCase();
    if (!nombre) return aviso('Escribe el nombre completo.');
    const nomina = C.normNomina(v('#al-nomina'));
    if (nomina && K.porId.has(nomina)) return aviso('La nómina ' + nomina + ' ya es de ' + K.porId.get(nomina).nombre + '. Revisa el número.');
    const aoa = copiaHoja('Plantilla');
    const o = { nomina, nombre, ceco: v('#al-ceco'), puesto: v('#al-puesto').toUpperCase(), area: v('#al-area'), sucursal_base: v('#al-base'), jornada_horas: v('#al-jornada'), descansos_semana: v('#al-desc'), descanso_fijo: v('#al-fijo'), estatus: 'activo', nombre_corto: v('#al-corto') };
    aoa.push(C.HOJAS.Plantilla.map((c) => o[c]));
    cerrarModal();
    await guardarHoja('Plantilla');
    aviso(nombre + ' dado de alta.' + (nomina ? '' : ' Sin nómina: no entra a GIRHA hasta que la captures.'), true);
  }

  async function cargarEjemplo() {
    if (HOJAS && C.objetos(HOJAS.Plantilla).length && !confirm('Esto reemplaza los datos guardados en esta computadora por los de ejemplo. ¿Continuar?')) return;
    const E = window.DATOS_EJEMPLO;
    const hojas = {};
    Object.keys(C.HOJAS).forEach((n) => { hojas[n] = C.aoaDe(n, E[n.toLowerCase()] || []); });
    D.usarLocal();
    D.reemplazarLocal(hojas);
    UI.semana = null;
    await cargarLibro();
    aviso('Datos de ejemplo cargados. Ve a "2 · Generar semana".');
  }

  // ------------------------------------------------------------ 2. generar
  function semanaPorDefecto() { return C.sumarDias(C.inicioSemana(hoyISO()), 7); }
  function pintarGenerar() {
    const cuerpo = $('#generar-cuerpo');
    if (!hayCatalogo()) { cuerpo.innerHTML = sinLibro(); return; }
    const ini = C.inicioSemana(C.parseFecha(UI.pedida) || semanaPorDefecto());
    const existente = C.semanaDesdeDias(LIB.dias, LIB.semanas, ini);
    const anterior = C.semanaDesdeDias(LIB.dias, LIB.semanas, C.sumarDias(ini, -7));
    const nov = C.novedadesDeSemana(K, LIB.novedades, ini);
    const nom = (id) => (K.porId.get(id) ? C.nombreCorto(K.porId.get(id)) : id);
    let h = '<div class="acciones" style="align-items:flex-end">' +
      '<label class="campo">Cualquier día de la semana<input type="date" id="g-fecha" value="' + ini + '"></label>' +
      '<button class="btn" type="button" data-semana="' + C.inicioSemana(hoyISO()) + '">Esta semana</button>' +
      '<button class="btn" type="button" data-semana="' + C.sumarDias(C.inicioSemana(hoyISO()), 7) + '">La que sigue</button></div>';
    h += '<div class="caja-aviso info"><b>' + rangoTxt(ini) + '</b>' + (existente ? ' · ya tiene horario guardado: <span class="estado-semana ' + esc(existente.estado) + '">' + esc(existente.estado) + '</span>' : ' · todavía no tiene horario.') + '</div>';
    h += '<div class="tarjetas">';
    h += '<div class="tarjeta"><h3>Novedades de la semana</h3>' + (nov.bloqueos.length ? '<ul>' + nov.bloqueos.map((b) => '<li><b>' + esc(nom(b.id)) + '</b>: ' + esc(C.TIPOS[b.tipo].txt.toLowerCase()) + ' · ' + b.fechas.map((f) => tit(C.nombreDiaDe(f)).slice(0, 3) + ' ' + C.fechaCorta(f)).join(', ') + (b.sucursal ? ' (' + esc(b.sucursal) + ')' : '') + '</li>').join('') + '</ul>' : '<p>Ninguna vacación, incapacidad, comisión ni PTT.</p>') +
      '<h3>Días festivos</h3>' + (nov.festivos.length ? '<ul>' + nov.festivos.map((f) => '<li>' + tit(C.nombreDiaDe(f.fecha)) + ' ' + C.fechaCorta(f.fecha) + ' · ' + esc(f.nota) + ' (el descanso sale como NP)</li>').join('') + '</ul>' : '<p>Ninguno.</p>') +
      (nov.avisos.length ? '<div class="caja-aviso alerta"><ul>' + nov.avisos.map((a) => '<li>' + esc(a) + '</li>').join('') + '</ul></div>' : '') +
      '<div class="acciones" style="margin-top:8px"><button class="btn chico" type="button" data-ir-hoja="Novedades">✏️ Editar novedades</button></div></div>';
    h += '<div class="tarjeta"><h3>Lo que toma en cuenta</h3><ul>' +
      '<li>Semana anterior: ' + (anterior ? '<b>sí está guardada</b> (' + rangoTxt(anterior.inicio).replace('Jueves ', '') + '). Se usa para la rotación y para repetir horarios.' : '<b>no está guardada</b>. La rotación se toma por número de semana.') + '</li>' +
      K.rotaciones.map((r) => { const q = C.abreEstaSemana(K, r, anterior, ini); const otro = q.abre === r.a ? r.b : r.a; return '<li>Rotación: abre <b>' + esc(nom(q.abre)) + '</b> y cierra <b>' + esc(nom(otro)) + '</b>.</li>'; }).join('') +
      '<li>' + K.personas.filter((p) => p.activo).length + ' colaboradores activos, ' + K.tiendas.size + ' tiendas.</li>' +
      '<li>Orden: bloqueos → festivos → descansos fijos → rotación → huecos de cobertura → horas.</li></ul></div>';
    h += '</div>';
    if (K.avisos.length) h += '<div class="caja-aviso alerta">Hay ' + K.avisos.length + ' aviso(s) en los catálogos. Revísalos en <b>1 · Catálogos</b> antes de generar.</div>';
    h += '<div class="acciones"><button class="btn pri" type="button" id="btn-generar" data-ini="' + ini + '">⚙️ Generar ' + rangoTxt(ini).toLowerCase() + '</button>' +
      (existente ? '<button class="btn" type="button" data-abrir="' + ini + '">📋 Abrir el que ya está guardado</button>' : '') + '</div>';
    cuerpo.innerHTML = h;
  }

  async function generar(ini) {
    const existente = C.semanaDesdeDias(LIB.dias, LIB.semanas, ini);
    if (existente) {
      const extra = existente.estado !== 'borrador' ? '\n\nOJO: esa semana ya está ' + existente.estado.toUpperCase() + '.' : '';
      if (!confirm('Ya hay un horario guardado para esta semana. Si lo generas de nuevo se reemplaza, junto con los cambios hechos a mano.' + extra + '\n\n¿Continuar?')) return;
    }
    const anterior = C.semanaDesdeDias(LIB.dias, LIB.semanas, C.sumarDias(ini, -7));
    SEM = C.generarSemana(K, { inicio: ini, anterior, novedades: LIB.novedades });
    SEM.generado_por = usuario();
    SEM.fecha_generado = ahora();
    UI.semana = SEM.id;
    UI.seleccion = [];
    registrar('', '', '', '', (existente ? 'Volvió a generar' : 'Generó') + ' la semana');
    revalidar();
    guardarUI();
    await guardarSemana();
    ir('tablero');
    aviso(V.ok ? 'Semana generada: cumple los nueve criterios. Revísala y autorízala.' : 'Semana generada. Lo que quedó en rojo trae el motivo: revísalo en el panel de la derecha.', true);
  }

  // ------------------------------------------------------------ 3. tablero
  const claveCorta = (cl) => {
    const n = C.normalizarClave(cl);
    if (n.estado !== 'TRABAJA') return esc(cl || '—');
    const f = (m) => (m % 60 ? Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0') : String(Math.floor(m / 60)));
    return f(n.ini) + '–' + f(n.fin);
  };
  const colorArea = (p) => C.COLOR_AREA[p.areaKey] || '#e7e6e6';
  function problemasCelda(id, i) {
    if (!V) return [];
    const out = [];
    V.criterios.forEach((c) => c.detalles.forEach((d) => { if (d.id === id && d.i === i) out.push(d.texto); }));
    V.traslados.forEach((t) => { if (t.id === id && t.i === i) out.push(t.texto); });
    return out;
  }
  function problemasPersona(id) {
    if (!V) return [];
    return V.criterios.filter((c) => [3, 4, 6, 7].includes(c.n)).flatMap((c) => c.detalles.filter((d) => d.id === id && d.i == null).map((d) => d.texto));
  }

  function celdaHtml(p, i, r, imprimir) {
    if (!r) return '<td><button class="celda error" type="button" data-celda="' + esc(p.id) + '|' + i + '"><span class="tip">FALTA</span></button></td>';
    const probs = problemasCelda(p.id, i);
    const t = r.tipo;
    let estilo = '', cls = 't-' + t, cont = '';
    const tienda = C.buscarTienda(K, r.sucursal);
    const fuera = t === 'TRABAJA' && (!p.tiendaBase || !tienda || tienda !== p.tiendaBase);
    if (t === 'TRABAJA') {
      cont = '<span class="tip">' + claveCorta(r.clave) + '</span>' + (fuera ? '<span class="lug">' + esc((tienda ? tienda.nombre : r.sucursal || 'sin tienda').replace(/\s*\(.*\)/, '')) + '</span>' : '');
      if (fuera) estilo = 'background:' + colorArea(p);
    } else if (C.esBloqueo(t)) {
      cont = '<span class="tip">' + C.TIPOS[t].corto + '</span><span class="nota-c">' + claveCorta(r.clave) + (t === 'COM' && r.sucursal && tienda !== p.tiendaBase ? ' · ' + esc(r.sucursal) : '') + '</span>';
    } else cont = '<span class="tip">' + esc(t) + '</span>';
    if (probs.length || r.alerta) cls += ' error';
    const titulo = [r.nota, r.alerta].concat(probs).filter(Boolean).join('\n');
    return '<td><button class="celda ' + cls + '" type="button" ' + (imprimir ? 'tabindex="-1"' : 'data-celda="' + esc(p.id) + '|' + i + '"') + (estilo ? ' style="' + estilo + '"' : '') + ' title="' + esc(titulo) + '">' + cont + (r.origen === 'manual' && !imprimir ? '<span class="mano" aria-label="cambiado a mano">✋</span>' : '') + '</button></td>';
  }

  function tablaHorario(imprimir) {
    const idx = C.indexar(SEM);
    const sel = new Set(UI.seleccion);
    const cols = 7 + 3 + (imprimir ? 0 : 1);
    let h = '<div class="desliza"><table class="horario"><thead><tr>' + (imprimir ? '' : '<th class="sel" title="Seleccionar para exportar solo a algunas personas">☑</th>') + '<th class="nombre">Colaborador</th>' +
      SEM.fechas.map((f, i) => '<th>' + C.DIAS[i].nombre.slice(0, 3) + '<small>' + C.fechaCorta(f) + (SEM.festivos.includes(f) ? ' · festivo' : '') + '</small></th>').join('') +
      '<th class="cuenta">Horas</th><th class="cuenta">Desc.</th></tr></thead><tbody>';
    let areaActual = null;
    C.personasOrdenadas(K).forEach((p) => {
      if (p.area !== areaActual) {
        areaActual = p.area;
        const n = K.personas.filter((x) => x.activo && x.area === p.area).length;
        h += '<tr class="area"><td colspan="' + cols + '" style="background:' + colorArea(p) + '">' + esc(p.area || 'SIN ÁREA') + ' · ' + n + '</td></tr>';
      }
      const dias = idx[p.id] || [];
      const r = V ? V.resumen[p.id] : null;
      const dif = r ? r.dif : 0;
      const pp = problemasPersona(p.id);
      h += '<tr>' + (imprimir ? '' : '<td class="sel"><input type="checkbox" data-sel="' + esc(p.id) + '"' + (sel.has(p.id) ? ' checked' : '') + ' aria-label="Seleccionar a ' + esc(p.nombre) + '" style="width:18px;height:18px"></td>') +
        '<td class="nombre"' + (pp.length ? ' title="' + esc(pp.join('\n')) + '"' : '') + '><b>' + esc(C.nombreCorto(p)) + (pp.length && !imprimir ? ' ⚠️' : '') + '</b><small>' + esc(p.puesto) + ' · ' + (p.nomina ? esc(p.nomina) : '<span style="color:var(--rojo-t);font-weight:700">SIN NÓMINA</span>') + (p.tiendaBase && p.areaKey === 'RED BEREL' ? ' · ' + esc(p.tiendaBase.nombre.replace(/\s*\(.*\)/, '')) : '') + '</small></td>' +
        C.DIAS.map((_, i) => celdaHtml(p, i, dias[i], imprimir)).join('') +
        '<td class="cuenta"><b' + (dif > 0 ? ' class="dif-mas"' : dif < 0 ? ' class="dif-menos"' : '') + '>' + (r ? r.horas : '—') + '</b><small>de ' + p.jornada + (dif ? ' (' + (dif > 0 ? '+' : '') + dif + ')' : '') + '</small></td>' +
        '<td class="cuenta"><b' + (r && r.descansos !== p.descansos ? ' class="dif-mas"' : '') + '>' + (r ? r.descansos : '—') + '</b><small>de ' + p.descansos + '</small></td></tr>';
    });
    // tiendas sin apertura / sin cierre
    const huecos = SEM.fechas.map((_, i) => (V ? V.criterios[0].detalles.concat(V.criterios[1].detalles).filter((d) => d.i === i) : []));
    if (huecos.some((x) => x.length)) {
      h += '<tr class="fila-hueco">' + (imprimir ? '' : '<td></td>') + '<td class="nombre" style="background:var(--rojo-f);color:var(--rojo-t)"><b>TIENDAS SIN CUBRIR</b></td>' +
        huecos.map((lst) => '<td style="vertical-align:top;padding:2px">' + lst.map((d) => '<span class="pastilla hueco" title="' + esc(d.texto) + '">' + esc(d.tienda.replace(/\s*\(.*\)/, '')) + (V.criterios[1].detalles.includes(d) ? ' (cierre)' : '') + '</span>').join('') + '</td>').join('') + '<td></td><td></td></tr>';
    }
    h += '</tbody></table></div>';
    return h;
  }

  function leyenda() {
    return '<p class="leyenda"><span><i class="muestra" style="background:var(--c-desc)"></i><b>D</b> descanso · <b>NP</b> descanso por festivo</span>' +
      '<span><i class="muestra" style="background:var(--c-vac)"></i>Vacaciones</span><span><i class="muestra" style="background:var(--c-ptt)"></i>Pago de tiempo por tiempo</span>' +
      '<span><i class="muestra" style="background:var(--c-com)"></i>Comisión</span><span><i class="muestra" style="background:var(--c-inc)"></i>Incapacidad</span>' +
      C.AREAS.map((a) => '<span><i class="muestra" style="background:' + C.COLOR_AREA[C.normTexto(a)] + '"></i>Cubre otra tienda (' + tit(a) + ')</span>').join('') +
      '<span>✋ cambiado a mano</span></p>';
  }

  function panelLateral() {
    const crit = (n) => V.criterios[n - 1].detalles;
    const bloque = (titulo, lista, tipo) => '<h3>' + titulo + ' <span class="cuenta-b' + (lista.length ? (tipo === 'med' ? ' med' : ' mal') : '') + '">' + lista.length + '</span></h3>' +
      (lista.length ? '<ul>' + lista.slice(0, 40).map((t) => '<li>' + esc(t) + '</li>').join('') + (lista.length > 40 ? '<li>… y ' + (lista.length - 40) + ' más</li>' : '') + '</ul>' : '<p class="vacio">✔ Nada</p>');
    const sinAbrir = crit(1).concat(crit(2)).map((d) => d.texto);
    const jornada = crit(7).map((d) => d.texto);
    const claves = crit(5).map((d) => d.texto);
    const descansos = crit(6).concat(crit(8)).map((d) => d.texto);
    const sinNom = V.sinNomina.map((x) => x.nombre + ': se programa, pero no entra a GIRHA.');
    const otros = crit(3).concat(crit(4), crit(9)).map((d) => d.texto).concat(V.traslados.map((t) => t.texto));
    const h = V.holgura;
    return '<aside class="panel" aria-label="Revisión en vivo">' +
      '<h3>Turnos libres <span class="cuenta-b' + (h.total <= 3 ? ' mal' : h.total <= 8 ? ' med' : '') + '">' + h.total + '</span></h3>' +
      '<p style="margin:0">Gente que puede cubrir otra tienda sin dejar la suya sin abrir. Fin de semana: <b>' + h.finDeSemana + '</b>.</p>' +
      '<div class="holgura-dias">' + h.porDia.map((d) => '<span class="' + (d.libres.length ? '' : 'cero') + '" title="' + esc(d.libres.map((id) => C.nombreCorto(K.porId.get(id))).join(', ') || 'Nadie libre') + '">' + C.DIAS[d.i].nombre.slice(0, 2) + '<b>' + d.libres.length + '</b></span>').join('') + '</div>' +
      bloque('Tiendas sin apertura', sinAbrir) +
      bloque('Fuera de su jornada', jornada) +
      bloque('Claves que no existen', claves) +
      bloque('Descansos mal contados', descansos) +
      bloque('Sin clave de nómina', sinNom, 'med') +
      (otros.length ? bloque('Otros avisos', otros) : '') +
      (SEM.alertas && SEM.alertas.filter((a) => a.aviso).length ? bloque('Por confirmar', SEM.alertas.filter((a) => a.aviso).map((a) => a.texto), 'med') : '') +
      '</aside>';
  }

  function pintarTablero() {
    const cuerpo = $('#tablero-cuerpo');
    if (!hayCatalogo()) { cuerpo.innerHTML = '<h2>3 · Tablero</h2>' + sinLibro(); return; }
    if (!SEM) { cuerpo.innerHTML = '<h2>3 · Tablero</h2>' + sinSemana(); return; }
    revalidar();
    cuerpo.innerHTML = '<h2>3 · Tablero · ' + rangoTxt(SEM.inicio) + ' <span class="estado-semana ' + esc(SEM.estado) + '">' + esc(SEM.estado) + '</span></h2>' +
      '<p class="ayuda">Toca cualquier celda para cambiarla. La revisión de la derecha se actualiza con cada cambio. Marca la casilla ☑ de quien quieras exportar por separado.</p>' +
      (SEM.notas && SEM.notas.length ? '<div class="caja-aviso info">' + SEM.notas.map(esc).join('<br>') + '</div>' : '') +
      '<div class="tablero-wrap"><div>' + tablaHorario(false) + leyenda() + '</div>' + panelLateral() + '</div>';
  }

  // Modal para editar una celda
  function abrirModal(html) {
    $('#modal-cuerpo').innerHTML = html;
    const m = $('#modal');
    if (m.showModal) m.showModal(); else m.setAttribute('open', '');
  }
  function cerrarModal() { const m = $('#modal'); if (m.close) m.close(); else m.removeAttribute('open'); }

  function modalCelda(id, i) {
    const p = K.porId.get(id);
    const r = C.celda(SEM, id, i) || { tipo: 'TRABAJA', clave: '', sucursal: p.base, nota: '' };
    const probs = problemasCelda(id, i).concat(r.alerta ? [r.alerta] : []).concat(problemasPersona(id));
    const claves = [...K.claves.values()].filter((c) => c.estado === 'TRABAJA' && c.activa).sort((a, b) => a.ini - b.ini || a.fin - b.fin);
    const actual = C.normalizarClave(r.clave).texto;
    const enCat = claves.some((c) => c.texto === actual);
    const tiendas = [...K.tiendas.values()].map((t) => t.nombre);
    const res = V && V.resumen[id];
    abrirModal('<h3>' + esc(C.nombreCorto(p)) + ' · ' + tit(C.DIAS[i].nombre) + ' ' + C.fechaCorta(SEM.fechas[i]) + '</h3>' +
      '<p style="margin:0 0 8px">' + esc(p.nombre) + ' · ' + esc(p.puesto) + ' · base: ' + esc(p.base) + ' · ' + (res ? res.horas + ' de ' + p.jornada + ' h, ' + res.descansos + ' de ' + p.descansos + ' descansos' : '') + '</p>' +
      (probs.length ? '<div class="caja-aviso error"><ul>' + probs.map((t) => '<li>' + esc(t) + '</li>').join('') + '</ul></div>' : '') +
      (r.nota ? '<p class="porque"><b>Nota:</b> ' + esc(r.nota) + '</p>' : '') +
      '<div class="edicion">' +
      '<label class="campo">Qué tiene<select id="ed-tipo">' + Object.keys(C.TIPOS).map((t) => '<option value="' + t + '"' + (t === r.tipo ? ' selected' : '') + '>' + esc(C.TIPOS[t].txt) + '</option>').join('') + '</select></label>' +
      '<label class="campo">Clave de horario<select id="ed-clave">' + (enCat || !actual ? '' : '<option value="' + esc(r.clave) + '" selected>' + esc(r.clave) + ' (no está en Claves)</option>') +
        claves.map((c) => '<option value="' + esc(c.texto) + '"' + (c.texto === actual ? ' selected' : '') + '>' + esc(c.clave) + ' · ' + c.horas + ' h</option>').join('') + '</select></label>' +
      '<label class="campo">Tienda<input type="text" id="ed-tienda" list="lista-tiendas" value="' + esc(r.sucursal || p.base) + '"><datalist id="lista-tiendas">' + tiendas.map((t) => '<option value="' + esc(t) + '">').join('') + '</datalist></label>' +
      '</div><label class="campo" style="margin-bottom:12px">Nota (opcional)<input type="text" id="ed-nota" value="' + esc(r.origen === 'manual' ? r.nota : '') + '" placeholder="Por qué el cambio"></label>' +
      '<p class="ayuda" style="font-size:.85rem">En vacaciones, PTT, incapacidad y comisión la clave es su horario regular: así se manda a GIRHA. En descanso la clave no se usa.</p>' +
      '<div class="pie-modal"><button class="btn" value="cerrar">Cerrar</button><button class="btn pri" type="button" id="ed-guardar" data-celda-g="' + esc(id) + '|' + i + '">Guardar cambio</button></div>');
  }

  function guardarCelda(id, i) {
    const tipo = $('#ed-tipo').value;
    const nuevo = { tipo, clave: $('#ed-clave').value, sucursal: $('#ed-tienda').value.trim(), nota: $('#ed-nota').value.trim() };
    if (tipo === 'TRABAJA' && !C.buscarTienda(K, nuevo.sucursal)) {
      if (!confirm('"' + nuevo.sucursal + '" no está en la hoja Tiendas. ¿Guardar de todos modos?')) return;
    }
    const r = C.cambiarCelda(SEM, id, i, nuevo);
    if (r.antes === r.despues && !nuevo.nota) { cerrarModal(); return; }
    registrar(id, SEM.fechas[i], r.antes, r.despues, nuevo.nota);
    if (SEM.estado !== 'borrador') {
      registrar('', '', SEM.estado, 'borrador', 'Regresó a borrador por un cambio en el tablero');
      SEM.estado = 'borrador';
      aviso('La semana regresó a borrador por el cambio. Vuelve a autorizarla en "4 · Validación".', true);
    }
    cerrarModal();
    revalidar();
    programarGuardado();
    pintar();
  }

  // ------------------------------------------------------------ 4. validación
  function pintarValidacion() {
    const cuerpo = $('#validacion-cuerpo');
    if (!hayCatalogo()) { cuerpo.innerHTML = sinLibro(); return; }
    if (!SEM) { cuerpo.innerHTML = sinSemana(); return; }
    revalidar();
    const rojos = V.criterios.filter((c) => c.estado !== 'ok');
    let h = '<p><b>' + rangoTxt(SEM.inicio) + '</b> · <span class="estado-semana ' + esc(SEM.estado) + '">' + esc(SEM.estado) + '</span>' + (SEM.generado_por ? ' · generada por ' + esc(SEM.generado_por) + ' el ' + esc(SEM.fecha_generado) : '') + '</p>';
    h += '<div class="caja-aviso ' + (rojos.length ? 'error' : 'ok') + '">' + (rojos.length ? '<b>' + rojos.length + ' de 9 criterios en rojo.</b> Corrígelos en el tablero o autoriza a propósito dejando una nota.' : '✔ <b>Cumple los nueve criterios.</b>') + '</div>';
    h += '<div class="tarjeta">' + V.criterios.map((c) => '<div class="criterio"><span class="semaforo ' + c.estado + '" aria-label="' + (c.estado === 'ok' ? 'bien' : 'con errores') + '"></span><div><b>' + c.n + ' · ' + esc(c.titulo) + '</b>' +
      (c.detalles.length ? '<ul>' + c.detalles.map((d) => '<li>' + esc(d.texto) + '</li>').join('') + '</ul>' : '<div style="color:var(--verde-t)">✔ Bien</div>') + '</div></div>').join('') + '</div>';
    if (V.traslados.length) h += '<h3>Traslados a tiendas foráneas</h3><div class="caja-aviso alerta"><ul>' + V.traslados.map((t) => '<li>' + esc(t.texto) + '</li>').join('') + '</ul></div>';
    if (SEM.alertas && SEM.alertas.length) h += '<h3>Avisos del generador</h3><div class="caja-aviso alerta"><ul>' + SEM.alertas.map((a) => '<li>' + esc(a.texto) + '</li>').join('') + '</ul></div>';
    if (SEM.nota) h += '<div class="caja-aviso info"><b>Nota de la semana:</b> ' + esc(SEM.nota) + '</div>';

    h += '<h3>Estado de la semana</h3><div class="acciones" style="align-items:flex-start;flex-direction:column">';
    if (SEM.estado === 'borrador') {
      if (rojos.length) {
        h += '<label style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="au-saltar" style="width:20px;height:20px"> Sé que hay criterios en rojo y quiero autorizar de todos modos</label>' +
          '<label class="campo" style="width:min(600px,100%)">Nota (obligatoria si hay rojos): por qué se autoriza así<input type="text" id="au-nota" placeholder="Por ejemplo: Atlacomulco cierra el sábado por inventario"></label>';
      }
      h += '<button class="btn pri" type="button" id="btn-autorizar">✅ Autorizar semana</button>';
    } else if (SEM.estado === 'autorizado') {
      h += '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn pri" type="button" id="btn-cargado">📤 Ya la subí a GIRHA (marcar como cargada)</button><button class="btn" type="button" id="btn-borrador">↩️ Regresar a borrador</button></div>';
    } else {
      h += '<div style="display:flex;gap:8px;flex-wrap:wrap"><span class="caja-aviso ok" style="margin:0">Cargada en GIRHA.</span><button class="btn" type="button" id="btn-borrador">↩️ Regresar a borrador</button></div>';
    }
    h += '</div>';
    cuerpo.innerHTML = h;
  }

  function cambiarEstado(nuevo, nota) {
    registrar('', '', SEM.estado, nuevo, nota || '');
    SEM.estado = nuevo;
    if (nota) SEM.nota = nota;
    programarGuardado();
    pintar();
  }
  function autorizar() {
    revalidar();
    if (!V.ok) {
      const salta = $('#au-saltar') && $('#au-saltar').checked;
      const nota = $('#au-nota') ? $('#au-nota').value.trim() : '';
      if (!salta) return aviso('Hay criterios en rojo. Corrígelos o marca la casilla para autorizar de todos modos.', true);
      if (nota.length < 5) return aviso('Escribe en la nota por qué se autoriza con criterios en rojo.', true);
      const rojos = V.criterios.filter((c) => c.estado !== 'ok').map((c) => c.n).join(', ');
      cambiarEstado('autorizado', 'Autorizada con criterios en rojo (' + rojos + ') por ' + usuario() + ': ' + nota);
    } else cambiarEstado('autorizado', '');
    aviso('Semana autorizada. Ya puedes exportar en "5 · Exportar".');
  }

  // ------------------------------------------------------------ 5. exportar
  function pintarExportar() {
    const cuerpo = $('#exportar-cuerpo');
    if (!hayCatalogo()) { cuerpo.innerHTML = sinLibro(); return; }
    if (!SEM) { cuerpo.innerHTML = sinSemana(); return; }
    revalidar();
    const g = C.filasGirha(K, SEM);
    const sel = UI.seleccion.filter((id) => K.porId.has(id));
    let h = '<p><b>' + rangoTxt(SEM.inicio) + '</b> · <span class="estado-semana ' + esc(SEM.estado) + '">' + esc(SEM.estado) + '</span></p>';
    if (SEM.estado === 'borrador') h += '<div class="caja-aviso alerta">La semana todavía no está autorizada. Puedes exportar, pero autorízala antes de subirla a GIRHA.</div>';
    h += '<div class="tarjetas">';
    h += '<div class="tarjeta"><h3>A · Carga masiva de GIRHA</h3><p>Excel de 4 columnas, empresa NSD, fecha como texto aaaa-mm-dd y siete filas por persona empezando en jueves.</p>' +
      (g.errores.length ? '<div class="caja-aviso error"><b>No se puede generar todavía:</b><ul>' + g.errores.slice(0, 12).map((e) => '<li>' + esc(e) + '</li>').join('') + '</ul>Corrígelo en el tablero o agrega la clave en la hoja Claves.</div>' : '') +
      (g.excluidos.length ? '<div class="caja-aviso alerta">Sin nómina, no van en el archivo: <b>' + g.excluidos.map(esc).join(', ') + '</b>. Sí salen en el PDF y en WhatsApp.</div>' : '') +
      '<div class="acciones"><button class="btn pri" type="button" id="btn-girha">📥 Descargar carga de GIRHA</button>' +
      '<button class="btn" type="button" id="btn-girha-sel"' + (sel.length ? '' : ' disabled') + '>👤 Solo seleccionadas (' + sel.length + ')</button></div>' +
      (sel.length ? '<p class="ayuda" style="margin:6px 0 0">Seleccionadas: ' + sel.map((id) => esc(C.nombreCorto(K.porId.get(id)))).join(', ') + '</p>' : '<p class="ayuda" style="margin:6px 0 0">Para corregir a una o dos personas, márcalas con ☑ en el tablero.</p>') + '</div>';
    const confirmada = SEM.estado !== 'borrador';
    h += '<div class="tarjeta"><h3>B · Rol de cajas</h3><p>Pasa la semana a la app de Rol de Cajas de Ferre Mina, sin descargar ni subir archivos. Todo día que la persona no está en Ferre Mina va como <b>D</b> (descanso, festivo, vacaciones, PTT, comisión o cobertura en otra tienda).</p>' +
      (confirmada ? '' : '<div class="caja-aviso alerta" style="margin-bottom:8px">Primero autoriza la semana en <b>4 · Validación</b>: el rol de cajas se arma con los horarios ya confirmados.</div>') +
      '<div class="acciones"><button class="btn pri" type="button" id="btn-abrir-cajas"' + (confirmada ? '' : ' disabled') + '>🧾 Armar rol de cajas con esta semana</button>' +
      '<button class="btn" type="button" id="btn-cajas">📥 Descargar archivo</button></div>' +
      '<p class="ayuda" style="margin:6px 0 0">Se abre Rol de Cajas en el paso 3 con la semana ya cargada y los vendedores marcados (sin gerencia ni supervisión). Revisa quién entra a caja y presiona <b>Generar rol</b>.</p></div>';
    h += '<div class="tarjeta"><h3>C · PDF de una hoja</h3><p>Oficio horizontal, los ' + K.personas.filter((p) => p.activo).length + ' colaboradores agrupados por área con los colores del tablero. En la ventana de impresión elige <b>Guardar como PDF</b> y tamaño <b>Oficio</b>.</p>' +
      '<div class="acciones"><button class="btn pri" type="button" id="btn-pdf">🖨️ Imprimir / PDF</button></div></div>';
    h += '</div>';
    h += '<h3>D · Mensajes de WhatsApp por sucursal</h3><div class="tarjetas">' + C.mensajesWhatsApp(K, SEM).map((m, k) =>
      '<div class="tarjeta"><h3>' + esc(m.tienda) + '</h3><textarea class="wa" id="wa-' + k + '" readonly>' + esc(m.texto) + '</textarea><div class="acciones" style="margin-top:8px"><button class="btn" type="button" data-copiar="' + k + '">📋 Copiar</button></div></div>').join('') + '</div>';
    cuerpo.innerHTML = h;
  }

  function descargarGirha(solo) {
    const g = C.filasGirha(K, SEM, solo ? { solo } : null);
    if (g.errores.length) return aviso('No se generó el archivo: ' + g.errores[0] + (g.errores.length > 1 ? ' (y ' + (g.errores.length - 1) + ' más)' : ''), true);
    const errB = C.revisarBloques(g.filas);
    if (errB.length) return aviso('No se generó el archivo: ' + errB[0], true);
    if (g.filas.length <= 1) return aviso('No hay nadie con nómina para exportar.');
    X.descargar(X.cargaMasiva(g.filas, 'Carga GIRHA'), 'girha_' + SEM.id + (solo ? '_seleccion' : '') + '.xlsx');
    registrar('', '', '', '', 'Descargó la carga de GIRHA' + (solo ? ' (solo ' + solo.length + ' personas)' : ''));
    programarGuardado();
    aviso('Archivo listo: ' + (g.filas.length - 1) + ' filas.' + (g.excluidos.length ? ' Quedaron fuera por no tener nómina: ' + g.excluidos.join(', ') + '.' : ''), true);
  }
  // Rol de Cajas vive en la misma dirección (eryhos-maker.github.io), así que comparten la memoria del
  // navegador: se le deja la semana lista en su espacio y se abre en una pestaña nueva.
  const CLAVE_CAJAS = 'rolCajasMina.v1';
  function direccionRolCajas() {
    if (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return location.pathname.replace(/horarios\/.*$/, 'rol-cajas/');
    return location.pathname.replace(/horarios\/.*$/, '');
  }
  function abrirRolCajas() {
    if (SEM.estado === 'borrador') return aviso('Primero autoriza la semana en "4 · Validación".', true);
    let previo = null;
    try { previo = JSON.parse(localStorage.getItem(CLAVE_CAJAS) || 'null'); } catch (e) { previo = null; }
    if (previo && previo.rol && previo.rol.semana !== SEM.id && !confirm('Rol de Cajas tiene armado el rol de otra semana. Se va a cambiar por la semana del ' + C.fechaLarga(SEM.id) + ' (el historial de horas de caja se conserva). ¿Continuar?')) return;
    const S = C.estadoRolCajas(K, SEM, previo);
    try { localStorage.setItem(CLAVE_CAJAS, JSON.stringify(S)); } catch (e) { return aviso('El navegador no dejó guardar la semana para Rol de Cajas. Usa "Descargar archivo" y súbelo allá.', true); }
    registrar('', '', '', '', 'Pasó la semana a Rol de Cajas');
    programarGuardado();
    const w = window.open(direccionRolCajas() + '?desde=horarios', '_blank');
    if (!w) aviso('Ya está lista en Rol de Cajas. El navegador bloqueó la pestaña nueva: ábrela tú en ' + location.origin + direccionRolCajas(), true);
    else aviso('Semana enviada a Rol de Cajas: ' + S.seleccion.length + ' vendedores marcados para caja. Si ya tenías Rol de Cajas abierto en otra pestaña, ciérrala.', true);
  }

  function descargarCajas() {
    const r = C.filasRolCajas(K, SEM);
    X.descargar(X.cargaMasiva(r.filas, 'Rol de cajas'), 'rol_cajas_' + SEM.id + '.xlsx');
    aviso('Archivo listo para la app de Rol de Cajas.' + (r.excluidos.length ? ' Sin nómina (no van): ' + r.excluidos.join(', ') + '.' : ''), true);
  }

  // PDF: una sola hoja oficio horizontal; se mide la tabla y se encoge lo necesario.
  function imprimir() {
    const hoja = $('#hoja-impresion');
    hoja.innerHTML = '<div class="hoja"><h1 class="titulo">HORARIO SEMANAL · FERRETERÍA Y PINTURA</h1><p class="semana-txt">' + rangoTxt(SEM.inicio) + ' · ' + esc(SEM.estado) + '</p>' + tablaHorario(true) + leyenda() + '</div>';
    const mm = 96 / 25.4;
    const W = (330.2 - 12) * mm, H = (215.9 - 12) * mm;
    hoja.style.display = 'block';
    hoja.style.position = 'absolute'; hoja.style.left = '-99999px'; hoja.style.width = W + 'px';
    const caja = hoja.firstChild;
    const z = Math.min(1, W / caja.scrollWidth, H / caja.scrollHeight) * 0.97;
    hoja.style.cssText = '';
    caja.style.zoom = String(z);
    const limpiar = () => { hoja.innerHTML = ''; window.removeEventListener('afterprint', limpiar); };
    window.addEventListener('afterprint', limpiar);
    window.print();
  }

  // ------------------------------------------------------------ 6. historial
  function pintarHistorial() {
    const cuerpo = $('#historial-cuerpo');
    if (!LIB) { cuerpo.innerHTML = sinLibro(); return; }
    const semanas = LIB.semanas.slice().sort((a, b) => (String(a.id_semana) < String(b.id_semana) ? 1 : -1));
    if (!semanas.length) { cuerpo.innerHTML = '<div class="caja-aviso info">Todavía no hay semanas guardadas.</div>'; return; }
    const cuenta = {};
    LIB.cambios.concat(cambiosPorSubir).forEach((c) => { const k = C.parseFecha(c.id_semana); cuenta[k] = (cuenta[k] || 0) + 1; });
    let h = '<div class="desliza"><table><thead><tr><th>Semana</th><th>Estado</th><th>Generó</th><th>Cuándo</th><th class="centro">Cambios</th><th>Nota</th><th></th></tr></thead><tbody>' +
      semanas.map((s) => { const id = C.parseFecha(s.id_semana); return '<tr' + (SEM && SEM.id === id ? ' style="background:#eef3fb"' : '') + '><td><b>' + rangoTxt(id) + '</b></td><td><span class="estado-semana ' + esc(s.estado) + '">' + esc(s.estado) + '</span></td><td>' + esc(s.generado_por) + '</td><td>' + esc(s.fecha_generado) + '</td><td class="centro">' + (cuenta[id] || 0) + '</td><td>' + esc(s.nota) + '</td>' +
        '<td><div style="display:flex;gap:6px"><button class="btn chico" type="button" data-abrir="' + id + '">Abrir</button><button class="btn chico" type="button" data-hist="' + id + '">Ver cambios</button></div></td></tr>'; }).join('') + '</tbody></table></div>';
    const hs = UI.hist || (SEM && SEM.id);
    if (hs) {
      const lista = LIB.cambios.concat(cambiosPorSubir).filter((c) => C.parseFecha(c.id_semana) === hs).slice().reverse();
      const nom = (n) => (K && K.porId.get(String(n)) ? C.nombreCorto(K.porId.get(String(n))) : n);
      h += '<h3>Cambios de la semana del ' + C.fechaLarga(hs) + '</h3>' + (lista.length ? '<div class="desliza"><table><thead><tr><th>Cuándo</th><th>Quién</th><th>Persona</th><th>Día</th><th>Antes</th><th>Después</th><th>Nota</th></tr></thead><tbody>' +
        lista.map((c) => '<tr><td class="hor">' + esc(c.fecha_hora) + '</td><td>' + esc(c.usuario) + '</td><td>' + esc(c.nomina ? nom(c.nomina) : '—') + '</td><td>' + (C.parseFecha(c.fecha) ? tit(C.nombreDiaDe(C.parseFecha(c.fecha))).slice(0, 3) + ' ' + C.fechaCorta(C.parseFecha(c.fecha)) : '') + '</td><td>' + esc(c.antes) + '</td><td><b>' + esc(c.despues) + '</b></td><td>' + esc(c.nota) + '</td></tr>').join('') + '</tbody></table></div>' : '<p>Sin cambios registrados.</p>');
    }
    cuerpo.innerHTML = h;
  }

  // ------------------------------------------------------------ eventos
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.tab) return ir(b.dataset.tab);
    if (b.dataset.ir) return ir(b.dataset.ir);
    if (b.dataset.irHoja) { UI.hoja = b.dataset.irHoja; return ir('catalogos'); }
    if (b.dataset.hoja) { UI.hoja = b.dataset.hoja; guardarUI(); return pintar(); }
    if (b.dataset.semana) { UI.pedida = b.dataset.semana; guardarUI(); return pintar(); }
    if (b.dataset.abrir) { abrirSemana(b.dataset.abrir); guardarUI(); return ir('tablero'); }
    if (b.dataset.hist) { UI.hist = b.dataset.hist; guardarUI(); return pintar(); }
    if (b.dataset.celda) { const [id, i] = b.dataset.celda.split('|'); return modalCelda(id, +i); }
    if (b.dataset.celdaG) { const [id, i] = b.dataset.celdaG.split('|'); return guardarCelda(id, +i); }
    if (b.dataset.quitarFila) { const aoa = copiaHoja(UI.hoja); aoa.splice(+b.dataset.quitarFila, 1); return pintar(); }
    if (b.dataset.copiar != null) {
      const t = $('#wa-' + b.dataset.copiar);
      try { await navigator.clipboard.writeText(t.value); } catch (err) { t.select(); document.execCommand('copy'); }
      return aviso('Mensaje copiado. Pégalo en el grupo de WhatsApp.');
    }
    try {
      switch (b.id) {
        case 'btn-conectar':
          if ($('#cx-cliente')) D.configurar({ clientId: $('#cx-cliente').value.trim(), libro: $('#cx-libro').value.trim() });
          await D.conectarGoogle();
          await cargarLibro();
          if (!errorCarga) aviso('Conectado. Libro leído.');
          return;
        case 'btn-recargar': await cargarLibro(); return aviso(errorCarga ? errorCarga : 'Libro leído de nuevo.');
        case 'btn-preparar': { const f = await D.prepararLibro(); await cargarLibro(); return aviso(f.length ? 'Hojas creadas: ' + f.join(', ') + '.' : 'El libro ya tiene todas las hojas.'); }
        case 'btn-llenar': {
          if (!confirm('Se llenan las hojas vacías del libro con los datos de ejemplo (personas de prueba). ¿Continuar?')) return;
          const E = window.DATOS_EJEMPLO, hojas = {};
          Object.keys(C.HOJAS).forEach((n) => { hojas[n] = C.aoaDe(n, E[n.toLowerCase()] || []); });
          await D.prepararLibro(hojas); await cargarLibro(); return aviso('Libro llenado con datos de ejemplo.');
        }
        case 'btn-local': D.usarLocal(); await cargarLibro(); return;
        case 'btn-ejemplo': return cargarEjemplo();
        case 'btn-bajar-libro': return X.descargar(X.libroCompleto(HOJAS), 'libro_horarios_' + hoyISO() + '.xlsx');
        case 'btn-alta': return modalAlta();
        case 'al-guardar': return guardarAlta();
        case 'btn-fila': { const aoa = copiaHoja(UI.hoja); aoa.push(C.HOJAS[UI.hoja].map(() => '')); pintar(); const ins = document.querySelectorAll('[data-ed]'); if (ins.length) ins[ins.length - C.HOJAS[UI.hoja].length].focus(); return; }
        case 'btn-guardar-hoja': return guardarHoja(UI.hoja);
        case 'btn-descartar': delete UI.editando[UI.hoja]; return pintar();
        case 'btn-generar': return generar(b.dataset.ini);
        case 'btn-autorizar': return autorizar();
        case 'btn-cargado': cambiarEstado('cargado', SEM.nota); return aviso('Semana marcada como cargada en GIRHA.');
        case 'btn-borrador': if (confirm('¿Regresar la semana a borrador?')) cambiarEstado('borrador', SEM.nota); return;
        case 'btn-girha': return descargarGirha(null);
        case 'btn-girha-sel': return descargarGirha(UI.seleccion.filter((id) => K.porId.has(id)));
        case 'btn-cajas': return descargarCajas();
        case 'btn-abrir-cajas': return abrirRolCajas();
        case 'btn-actualizar': if (sinGuardar || guardando) await guardarSemana(); return location.reload();
        case 'btn-pdf': return imprimir();
        default:
      }
    } catch (err) { fallo(err); pintar(); }
  });

  document.addEventListener('change', async (e) => {
    const el = e.target;
    if (el.id === 'g-fecha') { UI.pedida = el.value; guardarUI(); return pintar(); }
    if (el.id === 'cx-usuario') { D.configurar({ usuario: el.value.trim() }); pintarEstado(); return aviso('Nombre guardado.'); }
    if (el.dataset.sel) {
      const id = el.dataset.sel;
      UI.seleccion = el.checked ? [...new Set(UI.seleccion.concat(id))] : UI.seleccion.filter((x) => x !== id);
      guardarUI(); return pintarPestanas();
    }
    if (el.dataset.ed) {
      const [r, k] = el.dataset.ed.split('|').map(Number);
      const aoa = copiaHoja(UI.hoja);
      aoa[r][k] = el.value.trim();
      return pintar();
    }
    if (el.id === 'in-libro' && el.files[0]) {
      try {
        const h = X.leerLibro(new Uint8Array(await el.files[0].arrayBuffer()));
        if (!h.Plantilla) throw new Error('Ese Excel no tiene la hoja "Plantilla". Usa un libro descargado de esta app o el libro de ejemplo.');
        Object.keys(C.HOJAS).forEach((n) => { if (!h[n]) h[n] = [C.HOJAS[n].slice()]; });
        D.usarLocal(); D.reemplazarLocal(h); UI.semana = null;
        await cargarLibro();
        aviso('Libro abierto.');
      } catch (err) { fallo(err); }
      el.value = '';
    }
  });

  $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') cerrarModal(); });
  window.addEventListener('beforeunload', (e) => { if (sinGuardar || guardando) { e.preventDefault(); e.returnValue = ''; } });

  // Aviso de versión nueva: si se publicó una actualización mientras la app estaba abierta, se ofrece recargar.
  const VERSION = ((document.querySelector('.sub') || {}).textContent || '').match(/Versión ([\w.]+)/);
  async function revisarVersion() {
    if (!VERSION || document.getElementById('aviso-version')) return;
    try {
      const t = await (await fetch('index.html?_=' + Date.now(), { cache: 'no-store' })).text();
      const m = t.match(/Versión ([\w.]+)/);
      if (!m || m[1] === VERSION[1]) return;
      const d = document.createElement('div');
      d.id = 'aviso-version';
      d.className = 'caja-aviso info no-print';
      d.style.cssText = 'margin:0 0 12px;display:flex;gap:10px;align-items:center;flex-wrap:wrap';
      d.innerHTML = '<span>Hay una versión nueva de la app (' + esc(m[1]) + '). Actualízala para ver los últimos cambios; lo que hayas hecho se guarda antes.</span><button class="btn pri chico" type="button" id="btn-actualizar">🔄 Actualizar</button>';
      document.querySelector('main').prepend(d);
    } catch (e) { /* sin internet: se revisa después */ }
  }
  setInterval(revisarVersion, 5 * 60 * 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) revisarVersion(); });
  setTimeout(revisarVersion, 3000);

  // ------------------------------------------------------------ inicio
  pintar();
  if (D.modo === 'local') cargarLibro();
  else pintar(); // con Google: cada pestaña muestra el botón "Entrar con Google"
})();
