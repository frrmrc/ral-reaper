# Dalla RAL al netto — calcolatore 2026

[![Anno d'imposta](https://img.shields.io/badge/anno%20d%27imposta-2026-1f6feb)](src/calcolo/parametri-2026.js)
[![Test](https://img.shields.io/badge/test-57%20passati-2ea043)](test/)
[![Dipendenze](https://img.shields.io/badge/dipendenze-0-8957e5)](package.json)
[![Build](https://img.shields.io/badge/build-nessuno-6e7681)](index.html)
[![Node](https://img.shields.io/badge/node-%E2%89%A520-339933?logo=node.js&logoColor=white)](package.json)

`irpef` · `inps` · `detrazioni` · `addizionali` · `cuneo-fiscale` · `busta-paga` · `vanilla-js`

Calcolatore web della retribuzione netta annuale e mensile a partire dalla RAL: per
ogni trattenuta mostra l'importo, il modo in cui è stato ottenuto e la norma da cui
discende. È scritto in HTML, CSS e moduli ES, quindi non ha dipendenze da installare
né un build step da eseguire.

```bash
npm run dev                # server locale su http://localhost:4173
npm test                   # 57 test sulle regole di calcolo
npm run aggiorna-aliquote  # riscarica le aliquote delle addizionali dal MEF
```

---

## Come è organizzato il calcolo

Ogni regola vive in un file suo, e quando un numero non torna l'interfaccia dice
già quale aprire: accanto a ogni voce del risultato compare il file che l'ha
prodotta.

```
src/calcolo/
├── parametri-2026.js               ← TUTTI i numeri normativi stanno qui
├── contributi-inps.js              ← 9,19% · aliquota aggiuntiva 1% · massimale
├── irpef.js                        ← scaglioni progressivi 23% / 33% / 43%
├── detrazioni-lavoro-dipendente.js ← art. 13 TUIR
├── detrazioni-familiari.js         ← art. 12 TUIR: coniuge, figli, altri familiari
├── trattamento-integrativo.js      ← ex bonus Renzi, D.L. 3/2020
├── cuneo-fiscale.js                ← L. 207/2024: somma esentasse + detrazione
├── addizionali.js                  ← regionale e comunale
├── semplificazioni.js              ← registro di ciò che NON viene modellato
└── calcola-netto.js                ← orchestratore: mette in fila i moduli sopra
```

Messi in fila, quei moduli compongono la catena che il codice esegue in
quest'ordine esatto:

```
RAL
 − contributi INPS a carico del lavoratore
 ─────────────────────────────────────────
 = reddito imponibile IRPEF (= reddito complessivo)

   IRPEF lorda per scaglioni
 − detrazione lavoro dipendente
 − detrazioni familiari a carico
 − ulteriore detrazione cuneo fiscale
 ─────────────────────────────────────────
 = IRPEF netta (mai negativa)

RAL
 − contributi INPS
 − IRPEF netta
 − addizionale regionale        ┐ dovute solo se resta IRPEF da pagare
 − addizionale comunale         ┘
 + trattamento integrativo      ┐ non sono sconti d'imposta: sono somme
 + somma integrativa cuneo      ┘ che il datore eroga in busta paga
 ─────────────────────────────────────────
 = NETTO ANNUO
```

---

## Adattabilità del calcolo a future norme

Ogni costante normativa sta in [`src/calcolo/parametri-2026.js`](src/calcolo/parametri-2026.js)
con la propria fonte accanto, così per aggiornare il calcolatore a un nuovo anno
d'imposta si modifica quel file e nient'altro.

Le aliquote delle addizionali fanno eccezione, e per una buona ragione: Regioni e
Comuni deliberano ogni anno, a volte a metà anno con effetto retroattivo, quindi
scriverle a mano significherebbe disallinearsi nel giro di poche settimane. Vengono
invece scaricate dai CSV ufficiali del Dipartimento delle Finanze:

```bash
npm run aggiorna-aliquote
```

Lo script [`strumenti/aggiorna-aliquote.mjs`](strumenti/aggiorna-aliquote.mjs)
rigenera `src/dati/aliquote-regionali-2026.js` (21 regioni) e
`src/dati/aliquote-comunali-2026.json` (7.897 comuni), e nel farlo risolve due
ambiguità che il dato grezzo si porta dietro:

1. **Delibere multiple per la stessa Regione.** Le regioni in piano di rientro
   sanitario subiscono una rideterminazione dal Commissario ad acta, che nel CSV
   appare come una seconda delibera; vince la più recente, altrimenti Puglia e
   Molise risulterebbero con aliquote troppo basse.
2. **Aliquota comunale `0*`.** Non è uno zero, significa "delibera non ancora
   pubblicata", e per il 2026 riguarda 3.954 comuni su 7.897. In quei casi lo
   script ripiega sull'aliquota dell'anno precedente e marca il dato, così
   l'interfaccia può dichiararlo all'utente invece di far finta di niente.


---

## Test

```bash
npm test
```

Sono 57 test, ciascuno con la fonte del valore atteso in commento. Accanto ai casi
puntuali presi dagli esempi dei documenti normativi, tre di essi presidiano
proprietà che devono valere sempre, a qualunque livello di reddito:

- il netto cresce in modo monotono al crescere della RAL, da 5.000 a 200.000 €;
- nessuna voce diventa negativa;
- la catena chiude: `RAL − trattenute + erogazioni = netto`.

---

## Struttura del progetto

```
index.html                  pagina unica
src/stile.css               palette e layout (tema chiaro e scuro)
src/calcolo/                le regole fiscali — un file per regola
src/dati/                   aliquote generate dai CSV ufficiali
src/ui/                     modulo, grafici SVG, formattazione, unità di misura
strumenti/                  script di aggiornamento dati e server locale
test/                       suite di test
docs/                       i documenti normativi usati come fonte
```

La separazione fra le due metà è netta di proposito: `src/ui/` non contiene nessuna
regola fiscale e `src/calcolo/` non contiene nessun riferimento al DOM, così le
regole si possono leggere, testare e riusare senza mai aprire l'interfaccia.

---

## Avvertenza

È uno strumento di stima: non sostituisce il cedolino elaborato dal consulente del
lavoro né la dichiarazione dei redditi.
