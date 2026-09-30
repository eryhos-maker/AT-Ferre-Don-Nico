/*
 * Exporta a Excel con colores. SheetJS (versión libre) no escribe colores,
 * así que después de armar el archivo se reemplaza la hoja de estilos
 * y se marca cada celda de la primera hoja con su estilo.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory;
  else root.ExcelRol = factory(root.XLSX);
})(typeof self !== 'undefined' ? self : this, function (XLSX) {
  'use strict';

  function hex(c) { return (c || '').replace('#', '').toUpperCase(); }
  function xmlEsc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  // estilos: arreglo de { fill, bold, size, color, border, center, wrap }
  function hojaEstilos(estilos) {
    const fuentes = ['0|11|000000'], rellenos = [], xfs = [];
    const fuenteDe = (e) => {
      const k = (e.bold ? 1 : 0) + '|' + (e.size || 11) + '|' + (hex(e.color) || '000000');
      let i = fuentes.indexOf(k);
      if (i < 0) { fuentes.push(k); i = fuentes.length - 1; }
      return i;
    };
    const rellenoDe = (e) => {
      if (!e.fill) return 0;
      let i = rellenos.indexOf(hex(e.fill));
      if (i < 0) { rellenos.push(hex(e.fill)); i = rellenos.length - 1; }
      return i + 2;
    };
    estilos.forEach((e) => {
      const al = '<alignment vertical="center"' + (e.center ? ' horizontal="center"' : '') + (e.wrap ? ' wrapText="1"' : '') + '/>';
      xfs.push('<xf numFmtId="0" fontId="' + fuenteDe(e) + '" fillId="' + rellenoDe(e) + '" borderId="' + (e.border ? 1 : 0) + '" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">' + al + '</xf>');
    });
    const f = fuentes.map((k) => {
      const [b, sz, col] = k.split('|');
      return '<font>' + (b === '1' ? '<b/>' : '') + '<sz val="' + sz + '"/><color rgb="FF' + col + '"/><name val="Calibri"/><family val="2"/></font>';
    });
    const fl = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>']
      .concat(rellenos.map((c) => '<fill><patternFill patternType="solid"><fgColor rgb="FF' + c + '"/><bgColor indexed="64"/></patternFill></fill>'));
    const borde = '<border><left style="thin"><color rgb="FF8C96A3"/></left><right style="thin"><color rgb="FF8C96A3"/></right><top style="thin"><color rgb="FF8C96A3"/></top><bottom style="thin"><color rgb="FF8C96A3"/></bottom><diagonal/></border>';
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
      '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<fonts count="' + f.length + '">' + f.join('') + '</fonts>' +
      '<fills count="' + fl.length + '">' + fl.join('') + '</fills>' +
      '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>' + borde + '</borders>' +
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
      '<cellXfs count="' + (xfs.length + 1) + '"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' + xfs.join('') + '</cellXfs>' +
      '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
      '<dxfs count="0"/><tableStyles count="0" defaultTableStyle="TableStyleMedium9" defaultPivotStyle="PivotStyleMedium4"/></styleSheet>';
  }

  /*
   * hojas: [{ nombre, aoa, estilos: {"B4": estilo}, cols: [anchos], filas: [altos], merges }]
   * Solo la primera hoja lleva colores.
   */
  function crearLibro(hojas) {
    const wb = XLSX.utils.book_new();
    hojas.forEach((h) => {
      const ws = XLSX.utils.aoa_to_sheet(h.aoa);
      if (h.cols) ws['!cols'] = h.cols.map((w) => ({ wch: w }));
      if (h.filas) ws['!rows'] = h.filas.map((hpt) => (hpt ? { hpt } : {}));
      if (h.merges) ws['!merges'] = h.merges;
      XLSX.utils.book_append_sheet(wb, ws, h.nombre);
    });
    const datos = XLSX.write(wb, { type: 'array', bookType: 'xlsx', compression: true });
    const primera = hojas[0];
    if (!primera.estilos || !Object.keys(primera.estilos).length) return new Uint8Array(datos);

    const lista = [], indice = {}, refs = {};
    Object.keys(primera.estilos).forEach((ref) => {
      const e = primera.estilos[ref];
      const k = JSON.stringify(e);
      if (indice[k] == null) { lista.push(e); indice[k] = lista.length; }
      refs[ref] = indice[k];
    });
    const zip = XLSX.CFB.read(new Uint8Array(datos), { type: 'array' });
    const buscar = (fin) => zip.FileIndex[zip.FullPaths.findIndex((p) => p.endsWith(fin))];
    const poner = (entrada, texto) => {
      const bytes = new TextEncoder().encode(texto);
      entrada.content = bytes;
      entrada.size = bytes.length;
    };
    poner(buscar('xl/styles.xml'), hojaEstilos(lista));
    const hoja = buscar('xl/worksheets/sheet1.xml');
    const xml = new TextDecoder().decode(hoja.content).replace(/<c r="([A-Z]+\d+)"/g, (m, ref) => (refs[ref] ? '<c r="' + ref + '" s="' + refs[ref] + '"' : m));
    poner(hoja, xml);
    return new Uint8Array(XLSX.CFB.write(zip, { fileType: 'zip', type: 'array', compression: true }));
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

  return { crearLibro, descargar, xmlEsc };
});
