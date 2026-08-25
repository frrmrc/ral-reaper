/**
 * GRAFICI — SVG generato a mano, nessuna libreria
 * ===============================================
 *
 * Ogni funzione riceve il risultato del calcolo e restituisce una stringa SVG.
 * I colori arrivano dalle variabili CSS, così i grafici seguono il tema chiaro
 * o scuro senza duplicare la palette.
 *
 * Tre grafici, tre domande diverse:
 *   cascata    → dove finisce ogni euro della RAL?
 *   curva      → come cambia il netto al variare della RAL, e dove sono io?
 *   scaglioni  → perché l'IRPEF non è una percentuale unica?
 */

import { euroTondo, numero, percentuale, testoSicuro } from './formato.js';

/* ------------------------------------------------------------------ *
 * 1. CASCATA — dalla RAL al netto, voce per voce
 * ------------------------------------------------------------------ */

export function graficoCascata(r) {
  const voci = [
    { etichetta: 'RAL', valore: r.ral, tipo: 'totale' },
    { etichetta: 'Contributi INPS', valore: -r.contributiInps, tipo: 'trattenuta' },
    { etichetta: 'IRPEF netta', valore: -r.irpefNetta, tipo: 'trattenuta' },
    { etichetta: 'Add. regionale', valore: -r.addizionaleRegionale, tipo: 'trattenuta' },
    { etichetta: 'Add. comunale', valore: -r.addizionaleComunale, tipo: 'trattenuta' },
    { etichetta: 'Tratt. integrativo', valore: r.trattamentoIntegrativo, tipo: 'erogazione' },
    { etichetta: 'Cuneo fiscale', valore: r.sommaCuneo, tipo: 'erogazione' },
    { etichetta: 'Netto', valore: r.nettoAnnuo, tipo: 'totale' },
  ].filter((v) => v.tipo === 'totale' || Math.abs(v.valore) > 0.005);

  const L = 900, A = 340;                      // area di disegno
  const margine = { alto: 24, basso: 78, sinistro: 8, destro: 8 };
  const altezzaUtile = A - margine.alto - margine.basso;

  const massimo = Math.max(r.ral, r.nettoAnnuo) * 1.06;
  const y = (v) => margine.alto + altezzaUtile * (1 - v / massimo);

  const larghezzaColonna = (L - margine.sinistro - margine.destro) / voci.length;
  const larghezzaBarra = Math.min(78, larghezzaColonna * 0.6);

  let cumulato = 0;
  const barre = [];

  for (const [i, voce] of voci.entries()) {
    const centro = margine.sinistro + larghezzaColonna * (i + 0.5);
    const x = centro - larghezzaBarra / 2;

    let daValore, aValore;
    if (voce.tipo === 'totale') {
      daValore = 0;
      aValore = voce.valore;
      cumulato = voce.valore;
    } else {
      daValore = cumulato;
      aValore = cumulato + voce.valore;
      cumulato = aValore;
    }

    const alto = Math.min(y(daValore), y(aValore));
    const altezza = Math.max(2, Math.abs(y(daValore) - y(aValore)));

    barre.push({ ...voce, x, centro, alto, altezza, cumulato, larghezza: larghezzaBarra });
  }

  const connettori = barre.slice(0, -1).map((b, i) => {
    const successiva = barre[i + 1];
    if (successiva.tipo === 'totale') return '';
    const yLinea = y(b.cumulato);
    return `<line class="cascata-connettore" x1="${(b.x + b.larghezza).toFixed(1)}" y1="${yLinea.toFixed(1)}"
             x2="${successiva.x.toFixed(1)}" y2="${yLinea.toFixed(1)}" />`;
  }).join('');

  const rettangoli = barre.map((b) => {
    const segno = b.tipo === 'trattenuta' ? '−' : b.tipo === 'erogazione' ? '+' : '';
    const valoreAssoluto = Math.abs(b.valore);
    return `
      <g class="cascata-voce cascata-${b.tipo}">
        <title>${testoSicuro(b.etichetta)}: ${segno}${euroTondo(valoreAssoluto)}</title>
        <rect x="${b.x.toFixed(1)}" y="${b.alto.toFixed(1)}"
              width="${b.larghezza.toFixed(1)}" height="${b.altezza.toFixed(1)}" rx="3" />
        <text class="cascata-valore" x="${b.centro.toFixed(1)}" y="${(b.alto - 8).toFixed(1)}">
          ${segno}${euroTondo(valoreAssoluto)}
        </text>
        <text class="cascata-etichetta" x="${b.centro.toFixed(1)}" y="${A - margine.basso + 22}">
          ${testoSicuro(b.etichetta)}
        </text>
      </g>`;
  }).join('');

  return `
    <svg class="grafico grafico-cascata" viewBox="0 0 ${L} ${A}" role="img"
         aria-label="Cascata dalla RAL al netto annuo">
      <line class="asse" x1="${margine.sinistro}" y1="${y(0).toFixed(1)}"
            x2="${L - margine.destro}" y2="${y(0).toFixed(1)}" />
      ${connettori}
      ${rettangoli}
    </svg>`;
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
  const margine = { sinistro: 150, destro: 140 };
  const larghezzaUtile = L - margine.sinistro - margine.destro;

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
        <text class="scaglione-imposta" x="${L - margine.destro + 12}" y="${y + 26}">
          ${euroTondo(s.imposta)}
        </text>
        <text class="scaglione-quota" x="${(margine.sinistro + Math.max(2, larghezza) + 10).toFixed(1)}" y="${y + 26}">
          su ${euroTondo(s.quotaTassata)}
        </text>
      </g>`;
  }).join('');

  return `
    <svg class="grafico grafico-scaglioni" viewBox="0 0 ${L} ${A}" role="img"
         aria-label="Ripartizione del reddito imponibile fra gli scaglioni IRPEF">
      ${righe}
    </svg>`;
}
