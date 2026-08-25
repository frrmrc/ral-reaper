### Documentazione tecnica per l'interfaccia di calcolo — Agosto 2026

---

## 1. Collocazione nel flusso di calcolo

Le addizionali si applicano **per ultime**, sulla stessa base imponibile dell'IRPEF nazionale — **non sulla RAL** e **non sull'imponibile previdenziale**.

```
RAL
 − Contributi previdenziali a carico del lavoratore (INPS)
 ────────────────────────────────────────────────────
 = Reddito imponibile IRPEF (base comune anche per le addizionali)
 − IRPEF lorda (scaglioni nazionali) − Detrazioni spettanti
 ────────────────────────────────────────────────────
 = IRPEF netta
 − Addizionale regionale IRPEF   (aliquota regione × imponibile IRPEF)
 − Addizionale comunale IRPEF    (aliquota comune × imponibile IRPEF)
 ────────────────────────────────────────────────────
 = NETTO
```

Le due addizionali sono **tributi distinti**, dovuti a enti diversi, con aliquote decise autonomamente da ciascuna Regione e da ciascun Comune. Entrambe sono dovute **solo se per lo stesso anno risulta dovuta l'IRPEF** (reddito imponibile > 0, al netto delle detrazioni).

---

## 2. Addizionale regionale IRPEF

| | |
|---|---|
| **Base normativa** | Art. 50, D.Lgs. 15 dicembre 1997, n. 446 |
| **Ente beneficiario** | Regione (o Provincia autonoma) di domicilio fiscale al 1° gennaio dell'anno di riferimento |
| **Base di calcolo** | Reddito complessivo IRPEF, al netto degli oneri deducibili |
| **Range aliquote 2026** | indicativamente tra 0,70% e ~2,0-2,3% a seconda della regione |
| **Struttura** | aliquota unica oppure progressiva per scaglioni di reddito (replica gli scaglioni IRPEF); alcune regioni prevedono detrazioni fisse (es. per figli a carico) |
| **Trattenuta in busta paga** | a saldo, nell'anno **successivo** a quello di competenza, in 11 rate mensili (gennaio–novembre) |

< cite index="6-1">Le regioni italiane possono fissare liberamente l'aliquota tra un minimo dello 0,00% e un massimo del 3,33%, e in pratica oscillano tra lo 0,70% e il 2,25%</cite>, con le regioni dai bilanci più in difficoltà che tendono ad applicare aliquote più alte. Esempio concreto verificato direttamente sul portale ufficiale: per il Lazio, < cite index="10-1">per i redditi imponibili non superiori a 28.000 euro l'aliquota è pari all'1,73% (legge regionale n. 20 del 31 dicembre 2025), con una detrazione di 60 euro per i redditi tra 28.001 e 30.000 euro</cite>.

< cite index="1-1">L'addizionale regionale a saldo viene trattenuta sulla pensione/busta paga l'anno successivo a quello cui si riferisce, suddivisa in 11 rate da gennaio a novembre</cite> — quindi l'addizionale sul reddito 2025 viene versata da gennaio a novembre 2026.

### Fonte dati ufficiale (integrabile via codice)

- Ricerca interattiva per regione: `https://www1.finanze.gov.it/finanze2/dipartimentopolitichefiscali/fiscalitalocale/addregirpef/sceltaregione.htm`
- **CSV ufficiale, aggiornato quotidianamente**, un file per anno:
  `https://www1.finanze.gov.it/finanze2/dipartimentopolitichefiscali/fiscalitalocale/addregirpef/download/download.php?tipo=reg&anno=AAAA`
  (sostituire `AAAA` con l'anno d'imposta, es. `2026`)

### Codici regione ufficiali (per costruire URL o filtrare il CSV)

| Cod. | Regione | Cod. | Regione |
|---|---|---|---|
| 01 | Abruzzo | 12 | Molise |
| 02 | Basilicata | 13 | Piemonte |
| 03 | Bolzano | 14 | Puglia |
| 04 | Calabria | 15 | Sardegna |
| 05 | Campania | 16 | Sicilia |
| 06 | Emilia Romagna | 17 | Toscana |
| 07 | Friuli Venezia Giulia | 18 | Trento |
| 08 | Lazio | 19 | Umbria |
| 09 | Liguria | 20 | Valle d'Aosta |
| 10 | Lombardia | 21 | Veneto |
| 11 | Marche | | |

---

## 3. Addizionale comunale IRPEF

| | |
|---|---|
| **Base normativa** | D.Lgs. 28 settembre 1998, n. 360 |
| **Ente beneficiario** | Comune di domicilio fiscale al 1° gennaio dell'anno di riferimento |
| **Base di calcolo** | Reddito complessivo IRPEF (stessa base della regionale) |
| **Aliquota massima** | < cite index="5-1">0,8%, elevabile allo 0,9% per i comuni capoluogo di provincia</cite> |
| **Struttura** | aliquota unica, oppure scaglioni progressivi, oppure nessuna addizionale; < cite index="5-1">molti capoluoghi si fermano allo 0,50%-0,60%</cite> |
| **Soglie di esenzione** | facoltative, decise dal singolo Comune per i redditi più bassi |
| **Trattenuta in busta paga** | **acconto** (di norma 30% dell'addizionale, calcolato sull'aliquota dell'anno precedente, trattenuto nell'anno di competenza) + **saldo** (l'anno successivo), entrambi rateizzati |

Questa è la componente **più variabile**: ogni Comune italiano (oltre 7.900) delibera autonomamente ogni anno. Non esiste quindi una singola aliquota nazionale da poter fissare nel codice: va sempre risolta per Comune di domicilio fiscale del dipendente.

### Fonte dati ufficiale (integrabile via codice)

- Ricerca interattiva per Comune/Regione: `https://www1.finanze.gov.it/finanze2/dipartimentopolitichefiscali/fiscalitalocale/nuova_addcomirpef/sceltaregione.htm`
- **CSV ufficiale, aggiornato quotidianamente**, un file per anno:
  `https://www1.finanze.gov.it/finanze2/dipartimentopolitichefiscali/fiscalitalocale/nuova_addcomirpef/download/download.php?anno=AAAA`

< cite index="45-1">Il CSV riporta, per colonna: codice catastale del comune, denominazione, provincia, numero e data della delibera, data di pubblicazione, eventuali note, e se il comune applica aliquota unica o multialiquota, seguite dalla misura dell'esenzione e delle aliquote deliberate</cite>. < cite index="44-1">Se per l'anno in corso il Comune non ha ancora pubblicato la delibera, il campo riporta la dicitura "0*"</cite> — da gestire esplicitamente nel parsing (non è un'aliquota reale, è un valore segnaposto).

---

## 4. Esenzioni comuni a entrambe le addizionali

Da escludere dal calcolo (aliquota = 0) nei seguenti casi:

- reddito imponibile IRPEF pari a zero, o IRPEF azzerata dalle detrazioni spettanti;
- < cite index="14-1">contribuenti in regime forfettario, che pagano un'imposta sostitutiva e sono esclusi dal campo di applicazione delle addizionali</cite>;
- residenza in un Comune/Regione con soglia di esenzione superiore al reddito del contribuente (dato specifico, presente nel CSV comunale e nella pagina regionale).

---

## 5. Nota importante sul timing: netto "a regime" vs netto "in busta paga"

Le addizionali si **calcolano** sul reddito dell'anno X ma vengono **trattenute** in gran parte nell'anno X+1 (regionale a saldo, comunale acconto+saldo). < cite index="6-1">L'addizionale regionale sull'anno 2025 viene pagata in busta da gennaio a novembre 2026; a dicembre, non essendoci trattenuta, il netto risulta tipicamente più alto</cite>.

Questo ha un'implicazione diretta per l'interfaccia:

- **Simulatore "a regime" (uso più comune)**: applica le aliquote dell'anno corrente al reddito dell'anno corrente, per stimare il netto annuo "a regime" — è la semplificazione usata dalla maggior parte dei calcolatori di stipendio netto ed è adatta per confronti (es. "quanto netto avrei con RAL X nella regione Y").
- **Simulatore "cedolino reale"**: se l'obiettivo è riprodurre fedelmente l'andamento mese per mese, serve modellare separatamente acconto (anno corrente) e saldo (anno successivo), con le rispettive aliquote di riferimento — più complesso, utile solo se l'interfaccia deve simulare il cedolino mensile e non solo il netto annuo.

Va scelto esplicitamente quale dei due modelli implementare, perché cambiano sia la formula sia i dati da recuperare (aliquota anno corrente vs aliquota anno precedente).

---

## 6. Indicazioni pratiche per l'implementazione

1. **Non hardcodare le aliquote nel codice.** Regioni e Comuni deliberano ogni anno (a volte anche a metà anno con effetto retroattivo); un valore fisso si disallinea rapidamente.
2. **Sincronizzazione consigliata**: job periodico (giornaliero o settimanale, dato che il CSV si aggiorna quotidianamente) che scarica i due CSV ufficiali e aggiorna una tabella interna, con anno come chiave.
3. **Parsing CSV**: separatore `;`, gestire l'encoding e il valore segnaposto `0*` per le delibere comunali non ancora pubblicate (fallback: aliquota dell'anno precedente o 0, a scelta del prodotto).
4. **Chiave di lookup**: il CSV comunale usa il **codice catastale del Comune**, non il CAP — utile prevedere una tabella di mapping CAP/Comune → codice catastale se l'input utente è il CAP o il nome del Comune.
5. **Versionamento per anno**: mantenere lo storico (`anno=2025`, `anno=2026`, ecc.) se l'interfaccia deve calcolare anche saldi di anni precedenti.
6. **Validazione**: prevedere un fallback esplicito (es. messaggio "aliquota non ancora deliberata per l'anno corrente, uso l'aliquota N-1") invece di trattare `0*` come aliquota zero reale.

---

## 7. Fonti ufficiali consultate

| Fonte | Contenuto | URL |
|---|---|---|
| Dipartimento delle Finanze (MEF) | Ricerca aliquote addizionale regionale | `https://www1.finanze.gov.it/finanze2/dipartimentopolitichefiscali/fiscalitalocale/addregirpef/sceltaregione.htm` |
| Dipartimento delle Finanze (MEF) | CSV ufficiale addizionale regionale, per anno | `https://www1.finanze.gov.it/finanze2/dipartimentopolitichefiscali/fiscalitalocale/addregirpef/download/download.php?tipo=reg&anno=AAAA` |
| Dipartimento delle Finanze (MEF) | Ricerca aliquote addizionale comunale | `https://www1.finanze.gov.it/finanze2/dipartimentopolitichefiscali/fiscalitalocale/nuova_addcomirpef/sceltaregione.htm` |
| Dipartimento delle Finanze (MEF) | CSV ufficiale addizionale comunale, per anno | `https://www1.finanze.gov.it/finanze2/dipartimentopolitichefiscali/fiscalitalocale/nuova_addcomirpef/download/download.php?anno=AAAA` |
| Dipartimento delle Finanze (MEF) | Disciplina generale e normativa | `https://www.finanze.gov.it/it/fiscalita/fiscalita-regionale-e-locale/` |
| Normattiva | Testi vigenti D.Lgs. 446/1997 e D.Lgs. 360/1998 | `https://www.normattiva.it` |
| INPS | Meccanismo di trattenuta (rif. pensioni, logica identica per i dipendenti) | `https://www.inps.it/it/it/dettaglio-approfondimento.schede-informative.53546.pensioni-addizionali-irpef-regionali-e-comunali.html` |

---

## 8. Disclaimer

Documento a scopo tecnico/informativo per la progettazione dell'interfaccia. Le aliquote citate come esempio sono indicative e riferite al periodo in cui è stata redatta questa documentazione (agosto 2026): **prima del rilascio in produzione, l'interfaccia deve recuperare i dati direttamente dai CSV ufficiali** sopra indicati, non dai valori riportati come esempio in questo documento. Per l'inquadramento normativo di casi specifici (regimi particolari, redditi misti, cambi di residenza in corso d'anno) si raccomanda la verifica con un consulente del lavoro o commercialista.