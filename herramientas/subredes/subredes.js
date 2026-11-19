/**
 * Calculadora de subredes IPv4 — lógica pura.
 * Sin dependencias del DOM: la usan ui.js y tests/subredes.test.js.
 */

export class ErrorEntrada extends Error {
  constructor(mensaje) {
    super(mensaje);
    this.name = 'ErrorEntrada';
  }
}

const TODOS_UNOS = 0xFFFFFFFF;

/* ───────────── Conversión ───────────── */

export function parsearIP(texto) {
  if (typeof texto !== 'string' || texto.trim() === '') {
    throw new ErrorEntrada('Ingresá una dirección IP.');
  }
  const limpio = texto.trim();
  const partes = limpio.split('.');
  if (partes.length !== 4) {
    throw new ErrorEntrada(`"${limpio}" no es una IPv4 válida: tiene que tener 4 octetos.`);
  }

  let valor = 0;
  for (const parte of partes) {
    if (!/^\d{1,3}$/.test(parte)) {
      throw new ErrorEntrada(`Octeto inválido: "${parte}". Solo números de 0 a 255.`);
    }
    if (parte.length > 1 && parte.startsWith('0')) {
      throw new ErrorEntrada(`Octeto "${parte}" con ceros a la izquierda: es ambiguo, escribilo sin el 0.`);
    }
    const n = Number(parte);
    if (n > 255) {
      throw new ErrorEntrada(`Octeto fuera de rango: ${n}. El máximo es 255.`);
    }
    valor = valor * 256 + n;
  }
  return valor >>> 0;
}

export function numeroAIP(n) {
  return [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
}

export function aBinario(n) {
  const bits = (n >>> 0).toString(2).padStart(32, '0');
  return bits.match(/.{8}/g).join('.');
}

export function prefijoAMascara(prefijo) {
  if (!Number.isInteger(prefijo) || prefijo < 0 || prefijo > 32) {
    throw new ErrorEntrada(`Prefijo inválido: /${prefijo}. Tiene que estar entre /0 y /32.`);
  }
  return prefijo === 0 ? 0 : (TODOS_UNOS << (32 - prefijo)) >>> 0;
}

export function mascaraAPrefijo(mascara) {
  const invertida = ~mascara >>> 0;
  if ((invertida & (invertida + 1)) !== 0) {
    throw new ErrorEntrada(`La máscara ${numeroAIP(mascara)} no es válida: los bits en 1 tienen que ser contiguos.`);
  }
  let prefijo = 0;
  for (let m = mascara >>> 0; m; m = (m << 1) >>> 0) prefijo++;
  return prefijo;
}

/** Acepta "24", "/24" o "255.255.255.0". */
export function parsearMascara(texto) {
  if (typeof texto !== 'string' || texto.trim() === '') {
    throw new ErrorEntrada('Ingresá una máscara o un prefijo CIDR.');
  }
  const limpio = texto.trim().replace(/^\//, '');

  if (/^\d{1,2}$/.test(limpio)) {
    const prefijo = Number(limpio);
    return { prefijo, mascara: prefijoAMascara(prefijo) };
  }
  if (limpio.includes('.')) {
    const mascara = parsearIP(limpio);
    return { prefijo: mascaraAPrefijo(mascara), mascara };
  }
  throw new ErrorEntrada(`"${texto.trim()}" no es una máscara ni un prefijo válido.`);
}

/**
 * Acepta la IP y la máscara por separado, o juntas en el primer campo:
 * "192.168.1.10/24" o "192.168.1.10 255.255.255.0".
 */
export function parsearEntrada(ipTexto, mascaraTexto = '') {
  const ip = (ipTexto ?? '').trim();
  const mascara = (mascaraTexto ?? '').trim();
  const combinada = ip.match(/^(\S+?)\s*(?:\/|\s)\s*(\S+)$/);

  if (combinada) {
    if (mascara) throw new ErrorEntrada('Indicá la máscara en un solo lugar.');
    return { ip: parsearIP(combinada[1]), ...parsearMascara(combinada[2]) };
  }
  return { ip: parsearIP(ip), ...parsearMascara(mascara) };
}

/* ───────────── Clasificación ───────────── */

export function claseDe(ip) {
  const o = ip >>> 24;
  if (o < 128) return 'A';
  if (o < 192) return 'B';
  if (o < 224) return 'C';
  if (o < 240) return 'D';
  return 'E';
}

const RANGOS_ESPECIALES = [
  ['255.255.255.255', 32, 'Broadcast limitado'],
  ['0.0.0.0', 8, 'Esta red (reservada)'],
  ['10.0.0.0', 8, 'Privada (RFC 1918)'],
  ['100.64.0.0', 10, 'Compartida / CGNAT (RFC 6598)'],
  ['127.0.0.0', 8, 'Loopback'],
  ['169.254.0.0', 16, 'Link-local / APIPA'],
  ['172.16.0.0', 12, 'Privada (RFC 1918)'],
  ['192.0.2.0', 24, 'Documentación (RFC 5737)'],
  ['192.168.0.0', 16, 'Privada (RFC 1918)'],
  ['198.18.0.0', 15, 'Pruebas de rendimiento (RFC 2544)'],
  ['198.51.100.0', 24, 'Documentación (RFC 5737)'],
  ['203.0.113.0', 24, 'Documentación (RFC 5737)'],
  ['224.0.0.0', 4, 'Multicast'],
  ['240.0.0.0', 4, 'Reservada'],
].map(([base, prefijo, nombre]) => ({
  base: parsearIP(base),
  mascara: prefijoAMascara(prefijo),
  nombre,
}));

export function tipoDe(ip) {
  const rango = RANGOS_ESPECIALES.find(r => ((ip & r.mascara) >>> 0) === r.base);
  return rango ? rango.nombre : 'Pública';
}

/* ───────────── Cálculo ───────────── */

export function calcularSubred(ipTexto, mascaraTexto = '') {
  const { ip, prefijo, mascara } = parsearEntrada(ipTexto, mascaraTexto);

  const wildcard = ~mascara >>> 0;
  const red = (ip & mascara) >>> 0;
  const ultima = (red | wildcard) >>> 0;
  const totalDirecciones = 2 ** (32 - prefijo);

  let primerHost, ultimoHost, broadcast, hostsUtiles;
  const notas = [];

  if (prefijo === 32) {
    primerHost = ultimoHost = red;
    broadcast = null;
    hostsUtiles = 1;
    notas.push('/32: identifica un único host (rutas de host, loopbacks).');
  } else if (prefijo === 31) {
    primerHost = red;
    ultimoHost = ultima;
    broadcast = null;
    hostsUtiles = 2;
    notas.push('/31: enlace punto a punto (RFC 3021). No reserva red ni broadcast.');
  } else {
    primerHost = red + 1;
    ultimoHost = ultima - 1;
    broadcast = ultima;
    hostsUtiles = totalDirecciones - 2;
    if (ip === red) notas.push('La IP ingresada es la dirección de red: no se puede asignar a un host.');
    if (ip === broadcast) notas.push('La IP ingresada es el broadcast: no se puede asignar a un host.');
  }

  return {
    ip: numeroAIP(ip),
    prefijo,
    mascara: numeroAIP(mascara),
    wildcard: numeroAIP(wildcard),
    red: numeroAIP(red),
    broadcast: broadcast === null ? null : numeroAIP(broadcast),
    primerHost: numeroAIP(primerHost),
    ultimoHost: numeroAIP(ultimoHost),
    totalDirecciones,
    hostsUtiles,
    clase: claseDe(ip),
    tipo: tipoDe(ip),
    binario: {
      ip: aBinario(ip),
      mascara: aBinario(mascara),
      red: aBinario(red),
    },
    notas,
  };
}

/** Menor prefijo (red más chica) que alcanza para la cantidad de hosts pedida. */
export function prefijoParaHosts(cantidad) {
  if (!Number.isInteger(cantidad) || cantidad < 1) {
    throw new ErrorEntrada('La cantidad de hosts tiene que ser un entero mayor a 0.');
  }
  if (cantidad === 1) return 32;
  if (cantidad === 2) return 31;
  for (let prefijo = 30; prefijo >= 0; prefijo--) {
    if (2 ** (32 - prefijo) - 2 >= cantidad) return prefijo;
  }
  throw new ErrorEntrada('No existe una red IPv4 con tantos hosts.');
}

/** Divide una red en subredes iguales de prefijo mayor. */
export function subdividir(ipTexto, mascaraTexto, nuevoPrefijo, limite = 64) {
  const { ip, prefijo, mascara } = parsearEntrada(ipTexto, mascaraTexto);

  if (!Number.isInteger(nuevoPrefijo) || nuevoPrefijo <= prefijo || nuevoPrefijo > 32) {
    throw new ErrorEntrada(`El nuevo prefijo tiene que estar entre /${prefijo + 1} y /32.`);
  }

  const red = (ip & mascara) >>> 0;
  const cantidad = 2 ** (nuevoPrefijo - prefijo);
  const tamanio = 2 ** (32 - nuevoPrefijo);
  const mostrar = Math.min(cantidad, limite);
  const subredes = [];

  for (let i = 0; i < mostrar; i++) {
    const s = calcularSubred(numeroAIP(red + i * tamanio), String(nuevoPrefijo));
    subredes.push({
      red: s.red,
      prefijo: s.prefijo,
      primerHost: s.primerHost,
      ultimoHost: s.ultimoHost,
      broadcast: s.broadcast,
      hostsUtiles: s.hostsUtiles,
    });
  }

  return { cantidad, tamanio, subredes, truncado: cantidad > mostrar };
}
