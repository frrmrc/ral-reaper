/**
 * REGISTRO DELLE SEMPLIFICAZIONI
 * ==============================
 *
 * Ogni scostamento fra questo calcolatore e una busta paga reale è elencato
 * qui, con il suo impatto stimato. L'interfaccia legge questo elenco e lo
 * mostra all'utente: nessuna semplificazione resta implicita nel codice.
 *
 * Se implementi una di queste regole, cancella la voce da questo file.
 *
 * impatto:
 *   'alto'  → può spostare il netto di centinaia di euro l'anno
 *   'medio' → decine di euro l'anno, o casi specifici
 *   'basso' → differenze marginali o casi rari
 *
 * tipo:
 *   'semplificazione' → regola reale che abbiamo scelto di non modellare
 *   'divergenza-fonti' → i documenti in /docs si contraddicono: abbiamo scelto
 */

export const SEMPLIFICAZIONI = [
  {
    id: 'ral-uguale-imponibile',
    tipo: 'semplificazione',
    impatto: 'alto',
    titolo: 'La RAL è trattata come imponibile pieno, previdenziale e fiscale',
    descrizione:
      "Si assume che tutta la RAL sia soggetta a contributi e a IRPEF. In una busta paga "
      + "reale l'imponibile previdenziale e quello fiscale differiscono dalla RAL per: fringe "
      + "benefit, welfare aziendale, premi di produttività a tassazione sostitutiva al 10%, "
      + "rimborsi spese e trasferte, buoni pasto entro le soglie di esenzione.",
    modulo: 'contributi-inps.js, irpef.js',
  },
  {
    id: 'mensilizzazione-uniforme',
    tipo: 'semplificazione',
    impatto: 'medio',
    titolo: 'Le mensilità sono considerate tutte uguali',
    descrizione:
      "La RAL viene divisa in mensilità di pari importo. In realtà la tredicesima e la "
      + "quattordicesima si concentrano in singoli mesi: questo può far scattare l'aliquota "
      + "aggiuntiva INPS dell'1% in quei mesi anche per chi, su base annua, resta sotto la "
      + "prima fascia. Il conguaglio di fine anno riallinea comunque il totale annuo, che è "
      + "ciò che questo calcolatore mostra.",
    modulo: 'contributi-inps.js',
  },
  {
    id: 'reddito-complessivo-solo-lavoro',
    tipo: 'semplificazione',
    impatto: 'alto',
    titolo: 'Un solo rapporto di lavoro, nessun altro reddito',
    descrizione:
      "Il reddito complessivo usato per detrazioni, trattamento integrativo e cuneo fiscale "
      + "coincide con RAL − contributi. Non sono considerati: altri redditi (locazioni, cedolare "
      + "secca, partita IVA forfettaria), oneri deducibili (contributi previdenza complementare, "
      + "assegno al coniuge), né un secondo rapporto di lavoro nello stesso anno.",
    modulo: 'calcola-netto.js',
  },
  {
    id: 'oneri-detraibili-esclusi',
    tipo: 'semplificazione',
    impatto: 'alto',
    titolo: 'Nessun onere detraibile oltre quelli da lavoro e famiglia',
    descrizione:
      "Non sono considerate le detrazioni per spese sanitarie, interessi su mutui, "
      + "ristrutturazioni, erogazioni liberali, previdenza complementare. Questo incide due "
      + "volte: sull'IRPEF netta e sul test del trattamento integrativo nella fascia "
      + "15.000–28.000 €, dove proprio queste voci determinano se il bonus spetta.",
    modulo: 'calcola-netto.js, trattamento-integrativo.js',
  },
  {
    id: 'addizionali-a-regime',
    tipo: 'semplificazione',
    impatto: 'medio',
    titolo: 'Addizionali calcolate "a regime", non come in busta paga',
    descrizione:
      "Le aliquote dell'anno corrente sono applicate al reddito dell'anno corrente. In busta "
      + "paga le addizionali si trattengono in gran parte l'anno SUCCESSIVO (la regionale a "
      + "saldo in 11 rate da gennaio a novembre, la comunale in acconto più saldo). Il netto "
      + "mensile reale oscilla quindi durante l'anno, e a dicembre è più alto.",
    modulo: 'addizionali.js',
  },
  {
    id: 'addizionali-regionali-progressive',
    tipo: 'semplificazione',
    impatto: 'medio',
    titolo: 'Agevolazioni regionali in testo libero non applicate',
    descrizione:
      "Le fasce regionali sono applicate per scaglioni progressivi, come l'IRPEF. Alcune "
      + "Regioni però deliberano regole descritte solo a parole nel CSV del MEF e non "
      + "codificate nelle fasce: per esempio il Lazio applica l'1,73% sull'INTERO imponibile "
      + "fino a 28.000 € e concede una detrazione di 60 € fra 28.001 e 30.000 €. Queste regole "
      + "non sono automatizzabili dal dato strutturato: il testo integrale della delibera è "
      + "mostrato nell'interfaccia perché tu possa verificarlo.",
    modulo: 'addizionali.js',
  },
  {
    id: 'cuneo-somma-integrativa',
    tipo: 'divergenza-fonti',
    impatto: 'alto',
    titolo: 'La somma integrativa del cuneo è erogata, non dedotta',
    descrizione:
      "I documenti in /docs la descrivono in due modi diversi: 'quota esclusa dal reddito' e "
      + "'somma esentasse'. Qui è implementata come importo EROGATO IN AGGIUNTA al netto, "
      + "coerentemente con il testo della norma ('è riconosciuta una somma, che non concorre "
      + "alla formazione del reddito'). Trattarla come riduzione dell'imponibile darebbe un "
      + "netto diverso.",
    modulo: 'cuneo-fiscale.js',
    fonte: 'L. 207/2024 art. 1 c. 4',
  },
  {
    id: 'irpef-secondo-scaglione',
    tipo: 'divergenza-fonti',
    impatto: 'alto',
    titolo: 'Seconda aliquota IRPEF al 33%, non al 35%',
    descrizione:
      "docs/aliquote-irpef.md indica 33% per lo scaglione 28.000–50.000 €; "
      + "docs/Trattamento_Integrativo_IRPEF_ex_Bonus_Renzi.md §5 indica 35%. Si è scelto il "
      + "33%, perché proviene dalla pagina dell'Agenzia delle Entrate dedicata alle aliquote "
      + "2026. Su una RAL di 50.000 € la differenza vale circa 400 € l'anno.",
    modulo: 'parametri-2026.js',
  },
  {
    id: 'trattamento-integrativo-fascia-intermedia',
    tipo: 'divergenza-fonti',
    impatto: 'alto',
    titolo: 'Fascia 15.000–28.000 €: seguito il testo della norma, non la tabella di esempio',
    descrizione:
      "Il documento sul trattamento integrativo si contraddice: il §4.2 definisce il bonus "
      + "come 'detrazioni − imposta lorda', spettante solo se le detrazioni superano "
      + "l'imposta; la tabella del §6 calcola invece 'imposta lorda − detrazioni' e attribuisce "
      + "1.200 € a chi ha 20.000 € di reddito. Vale il §4.2, conforme all'art. 1 c. 1 del "
      + "D.L. 3/2020. Conseguenza pratica: con la sola detrazione da lavoro dipendente, in "
      + "questa fascia il trattamento integrativo NON spetta. Spetta se altre detrazioni "
      + "(familiari, mutuo, spese sanitarie) superano l'imposta lorda.",
    modulo: 'trattamento-integrativo.js',
  },
  {
    id: 'detrazioni-test-trattamento',
    tipo: 'semplificazione',
    impatto: 'medio',
    titolo: "L'ulteriore detrazione del cuneo non entra nel test del trattamento integrativo",
    descrizione:
      "Nel confronto detrazioni/imposta lorda della fascia 15.000–28.000 € entrano la "
      + "detrazione da lavoro dipendente e quelle per familiari a carico, elencate dalla "
      + "Circolare 4/E/2022. L'ulteriore detrazione da cuneo fiscale, introdotta dopo da una "
      + "norma diversa, è esclusa. Sopra i 20.000 € questa scelta può cambiare l'esito.",
    modulo: 'calcola-netto.js',
  },
  {
    id: 'familiari-anno-intero',
    tipo: 'semplificazione',
    impatto: 'basso',
    titolo: 'Familiari a carico per tutti i 12 mesi',
    descrizione:
      "Le detrazioni per familiari si rapportano ai MESI in cui esiste il carico. Qui si "
      + "assume l'intero anno. Anche i correttivi da 10 a 30 € previsti per il coniuge nelle "
      + "fasce strette fra 29.000 e 35.000 € non sono applicati.",
    modulo: 'detrazioni-familiari.js',
  },
  {
    id: 'aliquota-aggiuntiva-apprendisti',
    tipo: 'semplificazione',
    impatto: 'basso',
    titolo: "L'aliquota aggiuntiva 1% è applicata anche agli apprendisti",
    descrizione:
      "L'art. 3-ter del D.L. 384/1992 la prevede per tutte le aliquote a carico del lavoratore "
      + "inferiori al 10%, e il 5,84% dell'apprendista lo è. Il caso è comunque raro: serve una "
      + "retribuzione da apprendista superiore a 56.224 € l'anno.",
    modulo: 'contributi-inps.js',
  },
  {
    id: 'tfr-escluso',
    tipo: 'semplificazione',
    impatto: 'basso',
    titolo: 'Il TFR non entra nel calcolo',
    descrizione:
      "Il trattamento di fine rapporto matura ogni anno (circa RAL/13,5) ma non viene "
      + "corrisposto in busta paga: è accantonato e tassato separatamente alla cessazione. "
      + "Per questo non compare né fra le trattenute né nel netto.",
    modulo: 'calcola-netto.js',
  },
  {
    id: 'nessun-conguaglio-mensile',
    tipo: 'semplificazione',
    impatto: 'basso',
    titolo: 'Calcolo annuale, non simulazione del cedolino mese per mese',
    descrizione:
      "Il netto mensile mostrato è il netto annuo diviso per il numero di mensilità. Un "
      + "cedolino reale varia di mese in mese per conguagli, ratei di addizionali e "
      + "distribuzione delle detrazioni.",
    modulo: 'calcola-netto.js',
  },
];

/** Voci che spostano il risultato in modo rilevante: l'interfaccia le evidenzia. */
export const SEMPLIFICAZIONI_RILEVANTI = SEMPLIFICAZIONI.filter((s) => s.impatto === 'alto');

/** Le contraddizioni fra i documenti di partenza, risolte esplicitamente. */
export const DIVERGENZE_FONTI = SEMPLIFICAZIONI.filter((s) => s.tipo === 'divergenza-fonti');
