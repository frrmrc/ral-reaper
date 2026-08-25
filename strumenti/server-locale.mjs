/**
 * SERVER LOCALE DI SVILUPPO
 * =========================
 *
 * Serve i file statici del progetto su http://localhost:4173
 * Uso:  npm run dev
 *
 * Serve perché i moduli ES e il caricamento del JSON dei comuni non
 * funzionano aprendo index.html con doppio clic (protocollo file://).
 * In produzione questo file non viene usato: Vercel serve i file direttamente.
 */

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const RADICE = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const PORTA = Number(process.env.PORT) || 4173;

const TIPI = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.md': 'text/markdown; charset=utf-8',
};

createServer(async (richiesta, risposta) => {
  const percorso = decodeURIComponent(new URL(richiesta.url, 'http://localhost').pathname);
  const relativo = percorso === '/' ? 'index.html' : percorso.slice(1);

  // Impedisce di uscire dalla cartella del progetto con "../"
  const file = join(RADICE, normalize(relativo).replace(/^(\.\.[/\\])+/, ''));

  try {
    const contenuto = await readFile(file);
    risposta.writeHead(200, {
      'Content-Type': TIPI[extname(file)] ?? 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    risposta.end(contenuto);
  } catch {
    risposta.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    risposta.end(`404 — non trovato: ${relativo}`);
  }
}).listen(PORTA, () => {
  console.log(`Server attivo su http://localhost:${PORTA}`);
});
