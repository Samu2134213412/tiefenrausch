/**
 * Minimaler, eigenständiger ZIP-Schreiber (nur Node-Bordmittel, kein
 * externes Werkzeug).
 *
 * Warum das nötig war: PowerShells `Compress-Archive` speichert die
 * Pfade der Einträge auf diesem Rechner mit Backslash (`css\stil.css`)
 * statt mit dem im ZIP-Format vorgeschriebenen Schrägstrich
 * (`css/stil.css`, siehe ZIP-Spezifikation APPNOTE.TXT). Linux-Server -
 * unter anderem itch.io und vermutlich auch Poki - lesen das dann nicht
 * als Datei in einem Unterordner, sondern als eine einzelne Datei mit
 * einem Backslash im Namen. Ergebnis: css/stil.css, js/start.js usw.
 * werden nach dem Hochladen als 404 gemeldet, obwohl sie im Archiv
 * "drin" sind - nur eben falsch benannt.
 */
import { readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import zlib from 'node:zlib';

function alleDateien(verzeichnis, basis = verzeichnis, sammlung = []) {
  for (const eintrag of readdirSync(verzeichnis)) {
    const voll = join(verzeichnis, eintrag);
    if (statSync(voll).isDirectory()) {
      alleDateien(voll, basis, sammlung);
    } else {
      // Zip-Pfade sind IMMER mit Schrägstrich getrennt, unabhängig vom
      // Betriebssystem - das ist der Kern des Fixes.
      const zipPfad = relative(basis, voll).split(sep).join('/');
      sammlung.push({ voll, zipPfad });
    }
  }
  return sammlung;
}

function dosZeitstempel(datum = new Date()) {
  const zeit =
    ((datum.getHours() & 0x1f) << 11) | ((datum.getMinutes() & 0x3f) << 5) | ((datum.getSeconds() >> 1) & 0x1f);
  const tag =
    (((datum.getFullYear() - 1980) & 0x7f) << 9) | (((datum.getMonth() + 1) & 0xf) << 5) | (datum.getDate() & 0x1f);
  return { zeit, tag };
}

/** Zippt den kompletten Inhalt von `quellVerzeichnis` nach `zielDatei`. */
export function erzeugeZip(quellVerzeichnis, zielDatei) {
  const dateien = alleDateien(quellVerzeichnis);
  const { zeit, tag } = dosZeitstempel();

  const lokaleTeile = [];
  const zentraleTeile = [];
  let versatz = 0;

  for (const { voll, zipPfad } of dateien) {
    const inhalt = readFileSync(voll);
    const komprimiert = zlib.deflateRawSync(inhalt, { level: 9 });
    const nutzeKomprimiert = komprimiert.length < inhalt.length;
    const daten = nutzeKomprimiert ? komprimiert : inhalt;
    const methode = nutzeKomprimiert ? 8 : 0; // 8 = deflate, 0 = store
    const crc = zlib.crc32(inhalt);
    const nameBuf = Buffer.from(zipPfad, 'utf8');

    const lokalerHeader = Buffer.alloc(30);
    lokalerHeader.writeUInt32LE(0x04034b50, 0);
    lokalerHeader.writeUInt16LE(20, 4); // benötigte Version
    lokalerHeader.writeUInt16LE(0, 6); // Flags
    lokalerHeader.writeUInt16LE(methode, 8);
    lokalerHeader.writeUInt16LE(zeit, 10);
    lokalerHeader.writeUInt16LE(tag, 12);
    lokalerHeader.writeUInt32LE(crc, 14);
    lokalerHeader.writeUInt32LE(daten.length, 18);
    lokalerHeader.writeUInt32LE(inhalt.length, 22);
    lokalerHeader.writeUInt16LE(nameBuf.length, 26);
    lokalerHeader.writeUInt16LE(0, 28); // Extra-Feld-Länge

    lokaleTeile.push(lokalerHeader, nameBuf, daten);

    const zentralerHeader = Buffer.alloc(46);
    zentralerHeader.writeUInt32LE(0x02014b50, 0);
    zentralerHeader.writeUInt16LE(20, 4); // erstellt mit Version
    zentralerHeader.writeUInt16LE(20, 6); // benötigte Version
    zentralerHeader.writeUInt16LE(0, 8); // Flags
    zentralerHeader.writeUInt16LE(methode, 10);
    zentralerHeader.writeUInt16LE(zeit, 12);
    zentralerHeader.writeUInt16LE(tag, 14);
    zentralerHeader.writeUInt32LE(crc, 16);
    zentralerHeader.writeUInt32LE(daten.length, 20);
    zentralerHeader.writeUInt32LE(inhalt.length, 24);
    zentralerHeader.writeUInt16LE(nameBuf.length, 28);
    zentralerHeader.writeUInt16LE(0, 30); // Extra-Feld
    zentralerHeader.writeUInt16LE(0, 32); // Kommentar
    zentralerHeader.writeUInt16LE(0, 34); // Datenträger-Nummer
    zentralerHeader.writeUInt16LE(0, 36); // interne Attribute
    zentralerHeader.writeUInt32LE(0o644 << 16, 38); // externe Attribute (unix rw-r--r--)
    zentralerHeader.writeUInt32LE(versatz, 42);

    zentraleTeile.push(zentralerHeader, nameBuf);

    versatz += lokalerHeader.length + nameBuf.length + daten.length;
  }

  const zentraleGroesse = zentraleTeile.reduce((s, b) => s + b.length, 0);
  const zentraleStart = versatz;

  const ende = Buffer.alloc(22);
  ende.writeUInt32LE(0x06054b50, 0);
  ende.writeUInt16LE(0, 4);
  ende.writeUInt16LE(0, 6);
  ende.writeUInt16LE(dateien.length, 8);
  ende.writeUInt16LE(dateien.length, 10);
  ende.writeUInt32LE(zentraleGroesse, 12);
  ende.writeUInt32LE(zentraleStart, 16);
  ende.writeUInt16LE(0, 20);

  writeFileSync(zielDatei, Buffer.concat([...lokaleTeile, ...zentraleTeile, ende]));
  return dateien.length;
}
