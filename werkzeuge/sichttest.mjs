/**
 * Sichtprüfung: spielt das Spiel in einem echten Browser durch und
 * hält verschiedene Fortschrittsstufen als Bild fest.
 *
 * Aufruf:  node werkzeuge/sichttest.mjs [zielverzeichnis]
 *
 * Zweck: Zahlen in Tests sagen nichts darüber, ob die Oberfläche auch dann
 * noch trägt, wenn dort „1,23 Bio.“ steht und zehn Module untereinander liegen.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { starteServer } from './server.js';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const ZIEL = path.resolve(process.argv[2] ?? path.join(HIER, '..', 'bilder-test'));

const fehler = [];

async function main() {
  fs.mkdirSync(ZIEL, { recursive: true });
  const server = await starteServer(0);
  const browser = await chromium.launch();
  const kontext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
    locale: 'de-DE',
  });
  const seite = await kontext.newPage();
  seite.on('pageerror', (e) => fehler.push(`SEITENFEHLER: ${e.message}`));
  seite.on('console', (m) => {
    if (m.type() === 'error') fehler.push(`KONSOLE: ${m.text()}`);
  });

  const bild = async (name) => {
    await seite.waitForTimeout(450);
    await seite.screenshot({ path: path.join(ZIEL, `${name}.png`) });
    console.log(`  Bild: ${name}.png`);
  };

  /**
   * Robust antippen: Ein Antippen kann eine Entdeckung auslösen, deren Dialog
   * sofort über der Tippfläche liegt und den nächsten Klick blockieren würde.
   * Dieser Helfer schließt einen offenen Dialog zuerst weg.
   */
  async function tippeSicher(x, y) {
    const knopf = seite.locator('#entdeckung-ok');
    if (await knopf.isVisible().catch(() => false)) {
      await knopf.click();
      await seite.waitForTimeout(120);
    }
    await seite.locator('#tippflaeche').click({ position: { x, y }, force: true });
  }

  await seite.goto(server.adresse, { waitUntil: 'networkidle' });
  await seite.waitForTimeout(700);

  /* --- 1. Spielbeginn --- */
  console.log('\n1. Spielbeginn');
  await bild('01-start');

  /* --- 2. Nach den ersten Tipps --- */
  console.log('2. Erste Tipps und Käufe');
  for (let i = 0; i < 25; i++) {
    await tippeSicher(195, 250);
  }
  // Offene Entdeckung wegklicken, dann erstes Modul kaufen.
  await tippeSicher(195, 250);
  const entdeckungKnopf = seite.locator('#entdeckung-ok');
  if (await entdeckungKnopf.isVisible().catch(() => false)) await entdeckungKnopf.click();
  await seite.waitForTimeout(150);
  await seite.locator('#liste-module button').first().click();
  await bild('02-erste-tipps');

  /* --- 2a. Leuchtblase (Koordinatenprüfung: Funken müssen exakt am Finger
     erscheinen, nicht um die Höhe der Kopfzeile versetzt) --- */
  console.log('2a. Leuchtblase');
  await seite.evaluate(() => globalThis.tiefenrausch.zeigeLeuchtblaseJetzt());
  await seite.waitForTimeout(200);
  await seite.screenshot({ path: path.join(ZIEL, '02a-leuchtblase-treibt.png') });
  console.log('  Bild: 02a-leuchtblase-treibt.png');
  const blasenPosition = await seite.evaluate(() => {
    const r = document.getElementById('leuchtblase').getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
  });
  await seite.locator('#leuchtblase').click({ position: { x: 25, y: 25 }, force: true });
  await seite.waitForTimeout(40); // mitten im Funkenausbruch, bevor er verblasst
  await seite.screenshot({ path: path.join(ZIEL, '02a-leuchtblase-eingesammelt.png') });
  console.log(`  Bild: 02a-leuchtblase-eingesammelt.png (angetippt bei x=${blasenPosition.x}, y=${blasenPosition.y})`);
  await seite.waitForTimeout(400);

  /* --- 2d. Glücksfisch (Koordinatenprüfung wie bei der Leuchtblase) --- */
  console.log('2d. Glücksfisch');
  await seite.evaluate(() => globalThis.tiefenrausch.zeigeGluecksfischJetzt());
  await seite.waitForTimeout(250);
  await seite.screenshot({ path: path.join(ZIEL, '02d-gluecksfisch-schwimmt.png') });
  console.log('  Bild: 02d-gluecksfisch-schwimmt.png');
  const fischPosition = await seite.evaluate(() => {
    const r = document.getElementById('gluecksfisch').getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
  });
  await seite.locator('#gluecksfisch').click({ position: { x: 27, y: 27 }, force: true });
  await seite.waitForTimeout(40);
  await seite.screenshot({ path: path.join(ZIEL, '02d-gluecksfisch-gefangen.png') });
  console.log(`  Bild: 02d-gluecksfisch-gefangen.png (angetippt bei x=${fischPosition.x}, y=${fischPosition.y})`);
  await seite.waitForTimeout(400);

  /* --- 2b. Kombo aufbauen --- */
  console.log('2b. Kombo');
  for (let i = 0; i < 8; i++) {
    await tippeSicher(195, 320);
    await seite.waitForTimeout(60); // innerhalb des Kombofensters (900 ms)
  }
  await seite.screenshot({ path: path.join(ZIEL, '02b-kombo.png') });
  console.log('  Bild: 02b-kombo.png');

  /* --- 2c. Kritischer Treffer (erzwungen, damit er reproduzierbar sichtbar ist) --- */
  console.log('2c. Kritischer Treffer');
  await seite.evaluate(() => {
    globalThis.__zufallSicherung = Math.random;
    Math.random = () => 0; // liegt garantiert unter jeder Krit-Chance
  });
  await tippeSicher(195, 320);
  await seite.waitForTimeout(90); // mitten in Blitz-/Bebenanimation abgelichtet
  await seite.screenshot({ path: path.join(ZIEL, '02c-kritischer-treffer.png') });
  console.log('  Bild: 02c-kritischer-treffer.png');
  await seite.evaluate(() => {
    Math.random = globalThis.__zufallSicherung;
  });
  await seite.waitForTimeout(500); // Effekte ausklingen lassen vor dem nächsten Schritt

  // Etwaige zwischenzeitlich ausgelöste Entdeckungen wegklicken, bevor es weitergeht.
  for (let i = 0; i < 4; i++) {
    const k = seite.locator('#entdeckung-ok');
    if (await k.isVisible().catch(() => false)) {
      await k.click();
      await seite.waitForTimeout(150);
    } else break;
  }

  /* --- 3. Mittleres Spiel: Zustand einsetzen --- */
  console.log('3. Mittleres Spiel');
  await seite.evaluate(() => {
    const z = globalThis.tiefenrausch.zustand;
    z.bl = 4.5e6;
    z.gesamtRunde = 8e6;
    z.gesamtGesamt = 8e6;
    z.tipps = 620;
    Object.assign(z.module, { qualle: 42, drohne: 31, sonar: 18, roboter: 9, farm: 3 });
    z.verbesserungen = ['griff1', 'griff2', 'qualle1', 'drohne1', 'global1'];
    globalThis.tiefenrausch.spiel.pruefeEntdeckungen(z);
    globalThis.tiefenrausch.spiel.pruefeErfolge(z);
    globalThis.tiefenrausch.oberflaeche.aktualisiere(z);
  });
  // Entdeckungsdialoge wegklicken
  for (let i = 0; i < 8; i++) {
    const knopf = seite.locator('#entdeckung-ok');
    if (await knopf.isVisible().catch(() => false)) {
      await knopf.click();
      await seite.waitForTimeout(180);
    }
  }
  await bild('03-mittleres-spiel');

  /* --- 4. Ausbau-Reiter --- */
  console.log('4. Ausbau');
  await seite.locator('#reiter-verbesserungen').click();
  await bild('04-ausbau');

  /* --- 5. Logbuch --- */
  console.log('5. Logbuch');
  await seite.locator('#reiter-logbuch').click();
  await bild('05-logbuch');

  /* --- 6. Aufstieg --- */
  console.log('6. Auftauchen');
  await seite.locator('#reiter-aufstieg').click();
  await bild('06-auftauchen');

  /* --- 7. Spätes Spiel mit sehr großen Zahlen --- */
  console.log('7. Spätes Spiel');
  await seite.locator('#reiter-module').click();
  await seite.evaluate(() => {
    const z = globalThis.tiefenrausch.zustand;
    z.bl = 7.4e15;
    z.gesamtRunde = 3e16;
    z.gesamtGesamt = 9e16;
    z.perlen = 4200;
    z.aufstiege = 12;
    z.tipps = 12_400;
    for (const [id, n] of Object.entries({
      qualle: 210, drohne: 180, sonar: 160, roboter: 140, farm: 120,
      schlot: 95, riff: 70, station: 45, leviathan: 22, raucher: 8,
    })) z.module[id] = n;
    z.verbesserungen = globalThis.tiefenrausch.zustand.verbesserungen.concat(
      ['griff3', 'resonanz', 'global2', 'global3', 'sonar1', 'roboter1', 'farm1']
    );
    globalThis.tiefenrausch.spiel.pruefeEntdeckungen(z);
    globalThis.tiefenrausch.oberflaeche.aktualisiere(z);
  });
  for (let i = 0; i < 16; i++) {
    const knopf = seite.locator('#entdeckung-ok');
    if (await knopf.isVisible().catch(() => false)) {
      await knopf.click();
      await seite.waitForTimeout(150);
    }
  }
  await bild('07-spaetes-spiel');

  /* --- 8. Logbuch im späten Spiel --- */
  await seite.locator('#reiter-logbuch').click();
  await bild('08-logbuch-voll');

  /* --- 8b. Auftauchen: der große Effekt-Moment (Perlenregen, starkes Beben) --- */
  console.log('8b. Auftauchen-Effekt');
  await seite.evaluate(() => {
    globalThis.tiefenrausch.zustand.gesamtRunde = 4_000_000_000;
  });
  seite.once('dialog', (d) => d.accept()); // die native Sicherheitsabfrage bestätigen
  await seite.locator('#reiter-aufstieg').click();
  await seite.waitForTimeout(200);
  await seite.locator('#knopf-aufstieg').click();
  await seite.waitForTimeout(550); // Perlenregen mittig im Fall, nicht mehr am oberen Rand
  await seite.screenshot({ path: path.join(ZIEL, '08b-auftauchen-effekt.png') });
  console.log('  Bild: 08b-auftauchen-effekt.png');
  await seite.waitForTimeout(700); // Effekte ausklingen lassen

  /* --- 9. Menü --- */
  console.log('9. Menü');
  await seite.locator('#knopf-menue').click();
  await bild('09-menue');
  await seite.locator('#menue-schliessen').click();

  /* --- 10. Rücksprung: Offline-Begrüßung --- */
  console.log('10. Rückkehr nach Abwesenheit');
  await seite.evaluate(() => {
    const z = globalThis.tiefenrausch.zustand;
    z.zuletztGespielt = Date.now() - 3 * 3600 * 1000;
    globalThis.tiefenrausch.speicher.speichern(z);
  });
  await seite.reload({ waitUntil: 'networkidle' });
  await seite.waitForTimeout(900);
  await bild('10-willkommen-zurueck');

  /* --- Prüfungen --- */
  console.log('\nPrüfungen:');
  const pruefung = await seite.evaluate(() => {
    const sichtbar = (s) => {
      const el = document.querySelector(s);
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    return {
      ueberlaufWaagerecht:
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
      guthabenSichtbar: sichtbar('#guthaben'),
      tiefeText: document.getElementById('tiefe-wert').textContent,
      guthabenText: document.getElementById('guthaben').textContent,
      enthaeltNaN: document.body.innerText.includes('NaN'),
      enthaeltUndefined: document.body.innerText.includes('undefined'),
      enthaeltInfinity: document.body.innerText.includes('Infinity'),
    };
  });
  for (const [name, wert] of Object.entries(pruefung)) {
    console.log(`  ${name}: ${wert}`);
  }

  if (pruefung.ueberlaufWaagerecht > 0) fehler.push('Seite scrollt waagerecht');
  if (pruefung.enthaeltNaN) fehler.push('Text enthält NaN');
  if (pruefung.enthaeltUndefined) fehler.push('Text enthält undefined');
  if (pruefung.enthaeltInfinity) fehler.push('Text enthält Infinity');

  await browser.close();
  await server.stop();

  console.log(`\nBilder liegen in: ${ZIEL}`);
  if (fehler.length) {
    console.log('\nFehler:');
    for (const f of fehler) console.log('  ✗ ' + f);
    process.exitCode = 1;
  } else {
    console.log('\nKeine Fehler.');
  }
}

main().catch((f) => {
  console.error('Sichtprüfung abgebrochen:', f);
  process.exit(1);
});
