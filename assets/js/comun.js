/**
 * Utilidades compartidas por todas las páginas.
 *
 * Al importarlo desde cualquier ui.js ya deja andando lo común de la página:
 *  - Tema claro/oscuro: botones con data-accion="tema".
 *  - Copiar al portapapeles: botones con data-copiar="texto" o data-copiar-de="#id".
 *  - Glosario: <button class="termino" data-termino="clave">palabra</button>
 *    con las explicaciones cargadas con agregarAlGlosario().
 *
 * Para que no parpadee el tema elegido a mano, cada página puede poner en el <head>:
 *   <script>try{const t=JSON.parse(localStorage.getItem('redes-lamp:tema'));if(t)document.documentElement.dataset.tema=t}catch{}</script>
 */

const PREFIJO = 'redes-lamp:';
const HAY_DOM = typeof document !== 'undefined';

/* ───────────── Preferencias guardadas ───────────── */

// localStorage puede no estar (modo privado, almacenamiento bloqueado):
// en ese caso no se guarda nada y la página anda igual.

export function leerPreferencia(clave, porDefecto = null) {
  try {
    const valor = localStorage.getItem(PREFIJO + clave);
    return valor === null ? porDefecto : JSON.parse(valor);
  } catch {
    return porDefecto;
  }
}

export function guardarPreferencia(clave, valor) {
  try {
    if (valor === null || valor === undefined) {
      localStorage.removeItem(PREFIJO + clave);
    } else {
      localStorage.setItem(PREFIJO + clave, JSON.stringify(valor));
    }
  } catch {
    /* sin almacenamiento: seguimos sin guardar */
  }
}

/* ───────────── Armado de DOM ───────────── */

export const $ = (selector, raiz = document) => raiz.querySelector(selector);
export const $$ = (selector, raiz = document) => [...raiz.querySelectorAll(selector)];

/**
 * Arma un elemento sin innerHTML, así lo que escribe el usuario nunca se
 * interpreta como HTML.
 *
 *   crear('p', { class: 'ayuda' }, 'Hola ', crear('strong', {}, 'mundo'))
 *   crear('button', { type: 'button', onclick: () => … }, 'Calcular')
 *
 * Atributos con false, null o undefined se omiten; con true quedan vacíos.
 */
export function crear(etiqueta, atributos = {}, ...hijos) {
  const elemento = document.createElement(etiqueta);
  for (const [nombre, valor] of Object.entries(atributos)) {
    if (valor === false || valor === null || valor === undefined) continue;
    if (nombre.startsWith('on') && typeof valor === 'function') {
      elemento.addEventListener(nombre.slice(2), valor);
    } else {
      elemento.setAttribute(nombre, valor === true ? '' : String(valor));
    }
  }
  elemento.append(...hijos.flat(Infinity).filter(h => h !== null && h !== undefined && h !== false));
  return elemento;
}

const SVG = 'http://www.w3.org/2000/svg';

const ICONOS = {
  sol: 'M12 4V2m0 20v-2m8-8h2M2 12h2m13.66-5.66 1.41-1.41M4.93 19.07l1.41-1.41m0-11.32L4.93 4.93m14.14 14.14-1.41-1.41M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z',
  luna: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z',
  copiar: 'M9 9h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H11a2 2 0 0 1-2-2V9Zm-4 6H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1',
  check: 'M20 6 9 17l-5-5',
  info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm0-6v-4m0-4h.01',
};

/** Ícono de trazo (24×24) que toma el color del texto. Es decorativo: va con aria-hidden. */
export function icono(nombre, tamanio = 22) {
  const svg = document.createElementNS(SVG, 'svg');
  const atributos = {
    viewBox: '0 0 24 24',
    width: tamanio,
    height: tamanio,
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': 2,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'aria-hidden': 'true',
    focusable: 'false',
  };
  for (const [nombreAtributo, valor] of Object.entries(atributos)) {
    svg.setAttribute(nombreAtributo, String(valor));
  }
  const trazo = document.createElementNS(SVG, 'path');
  trazo.setAttribute('d', ICONOS[nombre] ?? ICONOS.info);
  svg.append(trazo);
  return svg;
}

/* ───────────── Utilidades ───────────── */

/** Ejecuta fn recién cuando se dejó de llamar durante `ms` (ideal para calcular mientras se escribe). */
export function conPausa(fn, ms = 250) {
  let espera;
  return (...args) => {
    clearTimeout(espera);
    espera = setTimeout(() => fn(...args), ms);
  };
}

const NUMERO = new Intl.NumberFormat('es-AR');

/** 16777214 → "16.777.214" */
export const formatearNumero = (n) => NUMERO.format(n);

/* ───────────── Notificaciones ───────────── */

let notificacion = null;
let temporizadorNotificacion;

function asegurarNotificacion() {
  if (!notificacion) {
    // La región existe desde el principio: así los lectores de pantalla la anuncian bien.
    notificacion = crear('div', { class: 'notificacion', role: 'status', 'aria-live': 'polite' });
    document.body.append(notificacion);
  }
  return notificacion;
}

/** Muestra un mensaje cortito abajo de la pantalla y lo lee el lector de pantalla. */
export function notificar(mensaje, ms = 2400) {
  const caja = asegurarNotificacion();
  caja.textContent = mensaje;
  caja.classList.add('notificacion--visible');
  clearTimeout(temporizadorNotificacion);
  temporizadorNotificacion = setTimeout(() => caja.classList.remove('notificacion--visible'), ms);
}

/* ───────────── Copiar al portapapeles ───────────── */

/** Devuelve true si se pudo copiar. */
export async function copiarTexto(texto) {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    // Sin permiso o sin HTTPS: plan B con un textarea temporal.
    const area = crear('textarea', { readonly: true, class: 'visualmente-oculto', 'aria-hidden': 'true' });
    area.value = texto;
    document.body.append(area);
    area.select();
    let copiado = false;
    try {
      copiado = document.execCommand('copy');
    } catch {
      copiado = false;
    }
    area.remove();
    return copiado;
  }
}

function textoACopiar(boton) {
  if (boton.dataset.copiar) return boton.dataset.copiar;
  const origen = boton.dataset.copiarDe ? document.querySelector(boton.dataset.copiarDe) : null;
  if (!origen) return '';
  const esCampo = origen instanceof HTMLInputElement || origen instanceof HTMLTextAreaElement;
  return (esCampo ? origen.value : origen.textContent).trim();
}

async function alTocarCopiar(boton) {
  const texto = textoACopiar(boton);
  if (!texto) return;
  const copiado = await copiarTexto(texto);
  if (!copiado) {
    notificar('No se pudo copiar. Seleccioná el texto y copialo a mano.', 4000);
    return;
  }
  notificar(texto.length <= 40 ? `Copiado: ${texto}` : 'Copiado al portapapeles');
  // Confirmación en el propio botón si es de ícono
  if (boton.classList.contains('boton--icono')) {
    const anterior = [...boton.childNodes];
    boton.replaceChildren(icono('check'));
    setTimeout(() => boton.replaceChildren(...anterior), 1500);
  }
}

/* ───────────── Tema claro / oscuro ───────────── */

const TEMAS = ['claro', 'oscuro'];
const consultaOscuro = HAY_DOM ? matchMedia('(prefers-color-scheme: dark)') : null;
const temaDelSistema = () => (consultaOscuro?.matches ? 'oscuro' : 'claro');

export function temaActual() {
  const forzado = document.documentElement.dataset.tema;
  return TEMAS.includes(forzado) ? forzado : temaDelSistema();
}

/** 'claro' u 'oscuro' lo fuerzan; cualquier otro valor vuelve a seguir al sistema. */
export function aplicarTema(tema) {
  if (TEMAS.includes(tema)) {
    document.documentElement.dataset.tema = tema;
  } else {
    delete document.documentElement.dataset.tema;
  }
  actualizarBotonesTema();
}

function cambiarTema() {
  const nuevo = temaActual() === 'oscuro' ? 'claro' : 'oscuro';
  // Si el nuevo coincide con el del sistema no lo forzamos:
  // así, si el sistema cambia después, la página lo acompaña.
  const aGuardar = nuevo === temaDelSistema() ? null : nuevo;
  guardarPreferencia('tema', aGuardar);
  aplicarTema(aGuardar);
}

function actualizarBotonesTema() {
  const oscuro = temaActual() === 'oscuro';
  const etiqueta = oscuro ? 'Pasar a tema claro' : 'Pasar a tema oscuro';
  for (const boton of $$('[data-accion="tema"]')) {
    boton.setAttribute('aria-label', etiqueta);
    boton.title = etiqueta;
    boton.replaceChildren(icono(oscuro ? 'sol' : 'luna'));
  }
}

/* ───────────── Glosario ───────────── */

const glosario = {};
const soportaPopover = HAY_DOM && 'popover' in HTMLElement.prototype;
let globo = null;
let disparador = null;

/**
 * Suma explicaciones al glosario de la página.
 *   agregarAlGlosario({
 *     mascara: { titulo: 'Máscara', texto: ['Primer párrafo.', 'Segundo párrafo.'] },
 *   })
 * `texto` puede ser un string, un nodo o una lista de ambos.
 */
export function agregarAlGlosario(definiciones) {
  Object.assign(glosario, definiciones);
}

/** Crea la palabra para tocar. Si no se pasa texto, usa el título del glosario. */
export function termino(clave, texto) {
  return crear('button', {
    type: 'button',
    class: 'termino',
    'data-termino': clave,
    'aria-haspopup': 'dialog',
    'aria-expanded': 'false',
  }, texto ?? glosario[clave]?.titulo ?? clave);
}

function armarGlobo() {
  const titulo = crear('h3', { id: 'globo-titulo' });
  const texto = crear('div', { class: 'globo__texto pila', style: '--espacio: var(--e-2)' });
  const cerrar = crear('button', {
    type: 'button',
    class: 'boton boton--primario boton--chico',
    onclick: cerrarGlobo,
  }, 'Entendido');

  globo = crear('div', {
    id: 'globo-glosario',
    class: 'globo',
    role: 'dialog',
    'aria-labelledby': 'globo-titulo',
    popover: soportaPopover ? 'auto' : null,
    hidden: !soportaPopover,
  }, titulo, texto, crear('div', { class: 'fila' }, cerrar));

  if (soportaPopover) {
    // beforetoggle llega antes de esconderse: todavía sabemos si el foco estaba adentro.
    globo.addEventListener('beforetoggle', (evento) => {
      if (evento.newState === 'closed') alCerrarGlobo();
    });
  } else {
    // Navegadores viejos sin popover: lo mostramos fijo en el medio y se cierra con Esc.
    Object.assign(globo.style, { position: 'fixed', inset: '0', height: 'fit-content', zIndex: '200' });
    document.addEventListener('keydown', (evento) => {
      if (evento.key === 'Escape' && !globo.hidden) cerrarGlobo();
    });
  }
  document.body.append(globo);
}

function abrirTermino(boton) {
  const definicion = glosario[boton.dataset.termino];
  if (!definicion) return;
  if (!globo) armarGlobo();

  if (disparador && disparador !== boton) disparador.setAttribute('aria-expanded', 'false');
  disparador = boton;

  $('#globo-titulo', globo).textContent = definicion.titulo;
  const parrafos = [definicion.texto].flat().map(p => (typeof p === 'string' ? crear('p', {}, p) : p));
  $('.globo__texto', globo).replaceChildren(...parrafos);

  if (soportaPopover) {
    if (!globo.matches(':popover-open')) globo.showPopover();
  } else {
    globo.hidden = false;
  }
  boton.setAttribute('aria-expanded', 'true');
  $('button', globo).focus();
}

function cerrarGlobo() {
  if (!globo) return;
  if (soportaPopover) {
    if (globo.matches(':popover-open')) globo.hidePopover();
  } else if (!globo.hidden) {
    alCerrarGlobo();
    globo.hidden = true;
  }
}

function alCerrarGlobo() {
  if (!disparador) return;
  const focoAdentro = globo.contains(document.activeElement);
  disparador.setAttribute('aria-expanded', 'false');
  // Devolvemos el foco a la palabra solo si estaba en el globo (cierre con Esc o "Entendido").
  if (focoAdentro) disparador.focus({ preventScroll: true });
  disparador = null;
}

/* ───────────── Arranque ───────────── */

function iniciar() {
  aplicarTema(leerPreferencia('tema'));
  consultaOscuro.addEventListener('change', actualizarBotonesTema);
  asegurarNotificacion();

  document.addEventListener('click', (evento) => {
    if (!(evento.target instanceof Element)) return;

    if (evento.target.closest('[data-accion="tema"]')) {
      cambiarTema();
      return;
    }

    const botonCopiar = evento.target.closest('[data-copiar], [data-copiar-de]');
    if (botonCopiar) {
      alTocarCopiar(botonCopiar);
      return;
    }

    const palabra = evento.target.closest('.termino[data-termino]');
    if (palabra) abrirTermino(palabra);
  });
}

if (HAY_DOM) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar, { once: true });
  } else {
    iniciar();
  }
}
