/**
 * TRATTAMENTO INTEGRATIVO (ex "bonus Renzi") — D.L. 3/2020 art. 1
 * ===============================================================
 *
 * NON è una detrazione: è un CREDITO D'IMPOSTA che il datore eroga in busta
 * paga. Non riduce le tasse, si AGGIUNGE al netto. Nel nostro calcolo entra
 * quindi con il segno +.
 *
 * Massimo 1.200 €/anno. La regola cambia in due fasce di reddito:
 *
 *   RC ≤ 15.000 €          → tutto o niente. Spetta l'intero importo solo se
 *                            l'imposta lorda supera 1.955 − 75 = 1.880 €
 *                            (ragguagliati ai giorni). Serve a escludere gli
 *                            "incapienti", che non pagherebbero comunque IRPEF.
 *
 *   15.000 < RC ≤ 28.000 € → spetta solo la parte di detrazioni che il
 *                            lavoratore non riesce a sfruttare perché l'imposta
 *                            lorda è troppo bassa: detrazioni − imposta lorda,
 *                            con il tetto di 1.200 €.
 *
 *   RC > 28.000 €          → nulla.
 *
 * Fonte: docs/Trattamento_Integrativo_IRPEF_ex_Bonus_Renzi.md §4
 */

import { TRATTAMENTO_INTEGRATIVO as T, DETRAZIONE_LAVORO_DIPENDENTE } from './parametri-2026.js';

/**
 * @param {object} input
 * @param {number} input.redditoComplessivo
 * @param {number} input.irpefLorda        imposta lorda sui soli redditi di lavoro dipendente
 * @param {number} input.detrazioniTotali  detrazioni rilevanti per il confronto (fascia 15-28k)
 * @param {number} input.giorniLavorati
 * @returns {{totale:number, fascia:string, passi:Array}}
 */
export function calcolaTrattamentoIntegrativo({
  redditoComplessivo: rc,
  irpefLorda,
  detrazioniTotali,
  giorniLavorati = DETRAZIONE_LAVORO_DIPENDENTE.giorniAnnoPieno,
}) {
  const passi = [];
  const proporzioneGiorni = giorniLavorati / DETRAZIONE_LAVORO_DIPENDENTE.giorniAnnoPieno;
  const importoMassimo = T.importoMassimo * proporzioneGiorni;

  // --- Fascia alta: nessun bonus -----------------------------------------
  if (rc > T.sogliaAlta) {
    passi.push({
      titolo: 'Trattamento integrativo non spettante',
      formula: `RC ${rc.toFixed(2)} € > ${T.sogliaAlta} €`,
      spiegazione: 'Oltre 28.000 € di reddito complessivo il trattamento integrativo non spetta.',
      valore: 0,
    });
    return { totale: 0, fascia: 'oltre-28000', passi };
  }

  // --- Fascia bassa: test di capienza, tutto o niente ---------------------
  if (rc <= T.sogliaBassa) {
    const soglia = (T.detrazioneRiferimento - T.correttivo) * proporzioneGiorni;
    const superato = irpefLorda > soglia;
    const totale = superato ? importoMassimo : 0;

    passi.push({
      titolo: 'Test di capienza fiscale',
      formula: `IRPEF lorda ${irpefLorda.toFixed(2)} € ${superato ? '>' : '≤'} `
        + `(${T.detrazioneRiferimento} − ${T.correttivo}) = ${soglia.toFixed(2)} €`,
      spiegazione: superato
        ? "L'imposta lorda supera la soglia: spetta il bonus pieno."
        : "L'imposta lorda non supera la soglia (lavoratore \"incapiente\"): il bonus non spetta. "
          + 'In questa fascia non esiste una via di mezzo.',
      valore: totale,
    });

    return { totale, fascia: 'fino-15000', testSuperato: superato, sogliaTest: soglia, passi };
  }

  // --- Fascia intermedia: differenza detrazioni − imposta lorda -----------
  const differenza = detrazioniTotali - irpefLorda;
  const totale = Math.max(0, Math.min(importoMassimo, differenza));

  passi.push({
    titolo: 'Detrazioni non sfruttate',
    formula: `${detrazioniTotali.toFixed(2)} − ${irpefLorda.toFixed(2)} = ${differenza.toFixed(2)} €`,
    spiegazione: "Nella fascia 15.000–28.000 € il bonus copre solo le detrazioni che eccedono l'imposta lorda.",
    valore: differenza,
  });

  passi.push({
    titolo: 'Applicazione del tetto massimo',
    formula: `min(${importoMassimo.toFixed(2)} ; max(0 ; ${differenza.toFixed(2)})) = ${totale.toFixed(2)} €`,
    spiegazione: `Il trattamento integrativo non può superare ${T.importoMassimo} € l'anno `
      + '(rapportati al periodo di lavoro) e non può essere negativo.',
    valore: totale,
  });

  return { totale, fascia: '15000-28000', differenza, passi };
}
