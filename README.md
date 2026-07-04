# MetHub — Explorador de la Colección del Met Museum

## Integrantes
- Mariangel Campos
- Adrian Monroy

## Descripción
MetHub es una aplicación web de página única (SPA) que permite explorar la colección pública del Metropolitan Museum of Art usando la API Open Access del museo.

El proyecto se desarrolla con HTML, CSS y JavaScript vanilla, sin frameworks externos. La navegación se controla mediante `hash routing` y el contenido se actualiza dinámicamente en un único contenedor.

## Cómo ejecutar
1. Abrir el archivo `index.html` directamente en el navegador.
2. No se requiere servidor local ni instalación adicional.

## Estructura del proyecto
- `index.html`: contenedor principal y carga de scripts.
- `css/styles.css`: estilos globales y específicos de la UI.
- `js/api.js`: capa de conexión con la API del Met Museum.
- `js/app.js`: orquestador de la aplicación y registro de rutas.
- `js/router.js`: router de hash para las vistas.
- `js/view-helpers.js`: utilidades compartidas para carga, error y lectura de query.
- `js/components/`: componentes reutilizables como `nav-bar`, `loading-state`, `error-state` y `artwork-card`.
- `js/views/`: implementación de cada vista (`home`, `explore`, `detail`, `departments`, `artist`, `compare`, `puzzle`).

## Vistas implementadas
### `#home`
- Hero de bienvenida.
- Estadísticas generales obtenidas de la API.
- Galería de obras destacadas resuelta en paralelo con `Promise.allSettled`.

### `#explore`
- Búsqueda por texto con debounce.
- Filtros por departamento, rango de años, obras destacadas y obras con imagen.
- Paginación de resultados a 12 obras por página.
- Agregados en vivo calculados sobre las obras visibles de la página actual.
- Manejo de estados de carga y errores.

### `#detail/:id`
- Información completa de la obra.
- Imagen principal y galería de imágenes adicionales.
- Ficha técnica con campos y valores de reemplazo cuando faltan datos.
- Enlace a la vista del artista y botón para comparar.

### `#departments`
- Listado de departamentos curatoriales recuperado desde `/departments`.
- Cada tarjeta navega a `#explore` con el departamento preaplicado.
- Tarjeta especial de acceso al rompecabezas (`#puzzle`).

### `#artist/:name`
- Búsqueda de obras relacionadas al artista o cultura.
- Paginación de 12 obras por página.
- Muestra bio del artista si se encuentra en alguna obra.

### `#compare`
- Dos paneles (A y B) para seleccionar obras.
- Búsqueda interna con debounce y resolución de resultados en paralelo.
- Prevención de seleccionar la misma obra en ambos paneles.
- Tabla comparativa que resalta diferencias y calcula la brecha de años.

### `#puzzle`
- Vista adicional de rompecabezas interactivo.
- Búsqueda de obra, selección de dificultad y armado de piezas.
- Esta vista está disponible desde el listado de departamentos.

## Componentes principales
- `nav-bar`: navegación persistente y resaltado de vista activa.
- `loading-state`: indicador visual de carga.
- `error-state`: mensaje de error con botón de reintento.
- `artwork-card`: tarjeta de obra reutilizable con navegación al detalle.

## Decisiones técnicas relevantes
- Uso de `AbortController` y timeout en `js/api.js` para evitar peticiones colgadas.
- `Promise.allSettled` para resolver múltiples IDs en paralelo y procesar sólo los resultados válidos.
- Construcción del DOM usando `createElement`, `textContent` y `appendChild`, sin inyección de HTML externa.
- Router de hash simple que soporta parámetros como `detail/:id`, `artist/:name` y query strings para filtros.
- Navegación interna totalmente sin recarga de página.

## División de trabajo
- Mariangel Campos: vista `#home`, vista `#compare`, arquitectura general y lógica de búsqueda.
- Adrian Monroy: vista `#departments`, vista `#explore`, vista `#detail`, componentes base.
- Trabajo conjunto: vista `#explore`, global UI, router, componentes `nav-bar`, `loading-state`, `error-state`, y diseño visual.

## Notas adicionales
- La aplicación utiliza datos públicos de la API del Metropolitan Museum of Art.
- La aplicación no está afiliada al museo.
- Las imágenes pueden tener restricciones de uso comercial; el uso aquí es con fines educativos.


## Capturas

Home: 
![alt text](home.png)

Explore:
![alt text](explore.png)

Detail:
![alt text](detail.png)

Departments:
![alt text](departments.png)

Artist:
![alt text](artist.png)

Compare:
![alt text](compare.png)