/**
 * GRAFICI — SVG generato a mano, nessuna libreria
 * ===============================================
 *
 * Ogni funzione riceve il risultato del calcolo e restituisce una stringa SVG
 * (o HTML per i grafici che affiancano una legenda). I colori arrivano dalle
 * variabili CSS, così i grafici seguono il tema chiaro o scuro senza
 * duplicare la palette.
 *
 * Tre grafici, tre domande diverse:
 *   ripartizioneRal → in che proporzione si divide la RAL?
 *   curva           → come cambia il netto al variare della RAL, e dove sono io?
 *   scaglioni       → perché l'IRPEF non è una percentuale unica?
 */

import { euroTondo, numero, percentuale, testoSicuro } from './formato.js';

/* ------------------------------------------------------------------ *
 * Ciambelle (donut): helper geometrico condiviso
 * ------------------------------------------------------------------ */

/** Un punto sulla circonferenza di raggio `raggio`, ad `angolo` radianti dalle 12. */
function puntoSuCerchio(cx, cy, raggio, angolo) {
  return [cx + raggio * Math.sin(angolo), cy - raggio * Math.cos(angolo)];
}

/** Il tracciato SVG di una fetta di ciambella, fra due angoli espressi in radianti. */
function tracciatoFettaDonut(cx, cy, raggioEsterno, raggioInterno, angoloIniziale, angoloFinale) {
  const arcoIntero = angoloFinale - angoloIniziale >= Math.PI * 2 - 1e-6;
  // Un cerchio pieno non si può disegnare con un solo arco SVG: si spezza in due semicerchi.
  if (arcoIntero) angoloFinale -= 1e-4;

  const [x1, y1] = puntoSuCerchio(cx, cy, raggioEsterno, angoloIniziale);
  const [x2, y2] = puntoSuCerchio(cx, cy, raggioEsterno, angoloFinale);
  const [x3, y3] = puntoSuCerchio(cx, cy, raggioInterno, angoloFinale);
  const [x4, y4] = puntoSuCerchio(cx, cy, raggioInterno, angoloIniziale);
  const arcoLungo = angoloFinale - angoloIniziale > Math.PI ? 1 : 0;

  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} `
    + `A ${raggioEsterno} ${raggioEsterno} 0 ${arcoLungo} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} `
    + `L ${x3.toFixed(2)} ${y3.toFixed(2)} `
    + `A ${raggioInterno} ${raggioInterno} 0 ${arcoLungo} 0 ${x4.toFixed(2)} ${y4.toFixed(2)} Z`;
}

/* ------------------------------------------------------------------ *
 * 1. RIPARTIZIONE DELLA RAL — quanto va a ciascuna voce, in proporzione
 * ------------------------------------------------------------------ */

/**
 * Le cinque fette sommano ESATTAMENTE alla RAL: sono le trattenute più la
 * quota che resta. Il trattamento integrativo e il cuneo fiscale non sono
 * fette di RAL — sono somme aggiunte dal datore che non provengono dalla
 * RAL — e per questo compaiono come nota a parte sotto la torta, non come
 * spicchio: includerli nella torta ne romperebbe il significato di "come si
 * divide la RAL" (la somma degli spicchi non farebbe più 100%).
 */
export function graficoRipartizioneRal(r) {
  const nettoDaRal = r.ral - r.totaleTrattenute;

  const voci = [
    { chiave: 'inps', etichetta: 'Contributi INPS', valore: r.contributiInps },
    { chiave: 'irpef', etichetta: 'IRPEF netta', valore: r.irpefNetta },
    { chiave: 'regionale', etichetta: 'Addizionale regionale', valore: r.addizionaleRegionale },
    { chiave: 'comunale', etichetta: 'Addizionale comunale', valore: r.addizionaleComunale },
    { chiave: 'netto', etichetta: 'Netto da RAL', valore: nettoDaRal },
  ].filter((v) => v.valore > 0.005);

  const cx = 120, cy = 120, raggioEsterno = 100, raggioInterno = 58;

  let angolo = 0;
  const fette = voci.map((v) => {
    const quota = v.valore / r.ral;
    const ampiezza = quota * Math.PI * 2;
    const tracciato = tracciatoFettaDonut(cx, cy, raggioEsterno, raggioInterno, angolo, angolo + ampiezza);
    angolo += ampiezza;

    return `
      <path class="fetta-ral fetta-ral-${v.chiave}" d="${tracciato}">
        <title>${testoSicuro(v.etichetta)}: ${euroTondo(v.valore)} (${percentuale(quota)} della RAL)</title>
      </path>`;
  }).join('');

  const donut = `
    <svg class="grafico-torta-ral" viewBox="0 0 240 240" role="img"
         aria-label="Ripartizione della RAL fra trattenute e netto">
      ${fette}
      <text class="torta-centro-etichetta" x="${cx}" y="${cy - 10}" text-anchor="middle">RAL</text>
      <text class="torta-centro-valore" x="${cx}" y="${cy + 14}" text-anchor="middle">
        ${euroTondo(r.ral)}
      </text>
    </svg>`;

  const legenda = `
    <ul class="ral-legenda">
      ${voci.map((v) => `
        <li>
          <span class="legenda-pallino fetta-ral-${v.chiave}"></span>
          <span class="legenda-fascia">${testoSicuro(v.etichetta)}</span>
          <span class="legenda-numeri">
            <span class="legenda-quota">${percentuale(v.valore / r.ral)}</span>
            <span class="legenda-imposta">${euroTondo(v.valore)}</span>
          </span>
        </li>`).join('')}
    </ul>`;

  const notaErogazioni = r.totaleErogazioni > 0.005 ? `
    <p class="ral-nota-erogazioni">
      + ${euroTondo(r.totaleErogazioni)} di trattamento integrativo e cuneo fiscale si aggiungono
      in busta paga, senza tassazione: non sono una fetta della RAL, ma portano il netto reale a
      <strong>${euroTondo(r.nettoAnnuo)}</strong>.
    </p>` : '';

  return `<div class="ral-vista">${donut}${legenda}</div>${notaErogazioni}`;
}

/* ------------------------------------------------------------------ *
 * 2. CURVA — netto e pressione fiscale al variare della RAL
 * ------------------------------------------------------------------ */

/**
 * @param {Array<{ral:number, netto:number, pressione:number}>} punti
 * @param {number} ralCorrente
 */
export function graficoCurva(punti, ralCorrente) {
  const L = 900, A = 380;
  const margine = { alto: 28, basso: 46, sinistro: 66, destro: 58 };
  const larghezzaUtile = L - margine.sinistro - margine.destro;
  const altezzaUtile = A - margine.alto - margine.basso;

  const ralMax = punti[punti.length - 1].ral;
  const nettoMax = Math.max(...punti.map((p) => p.netto)) * 1.05;

  const x = (ral) => margine.sinistro + larghezzaUtile * (ral / ralMax);
  const yNetto = (n) => margine.alto + altezzaUtile * (1 - n / nettoMax);
  const yPressione = (p) => margine.alto + altezzaUtile * (1 - p / 0.6);   // scala destra 0-60%

  const linea = (accessore, scala) =>
    punti.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.ral).toFixed(1)},${scala(accessore(p)).toFixed(1)}`).join(' ');

  const areaNetto = `${linea((p) => p.netto, yNetto)} L${x(ralMax).toFixed(1)},${yNetto(0).toFixed(1)} `
    + `L${x(0).toFixed(1)},${yNetto(0).toFixed(1)} Z`;

  // Griglia e assi
  const tacchePer = 6;
  const griglia = Array.from({ length: tacchePer + 1 }, (_, i) => {
    const ral = (ralMax / tacchePer) * i;
    const px = x(ral);
    return `
      <line class="griglia" x1="${px.toFixed(1)}" y1="${margine.alto}"
            x2="${px.toFixed(1)}" y2="${margine.alto + altezzaUtile}" />
      <text class="asse-etichetta" x="${px.toFixed(1)}" y="${A - margine.basso + 20}" text-anchor="middle">
        ${numero(ral / 1000)}k
      </text>`;
  }).join('');

  const tacchePerY = 4;
  const grigliaY = Array.from({ length: tacchePerY + 1 }, (_, i) => {
    const valore = (nettoMax / tacchePerY) * i;
    const py = yNetto(valore);
    return `
      <line class="griglia" x1="${margine.sinistro}" y1="${py.toFixed(1)}"
            x2="${L - margine.destro}" y2="${py.toFixed(1)}" />
      <text class="asse-etichetta" x="${margine.sinistro - 10}" y="${(py + 4).toFixed(1)}" text-anchor="end">
        ${numero(valore / 1000)}k
      </text>
      <text class="asse-etichetta asse-destro" x="${L - margine.destro + 10}" y="${(py + 4).toFixed(1)}" text-anchor="start">
        ${percentuale((0.6 / tacchePerY) * i, 0)}
      </text>`;
  }).join('');

  // Marcatore sulla RAL scelta
  const corrente = punti.reduce((migliore, p) =>
    Math.abs(p.ral - ralCorrente) < Math.abs(migliore.ral - ralCorrente) ? p : migliore, punti[0]);

  const marcatore = ralCorrente > 0 && ralCorrente <= ralMax ? `
      <line class="marcatore-linea" x1="${x(ralCorrente).toFixed(1)}" y1="${margine.alto}"
            x2="${x(ralCorrente).toFixed(1)}" y2="${margine.alto + altezzaUtile}" />
      <circle class="marcatore-punto" cx="${x(ralCorrente).toFixed(1)}"
              cy="${yNetto(corrente.netto).toFixed(1)}" r="6" />
      <circle class="marcatore-punto marcatore-pressione" cx="${x(ralCorrente).toFixed(1)}"
              cy="${yPressione(corrente.pressione).toFixed(1)}" r="5" />` : '';

  return `
    <svg class="grafico grafico-curva" viewBox="0 0 ${L} ${A}" role="img"
         aria-label="Andamento del netto annuo e della pressione fiscale al variare della RAL">
      <defs>
        <!-- Le fermate prendono il colore dal CSS: la sfumatura sotto la curva
             resta agganciata alla stessa variabile della linea. -->
        <linearGradient id="velo-netto" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" class="velo-netto-alto" />
          <stop offset="100%" class="velo-netto-basso" />
        </linearGradient>
      </defs>
      ${grigliaY}
      ${griglia}
      <path class="curva-area" d="${areaNetto}" />
      <path class="curva-netto" d="${linea((p) => p.netto, yNetto)}" />
      <path class="curva-pressione" d="${linea((p) => p.pressione, yPressione)}" />
      ${marcatore}
      <text class="asse-titolo" x="${margine.sinistro}" y="${A - 8}">RAL annua</text>
      <text class="asse-titolo asse-titolo-netto" x="${margine.sinistro}" y="${margine.alto - 10}">
        Netto annuo
      </text>
      <text class="asse-titolo asse-titolo-pressione" x="${L - margine.destro}" y="${margine.alto - 10}"
            text-anchor="end">
        Pressione fiscale
      </text>
    </svg>`;
}

/* ------------------------------------------------------------------ *
 * 3. SCAGLIONI IRPEF — la progressività resa visibile
 * ------------------------------------------------------------------ */

export function graficoScaglioni(r) {
  const scaglioni = r.dettaglio.irpef.scaglioni;
  if (scaglioni.length === 0) {
    return '<p class="nota-vuota">Con questo reddito non si genera IRPEF lorda.</p>';
  }

  const totaleImponibile = r.imponibile;
  const L = 900;
  const altezzaRiga = 62;
  const A = scaglioni.length * altezzaRiga + 30;
  // margine.destro ospita un blocco a DUE RIGHE (quota tassata + imposta),
  // ancorato a una x fissa indipendente dalla larghezza della barra: è quella
  // larghezza variabile, in un layout a una sola riga, a far scontrare il
  // testo della quota con quello dell'imposta quando la barra è molto larga
  // (tipicamente il primo scaglione, il caso più comune).
  const margine = { sinistro: 150, destro: 190 };
  const larghezzaUtile = L - margine.sinistro - margine.destro;
  const xBloccoDestro = L - 16;

  const righe = scaglioni.map((s, i) => {
    const y = i * altezzaRiga + 16;
    const larghezza = larghezzaUtile * (s.quotaTassata / totaleImponibile);
    const intensita = s.aliquota;   // 0.23 / 0.33 / 0.43

    return `
      <g class="scaglione" style="--aliquota:${intensita}">
        <title>${euroTondo(s.quotaTassata)} tassati al ${percentuale(s.aliquota, 0)} = ${euroTondo(s.imposta)}</title>
        <text class="scaglione-fascia" x="${margine.sinistro - 14}" y="${y + 26}" text-anchor="end">
          ${testoSicuro(s.etichetta)}
        </text>
        <rect class="scaglione-barra" x="${margine.sinistro}" y="${y + 8}"
              width="${Math.max(2, larghezza).toFixed(1)}" height="26" rx="4" />
        <text class="scaglione-aliquota" x="${(margine.sinistro + 10).toFixed(1)}" y="${y + 26}">
          ${percentuale(s.aliquota, 0)}
        </text>
        <text class="scaglione-quota" x="${xBloccoDestro}" y="${y + 16}">
          ${euroTondo(s.quotaTassata)} di imponibile
        </text>
        <text class="scaglione-imposta" x="${xBloccoDestro}" y="${y + 36}">
          ${euroTondo(s.imposta)} di imposta
        </text>
      </g>`;
  }).join('');

  return `
    <svg class="grafico grafico-scaglioni" viewBox="0 0 ${L} ${A}" role="img"
         aria-label="Ripartizione del reddito imponibile fra gli scaglioni IRPEF">
      ${righe}
    </svg>`;
}
