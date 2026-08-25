/**
 * MAPPA PROVINCIA → REGIONE
 * =========================
 *
 * Serve solo all'interfaccia: quando l'utente sceglie un Comune, la Regione
 * si seleziona da sola. Non entra in nessuna regola di calcolo.
 *
 * Copre tutte le 107 sigle presenti nel dataset comunale del MEF.
 * I nomi a destra devono coincidere con il campo `nome` di ALIQUOTE_REGIONALI.
 *
 * Nota: Bolzano (BZ) e Trento (TN) sono Province autonome, con addizionale
 * propria e distinta — per questo compaiono come due "regioni" separate.
 */

export const PROVINCIA_A_REGIONE = {
  // Abruzzo
  AQ: 'Abruzzo', CH: 'Abruzzo', PE: 'Abruzzo', TE: 'Abruzzo',
  // Basilicata
  MT: 'Basilicata', PZ: 'Basilicata',
  // Calabria
  CS: 'Calabria', CZ: 'Calabria', KR: 'Calabria', RC: 'Calabria', VV: 'Calabria',
  // Campania
  AV: 'Campania', BN: 'Campania', CE: 'Campania', NA: 'Campania', SA: 'Campania',
  // Emilia-Romagna
  BO: 'Emilia-Romagna', FC: 'Emilia-Romagna', FE: 'Emilia-Romagna', MO: 'Emilia-Romagna',
  PC: 'Emilia-Romagna', PR: 'Emilia-Romagna', RA: 'Emilia-Romagna', RE: 'Emilia-Romagna',
  RN: 'Emilia-Romagna',
  // Friuli-Venezia Giulia
  GO: 'Friuli-Venezia Giulia', PN: 'Friuli-Venezia Giulia', TS: 'Friuli-Venezia Giulia',
  UD: 'Friuli-Venezia Giulia',
  // Lazio
  FR: 'Lazio', LT: 'Lazio', RI: 'Lazio', RM: 'Lazio', VT: 'Lazio',
  // Liguria
  GE: 'Liguria', IM: 'Liguria', SP: 'Liguria', SV: 'Liguria',
  // Lombardia
  BG: 'Lombardia', BS: 'Lombardia', CO: 'Lombardia', CR: 'Lombardia', LC: 'Lombardia',
  LO: 'Lombardia', MB: 'Lombardia', MI: 'Lombardia', MN: 'Lombardia', PV: 'Lombardia',
  SO: 'Lombardia', VA: 'Lombardia',
  // Marche
  AN: 'Marche', AP: 'Marche', FM: 'Marche', MC: 'Marche', PU: 'Marche',
  // Molise
  CB: 'Molise', IS: 'Molise',
  // Piemonte
  AL: 'Piemonte', AT: 'Piemonte', BI: 'Piemonte', CN: 'Piemonte', NO: 'Piemonte',
  TO: 'Piemonte', VB: 'Piemonte', VC: 'Piemonte',
  // Puglia
  BA: 'Puglia', BR: 'Puglia', BT: 'Puglia', FG: 'Puglia', LE: 'Puglia', TA: 'Puglia',
  // Sardegna
  CA: 'Sardegna', NU: 'Sardegna', OR: 'Sardegna', SS: 'Sardegna', SU: 'Sardegna',
  // Sicilia
  AG: 'Sicilia', CL: 'Sicilia', CT: 'Sicilia', EN: 'Sicilia', ME: 'Sicilia',
  PA: 'Sicilia', RG: 'Sicilia', SR: 'Sicilia', TP: 'Sicilia',
  // Toscana
  AR: 'Toscana', FI: 'Toscana', GR: 'Toscana', LI: 'Toscana', LU: 'Toscana',
  MS: 'Toscana', PI: 'Toscana', PO: 'Toscana', PT: 'Toscana', SI: 'Toscana',
  // Province autonome
  BZ: 'Bolzano (Prov. aut.)', TN: 'Trento (Prov. aut.)',
  // Umbria
  PG: 'Umbria', TR: 'Umbria',
  // Valle d'Aosta
  AO: "Valle d'Aosta",
  // Veneto
  BL: 'Veneto', PD: 'Veneto', RO: 'Veneto', TV: 'Veneto', VE: 'Veneto',
  VI: 'Veneto', VR: 'Veneto',
};
