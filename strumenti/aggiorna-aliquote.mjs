/**
 * GENERATORE DEI DATASET DELLE ADDIZIONALI IRPEF
 * ==============================================
 *
 * Scarica i due CSV ufficiali del Dipartimento delle Finanze (MEF) e produce
 * i file di dati usati dal calcolatore:
 *
 *   src/dati/aliquote-regionali-<anno>.js     (21 regioni e province autonome)
 *   src/dati/aliquote-comunali-<anno>.json    (~7.900 comuni)
 *
 * Uso:   node strumenti/aggiorna-aliquote.mjs [anno]
 *        npm run aggiorna-aliquote
 *
 * Perché uno script e non valori scritti a mano nel codice: Regioni e Comuni
 * deliberano ogni anno, a volte a metà anno con effetto retroattivo. Un valore
 * fisso nel sorgente si disallinea in poche settimane.
 * (docs/Addizionali_IRPEF_da_sottrarre_nel_calcolo_Netto_da_RAL.md §6.1)
 *
 * DUE REGOLE NON OVVIE, implementate qui sotto:
 *
 *  1. Delibere multiple per la stessa Regione → vince la più recente.
 *     Alcune regioni in piano di rientro sanitario subiscono una
 *     rideterminazione delle aliquote da parte del Commissario ad acta, che
 *     compare come una SECONDA delibera nello stesso CSV (es. Puglia e Molise
 *     nel 2026). Prendere la prima riga darebbe aliquote troppo basse.
 *
 *  2. Aliquota comunale "0*" → il Comune non ha ancora deliberato per l'anno.
 *     Non è uno zero reale: si ripiega sull'aliquota dell'anno precedente e si
 *     marca il dato come tale (campo `annoDato`), così l'interfaccia può dirlo
 *     all'utente. (§6.6 dello stesso documento)
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RADICE = join(dirname(fileURLToPath(import.meta.url)), '..');

const URL_REGIONALE = (anno) =>
  `https://www1.finanze.gov.it/finanze2/dipartimentopolitichefiscali/fiscalitalocale/addregirpef/download/download.php?tipo=reg&anno=${anno}`;
const URL_COMUNALE = (anno) =>
  `https://www1.finanze.gov.it/finanze2/dipartimentopolitichefiscali/fiscalitalocale/nuova_addcomirpef/download/download.php?anno=${anno}`;

/* ------------------------------------------------------------------ *
 * Utilità di parsing
 * ------------------------------------------------------------------ */

/** I CSV del MEF sono in latin-1 con separatore ";" e campi eventualmente fra virgolette. */
async function scaricaCsv(url) {
  const risposta = await fetch(url);
  if (!risposta.ok) throw new Error(`HTTP ${risposta.status} su ${url}`);
  const bytes = Buffer.from(await risposta.arrayBuffer());
  return leggiCsv(bytes.toString('latin1'));
}

function leggiCsv(testo) {
  const righe = [];
  let campo = '';
  let riga = [];
  let dentroVirgolette = false;

  for (let i = 0; i < testo.length; i++) {
    const c = testo[i];

    if (dentroVirgolette) {
      if (c === '"' && testo[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') dentroVirgolette = false;
      else campo += c;
      continue;
    }

    if (c === '"') dentroVirgolette = true;
    else if (c === ';') { riga.push(campo); campo = ''; }
    else if (c === '\n') { riga.push(campo); righe.push(riga); riga = []; campo = ''; }
    else if (c !== '\r') campo += c;
  }
  if (campo || riga.length) { riga.push(campo); righe.push(riga); }

  const intestazione = righe.shift().map((h) => h.trim());
  return righe
    .filter((r) => r.length >= intestazione.length)
    .map((r) => Object.fromEntries(intestazione.map((h, i) => [h, (r[i] ?? '').trim()])));
}

/**
 * Converte l'aliquota testuale del MEF in numero.
 * I due CSV usano convenzioni diverse: "1.23" (regionale) e "0,8" o ",8" (comunale).
 */
function leggiAliquota(testo) {
  if (!testo) return null;
  const pulito = testo.trim();
  if (pulito === '0*' || pulito === '') return null;   // delibera non pubblicata
  const normalizzato = pulito.replace(',', '.').replace(/^\./, '0.');
  const numero = Number(normalizzato);
  return Number.isFinite(numero) ? numero : null;
}

/**
 * Converte in numero un importo scritto nel testo delle fasce.
 *
 * I due CSV usano convenzioni OPPOSTE per il punto, e vanno distinte:
 *   regionale:  "15000.00 euro"      → il punto è il separatore DECIMALE
 *   comunale:   "euro 15.000,00"     → il punto separa le MIGLIAIA
 *
 * Regola: se c'è una virgola, è lei il separatore decimale e i punti sono
 * migliaia. Altrimenti un punto seguito da 1-2 cifre è decimale (i gruppi
 * delle migliaia sono sempre di 3 cifre), e in ogni altro caso è migliaia.
 */
function numeroDaTesto(testo) {
  if (testo.includes(',')) return Number(testo.replace(/\./g, '').replace(',', '.'));
  if (/^\d+\.\d{1,2}$/.test(testo)) return Number(testo);
  return Number(testo.replace(/\./g, ''));
}

/** Estrae tutti gli importi presenti in una descrizione di fascia. */
function leggiImporti(testo) {
  return [...testo.matchAll(/(\d[\d.]*(?:,\d+)?)/g)]
    .map((m) => numeroDaTesto(m[1]))
    .filter(Number.isFinite);
}

/**
 * Interpreta la descrizione della fascia e restituisce l'intervallo [da, a].
 * Formati usati dal MEF:
 *   "Aliquota unica"                                        → tutto il reddito
 *   "fino a 15000.00 euro"                                  → [0, 15000]
 *   "oltre 15000.00 e fino a 28000.00 euro"                 → [15000, 28000]
 *   "oltre 50000.00 euro"                                   → [50000, ∞)
 *   "Applicabile a scaglione di reddito fino a euro 15.000,00"
 *   "Applicabile a scaglione di reddito da euro 15.000,01 fino a euro 28.000,00"
 *   "Applicabile a scaglione di reddito oltre euro 50.000,00"
 */
function leggiFascia(testo) {
  const t = (testo || '').toLowerCase();
  if (!t || t.includes('unica')) return { da: 0, a: null };

  const numeri = leggiImporti(t);
  const haOltre = t.includes('oltre') || t.includes('da euro');
  const haFinoA = t.includes('fino a');

  if (haOltre && haFinoA && numeri.length >= 2) {
    // "da euro 15.000,01 fino a euro 28.000,00" → arrotondiamo l'estremo inferiore
    return { da: Math.floor(numeri[0]), a: numeri[1] };
  }
  if (haOltre && numeri.length >= 1) return { da: Math.floor(numeri[0]), a: null };
  if (haFinoA && numeri.length >= 1) return { da: 0, a: numeri[0] };
  return { da: 0, a: null };
}

/* ------------------------------------------------------------------ *
 * Addizionale REGIONALE
 * ------------------------------------------------------------------ */

const NOMI_REGIONE = {
  "REGIONE VALLE D'AOSTA": "Valle d'Aosta",
  'REGIONE PIEMONTE': 'Piemonte',
  'REGIONE LOMBARDIA': 'Lombardia',
  'PROVINCIA AUTONOMA DI BOLZANO': 'Bolzano (Prov. aut.)',
  'PROVINCIA AUTONOMA DI TRENTO': 'Trento (Prov. aut.)',
  'REGIONE VENETO': 'Veneto',
  'REGIONE FRIULI VENEZIA GIULIA': 'Friuli-Venezia Giulia',
  'REGIONE LIGURIA': 'Liguria',
  'REGIONE EMILIA-ROMAGNA': 'Emilia-Romagna',
  'REGIONE TOSCANA': 'Toscana',
  'REGIONE UMBRIA': 'Umbria',
  'REGIONE MARCHE': 'Marche',
  'REGIONE LAZIO': 'Lazio',
  'REGIONE ABRUZZO': 'Abruzzo',
  'REGIONE MOLISE': 'Molise',
  'REGIONE CAMPANIA': 'Campania',
  'REGIONE PUGLIA': 'Puglia',
  'REGIONE BASILICATA': 'Basilicata',
  'REGIONE CALABRIA': 'Calabria',
  'REGIONE SICILIA': 'Sicilia',
  'REGIONE SARDEGNA': 'Sardegna',
};

function costruisciRegioni(righe) {
  // Raggruppa per regione e poi per delibera.
  const perRegione = new Map();

  for (const r of righe) {
    const nomeCsv = r.REGIONE;
    if (!nomeCsv) continue;
    if (!perRegione.has(nomeCsv)) perRegione.set(nomeCsv, new Map());
    const delibere = perRegione.get(nomeCsv);
    const id = r.NUMERO || '0';
    if (!delibere.has(id)) {
      delibere.set(id, { numero: Number(id) || 0, data: r['DATA PUBBLICAZIONE'], disposizione: r.DISPOSIZIONE, note: r.NOTE, fasce: [] });
    }
    const aliquota = leggiAliquota(r.ALIQUOTA);
    if (aliquota !== null) {
      delibere.get(id).fasce.push({ ...leggiFascia(r['FASCIA '] ?? r.FASCIA), aliquota });
    }
  }

  const regioni = [];
  for (const [nomeCsv, delibere] of perRegione) {
    // REGOLA 1: vince la delibera con il numero più alto (la più recente).
    const scelta = [...delibere.values()].sort((a, b) => b.numero - a.numero)[0];
    if (!scelta || scelta.fasce.length === 0) continue;

    regioni.push({
      nome: NOMI_REGIONE[nomeCsv] ?? nomeCsv,
      nomeUfficiale: nomeCsv,
      delibera: scelta.numero,
      dataPubblicazione: scelta.data,
      // ordinate per estremo inferiore crescente
      fasce: scelta.fasce.sort((a, b) => a.da - b.da),
      disposizione: (scelta.disposizione || '').replace(/\s+/g, ' ').trim(),
    });
  }

  return regioni.sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
}

/* ------------------------------------------------------------------ *
 * Addizionale COMUNALE
 * ------------------------------------------------------------------ */

function leggiComune(r) {
  const fasce = [];

  // La soglia di esenzione compare in due posti e non sempre negli stessi:
  //   - la colonna IMPORTO_ESENTE
  //   - una riga con aliquota 0 e fascia "Esenzione per redditi ... fino a euro X"
  // Torino 2025, per esempio, ha IMPORTO_ESENTE = 0 ma dichiara 11.790 € nel testo.
  // Prendiamo il valore più alto fra i due.
  let esenzione = Number((r.IMPORTO_ESENTE || '0').replace(',', '.')) || 0;

  // Il CSV comunale ha fino a 12 coppie ALIQUOTA_n / FASCIA_n.
  for (let n = 1; n <= 12; n++) {
    const chiaveAliquota = n === 1 ? 'ALIQUOTA' : `ALIQUOTA_${n}`;
    const chiaveFascia = n === 1 ? 'FASCIA' : `FASCIA_${n}`;
    const testoAliquota = r[chiaveAliquota];
    const testoFascia = r[chiaveFascia] || '';

    if (testoAliquota === undefined || testoAliquota === '') continue;

    if (testoFascia.toLowerCase().includes('esenzione')) {
      const importi = leggiImporti(testoFascia);
      if (importi.length) esenzione = Math.max(esenzione, importi[0]);
      continue;                              // non è una fascia di tassazione
    }

    const aliquota = leggiAliquota(testoAliquota);
    if (aliquota === null) continue;         // "0*": delibera non pubblicata
    fasce.push({ ...leggiFascia(testoFascia), aliquota });
  }

  const nonDeliberata = (r.ALIQUOTA || '').trim() === '0*';
  return {
    nome: r.COMUNE,
    provincia: r.PR,
    fasce: fasce.sort((a, b) => a.da - b.da),
    esenzione,
    nonDeliberata,
  };
}

function costruisciComuni(righeAnno, righeAnnoPrecedente, anno) {
  const precedenti = new Map(
    righeAnnoPrecedente.map((r) => [r.CODICE_CATASTALE, leggiComune(r)])
  );

  const comuni = {};
  let conFallback = 0;

  for (const r of righeAnno) {
    const codice = r.CODICE_CATASTALE;
    if (!codice) continue;

    let dato = leggiComune(r);
    let annoDato = anno;

    // REGOLA 2: "0*" non è aliquota zero, è "delibera non ancora pubblicata".
    if (dato.nonDeliberata) {
      const precedente = precedenti.get(codice);
      if (precedente && !precedente.nonDeliberata) {
        dato = { ...precedente, nome: dato.nome, provincia: dato.provincia };
        annoDato = anno - 1;
        conFallback++;
      }
    }

    comuni[codice] = {
      nome: dato.nome,
      provincia: dato.provincia,
      fasce: dato.fasce,
      esenzione: dato.esenzione,
      annoDato,
    };
  }

  return { comuni, conFallback };
}

/* ------------------------------------------------------------------ *
 * Esecuzione
 * ------------------------------------------------------------------ */

const anno = Number(process.argv[2]) || 2026;
const oggi = new Date().toISOString().slice(0, 10);

console.log(`Scarico i dati ufficiali MEF per l'anno ${anno}...`);

const [righeRegionali, righeComunali, righeComunaliPrec] = await Promise.all([
  scaricaCsv(URL_REGIONALE(anno)),
  scaricaCsv(URL_COMUNALE(anno)),
  scaricaCsv(URL_COMUNALE(anno - 1)),
]);

// --- Regionali ---------------------------------------------------------
const regioni = costruisciRegioni(righeRegionali);
const sorgenteRegionale = `/**
 * ALIQUOTE ADDIZIONALE REGIONALE IRPEF — ANNO ${anno}
 * =================================================
 *
 * FILE GENERATO AUTOMATICAMENTE — non modificare a mano.
 * Rigenerare con:  npm run aggiorna-aliquote
 *
 * Fonte: Dipartimento delle Finanze (MEF), CSV ufficiale aggiornato
 * quotidianamente. Scaricato il ${oggi}.
 * ${URL_REGIONALE(anno)}
 *
 * Le aliquote sono espresse in PERCENTUALE (1.23 = 1,23%).
 * Le fasce sono progressive per scaglioni: \`a: null\` significa "senza limite".
 */

export const ANNO_ALIQUOTE_REGIONALI = ${anno};
export const SCARICATO_IL = '${oggi}';
export const FONTE_REGIONALE = '${URL_REGIONALE(anno)}';

export const ALIQUOTE_REGIONALI = ${JSON.stringify(regioni, null, 2)};
`;

await mkdir(join(RADICE, 'src/dati'), { recursive: true });
await writeFile(join(RADICE, 'src/dati', `aliquote-regionali-${anno}.js`), sorgenteRegionale, 'utf8');
console.log(`  regioni: ${regioni.length} scritte in src/dati/aliquote-regionali-${anno}.js`);

// --- Comunali ----------------------------------------------------------
const { comuni, conFallback } = costruisciComuni(righeComunali, righeComunaliPrec, anno);
const totaleComuni = Object.keys(comuni).length;

await writeFile(
  join(RADICE, 'src/dati', `aliquote-comunali-${anno}.json`),
  JSON.stringify({
    anno,
    scaricatoIl: oggi,
    fonte: URL_COMUNALE(anno),
    nota: `${conFallback} comuni non avevano ancora deliberato per il ${anno} `
      + `("0*" nel CSV): per questi si usa l'aliquota ${anno - 1}, segnalata dal campo annoDato.`,
    comuni,
  }),
  'utf8'
);
console.log(`  comuni: ${totaleComuni} scritti (${conFallback} con aliquota ${anno - 1} di ripiego)`);
console.log('Fatto.');
