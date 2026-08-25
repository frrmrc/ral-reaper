/**
 * TAGLIO DEL CUNEO FISCALE — L. 207/2024 art. 1 c. 4-9 (misura strutturale)
 * =========================================================================
 *
 * È una misura DISTINTA dal trattamento integrativo e CUMULABILE con esso:
 * chi ha i requisiti di entrambe le riceve entrambe. Nessuna norma le rende
 * alternative.
 *
 * Si compone di due strumenti, che si escludono a vicenda per fascia di reddito:
 *
 *   RC ≤ 20.000 €          → SOMMA INTEGRATIVA: una percentuale del reddito da
 *                            lavoro, erogata esentasse. Non riduce le imposte:
 *                            si aggiunge al netto, come il trattamento integrativo.
 *
 *   20.000 < RC ≤ 40.000 € → ULTERIORE DETRAZIONE: 1.000 € sottratti dall'imposta
 *                            lorda, che decrescono fino a zero fra 32.000 e 40.000 €.
 *
 * Fonte: docs/Trattamento_Integrativo_IRPEF_ex_Bonus_Renzi.md §9
 *
 * NOTA — i due documenti descrivono la somma integrativa in modo diverso: uno
 * come "quota esclusa dal reddito", l'altro come "somma esentasse". Qui è
 * implementata come somma EROGATA IN AGGIUNTA al netto, coerentemente con il
 * testo della norma ("è riconosciuta una somma, che non concorre alla formazione
 * del reddito"). Vedi semplificazioni.js → 'cuneo-somma-integrativa'.
 */

import { CUNEO_FISCALE as C } from './parametri-2026.js';

/**
 * Somma integrativa esentasse (RC ≤ 20.000 €).
 * @param {object} input
 * @param {number} input.redditoComplessivo
 * @param {number} [input.redditoLavoroDipendente]  base di calcolo della percentuale
 * @returns {{totale:number, percentuale:number, passi:Array}}
 */
export function calcolaSommaIntegrativaCuneo({ redditoComplessivo: rc, redditoLavoroDipendente = null }) {
  const passi = [];
  const base = redditoLavoroDipendente ?? rc;   // con un solo rapporto di lavoro coincidono

  // Il primo scaglione la cui soglia non è superata dal reddito.
  const scaglione = C.sommaIntegrativa.find((s) => rc <= s.fino);

  if (rc <= 0 || !scaglione) {
    return { totale: 0, percentuale: 0, passi };
  }

  const totale = base * scaglione.percentuale;

  passi.push({
    titolo: 'Somma integrativa esentasse (cuneo fiscale)',
    formula: `${base.toFixed(2)} × ${(scaglione.percentuale * 100).toFixed(1)}% = ${totale.toFixed(2)} €`,
    spiegazione: `Per redditi fino a ${scaglione.fino.toLocaleString('it-IT')} € spetta il `
      + `${(scaglione.percentuale * 100).toFixed(1)}% del reddito di lavoro dipendente. `
      + 'Non è tassata e non sconta contributi: entra intera nel netto.',
    valore: totale,
  });

  return { totale, percentuale: scaglione.percentuale, passi };
}

/**
 * Ulteriore detrazione dall'imposta lorda (20.000 < RC ≤ 40.000 €).
 * @param {object} input
 * @param {number} input.redditoComplessivo
 * @returns {{totale:number, passi:Array}}
 */
export function calcolaUlterioreDetrazioneCuneo({ redditoComplessivo: rc }) {
  const passi = [];
  const U = C.ulterioreDetrazione;

  if (rc <= U.da || rc > U.azzeramento) {
    return { totale: 0, passi };
  }

  let totale;
  let formula;

  if (rc <= U.finoAPieno) {
    totale = U.importoPieno;
    formula = `RC fra ${U.da.toLocaleString('it-IT')} € e ${U.finoAPieno.toLocaleString('it-IT')} € `
      + `→ ${U.importoPieno} € pieni`;
  } else {
    // Decrescita lineare fra 32.000 e 40.000 €
    totale = U.importoPieno * (U.azzeramento - rc) / (U.azzeramento - U.finoAPieno);
    formula = `${U.importoPieno} × (${U.azzeramento} − ${rc.toFixed(2)}) / `
      + `${U.azzeramento - U.finoAPieno} = ${totale.toFixed(2)} €`;
  }

  passi.push({
    titolo: 'Ulteriore detrazione (cuneo fiscale)',
    formula,
    spiegazione: "Si sottrae dall'imposta lorda insieme alle altre detrazioni.",
    valore: totale,
  });

  return { totale, passi };
}
