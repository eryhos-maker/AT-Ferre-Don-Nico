/*
 * Dónde viven los datos.
 * - Google Sheets: el navegador entra con el login de Google del usuario
 *   (Google Identity Services) y lee/escribe el libro directo. Sin servidor.
 * - Esta computadora: el libro se guarda en el navegador (para probar o si no hay internet).
 * Todo se maneja como hojas: { Plantilla: [[títulos], [fila], ...], ... }
 */
(function (root) {
  'use strict';
  const C = root.HorariosCore;
  const CLAVE_CFG = 'horariosDonNico.conexion.v1';
  const CLAVE_LOCAL = 'horariosDonNico.libro.v1';
  const API = 'https://sheets.googleapis.com/v4/spreadsheets/';
  const ALCANCE = 'https://www.googleapis.com/auth/spreadsheets openid email profile';

  // Valores de Ferre Don Nico: el ID de cliente de Google (proyecto "Horarios Don Nico") y el libro.
  // No son secretos: el libro solo lo abre quien tenga permiso en Google Drive.
  const ID_CLIENTE = '643737224406-d3q9dbgkb840e8779vhsj8jk3rkojifr.apps.googleusercontent.com';
  const LIBRO = '1L4VvcAILHoO_kKxmmn6jE3_4aYjjPFN9zSTIWBAA5A0';
  let cfg = { modo: 'google', clientId: ID_CLIENTE, libro: LIBRO, usuario: '' };
  let token = null, tokenVence = 0, cliente = null, perfil = null;

  try { Object.assign(cfg, JSON.parse(localStorage.getItem(CLAVE_CFG) || '{}')); } catch (e) { /* sin almacenamiento */ }
  if (!cfg.clientId) cfg.clientId = ID_CLIENTE;
  if (!cfg.libro) cfg.libro = LIBRO;
  function guardarCfg() { try { localStorage.setItem(CLAVE_CFG, JSON.stringify(cfg)); } catch (e) { /* nada */ } }

  // Acepta el enlace completo del libro o solo su ID.
  function idLibro(txt) {
    const s = String(txt || '').trim();
    const m = s.match(/\/d\/([a-zA-Z0-9_-]{20,})/);
    return m ? m[1] : s;
  }

  function cargarScriptGoogle() {
    if (root.google && root.google.accounts && root.google.accounts.oauth2) return Promise.resolve();
    return new Promise((ok, mal) => {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.onload = () => ok();
      s.onerror = () => mal(new Error('No se pudo abrir el inicio de sesión de Google. Revisa tu conexión a internet y vuelve a intentar.'));
      document.head.appendChild(s);
    });
  }

  function pedirToken(silencioso) {
    return new Promise((ok, mal) => {
      cliente = root.google.accounts.oauth2.initTokenClient({
        client_id: cfg.clientId,
        scope: ALCANCE,
        callback: (r) => {
          if (r.error) { mal(new Error(r.error === 'access_denied' ? 'No diste permiso a la app para usar tu cuenta de Google. Vuelve a presionar Conectar y acepta los permisos.' : 'Google no dejó entrar (' + r.error + '). Vuelve a intentar.')); return; }
          token = r.access_token;
          tokenVence = Date.now() + (Number(r.expires_in) || 3600) * 1000 - 60000;
          ok(token);
        },
        error_callback: (e) => mal(new Error(e && e.type === 'popup_closed' ? 'Se cerró la ventana de Google antes de terminar. Vuelve a presionar Conectar.' : 'El navegador bloqueó la ventana de Google. Permite ventanas emergentes para esta página y vuelve a intentar.')),
      });
      cliente.requestAccessToken({ prompt: silencioso ? '' : 'consent' });
    });
  }

  async function asegurarToken() {
    if (token && Date.now() < tokenVence) return token;
    await cargarScriptGoogle();
    return pedirToken(true);
  }

  async function api(ruta, opciones, reintento) {
    await asegurarToken();
    const r = await fetch(API + ruta, Object.assign({}, opciones, { headers: Object.assign({ Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, (opciones || {}).headers) }));
    if (r.status === 401 && !reintento) { token = null; return api(ruta, opciones, true); }
    if (!r.ok) {
      let detalle = '';
      try { detalle = (await r.json()).error.message; } catch (e) { /* nada */ }
      if (r.status === 403) throw new Error('Tu cuenta no tiene permiso de edición en el libro. Pide que te lo compartan como editor y vuelve a conectar.');
      if (r.status === 404) throw new Error('No encuentro el libro. Revisa que el enlace o ID esté bien copiado en Catálogos.');
      if (/Unable to parse range/i.test(detalle)) throw new Error('Al libro le falta una hoja. Ve a Catálogos y presiona "Crear hojas que falten".');
      throw new Error('Google Sheets no respondió bien (' + r.status + '). Espera un momento y vuelve a intentar.' + (detalle ? ' Detalle: ' + detalle : ''));
    }
    return r.status === 204 ? null : r.json();
  }
  const rango = (hoja, celdas) => encodeURIComponent("'" + hoja + "'" + (celdas ? '!' + celdas : ''));

  // ------------------------------------------------------------ local
  function libroLocal() {
    try { return JSON.parse(localStorage.getItem(CLAVE_LOCAL) || 'null'); } catch (e) { return null; }
  }
  function guardarLocal(hojas) {
    try { localStorage.setItem(CLAVE_LOCAL, JSON.stringify(hojas)); } catch (e) { throw new Error('El navegador no deja guardar más datos en esta computadora. Descarga el libro en Excel como respaldo y conéctate a Google Sheets.'); }
  }
  function vacio() {
    const h = {};
    Object.keys(C.HOJAS).forEach((n) => { h[n] = [C.HOJAS[n].slice()]; });
    return h;
  }

  // ------------------------------------------------------------ interfaz pública
  const Datos = {
    get modo() { return cfg.modo; },
    get config() { return Object.assign({}, cfg); },
    get usuario() { return cfg.modo === 'google' && perfil ? (perfil.name || perfil.email) : cfg.usuario; },
    get correo() { return perfil ? perfil.email : ''; },
    conectado() { return cfg.modo === 'local' || !!token; },

    configurar(cambios) {
      Object.assign(cfg, cambios);
      if (cambios.libro != null) cfg.libro = idLibro(cambios.libro);
      guardarCfg();
    },

    async conectarGoogle() {
      if (!cfg.clientId) throw new Error('Falta el "ID de cliente" de Google. Pídeselo a quien configuró la app (viene en el README) y pégalo arriba.');
      if (!cfg.libro) throw new Error('Falta el enlace del libro de Google Sheets. Ábrelo en Google, copia la dirección y pégala arriba.');
      await cargarScriptGoogle();
      // Sin forzar la pantalla de permisos: Google solo la muestra la primera vez.
      await pedirToken(true);
      try {
        const r = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: 'Bearer ' + token } });
        perfil = r.ok ? await r.json() : null;
      } catch (e) { perfil = null; }
      cfg.modo = 'google';
      guardarCfg();
      return perfil;
    },

    usarLocal() { cfg.modo = 'local'; token = null; perfil = null; guardarCfg(); },

    async hojasQueFaltan() {
      if (cfg.modo !== 'google') return [];
      const m = await api(cfg.libro + '?fields=sheets.properties.title');
      const hay = new Set((m.sheets || []).map((s) => s.properties.title));
      return Object.keys(C.HOJAS).filter((n) => !hay.has(n));
    },

    // Crea las hojas que falten con sus títulos. Si se pasa `contenido`, llena las hojas vacías con eso.
    async prepararLibro(contenido) {
      if (cfg.modo !== 'google') {
        const h = libroLocal() || vacio();
        Object.keys(C.HOJAS).forEach((n) => { if (!h[n] || h[n].length <= 1) h[n] = contenido && contenido[n] ? contenido[n] : [C.HOJAS[n].slice()]; });
        guardarLocal(h);
        return [];
      }
      const faltan = await this.hojasQueFaltan();
      if (faltan.length) await api(cfg.libro + ':batchUpdate', { method: 'POST', body: JSON.stringify({ requests: faltan.map((t) => ({ addSheet: { properties: { title: t } } })) }) });
      const actual = await this.leerTodo();
      for (const n of Object.keys(C.HOJAS)) {
        const vaciaHoja = !actual[n] || actual[n].length <= 1;
        if (vaciaHoja) await this.escribirHoja(n, contenido && contenido[n] ? contenido[n] : [C.HOJAS[n].slice()]);
      }
      return faltan;
    },

    async leerTodo() {
      if (cfg.modo !== 'google') return libroLocal() || vacio();
      const qs = Object.keys(C.HOJAS).map((n) => 'ranges=' + rango(n)).join('&');
      const r = await api(cfg.libro + '/values:batchGet?' + qs + '&valueRenderOption=FORMATTED_VALUE');
      const out = {};
      Object.keys(C.HOJAS).forEach((n, i) => { out[n] = (r.valueRanges[i] && r.valueRanges[i].values) || [C.HOJAS[n].slice()]; });
      return out;
    },

    async escribirHoja(nombre, aoa) {
      if (cfg.modo !== 'google') {
        const h = libroLocal() || vacio();
        h[nombre] = aoa;
        guardarLocal(h);
        return;
      }
      await api(cfg.libro + '/values/' + rango(nombre) + ':clear', { method: 'POST', body: '{}' });
      const valores = aoa.map((f) => f.map((c) => (c == null ? '' : String(c))));
      await api(cfg.libro + '/values/' + rango(nombre, 'A1') + '?valueInputOption=RAW', { method: 'PUT', body: JSON.stringify({ values: valores }) });
    },

    async agregarFilas(nombre, filas) {
      if (!filas.length) return;
      if (cfg.modo !== 'google') {
        const h = libroLocal() || vacio();
        h[nombre] = (h[nombre] && h[nombre].length ? h[nombre] : [C.HOJAS[nombre].slice()]).concat(filas);
        guardarLocal(h);
        return;
      }
      const valores = filas.map((f) => f.map((c) => (c == null ? '' : String(c))));
      await api(cfg.libro + '/values/' + rango(nombre, 'A1') + ':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS', { method: 'POST', body: JSON.stringify({ values: valores }) });
    },

    reemplazarLocal(hojas) { guardarLocal(hojas); },
    idLibro,
  };

  root.Datos = Datos;
})(typeof self !== 'undefined' ? self : this);
