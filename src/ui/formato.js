/**
 * FORMATTAZIONE DEI NUMERI PER L'INTERFACCIA
 * ==========================================
 * Nessuna regola fiscale qui dentro: solo presentazione.
 */

/**
 * `useGrouping: 'always'` è necessario: la locale italiana, per impostazione
 * predefinita, NON separa le migliaia nei numeri di quattro cifre (scrive
 * "1859" e non "1.859"). In una tabella di importi incolonnati la differenza
 * si nota subito, quindi forziamo il separatore ovunque.
 */
const EURO = new Intl.NumberFormat('it-IT', {
  style: 'currency', currency: 'EUR', useGrouping: 'always',
  minimumFractionDigits: 2, maximumFractionDigits: 2,
});

const EURO_TONDO = new Intl.NumberFormat('it-IT', {
  style: 'currency', currency: 'EUR', useGrouping: 'always',
  minimumFractionDigits: 0, maximumFractionDigits: 0,
});

const NUMERO = new Intl.NumberFormat('it-IT', { useGrouping: 'always', maximumFractionDigits: 0 });

/** 1234.5 → "1.234,50 €" */
export const euro = (n) => EURO.format(n ?? 0);

/** 1234.5 → "1.235 €" */
export const euroTondo = (n) => EURO_TONDO.format(n ?? 0);

/** 1234.5 → "1.235" */
export const numero = (n) => NUMERO.format(n ?? 0);

/** 0.2345 → "23,5%" */
export const percentuale = (n, decimali = 1) =>
  `${((n ?? 0) * 100).toLocaleString('it-IT', {
    minimumFractionDigits: decimali, maximumFractionDigits: decimali,
  })}%`;

/**
 * Normalizza una stringa per la ricerca dei comuni.
 *
 * Toglie sia gli accenti sia gli apostrofi, e per una ragione precisa: il CSV
 * del MEF scrive le vocali accentate finali con l'apostrofo, alla vecchia
 * maniera della macchina da scrivere ("FORLI'", "CANTU'"). Chi cerca digita
 * "Forl\u00ec". Azzerando entrambe le forme, le due grafie coincidono.
 */
export const normalizza = (testo) =>
  (testo ?? '')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')    // via gli accenti
    .replace(/['\u2019]/g, '');              // via gli apostrofi

/**
 * Vocali accentate scritte con l'apostrofo, da ricostruire in fase di
 * visualizzazione: "forli'" \u2192 "forl\u00ec".
 */
const ACCENTATE = { a: '\u00e0', e: '\u00e8', i: '\u00ec', o: '\u00f2', u: '\u00f9' };

/**
 * Distingue un accento da un'elisione contando le lettere del token.
 *
 * Nel dataset completo dei 7.897 comuni ci sono solo tre token di tre
 * caratteri che finiscono con vocale + apostrofo \u2014 DE', NE', VO' \u2014 e sono
 * tutti da lasciare cos\u00ec: "Cassina de' Pecchi", "Vo'". Tutti i token pi\u00f9
 * lunghi sono invece accenti da ripristinare: ALA', ALI', FIE', GUA', HOE',
 * PRE', ROE', ULA', VIU'.
 */
const ricostruisciAccento = (token) =>
  token.length >= 4
    ? token.replace(/([aeiou])'$/, (_, vocale) => ACCENTATE[vocale])
    : token;

/**
 * I nomi dei comuni nel CSV del MEF sono tutti maiuscoli ("REGGIO EMILIA").
 * Qui tornano leggibili, lasciando minuscole le particelle ("di", "del", "sul").
 */
const PARTICELLE = new Set(['di', 'del', 'della', 'dei', 'delle', 'da', 'dal', 'in', 'sul',
  'sulla', 'a', 'al', 'con', 'e', 'lo', 'la', 'il',
  // elisioni che restano minuscole: "Cassina de' Pecchi"
  "d'", "de'", "ne'", "ca'"]);

export const nomeProprio = (testo) =>
  (testo ?? '')
    .toLocaleLowerCase('it-IT')
    .split(/(\s+|-)/)
    .map((pezzo, indice) => {
      if (/^(\s+|-)$/.test(pezzo)) return pezzo;
      if (indice > 0 && PARTICELLE.has(pezzo)) return pezzo;
      // Particelle elise: "nell'emilia" → "nell'Emilia"
      if (indice > 0 && /^(nell|dell|sull|all|d)'/.test(pezzo)) {
        return pezzo.replace(/'([a-zà-ÿ])/, (_, lettera) => `'${lettera.toLocaleUpperCase('it-IT')}`);
      }
      // "sant'agata" → "Sant'Agata", "forli'" → "Forlì"
      return ricostruisciAccento(pezzo)
        .replace(/(^|')([a-zà-ÿ])/g, (_, prefisso, lettera) =>
          prefisso + lettera.toLocaleUpperCase('it-IT'));
    })
    .join('');

/** Protegge dai caratteri speciali quando si costruisce HTML da stringhe. */
export const testoSicuro = (s) =>
  (s ?? '')
    .toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
