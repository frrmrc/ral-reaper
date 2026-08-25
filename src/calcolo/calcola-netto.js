/**
 * CALCOLO DEL NETTO — orchestratore
 * =================================
 *
 * Questo file NON contiene regole fiscali: mette in fila, nell'ordine giusto,
 * le funzioni dei moduli specializzati. È la mappa dell'intero calcolo.
 *
 *   RAL
 *    − contributi INPS a carico del lavoratore          → contributi-inps.js
 *   ─────────────────────────────────────────────
 *    = reddito imponibile IRPEF  ( = reddito complessivo )
 *
 *      IRPEF lorda per scaglioni                        → irpef.js
 *    − detrazione lavoro dipendente                     → detrazioni-lavoro-dipendente.js
 *    − detrazioni familiari a carico                    → detrazioni-familiari.js
 *    − ulteriore detrazione cuneo fiscale               → cuneo-fiscale.js
 *   ─────────────────────────────────────────────
 *    = IRPEF netta   (mai negativa)
 *
 *   RAL
 *    − contributi INPS
 *    − IRPEF netta
 *    − addizionale regionale                            → addizionali.js
 *    − addizionale comunale                             → addizionali.js
 *    + trattamento integrativo                          → trattamento-integrativo.js
 *    + somma integrativa cuneo fiscale                  → cuneo-fiscale.js
 *   ─────────────────────────────────────────────
 *    = NETTO ANNUO
 *
 * Le ultime due voci hanno il segno PIÙ: non sono sconti d'imposta, sono somme
 * che il datore eroga in busta paga.
 */

import { calcolaContributiInps } from './contributi-inps.js';
import { calcolaIrpefLorda } from './irpef.js';
import { calcolaDetrazioneLavoroDipendente } from './detrazioni-lavoro-dipendente.js';
import { calcolaDetrazioniFamiliari } from './detrazioni-familiari.js';
import { calcolaTrattamentoIntegrativo } from './trattamento-integrativo.js';
import { calcolaSommaIntegrativaCuneo, calcolaUlterioreDetrazioneCuneo } from './cuneo-fiscale.js';
import { calcolaAddizionaleRegionale, calcolaAddizionaleComunale } from './addizionali.js';

/**
 * @param {object} input
 * @param {number}  input.ral                RAL annua lorda in euro
 * @param {number}  input.mensilita          12, 13 o 14
 * @param {object}  input.regione            voce del dataset regionale (o null)
 * @param {object}  input.comune             voce del dataset comunale (o null)
 * @param {number}  input.giorniLavorati     giorni di lavoro nell'anno
 * @param {boolean} input.apprendista
 * @param {boolean} input.tempoDeterminato
 * @param {boolean} input.coniugeACarico
 * @param {number}  input.figliACarico       figli 21-29 anni non disabili
 * @param {number}  input.figliDisabili
 * @param {number}  input.percentualeFigli   0.5 oppure 1
 * @param {number}  input.altriFamiliari
 */
export function calcolaNetto(input) {
  const {
    ral,
    mensilita = 14,
    regione = null,
    comune = null,
    giorniLavorati = 365,
    apprendista = false,
    tempoDeterminato = false,
    coniugeACarico = false,
    figliACarico = 0,
    figliDisabili = 0,
    percentualeFigli = 0.5,
    altriFamiliari = 0,
  } = input;

  /* --- 1. Contributi previdenziali ------------------------------------ */
  const inps = calcolaContributiInps({ ral, apprendista });

  /* --- 2. Reddito imponibile ------------------------------------------
   * Coincide con il reddito complessivo, perché assumiamo che il lavoratore
   * non abbia altri redditi né oneri deducibili.
   * Vedi semplificazioni.js → 'reddito-complessivo-solo-lavoro'.
   */
  const imponibile = Math.max(0, ral - inps.totale);
  const redditoComplessivo = imponibile;

  /* --- 3. IRPEF lorda -------------------------------------------------- */
  const irpef = calcolaIrpefLorda(imponibile);

  /* --- 4. Detrazioni ---------------------------------------------------- */
  const detrazioneLavoro = calcolaDetrazioneLavoroDipendente({
    redditoComplessivo, giorniLavorati, tempoDeterminato,
  });

  const detrazioniFamiliari = calcolaDetrazioniFamiliari({
    redditoComplessivo, coniugeACarico, figliACarico, figliDisabili, percentualeFigli, altriFamiliari,
  });

  const ulterioreDetrazioneCuneo = calcolaUlterioreDetrazioneCuneo({ redditoComplessivo });

  const detrazioniTotali =
    detrazioneLavoro.totale + detrazioniFamiliari.totale + ulterioreDetrazioneCuneo.totale;

  /* --- 5. IRPEF netta ---------------------------------------------------
   * Le detrazioni non possono generare un credito: l'imposta si ferma a zero.
   * Chi resta a zero è un "incapiente".
   */
  const irpefNetta = Math.max(0, irpef.totale - detrazioniTotali);
  const detrazioniNonSfruttate = Math.max(0, detrazioniTotali - irpef.totale);

  /* --- 6. Trattamento integrativo --------------------------------------
   * Il test di capienza confronta l'imposta lorda con le detrazioni previste
   * dalla Circolare 4/E/2022: lavoro dipendente e familiari a carico.
   * L'ulteriore detrazione da cuneo fiscale è esclusa dal confronto.
   * Vedi semplificazioni.js → 'detrazioni-test-trattamento'.
   */
  const trattamentoIntegrativo = calcolaTrattamentoIntegrativo({
    redditoComplessivo,
    irpefLorda: irpef.totale,
    detrazioniTotali: detrazioneLavoro.totale + detrazioniFamiliari.totale,
    giorniLavorati,
  });

  /* --- 7. Somma integrativa del cuneo fiscale --------------------------- */
  const sommaCuneo = calcolaSommaIntegrativaCuneo({ redditoComplessivo });

  /* --- 8. Addizionali ---------------------------------------------------
   * Dovute solo se resta IRPEF da pagare dopo le detrazioni.
   */
  const irpefDovuta = irpefNetta > 0;
  const addizionaleRegionale = calcolaAddizionaleRegionale({ imponibile, regione, irpefDovuta });
  const addizionaleComunale = calcolaAddizionaleComunale({ imponibile, comune, irpefDovuta });

  /* --- 9. Netto ---------------------------------------------------------- */
  const totaleTrattenute =
    inps.totale + irpefNetta + addizionaleRegionale.totale + addizionaleComunale.totale;

  const totaleErogazioni = trattamentoIntegrativo.totale + sommaCuneo.totale;

  const nettoAnnuo = ral - totaleTrattenute + totaleErogazioni;

  return {
    input,

    // Voci principali
    ral,
    contributiInps: inps.totale,
    imponibile,
    redditoComplessivo,
    irpefLorda: irpef.totale,
    detrazioniTotali,
    detrazioniNonSfruttate,
    irpefNetta,
    addizionaleRegionale: addizionaleRegionale.totale,
    addizionaleComunale: addizionaleComunale.totale,
    trattamentoIntegrativo: trattamentoIntegrativo.totale,
    sommaCuneo: sommaCuneo.totale,

    totaleTrattenute,
    totaleErogazioni,
    nettoAnnuo,
    nettoMensile: mensilita > 0 ? nettoAnnuo / mensilita : 0,
    mensilita,

    // Indicatori
    aliquotaMarginaleIrpef: irpef.aliquotaMarginale,
    // Quanto della RAL resta effettivamente in tasca
    percentualeNetto: ral > 0 ? nettoAnnuo / ral : 0,
    // Pressione complessiva: trattenute al netto delle somme erogate
    pressioneEffettiva: ral > 0 ? (totaleTrattenute - totaleErogazioni) / ral : 0,

    // Dettagli per la spiegazione passo-passo nell'interfaccia
    dettaglio: {
      inps,
      irpef,
      detrazioneLavoro,
      detrazioniFamiliari,
      ulterioreDetrazioneCuneo,
      trattamentoIntegrativo,
      sommaCuneo,
      addizionaleRegionale,
      addizionaleComunale,
    },
  };
}
