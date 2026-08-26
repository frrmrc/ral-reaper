/**
 * TEST DELLA CONVERSIONE IN TOKEN
 * ===============================
 *
 * Eseguire con:  npm test
 *
 * Nessuna regola fiscale qui: si verifica solo che il cambio d'unità sia
 * reversibile e che le due tariffe non si scambino di posto.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  PREZZO_PER_MILIONE, CAMBIO_EUR_USD, tokenDaEuro, formattaToken, tokenDa,
} from '../src/ui/unita.js';

const vicino = (ottenuto, atteso, tolleranza = 1e-6) =>
  assert.ok(
    Math.abs(ottenuto - atteso) <= tolleranza,
    `atteso ${atteso}, ottenuto ${ottenuto}`
  );

describe('Conversione euro → token', () => {
  test('listino Claude Fable 5: 10 $ in input, 50 $ in output per milione', () => {
    assert.equal(PREZZO_PER_MILIONE.input, 10);
    assert.equal(PREZZO_PER_MILIONE.output, 50);
  });

  test('50 $ di listino comprano un milione di token in output', () => {
    vicino(tokenDaEuro(50 / CAMBIO_EUR_USD, 'output'), 1e6, 1e-3);
  });

  test("l'input costa un quinto dell'output, quindi ne compra cinque volte tanti", () => {
    vicino(tokenDaEuro(1000, 'input'), tokenDaEuro(1000, 'output') * 5, 1e-3);
  });

  test('zero euro, zero token', () => {
    assert.equal(tokenDaEuro(0, 'output'), 0);
    assert.equal(tokenDaEuro(undefined, 'input'), 0);
  });
});

describe('Formato dei token', () => {
  test('il numero si scrive per esteso, senza abbreviazioni', () => {
    assert.equal(formattaToken(2811456000), '2.811.456.000 token');
    assert.equal(formattaToken(562291200), '562.291.200 token');
    assert.equal(formattaToken(48200), '48.200 token');
  });

  test('nessun decimale: i token si contano interi', () => {
    assert.equal(formattaToken(1234.6), '1.235 token');
  });

  test('la tariffa applicata è quella chiesta', () => {
    assert.equal(tokenDa(26032, 'output'), formattaToken(tokenDaEuro(26032, 'output')));
    assert.notEqual(tokenDa(26032, 'input'), tokenDa(26032, 'output'));
  });
});
