/**
 * CONTRIBUTI INPS A CARICO DEL LAVORATORE
 * =======================================
 *
 * È la prima trattenuta in ordine di applicazione: si calcola sulla RAL,
 * PRIMA di qualsiasi imposta. Il risultato riduce la base imponibile IRPEF.
 *
 *      RAL − contributi INPS = reddito imponibile IRPEF
 *
 * Tre regole si sommano:
 *   1. aliquota base sull'intera retribuzione   (9,19%, oppure 5,84% per gli apprendisti)
 *   2. aliquota aggiuntiva dell'1% sulla parte eccedente la prima fascia (56.224 €/anno)
 *   3. massimale annuo: oltre 122.295 € non si versa più nulla
 *
 * Fonte: docs/inps.md
 */

import { INPS } from './parametri-2026.js';

/**
 * @param {object} input
 * @param {number}  input.ral          Retribuzione annua lorda in euro
 * @param {boolean} input.apprendista  true se il lavoratore è in apprendistato
 * @returns {{totale:number, imponibile:number, aliquotaBase:number, passi:Array}}
 */
export function calcolaContributiInps({ ral, apprendista = false }) {
  const passi = [];

  // --- Passo 1: il massimale annuo taglia la base contributiva ------------
  // Sulla parte di RAL che eccede 122.295 € non è dovuto alcun contributo.
  const imponibile = Math.min(ral, INPS.massimaleAnnuo);

  if (ral > INPS.massimaleAnnuo) {
    passi.push({
      titolo: 'Massimale contributivo annuo',
      formula: `min(${ral} ; ${INPS.massimaleAnnuo}) = ${imponibile}`,
      spiegazione: `La RAL supera il massimale di ${INPS.massimaleAnnuo} €: `
        + `sui ${(ral - INPS.massimaleAnnuo).toFixed(2)} € eccedenti non si versano contributi.`,
      valore: imponibile,
    });
  } else {
    passi.push({
      titolo: 'Imponibile previdenziale',
      formula: `${ral} € (sotto il massimale di ${INPS.massimaleAnnuo} €)`,
      spiegazione: 'Tutta la RAL è soggetta a contribuzione.',
      valore: imponibile,
    });
  }

  // --- Passo 2: aliquota base --------------------------------------------
  const aliquotaBase = apprendista ? INPS.aliquotaApprendista : INPS.aliquotaLavoratore;
  const quotaBase = imponibile * aliquotaBase;

  passi.push({
    titolo: apprendista ? 'Aliquota apprendista (5,84%)' : 'Aliquota ordinaria (9,19%)',
    formula: `${imponibile.toFixed(2)} × ${(aliquotaBase * 100).toFixed(2)}% = ${quotaBase.toFixed(2)} €`,
    spiegazione: apprendista
      ? 'L\'apprendista versa il 5,84% (aliquota AGO ridotta di 3 punti, art. 21 L. 41/1986).'
      : 'Quota a carico del lavoratore del 33% IVS complessivo (il datore versa il restante 23,81%).',
    valore: quotaBase,
  });

  // --- Passo 3: aliquota aggiuntiva dell'1% ------------------------------
  // Si applica solo se l'aliquota a carico del lavoratore è inferiore al 10%
  // (sia il 9,19% sia il 5,84% lo sono, quindi si applica sempre).
  //
  // La norma parla di "mensilizzazione": ogni mese si guarda la quota di
  // retribuzione oltre 4.685 €. Con uno stipendio mensile costante il conto
  // annuale è equivalente, perché 4.685 × 12 ≈ 56.224 € = prima fascia annua.
  // Il conguaglio di fine anno riporta comunque il calcolo su base annua.
  const eccedenzaPrimaFascia = Math.max(0, imponibile - INPS.primaFasciaAnnua);
  const quotaAggiuntiva = eccedenzaPrimaFascia * INPS.aliquotaAggiuntiva;

  if (eccedenzaPrimaFascia > 0) {
    passi.push({
      titolo: 'Aliquota aggiuntiva 1%',
      formula: `(${imponibile.toFixed(2)} − ${INPS.primaFasciaAnnua}) × 1% = ${quotaAggiuntiva.toFixed(2)} €`,
      spiegazione: `La parte di retribuzione oltre la prima fascia (${INPS.primaFasciaAnnua} €/anno, `
        + `pari a ${INPS.sogliaMensileAliquotaAggiuntiva} €/mese) sconta un punto percentuale in più.`,
      valore: quotaAggiuntiva,
    });
  }

  const totale = quotaBase + quotaAggiuntiva;

  passi.push({
    titolo: 'Totale contributi a carico del lavoratore',
    formula: `${quotaBase.toFixed(2)} + ${quotaAggiuntiva.toFixed(2)} = ${totale.toFixed(2)} €`,
    spiegazione: `Aliquota effettiva sulla RAL: ${(ral > 0 ? (totale / ral) * 100 : 0).toFixed(2)}%.`,
    valore: totale,
  });

  return { totale, imponibile, aliquotaBase, quotaBase, quotaAggiuntiva, passi };
}
