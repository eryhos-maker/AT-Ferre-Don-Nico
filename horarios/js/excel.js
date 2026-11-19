/*
 * Exportadores a Excel. Mismo patrón que rol-cajas/js/excel.js.
 * - cargaMasiva: archivo de 4 columnas para GIRHA o para el rol de cajas.
 *   La fecha SIEMPRE va como texto aaaa-mm-dd: si va como fecha de Excel,
 *   GIRHA la lee al revés y rechaza el archivo.
 * - libroCompleto: el libro con todas las hojas (para respaldo o para importarlo a Google Sheets).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory;
  else root.ExcelHorarios = factory(root.XLSX);
})(typeof self !== 'undefined' ? self : this, function (XLSX) {
  'use strict';

  // filas: [['Clave empresa','Clave empleado','Fecha','Clave horario'], ...]
  function hojaCarga(filas) {
    const ws = XLSX.utils.aoa_to_sheet(filas);
    const rango = XLSX.utils.decode_range(ws['!ref']);
    for (let r = 1; r <= rango.e.r; r++) {
      const ref = XLSX.utils.encode_cell({ r, c: 2 });
      const c = ws[ref];
      if (c) { c.t = 's'; c.v = String(c.v); c.z = '@'; delete c.w; }
      const ref3 = XLSX.utils.encode_cell({ r, c: 3 });
      if (ws[ref3]) { ws[ref3].t = 's'; ws[ref3].v = String(ws[ref3].v); ws[ref3].z = '@'; }
    }
    ws['!cols'] = [{ wch: 14 }, { wch: 15 }, { wch: 12 }, { wch: 14 }];
    return ws;
  }

  function cargaMasiva(filas, nombreHoja) {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, hojaCarga(filas), nombreHoja || 'Carga');
    return new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx', compression: true }));
  }

  // hojas: { Plantilla: aoa, Tiendas: aoa, ... }
  function libroCompleto(hojas) {
    const wb = XLSX.utils.book_new();
    Object.keys(hojas).forEach((n) => {
      const ws = XLSX.utils.aoa_to_sheet(hojas[n]);
      // Todo como texto, para que Google Sheets no convierta fechas ni horas.
      Object.keys(ws).forEach((k) => { if (k[0] !== '!' && ws[k].t === 's') ws[k].z = '@'; });
      ws['!cols'] = (hojas[n][0] || []).map((h) => ({ wch: Math.max(10, String(h).length + 4) }));
      XLSX.utils.book_append_sheet(wb, ws, n);
    });
    return new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx', compression: true }));
  }

  // Lee un libro completo: { nombreHoja: aoa }
  function leerLibro(bytes) {
    const wb = XLSX.read(bytes, { type: 'array', raw: true });
    const out = {};
    wb.SheetNames.forEach((n) => { out[n] = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: false, defval: '' }); });
    return out;
  }

  function descargar(bytes, nombre) {
    const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  return { cargaMasiva, libroCompleto, leerLibro, descargar };
});
