# Fonti normative

I documenti usati per implementare le regole di calcolo. Sono la base di
riferimento durante lo sviluppo: ogni modulo in `src/calcolo/` cita, nel proprio
commento di intestazione, quale di questi file lo fonda.

| Documento | Cosa fonda | Modulo che lo usa |
|---|---|---|
| [`aliquote-irpef.md`](aliquote-irpef.md) | Scaglioni e aliquote IRPEF 2026 | `irpef.js` |
| [`Aliquote_contributive_INPS_Gestione_generale_FPLD_AGO_2026.md`](Aliquote_contributive_INPS_Gestione_generale_FPLD_AGO_2026.md) | Aliquota 9,19%, fascia dell'1%, massimale, apprendisti | `contributi-inps.js` |
| [`inps.md`](inps.md) | **Duplicato** del documento qui sopra, contenuto identico | — |
| [`Detrazioni_Lavoro_Dipendente_e_Familiari_a_Carico_Guida_2026.md`](Detrazioni_Lavoro_Dipendente_e_Familiari_a_Carico_Guida_2026.md) | Artt. 12 e 13 TUIR | `detrazioni-lavoro-dipendente.js`, `detrazioni-familiari.js` |
| [`Trattamento_Integrativo_IRPEF_ex_Bonus_Renzi.md`](Trattamento_Integrativo_IRPEF_ex_Bonus_Renzi.md) | D.L. 3/2020 e taglio del cuneo fiscale | `trattamento-integrativo.js`, `cuneo-fiscale.js` |
| [`Addizionali_IRPEF_da_sottrarre_nel_calcolo_Netto_da_RAL.md`](Addizionali_IRPEF_da_sottrarre_nel_calcolo_Netto_da_RAL.md) | Addizionali regionale e comunale, CSV ufficiali MEF | `addizionali.js`, `strumenti/aggiorna-aliquote.mjs` |
| [`inquadramento-aziende-inps.md`](inquadramento-aziende-inps.md) | Classificazione dei datori di lavoro (CSC, codici di autorizzazione) | **nessuno** — riguarda la posizione contributiva dell'azienda, non la quota a carico del lavoratore |

## Contraddizioni fra i documenti

Tre punti in cui le fonti non concordano. La scelta adottata è registrata in
`src/calcolo/semplificazioni.js` con tipo `divergenza-fonti`, ed è visibile
nella pagina del calcolatore.

1. **Seconda aliquota IRPEF.** `aliquote-irpef.md` indica 33% per lo scaglione
   28.000–50.000 €; `Trattamento_Integrativo_IRPEF_ex_Bonus_Renzi.md` §5 indica
   35%. Adottato il 33%.

2. **Trattamento integrativo nella fascia 15.000–28.000 €.**
   `Trattamento_Integrativo_IRPEF_ex_Bonus_Renzi.md` si contraddice al proprio
   interno: il §4.2 definisce il bonus come `detrazioni − imposta lorda`
   spettante solo se le detrazioni superano l'imposta, mentre la tabella del §6
   calcola `imposta lorda − detrazioni`. Adottato il §4.2, conforme all'art. 1
   c. 1 del D.L. 3/2020.

3. **Somma integrativa del cuneo fiscale.**
   `Detrazioni_Lavoro_Dipendente_..._2026.md` §4 la descrive come "quota esclusa
   dal reddito"; `Trattamento_Integrativo_..._Renzi.md` §9 come "somma
   esentasse". Adottata la seconda lettura: importo erogato in aggiunta al netto.

## Aggiornare le fonti

Se sostituisci uno di questi documenti con una versione più recente, i punti da
riverificare sono i valori in `src/calcolo/parametri-2026.js` e i test in
`test/calcolo.test.js`, dove ogni valore atteso cita in commento il documento e
il paragrafo da cui proviene.
