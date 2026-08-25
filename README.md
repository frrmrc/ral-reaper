# Dalla RAL al netto — calcolatore 2026

Calcolatore web della retribuzione netta annuale e mensile a partire dalla RAL,
con il dettaglio di ogni trattenuta e il riferimento normativo di ogni regola.

Nessuna dipendenza, nessun build step: HTML, CSS e moduli ES.

```bash
npm run dev                # server locale su http://localhost:4173
npm test                   # 50 test sulle regole di calcolo
npm run aggiorna-aliquote  # riscarica le aliquote delle addizionali dal MEF
```

---

## Come è organizzato il calcolo

Ogni regola vive in un file suo. Se un numero non torna, il file da aprire è
indicato nell'interfaccia accanto a ogni voce del risultato.

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

La catena, nell'ordine esatto in cui il codice la esegue:

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

Due punti che sfuggono spesso:

- **Le detrazioni non riducono il reddito, riducono l'imposta.** E non possono
  generare un credito: al massimo azzerano l'IRPEF.
- **Trattamento integrativo e cuneo fiscale hanno segno positivo.** Non sono
  detrazioni: sono soldi che entrano nel netto.

---

## I numeri non sono sparsi nel codice

Ogni costante normativa sta in [`src/calcolo/parametri-2026.js`](src/calcolo/parametri-2026.js),
con la propria fonte accanto. Per aggiornare il calcolatore a un nuovo anno si
modifica quel file e nient'altro.

Le aliquote delle addizionali fanno eccezione, e per una buona ragione: Regioni
e Comuni deliberano ogni anno, a volte a metà anno con effetto retroattivo.
Scriverle a mano significa disallinearsi in poche settimane. Vengono quindi
scaricate dai CSV ufficiali del Dipartimento delle Finanze:

```bash
npm run aggiorna-aliquote
```

Lo script [`strumenti/aggiorna-aliquote.mjs`](strumenti/aggiorna-aliquote.mjs)
rigenera `src/dati/aliquote-regionali-2026.js` (21 regioni) e
`src/dati/aliquote-comunali-2026.json` (7.897 comuni), gestendo due casi che il
dato grezzo non risolve da solo:

1. **Delibere multiple per la stessa Regione.** Le regioni in piano di rientro
   sanitario subiscono una rideterminazione dal Commissario ad acta, che nel CSV
   appare come una seconda delibera. Vince la più recente — altrimenti Puglia e
   Molise risulterebbero con aliquote troppo basse.
2. **Aliquota comunale `0*`.** Non è uno zero: significa "delibera non ancora
   pubblicata". Per il 2026, 3.954 comuni su 7.897 sono in questa condizione.
   Lo script ripiega sull'aliquota dell'anno precedente e marca il dato, così
   l'interfaccia può dichiararlo all'utente.

---

## Le semplificazioni sono dichiarate, non nascoste

[`src/calcolo/semplificazioni.js`](src/calcolo/semplificazioni.js) elenca ogni
scostamento dalla busta paga reale, con l'impatto stimato. L'interfaccia legge
quel file e lo mostra in fondo alla pagina: **se implementi una di quelle regole,
cancella la voce dal file** e sparisce anche dal sito.

Il registro comprende anche tre punti in cui i documenti di partenza in
[`docs/`](docs/) si contraddicono e ho dovuto scegliere:

| Punto | Documenti | Scelta |
|---|---|---|
| Seconda aliquota IRPEF | `aliquote-irpef.md` dice 33%, il documento sul trattamento integrativo dice 35% | **33%** — fonte specifica dell'Agenzia delle Entrate sulle aliquote 2026 |
| Trattamento integrativo fra 15.000 e 28.000 € | il §4.2 definisce `detrazioni − imposta lorda`, la tabella del §6 calcola l'inverso | **il §4.2**, conforme all'art. 1 c. 1 del D.L. 3/2020 |
| Somma integrativa del cuneo | descritta sia come "quota esclusa dal reddito" sia come "somma esentasse" | **somma erogata in aggiunta al netto**, come dice il testo della L. 207/2024 |

La seconda scelta ha una conseguenza pratica controintuitiva: con la sola
detrazione da lavoro dipendente, fra 15.000 e 28.000 € il trattamento integrativo
**non spetta**. Spetta solo se altre detrazioni (familiari a carico, mutuo, spese
sanitarie) superano l'imposta lorda. È il comportamento corretto secondo la norma,
ed è quello che si osserva nelle buste paga reali.

---

## Test

```bash
npm test
```

50 test, ciascuno con la fonte del valore atteso in commento. Oltre ai casi
puntuali presi dagli esempi dei documenti, tre test presidiano proprietà che
devono valere sempre:

- il netto cresce in modo monotono al crescere della RAL, da 5.000 a 200.000 €;
- nessuna voce diventa negativa a nessun livello di reddito;
- la catena chiude: `RAL − trattenute + erogazioni = netto`.

---

## Struttura del progetto

```
index.html                  pagina unica
src/stile.css               palette e layout (tema chiaro e scuro)
src/calcolo/                le regole fiscali — un file per regola
src/dati/                   aliquote generate dai CSV ufficiali
src/ui/                     modulo, grafici SVG, formattazione
strumenti/                  script di aggiornamento dati e server locale
test/                       suite di test
docs/                       i documenti normativi usati come fonte
```

`src/ui/` non contiene nessuna regola fiscale, `src/calcolo/` non contiene
nessun riferimento al DOM. La separazione è netta di proposito: le regole si
possono leggere, testare e riusare senza aprire l'interfaccia.

---

## Avvertenza

Strumento di stima. Non sostituisce il cedolino elaborato dal consulente del
lavoro né la dichiarazione dei redditi.
