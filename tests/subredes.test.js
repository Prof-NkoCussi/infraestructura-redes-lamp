/**
 * Tests de la calculadora de subredes.
 * Correr con: node --test tests/
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  ErrorEntrada,
  parsearIP,
  numeroAIP,
  aBinario,
  prefijoAMascara,
  mascaraAPrefijo,
  parsearMascara,
  parsearEntrada,
  claseDe,
  tipoDe,
  calcularSubred,
  prefijoParaHosts,
  subdividir,
} from '../herramientas/subredes/subredes.js';

/** Verifica que tire ErrorEntrada y que el mensaje diga lo que tiene que decir. */
function fallaCon(fn, patron) {
  assert.throws(fn, (err) => {
    assert.ok(err instanceof ErrorEntrada, `se esperaba ErrorEntrada y llegó ${err?.name}`);
    assert.match(err.message, patron);
    return true;
  });
}

const ip = (texto) => parsearIP(texto);

/* ───────────── Conversión ───────────── */

describe('parsearIP', () => {
  it('convierte una IP a número', () => {
    assert.equal(parsearIP('192.168.1.10'), 3232235786);
    assert.equal(parsearIP('0.0.0.0'), 0);
    assert.equal(parsearIP('255.255.255.255'), 4294967295);
  });

  it('ignora espacios alrededor', () => {
    assert.equal(parsearIP('  10.0.0.1 '), 167772161);
  });

  it('rechaza entradas vacías o que no son texto', () => {
    fallaCon(() => parsearIP(''), /Ingresá una dirección IP/);
    fallaCon(() => parsearIP('   '), /Ingresá una dirección IP/);
    fallaCon(() => parsearIP(null), /Ingresá una dirección IP/);
  });

  it('exige 4 octetos', () => {
    fallaCon(() => parsearIP('1.2.3'), /4 octetos/);
    fallaCon(() => parsearIP('1.2.3.4.5'), /4 octetos/);
  });

  it('rechaza octetos que no son números de hasta 3 cifras', () => {
    fallaCon(() => parsearIP('1.2.3.a'), /Octeto inválido/);
    fallaCon(() => parsearIP('1..2.3'), /Octeto inválido/);
    fallaCon(() => parsearIP('-1.2.3.4'), /Octeto inválido/);
    fallaCon(() => parsearIP('1.2.3.1000'), /Octeto inválido/);
  });

  it('rechaza octetos mayores a 255', () => {
    fallaCon(() => parsearIP('1.2.3.256'), /fuera de rango/);
  });

  it('rechaza ceros a la izquierda por ambiguos', () => {
    fallaCon(() => parsearIP('01.2.3.4'), /ceros a la izquierda/);
    fallaCon(() => parsearIP('10.0.0.010'), /ceros a la izquierda/);
  });
});

describe('numeroAIP y aBinario', () => {
  it('vuelve de número a texto', () => {
    assert.equal(numeroAIP(3232235786), '192.168.1.10');
    assert.equal(numeroAIP(0), '0.0.0.0');
    assert.equal(numeroAIP(4294967295), '255.255.255.255');
  });

  it('ida y vuelta da la misma IP', () => {
    for (const texto of ['8.8.8.8', '172.16.254.1', '100.64.0.1']) {
      assert.equal(numeroAIP(parsearIP(texto)), texto);
    }
  });

  it('muestra los 32 bits separados por octeto', () => {
    assert.equal(aBinario(ip('192.168.1.10')), '11000000.10101000.00000001.00001010');
    assert.equal(aBinario(0), '00000000.00000000.00000000.00000000');
  });
});

describe('prefijoAMascara y mascaraAPrefijo', () => {
  it('convierte prefijo a máscara', () => {
    assert.equal(numeroAIP(prefijoAMascara(24)), '255.255.255.0');
    assert.equal(numeroAIP(prefijoAMascara(20)), '255.255.240.0');
    assert.equal(numeroAIP(prefijoAMascara(1)), '128.0.0.0');
    assert.equal(numeroAIP(prefijoAMascara(0)), '0.0.0.0');
    assert.equal(numeroAIP(prefijoAMascara(32)), '255.255.255.255');
  });

  it('rechaza prefijos fuera de /0–/32 o no enteros', () => {
    fallaCon(() => prefijoAMascara(33), /Prefijo inválido/);
    fallaCon(() => prefijoAMascara(-1), /Prefijo inválido/);
    fallaCon(() => prefijoAMascara(24.5), /Prefijo inválido/);
  });

  it('convierte máscara a prefijo', () => {
    assert.equal(mascaraAPrefijo(ip('255.255.255.0')), 24);
    assert.equal(mascaraAPrefijo(ip('255.255.255.254')), 31);
    assert.equal(mascaraAPrefijo(ip('255.255.255.255')), 32);
    assert.equal(mascaraAPrefijo(ip('0.0.0.0')), 0);
  });

  it('ida y vuelta para todos los prefijos', () => {
    for (let p = 0; p <= 32; p++) {
      assert.equal(mascaraAPrefijo(prefijoAMascara(p)), p);
    }
  });

  it('rechaza máscaras con bits en 1 no contiguos', () => {
    fallaCon(() => mascaraAPrefijo(ip('255.0.255.0')), /contiguos/);
    fallaCon(() => mascaraAPrefijo(ip('0.255.255.255')), /contiguos/);
    fallaCon(() => mascaraAPrefijo(ip('255.255.255.253')), /contiguos/);
  });
});

/* ───────────── Entrada del usuario ───────────── */

describe('parsearMascara', () => {
  const MASCARA_24 = { prefijo: 24, mascara: 4294967040 };

  it('acepta "24", "/24" y "255.255.255.0"', () => {
    assert.deepEqual(parsearMascara('24'), MASCARA_24);
    assert.deepEqual(parsearMascara('/24'), MASCARA_24);
    assert.deepEqual(parsearMascara('255.255.255.0'), MASCARA_24);
    assert.deepEqual(parsearMascara(' /24 '), MASCARA_24);
  });

  it('rechaza vacío, texto suelto y números raros', () => {
    fallaCon(() => parsearMascara(''), /Ingresá una máscara/);
    fallaCon(() => parsearMascara('abc'), /no es una máscara/);
    fallaCon(() => parsearMascara('123'), /no es una máscara/);
  });

  it('propaga los errores de prefijo y de máscara', () => {
    fallaCon(() => parsearMascara('33'), /Prefijo inválido/);
    fallaCon(() => parsearMascara('255.255.0.255'), /contiguos/);
  });
});

describe('parsearEntrada', () => {
  const ESPERADO = { ip: 3232235786, prefijo: 24, mascara: 4294967040 };

  it('acepta IP y máscara por separado', () => {
    assert.deepEqual(parsearEntrada('192.168.1.10', '24'), ESPERADO);
    assert.deepEqual(parsearEntrada('192.168.1.10', '255.255.255.0'), ESPERADO);
  });

  it('acepta IP y máscara juntas en el primer campo', () => {
    assert.deepEqual(parsearEntrada('192.168.1.10/24'), ESPERADO);
    assert.deepEqual(parsearEntrada('192.168.1.10 / 24'), ESPERADO);
    assert.deepEqual(parsearEntrada('192.168.1.10 255.255.255.0'), ESPERADO);
    assert.deepEqual(parsearEntrada('  192.168.1.10/24  ', '   '), ESPERADO);
  });

  it('no deja poner la máscara en los dos lugares', () => {
    fallaCon(() => parsearEntrada('192.168.1.10/24', '24'), /un solo lugar/);
  });

  it('pide la máscara si falta', () => {
    fallaCon(() => parsearEntrada('192.168.1.10'), /Ingresá una máscara/);
  });

  it('pide la IP si falta', () => {
    fallaCon(() => parsearEntrada(undefined, '24'), /Ingresá una dirección IP/);
  });
});

/* ───────────── Clasificación ───────────── */

describe('claseDe', () => {
  it('respeta los límites de cada clase', () => {
    const casos = [
      ['0.0.0.0', 'A'], ['10.0.0.1', 'A'], ['127.255.255.255', 'A'],
      ['128.0.0.0', 'B'], ['191.255.255.255', 'B'],
      ['192.0.0.0', 'C'], ['223.255.255.255', 'C'],
      ['224.0.0.0', 'D'], ['239.255.255.255', 'D'],
      ['240.0.0.0', 'E'], ['255.255.255.255', 'E'],
    ];
    for (const [texto, clase] of casos) {
      assert.equal(claseDe(ip(texto)), clase, texto);
    }
  });
});

describe('tipoDe', () => {
  it('reconoce los rangos privados RFC 1918 y sus bordes', () => {
    assert.equal(tipoDe(ip('10.1.2.3')), 'Privada (RFC 1918)');
    assert.equal(tipoDe(ip('172.16.0.1')), 'Privada (RFC 1918)');
    assert.equal(tipoDe(ip('172.31.255.255')), 'Privada (RFC 1918)');
    assert.equal(tipoDe(ip('172.32.0.1')), 'Pública');
    assert.equal(tipoDe(ip('192.168.5.5')), 'Privada (RFC 1918)');
  });

  it('reconoce CGNAT y sus bordes', () => {
    assert.equal(tipoDe(ip('100.64.0.1')), 'Compartida / CGNAT (RFC 6598)');
    assert.equal(tipoDe(ip('100.127.255.255')), 'Compartida / CGNAT (RFC 6598)');
    assert.equal(tipoDe(ip('100.128.0.1')), 'Pública');
  });

  it('reconoce los rangos especiales', () => {
    assert.equal(tipoDe(ip('0.0.0.0')), 'Esta red (reservada)');
    assert.equal(tipoDe(ip('127.0.0.1')), 'Loopback');
    assert.equal(tipoDe(ip('169.254.10.10')), 'Link-local / APIPA');
    assert.equal(tipoDe(ip('192.0.2.1')), 'Documentación (RFC 5737)');
    assert.equal(tipoDe(ip('198.51.100.7')), 'Documentación (RFC 5737)');
    assert.equal(tipoDe(ip('203.0.113.200')), 'Documentación (RFC 5737)');
    assert.equal(tipoDe(ip('198.19.255.255')), 'Pruebas de rendimiento (RFC 2544)');
    assert.equal(tipoDe(ip('224.0.0.5')), 'Multicast');
    assert.equal(tipoDe(ip('250.0.0.1')), 'Reservada');
  });

  it('el broadcast limitado gana sobre el rango reservado 240/4', () => {
    assert.equal(tipoDe(ip('255.255.255.255')), 'Broadcast limitado');
  });

  it('el resto es pública', () => {
    assert.equal(tipoDe(ip('8.8.8.8')), 'Pública');
    assert.equal(tipoDe(ip('1.1.1.1')), 'Pública');
  });
});

/* ───────────── Cálculo ───────────── */

describe('calcularSubred', () => {
  it('resuelve una /24 típica completa', () => {
    assert.deepEqual(calcularSubred('192.168.1.10', '24'), {
      ip: '192.168.1.10',
      prefijo: 24,
      mascara: '255.255.255.0',
      wildcard: '0.0.0.255',
      red: '192.168.1.0',
      broadcast: '192.168.1.255',
      primerHost: '192.168.1.1',
      ultimoHost: '192.168.1.254',
      totalDirecciones: 256,
      hostsUtiles: 254,
      clase: 'C',
      tipo: 'Privada (RFC 1918)',
      binario: {
        ip: '11000000.10101000.00000001.00001010',
        mascara: '11111111.11111111.11111111.00000000',
        red: '11000000.10101000.00000001.00000000',
      },
      notas: [],
    });
  });

  it('da lo mismo con prefijo, con máscara o todo junto', () => {
    const base = calcularSubred('192.168.1.10', '24');
    assert.deepEqual(calcularSubred('192.168.1.10', '255.255.255.0'), base);
    assert.deepEqual(calcularSubred('192.168.1.10/24'), base);
  });

  it('resuelve una máscara que no cae en el octeto (/20)', () => {
    const r = calcularSubred('172.16.5.4/20');
    assert.equal(r.mascara, '255.255.240.0');
    assert.equal(r.wildcard, '0.0.15.255');
    assert.equal(r.red, '172.16.0.0');
    assert.equal(r.broadcast, '172.16.15.255');
    assert.equal(r.primerHost, '172.16.0.1');
    assert.equal(r.ultimoHost, '172.16.15.254');
    assert.equal(r.totalDirecciones, 4096);
    assert.equal(r.hostsUtiles, 4094);
    assert.equal(r.clase, 'B');
  });

  it('resuelve una /8', () => {
    const r = calcularSubred('10.20.30.40', '255.0.0.0');
    assert.equal(r.red, '10.0.0.0');
    assert.equal(r.broadcast, '10.255.255.255');
    assert.equal(r.hostsUtiles, 16777214);
  });

  it('/31: dos hosts, sin red ni broadcast (RFC 3021)', () => {
    const r = calcularSubred('10.0.0.1/31');
    assert.equal(r.red, '10.0.0.0');
    assert.equal(r.broadcast, null);
    assert.equal(r.primerHost, '10.0.0.0');
    assert.equal(r.ultimoHost, '10.0.0.1');
    assert.equal(r.totalDirecciones, 2);
    assert.equal(r.hostsUtiles, 2);
    assert.equal(r.notas.length, 1);
    assert.match(r.notas[0], /RFC 3021/);
  });

  it('/32: un único host', () => {
    const r = calcularSubred('8.8.8.8/32');
    assert.equal(r.red, '8.8.8.8');
    assert.equal(r.wildcard, '0.0.0.0');
    assert.equal(r.broadcast, null);
    assert.equal(r.primerHost, '8.8.8.8');
    assert.equal(r.ultimoHost, '8.8.8.8');
    assert.equal(r.totalDirecciones, 1);
    assert.equal(r.hostsUtiles, 1);
    assert.equal(r.tipo, 'Pública');
    assert.match(r.notas[0], /único host/);
  });

  it('/0: todo el espacio IPv4', () => {
    const r = calcularSubred('1.2.3.4/0');
    assert.equal(r.mascara, '0.0.0.0');
    assert.equal(r.wildcard, '255.255.255.255');
    assert.equal(r.red, '0.0.0.0');
    assert.equal(r.broadcast, '255.255.255.255');
    assert.equal(r.primerHost, '0.0.0.1');
    assert.equal(r.ultimoHost, '255.255.255.254');
    assert.equal(r.totalDirecciones, 4294967296);
    assert.equal(r.hostsUtiles, 4294967294);
  });

  it('avisa si la IP es la dirección de red', () => {
    const r = calcularSubred('192.168.1.0/24');
    assert.equal(r.notas.length, 1);
    assert.match(r.notas[0], /dirección de red/);
  });

  it('avisa si la IP es el broadcast', () => {
    const r = calcularSubred('192.168.1.255/24');
    assert.equal(r.notas.length, 1);
    assert.match(r.notas[0], /broadcast/);
  });

  it('no avisa nada para un host común', () => {
    assert.deepEqual(calcularSubred('192.168.1.1/24').notas, []);
  });

  it('propaga los errores de entrada', () => {
    fallaCon(() => calcularSubred('192.168.1.300/24'), /fuera de rango/);
    fallaCon(() => calcularSubred('192.168.1.10'), /Ingresá una máscara/);
  });
});

describe('prefijoParaHosts', () => {
  it('casos especiales: 1 host → /32, 2 hosts → /31', () => {
    assert.equal(prefijoParaHosts(1), 32);
    assert.equal(prefijoParaHosts(2), 31);
  });

  it('elige la red más chica que alcanza', () => {
    assert.equal(prefijoParaHosts(3), 29);
    assert.equal(prefijoParaHosts(6), 29);
    assert.equal(prefijoParaHosts(7), 28);
    assert.equal(prefijoParaHosts(14), 28);
    assert.equal(prefijoParaHosts(15), 27);
    assert.equal(prefijoParaHosts(254), 24);
    assert.equal(prefijoParaHosts(255), 23);
    assert.equal(prefijoParaHosts(500), 23);
  });

  it('llega hasta /0', () => {
    assert.equal(prefijoParaHosts(2 ** 32 - 2), 0);
  });

  it('rechaza cantidades imposibles', () => {
    fallaCon(() => prefijoParaHosts(2 ** 32 - 1), /tantos hosts/);
    fallaCon(() => prefijoParaHosts(0), /entero mayor a 0/);
    fallaCon(() => prefijoParaHosts(-5), /entero mayor a 0/);
    fallaCon(() => prefijoParaHosts(1.5), /entero mayor a 0/);
    fallaCon(() => prefijoParaHosts('10'), /entero mayor a 0/);
  });
});

describe('subdividir', () => {
  it('parte una /24 en cuatro /26', () => {
    assert.deepEqual(subdividir('192.168.1.0', '24', 26), {
      cantidad: 4,
      tamanio: 64,
      truncado: false,
      subredes: [
        { red: '192.168.1.0', prefijo: 26, primerHost: '192.168.1.1', ultimoHost: '192.168.1.62', broadcast: '192.168.1.63', hostsUtiles: 62 },
        { red: '192.168.1.64', prefijo: 26, primerHost: '192.168.1.65', ultimoHost: '192.168.1.126', broadcast: '192.168.1.127', hostsUtiles: 62 },
        { red: '192.168.1.128', prefijo: 26, primerHost: '192.168.1.129', ultimoHost: '192.168.1.190', broadcast: '192.168.1.191', hostsUtiles: 62 },
        { red: '192.168.1.192', prefijo: 26, primerHost: '192.168.1.193', ultimoHost: '192.168.1.254', broadcast: '192.168.1.255', hostsUtiles: 62 },
      ],
    });
  });

  it('arranca desde la dirección de red aunque se ingrese un host', () => {
    const r = subdividir('192.168.1.77', '24', 25);
    assert.equal(r.cantidad, 2);
    assert.deepEqual(r.subredes.map(s => s.red), ['192.168.1.0', '192.168.1.128']);
  });

  it('acepta IP y máscara juntas', () => {
    assert.deepEqual(subdividir('192.168.1.0/24', '', 26), subdividir('192.168.1.0', '24', 26));
  });

  it('corta la lista en el límite y lo avisa', () => {
    const r = subdividir('10.0.0.0/8', '', 24);
    assert.equal(r.cantidad, 65536);
    assert.equal(r.tamanio, 256);
    assert.equal(r.subredes.length, 64);
    assert.equal(r.truncado, true);
    assert.equal(r.subredes[63].red, '10.0.63.0');
  });

  it('respeta un límite propio', () => {
    const r = subdividir('192.168.1.0', '24', 30, 10);
    assert.equal(r.cantidad, 64);
    assert.equal(r.subredes.length, 10);
    assert.equal(r.truncado, true);
  });

  it('subredes /32 no tienen broadcast', () => {
    const r = subdividir('192.168.1.0', '30', 32);
    assert.equal(r.cantidad, 4);
    assert.ok(r.subredes.every(s => s.broadcast === null && s.hostsUtiles === 1));
  });

  it('rechaza un prefijo nuevo que no achica la red', () => {
    fallaCon(() => subdividir('192.168.1.0', '24', 24), /entre \/25 y \/32/);
    fallaCon(() => subdividir('192.168.1.0', '24', 20), /entre \/25 y \/32/);
    fallaCon(() => subdividir('192.168.1.0', '24', 33), /entre \/25 y \/32/);
  });
});
