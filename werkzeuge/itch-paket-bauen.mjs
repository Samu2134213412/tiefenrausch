/**
 * Baut eine hochladbare ZIP-Datei für itch.io aus www/.
 *
 * Anders als bei Poki braucht itch.io keine eigene SDK-Einbindung und keine
 * separate Kopie - itch.io zeigt die Dateien einfach unverändert im Browser
 * an. Deshalb wird hier direkt aus www/ gezippt, ohne Zwischenschritt.
 */
import { rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { erzeugeZip } from './zip-erzeugen.mjs';

const HIER = dirname(fileURLToPath(import.meta.url));
const WURZEL = resolve(HIER, '..');
const QUELLE = resolve(WURZEL, 'www');
const ZIP = resolve(WURZEL, 'itch-paket.zip');

console.log('Erzeuge itch-paket.zip aus www/ ...');
rmSync(ZIP, { force: true });
const anzahl = erzeugeZip(QUELLE, ZIP);
console.log(`Fertig: itch-paket.zip (${anzahl} Dateien)`);

console.log('');
console.log('Nächste Schritte (nur von dir möglich, nicht automatisierbar):');
console.log('  1. Kostenloses Konto anlegen: https://itch.io/register (ab 13 Jahren)');
console.log('  2. "Upload new project" -> itch-paket.zip hochladen');
console.log('  3. Kind of project: "HTML" wählen, "This file will be played in the browser" ankreuzen');
console.log('  4. Viewport-Größe einstellen (z. B. 480x854, "Mobile friendly" anhaken)');
