/**
 * ADDIZIONALI IRPEF REGIONALE E COMUNALE
 * ======================================
 *
 * Sono due tributi DISTINTI, dovuti a enti diversi, ma con la stessa base di
 * calcolo dell'IRPEF nazionale: il reddito imponibile (RAL − contributi INPS).
 * NON si calcolano sulla RAL e NON si calcolano sull'IRPEF.
 *
 * Si applicano per ultime nella catena:
 *
 *      ... = IRPEF netta
 *      − addizionale regionale   (aliquota regione × imponibile IRPEF)
 *      − addizionale comunale    (aliquota comune  × imponibile IRPEF)
 *      = base del netto
 *
 * REGOLA DI SBARRAMENTO: entrambe sono dovute solo se per lo stesso anno
 * risulta dovuta l'IRPEF. Se le detrazioni azzerano l'imposta, le addizionali
 * non si pagano.
 *
 * Fonte: docs/Addizionali_IRPEF_da_sottrarre_nel_calcolo_Netto_da_RAL.md
 *        Art. 50 D.Lgs. 446/1997 (regionale) — D.Lgs. 360/1998 (comunale)
 *
 * Le aliquote NON sono scritte qui: arrivano dai dataset generati dai CSV
 * ufficiali del MEF (vedi strumenti/aggiorna-aliquote.mjs).
 */

/**
 * Applica una serie di fasce progressive, ciascuna sulla sola quota di reddito
 * che le compete — esattamente come gli scaglioni IRPEF.
 *
 * @param {number} imponibile
 * @param {Array<{da:number, a:number|null, aliquota:number}>} fasce  aliquote in percentuale
 */
export function applicaFasceProgressive(imponibile, fasce) {
  let totale = 0;
  const dettaglio = [];

  for (const fascia of fasce) {
    const limiteSuperiore = fascia.a ?? Infinity;
    const quota = Math.max(0, Math.min(imponibile, limiteSuperiore) - fascia.da);
    if (quota <= 0) continue;

    const imposta = quota * (fascia.aliquota / 100);
    totale += imposta;
    dettaglio.push({
      da: fascia.da,
      a: fascia.a,
      aliquota: fascia.aliquota,
      quotaTassata: quota,
      imposta,
    });
  }

  return { totale, dettaglio };
}

/**
 * ADDIZIONALE REGIONALE
 *
 * @param {object} input
 * @param {number} input.imponibile   reddito imponibile IRPEF
 * @param {object} input.regione      voce del dataset ALIQUOTE_REGIONALI
 * @param {boolean} input.irpefDovuta se false l'addizionale non è dovuta
 */
export function calcolaAddizionaleRegionale({ imponibile, regione, irpefDovuta = true }) {
  const passi = [];

  if (!regione || imponibile <= 0 || !irpefDovuta) {
    passi.push({
      titolo: 'Addizionale regionale non dovuta',
      formula: '0 €',
      spiegazione: !irpefDovuta
        ? "Le detrazioni azzerano l'IRPEF: senza imposta dovuta non si pagano le addizionali."
        : 'Nessun reddito imponibile.',
      valore: 0,
    });
    return { totale: 0, passi, dettaglio: [] };
  }

  const { totale, dettaglio } = applicaFasceProgressive(imponibile, regione.fasce);

  passi.push({
    titolo: `Addizionale regionale — ${regione.nome}`,
    formula: dettaglio
      .map((d) => `${d.quotaTassata.toFixed(2)} × ${d.aliquota}% = ${d.imposta.toFixed(2)}`)
      .join('  +  ') || '0 €',
    spiegazione: `Delibera n. ${regione.delibera} del ${regione.dataPubblicazione}. `
      + `Aliquota media effettiva: ${((totale / imponibile) * 100).toFixed(2)}%.`,
    valore: totale,
  });

  return { totale, passi, dettaglio, disposizione: regione.disposizione };
}

/**
 * ADDIZIONALE COMUNALE
 *
 * Rispetto alla regionale ha una particolarità: molti Comuni fissano una
 * SOGLIA DI ESENZIONE. Non funziona come una franchigia: se il reddito supera
 * la soglia, l'addizionale è dovuta sull'INTERO imponibile, non solo
 * sull'eccedenza. Sotto la soglia non si paga nulla.
 *
 * @param {object} input
 * @param {number} input.imponibile
 * @param {object} input.comune       voce del dataset dei comuni
 * @param {boolean} input.irpefDovuta
 */
export function calcolaAddizionaleComunale({ imponibile, comune, irpefDovuta = true }) {
  const passi = [];

  if (!comune || imponibile <= 0 || !irpefDovuta) {
    passi.push({
      titolo: 'Addizionale comunale non dovuta',
      formula: '0 €',
      spiegazione: !irpefDovuta
        ? "Le detrazioni azzerano l'IRPEF: senza imposta dovuta non si pagano le addizionali."
        : 'Nessun comune selezionato o reddito imponibile nullo.',
      valore: 0,
    });
    return { totale: 0, passi, dettaglio: [] };
  }

  // --- Soglia di esenzione ------------------------------------------------
  if (comune.esenzione > 0 && imponibile <= comune.esenzione) {
    passi.push({
      titolo: `Esenzione comunale — ${comune.nome}`,
      formula: `${imponibile.toFixed(2)} ≤ ${comune.esenzione.toFixed(2)} → 0 €`,
      spiegazione: `Il Comune esenta i redditi imponibili fino a ${comune.esenzione.toLocaleString('it-IT')} €. `
        + "Attenzione: è una soglia, non una franchigia — superata di un euro, l'addizionale "
        + "si paga sull'intero reddito.",
      valore: 0,
    });
    return { totale: 0, passi, dettaglio: [], esente: true };
  }

  if (comune.fasce.length === 0) {
    passi.push({
      titolo: `Addizionale comunale — ${comune.nome}`,
      formula: '0 €',
      spiegazione: 'Il Comune non applica alcuna addizionale comunale.',
      valore: 0,
    });
    return { totale: 0, passi, dettaglio: [] };
  }

  const { totale, dettaglio } = applicaFasceProgressive(imponibile, comune.fasce);

  passi.push({
    titolo: `Addizionale comunale — ${comune.nome} (${comune.provincia})`,
    formula: dettaglio
      .map((d) => `${d.quotaTassata.toFixed(2)} × ${d.aliquota}% = ${d.imposta.toFixed(2)}`)
      .join('  +  '),
    spiegazione: comune.annoDato !== undefined && comune.annoDato < 2026
      ? `Il Comune non ha ancora pubblicato la delibera per il 2026: si usa l'aliquota ${comune.annoDato}.`
      : `Aliquota effettiva: ${((totale / imponibile) * 100).toFixed(2)}%.`,
    valore: totale,
  });

  return { totale, passi, dettaglio, annoDato: comune.annoDato };
}
