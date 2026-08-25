/**
 * DETRAZIONE PER LAVORO DIPENDENTE (art. 13 c. 1 TUIR)
 * ====================================================
 *
 * Non riduce il reddito imponibile: si sottrae direttamente dall'IMPOSTA LORDA.
 * È decrescente al crescere del reddito e si azzera oltre 50.000 €.
 *
 *      IRPEF lorda − detrazioni = IRPEF netta
 *
 * Attenzione: la detrazione è "a scalino" fra le fasce, quindi la formula
 * cambia in tre punti (15.000, 28.000 e 50.000 €).
 *
 * Fonte: docs/Detrazioni_Lavoro_Dipendente_e_Familiari_a_Carico_Guida_2026.md §2-3
 */

import { DETRAZIONE_LAVORO_DIPENDENTE as D } from './parametri-2026.js';

/**
 * @param {object}  input
 * @param {number}  input.redditoComplessivo  RC = RAL − contributi INPS
 * @param {number}  input.giorniLavorati      giorni di lavoro nell'anno (anno pieno = 365)
 * @param {boolean} input.tempoDeterminato    cambia solo il minimo garantito della prima fascia
 * @returns {{totale:number, base:number, correttivo:number, passi:Array}}
 */
export function calcolaDetrazioneLavoroDipendente({
  redditoComplessivo: rc,
  giorniLavorati = D.giorniAnnoPieno,
  tempoDeterminato = false,
}) {
  const passi = [];
  const proporzioneGiorni = giorniLavorati / D.giorniAnnoPieno;

  // --- Passo 1: importo teorico della fascia di reddito -------------------
  let teorica = 0;
  let formula = '';

  if (rc <= 0) {
    formula = 'reddito nullo → nessuna detrazione';
  } else if (rc <= D.fascia1.limite) {
    teorica = D.fascia1.importo;
    formula = `RC ≤ ${D.fascia1.limite} € → importo fisso ${D.fascia1.importo} €`;
  } else if (rc <= D.fascia2.limite) {
    teorica = D.fascia2.base + D.fascia2.quotaVariabile * (D.fascia2.limite - rc) / D.fascia2.ampiezza;
    formula = `${D.fascia2.base} + ${D.fascia2.quotaVariabile} × (${D.fascia2.limite} − ${rc.toFixed(2)}) / ${D.fascia2.ampiezza} = ${teorica.toFixed(2)} €`;
  } else if (rc <= D.fascia3.limite) {
    teorica = D.fascia3.base * (D.fascia3.limite - rc) / D.fascia3.ampiezza;
    formula = `${D.fascia3.base} × (${D.fascia3.limite} − ${rc.toFixed(2)}) / ${D.fascia3.ampiezza} = ${teorica.toFixed(2)} €`;
  } else {
    teorica = 0;
    formula = `RC > ${D.fascia3.limite} € → la detrazione si azzera`;
  }

  passi.push({
    titolo: 'Detrazione teorica di fascia',
    formula,
    spiegazione: 'L\'importo dipende dalla fascia in cui cade il reddito complessivo.',
    valore: teorica,
  });

  // --- Passo 2: ragguaglio ai giorni di lavoro ----------------------------
  // Ferie, malattia, maternità e permessi retribuiti CONTANO come giorni lavorati;
  // l'aspettativa non retribuita no.
  let base = teorica * proporzioneGiorni;

  if (giorniLavorati !== D.giorniAnnoPieno) {
    passi.push({
      titolo: 'Ragguaglio al periodo di lavoro',
      formula: `${teorica.toFixed(2)} × ${giorniLavorati}/${D.giorniAnnoPieno} = ${base.toFixed(2)} €`,
      spiegazione: 'La detrazione base è proporzionale ai giorni di lavoro nell\'anno.',
      valore: base,
    });
  }

  // --- Passo 3: minimo garantito (solo prima fascia) ----------------------
  if (rc > 0 && rc <= D.fascia1.limite) {
    const minimo = tempoDeterminato
      ? D.fascia1.minimoTempoDeterminato
      : D.fascia1.minimoTempoIndeterminato;

    if (base < minimo) {
      passi.push({
        titolo: 'Minimo garantito',
        formula: `max(${base.toFixed(2)} ; ${minimo}) = ${minimo} €`,
        spiegazione: `Nella fascia fino a ${D.fascia1.limite} € la detrazione non può scendere sotto `
          + `${minimo} € (contratto a tempo ${tempoDeterminato ? 'determinato' : 'indeterminato'}).`,
        valore: minimo,
      });
      base = minimo;
    }
  }

  // --- Passo 4: correttivo fisso di 65 € ---------------------------------
  // Spetta PER INTERO se il reddito è nella fascia: non si ragguaglia ai giorni.
  let correttivo = 0;
  if (rc > D.correttivo.da && rc <= D.correttivo.a) {
    correttivo = D.correttivo.importo;
    passi.push({
      titolo: 'Correttivo di 65 €',
      formula: `+ ${D.correttivo.importo} €`,
      spiegazione: `Spetta per i redditi fra ${D.correttivo.da} € e ${D.correttivo.a} €, `
        + 'per intero e senza ragguaglio ai giorni lavorati.',
      valore: correttivo,
    });
  }

  const totale = base + correttivo;
  return { totale, base, correttivo, passi };
}
