/**
 * DETRAZIONI PER FAMILIARI A CARICO (art. 12 TUIR)
 * ================================================
 *
 * Come la detrazione da lavoro dipendente, si sottraggono dall'IMPOSTA LORDA.
 * Si sommano a quella da lavoro dipendente, non la sostituiscono.
 *
 * Tre voci indipendenti:
 *   - coniuge non separato          → importo a scaglioni
 *   - figli fra 21 e 29 anni        → sotto i 21 c'è l'Assegno Unico, non la detrazione
 *   - altri familiari CONVIVENTI    → ascendenti (genitori, nonni)
 *
 * Fonte: docs/Detrazioni_Lavoro_Dipendente_e_Familiari_a_Carico_Guida_2026.md Parte II
 */

import { DETRAZIONI_FAMILIARI as F } from './parametri-2026.js';

/**
 * Detrazione per il coniuge a carico — art. 12 c. 1 lett. a) TUIR.
 * Non spetta ai conviventi di fatto né al coniuge legalmente separato.
 */
export function calcolaDetrazioneConiuge(rc) {
  if (rc <= 0) return { importo: 0, formula: 'nessun reddito' };

  if (rc <= F.coniuge.fascia1.limite) {
    const importo = F.coniuge.fascia1.base - F.coniuge.fascia1.sottrazione * (rc / F.coniuge.fascia1.limite);
    return {
      importo,
      formula: `${F.coniuge.fascia1.base} − ${F.coniuge.fascia1.sottrazione} × (${rc.toFixed(2)} / ${F.coniuge.fascia1.limite}) = ${importo.toFixed(2)} €`,
    };
  }
  if (rc <= F.coniuge.fascia2.limite) {
    return {
      importo: F.coniuge.fascia2.importo,
      formula: `fascia ${F.coniuge.fascia1.limite}–${F.coniuge.fascia2.limite} € → importo fisso ${F.coniuge.fascia2.importo} €`,
    };
  }
  if (rc <= F.coniuge.fascia3.limite) {
    const importo = F.coniuge.fascia3.base * (F.coniuge.fascia3.limite - rc) / F.coniuge.fascia3.ampiezza;
    return {
      importo,
      formula: `${F.coniuge.fascia3.base} × (${F.coniuge.fascia3.limite} − ${rc.toFixed(2)}) / ${F.coniuge.fascia3.ampiezza} = ${importo.toFixed(2)} €`,
    };
  }
  return { importo: 0, formula: `RC > ${F.coniuge.fascia3.limite} € → nessuna detrazione` };
}

/**
 * Detrazione per i figli a carico — art. 12 c. 1 lett. c) TUIR.
 *
 * Formula base:   950 × (soglia − RC) / soglia
 * La soglia parte da 95.000 € e cresce di 15.000 € per ogni figlio oltre il primo.
 *
 * @param {number} rc            reddito complessivo del genitore
 * @param {number} figli         numero di figli a carico fra 21 e 29 anni (non disabili)
 * @param {number} figliDisabili numero di figli con disabilità (nessun limite di età)
 * @param {number} percentuale   quota spettante a QUESTO genitore: 0.5 (default) o 1
 */
export function calcolaDetrazioneFigli(rc, figli = 0, figliDisabili = 0, percentuale = 0.5) {
  const totaleFigli = figli + figliDisabili;
  if (totaleFigli === 0 || rc <= 0) {
    return { importo: 0, formula: 'nessun figlio a carico nella fascia di età prevista', soglia: F.figli.soglia };
  }

  // La soglia di azzeramento sale con il numero di figli.
  const soglia = F.figli.soglia
    + F.figli.incrementoSogliaPerFiglioOltreIlPrimo * (totaleFigli - 1);

  if (rc >= soglia) {
    return { importo: 0, formula: `RC ≥ soglia di ${soglia.toLocaleString('it-IT')} € → nessuna detrazione`, soglia };
  }

  // Maggiorazione "famiglie numerose": +200 € per OGNI figlio, se i figli sono più di 3.
  const maggiorazioneNumerosi = totaleFigli > F.figli.sogliaFamiglieNumerose
    ? F.figli.maggiorazioneFamiglieNumerose
    : 0;

  const quotaDecrescente = (soglia - rc) / soglia;

  // Figli senza disabilità
  const importoFiglioBase = (F.figli.importoBase + maggiorazioneNumerosi) * quotaDecrescente;
  // Figli con disabilità: +400 € sull'importo base prima di applicare la formula
  const importoFiglioDisabile = (F.figli.importoBase + F.figli.maggiorazioneDisabilita + maggiorazioneNumerosi) * quotaDecrescente;

  const lordo = importoFiglioBase * figli + importoFiglioDisabile * figliDisabili;
  const importo = lordo * percentuale;

  return {
    importo,
    soglia,
    formula: `${totaleFigli} figlio/i × ${F.figli.importoBase}${maggiorazioneNumerosi ? ` (+${maggiorazioneNumerosi} famiglia numerosa)` : ''}`
      + `${figliDisabili ? ` (+${F.figli.maggiorazioneDisabilita} disabilità)` : ''}`
      + ` × (${soglia.toLocaleString('it-IT')} − ${rc.toFixed(2)}) / ${soglia.toLocaleString('it-IT')}`
      + ` × ${(percentuale * 100).toFixed(0)}% = ${importo.toFixed(2)} €`,
  };
}

/**
 * Detrazione per altri familiari a carico — art. 12 c. 1 lett. d) TUIR.
 * Dal 2025 richiede la CONVIVENZA effettiva con il contribuente.
 */
export function calcolaDetrazioneAltriFamiliari(rc, numero = 0) {
  if (numero === 0 || rc <= 0 || rc >= F.altriFamiliari.soglia) {
    return {
      importo: 0,
      formula: numero === 0
        ? 'nessun altro familiare a carico'
        : `RC ≥ ${F.altriFamiliari.soglia.toLocaleString('it-IT')} € → nessuna detrazione`,
    };
  }
  const importo = numero * F.altriFamiliari.importoBase * (F.altriFamiliari.soglia - rc) / F.altriFamiliari.soglia;
  return {
    importo,
    formula: `${numero} × ${F.altriFamiliari.importoBase} × (${F.altriFamiliari.soglia} − ${rc.toFixed(2)}) / ${F.altriFamiliari.soglia} = ${importo.toFixed(2)} €`,
  };
}

/**
 * Somma delle tre voci. È questa la funzione usata dall'orchestratore.
 */
export function calcolaDetrazioniFamiliari({
  redditoComplessivo: rc,
  coniugeACarico = false,
  figliACarico = 0,
  figliDisabili = 0,
  percentualeFigli = 0.5,
  altriFamiliari = 0,
}) {
  const passi = [];

  const coniuge = coniugeACarico ? calcolaDetrazioneConiuge(rc) : { importo: 0, formula: 'coniuge non a carico' };
  if (coniugeACarico) {
    passi.push({ titolo: 'Detrazione coniuge a carico', formula: coniuge.formula, valore: coniuge.importo,
      spiegazione: 'Spetta al coniuge non legalmente ed effettivamente separato.' });
  }

  const figli = calcolaDetrazioneFigli(rc, figliACarico, figliDisabili, percentualeFigli);
  if (figliACarico + figliDisabili > 0) {
    passi.push({ titolo: 'Detrazione figli a carico', formula: figli.formula, valore: figli.importo,
      spiegazione: 'Solo per i figli fra 21 e 29 anni; sotto i 21 anni spetta invece l\'Assegno Unico (INPS), '
        + 'che non entra in questo calcolo. Per i figli con disabilità non c\'è limite di età.' });
  }

  const altri = calcolaDetrazioneAltriFamiliari(rc, altriFamiliari);
  if (altriFamiliari > 0) {
    passi.push({ titolo: 'Detrazione altri familiari conviventi', formula: altri.formula, valore: altri.importo,
      spiegazione: 'Ascendenti conviventi (genitori, nonni). Dal 2025 la convivenza effettiva è obbligatoria.' });
  }

  const totale = coniuge.importo + figli.importo + altri.importo;
  return { totale, coniuge: coniuge.importo, figli: figli.importo, altri: altri.importo, passi };
}
