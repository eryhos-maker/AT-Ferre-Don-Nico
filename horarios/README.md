# Horarios Semanales – Ferretería y Pintura · Ferre Don Nico

App para **generar el horario semanal** de los colaboradores de Ferretería y Pintura, **corregirlo a mano** con revisión en vivo y sacar:

- la **carga masiva de GIRHA**,
- el archivo para la app de **Rol de Cajas**,
- el **PDF de una hoja** (oficio horizontal),
- los **mensajes de WhatsApp** por sucursal.

Funciona en el navegador, en computadora o celular. No hay servidor: los datos viven en un **libro de Google Sheets** y cada quien entra con su cuenta de Google.

---

## Cada semana (paso a paso)

1. **Catálogos** · Revisa que la plantilla y las novedades estén al día (vacaciones, incapacidades, comisiones, PTT, festivos).
2. **Generar semana** · Elige la semana (siempre de **jueves a miércoles**) y presiona **Generar**. La app aplica las reglas en este orden:
   1. vacaciones, incapacidades y comisiones (esos días no se tocan),
   2. días festivos (el descanso de ese día sale como **NP**),
   3. descansos fijos,
   4. rotación de apertura y cierre (Esteban y Rocío),
   5. huecos de cobertura (busca un comodín con permiso para esa tienda),
   6. horas (ajusta claves con **la misma hora de entrada** para cerrar la jornada).

   Lo que no puede resolver lo deja **en rojo con el motivo**. Nunca inventa una asignación.
3. **Tablero** · Toca cualquier celda para cambiarla. El panel de la derecha se actualiza con cada cambio: tiendas sin apertura, personas fuera de jornada, claves que no existen, descansos mal contados, gente sin nómina y **turnos libres** (el margen que queda para un imprevisto).
4. **Validación** · Los nueve criterios con semáforo. Si todo está en verde, **Autorizar**. Si hay algo en rojo y aun así se autoriza, la app pide marcar la casilla y **dejar una nota** con el porqué.
5. **Exportar** · Los cuatro archivos (ver abajo).
6. **Historial** · Las semanas anteriores, quién las generó y **qué celda movió cada quien y cuándo**.

> Si cambias algo en el tablero de una semana ya autorizada, regresa sola a **borrador** para que se vuelva a autorizar.

---

## Conectar el libro de Google Sheets (se hace una sola vez)

### 1 · Crear el libro

1. En Google Drive: **Nuevo → Hoja de cálculo de Google**. Ponle nombre, por ejemplo *Horarios Ferretería y Pintura*.
2. **Archivo → Importar → Subir** y elige `ejemplos/libro_horarios_ejemplo.xlsx` (está en esta carpeta). En *Ubicación de importación* elige **Reemplazar hoja de cálculo**.
   - El libro de ejemplo trae las ocho hojas con **datos de prueba**: las personas reales solo llevan lo que ya se sabía de ellas, y "Vendedor 01", "Encargado Canalejas", etc. son de relleno. **Cámbialos por la plantilla real antes de usarlo.**
   - Otra opción: deja el libro vacío, conéctalo a la app y en *Catálogos* presiona **Crear hojas que falten**.
3. **Compartir** el libro con Gabriel Salas e Itzel como **Editor**.

### 2 · Sacar el "ID de cliente" de Google

Es la llave que deja a la app pedirle permiso a tu cuenta de Google para leer y escribir el libro. Se hace una vez y se comparte el mismo ID con los demás.

1. Entra a <https://console.cloud.google.com> con la cuenta de Eryho y crea un proyecto (por ejemplo *Horarios Don Nico*).
2. **APIs y servicios → Biblioteca** → busca **Google Sheets API** → **Habilitar**.
3. **APIs y servicios → Pantalla de consentimiento de OAuth**:
   - Tipo de usuario: **Externo** (o *Interno* si usan Google Workspace).
   - Nombre de la app: *Horarios Ferre Don Nico*. Correo de soporte: el tuyo.
   - En **Usuarios de prueba** agrega los correos de Eryho, Gabriel e Itzel. Mientras la app esté "en pruebas", **solo esos correos pueden entrar**.
4. **APIs y servicios → Credenciales → Crear credenciales → ID de cliente de OAuth**:
   - Tipo de aplicación: **Aplicación web**.
   - **Orígenes autorizados de JavaScript**: `https://eryhos-maker.github.io` (la dirección de GitHub Pages, sin nada después).
   - Guardar y **copiar el ID de cliente** (termina en `.apps.googleusercontent.com`).

### 3 · Conectar la app

1. Abre la app y ve a **1 · Catálogos**.
2. Pega el **ID de cliente** y el **enlace del libro** (la dirección completa de la hoja, como sale en el navegador).
3. Presiona **Conectar con Google** y acepta los permisos. Listo: lo que hagas se guarda en el libro.

Cada persona hace este paso una vez en su computadora o celular (la app recuerda el ID y el enlace).

**¿Sin internet o solo para probar?** Usa **Trabajar en esta computadora → Probar con datos de ejemplo**. Ahí lo que hagas solo lo ves tú; descárgalo con **Descargar libro (Excel)** para no perderlo.

---

## Dar de alta a alguien nuevo

1. **Catálogos → Plantilla → ➕ Alta de personal**.
2. Llena nombre completo, nombre corto (como sale en WhatsApp), área, puesto, CECO, tienda base, jornada (48, 40 o 36), descansos por semana y descanso fijo si tiene.
3. **Si la nómina todavía no llega, déjala vacía.** La persona se programa normal y sale en el tablero, el PDF y WhatsApp; la app **la saca sola del archivo de GIRHA** y te avisa con su nombre. Cuando llegue la nómina, escríbela en la Plantilla y guarda: sus días ya programados se ligan solos a su nómina.
4. Si va a cubrir otras tiendas o se puede quedar a dormir en Jocotitlán, agrégalo en la hoja **Reglas** (`puede_cubrir`, `pernocta`).
5. Para una baja, cambia **estatus** a `baja` (no borres la fila, así se conserva el historial).
6. **El orden** en el tablero, el PDF y los archivos es el de las filas de la hoja Plantilla dentro de cada área. Para mover a alguien, mueve su fila en Google Sheets.

---

## Las hojas del libro

| Hoja | Columnas | Para qué |
|---|---|---|
| **Plantilla** | nomina · nombre · ceco · puesto · area · sucursal_base · jornada_horas · descansos_semana · descanso_fijo · estatus · nombre_corto | Una fila por colaborador. `nombre_corto` es opcional (si va vacío se arma con nombre y apellido). |
| **Tiendas** | tienda · dia · abre · cierra · clave_apertura · clave_cierre | Una fila por tienda y por día. Si la tienda tiene un solo turno, `clave_cierre` va igual o vacía. |
| **Claves** | clave · descripcion · horas_efectivas · activa | El catálogo de GIRHA, con `D` y `NP`. **Ninguna clave fuera de esta hoja sale en la carga.** |
| **Reglas** | tipo · sujeto · valor · nota | Reglas que se cambian sin tocar código (abajo). |
| **Novedades** | nomina · tipo · desde · hasta · sucursal · nota | Vacaciones, incapacidad, comisión, PTT y festivos (el festivo va sin nómina). |
| **Semanas** | id_semana · fecha_inicio · estado · generado_por · fecha_generado · nota | Una fila por semana: `borrador`, `autorizado` o `cargado`. |
| **Dias** | id_semana · nomina · fecha · clave · sucursal · nota · tipo | Siete filas por persona y semana. `tipo` dice si trabaja, descansa (D/NP) o tiene novedad (VAC, PTT, INC, COM). |
| **Cambios** | id_semana · fecha_hora · usuario · nomina · fecha · antes · despues · nota | El registro de quién movió qué y cuándo. |

> Además de las seis hojas del planteamiento original, el libro lleva **Novedades** (de ahí salen vacaciones y festivos al generar) y **Cambios** (el historial de quién movió cada celda). También se agregó la columna `tipo` en *Dias*, `nota` en *Semanas* y `nombre_corto` en *Plantilla*.

### Reglas

| tipo | sujeto | valor | Ejemplo |
|---|---|---|---|
| `descanso_fijo` | nómina | día | `348` · `sábado` (uno de los dos descansos de Daniel va fijo en sábado) |
| `pareja_cobertura` | tiendas separadas con `\|` | nómina del chofer | `Jocotitlán\|Atlacomulco` · `84`: cuando descansa Fredi descansa Maira, y un solo viaje con la unidad de Gabriel cubre las dos |
| `puede_cubrir` | nómina | tiendas separadas con `\|`; `*` = todas; `!Tienda` = todas menos esa | `1414` · `*\|!Zinacantepec` (Zinacantepec solo la cubre Gabriel) |
| `pernocta` | nómina | tienda | `1801` · `Jocotitlán`: se puede quedar a dormir allá |
| `relleno` | tiendas separadas con `\|` | área o nóminas (vacío = COMODINES) | `Centro de Color\|Jilotepec (Berel Centro)` · `COMODINES`: ahí los comodines pueden hacer turnos cortos para cuadrar sus horas |
| `rotacion` | dos nóminas separadas con `\|` | tienda | `780\|1042` · `Ferre Mina`: rotan apertura y cierre cada semana |

**Traslados:** a las tiendas de la pareja solo va quien se puede quedar a dormir, o alguien que va y regresa ese día **en la unidad del chofer**. Si el chofer se tiene que quedar en su tienda, la app primero manda a un comodín a relevarlo. Nadie se va en camión.

**Rotación:** la app ve quién abrió la semana anterior (en la hoja *Dias*) y propone lo contrario. Si al que le toca cerrar descansa ese día, el otro se recorre al cierre.

---

## Los cuatro archivos

**A · Carga masiva de GIRHA** — Excel de 4 columnas: `Clave empresa | Clave empleado | Fecha | Clave horario`.
- Empresa siempre `NSD`. **La fecha va como texto `aaaa-mm-dd`** (si va como fecha de Excel, GIRHA la lee al revés).
- Siete filas por persona, empezando en jueves. Descanso `D`, descanso por festivo `NP`.
- Vacaciones, PTT, incapacidad y comisión van con **el horario regular** de la persona (esas incidencias se capturan aparte en GIRHA).
- La clave sale **escrita como en la hoja Claves** (si el catálogo dice `8:00-18:00`, así sale).
- Si alguna clave no está en el catálogo, **no genera el archivo** y dice quién, qué día y qué clave cambiar.
- **Solo seleccionadas:** marca con ☑ en el tablero a una o dos personas para corregirlas sin volver a subir toda la semana.

**B · Rol de cajas** — mismo formato, listo para la app de Rol de Cajas de Ferre Mina. Todo día en que la persona no está en Ferre Mina va como `D` (descanso, festivo, vacaciones, PTT, comisión o cobertura en otra tienda). Van el personal de Ferre Mina y quien trabaje ahí esa semana.

**C · PDF de una hoja** — en la ventana de impresión elige **Guardar como PDF**, tamaño **Oficio** y orientación **Horizontal**. La app encoge la tabla para que quepan todos en una hoja.

**D · WhatsApp** — un mensaje por tienda con los nombres en `*negritas*`, listo para copiar y pegar.

---

## Detalles que ya costaron caro (y cómo los resuelve la app)

- **Claves sin cero a la izquierda:** compara contra el catálogo ya normalizado (`8:00-18:00` = `08:00-18:00`) y exporta la forma exacta del catálogo.
- **La hora de entrada es la que importa:** cuando la app ajusta horas, solo cambia la salida; la entrada siempre coincide con el catálogo.
- **Personal nuevo sin nómina:** se programa y se excluye solo de GIRHA, con aviso.
- **La holgura se acaba rápido:** el panel muestra los **turnos libres** por día. Si un día llega a 0, cualquier imprevisto deja una tienda sin abrir.

---

## Puntos a revisar con los datos reales

El libro de ejemplo trae supuestos que hay que confirmar:
- Turnos de **Ferre Mina**: apertura `08:00-17:00` y cierre `12:00-21:00`; domingo `08:00-16:00` y `11:00-19:00`.
- **Horas efectivas** de los cierres de Centro de Color (`15:00-21:00` y `13:00-19:00` puestos como 6 h). Con eso, quien cierra Centro de Color tiene que ir a 36 h.
- **Comodines** con 2 descansos (4 × 10 + un día de fin de semana). Cada uno aguanta un solo día corto (8 h) por semana: un fin de semana en Berel o un día en Zinacantepec. Por eso, cuando falta alguien, la app prefiere dejar una tienda en rojo antes que descuadrar las horas de un comodín.
- CECO de Canalejas y Jocotitlán (puestos como *POR DEFINIR*).
- Incapacidad y comisión se mandan a GIRHA con el horario regular, igual que vacaciones y PTT.

---

## Para quien mantiene la app

```
horarios/
├── index.html
├── css/estilos.css       ← idéntico al de rol-cajas (una prueba lo revisa)
├── css/horarios.css      ← solo lo propio del tablero y la impresión
├── js/core.js            ← motor puro: reglas, generador, validación, archivos. Sin pantalla.
├── js/excel.js           ← exportadores a Excel (SheetJS)
├── js/datos.js           ← Google Sheets (Google Identity Services) o esta computadora
├── js/app.js             ← pantallas y pestañas
├── vendor/xlsx.full.min.js
├── ejemplos/datos-ejemplo.js      ← datos de prueba (los usan pruebas, app y libro de ejemplo)
├── ejemplos/generar-libro.js      ← arma libro_horarios_ejemplo.xlsx
└── tests/                ← pruebas en Node
```

- **Pruebas:** `cd horarios && node --test tests/*.test.js` (Node 18 o más nuevo). Cubren los nueve criterios, el generador y los archivos de salida, y revisan que el archivo de rol de cajas lo lea la función `leerGirha` de `rol-cajas` sin cambios.
- **Libro de ejemplo:** `cd horarios && node ejemplos/generar-libro.js`.
- `core.js` copia de `rol-cajas/js/core.js`: `normalizarClave`, `normNomina`, `parseFecha`, `aMin`, `aHora`, `sumarDias`, `inicioSemana`, `fechaISO` y `DIAS`. `tests/compartido.test.js` revisa que sigan dando lo mismo.
- **Publicación:** el flujo `.github/workflows/rol-cajas-pages.yml` publica las dos apps juntas: Rol de Cajas sigue en la raíz del sitio y esta app en `/horarios/`.
