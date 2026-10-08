# Rol de Cajas – Ferre Mina

App para armar el **rol de cajas** de Ferre Mina de forma automática, a partir de:

- los **horarios de GIRHA** (obligatorio), y
- las **ventas por hora de SAP**. **La app ya trae un año de historia** (septiembre 2025 a agosto 2026), así que no hay que subir nada; solo si quieres usar ventas más recientes.

Funciona en el navegador, en computadora o celular. **Tus archivos no salen de tu computadora**: no hay servidor ni base de datos.

---

## Cómo se usa (paso a paso)

### 1 · Personal
- La primera vez agrega a cada vendedor de Ferre Mina con **nómina**, **nombre corto** y **color**.
- Presiona **💾 Exportar catálogo**. Se descarga `catalogo_ferre_mina.json`. Guárdalo; ahí también quedan los parámetros.
- Las siguientes veces usa **📂 Importar catálogo** y listo.

### 2 · GIRHA
- Sube el archivo de carga masiva (Excel o CSV) con 4 columnas: `Clave empresa | Nómina | Fecha | Clave horario`.
- La app:
  - toma solo al personal del catálogo e ignora a los demás,
  - corrige horas sin cero (`8:00-18:00` → `08:00-18:00`),
  - entiende `D` (descanso) y `NP` (no programado) como "no disponible",
  - **avisa si a alguien le falta un día** de jueves a miércoles.
- Si el archivo trae varias semanas, elige cuál usar.

### 3 · Vendedores
- Marca quién entra a **Caja 1 y Caja 2** esta semana.
- Arriba verás si **alcanza la gente**: cuántos turnos se necesitan y cuántos cubren los marcados.
- Presiona **⚙️ Generar rol**.

### 4 · Ventas (opcional)
- **No tienes que subir nada.** La app usa el histórico incluido: 101,405 tickets del 1 de septiembre de 2025 al 31 de agosto de 2026, promediados por día de la semana y hora.
- Si quieres usar ventas más recientes, sube el reporte de SAP. La app adivina las columnas; revisa que **Fecha, Hora, Ticket e Importe** sean correctas y presiona **📈 Calcular**. Con **↩️ Volver al histórico incluido** regresas al año guardado.
- El histórico guarda solo tickets por día de la semana y hora (promedio y día cargado); no guarda pesos ni el detalle de cada ticket.

**Cómo decide cuántas cajas**
- Toma los tickets de un **día cargado**: 8 de cada 10 días se cobra eso o menos en esa hora. No usa el promedio, porque con el promedio la tienda queda corta la mitad de los días.
- Divide entre lo que atiende una caja **sin que se haga fila**: 20 tickets por hora (se cambia en Parámetros). Cobrando sin parar una caja saca unos 40, pero los clientes llegan en grupos; en el año de historia la tienda ya puso a cobrar la segunda caja en más de la mitad de las horas con 15 a 20 tickets.
- La Caja 3 se pide solo desde **55 tickets por hora** (dos cajas a su máximo real). Cada pico se cubre con la menor cantidad de personas posible.
- Si quedan horas sin Caja 2, la pantalla del rol explica quién está en tienda a esa hora y cuántos días de caja lleva cada uno.
- Resultado con el histórico: entre semana y sábado, una caja de 8 a 10 y dos cajas casi todas las horas de 10 a 20; domingo, dos cajas desde las 9 y Caja 3 de 12 a 15.
- Si el archivo trae una fila por artículo, la app cuenta **tickets únicos**, no filas.
- Verás un **mapa de calor** por día y hora:
  - 🟩 **1 caja**: con Caja 1 basta; Caja 2 puede estar en piso.
  - 🟨 **2 cajas**: Caja 2 se queda cobrando.
  - 🟥 **3 cajas**: pico; se abre Caja 3 con un vendedor de piso.
- ¿Ya tenías el rol hecho? Presiona **🔁 Actualizar apoyos Caja 3**. **Caja 1 y Caja 2 no cambian.**

### 5 · Parámetros
Horario de la tienda por día, capacidad por caja (20 tickets por hora sin fila), tickets por hora para abrir Caja 3 (55), máximo de días en caja (3), turno mínimo y máximo (3 y 6 h) y bloques de media hora u hora completa. Si cambias algo, vuelve a generar el rol.

### 6 · Rol
- Formato igual al de Excel: **ROL DE CAJAS MINA**, vendedores en filas, **jueves a miércoles** en columnas, color por persona y etiqueta **C1 / C2**.
- **Toca cualquier celda** para ver **por qué** se asignó ese turno y para **cambiarlo a mano**. Al guardar, la app revisa otra vez las reglas.
- Fila roja **SIN CUBRIR**: horas sin Caja 1 o Caja 2. Tócala y verás quién puede cubrirla según su horario (aunque no esté marcado) y un botón **Asignar**.
- Fila **APOYO CAJA 3**: horas pico con el vendedor sugerido.
- **📊 Exportar a Excel**: rol con colores, más hojas "Por hora", "Resumen" y "Avisos".
- **🧹 Borrar rol**: quita el rol de la semana para empezar de nuevo. **Generar rol de nuevo** con los mismos horarios, vendedores y parámetros da el mismo rol.
- **🖨️ Imprimir / PDF**: sale en hoja carta horizontal, lista para pegar. En la ventana de impresión elige "Guardar como PDF" si quieres el archivo.

### 7 · Por día
Línea de tiempo hora por hora: quién está en Caja 1, Caja 2 y el apoyo de Caja 3, con las ventas de esa hora.

---

## Reglas que aplica la app

| Regla | Cómo la aplica |
|---|---|
| Mínimo 2 cajas abiertas todo el horario | Cubre Caja 1 y Caja 2 de apertura a cierre. Si no alcanza, marca el hueco en rojo; **no inventa** a nadie. |
| Caja 1 = cajero fijo | Se cubre primero, todos los días. |
| Caja 2 = cajero flotante | Se cubre con la gente que queda. Si no alcanza para todo el día, primero se da a cada día un turno en sus horas más cargadas y luego se rellenan las demás horas que piden 2 cajas; las horas tranquilas (basta Caja 1) quedan al final y se marcan en amarillo. Sin ventas: primero sábado, domingo y viernes. |
| Máx. 3 días por semana en C1/C2, 1 turno por día | No asigna un 4.º día ni dos turnos el mismo día. |
| Turno de 3 a 6 h, en bloques de media hora | Todos los turnos generados cumplen. |
| Dentro del horario GIRHA | Nunca asigna fuera de su horario ni en D o NP. |
| Reparto parejo | Prefiere a quien lleva menos días, menos cierres, menos fines de semana y menos horas. Los empates se rotan cada semana. |
| Caja 2 de piso | Donde nadie tiene turno de Caja 2, la app nombra a un vendedor que está en piso (con horario GIRHA y sin turno de caja) para que entre a cobrar cuando se junte fila. No cuenta en sus días de caja. Se ve en la fila **CAJA 2 DE PISO**. Solo queda en rojo si no hay nadie en piso. |
| Caja 3 = apoyo en horas pico | Sugiere a alguien en piso (con horario GIRHA y fuera de C1/C2), marcado o no, y rota a quien lleva menos apoyos. **No cuenta** en sus 3 días. Si no hay nadie en piso, lo avisa. |
| Cambios a mano | Avisa si alguien pasa de 3 días, si un turno sale de su horario o dura más o menos de lo permitido, y si quedan menos de 2 cajas. |

> **Ojo con la cuenta:** con horario de 8 a 21 y turnos de máximo 6 h, cada caja necesita 3 turnos por día (2 el domingo). Para cubrir Caja 1 y Caja 2 toda la semana se necesitan **40 turnos**. Con 10 vendedores × 3 días solo hay **30**. La pantalla 3 te muestra esta cuenta cada semana.

---

## Probar con datos de ejemplo

En la carpeta `ejemplos/` hay:

- `catalogo_ferre_mina.json`: 10 vendedores con color.
- `girha_ejemplo.xlsx` y `.csv`: semana del 01 al 07 de octubre de 2026. Incluye descansos, NP, horas sin cero inicial, un horario corto (Iván, 4 a 9), un día faltante (Juana, martes) y 5 personas de otras sucursales.
- `sap_ventas_ejemplo.xlsx`: 4 semanas de ventas (3 al 30 de septiembre de 2026), con varias filas por ticket.

Si la app ya está publicada, usa el botón **🧪 Probar con datos de ejemplo**. Si la abres desde tu computadora, sube esos archivos a mano en cada paso.

---

## Publicar la app

**GitHub Pages** (recomendado)
1. En GitHub: **Settings → Pages → Source: GitHub Actions**.
2. Al subir cambios a `main`, la app se publica sola (archivo `.github/workflows/rol-cajas-pages.yml`).

**Vercel**
1. Nuevo proyecto con este repositorio.
2. En **Root Directory** elige `rol-cajas`. Framework: *Other*. Sin comando de build.

**Sin publicar**: abre `rol-cajas/index.html` con doble clic. Todo funciona, salvo el botón de datos de ejemplo.

---

## Para quien le dé mantenimiento

- `index.html` + `css/estilos.css`: pantalla.
- `js/core.js`: reglas (lectura de GIRHA y SAP, armado del rol, validación). No depende de la pantalla.
- `js/app.js`: pantallas y botones. `js/excel.js`: exportación con colores.
- `vendor/xlsx.full.min.js`: SheetJS 0.18.5, incluido para que funcione sin internet.
- Pruebas de reglas: `cd rol-cajas && node --test tests/*.test.js`.
- Regenerar ejemplos: `node ejemplos/generar-ejemplos.js`.
- Actualizar el histórico incluido (`js/historico.js`) con un reporte nuevo de SAP: `node datos/generar-historico.js reporte.txt "Histórico Ferre Mina ..."`. El reporte original no se sube al repositorio.
- Guardar el trabajo: el navegador recuerda lo último como comodidad. Lo oficial es el **catálogo JSON** y el **Excel** exportado.
