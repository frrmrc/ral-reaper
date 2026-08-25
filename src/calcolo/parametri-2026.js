/**
 * PARAMETRI FISCALI E CONTRIBUTIVI — ANNO D'IMPOSTA 2026
 * =======================================================
 *
 * Questo è l'UNICO file in cui compaiono numeri normativi.
 * Tutti i moduli di calcolo importano da qui: se una legge cambia,
 * si modifica questo file e nient'altro.
 *
 * Ogni blocco riporta la propria fonte in un campo `fonte`.
 * I documenti integrali sono in /docs.
 */

export const ANNO = 2026;

/* ------------------------------------------------------------------ *
 * 1. IRPEF — scaglioni e aliquote (art. 11 TUIR)
 * ------------------------------------------------------------------ */
export const IRPEF = {
  // Ogni scaglione tassa SOLO la parte di reddito compresa fra `da` e `fino`.
  scaglioni: [
    { da: 0,     fino: 28000,    aliquota: 0.23 },
    { da: 28000, fino: 50000,    aliquota: 0.33 },
    { da: 50000, fino: Infinity, aliquota: 0.43 },
  ],
  fonte: 'Agenzia delle Entrate — Aliquote e calcolo dell’IRPEF 2026. Vedi docs/aliquote-irpef.md',
  // ATTENZIONE: docs/Trattamento_Integrativo_IRPEF_ex_Bonus_Renzi.md §5 indica 35%
  // per il secondo scaglione. Prevale docs/aliquote-irpef.md (fonte specifica 2026).
  // Vedi semplificazioni.js → 'irpef-secondo-scaglione'.
};

/* ------------------------------------------------------------------ *
 * 2. INPS — contributi a carico del LAVORATORE (FPLD / AGO)
 * ------------------------------------------------------------------ */
export const INPS = {
  aliquotaLavoratore: 0.0919,          // 9,19% — quota lavoratore del 33% IVS
  aliquotaApprendista: 0.0584,         // 5,84% — per tutta la durata dell'apprendistato

  // Aliquota aggiuntiva 1% sulla quota di retribuzione MENSILE eccedente la soglia.
  // Si applica solo quando l'aliquota a carico del lavoratore è inferiore al 10%.
  aliquotaAggiuntiva: 0.01,
  sogliaMensileAliquotaAggiuntiva: 4685.00,   // prima fascia mensilizzata 2026
  primaFasciaAnnua: 56224.00,                 // valore annuo della stessa fascia

  // Oltre il massimale annuo non è dovuta alcuna contribuzione.
  massimaleAnnuo: 122295.00,

  fonte: 'Circolare INPS n. 6 del 30-01-2026 (§5 fascia 1%, §6 massimale); '
       + 'Circolare INPS n. 40 del 22-02-2011 (ripartizione 23,81% + 9,19%); '
       + 'Circolare INPS n. 108 del 14-11-2018 §3.3 (apprendisti). Vedi docs/inps.md',
};

/* ------------------------------------------------------------------ *
 * 3. Detrazione per lavoro dipendente (art. 13 c. 1 TUIR)
 * ------------------------------------------------------------------ */
export const DETRAZIONE_LAVORO_DIPENDENTE = {
  // Fascia 1 — reddito complessivo fino a 15.000 €
  fascia1: {
    limite: 15000,
    importo: 1955,
    minimoTempoIndeterminato: 690,
    minimoTempoDeterminato: 1380,
  },
  // Fascia 2 — da 15.001 a 28.000 €:  1.910 + 1.190 × (28.000 − RC) / 13.000
  fascia2: { limite: 28000, base: 1910, quotaVariabile: 1190, ampiezza: 13000 },
  // Fascia 3 — da 28.001 a 50.000 €:  1.910 × (50.000 − RC) / 22.000
  fascia3: { limite: 50000, base: 1910, ampiezza: 22000 },
  // Oltre 50.000 € la detrazione è zero.

  // Correttivo fisso, NON ragguagliato ai giorni di lavoro.
  correttivo: { importo: 65, da: 25000, a: 35000 },

  giorniAnnoPieno: 365,

  fonte: 'Art. 13 c. 1 TUIR (DPR 917/1986), come modificato da D.Lgs. 216/2023 e '
       + 'L. 207/2024. Vedi docs/Detrazioni_Lavoro_Dipendente_e_Familiari_a_Carico_Guida_2026.md §2-3',
};

/* ------------------------------------------------------------------ *
 * 4. Trattamento integrativo (ex "bonus Renzi") — D.L. 3/2020 art. 1
 * ------------------------------------------------------------------ */
export const TRATTAMENTO_INTEGRATIVO = {
  importoMassimo: 1200,
  sogliaBassa: 15000,      // sotto: bonus pieno se supera il test di capienza
  sogliaAlta: 28000,       // sopra: nessun bonus
  detrazioneRiferimento: 1955,   // art. 13 c. 1 lett. a) TUIR
  correttivo: 75,                // il "−75 €" reso strutturale dalla L. 207/2024
  // Soglia effettiva del test di capienza: 1.955 − 75 = 1.880 €
  fonte: 'D.L. 3/2020 art. 1 (conv. L. 21/2020); L. 207/2024 art. 1 c. 2 lett. b) e c. 3; '
       + 'Circolare AdE 4/E del 16-05-2025. Vedi docs/Trattamento_Integrativo_IRPEF_ex_Bonus_Renzi.md',
};

/* ------------------------------------------------------------------ *
 * 5. Taglio del cuneo fiscale — L. 207/2024 art. 1 c. 4-9 (strutturale)
 * ------------------------------------------------------------------ */
export const CUNEO_FISCALE = {
  // 5a) Somma integrativa: percentuale del reddito di lavoro dipendente,
  //     erogata esentasse (non concorre al reddito imponibile).
  sommaIntegrativa: [
    { fino: 8500,  percentuale: 0.071 },
    { fino: 15000, percentuale: 0.053 },
    { fino: 20000, percentuale: 0.048 },
  ],
  // 5b) Ulteriore detrazione dall'imposta lorda, per redditi oltre 20.000 €.
  ulterioreDetrazione: {
    da: 20000,
    importoPieno: 1000,
    finoAPieno: 32000,   // fino a 32.000 € spetta l'intero importo
    azzeramento: 40000,  // fra 32.000 e 40.000 decresce linearmente fino a 0
  },
  fonte: 'L. 207/2024 art. 1 commi 4-9 (resi strutturali). Vedi '
       + 'docs/Trattamento_Integrativo_IRPEF_ex_Bonus_Renzi.md §9 e '
       + 'docs/Detrazioni_Lavoro_Dipendente_e_Familiari_a_Carico_Guida_2026.md §4',
};

/* ------------------------------------------------------------------ *
 * 6. Detrazioni per familiari a carico (art. 12 TUIR)
 * ------------------------------------------------------------------ */
export const DETRAZIONI_FAMILIARI = {
  coniuge: {
    // Fino a 15.000 €:  800 − 110 × (RC / 15.000)
    fascia1: { limite: 15000, base: 800, sottrazione: 110 },
    // Da 15.001 a 40.000 €: importo fisso
    fascia2: { limite: 40000, importo: 690 },
    // Da 40.001 a 80.000 €:  690 × (80.000 − RC) / 40.000
    fascia3: { limite: 80000, base: 690, ampiezza: 40000 },
  },
  figli: {
    // Spetta solo per i figli fra 21 e 29 anni compiuti (sotto i 21 c'è l'Assegno Unico).
    etaMinima: 21,
    etaMassima: 29,
    importoBase: 950,
    soglia: 95000,
    incrementoSogliaPerFiglioOltreIlPrimo: 15000,
    maggiorazioneDisabilita: 400,      // nessun limite di età per i figli con disabilità
    maggiorazioneFamiglieNumerose: 200, // per ciascun figlio, se più di 3 figli a carico
    sogliaFamiglieNumerose: 3,
  },
  altriFamiliari: {
    // Richiede convivenza effettiva (D.Lgs. 192/2025).
    importoBase: 750,
    soglia: 80000,
  },
  // Mesi dell'anno: le detrazioni familiari si ragguagliano a MESE, non a giorno.
  mesiAnno: 12,
  fonte: 'Art. 12 TUIR; L. 207/2024 (abolizione figli 30+ non disabili); '
       + 'D.Lgs. 192/2025 (convivenza per altri familiari). Vedi '
       + 'docs/Detrazioni_Lavoro_Dipendente_e_Familiari_a_Carico_Guida_2026.md Parte II',
};
