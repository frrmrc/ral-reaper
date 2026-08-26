/**
 * TEST DELLE REGOLE DI CALCOLO
 * ============================
 *
 * Eseguire con:  npm test
 *
 * Ogni test cita la fonte del valore atteso. Dove il valore viene da un
 * esempio numerico presente in /docs, il commento lo indica: così, se una
 * regola cambia, si sa subito quale documento riverificare.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { calcolaContributiInps } from '../src/calcolo/contributi-inps.js';
import { calcolaIrpefLorda } from '../src/calcolo/irpef.js';
import { calcolaDetrazioneLavoroDipendente } from '../src/calcolo/detrazioni-lavoro-dipendente.js';
import { calcolaDetrazioniFamiliari } from '../src/calcolo/detrazioni-familiari.js';
import { calcolaTrattamentoIntegrativo } from '../src/calcolo/trattamento-integrativo.js';
import { calcolaSommaIntegrativaCuneo, calcolaUlterioreDetrazioneCuneo } from '../src/calcolo/cuneo-fiscale.js';
import { applicaFasceProgressive, calcolaAddizionaleComunale, calcolaAddizionaleRegionale } from '../src/calcolo/addizionali.js';
import { calcolaNetto } from '../src/calcolo/calcola-netto.js';
import { SEMPLIFICAZIONI } from '../src/calcolo/semplificazioni.js';

/** Confronto con tolleranza di un centesimo. */
const vicino = (ottenuto, atteso, tolleranza = 0.01) =>
  assert.ok(
    Math.abs(ottenuto - atteso) <= tolleranza,
    `atteso ${atteso}, ottenuto ${ottenuto} (differenza ${Math.abs(ottenuto - atteso).toFixed(4)})`
  );

/* ------------------------------------------------------------------ */
describe('Contributi INPS', () => {
  test('aliquota ordinaria 9,19% sotto la prima fascia', () => {
    // docs/inps.md §1
    vicino(calcolaContributiInps({ ral: 35000 }).totale, 35000 * 0.0919);
  });

  test('aliquota aggiuntiva 1% oltre la prima fascia di 56.224 €', () => {
    // docs/inps.md §2
    const atteso = 80000 * 0.0919 + (80000 - 56224) * 0.01;
    vicino(calcolaContributiInps({ ral: 80000 }).totale, atteso);
  });

  test('nessun contributo sulla parte oltre il massimale di 122.295 €', () => {
    // docs/inps.md §3
    const a = calcolaContributiInps({ ral: 122295 }).totale;
    const b = calcolaContributiInps({ ral: 200000 }).totale;
    vicino(a, b);
    assert.equal(calcolaContributiInps({ ral: 200000 }).imponibile, 122295);
  });

  test('apprendista: 5,84%', () => {
    // docs/inps.md §5
    vicino(calcolaContributiInps({ ral: 25000, apprendista: true }).totale, 25000 * 0.0584);
  });

  test('RAL zero non produce contributi', () => {
    vicino(calcolaContributiInps({ ral: 0 }).totale, 0);
  });
});

/* ------------------------------------------------------------------ */
describe('IRPEF lorda', () => {
  test('primo scaglione: 23%', () => {
    vicino(calcolaIrpefLorda(20000).totale, 20000 * 0.23);
  });

  test('esattamente al confine dei 28.000 €', () => {
    vicino(calcolaIrpefLorda(28000).totale, 28000 * 0.23);
  });

  test('secondo scaglione: progressione, non aliquota unica', () => {
    // 28.000 × 23% + 12.000 × 33% = 6.440 + 3.960
    vicino(calcolaIrpefLorda(40000).totale, 6440 + 3960);
  });

  test('terzo scaglione: 43% sulla sola eccedenza oltre 50.000 €', () => {
    // 6.440 + 22.000 × 33% + 20.000 × 43%
    vicino(calcolaIrpefLorda(70000).totale, 6440 + 7260 + 8600);
  });

  test('aliquota marginale e media sono diverse', () => {
    const r = calcolaIrpefLorda(40000);
    assert.equal(r.aliquotaMarginale, 0.33);
    assert.ok(r.aliquotaMedia < 0.33, 'la media deve restare sotto la marginale');
  });
});

/* ------------------------------------------------------------------ */
describe('Detrazione lavoro dipendente', () => {
  test('RC 22.000 € → circa 2.459 €', () => {
    // Esempio in docs/Detrazioni_Lavoro_Dipendente_..._2026.md §5
    vicino(calcolaDetrazioneLavoroDipendente({ redditoComplessivo: 22000 }).totale, 2459.23, 0.5);
  });

  test('RC ≤ 15.000 € → 1.955 € pieni per l\'anno intero', () => {
    vicino(calcolaDetrazioneLavoroDipendente({ redditoComplessivo: 14000 }).totale, 1955);
  });

  test('minimo garantito di 690 € per anno parziale', () => {
    // 1.955 × 60/365 = 321,37 → sale al minimo di 690 €
    vicino(calcolaDetrazioneLavoroDipendente({ redditoComplessivo: 10000, giorniLavorati: 60 }).totale, 690);
  });

  test('minimo garantito più alto per il tempo determinato', () => {
    const r = calcolaDetrazioneLavoroDipendente({
      redditoComplessivo: 10000, giorniLavorati: 60, tempoDeterminato: true,
    });
    vicino(r.totale, 1380);
  });

  test('correttivo di 65 € solo fra 25.001 e 35.000 €', () => {
    assert.equal(calcolaDetrazioneLavoroDipendente({ redditoComplessivo: 24000 }).correttivo, 0);
    assert.equal(calcolaDetrazioneLavoroDipendente({ redditoComplessivo: 30000 }).correttivo, 65);
    assert.equal(calcolaDetrazioneLavoroDipendente({ redditoComplessivo: 36000 }).correttivo, 0);
  });

  test('oltre 50.000 € la detrazione si azzera', () => {
    vicino(calcolaDetrazioneLavoroDipendente({ redditoComplessivo: 55000 }).totale, 0);
  });
});

/* ------------------------------------------------------------------ */
describe('Detrazioni familiari', () => {
  test('esempio del documento: RC 30.000 €, un figlio e coniuge a carico', () => {
    // docs/Detrazioni_Lavoro_Dipendente_..._2026.md §12 → 650 € + 690 €
    const r = calcolaDetrazioniFamiliari({
      redditoComplessivo: 30000, coniugeACarico: true, figliACarico: 1, percentualeFigli: 1,
    });
    vicino(r.figli, 650, 1);
    vicino(r.coniuge, 690);
  });

  test('la ripartizione al 50% dimezza la detrazione per i figli', () => {
    const intera = calcolaDetrazioniFamiliari({ redditoComplessivo: 30000, figliACarico: 1, percentualeFigli: 1 });
    const meta = calcolaDetrazioniFamiliari({ redditoComplessivo: 30000, figliACarico: 1, percentualeFigli: 0.5 });
    vicino(meta.figli, intera.figli / 2);
  });

  test('la soglia sale di 15.000 € per ogni figlio oltre il primo', () => {
    // Con 2 figli la soglia diventa 110.000 €: a RC 100.000 la detrazione esiste ancora
    const uno = calcolaDetrazioniFamiliari({ redditoComplessivo: 100000, figliACarico: 1, percentualeFigli: 1 });
    const due = calcolaDetrazioniFamiliari({ redditoComplessivo: 100000, figliACarico: 2, percentualeFigli: 1 });
    vicino(uno.figli, 0);
    assert.ok(due.figli > 0, 'con due figli la soglia sale a 110.000 €');
  });

  test('maggiorazione di 400 € per figlio con disabilità', () => {
    const senza = calcolaDetrazioniFamiliari({ redditoComplessivo: 30000, figliACarico: 1, percentualeFigli: 1 });
    const con = calcolaDetrazioniFamiliari({ redditoComplessivo: 30000, figliDisabili: 1, percentualeFigli: 1 });
    assert.ok(con.figli > senza.figli);
    vicino(con.figli - senza.figli, 400 * (95000 - 30000) / 95000, 0.5);
  });

  test('altri familiari: nessuna detrazione oltre 80.000 €', () => {
    vicino(calcolaDetrazioniFamiliari({ redditoComplessivo: 85000, altriFamiliari: 1 }).altri, 0);
  });
});

/* ------------------------------------------------------------------ */
describe('Trattamento integrativo', () => {
  test('incapiente sotto i 15.000 €: nessun bonus', () => {
    // docs/Trattamento_Integrativo... §6, riga RC 8.000 €
    const r = calcolaTrattamentoIntegrativo({
      redditoComplessivo: 8000, irpefLorda: 1840, detrazioniTotali: 1955,
    });
    vicino(r.totale, 0);
    assert.equal(r.testSuperato, false);
  });

  test('capiente sotto i 15.000 €: bonus pieno da 1.200 €', () => {
    // docs/Trattamento_Integrativo... §6, riga RC 13.000 €
    const r = calcolaTrattamentoIntegrativo({
      redditoComplessivo: 13000, irpefLorda: 2990, detrazioniTotali: 1955,
    });
    vicino(r.totale, 1200);
  });

  test('la soglia del test è 1.955 − 75 = 1.880 €', () => {
    const sotto = calcolaTrattamentoIntegrativo({ redditoComplessivo: 10000, irpefLorda: 1879, detrazioniTotali: 1955 });
    const sopra = calcolaTrattamentoIntegrativo({ redditoComplessivo: 10000, irpefLorda: 1881, detrazioniTotali: 1955 });
    vicino(sotto.totale, 0);
    vicino(sopra.totale, 1200);
  });

  test('fascia 15.000-28.000 €: spetta solo se le detrazioni superano l\'imposta lorda', () => {
    // Applichiamo il §4.2 del documento e l'art. 1 c. 1 D.L. 3/2020,
    // NON la tabella del §6 che inverte la sottrazione.
    // Vedi semplificazioni.js → 'trattamento-integrativo-fascia-intermedia'.
    const senzaCapienza = calcolaTrattamentoIntegrativo({
      redditoComplessivo: 16000, irpefLorda: 3680, detrazioniTotali: 3008.46,
    });
    vicino(senzaCapienza.totale, 0);

    const conCapienza = calcolaTrattamentoIntegrativo({
      redditoComplessivo: 16000, irpefLorda: 3000, detrazioniTotali: 3500,
    });
    vicino(conCapienza.totale, 500);
  });

  test('fascia intermedia: il bonus non supera 1.200 €', () => {
    const r = calcolaTrattamentoIntegrativo({
      redditoComplessivo: 20000, irpefLorda: 1000, detrazioniTotali: 5000,
    });
    vicino(r.totale, 1200);
  });

  test('oltre 28.000 € nessun trattamento integrativo', () => {
    const r = calcolaTrattamentoIntegrativo({
      redditoComplessivo: 28001, irpefLorda: 6000, detrazioniTotali: 9000,
    });
    vicino(r.totale, 0);
  });

  test('l\'importo si rapporta ai giorni di lavoro', () => {
    const r = calcolaTrattamentoIntegrativo({
      redditoComplessivo: 13000, irpefLorda: 2990, detrazioniTotali: 1955, giorniLavorati: 182,
    });
    vicino(r.totale, 1200 * 182 / 365);
  });
});

/* ------------------------------------------------------------------ */
describe('Cuneo fiscale', () => {
  test('somma integrativa: 7,1% fino a 8.500 €', () => {
    vicino(calcolaSommaIntegrativaCuneo({ redditoComplessivo: 8000 }).totale, 8000 * 0.071);
  });

  test('somma integrativa: 5,3% fra 8.500 e 15.000 €', () => {
    vicino(calcolaSommaIntegrativaCuneo({ redditoComplessivo: 12000 }).totale, 12000 * 0.053);
  });

  test('somma integrativa: 4,8% fra 15.000 e 20.000 €', () => {
    vicino(calcolaSommaIntegrativaCuneo({ redditoComplessivo: 18000 }).totale, 18000 * 0.048);
  });

  test('somma integrativa: nulla oltre 20.000 €', () => {
    vicino(calcolaSommaIntegrativaCuneo({ redditoComplessivo: 20001 }).totale, 0);
  });

  test('ulteriore detrazione: 1.000 € pieni fra 20.000 e 32.000 €', () => {
    vicino(calcolaUlterioreDetrazioneCuneo({ redditoComplessivo: 25000 }).totale, 1000);
  });

  test('ulteriore detrazione: decresce linearmente fino a 40.000 €', () => {
    vicino(calcolaUlterioreDetrazioneCuneo({ redditoComplessivo: 36000 }).totale, 500);
    vicino(calcolaUlterioreDetrazioneCuneo({ redditoComplessivo: 40000 }).totale, 0);
    vicino(calcolaUlterioreDetrazioneCuneo({ redditoComplessivo: 41000 }).totale, 0);
  });

  test('le due misure non si sovrappongono mai', () => {
    for (const rc of [5000, 12000, 19000, 21000, 30000, 38000, 45000]) {
      const somma = calcolaSommaIntegrativaCuneo({ redditoComplessivo: rc }).totale;
      const detrazione = calcolaUlterioreDetrazioneCuneo({ redditoComplessivo: rc }).totale;
      assert.ok(somma === 0 || detrazione === 0, `a RC ${rc} sono attive entrambe`);
    }
  });
});

/* ------------------------------------------------------------------ */
describe('Addizionali', () => {
  const regioneProgressiva = {
    nome: 'Test', delibera: 1, dataPubblicazione: '01-GEN-26', disposizione: '',
    fasce: [
      { da: 0, a: 15000, aliquota: 1.23 },
      { da: 15000, a: 28000, aliquota: 1.58 },
      { da: 28000, a: null, aliquota: 1.73 },
    ],
  };

  test('le fasce si applicano per scaglioni, non sull\'intero reddito', () => {
    const r = applicaFasceProgressive(30000, regioneProgressiva.fasce);
    const atteso = 15000 * 0.0123 + 13000 * 0.0158 + 2000 * 0.0173;
    vicino(r.totale, atteso);
  });

  test('nessuna addizionale se l\'IRPEF è azzerata dalle detrazioni', () => {
    const r = calcolaAddizionaleRegionale({ imponibile: 20000, regione: regioneProgressiva, irpefDovuta: false });
    vicino(r.totale, 0);
  });

  test('la soglia di esenzione comunale è una soglia, non una franchigia', () => {
    const comune = { nome: 'Test', provincia: 'XX', esenzione: 15000, annoDato: 2026,
      fasce: [{ da: 0, a: null, aliquota: 0.8 }] };

    vicino(calcolaAddizionaleComunale({ imponibile: 15000, comune }).totale, 0);
    // Superata la soglia si paga sull'INTERO imponibile, non sull'eccedenza
    vicino(calcolaAddizionaleComunale({ imponibile: 15001, comune }).totale, 15001 * 0.008);
  });

  test('comune senza addizionale deliberata', () => {
    const comune = { nome: 'Test', provincia: 'XX', esenzione: 0, fasce: [], annoDato: 2026 };
    vicino(calcolaAddizionaleComunale({ imponibile: 30000, comune }).totale, 0);
  });
});

/* ------------------------------------------------------------------ */
describe('Calcolo completo', () => {
  const regione = {
    nome: 'Lombardia', delibera: 1, dataPubblicazione: '01-GEN-26', disposizione: '',
    fasce: [{ da: 0, a: 15000, aliquota: 1.23 }, { da: 15000, a: 28000, aliquota: 1.58 },
            { da: 28000, a: 50000, aliquota: 1.72 }, { da: 50000, a: null, aliquota: 1.73 }],
  };
  const comune = { nome: 'Milano', provincia: 'MI', esenzione: 23000, annoDato: 2025,
    fasce: [{ da: 0, a: null, aliquota: 0.8 }] };

  test('la catena chiude: RAL − trattenute + erogazioni = netto', () => {
    const r = calcolaNetto({ ral: 40000, regione, comune });
    vicino(r.nettoAnnuo, r.ral - r.totaleTrattenute + r.totaleErogazioni);
    vicino(r.totaleTrattenute,
      r.contributiInps + r.irpefNetta + r.addizionaleRegionale + r.addizionaleComunale);
  });

  test('l\'imponibile IRPEF è la RAL al netto dei contributi', () => {
    const r = calcolaNetto({ ral: 40000, regione, comune });
    vicino(r.imponibile, r.ral - r.contributiInps);
  });

  test('il netto cresce sempre al crescere della RAL', () => {
    let precedente = -Infinity;
    for (let ral = 5000; ral <= 200000; ral += 1000) {
      const r = calcolaNetto({ ral, regione, comune });
      assert.ok(r.nettoAnnuo > precedente,
        `il netto scende passando a RAL ${ral}: ${r.nettoAnnuo.toFixed(2)} dopo ${precedente.toFixed(2)}`);
      precedente = r.nettoAnnuo;
    }
  });

  test('nessuna voce diventa negativa, a nessun livello di reddito', () => {
    for (let ral = 0; ral <= 250000; ral += 2500) {
      const r = calcolaNetto({ ral, regione, comune });
      for (const [voce, valore] of Object.entries({
        contributiInps: r.contributiInps, irpefLorda: r.irpefLorda, irpefNetta: r.irpefNetta,
        addizionaleRegionale: r.addizionaleRegionale, addizionaleComunale: r.addizionaleComunale,
        trattamentoIntegrativo: r.trattamentoIntegrativo, sommaCuneo: r.sommaCuneo,
        nettoAnnuo: r.nettoAnnuo,
      })) {
        assert.ok(valore >= 0, `${voce} negativo a RAL ${ral}: ${valore}`);
      }
    }
  });

  test('il netto non supera mai la RAL più le somme erogate', () => {
    for (let ral = 1000; ral <= 200000; ral += 5000) {
      const r = calcolaNetto({ ral, regione, comune });
      assert.ok(r.nettoAnnuo <= ral + r.totaleErogazioni + 0.01, `a RAL ${ral}`);
    }
  });

  test('RAL zero produce un risultato tutto a zero', () => {
    const r = calcolaNetto({ ral: 0, regione, comune });
    vicino(r.nettoAnnuo, 0);
    vicino(r.totaleTrattenute, 0);
  });

  test('i familiari a carico aumentano il netto', () => {
    const senza = calcolaNetto({ ral: 40000, regione, comune });
    const con = calcolaNetto({ ral: 40000, regione, comune, coniugeACarico: true, figliACarico: 2 });
    assert.ok(con.nettoAnnuo > senza.nettoAnnuo);
  });

  test('l\'apprendista ha più netto a parità di RAL', () => {
    const ordinario = calcolaNetto({ ral: 25000, regione, comune });
    const apprendista = calcolaNetto({ ral: 25000, regione, comune, apprendista: true });
    assert.ok(apprendista.contributiInps < ordinario.contributiInps);
    assert.ok(apprendista.nettoAnnuo > ordinario.nettoAnnuo);
  });

  test('il netto mensile riflette il numero di mensilità', () => {
    const a = calcolaNetto({ ral: 36000, mensilita: 12, regione, comune });
    const b = calcolaNetto({ ral: 36000, mensilita: 14, regione, comune });
    vicino(a.nettoAnnuo, b.nettoAnnuo);           // il netto annuo non cambia
    assert.ok(b.nettoMensile < a.nettoMensile);   // ma spalmato su più mensilità
    vicino(b.nettoMensile, b.nettoAnnuo / 14);
  });
});

/* ------------------------------------------------------------------ */
describe('Registro delle semplificazioni', () => {
  test('ogni voce è completa e utilizzabile dall\'interfaccia', () => {
    for (const s of SEMPLIFICAZIONI) {
      assert.ok(s.id && s.titolo && s.descrizione, `voce incompleta: ${s.id}`);
      assert.ok(['alto', 'medio', 'basso'].includes(s.impatto), `impatto non valido in ${s.id}`);
      assert.equal(s.tipo, 'semplificazione', `tipo non valido in ${s.id}`);
    }
  });

  test('gli identificativi sono unici', () => {
    const id = SEMPLIFICAZIONI.map((s) => s.id);
    assert.equal(new Set(id).size, id.length);
  });
});
