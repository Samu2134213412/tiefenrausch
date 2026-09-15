/**
 * Baut das itch.io-Titelbild (630x500, siehe itch.io-Empfehlung) aus
 * titelbild-quelle.html - handgezeichnet mit CSS/SVG, kein Emoji, kein KI-Bild.
 * Rendert mit doppelter Auflösung (deviceScaleFactor 2) für einen scharfen
 * Eindruck auch auf hochauflösenden Bildschirmen.
 */
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const WURZEL = path.join(HIER, '..', '..');
const quelle = pathToFileURL(path.join(HIER, 'titelbild-quelle.html')).href;
const ziel = path.join(WURZEL, 'itch-titelbild.png');

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 630, height: 500 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
await p.goto(quelle, { waitUntil: 'networkidle' });
await p.waitForTimeout(150);
await p.screenshot({ path: ziel });
await ctx.close();
await b.close();
console.log(`Titelbild -> ${path.basename(ziel)} (1260x1000, für itch.io als 630x500 gedacht)`);
