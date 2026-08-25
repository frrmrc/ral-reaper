/**
 * APPLICAZIONE — collega il modulo di input al motore di calcolo
 * ==============================================================
 *
 * Qui non c'è nessuna regola fiscale. Questo file:
 *   1. legge i valori dal modulo
 *   2. chiama calcolaNetto()
 *   3. disegna il risultato
 *
 * Se un numero ti sembra sbagliato, il file da aprire non è questo: è quello
 * indicato accanto a ogni voce nella sezione "Come è stato calcolato".
 */

import { calcolaNetto } from '../calcolo/calcola-netto.js';
import { SEMPLIFICAZIONI } from '../calcolo/semplificazioni.js';
import { IRPEF, INPS, ANNO } from '../calcolo/parametri-2026.js';
import { ALIQUOTE_REGIONALI, SCARICATO_IL, FONTE_REGIONALE } from '../dati/aliquote-regionali-2026.js';
import { PROVINCIA_A_REGIONE } from '../dati/province-regioni.js';
import { euro, euroTondo, numero, percentuale, normalizza, nomeProprio, testoSicuro } from './formato.js';
import { graficoCascata, graficoCurva, graficoScaglioni } from './grafici.js';

/* ------------------------------------------------------------------ *
 * Stato
 * ------------------------------------------------------------------ */

let comuniPerCodice = null;      // caricati in modo asincrono: sono ~1 MB
let comuniOrdinati = [];
let comuneScelto = null;

const $ = (selettore) => document.querySelector(selettore);

/* ------------------------------------------------------------------ *
 * Caricamento dei dati comunali
 * ------------------------------------------------------------------ */

async function caricaComuni() {
  const stato = $('#stato-comuni');
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

    stato.textContent = `${numero(comuniOrdinati.length)} comuni caricati dal CSV ufficiale MEF`;
    stato.classList.remove('in-caricamento');

    // Preselezione utile: Milano, così la pagina è calcolabile subito.
    if (!comuneScelto) selezionaComune('F205');
  } catch (errore) {
    stato.textContent = 'Dati comunali non caricati: l\'addizionale comunale resterà a zero. '
      + `(${errore.message})`;
    stato.classList.add('errore');
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
 * ------------------------------------------------------------------ */

function aggiornaSuggerimenti() {
  const testo = normalizza($('#comune').value.replace(/\s*\([A-Z]{2}\)\s*$/, ''));
  const lista = $('#lista-comuni');

  if (testo.length < 2 || !comuniOrdinati.length) { lista.innerHTML = ''; return; }

  // Prima chi inizia con il testo digitato, poi chi lo contiene.
  const iniziano = [];
  const contengono = [];
  for (const c of comuniOrdinati) {
    if (c.ricerca.startsWith(testo)) iniziano.push(c);
    else if (c.ricerca.includes(testo)) contengono.push(c);
    if (iniziano.length >= 40) break;
  }

  lista.innerHTML = [...iniziano, ...contengono]
    .slice(0, 40)
    .map((c) => `<option data-codice="${c.codice}" value="${testoSicuro(c.nome)} (${c.provincia})"></option>`)
    .join('');
}

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
function rigaVoce({ etichetta, valore, segno, modulo, passi = [], note = '', evidenza = false }) {
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
    <details class="voce ${evidenza ? 'voce-evidenza' : ''} voce-${segno === '+' ? 'positiva' : segno === '−' ? 'negativa' : 'neutra'}">
      <summary>
        <span class="voce-etichetta">${testoSicuro(etichetta)}</span>
        ${note ? `<span class="voce-nota">${testoSicuro(note)}</span>` : ''}
        <span class="voce-valore">${segno}${euro(Math.abs(valore))}</span>
      </summary>
      <div class="voce-dettaglio">
        ${passiHtml}
        <p class="voce-modulo">Regola implementata in <code>src/calcolo/${modulo}</code></p>
      </div>
    </details>`;
}

function disegnaRisultato(r) {
  const d = r.dettaglio;

  /* --- Cifre principali ------------------------------------------- */
  $('#cifre').innerHTML = `
    <div class="cifra cifra-principale">
      <span class="cifra-etichetta">Netto annuo</span>
      <strong class="cifra-valore">${euroTondo(r.nettoAnnuo)}</strong>
      <span class="cifra-sotto">${percentuale(r.percentualeNetto)} della RAL</span>
    </div>
    <div class="cifra">
      <span class="cifra-etichetta">Netto per mensilità</span>
      <strong class="cifra-valore">${euroTondo(r.nettoMensile)}</strong>
      <span class="cifra-sotto">su ${r.mensilita} mensilità</span>
    </div>
    <div class="cifra">
      <span class="cifra-etichetta">Trattenute totali</span>
      <strong class="cifra-valore">${euroTondo(r.totaleTrattenute)}</strong>
      <span class="cifra-sotto">contributi e imposte</span>
    </div>
    <div class="cifra">
      <span class="cifra-etichetta">Aliquota marginale</span>
      <strong class="cifra-valore">${percentuale(r.aliquotaMarginaleIrpef, 0)}</strong>
      <span class="cifra-sotto">IRPEF sull'ultimo euro</span>
    </div>`;

  /* --- Grafico a cascata ------------------------------------------ */
  $('#grafico-cascata').innerHTML = graficoCascata(r);

  /* --- Voce per voce ----------------------------------------------- */
  const voci = [
    rigaVoce({
      etichetta: 'Retribuzione annua lorda',
      valore: r.ral, segno: '', modulo: 'calcola-netto.js', evidenza: true,
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
      valore: r.contributiInps, segno: '−', modulo: 'contributi-inps.js',
      note: percentuale(r.ral > 0 ? r.contributiInps / r.ral : 0, 2),
      passi: d.inps.passi,
    }),

    rigaVoce({
      etichetta: 'Reddito imponibile IRPEF',
      valore: r.imponibile, segno: '=', modulo: 'calcola-netto.js', evidenza: true,
      passi: [{
        titolo: 'RAL meno contributi',
        formula: `${euro(r.ral)} − ${euro(r.contributiInps)} = ${euro(r.imponibile)}`,
        spiegazione: 'I contributi previdenziali sono deducibili: le imposte si calcolano '
          + 'su questa cifra, non sulla RAL. È anche la base delle due addizionali.',
      }],
    }),

    rigaVoce({
      etichetta: 'IRPEF lorda',
      valore: r.irpefLorda, segno: '−', modulo: 'irpef.js',
      note: `media ${percentuale(d.irpef.aliquotaMedia)}`,
      passi: d.irpef.scaglioni.map((s) => ({
        titolo: `Scaglione ${s.etichetta} — ${percentuale(s.aliquota, 0)}`,
        formula: `${euro(s.quotaTassata)} × ${percentuale(s.aliquota, 0)} = ${euro(s.imposta)}`,
        spiegazione: '',
      })),
    }),

    rigaVoce({
      etichetta: 'Detrazioni sull\'imposta',
      valore: r.detrazioniTotali, segno: '+', modulo: 'detrazioni-lavoro-dipendente.js',
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
      valore: r.irpefNetta, segno: '−', modulo: 'calcola-netto.js', evidenza: true,
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
      etichetta: `Addizionale regionale${r.input.regione ? ` — ${r.input.regione.nome}` : ''}`,
      valore: r.addizionaleRegionale, segno: '−', modulo: 'addizionali.js',
      passi: d.addizionaleRegionale.passi,
    }),

    rigaVoce({
      etichetta: `Addizionale comunale${comuneScelto ? ` — ${comuneScelto.nome}` : ''}`,
      valore: r.addizionaleComunale, segno: '−', modulo: 'addizionali.js',
      passi: d.addizionaleComunale.passi,
    }),

    rigaVoce({
      etichetta: 'Trattamento integrativo',
      valore: r.trattamentoIntegrativo, segno: '+', modulo: 'trattamento-integrativo.js',
      passi: d.trattamentoIntegrativo.passi,
    }),

    rigaVoce({
      etichetta: 'Somma integrativa cuneo fiscale',
      valore: r.sommaCuneo, segno: '+', modulo: 'cuneo-fiscale.js',
      passi: d.sommaCuneo.passi.length ? d.sommaCuneo.passi : [{
        titolo: 'Non spettante',
        formula: `reddito complessivo ${euro(r.redditoComplessivo)} oltre 20.000 €`,
        spiegazione: 'Sopra i 20.000 € il cuneo fiscale agisce come detrazione, '
          + 'già conteggiata fra le detrazioni sopra.',
      }],
    }),

    rigaVoce({
      etichetta: 'Netto annuo',
      valore: r.nettoAnnuo, segno: '=', modulo: 'calcola-netto.js', evidenza: true,
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
       descritte a parole non sono applicate automaticamente dal calcolo: verificale qui.</p>`
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
  const ordine = { alto: 0, medio: 1, basso: 2 };
  const voci = [...SEMPLIFICAZIONI].sort((a, b) => ordine[a.impatto] - ordine[b.impatto]);

  $('#semplificazioni').innerHTML = voci.map((s) => `
    <details class="semplificazione impatto-${s.impatto}">
      <summary>
        <span class="etichetta-tipo">${s.tipo === 'divergenza-fonti' ? 'Fonti discordi' : 'Semplificazione'}</span>
        <span class="semplificazione-titolo">${testoSicuro(s.titolo)}</span>
        <span class="etichetta-impatto">impatto ${s.impatto}</span>
      </summary>
      <p>${testoSicuro(s.descrizione)}</p>
      <p class="voce-modulo">In <code>${testoSicuro(s.modulo)}</code></p>
    </details>`).join('');

  const alti = SEMPLIFICAZIONI.filter((s) => s.impatto === 'alto').length;
  $('#conteggio-semplificazioni').textContent =
    `${SEMPLIFICAZIONI.length} voci dichiarate, di cui ${alti} con impatto rilevante`;
}

function disegnaParametri() {
  $('#parametri').innerHTML = `
    <dl class="parametri">
      <div><dt>Scaglioni IRPEF</dt><dd>${IRPEF.scaglioni
        .map((s) => `${percentuale(s.aliquota, 0)} ${s.fino === Infinity
          ? `oltre ${euroTondo(s.da)}` : `fino a ${euroTondo(s.fino)}`}`).join(' · ')}</dd></div>
      <div><dt>Aliquota INPS lavoratore</dt><dd>${percentuale(INPS.aliquotaLavoratore, 2)}
        (${percentuale(INPS.aliquotaApprendista, 2)} apprendisti)</dd></div>
      <div><dt>Prima fascia INPS</dt><dd>${euroTondo(INPS.primaFasciaAnnua)} — oltre, +1%</dd></div>
      <div><dt>Massimale contributivo</dt><dd>${euroTondo(INPS.massimaleAnnuo)}</dd></div>
      <div><dt>Aliquote addizionali</dt><dd>CSV ufficiale MEF, scaricato il ${SCARICATO_IL}</dd></div>
    </dl>`;

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
  disegnaParametri();
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

  $('#comune').addEventListener('input', () => {
    aggiornaSuggerimenti();
    if (risolviComuneDigitato() && !$('#risultato').hidden) calcolaEDisegna();
  });

  // Ogni altra modifica ricalcola, ma solo dopo il primo "Calcola".
  for (const campo of document.querySelectorAll('#modulo input, #modulo select')) {
    if (campo.id === 'ral' || campo.id === 'ral-cursore' || campo.id === 'comune') continue;
    campo.addEventListener('change', () => {
      if (!$('#risultato').hidden) calcolaEDisegna();
    });
  }
}

avvia();
