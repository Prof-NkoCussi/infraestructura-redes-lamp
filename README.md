# Infraestructura escolar

Herramientas interactivas de redes y servidores, y documentación técnica, pensadas para la
infraestructura informática de una escuela secundaria.

Cada herramienta da el resultado técnico completo y, al lado, lo explica en lenguaje llano:
sirve para quien administra la red y también para quien nunca vio una máscara de subred.

**Probala en línea:** [Calculadora de subredes](https://prof-nkocussi.github.io/infraestructura-redes-lamp/herramientas/subredes/)

## Herramientas

| Herramienta | Qué hace | Estado |
|---|---|---|
| [Calculadora de subredes](herramientas/subredes/) | Escribís la IP de un equipo y te dice a qué red pertenece, cuántos equipos entran, qué direcciones se pueden usar y cuáles no. Divide la red en partes iguales y calcula al revés: de la cantidad de equipos al tamaño de red que hace falta. | Lista |
| Permisos efectivos | — | En preparación |
| Generador LAMP | — | En preparación |
| Diagnóstico de hardware | — | En preparación |

### Calculadora de subredes

- **Modo Simple:** el resultado en palabras simples. Muestra la red, el rango de direcciones
  para los equipos y las dos que no se usan, dibujadas como un tramo de ruta con la IP marcada.
- **Modo Técnico:** todos los datos, cada uno con su botón de copiar. Incluye máscara,
  wildcard, broadcast, cantidad de hosts, clase, tipo de dirección y la IP en binario.
- **Glosario:** cada palabra técnica se explica al tocarla.
- **Avisos:** salen solo cuando hacen falta. Por ejemplo, si la IP es la dirección de red o
  el broadcast, o si es una 169.254.x.x, que suele indicar un problema con el router.
- **Enlaces para compartir:** cada resultado se puede mandar como enlace y abre con el cálculo
  hecho, por ejemplo `…/herramientas/subredes/#192.168.1.10/24`.

## Documentación

Manuales de procedimiento, en preparación:

- Cableado estructurado
- Impresoras y escáneres en red
- Servidores de archivos con Samba
- Direccionamiento IP

## Cómo está hecho

- HTML, CSS y JavaScript sin frameworks, sin dependencias y sin paso de compilación.
  El sitio se publica tal cual en GitHub Pages.
- Funciona en celular, tablet y PC, con tema claro y oscuro.
- Accesible: contraste de 4,5:1 o más en todo el texto, uso completo con teclado y textos
  para lectores de pantalla.
- La lógica de cada herramienta está separada de la interfaz y tiene tests:
  `herramientas/<herramienta>/<herramienta>.js` hace las cuentas y `ui.js` maneja la pantalla.
- Tipografía [Barlow](https://github.com/jpt/barlow), incluida en el repositorio con su
  licencia SIL Open Font License (`assets/fonts/OFL.txt`).

## Probarlo en tu computadora

1. Cloná el repositorio:

   ```sh
   git clone https://github.com/Prof-NkoCussi/infraestructura-redes-lamp.git
   ```

2. Abrí la carpeta con un servidor estático, por ejemplo la extensión Live Server de
   VS Code: clic derecho sobre `herramientas/subredes/index.html` y luego "Open with Live Server".

> Abrir el archivo con doble clic no funciona. El navegador bloquea los módulos de
> JavaScript cuando la página no viene de un servidor.

## Tests

Hace falta Node.js 20 o más nuevo. No hay nada que instalar:

```sh
node --test
```

## Estructura

```
assets/
  css/base.css        estilos compartidos
  js/comun.js         utilidades compartidas (glosario, avisos, copiar, tema)
  fonts/              tipografía Barlow y su licencia
herramientas/
  subredes/           index.html, subredes.js (cálculos), ui.js (pantalla)
tests/
  subredes.test.js
```

## Licencia

[MIT](LICENSE) © Prof. Nicolás A. Cussi<br>
*FULL STACK DEVELOPER • DATA SCIENCE • AI*
