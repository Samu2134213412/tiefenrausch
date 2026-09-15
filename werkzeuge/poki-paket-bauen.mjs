/**
 * Baut ein eigenständiges Paket für die Einreichung bei Poki
 * (developers.poki.com), getrennt von der normalen www/-Fassung.
 *
 * Warum eine eigene Kopie statt einfach www/ einzureichen: Das Poki-SDK-
 * Script simuliert Werbung auch außerhalb von Pokis eigenem Iframe (zum
 * Testen) - stünde es direkt in www/index.html, würde es auf GitHub Pages
 * und in der Android-App die echte AdMob-Anbindung verdrängen. Deshalb
 * bekommt nur diese Kopie das Script eingefügt, www/ bleibt unverändert.
 *
 * Ergebnis: poki-paket/ (Ordner, bereit zum Testen) und poki-paket.zip
 * (Datei zum Hochladen im Poki-Entwicklerportal).
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { erzeugeZip } from './zip-erzeugen.mjs';

const HIER = dirname(fileURLToPath(import.meta.url));
const WURZEL = resolve(HIER, '..');
const QUELLE = resolve(WURZEL, 'www');
const ZIEL = resolve(WURZEL, 'poki-paket');
const ZIP = resolve(WURZEL, 'poki-paket.zip');

const POKI_SCRIPT_TAG =
  '<script src="https://game-cdn.poki.com/scripts/v2/poki-sdk.js"></script>\n</head>';

console.log('Kopiere www/ nach poki-paket/ ...');
rmSync(ZIEL, { recursive: true, force: true });
mkdirSync(ZIEL, { recursive: true });
cpSync(QUELLE, ZIEL, { recursive: true });

console.log('Füge das Poki-SDK-Script in die Kopie ein ...');
const indexPfad = resolve(ZIEL, 'index.html');
const html = readFileSync(indexPfad, 'utf8');
if (!html.includes('</head>')) {
  throw new Error('index.html hat kein </head> - Skript kann nicht eingefügt werden.');
}
writeFileSync(indexPfad, html.replace('</head>', POKI_SCRIPT_TAG), 'utf8');

console.log('Erzeuge poki-paket.zip ...');
rmSync(ZIP, { force: true });
const anzahl = erzeugeZip(ZIEL, ZIP);
console.log(`Fertig: poki-paket.zip (${anzahl} Dateien)`);

console.log('');
console.log('Nächste Schritte (nur von dir/euch möglich, nicht automatisierbar):');
console.log('  1. Konto anlegen: https://developers.poki.com');
console.log('  2. Neues Spiel einreichen, poki-paket.zip hochladen');
console.log('  3. Zum Testen vorher: poki-paket/ lokal öffnen (z. B. "npm start" auf diesen Ordner zeigen)');
