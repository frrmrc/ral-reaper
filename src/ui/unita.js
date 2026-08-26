/**
 * GLI IMPORTI IN TOKEN
 * ====================
 *
 * Nessuna regola fiscale qui dentro: come formato.js, questo file tocca solo
 * ciò che si legge a schermo. Il calcolo resta in euro dal primo all'ultimo
 * passaggio; qui gli importi già calcolati vengono riscritti in un'unità meno
 * astratta di "trentacinquemila euro": quanti token di un modello linguistico
 * ci compri.
 *
 * Listino Claude Fable 5 di Anthropic, dollari per milione di token:
 *
 *   input    10 $   — il testo che gli mandi
 *   output   50 $   — il testo che ti risponde
 *
 * Le due tariffe non si mediano: differiscono di cinque volte, e una media
 * darebbe un numero che non corrisponde a nessun prezzo reale. Si mostrano
 * tutt'e due, affiancate.
 */

import { numero } from './formato.js';

/** Dollari per milione di token, listino API di Anthropic per Claude Fable 5. */
export const PREZZO_PER_MILIONE = { input: 10, output: 50 };

/**
 * Cambio fisso, non aggiornato in tempo reale: una chiamata di rete a ogni
 * digitazione, per una conversione che serve a dare un ordine di grandezza,
 * sarebbe sproporzionata. Se il cambio si muove in modo sensibile, si cambia
 * questa riga — è l'unico punto in cui compare.
 */
export const CAMBIO_EUR_USD = 1.08;

/** 26.032 € → 562.291.200 token in output. */
export const tokenDaEuro = (importoEuro, tipo) =>
  ((importoEuro ?? 0) * CAMBIO_EUR_USD * 1e6) / PREZZO_PER_MILIONE[tipo];

/** Cifra per esteso, senza abbreviazioni: il numero intero è metà della battuta. */
export const formattaToken = (n) => `${numero(Math.round(n ?? 0))} token`;

/** "562.291.200 token", partendo dall'importo in euro. */
export const tokenDa = (importoEuro, tipo) => formattaToken(tokenDaEuro(importoEuro, tipo));
