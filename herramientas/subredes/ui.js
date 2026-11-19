/**
 * Calculadora de subredes: interfaz.
 *
 * Las cuentas las hace subredes.js. Acá solo se lee lo que escribe el usuario
 * y se muestra el resultado en dos niveles: Simple (palabras llanas, para
 * cualquiera) y Técnico (todos los datos, para quien sabe de redes).
 */

import {
  ErrorEntrada,
  calcularSubred,
  prefijoParaHosts,
  subdividir,
  prefijoAMascara,
  numeroAIP,
  parsearIP,
} from './subredes.js';

import {
  $,
  $$,
  crear,
  icono,
  aviso,
  conPausa,
  formatearNumero,
  agregarAlGlosario,
  termino,
  leerPreferencia,
  guardarPreferencia,
  notificar,
} from '../../assets/js/comun.js';

/* ───────────── Glosario ───────────── */

agregarAlGlosario({
  ip: {
    titulo: 'Dirección IP',
    texto: [
      'Es la dirección de un equipo dentro de una red, como la dirección de una casa en un barrio.',
      'Son cuatro números del 0 al 255 separados por puntos, por ejemplo 192.168.1.10. Dos equipos de la misma red nunca pueden tener la misma.',
    ],
  },
  mascara: {
    titulo: 'Máscara de red',
    texto: [
      'Indica qué parte de la IP es el barrio (la red) y qué parte es la casa (el equipo). Por eso define cuántos equipos entran en la red.',
      'Se escribe de dos formas que significan lo mismo: 255.255.255.0 o /24. El /24 quiere decir que los primeros 24 de los 32 bits de la IP son la red.',
      'Acá la elegís con el deslizador: más grande, más equipos.',
    ],
  },
  red: {
    titulo: 'Nombre de la red',
    texto: [
      'Es la primera dirección del rango y funciona como el nombre del barrio: identifica a toda la red. En los manuales se la llama "dirección de red".',
      'No se le puede poner a ningún equipo.',
    ],
  },
  broadcast: {
    titulo: 'Broadcast (aviso a todos)',
    texto: [
      'Es la última dirección del rango. Lo que se manda ahí les llega a todos los equipos de la red a la vez, como un megáfono.',
      'No se le puede poner a ningún equipo.',
    ],
  },
  puerta: {
    titulo: 'Puerta de enlace',
    texto: [
      'Es el router: el equipo que conecta tu red con otras redes y con internet.',
      'Cada equipo tiene que saber cuál es. Suele ser la primera dirección usable de la red (por ejemplo, 192.168.1.1), aunque puede ser cualquiera.',
    ],
  },
  equipos: {
    titulo: 'Equipos (hosts)',
    texto: [
      'Cualquier aparato conectado a la red que necesita una IP: compus, notebooks, celulares, impresoras, cámaras, televisores.',
      'En los libros de redes se los llama "hosts".',
    ],
  },
  wildcard: {
    titulo: 'Wildcard',
    texto: [
      'Es la máscara dada vuelta: donde la máscara tiene 255, la wildcard tiene 0, y al revés.',
      'La usan algunos routers (por ejemplo, los Cisco) en las listas de acceso y en OSPF.',
    ],
  },
  binario: {
    titulo: 'Binario',
    texto: [
      'Las computadoras guardan la IP como 32 ceros y unos (bits), en cuatro grupos de 8.',
      'La máscara marca con unos los bits que son de la red y con ceros los que son del equipo.',
    ],
  },
  clase: {
    titulo: 'Clase',
    texto: [
      'Es la forma vieja de agrupar las IP (A, B, C, D y E) según el primer número.',
      'Hoy se usan máscaras de cualquier tamaño (CIDR), pero las clases todavía aparecen en manuales y exámenes.',
    ],
  },
  cidr: {
    titulo: 'CIDR',
    texto: [
      'Es la forma actual de indicar el tamaño de una red: la IP, una barra y la cantidad de bits que son de la red, como en 192.168.1.0/24.',
      'Reemplazó a las clases porque permite redes de cualquier tamaño, y no solo las tres de siempre.',
    ],
  },
});

/** Cómo explicar en palabras simples cada tipo de dirección que devuelve tipoDe(). */
const TIPOS = {
  'Privada (RFC 1918)': {
    nombre: 'Privada',
    texto: 'Solo existe dentro de tu red local; desde internet no se ve.',
  },
  'Pública': {
    nombre: 'Pública',
    texto: 'Se ve desde internet. La asigna tu proveedor de internet y es única en el mundo.',
  },
  'Compartida / CGNAT (RFC 6598)': {
    nombre: 'De tu proveedor (CGNAT)',
    texto: 'La usan los proveedores de internet para compartir una misma IP pública entre muchos clientes.',
  },
  'Loopback': {
    nombre: 'El propio equipo',
    texto: 'Es el equipo hablándose a sí mismo: 127.0.0.1 quiere decir "yo". Sirve para pruebas.',
  },
  'Link-local / APIPA': {
    nombre: 'Automática (sin router)',
    texto: 'El equipo se la pone solo cuando no consigue una IP del router.',
  },
  'Documentación (RFC 5737)': {
    nombre: 'Solo para ejemplos',
    texto: 'Está reservada para ejemplos en manuales y libros. No se usa en redes reales.',
  },
  'Multicast': {
    nombre: 'Para grupos (multicast)',
    texto: 'Sirve para mandar lo mismo a un grupo de equipos a la vez, como un video en vivo. No se le pone a un equipo.',
  },
  'Broadcast limitado': {
    nombre: 'Aviso a toda la red',
    texto: 'Es la dirección para hablarle a todos los equipos de la red local. No se le pone a un equipo.',
  },
  'Pruebas de rendimiento (RFC 2544)': {
    nombre: 'Para pruebas de laboratorio',
    texto: 'Está reservada para medir el rendimiento de equipos de red. No se usa en redes reales.',
  },
  'Esta red (reservada)': {
    nombre: 'Reservada',
    texto: 'Está reservada para usos especiales. No se le pone a un equipo.',
  },
  'Reservada': {
    nombre: 'Reservada',
    texto: 'Está reservada para usos especiales. No se le pone a un equipo.',
  },
};

const infoTipo = (tipo) => TIPOS[tipo] ?? { nombre: tipo, texto: '' };

/* ───────────── Elementos de la página ───────────── */

const formulario = $('#calculadora');
const campoIP = $('#ip');
const errorIP = $('#error-ip');
const deslizador = $('#tamanio');
const textoTamanio = $('#tamanio-texto');
const botonAchicar = $('#achicar');
const botonAgrandar = $('#agrandar');
const seccionResultado = $('#resultado');
const vacio = $('#resultado-vacio');
const contenido = $('#resultado-contenido');
const anuncio = $('#anuncio');
const seccionDivision = $('#division');
const selectorPartes = $('#partes');
const resultadoDivision = $('#division-resultado');
const planificador = $('#planificador');
const campoCantidad = $('#cantidad');
const errorCantidad = $('#error-cantidad');
const resultadoPlan = $('#plan-resultado');

const estado = {
  resultado: null,                 // último cálculo válido
  modo: leerPreferencia('subredes-modo') === 'tecnico' ? 'tecnico' : 'simple',
  partes: 2,                       // en cuántas partes dividir
  ultimoEstricto: null,            // texto que ya se validó al salir del campo
};

/* ───────────── Ayudas ───────────── */

const hostsDe = (prefijo) => (prefijo === 32 ? 1 : prefijo === 31 ? 2 : 2 ** (32 - prefijo) - 2);
const equipos = (n) => `${formatearNumero(n)} ${n === 1 ? 'equipo' : 'equipos'}`;
const bits = (n) => `${n} ${n === 1 ? 'bit' : 'bits'}`;
const prefijoDelDeslizador = () => 32 - Number(deslizador.value);
const movimientoReducido = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Acepta comas en vez de puntos (teclados en español) y espacios de más. */
const normalizar = (texto) => texto.replace(/,/g, '.').replace(/\s+/g, ' ').trim();

/** "192.168.1.10/24" → { ip: '192.168.1.10', mascara: '24' }. Sin máscara: mascara = null. */
function separar(texto) {
  const partes = texto.match(/^(\S+?)\s*(?:\/|\s)\s*(.*)$/);
  return partes ? { ip: partes[1], mascara: partes[2] } : { ip: texto, mascara: null };
}

/** ¿Es el comienzo de una IP que todavía se está escribiendo? ("192.168." o "10.0") */
const PARCIAL = /^(\d{1,3}\.){0,3}\d{0,3}$/;
const esParcial = (texto) => PARCIAL.test(texto) && (texto.split('.').length < 4 || texto.endsWith('.'));

function estaIncompleto({ ip, mascara }) {
  if (esParcial(ip)) return true;
  if (mascara === '') return true;
  return Boolean(mascara && mascara.includes('.') && esParcial(mascara));
}

/** Pasa los mensajes técnicos de subredes.js a palabras simples. */
function mensajeAmigable(mensaje) {
  let partes;
  if (/4 octetos/.test(mensaje)) {
    return 'Una IP tiene 4 números separados por puntos, por ejemplo 192.168.1.10.';
  }
  if ((partes = mensaje.match(/Octeto inválido: "(.*)"/))) {
    return `"${partes[1]}" no vale: cada parte de la IP tiene que ser un número del 0 al 255.`;
  }
  if ((partes = mensaje.match(/fuera de rango: (\d+)/))) {
    return `${partes[1]} se pasa: cada número de la IP va del 0 al 255.`;
  }
  if ((partes = mensaje.match(/Octeto "(\d+)" con ceros/))) {
    return `Sacale los ceros de adelante a "${partes[1]}" (por ejemplo, 010 se escribe 10).`;
  }
  if (/contiguos/.test(mensaje)) {
    return 'Esa máscara no existe. Las válidas son como 255.255.255.0 o 255.255.240.0. Si tenés dudas, usá el deslizador.';
  }
  if (/no es una máscara/.test(mensaje)) {
    return 'No entendí la máscara. Escribila como /24 o como 255.255.255.0, o usá el deslizador.';
  }
  if (/Prefijo inválido/.test(mensaje)) {
    return 'La máscara va de /0 a /32. Si tenés dudas, usá el deslizador.';
  }
  return mensaje;
}

function mostrarError(campo, caja, mensaje) {
  caja.textContent = mensaje ?? '';
  caja.hidden = !mensaje;
  if (mensaje) {
    campo.setAttribute('aria-invalid', 'true');
  } else {
    campo.removeAttribute('aria-invalid');
  }
}

/** Con un dato a medio escribir o inválido, el último resultado queda a la vista, sellado. */
function marcarDesactualizado(si) {
  if (si && estado.resultado) {
    seccionResultado.dataset.estado = 'desactualizado';
  } else {
    delete seccionResultado.dataset.estado;
  }
}

const anunciar = conPausa((texto) => {
  if (anuncio.textContent !== texto) anuncio.textContent = texto;
}, 700);

/* ───────────── Piezas de la vista ───────────── */

/** La placa del resultado: el cartel violeta con los datos que importan, como un cartel de distancias. */
function placa(r) {
  const tipo = infoTipo(r.tipo);
  const renglones = r.prefijo === 32
    ? [['Única dirección', r.ip]]
    : [['Primer equipo', r.primerHost], ['Último equipo', r.ultimoHost], r.broadcast && ['Aviso a todos', r.broadcast]];
  const cifra = formatearNumero(r.hostsUtiles);

  return crear('section', { class: 'placa', 'aria-labelledby': 'titulo-placa' },
    crear('div', { class: 'placa__interior' },
      crear('h3', { id: 'titulo-placa' }, `Red ${r.red}/${r.prefijo}`),
      crear('div', { style: 'margin-top: var(--e-3)' },
        renglones.filter(Boolean).map(([nombre, valor]) => crear('div', { class: 'placa__renglon' },
          crear('span', {}, nombre),
          crear('span', {}, valor)))),
      crear('p', { class: 'fila', style: '--espacio: var(--e-1) var(--e-3); margin-top: var(--e-4)' },
        crear('span', {
          class: 'placa__cifra',
          style: cifra.length > 7 ? 'font-size: var(--t-5)' : null,
        }, cifra),
        crear('span', {}, r.hostsUtiles === 1 ? 'equipo puede conectarse' : 'equipos pueden conectarse')),
      crear('p', { class: 'texto-suave', style: 'margin-top: var(--e-2)' },
        `${tipo.nombre}. ${tipo.texto}`)));
}

/** La parte de la dirección que cambia dentro de la red: con /24, ".10"; con /20, ".5.4". */
function sufijo(direccion, prefijo) {
  const fijos = Math.min(3, Math.floor(prefijo / 8));
  return fijos === 0 ? direccion : `.${direccion.split('.').slice(fijos).join('.')}`;
}

/** Un mojón de la ruta: 'equipo' (blanco, arriba), 'no' (rojo, abajo) o 'vos' (violeta, tu IP). */
function poste(tipo, izquierda, cifra, lado = '') {
  const elemento = crear('span', { class: `poste poste--${tipo}${lado ? ` poste--${lado}` : ''}` },
    crear('span', { class: 'poste__cifra' }, cifra),
    crear('span', { class: 'poste__palo' }));
  elemento.style.left = izquierda;
  return elemento;
}

/** El movimiento firma: la red como un tramo de ruta con sus mojones, y tu IP como el poste violeta. */
function tramo(r) {
  const sinExtremos = r.prefijo >= 31;
  const ip = parsearIP(r.ip);
  const red = parsearIP(r.red);
  const primero = parsearIP(r.primerHost);
  const ultimo = parsearIP(r.ultimoHost);
  const corto = (direccion) => sufijo(direccion, r.prefijo);

  const postes = [];
  let izquierda;
  let fraccion;
  let descripcion;

  if (r.prefijo === 32) {
    fraccion = 0.5;
    izquierda = '50%';
    descripcion = `Es una sola dirección: ${r.ip}, tu IP.`;
  } else if (r.prefijo === 31) {
    fraccion = ip === red ? 0 : 1;
    izquierda = fraccion === 0 ? '1rem' : 'calc(100% - 1rem)';
    if (r.ip !== r.primerHost) postes.push(poste('equipo', '1rem', corto(r.primerHost), 'inicio'));
    if (r.ip !== r.ultimoHost) postes.push(poste('equipo', 'calc(100% - 1rem)', corto(r.ultimoHost), 'fin'));
    descripcion = `Las 2 direcciones son para equipos: ${r.primerHost} y ${r.ultimoHost}. Tu IP ${r.ip} es una de ellas.`;
  } else {
    let dondeCae;
    if (ip === red) {
      fraccion = 0;
      izquierda = '1.125rem';
      dondeCae = 'es el nombre de la red, que no se usa';
    } else if (r.ip === r.broadcast) {
      fraccion = 1;
      izquierda = 'calc(100% - 1.125rem)';
      dondeCae = 'es el aviso a todos, que no se usa';
    } else {
      fraccion = ultimo > primero ? (ip - primero) / (ultimo - primero) : 0.5;
      izquierda = `calc(2.75rem + (100% - 5.5rem) * ${fraccion})`;
      dondeCae = 'está entre las de los equipos';
    }
    postes.push(poste('no', '1.125rem', corto(r.red), 'inicio'));
    postes.push(poste('no', 'calc(100% - 1.125rem)', corto(r.broadcast), 'fin'));
    // Los mojones de los equipos. Si tu IP es uno de ellos, lo representa su poste violeta;
    // si el poste violeta le pasa por encima, evitarChoques() lo oculta.
    if (r.ip !== r.primerHost) postes.push(poste('equipo', '2.75rem', corto(r.primerHost), 'inicio'));
    if (r.ip !== r.ultimoHost) postes.push(poste('equipo', 'calc(100% - 2.75rem)', corto(r.ultimoHost), 'fin'));
    descripcion = `Las direcciones van de ${r.red} a ${r.broadcast}. La primera y la última no se usan; las de los equipos van de ${r.primerHost} a ${r.ultimoHost}. Tu IP ${r.ip} ${dondeCae}.`;
  }

  const lado = fraccion < 0.2 ? 'inicio' : fraccion > 0.8 ? 'fin' : '';
  postes.push(poste('vos', izquierda, `Tu IP ${r.ip}`, lado));

  const leyenda = [];
  if (!sinExtremos) {
    leyenda.push(crear('li', {},
      crear('span', { class: 'muestra muestra--fin', 'aria-hidden': 'true' }),
      crear('span', {}, 'Barreras: no se usan (el ', termino('red', 'nombre de la red'), ' y el ',
        crear('span', { class: 'sin-corte' }, termino('broadcast', 'aviso a todos'), ')'))));
  }
  leyenda.push(
    crear('li', {},
      crear('span', { class: 'muestra muestra--carril', 'aria-hidden': 'true' }),
      crear('span', {}, 'Asfalto: direcciones para tus ', termino('equipos', 'equipos'))),
    crear('li', {},
      crear('span', { class: 'muestra muestra--vos', 'aria-hidden': 'true' }),
      crear('span', {}, 'Poste violeta: tu IP')));

  return crear('section', { class: 'tramo', 'aria-labelledby': 'titulo-tramo' },
    crear('h3', { id: 'titulo-tramo' }, 'Dónde cae tu IP'),
    crear('div', { class: 'tramo__mapa', role: 'img', 'aria-label': descripcion },
      crear('div', { class: 'tramo__ruta' },
        !sinExtremos && crear('span', { class: 'tramo__fin' }),
        crear('span', { class: 'tramo__carril' },
          crear('span', { class: 'tramo__pintura' }, equipos(r.hostsUtiles))),
        !sinExtremos && crear('span', { class: 'tramo__fin' })),
      postes),
    crear('ul', { class: 'tramo__leyenda' }, leyenda));
}

function avisosSimples(r) {
  const avisos = [];
  const usables = `Usá una entre ${r.primerHost} y ${r.ultimoHost}.`;

  if (r.prefijo < 31 && r.ip === r.red) {
    avisos.push(aviso('prohibido', `${r.ip} es el nombre de la red`, `No se le puede poner a un equipo. ${usables}`));
  }
  if (r.prefijo < 31 && r.ip === r.broadcast) {
    avisos.push(aviso('prohibido', `${r.ip} es el aviso a todos`, `No se le puede poner a un equipo. ${usables}`));
  }
  if (r.prefijo === 31) {
    avisos.push(aviso('info', 'Red especial para unir dos routers',
      'Una /31 tiene solo 2 direcciones y no reserva nombre de red ni aviso a todos. Se usa para enlaces punto a punto, no para conectar compus.'));
  }
  if (r.prefijo === 32) {
    avisos.push(aviso('info', 'Es una sola dirección',
      'Una /32 identifica a un único equipo. Se usa en la configuración de routers y servidores, no para armar una red.'));
  }
  if (r.tipo === 'Link-local / APIPA') {
    avisos.push(aviso('prevencion', '¿Tu equipo tiene esta IP?',
      'Seguramente no pudo conseguir una dirección del router. Revisá el cable o el Wi-Fi, y que el router tenga el DHCP activado.'));
  }
  if (r.tipo === 'Privada (RFC 1918)' && r.prefijo <= 30 && r.ip !== r.red && r.ip !== r.broadcast) {
    avisos.push(aviso('info', 'Consejo', [
      'El router (la ', termino('puerta', 'puerta de enlace'),
      `) suele llevar la primera dirección, ${r.primerHost}. Los demás equipos usan las que siguen.`,
    ]));
  }
  return avisos;
}

function dato(nombre, valor, { destacado = false, copiable = true, explicacion = null } = {}) {
  const etiqueta = typeof nombre === 'string' ? nombre : nombre.textContent;
  return crear('div', { class: destacado ? 'dato dato--destacado' : 'dato' },
    crear('dt', {},
      nombre,
      explicacion && crear('span', { class: 'dato__explicacion', style: 'display: block' }, explicacion)),
    crear('dd', {},
      crear('span', {}, valor),
      copiable && crear('button', {
        type: 'button',
        class: 'boton boton--fantasma boton--icono',
        'data-copiar': valor,
        'aria-label': `Copiar ${etiqueta.toLowerCase()}`,
        title: 'Copiar',
      }, icono('copiar', 18))));
}

function vistaBits(r) {
  const filas = [['IP', r.binario.ip], ['Máscara', r.binario.mascara], ['Red', r.binario.red]];
  return crear('section', { class: 'pila', 'aria-labelledby': 'titulo-bits' },
    crear('h3', { id: 'titulo-bits' }, 'La IP en ', termino('binario', 'binario')),
    crear('p', { class: 'texto-suave texto-chico' },
      `Violeta: los ${bits(r.prefijo)} de la red. Gris: los ${bits(32 - r.prefijo)} del equipo.`),
    filas.map(([nombre, binario]) => crear('div', { class: 'bits-fila' },
      crear('span', { class: 'etiqueta' }, nombre),
      crear('div', { class: 'bits', role: 'img', 'aria-label': `${nombre} en binario: ${binario}` },
        binario.split('.').map((octeto, i) => crear('span', { class: 'bits__octeto' },
          [...octeto].map((bit, j) => crear('span', {
            class: i * 8 + j < r.prefijo ? 'bit bit--red' : 'bit bit--host',
          }, bit))))))));
}

function vistaSimple(r) {
  return [placa(r), tramo(r), ...avisosSimples(r)];
}

function vistaTecnica(r) {
  return [
    placa(r),
    tramo(r),
    crear('dl', { class: 'datos datos--dos-columnas' },
      dato('Dirección IP', r.ip),
      dato('Red', `${r.red}/${r.prefijo}`, { destacado: true }),
      dato(termino('mascara', 'Máscara'), r.mascara),
      dato(termino('wildcard', 'Wildcard'), r.wildcard),
      dato('Primer host', r.primerHost),
      dato('Último host', r.ultimoHost),
      dato(termino('broadcast', 'Broadcast'), r.broadcast ?? 'No tiene', { copiable: r.broadcast !== null }),
      dato('Hosts útiles', formatearNumero(r.hostsUtiles), { copiable: false }),
      dato('Direcciones en total', formatearNumero(r.totalDirecciones), { copiable: false }),
      dato(termino('clase', 'Clase'), r.clase, {
        copiable: false,
        explicacion: ['Histórica: hoy se usa ', termino('cidr', 'CIDR'), '.'],
      }),
      dato('Tipo', r.tipo, { copiable: false })),
    vistaBits(r),
    ...r.notas.map((nota) => aviso('info', 'Nota', nota)),
  ];
}

function botonCompartir(r) {
  const enlace = `${location.origin}${location.pathname}#${r.ip}/${r.prefijo}`;
  return crear('div', { class: 'fila' },
    crear('button', { type: 'button', class: 'boton boton--secundario', 'data-copiar': enlace },
      icono('copiar', 18), 'Copiar enlace a este resultado'));
}

/* ───────────── Resultado ───────────── */

function mostrarVacio() {
  estado.resultado = null;
  vacio.hidden = false;
  contenido.hidden = true;
  contenido.replaceChildren();
  seccionDivision.hidden = true;
  marcarDesactualizado(false);
  anunciar('');
}

function mostrarResultado() {
  const r = estado.resultado;
  const estabaVacio = contenido.hidden;

  const vista = estado.modo === 'tecnico' ? vistaTecnica(r) : vistaSimple(r);
  contenido.replaceChildren(...vista, botonCompartir(r));
  vacio.hidden = true;
  contenido.hidden = false;
  marcarDesactualizado(false);

  // El único momento animado: cuando aparece el primer resultado
  if (estabaVacio) {
    contenido.classList.remove('aparecer');
    void contenido.offsetWidth;
    contenido.classList.add('aparecer');
  }

  evitarChoques();
  actualizarDivision();
  anunciar(`Red ${r.red}/${r.prefijo}: ${equipos(r.hostsUtiles)}, de ${r.primerHost} a ${r.ultimoHost}.`);
}

/** Oculta el mojón blanco que el poste violeta de tu IP atraviesa, para que no se pisen. */
function evitarChoques() {
  const palo = $('.poste--vos .poste__palo', contenido);
  if (!palo) return;
  const vos = palo.getBoundingClientRect();
  for (const mojon of $$('.poste--equipo', contenido)) {
    mojon.style.visibility = '';
    const placa = $('.poste__cifra', mojon).getBoundingClientRect();
    const seCruzan = placa.left - 4 < vos.right && vos.left < placa.right + 4;
    if (seCruzan) mojon.style.visibility = 'hidden';
  }
}

// Si cambia el ancho (girar el celular, achicar la ventana), se vuelve a revisar.
new ResizeObserver(() => evitarChoques()).observe(contenido);

function actualizarHash(r) {
  const nuevo = r ? `#${r.ip}/${r.prefijo}` : '';
  if (location.hash === nuevo) return;
  history.replaceState(null, '', nuevo || location.pathname + location.search);
}

/**
 * Lee la IP (y la máscara, si se escribió junta) y calcula.
 * Mientras se escribe no molesta con errores por datos a medio escribir;
 * con `estricto` (al salir del campo, al apretar Enter o al tocar un ejemplo) sí avisa.
 */
function calcular({ estricto = false, conEnlace = true } = {}) {
  const texto = normalizar(campoIP.value);

  if (!texto) {
    mostrarError(campoIP, errorIP, null);
    mostrarVacio();
    actualizarHash(null);
    return;
  }

  if (estricto) {
    estado.ultimoEstricto = texto;
  } else if (texto === estado.ultimoEstricto) {
    return; // ya se validó al salir del campo: no borrar ese aviso
  }

  const partes = separar(texto);
  if (!estricto && estaIncompleto(partes)) {
    mostrarError(campoIP, errorIP, null);
    marcarDesactualizado(true);
    return;
  }

  try {
    const r = partes.mascara === null
      ? calcularSubred(partes.ip, String(prefijoDelDeslizador()))
      : calcularSubred(texto);

    mostrarError(campoIP, errorIP, null);
    if (partes.mascara !== null) sincronizarDeslizador(r.prefijo);
    estado.resultado = r;
    if (conEnlace) actualizarHash(r);
    mostrarResultado();
  } catch (error) {
    if (!(error instanceof ErrorEntrada)) throw error;
    mostrarError(campoIP, errorIP, mensajeAmigable(error.message));
    marcarDesactualizado(true);
  }
}

function llevarAlResultado() {
  if (seccionResultado.getBoundingClientRect().top > innerHeight * 0.7) {
    seccionResultado.scrollIntoView({ behavior: movimientoReducido() ? 'auto' : 'smooth', block: 'start' });
  }
}

/* ───────────── Tamaño de la red (deslizador) ───────────── */

function actualizarTextoTamanio() {
  const prefijo = prefijoDelDeslizador();
  const mascara = numeroAIP(prefijoAMascara(prefijo));
  let detalle;
  if (prefijo === 32) detalle = '1 solo equipo';
  else if (prefijo === 31) detalle = '2 equipos, solo para unir dos routers';
  else detalle = `hasta ${equipos(hostsDe(prefijo))}`;

  textoTamanio.replaceChildren(
    crear('span', { class: 'lectura__prefijo' }, `/${prefijo}`),
    crear('span', { class: 'lectura__mascara' }, mascara),
    crear('span', { class: 'lectura__equipos' }, detalle));
  deslizador.setAttribute('aria-valuetext', `Máscara /${prefijo}, ${mascara}: ${detalle}`);

  // La parte recorrida de la pista llega justo al centro de la perilla (de 1,625rem)
  const fraccion = Number(deslizador.value) / 32;
  deslizador.style.setProperty('--lleno', `calc(0.8125rem + (100% - 1.625rem) * ${fraccion})`);

  botonAchicar.disabled = prefijo === 32;
  botonAgrandar.disabled = prefijo === 0;
}

function sincronizarDeslizador(prefijo) {
  deslizador.value = String(32 - prefijo);
  actualizarTextoTamanio();
}

function alMoverDeslizador() {
  actualizarTextoTamanio();
  // Si la máscara estaba escrita junto a la IP, la actualizamos para que no se contradigan.
  const partes = separar(normalizar(campoIP.value));
  if (partes.mascara !== null) campoIP.value = `${partes.ip}/${prefijoDelDeslizador()}`;
  marcarEjemplo(null);
  calcular();
}

function moverDeslizador(paso) {
  deslizador.value = String(Math.min(32, Math.max(0, Number(deslizador.value) + paso)));
  alMoverDeslizador();
}

/* ───────────── Ejemplos ───────────── */

function marcarEjemplo(boton) {
  for (const opcion of $$('#ejemplos [data-ejemplo]')) {
    opcion.setAttribute('aria-pressed', String(opcion === boton));
  }
}

/* ───────────── Dividir la red ───────────── */

function actualizarDivision() {
  const r = estado.resultado;
  if (!r || r.prefijo >= 32) {
    seccionDivision.hidden = true;
    return;
  }

  const maxPasos = Math.min(32 - r.prefijo, 16);
  const elegidas = Math.min(estado.partes, 2 ** maxPasos);
  const opciones = [];
  for (let pasos = 1; pasos <= maxPasos; pasos++) {
    const partes = 2 ** pasos;
    const nuevo = r.prefijo + pasos;
    opciones.push(crear('option', { value: partes, selected: partes === elegidas },
      `${formatearNumero(partes)} partes de ${equipos(hostsDe(nuevo))} (/${nuevo})`));
  }
  selectorPartes.replaceChildren(...opciones);
  seccionDivision.hidden = false;
  mostrarDivision();
}

function mostrarDivision() {
  const r = estado.resultado;
  const partes = Number(selectorPartes.value);
  estado.partes = partes;
  const nuevo = r.prefijo + Math.log2(partes);
  const { cantidad, tamanio, subredes, truncado } = subdividir(r.red, String(r.prefijo), nuevo);
  const indiceTuyo = Math.floor((parsearIP(r.ip) - parsearIP(r.red)) / tamanio);

  const filas = subredes.map((s, i) => {
    const tuya = i === indiceTuyo;
    // data-etiqueta: en el celular cada celda muestra su nombre, porque la tabla se apila
    return crear('tr', { class: tuya ? 'fila--destacada' : null },
      crear('td', { 'data-etiqueta': 'Parte' },
        crear('span', {}, String(i + 1), tuya && [' ', crear('span', { class: 'insignia' }, 'Tu IP')])),
      crear('td', { 'data-etiqueta': 'Red' }, `${s.red}/${s.prefijo}`),
      crear('td', { 'data-etiqueta': 'Primer equipo' }, s.primerHost),
      crear('td', { 'data-etiqueta': 'Último equipo' }, s.ultimoHost),
      crear('td', { 'data-etiqueta': 'Aviso a todos' }, s.broadcast ?? 'No tiene'),
      crear('td', { 'data-etiqueta': 'Equipos' }, formatearNumero(s.hostsUtiles)));
  });

  const encabezados = ['Parte', 'Red', 'Primer equipo', 'Último equipo', 'Aviso a todos', 'Equipos'];
  const bloques = [
    crear('p', {}, `Quedan ${formatearNumero(cantidad)} redes /${nuevo}, cada una con lugar para ${equipos(hostsDe(nuevo))}.`),
    crear('div', { class: 'tabla-desplazable', tabindex: 0, role: 'region', 'aria-label': 'Partes de la red' },
      crear('table', { class: 'tabla tabla--con-foco tabla--apilable' },
        crear('thead', {}, crear('tr', {}, encabezados.map((t) => crear('th', { scope: 'col' }, t)))),
        crear('tbody', {}, filas))),
  ];
  if (truncado) {
    bloques.push(crear('p', { class: 'texto-suave texto-chico' },
      `Se muestran las primeras ${subredes.length} de ${formatearNumero(cantidad)} partes.`));
  }
  resultadoDivision.replaceChildren(...bloques);
}

/* ───────────── ¿Cuántos equipos querés conectar? ───────────── */

function planificar() {
  const texto = campoCantidad.value.trim();
  if (!texto) {
    mostrarError(campoCantidad, errorCantidad, null);
    resultadoPlan.replaceChildren();
    return;
  }

  let prefijo;
  const cantidad = Number(texto);
  try {
    prefijo = prefijoParaHosts(cantidad);
  } catch (error) {
    if (!(error instanceof ErrorEntrada)) throw error;
    mostrarError(campoCantidad, errorCantidad, /tantos/.test(error.message)
      ? 'Son demasiados: ninguna red IPv4 tiene tantas direcciones.'
      : 'Escribí una cantidad entera mayor a 0, por ejemplo 30.');
    resultadoPlan.replaceChildren();
    return;
  }

  mostrarError(campoCantidad, errorCantidad, null);
  const lugar = hostsDe(prefijo);
  const sobran = lugar - cantidad;
  const mascara = numeroAIP(prefijoAMascara(prefijo));

  resultadoPlan.replaceChildren(crear('div', { class: 'pila', style: '--espacio: var(--e-3)' },
    crear('p', { class: 'lectura' },
      crear('span', { class: 'plan__prefijo' }, `/${prefijo}`),
      crear('span', { class: 'lectura__mascara' }, mascara)),
    crear('p', { class: 'prosa' },
      `Para ${equipos(cantidad)} te alcanza una red /${prefijo}, con lugar para ${equipos(lugar)}.`,
      sobran > 0
        ? ` Te sobran ${formatearNumero(sobran)} para sumar más adelante.`
        : ' Queda justa: si vas a sumar equipos, elegí una más grande.'),
    prefijo === 31 && aviso('prevencion', 'Ojo con la /31',
      'Solo sirve para unir dos routers. Para dos equipos comunes usá una /30, que también tiene lugar para 2.'),
    prefijo === 32 && aviso('prevencion', 'Una /32 es una sola dirección',
      'Sirve para identificar un equipo, no para armar una red. Para conectar un equipo a una red común necesitás al menos una /30.'),
    crear('div', { class: 'fila' },
      crear('button', { type: 'button', class: 'boton boton--primario', onclick: () => usarTamanio(prefijo) },
        `Usar /${prefijo} en la calculadora`))));
}

function usarTamanio(prefijo) {
  sincronizarDeslizador(prefijo);
  const partes = separar(normalizar(campoIP.value));
  if (partes.mascara !== null) campoIP.value = `${partes.ip}/${prefijo}`;
  marcarEjemplo(null);

  formulario.scrollIntoView({ behavior: movimientoReducido() ? 'auto' : 'smooth', block: 'start' });
  if (campoIP.value.trim()) {
    calcular({ estricto: true });
    notificar(`Listo: la calculadora quedó en /${prefijo}.`);
  } else {
    campoIP.focus({ preventScroll: true });
    notificar(`Quedó en /${prefijo}. Ahora escribí la IP de tu red.`, 3500);
  }
}

/* ───────────── Eventos ───────────── */

const calcularMientrasEscribe = conPausa(() => calcular(), 350);

campoIP.addEventListener('input', () => {
  marcarEjemplo(null);
  calcularMientrasEscribe();
});
campoIP.addEventListener('change', () => calcular({ estricto: true }));

formulario.addEventListener('submit', (evento) => {
  evento.preventDefault();
  calcular({ estricto: true });
  llevarAlResultado();
});

deslizador.addEventListener('input', alMoverDeslizador);
botonAchicar.addEventListener('click', () => moverDeslizador(-1));
botonAgrandar.addEventListener('click', () => moverDeslizador(+1));

// Ejemplos: los de la lista y el botón del estado vacío
document.addEventListener('click', (evento) => {
  const boton = evento.target instanceof Element && evento.target.closest('[data-ejemplo]');
  if (!boton) return;
  campoIP.value = boton.dataset.ejemplo;
  marcarEjemplo(boton.closest('#ejemplos') ? boton : null);
  calcular({ estricto: true });
  llevarAlResultado();
});

for (const radio of $$('input[name="modo"]')) {
  radio.checked = radio.value === estado.modo;
  radio.addEventListener('change', () => {
    estado.modo = radio.value;
    guardarPreferencia('subredes-modo', estado.modo);
    if (estado.resultado) mostrarResultado();
  });
}

selectorPartes.addEventListener('change', mostrarDivision);

campoCantidad.addEventListener('input', conPausa(planificar, 300));
planificador.addEventListener('submit', (evento) => {
  evento.preventDefault();
  planificar();
});

/* ───────────── Arranque ───────────── */

// El deslizador ya anuncia su valor: la lectura de abajo no necesita repetirlo.
textoTamanio.setAttribute('aria-live', 'off');
marcarEjemplo(null);
actualizarTextoTamanio();

// Un enlace compartido (…/subredes/#192.168.1.10/24) abre con ese cálculo hecho.
function cargarDesdeEnlace() {
  let desdeEnlace = '';
  try {
    desdeEnlace = decodeURIComponent(location.hash.slice(1));
  } catch {
    return; // enlace mal formado: lo ignoramos
  }
  const actual = estado.resultado ? `${estado.resultado.ip}/${estado.resultado.prefijo}` : '';
  if (!desdeEnlace || desdeEnlace === actual) return;
  campoIP.value = desdeEnlace;
  marcarEjemplo(null);
  calcular({ estricto: true });
}

cargarDesdeEnlace();
// También si pegan otro enlace con la página ya abierta (solo cambia lo que va después del #).
addEventListener('hashchange', cargarDesdeEnlace);

// Primera visita: la página abre con el primer ejemplo ya calculado, para que se vean la
// placa y la ruta de entrada. No toca la dirección de la página: todavía no es un resultado propio.
if (!estado.resultado) {
  const ejemplo = $('#ejemplos [data-ejemplo]');
  campoIP.value = ejemplo.dataset.ejemplo;
  marcarEjemplo(ejemplo);
  calcular({ estricto: true, conEnlace: false });
}
