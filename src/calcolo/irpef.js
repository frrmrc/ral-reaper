/**
 * IRPEF LORDA — imposta per scaglioni progressivi
 * ===============================================
 *
 * L'IRPEF è progressiva "per scaglioni": ogni fetta di reddito è tassata
 * con la propria aliquota, NON si applica un'unica aliquota a tutto il reddito.
 *
 * Esempio con reddito 40.000 €:
 *      primi  28.000 €          × 23%  = 6.440 €
 *      restanti 12.000 €        × 33%  = 3.960 €
 *                                        --------
 *                               totale = 10.400 €
 *
 * La base di calcolo NON è la RAL, ma la RAL già ridotta dei contributi INPS.
 *
 * Fonte: art. 11 TUIR — docs/aliquote-irpef.md
 */

import { IRPEF } from './parametri-2026.js';

/**
 * @param {number} imponibile  Reddito imponibile IRPEF (RAL − contributi INPS)
 * @returns {{totale:number, scaglioni:Array, aliquotaMarginale:number, aliquotaMedia:number}}
 */
export function calcolaIrpefLorda(imponibile) {
  const scaglioni = [];
  let totale = 0;
  let aliquotaMarginale = 0;

  for (const scaglione of IRPEF.scaglioni) {
    // Quanta parte del reddito cade dentro QUESTO scaglione?
    const quotaNelloScaglione = Math.max(
      0,
      Math.min(imponibile, scaglione.fino) - scaglione.da
    );

    if (quotaNelloScaglione <= 0) break;   // gli scaglioni successivi sono vuoti

    const imposta = quotaNelloScaglione * scaglione.aliquota;
    totale += imposta;
    aliquotaMarginale = scaglione.aliquota;

    scaglioni.push({
      da: scaglione.da,
      fino: scaglione.fino,
      aliquota: scaglione.aliquota,
      quotaTassata: quotaNelloScaglione,
      imposta,
      etichetta: scaglione.fino === Infinity
        ? `oltre ${scaglione.da.toLocaleString('it-IT')} €`
        : `${scaglione.da.toLocaleString('it-IT')} – ${scaglione.fino.toLocaleString('it-IT')} €`,
    });
  }

  return {
    totale,
    scaglioni,
    aliquotaMarginale,                                        // aliquota sull'ultimo euro guadagnato
    aliquotaMedia: imponibile > 0 ? totale / imponibile : 0,  // pressione fiscale effettiva
  };
}
