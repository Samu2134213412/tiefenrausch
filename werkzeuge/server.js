/**
 * Kleiner Entwicklungsserver für das Spiel.
 * Reicht www/ aus – reine statische Dateien, kein Bauschritt nötig.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const WURZEL = path.resolve(HIER, '..', 'www');

const TYPEN = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json; charset=utf-8',
};

/** Ermittelt die Adresse dieses Rechners im Heimnetz (für das Handy). */
export function netzwerkAdresse() {
  for (const eintraege of Object.values(os.networkInterfaces())) {
    for (const e of eintraege ?? []) {
      if (e.family === 'IPv4' && !e.internal) return e.address;
    }
  }
  return null;
}

export function starteServer(port = 0, host = '127.0.0.1') {
  const server = http.createServer((anfrage, antwort) => {
    let pfad = decodeURIComponent(new URL(anfrage.url, 'http://x').pathname);
    if (pfad === '/') pfad = '/index.html';
    const datei = path.resolve(path.join(WURZEL, pfad.replace(/^\/+/, '')));
    if (!datei.startsWith(WURZEL) || !fs.existsSync(datei) || fs.statSync(datei).isDirectory()) {
      antwort.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
      antwort.end('<h1>404</h1>');
      return;
    }
    antwort.writeHead(200, {
      'content-type': TYPEN[path.extname(datei)] ?? 'application/octet-stream',
      'cache-control': 'no-store',
    });
    fs.createReadStream(datei).pipe(antwort);
  });
  return new Promise((fertig) => {
    server.listen(port, host, () => {
      const adresse = `http://127.0.0.1:${server.address().port}`;
      fertig({ server, adresse, stop: () => new Promise((f) => server.close(f)) });
    });
  });
}

import { pathToFileURL } from 'node:url';

// Direkt gestartet (nicht importiert)? Dann Server hochfahren.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  // Auf allen Schnittstellen lauschen, damit das Handy im selben WLAN mitspielen kann.
  await starteServer(5173, '0.0.0.0');
  const netz = netzwerkAdresse();
  console.log('');
  console.log('  Tiefenrausch läuft');
  console.log('    am Rechner:  http://127.0.0.1:5173');
  if (netz) console.log('    am Handy:    http://' + netz + ':5173   (gleiches WLAN)');
  console.log('');
  console.log('  Beenden mit Strg+C');
  console.log('');
}
