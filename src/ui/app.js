/**
 * APPLICAZIONE — collega il modulo di input al motore di calcolo
 * ==============================================================
 *
 * Qui non c'è nessuna regola fiscale. Questo file:
 *   1. legge i valori dal modulo
 *   2. chiama calcolaNetto()
 *   3. disegna il risultato
 *
 * Se un numero ti sembra sbagliato, il file da aprire non è questo: sono i
 * moduli in src/calcolo/.
 */

import { calcolaNetto } from '../calcolo/calcola-netto.js';
import { SEMPLIFICAZIONI } from '../calcolo/semplificazioni.js';
import { ANNO } from '../calcolo/parametri-2026.js';
import { ALIQUOTE_REGIONALI, FONTE_REGIONALE } from '../dati/aliquote-regionali-2026.js';
import { PROVINCIA_A_REGIONE } from '../dati/province-regioni.js';
import { euro, euroTondo, percentuale, normalizza, nomeProprio, testoSicuro } from './formato.js';
import { PREZZO_PER_MILIONE, CAMBIO_EUR_USD, tokenDa } from './unita.js';
import { graficoRipartizioneRal, graficoCurva, graficoScaglioni } from './grafici.js';

/* ------------------------------------------------------------------ *
 * Stato
 * ------------------------------------------------------------------ */

let comuniPerCodice = null;      // caricati in modo asincrono: sono ~1 MB
let comuniOrdinati = [];
let comuneScelto = null;

const $ = (selettore) => document.querySelector(selettore);

/**
 * Stato dell'interruttore sopra le cifre. Non è duplicato in una variabile:
 * la fonte è la casella stessa, così non può divergere da ciò che si vede.
 */
const inToken = () => $('#unita-token')?.checked === true;

/* ------------------------------------------------------------------ *
 * Caricamento dei dati comunali
 * ------------------------------------------------------------------ */

async function caricaComuni() {
  try {
    const risposta = await fetch('./src/dati/aliquote-comunali-2026.json');
    if (!risposta.ok) throw new Error(`HTTP ${risposta.status}`);
    const dati = await risposta.json();

    // I nomi nel CSV sono tutti maiuscoli: li normalizziamo qui, una volta sola,
    // al confine fra dato e interfaccia. Da qui in poi sono già presentabili.
    comuniPerCodice = Object.fromEntries(
      Object.entries(dati.comuni).map(([codice, c]) => [codice, { ...c, nome: nomeProprio(c.nome) }])
    );

    comuniOrdinati = Object.entries(comuniPerCodice)
      .map(([codice, c]) => ({ codice, ...c, ricerca: normalizza(c.nome) }))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'it'));

    // Preselezione utile: Milano, così la pagina è calcolabile subito.
    if (!comuneScelto) selezionaComune('F205');
  } catch (errore) {
    // Non mostrato a schermo: se il fetch fallisce, l'addizionale comunale
    // resta semplicemente a zero. Il messaggio resta in console per il debug.
    console.error('Dati comunali non caricati, addizionale comunale a zero:', errore);
  }
}

function selezionaComune(codice) {
  const comune = comuniPerCodice?.[codice];
  if (!comune) return;

  comuneScelto = { codice, ...comune };
  $('#comune').value = `${comune.nome} (${comune.provincia})`;

  // La regione si deduce dalla provincia: un dato solo da inserire invece di due.
  const regione = PROVINCIA_A_REGIONE[comune.provincia];
  if (regione) $('#regione').value = regione;

  aggiornaNotaComune();
}

function aggiornaNotaComune() {
  const nota = $('#nota-comune');
  if (!comuneScelto) { nota.textContent = ''; return; }

  const parti = [];
  if (comuneScelto.annoDato < ANNO) {
    parti.push(`delibera ${ANNO} non ancora pubblicata: si usa l'aliquota ${comuneScelto.annoDato}`);
  }
  if (comuneScelto.esenzione > 0) {
    parti.push(`esenzione fino a ${euroTondo(comuneScelto.esenzione)} di imponibile`);
  }
  if (comuneScelto.fasce.length === 0) {
    parti.push('nessuna addizionale comunale');
  }
  nota.textContent = parti.join(' · ');
}

/* ------------------------------------------------------------------ *
 * Ricerca del comune
 * ------------------------------------------------------------------ *
 *
 * Tendina disegnata a mano, non <input list> nativo. Con il datalist del
 * browser, ogni digitazione che coincideva ESATTAMENTE con un nome di comune
 * (es. arrivando a "Milano" cancellando "Milano (MI)" con backspace)
 * veniva risolta subito e il campo riscritto a "Milano (MI)": la
 * cancellazione sembrava non funzionare perché il testo tornava indietro da
 * solo. Qui la selezione avviene SOLO su un'azione esplicita — click o invio
 * su una voce evidenziata — mai in automatico durante la digitazione.
 */

let suggerimentiCorrenti = [];
let indiceEvidenziato = -1;

function mostraSuggerimenti() {
  $('#lista-comuni').hidden = false;
  $('#comune').setAttribute('aria-expanded', 'true');
}

function nascondiSuggerimenti() {
  const lista = $('#lista-comuni');
  lista.hidden = true;
  lista.innerHTML = '';
  suggerimentiCorrenti = [];
  indiceEvidenziato = -1;
  $('#comune').setAttribute('aria-expanded', 'false');
  $('#comune').removeAttribute('aria-activedescendant');
}

function evidenziaSuggerimento(indice) {
  const voci = $('#lista-comuni').querySelectorAll('.suggerimento');
  voci.forEach((v, i) => v.classList.toggle('attivo', i === indice));
  indiceEvidenziato = indice;

  if (indice >= 0 && voci[indice]) {
    voci[indice].scrollIntoView({ block: 'nearest' });
    $('#comune').setAttribute('aria-activedescendant', voci[indice].id);
  } else {
    $('#comune').removeAttribute('aria-activedescendant');
  }
}

/** Selezione esplicita di una voce della tendina: click o invio, mai input. */
function confermaSuggerimento(indice) {
  const scelto = suggerimentiCorrenti[indice];
  if (!scelto) return;
  selezionaComune(scelto.codice);
  nascondiSuggerimenti();
  if (!$('#risultato').hidden) calcolaEDisegna();
}

function aggiornaSuggerimenti() {
  const testo = normalizza($('#comune').value);
  const lista = $('#lista-comuni');

  if (testo.length < 2 || !comuniOrdinati.length) { nascondiSuggerimenti(); return; }

  // Prima chi inizia con il testo digitato, poi chi lo contiene.
  const iniziano = [];
  const contengono = [];
  for (const c of comuniOrdinati) {
    if (c.ricerca.startsWith(testo)) iniziano.push(c);
    else if (c.ricerca.includes(testo)) contengono.push(c);
    if (iniziano.length >= 40) break;
  }

  suggerimentiCorrenti = [...iniziano, ...contengono].slice(0, 40);
  indiceEvidenziato = -1;

  if (suggerimentiCorrenti.length === 0) {
    lista.innerHTML = '<li class="suggerimento-vuoto">Nessun comune trovato</li>';
    mostraSuggerimenti();
    return;
  }

  lista.innerHTML = suggerimentiCorrenti.map((c, i) => `
    <li class="suggerimento" role="option" id="suggerimento-${i}" data-indice="${i}">
      ${testoSicuro(c.nome)}<span class="suggerimento-provincia">(${c.provincia})</span>
    </li>`).join('');

  mostraSuggerimenti();
}

/** Fallback per chi digita il nome completo e preme invio senza usare la tendina. */
function risolviComuneDigitato() {
  const grezzo = $('#comune').value.trim();
  const conProvincia = grezzo.match(/^(.*)\s*\(([A-Z]{2})\)$/);

  const nome = normalizza(conProvincia ? conProvincia[1] : grezzo);
  const provincia = conProvincia?.[2];

  const trovato = comuniOrdinati.find((c) =>
    c.ricerca === nome && (!provincia || c.provincia === provincia));

  if (trovato) selezionaComune(trovato.codice);
  return Boolean(trovato);
}

/* ------------------------------------------------------------------ *
 * Lettura del modulo
 * ------------------------------------------------------------------ */

function leggiInput() {
  const numeroDa = (selettore, predefinito = 0) => {
    const valore = Number($(selettore).value);
    return Number.isFinite(valore) ? valore : predefinito;
  };

  const nomeRegione = $('#regione').value;

  return {
    ral: Math.max(0, numeroDa('#ral')),
    mensilita: Number($('input[name="mensilita"]:checked').value),
    regione: ALIQUOTE_REGIONALI.find((r) => r.nome === nomeRegione) ?? null,
    comune: comuneScelto,
    giorniLavorati: Math.min(365, Math.max(1, numeroDa('#giorni', 365))),
    apprendista: $('#apprendista').checked,
    tempoDeterminato: $('#tempo-determinato').checked,
    coniugeACarico: $('#coniuge').checked,
    figliACarico: Math.max(0, numeroDa('#figli')),
    figliDisabili: Math.max(0, numeroDa('#figli-disabili')),
    percentualeFigli: Number($('#percentuale-figli').value),
    altriFamiliari: Math.max(0, numeroDa('#altri-familiari')),
  };
}

/* ------------------------------------------------------------------ *
 * Disegno del risultato
 * ------------------------------------------------------------------ */

/** Una riga della tabella, con il dettaglio dei passi apribile. */
function rigaVoce({ etichetta, valore, segno, passi = [], note = '', evidenza = false, finale = false }) {
  const passiHtml = passi.length ? `
    <ol class="passi">
      ${passi.map((p) => `
        <li>
          <span class="passo-titolo">${testoSicuro(p.titolo)}</span>
          <code class="passo-formula">${testoSicuro(p.formula)}</code>
          ${p.spiegazione ? `<p class="passo-spiegazione">${testoSicuro(p.spiegazione)}</p>` : ''}
        </li>`).join('')}
    </ol>` : '<p class="passo-spiegazione">Nessun dettaglio per questa voce.</p>';

  return `
    <details class="voce ${evidenza ? 'voce-evidenza' : ''} ${finale ? 'voce-finale' : ''} voce-${segno === '+' ? 'positiva' : segno === '−' ? 'negativa' : 'neutra'}">
      <summary>
        <span class="voce-etichetta">${testoSicuro(etichetta)}</span>
        ${note ? `<span class="voce-nota">${testoSicuro(note)}</span>` : ''}
        <span class="voce-valore">${segno}${euro(Math.abs(valore))}</span>
      </summary>
      <div class="voce-dettaglio">
        ${passiHtml}
      </div>
    </details>`;
}

/**
 * Le tre cifre in evidenza, in euro o in token.
 *
 * In token ogni cifra occupa due riquadri invece di uno: input e output hanno
 * prezzi diversi, quindi sono due risposte diverse alla stessa domanda e vanno
 * lette insieme. L'importo in euro resta nella riga sotto: l'interruttore è una
 * battuta, non un modo per perdere il numero che si era venuti a cercare.
 */
function disegnaCifre(r) {
  const token = inToken();

  const cifre = [
    { etichetta: 'Netto annuo', valore: r.nettoAnnuo, principale: true,
      sotto: `${percentuale(r.percentualeNetto)} della RAL` },
    { etichetta: 'Netto per mensilità', valore: r.nettoMensile,
      sotto: `su ${r.mensilita} mensilità` },
    { etichetta: 'Trattenute totali', valore: r.totaleTrattenute,
      sotto: 'contributi e imposte' },
  ];

  const riquadro = ({ etichetta, valore, sotto, principale }, tipo) => `
    <div class="cifra ${principale ? 'cifra-principale' : ''} ${tipo ? 'cifra-token' : ''}">
      <span class="cifra-etichetta">${testoSicuro(etichetta)}${tipo ? ` · ${tipo}` : ''}</span>
      <strong class="cifra-valore">${tipo ? tokenDa(valore, tipo) : euroTondo(valore)}</strong>
      <span class="cifra-sotto">${tipo ? `${euroTondo(valore)} a ${PREZZO_PER_MILIONE[tipo]} $ per milione` : sotto}</span>
    </div>`;

  $('#cifre').className = `cifre ${token ? 'cifre-token' : ''}`;
  $('#cifre').innerHTML = cifre
    .map((c) => (token ? riquadro(c, 'input') + riquadro(c, 'output') : riquadro(c, null)))
    .join('');

  $('#nota-unita').textContent = token
    ? `Listino Anthropic per Claude Fable 5, cambio 1 € = ${CAMBIO_EUR_USD.toLocaleString('it-IT')} $.`
    : '';
}

function disegnaRisultato(r) {
  const d = r.dettaglio;

  /* --- Cifre principali ------------------------------------------- */
  disegnaCifre(r);

  /* --- Ripartizione della RAL --------------------------------------- */
  $('#grafico-ripartizione-ral').innerHTML = graficoRipartizioneRal(r);

  /* --- Voce per voce ----------------------------------------------- */
  const voci = [
    rigaVoce({
      etichetta: 'Retribuzione annua lorda',
      valore: r.ral, segno: '', evidenza: true,
      note: `${r.mensilita} mensilità`,
      passi: [{
        titolo: 'Punto di partenza',
        formula: `${euro(r.ral)} / ${r.mensilita} = ${euro(r.ral / r.mensilita)} lordi per mensilità`,
        spiegazione: 'La RAL è il costo lordo in busta paga, non il costo aziendale: '
          + "il datore versa in più circa il 23,81% di contributi a proprio carico, oltre al TFR.",
      }],
    }),

    rigaVoce({
      etichetta: 'Contributi INPS a carico del lavoratore',
      valore: r.contributiInps, segno: '−',
      note: percentuale(r.ral > 0 ? r.contributiInps / r.ral : 0, 2),
      passi: d.inps.passi,
    }),

    rigaVoce({
      etichetta: 'Reddito imponibile IRPEF',
      valore: r.imponibile, segno: '=', evidenza: true,
      passi: [{
        titolo: 'RAL meno contributi',
        formula: `${euro(r.ral)} − ${euro(r.contributiInps)} = ${euro(r.imponibile)}`,
        spiegazione: 'I contributi previdenziali sono deducibili: le imposte si calcolano '
          + 'su questa cifra, non sulla RAL. È anche la base delle due addizionali.',
      }],
    }),

    rigaVoce({
      etichetta: 'IRPEF lorda',
      valore: r.irpefLorda, segno: '−',
      note: `media ${percentuale(d.irpef.aliquotaMedia)}`,
      passi: d.irpef.scaglioni.map((s) => ({
        titolo: `Scaglione ${s.etichetta} - ${percentuale(s.aliquota, 0)}`,
        formula: `${euro(s.quotaTassata)} × ${percentuale(s.aliquota, 0)} = ${euro(s.imposta)}`,
        spiegazione: '',
      })),
    }),

    rigaVoce({
      etichetta: 'Detrazioni sull\'imposta',
      valore: r.detrazioniTotali, segno: '+',
      note: r.detrazioniNonSfruttate > 0 ? `${euroTondo(r.detrazioniNonSfruttate)} non sfruttate` : '',
      passi: [
        ...d.detrazioneLavoro.passi,
        ...d.detrazioniFamiliari.passi,
        ...d.ulterioreDetrazioneCuneo.passi,
        {
          titolo: 'Totale detrazioni',
          formula: `${euro(d.detrazioneLavoro.totale)} + ${euro(d.detrazioniFamiliari.totale)}`
            + ` + ${euro(d.ulterioreDetrazioneCuneo.totale)} = ${euro(r.detrazioniTotali)}`,
          spiegazione: 'Le detrazioni si sottraggono dall\'imposta, non dal reddito. '
            + 'Non possono generare un rimborso: al massimo azzerano l\'IRPEF.',
        },
      ],
    }),

    rigaVoce({
      etichetta: 'IRPEF netta',
      valore: r.irpefNetta, segno: '−', evidenza: true,
      passi: [{
        titolo: 'Imposta effettivamente dovuta',
        formula: `max(0 ; ${euro(r.irpefLorda)} − ${euro(r.detrazioniTotali)}) = ${euro(r.irpefNetta)}`,
        spiegazione: r.irpefNetta === 0
          ? 'Le detrazioni azzerano l\'imposta: il lavoratore è "incapiente" e non paga IRPEF '
            + 'né addizionali.'
          : '',
      }],
    }),

    rigaVoce({
      etichetta: `Addizionale regionale${r.input.regione ? ` - ${r.input.regione.nome}` : ''}`,
      valore: r.addizionaleRegionale, segno: '−',
      passi: d.addizionaleRegionale.passi,
    }),

    rigaVoce({
      etichetta: `Addizionale comunale${comuneScelto ? ` - ${comuneScelto.nome}` : ''}`,
      valore: r.addizionaleComunale, segno: '−',
      passi: d.addizionaleComunale.passi,
    }),

    rigaVoce({
      etichetta: 'Trattamento integrativo',
      valore: r.trattamentoIntegrativo, segno: '+',
      passi: d.trattamentoIntegrativo.passi,
    }),

    rigaVoce({
      etichetta: 'Somma integrativa cuneo fiscale',
      valore: r.sommaCuneo, segno: '+',
      passi: d.sommaCuneo.passi.length ? d.sommaCuneo.passi : [{
        titolo: 'Non spettante',
        formula: `reddito complessivo ${euro(r.redditoComplessivo)} oltre 20.000 €`,
        spiegazione: 'Sopra i 20.000 € il cuneo fiscale agisce come detrazione, '
          + 'già conteggiata fra le detrazioni sopra.',
      }],
    }),

    rigaVoce({
      etichetta: 'Netto annuo',
      valore: r.nettoAnnuo, segno: '=', evidenza: true, finale: true,
      passi: [{
        titolo: 'Chiusura del conto',
        formula: `${euro(r.ral)} − ${euro(r.totaleTrattenute)} + ${euro(r.totaleErogazioni)}`
          + ` = ${euro(r.nettoAnnuo)}`,
        spiegazione: `Su 100 € di RAL, ${percentuale(r.percentualeNetto).replace('%', '')} € `
          + 'arrivano sul conto corrente.',
      }],
    }),
  ];

  $('#voci').innerHTML = voci.join('');

  /* --- Testo integrale della delibera regionale --------------------- */
  const disposizione = d.addizionaleRegionale.disposizione;
  $('#disposizione-regionale').innerHTML = disposizione
    ? `<h3>Cosa dice la delibera regionale</h3>
       <blockquote>${testoSicuro(disposizione)}</blockquote>
       <p class="minuta">Testo integrale dal CSV del Dipartimento delle Finanze. Le agevolazioni
       descritte a parole non sono applicate automaticamente dal calcolatore.</p>`
    : '';

  /* --- Curva ------------------------------------------------------- */
  disegnaCurva(r);

  /* --- Scaglioni --------------------------------------------------- */
  $('#grafico-scaglioni').innerHTML = graficoScaglioni(r);

  $('#risultato').hidden = false;
}

/** Ricalcola la curva usando gli stessi parametri, variando solo la RAL. */
function disegnaCurva(r) {
  const punti = [];
  for (let ral = 0; ral <= 150000; ral += 2500) {
    const p = calcolaNetto({ ...r.input, ral });
    punti.push({ ral, netto: p.nettoAnnuo, pressione: p.pressioneEffettiva });
  }
  $('#grafico-curva').innerHTML = graficoCurva(punti, r.ral);
}

/* ------------------------------------------------------------------ *
 * Sezioni statiche
 * ------------------------------------------------------------------ */

function disegnaSemplificazioni() {
  $('#semplificazioni').innerHTML = SEMPLIFICAZIONI.map((s) => `
    <details class="semplificazione">
      <summary>
        <span class="semplificazione-titolo">${testoSicuro(s.titolo)}</span>
      </summary>
      <p>${testoSicuro(s.descrizione)}</p>
    </details>`).join('');

  $('#conteggio-semplificazioni').textContent =
    `${SEMPLIFICAZIONI.length} voci dichiarate`;
}

/** L'unico parametro esposto nell'interfaccia: la fonte delle addizionali. */
function collegaFonti() {
  $('#fonte-regionale').href = FONTE_REGIONALE;
}

/* ------------------------------------------------------------------ *
 * Avvio
 * ------------------------------------------------------------------ */

function popolaRegioni() {
  $('#regione').innerHTML = ALIQUOTE_REGIONALI
    .map((r) => `<option value="${testoSicuro(r.nome)}">${testoSicuro(r.nome)}</option>`)
    .join('');
  $('#regione').value = 'Lombardia';
}

function calcolaEDisegna() {
  const input = leggiInput();
  if (input.ral <= 0) {
    $('#risultato').hidden = true;
    return;
  }
  disegnaRisultato(calcolaNetto(input));
}

function avvia() {
  popolaRegioni();
  disegnaSemplificazioni();
  collegaFonti();
  caricaComuni();

  $('#modulo').addEventListener('submit', (evento) => {
    evento.preventDefault();
    risolviComuneDigitato();
    calcolaEDisegna();
  });

  // Il cursore e il campo numerico della RAL restano allineati.
  $('#ral').addEventListener('input', () => {
    $('#ral-cursore').value = Math.min(200000, Number($('#ral').value) || 0);
    if (!$('#risultato').hidden) calcolaEDisegna();
  });
  $('#ral-cursore').addEventListener('input', () => {
    $('#ral').value = $('#ral-cursore').value;
    if (!$('#risultato').hidden) calcolaEDisegna();
  });

  // L'interruttore delle unità sta fuori dal modulo: il ciclo generico in fondo
  // a questa funzione non lo raggiunge, e vuole un aggancio dedicato. Ridisegna
  // solo le cifre, che sono le sole a cambiare unità.
  $('#unita-token').addEventListener('change', () => {
    if (!$('#risultato').hidden) calcolaEDisegna();
  });

  $('#comune').addEventListener('input', aggiornaSuggerimenti);

  $('#comune').addEventListener('keydown', (evento) => {
    if (evento.key === 'ArrowDown') {
      evento.preventDefault();
      if ($('#lista-comuni').hidden) { aggiornaSuggerimenti(); return; }
      evidenziaSuggerimento(Math.min(indiceEvidenziato + 1, suggerimentiCorrenti.length - 1));
    } else if (evento.key === 'ArrowUp') {
      evento.preventDefault();
      evidenziaSuggerimento(Math.max(indiceEvidenziato - 1, 0));
    } else if (evento.key === 'Enter' && indiceEvidenziato >= 0) {
      // Con una voce evidenziata l'invio la conferma, invece di inviare il modulo.
      evento.preventDefault();
      confermaSuggerimento(indiceEvidenziato);
    } else if (evento.key === 'Escape') {
      nascondiSuggerimenti();
    }
  });

  // mousedown (non click): scatta prima del blur dell'input, altrimenti la
  // tendina si chiuderebbe per il blur ancora prima che il click la raggiunga.
  $('#lista-comuni').addEventListener('mousedown', (evento) => {
    const voce = evento.target.closest('.suggerimento');
    if (!voce) return;
    evento.preventDefault();
    confermaSuggerimento(Number(voce.dataset.indice));
  });

  $('#comune').addEventListener('blur', () => {
    setTimeout(nascondiSuggerimenti, 120);
  });

  // Ogni altra modifica ricalcola, ma solo dopo il primo "Calcola".
  for (const campo of document.querySelectorAll('#modulo input, #modulo select')) {
    if (campo.id === 'ral' || campo.id === 'ral-cursore' || campo.id === 'comune') continue;
    campo.addEventListener('change', () => {
      if (!$('#risultato').hidden) calcolaEDisegna();
    });
  }

  disattivaRotellinaSuiCampiNumerici();
}

/**
 * Il browser, di serie, incrementa o decrementa un <input type="number">
 * quando ci si scorre sopra con la rotellina del mouse mentre ha il focus —
 * un comportamento facile da attivare per sbaglio (basta scorrere la pagina
 * col cursore fermo su un campo appena cliccato) e che altera un valore
 * senza che l'utente se ne accorga. Lo disattiviamo togliendo il focus dal
 * campo appena parte lo scroll: la rotellina torna a scorrere la pagina, non
 * il numero, e il campo resta comunque modificabile normalmente da tastiera.
 */
function disattivaRotellinaSuiCampiNumerici() {
  for (const campo of document.querySelectorAll('#modulo input[type="number"]')) {
    campo.addEventListener('wheel', () => campo.blur(), { passive: true });
  }
}

avvia();
