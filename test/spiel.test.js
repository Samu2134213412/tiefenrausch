/**
 * Tests der Spiellogik.
 *
 * Der Schwerpunkt liegt auf der Balance: Ein Idle-Spiel ist kaputt, wenn eine
 * Stufe zu billig ist, der Aufstieg sich nicht lohnt oder Zahlen ins Unendliche
 * kippen. Das fällt beim Spielen erst nach Stunden auf – hier in Millisekunden.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import * as spiel from '../www/js/spiel.js';
import {
  MODULE,
  VERBESSERUNGEN,
  ENTDECKUNGEN,
  ERFOLGE,
  KOSTENWACHSTUM,
  PERLEN_SCHWELLE,
  perlenFuer,
  tiefeAus,
  zoneFuer,
  ITEMS,
  KISTEN_TYPEN,
  AQUARIUM_FISCHE,
  findeAquariumFisch,
  EXPEDITIONEN,
  PERLEN_SHOP,
  GLUECKSRAD_SEGMENTE,
} from '../www/js/daten.js';
import { zusammenfuehren, alsText, ausText } from '../www/js/speicher.js';
import { zahl, ganzzahl, dauer, uhr } from '../www/js/zahlen.js';

/* ------------------------------------------------------------------ */
/* Grundzustand                                                        */
/* ------------------------------------------------------------------ */

test('Neuer Zustand ist leer und vollständig', () => {
  const z = spiel.neuerZustand();
  assert.equal(z.bl, 0);
  assert.equal(z.perlen, 0);
  assert.equal(spiel.produktionProSekunde(z), 0);
  assert.equal(spiel.aktuelleTiefe(z), 0);
  for (const m of MODULE) {
    assert.equal(z.module[m.id], 0, `Modul ${m.id} fehlt im Zustand`);
  }
});

test('Antippen bringt genau den angezeigten Ertrag (erster Tipp: Kombo 1, kein Kritischer)', () => {
  const z = spiel.neuerZustand();
  const erwartet = spiel.tippErtrag(z);
  // zufall() = 1 liegt nie unter der Krit-Chance (max. 0,25) -> nie kritisch.
  const ergebnis = spiel.tippe(z, Date.now(), () => 1);
  assert.equal(ergebnis.kombo, 1);
  assert.equal(ergebnis.komboFaktor, 1, 'erster Tipp hat noch keinen Kombobonus');
  assert.equal(ergebnis.kritisch, false);
  assert.equal(ergebnis.ertrag, erwartet);
  assert.equal(z.bl, erwartet);
  assert.equal(z.tipps, 1);
  assert.equal(z.gesamtRunde, erwartet);
  assert.equal(z.gesamtGesamt, erwartet);
});

test('Kombo baut sich bei schnellem Tippen auf und erhöht den Ertrag', () => {
  const z = spiel.neuerZustand();
  const start = 1_000_000;
  let letzter;
  for (let i = 0; i < 5; i++) {
    letzter = spiel.tippe(z, start + i * 100, () => 1); // 100 ms Abstand, nie kritisch
  }
  assert.equal(letzter.kombo, 5);
  assert.ok(letzter.komboFaktor > 1, 'Kombo muss den Ertrag erhöhen');
  assert.equal(z.komboMax, 5);
  assert.equal(spiel.komboFaktorFuer(5), 1 + 4 * spiel.KOMBO_BONUS_PRO_STUFE);
});

test('Kombo bricht ab, wenn die Pause zu lang ist', () => {
  const z = spiel.neuerZustand();
  spiel.tippe(z, 0, () => 1);
  spiel.tippe(z, 100, () => 1);
  assert.equal(z.kombo, 2);
  const nachPause = spiel.tippe(z, 100 + spiel.KOMBO_FENSTER_MS + 1, () => 1);
  assert.equal(nachPause.kombo, 1, 'Kombo muss nach zu langer Pause neu beginnen');
  assert.equal(z.komboMax, 2, 'der Bestwert bleibt erhalten');
});

test('komboAktiv erkennt abgelaufene Kombofenster', () => {
  const z = spiel.neuerZustand();
  spiel.tippe(z, 1000, () => 1);
  assert.equal(spiel.komboAktiv(z, 1000), true);
  assert.equal(spiel.komboAktiv(z, 1000 + spiel.KOMBO_FENSTER_MS + 1), false);
  assert.ok(spiel.komboRestAnteil(z, 1000) > 0.9);
  assert.equal(spiel.komboRestAnteil(z, 1000 + spiel.KOMBO_FENSTER_MS + 1), 0);
});

test('Kritischer Treffer wird erzwingbar und vervielfacht den Ertrag', () => {
  const z = spiel.neuerZustand();
  const normal = spiel.tippErtrag(z);
  // zufall() = 0 liegt immer unter der Krit-Chance -> immer kritisch.
  const ergebnis = spiel.tippe(z, Date.now(), () => 0);
  assert.equal(ergebnis.kritisch, true);
  assert.equal(ergebnis.ertrag, normal * spiel.KRIT_MULTIPLIKATOR);
  assert.equal(z.kritischeTreffer, 1);
});

test('Kritische Trefferchance steigt mit der Kombo, bleibt aber gedeckelt', () => {
  assert.equal(spiel.kritChanceFuer(1), spiel.KRIT_GRUNDCHANCE);
  const beiMax = spiel.kritChanceFuer(1 + spiel.KOMBO_MAX_STUFE);
  const uebersteuert = spiel.kritChanceFuer(1 + spiel.KOMBO_MAX_STUFE + 50);
  assert.equal(beiMax, uebersteuert, 'Chance darf über der Kappungsgrenze nicht weiter steigen');
  assert.ok(beiMax <= spiel.KRIT_CHANCE_MAX);
});

/* ------------------------------------------------------------------ */
/* Kaufen                                                              */
/* ------------------------------------------------------------------ */

test('Modulpreis wächst wie vorgesehen', () => {
  const z = spiel.neuerZustand();
  const modul = MODULE[0];
  assert.equal(spiel.modulPreis(z, modul.id, 1), Math.ceil(modul.grundpreis));

  z.module[modul.id] = 1;
  assert.equal(
    spiel.modulPreis(z, modul.id, 1),
    Math.ceil(modul.grundpreis * KOSTENWACHSTUM)
  );

  // Sammelkauf entspricht der Summe der Einzelkäufe
  z.module[modul.id] = 0;
  const einzeln =
    Math.ceil(modul.grundpreis) +
    Math.ceil(modul.grundpreis * KOSTENWACHSTUM) +
    Math.ceil(modul.grundpreis * KOSTENWACHSTUM ** 2);
  const gebuendelt = spiel.modulPreis(z, modul.id, 3);
  assert.ok(Math.abs(einzeln - gebuendelt) <= 3, 'Sammelpreis weicht zu stark ab');
});

test('Kaufen zieht ab und bucht zu; ohne Guthaben passiert nichts', () => {
  const z = spiel.neuerZustand();
  z.bl = 100;
  const ergebnis = spiel.kaufeModul(z, 'qualle', 1);
  assert.equal(ergebnis.erfolg, true);
  assert.equal(z.module.qualle, 1);
  assert.equal(z.bl, 100 - ergebnis.preis);

  const leer = spiel.neuerZustand();
  const abgelehnt = spiel.kaufeModul(leer, 'qualle', 1);
  assert.equal(abgelehnt.erfolg, false);
  assert.equal(leer.module.qualle, 0);
  assert.equal(leer.bl, 0);
});

test('Maximalkauf berechnet genau so viel, wie bezahlbar ist', () => {
  const z = spiel.neuerZustand();
  for (const guthaben of [14, 15, 100, 5_000, 1e7]) {
    z.bl = guthaben;
    const anzahl = spiel.maximalKaufbar(z, 'qualle');
    if (anzahl > 0) {
      assert.ok(
        spiel.modulPreis(z, 'qualle', anzahl) <= guthaben,
        `bei ${guthaben} BL wären ${anzahl} Stück nicht bezahlbar`
      );
    }
    assert.ok(
      spiel.modulPreis(z, 'qualle', anzahl + 1) > guthaben,
      `bei ${guthaben} BL wäre noch ein Stück mehr drin gewesen`
    );
  }
});

test('Verbesserungen wirken erst nach dem Kauf', () => {
  const z = spiel.neuerZustand();
  const vorher = spiel.tippErtrag(z);

  z.tipps = 10;
  z.bl = 1000;
  const ergebnis = spiel.kaufeVerbesserung(z, 'griff1');
  assert.equal(ergebnis.erfolg, true);
  assert.equal(spiel.tippErtrag(z), vorher * 2);

  // Kein zweites Mal
  z.bl = 1000;
  assert.equal(spiel.kaufeVerbesserung(z, 'griff1').erfolg, false);
});

test('Verbesserung ohne erfüllte Bedingung ist nicht käuflich', () => {
  const z = spiel.neuerZustand();
  z.bl = 1e9;
  const ergebnis = spiel.kaufeVerbesserung(z, 'griff3'); // verlangt 500 Antippen
  assert.equal(ergebnis.erfolg, false);
  assert.match(ergebnis.grund, /Bedingung/);
  assert.equal(z.bl, 1e9, 'Guthaben darf nicht abgebucht werden');
});

test('Modul-Verbesserung wirkt nur auf ihr eigenes Modul', () => {
  const z = spiel.neuerZustand();
  z.module.qualle = 10;
  z.module.drohne = 10;
  const quallenErtragVorher = spiel.modulErtrag(z, 'qualle');
  const drohnenErtragVorher = spiel.modulErtrag(z, 'drohne');

  z.bl = 1e6;
  spiel.kaufeVerbesserung(z, 'qualle1');

  assert.equal(spiel.modulErtrag(z, 'qualle'), quallenErtragVorher * 2);
  assert.equal(spiel.modulErtrag(z, 'drohne'), drohnenErtragVorher);
});

/* ------------------------------------------------------------------ */
/* Produktion                                                          */
/* ------------------------------------------------------------------ */

test('Produktion summiert alle Module', () => {
  const z = spiel.neuerZustand();
  z.module.qualle = 10; // 10 × 0,1 = 1
  z.module.drohne = 3; //  3 × 1   = 3
  assert.equal(spiel.produktionProSekunde(z), 4);
});

test('Tick schreibt Produktion mal Zeit gut', () => {
  const z = spiel.neuerZustand();
  z.module.drohne = 5; // 5 BL/Sek.
  spiel.tick(z, 2);
  assert.equal(z.bl, 10);
  assert.equal(z.gesamtGesamt, 10);

  // Kein Fortschritt bei ungültiger Zeit
  const vorher = z.bl;
  spiel.tick(z, 0);
  spiel.tick(z, -5);
  spiel.tick(z, NaN);
  assert.equal(z.bl, vorher);
});

test('Perlen und Entdeckungen erhöhen die Produktion multiplikativ', () => {
  const z = spiel.neuerZustand();
  z.module.drohne = 10; // 10 BL/Sek.
  assert.equal(spiel.produktionProSekunde(z), 10);

  z.perlen = 50; // +100 %
  assert.equal(spiel.produktionProSekunde(z), 20);

  z.entdeckungen = [5]; // erste Entdeckung: ×1,05
  assert.ok(Math.abs(spiel.produktionProSekunde(z) - 21) < 1e-9);
});

test('Boost verdoppelt und läuft dann ab', () => {
  const z = spiel.neuerZustand();
  z.module.drohne = 10;
  const jetzt = 1_000_000;
  spiel.starteBoost(z, jetzt);

  assert.equal(spiel.produktionProSekunde(z, jetzt + 1000), 20);
  assert.equal(spiel.produktionProSekunde(z, jetzt + spiel.BOOST_DAUER_MS + 1), 10);
  assert.ok(spiel.boostRestSekunden(z, jetzt) > 0);
  assert.equal(spiel.boostRestSekunden(z, jetzt + spiel.BOOST_DAUER_MS + 1), 0);
});

test('starteBoost zählt als Werbung, verlaengereBoost nicht', () => {
  const mitWerbung = spiel.neuerZustand();
  spiel.starteBoost(mitWerbung, 1000);
  assert.equal(mitWerbung.werbungGesehen, 1);

  const ohneWerbung = spiel.neuerZustand();
  spiel.verlaengereBoost(ohneWerbung, 1000);
  assert.equal(ohneWerbung.werbungGesehen, 0);
  assert.ok(ohneWerbung.boostBis > 1000, 'Boost muss trotzdem wirken');
});

test('Glücksfisch verlängert den Boost, zählt aber nicht als Werbung', () => {
  const z = spiel.neuerZustand();
  const jetzt = 5000;
  const bis = spiel.fangeGluecksfisch(z, jetzt);

  assert.equal(bis, jetzt + spiel.GLUECKSFISCH_BOOST_MS);
  assert.equal(z.boostBis, bis);
  assert.equal(z.werbungGesehen, 0, 'ein kostenloser Fisch darf nicht als Werbung zählen');
  assert.equal(z.gluecksfischeGefangen, 1);
  assert.ok(spiel.GLUECKSFISCH_BOOST_MS < spiel.BOOST_DAUER_MS, 'Fisch-Boost muss kürzer sein als der Werbe-Boost');

  spiel.fangeGluecksfisch(z, jetzt + 1000);
  assert.equal(z.gluecksfischeGefangen, 2);
});

/* ------------------------------------------------------------------ */
/* Tiefe und Entdeckungen                                              */
/* ------------------------------------------------------------------ */

test('Tiefe wächst mit der Gesamtausbeute und bleibt monoton', () => {
  assert.equal(tiefeAus(0), 0);
  let vorher = 0;
  for (const wert of [10, 1e3, 1e5, 1e8, 1e12, 1e16]) {
    const tiefe = tiefeAus(wert);
    assert.ok(tiefe >= vorher, 'Tiefe darf nie kleiner werden');
    assert.ok(Number.isFinite(tiefe));
    vorher = tiefe;
  }
  assert.ok(tiefeAus(1e12) > 1000, 'Fortschritt zu langsam');
});

test('Entdeckungen werden bei Erreichen der Tiefe freigeschaltet', () => {
  const z = spiel.neuerZustand();
  z.gesamtGesamt = 1e9;
  const neu = spiel.pruefeEntdeckungen(z);
  assert.ok(neu.length > 0);
  assert.ok(z.maxTiefe > 0);
  // Kein zweites Mal
  assert.equal(spiel.pruefeEntdeckungen(z).length, 0);
});

test('Maximale Tiefe sinkt nach einem Aufstieg nicht', () => {
  const z = spiel.neuerZustand();
  z.gesamtGesamt = 1e10;
  z.gesamtRunde = 1e10;
  spiel.pruefeEntdeckungen(z);
  const tiefeVorher = z.maxTiefe;
  const entdeckungenVorher = z.entdeckungen.length;

  spiel.aufstieg(z);

  assert.equal(z.maxTiefe, tiefeVorher);
  assert.equal(z.entdeckungen.length, entdeckungenVorher);
});

test('Jede Entdeckung hat Text, Symbol und sinnvollen Bonus', () => {
  let letzteTiefe = -1;
  for (const e of ENTDECKUNGEN) {
    assert.ok(e.tiefe > letzteTiefe, 'Entdeckungen müssen aufsteigend sortiert sein');
    letzteTiefe = e.tiefe;
    assert.ok(e.name.length > 2, `Name fehlt bei ${e.tiefe} m`);
    assert.ok(e.text.length > 20, `Beschreibung zu kurz bei ${e.name}`);
    assert.ok(e.symbol.length > 0);
    assert.ok(e.bonus > 1 && e.bonus <= 3, `Bonus unplausibel bei ${e.name}`);
  }
});

/* ------------------------------------------------------------------ */
/* Aufstieg                                                            */
/* ------------------------------------------------------------------ */

test('Aufstieg erst ab der Schwelle', () => {
  const z = spiel.neuerZustand();
  z.gesamtRunde = PERLEN_SCHWELLE - 1;
  assert.equal(spiel.perlenBeiAufstieg(z), 0);
  assert.equal(spiel.aufstieg(z).erfolg, false);

  z.gesamtRunde = PERLEN_SCHWELLE;
  assert.equal(spiel.perlenBeiAufstieg(z), 10);
  assert.equal(spiel.aufstieg(z).erfolg, true);
});

test('Perlenformel: erster Aufstieg lohnt sich, späte wachsen gebremst', () => {
  assert.equal(perlenFuer(0), 0);
  assert.equal(perlenFuer(PERLEN_SCHWELLE - 1), 0, 'unter der Schwelle gibt es nichts');
  assert.equal(perlenFuer(PERLEN_SCHWELLE), 10, 'der erste Aufstieg muss sich lohnen');
  assert.equal(perlenFuer(PERLEN_SCHWELLE * 1_000), 100);
  assert.equal(perlenFuer(PERLEN_SCHWELLE * 1_000_000), 1000);

  // Tausendfache Ausbeute darf nicht tausendfach so viele Perlen geben.
  const klein = perlenFuer(PERLEN_SCHWELLE * 10);
  const gross = perlenFuer(PERLEN_SCHWELLE * 10_000);
  assert.ok(gross < klein * 100, 'späte Aufstiege wachsen zu steil');
});

test('Aufstieg setzt zurück, behält aber den Fortschritt', () => {
  const z = spiel.neuerZustand();
  z.bl = 5e6;
  z.gesamtRunde = 4e6;
  z.gesamtGesamt = 9e6;
  z.module.qualle = 42;
  z.tipps = 300;
  z.verbesserungen.push('griff1');
  z.komboMax = 17;
  z.kritischeTreffer = 42;
  z.leuchtblasenGesammelt = 3;
  z.gluecksfischeGefangen = 7;
  spiel.pruefeEntdeckungen(z);
  const entdeckungen = z.entdeckungen.length;

  const ergebnis = spiel.aufstieg(z);

  assert.equal(ergebnis.erfolg, true);
  assert.equal(ergebnis.gewonnen, perlenFuer(4e6));
  assert.equal(z.perlen, perlenFuer(4e6));
  assert.equal(z.aufstiege, 1);
  // zurückgesetzt
  assert.equal(z.bl, 0);
  assert.equal(z.module.qualle, 0);
  assert.equal(z.verbesserungen.length, 0);
  assert.equal(z.gesamtRunde, 0);
  // behalten
  assert.equal(z.gesamtGesamt, 9e6);
  assert.equal(z.tipps, 300);
  assert.equal(z.entdeckungen.length, entdeckungen);
  // Lebenszeit-Zähler für Erfolge dürfen ein Auftauchen nicht verlieren –
  // sonst wäre „100 kritische Treffer“ für häufig Auftauchende unerreichbar.
  assert.equal(z.komboMax, 17);
  assert.equal(z.kritischeTreffer, 42);
  assert.equal(z.leuchtblasenGesammelt, 3);
  assert.equal(z.gluecksfischeGefangen, 7);
});

test('Aufstieg lohnt sich: nach dem Reset ist die Produktion höher als vorher am selben Punkt', () => {
  // Zwei gleiche Ausgangslagen, eine steigt auf.
  const ohne = spiel.neuerZustand();
  ohne.module.drohne = 20;

  const mit = spiel.neuerZustand();
  mit.gesamtRunde = PERLEN_SCHWELLE * 400;
  spiel.aufstieg(mit);
  mit.module.drohne = 20;

  assert.ok(mit.perlen >= 20);
  assert.ok(
    spiel.produktionProSekunde(mit) > spiel.produktionProSekunde(ohne),
    'Aufstieg muss einen spürbaren Vorteil bringen'
  );
});

/* ------------------------------------------------------------------ */
/* Abwesenheit                                                         */
/* ------------------------------------------------------------------ */

test('Offline-Ertrag ist gedeckelt und halbiert', () => {
  const z = spiel.neuerZustand();
  z.module.drohne = 10; // 10 BL/Sek.

  const kurz = spiel.offlineErtrag(z, 60);
  assert.equal(kurz.menge, 10 * 60 * spiel.OFFLINE_ANTEIL);
  assert.equal(kurz.abgeschnitten, false);

  const lang = spiel.offlineErtrag(z, 48 * 3600);
  assert.equal(lang.abgeschnitten, true);
  assert.equal(lang.sekunden, spiel.OFFLINE_MAX_STUNDEN * 3600);
  assert.equal(lang.menge, 10 * spiel.OFFLINE_MAX_STUNDEN * 3600 * spiel.OFFLINE_ANTEIL);
});

test('Offline rechnet ohne aktiven Boost', () => {
  const z = spiel.neuerZustand();
  z.module.drohne = 10;
  spiel.starteBoost(z, Date.now());
  const ertrag = spiel.offlineErtrag(z, 3600);
  assert.equal(ertrag.menge, 10 * 3600 * spiel.OFFLINE_ANTEIL, 'Boost darf offline nicht zählen');
});

/* ------------------------------------------------------------------ */
/* Speichern                                                           */
/* ------------------------------------------------------------------ */

test('Beschädigte Spielstände werden repariert statt abzustürzen', () => {
  const vorlage = spiel.neuerZustand();

  const muell = zusammenfuehren(vorlage, {
    bl: 'keine Zahl',
    perlen: -5,
    module: { qualle: 'x', gibtsNicht: 99 },
    verbesserungen: 'kein Array',
    entdeckungen: [null, 'abc', 15],
    erfolge: [1, 'erstertipp'],
    besitzItems: ['angel_holz', 'gibtsNicht', 42],
    // Angel ist gültig, aber nicht im (bereinigten) Besitz -> darf nicht ausgerüstet werden.
    // Köder ist im Besitz, aber vom falschen Slot -> ebenfalls verworfen.
    ausruestung: { angel: 'gibtsNicht', koeder: 'angel_holz' },
    kisten: { holz: -3, silber: 'viele', gold: 2.7, gibtsNicht: 9 },
    aquarium: ['clownfisch', 'gibtsNicht', 7],
    expedition: { expeditionId: 'gibtsNicht', startZeit: 1, endZeit: 2 },
    tagestruheLetzterTag: 'kein Tag',
    tagesStreak: -4,
  });

  assert.equal(muell.bl, 0);
  assert.equal(muell.perlen, 0);
  assert.equal(muell.module.qualle, 0);
  assert.equal(muell.module.gibtsNicht, undefined);
  assert.deepEqual(muell.verbesserungen, []);
  assert.deepEqual(muell.entdeckungen, [15]);
  assert.deepEqual(muell.erfolge, ['erstertipp']);
  assert.deepEqual(muell.besitzItems, ['angel_holz']);
  assert.equal(muell.ausruestung.angel, null);
  assert.equal(muell.ausruestung.koeder, null);
  assert.equal(muell.kisten.holz, 0);
  assert.equal(muell.kisten.silber, 0);
  assert.equal(muell.kisten.gold, 2);
  assert.equal(muell.kisten.gibtsNicht, undefined);
  assert.deepEqual(muell.aquarium, ['clownfisch']);
  assert.equal(muell.expedition, null);
  assert.equal(muell.tagestruheLetzterTag, null);
  assert.equal(muell.tagesStreak, 0);
});

test('Eine gültige, laufende Expedition übersteht das Laden unverändert', () => {
  const vorlage = spiel.neuerZustand();
  const geladen = zusammenfuehren(vorlage, {
    expedition: { expeditionId: 'mittel', startZeit: 1000, endZeit: 2000 },
  });
  assert.deepEqual(geladen.expedition, { expeditionId: 'mittel', startZeit: 1000, endZeit: 2000 });
});

test('tagestruheLetzterTag = 0 (Tag null) wird nicht mit "nie abgeholt" verwechselt', () => {
  // Number(null) wäre 0 - genau die Verwechslung, die hier ausgeschlossen
  // werden soll: Tag 0 ist ein gültiger, echter Tag.
  const vorlage = spiel.neuerZustand();
  const geladen = zusammenfuehren(vorlage, { tagestruheLetzterTag: 0 });
  assert.equal(geladen.tagestruheLetzterTag, 0);
  assert.notEqual(geladen.tagestruheLetzterTag, null);
});

test('Gültige Spielstände bleiben erhalten', () => {
  const original = spiel.neuerZustand();
  original.bl = 12345.6;
  original.module.drohne = 7;
  original.verbesserungen = ['griff1'];
  original.entdeckungen = [5, 15];
  original.perlen = 3;
  original.besitzItems.push('angel_stahl', 'koeder_glitzer');
  spiel.ruestAusItem(original, 'angel_stahl');
  spiel.ruestAusItem(original, 'koeder_glitzer');
  original.kisten.gold = 4;
  original.aquarium.push('muraene');
  original.kistenGeoeffnet = 6;
  original.expeditionenAbgeschlossen = 2;
  original.tagestruheLetzterTag = 19345;
  original.tagesStreak = 5;

  const wieder = zusammenfuehren(spiel.neuerZustand(), JSON.parse(JSON.stringify(original)));
  assert.equal(wieder.bl, 12345.6);
  assert.equal(wieder.module.drohne, 7);
  assert.deepEqual(wieder.verbesserungen, ['griff1']);
  assert.deepEqual(wieder.entdeckungen, [5, 15]);
  assert.equal(wieder.perlen, 3);
  assert.deepEqual(wieder.besitzItems, ['angel_stahl', 'koeder_glitzer']);
  assert.equal(wieder.ausruestung.angel, 'angel_stahl');
  assert.equal(wieder.ausruestung.koeder, 'koeder_glitzer');
  assert.equal(wieder.kisten.gold, 4);
  assert.deepEqual(wieder.aquarium, ['muraene']);
  assert.equal(wieder.kistenGeoeffnet, 6);
  assert.equal(wieder.expeditionenAbgeschlossen, 2);
  assert.equal(wieder.tagestruheLetzterTag, 19345);
  assert.equal(wieder.tagesStreak, 5);
});

test('Sicherungstext lässt sich wieder einlesen', () => {
  const z = spiel.neuerZustand();
  z.bl = 999;
  z.module.qualle = 5;
  z.perlen = 8;

  const text = alsText(z);
  assert.ok(text.length > 20);
  const zurueck = ausText(text);
  assert.equal(zurueck.bl, 999);
  assert.equal(zurueck.module.qualle, 5);
  assert.equal(zurueck.perlen, 8);
  assert.equal(ausText('kein gültiger Text'), null);
});

/* ------------------------------------------------------------------ */
/* Inhalte                                                             */
/* ------------------------------------------------------------------ */

test('Module sind aufsteigend und lohnen sich gestaffelt', () => {
  for (let i = 1; i < MODULE.length; i++) {
    const vorher = MODULE[i - 1];
    const jetzt = MODULE[i];
    assert.ok(jetzt.grundpreis > vorher.grundpreis, `${jetzt.id} ist nicht teurer`);
    assert.ok(jetzt.ertrag > vorher.ertrag, `${jetzt.id} bringt nicht mehr`);

    // Ein späteres Modul muss pro ausgegebener BL besser sein als ein frühes,
    // sonst gibt es keinen Grund, überhaupt aufzusteigen.
    const effizienzVorher = vorher.ertrag / vorher.grundpreis;
    const effizienzJetzt = jetzt.ertrag / jetzt.grundpreis;
    assert.ok(
      effizienzJetzt > effizienzVorher * 0.3,
      `${jetzt.id} ist im Verhältnis zu schwach`
    );
  }
});

test('Alle Verbesserungen sind eindeutig und vollständig', () => {
  const gesehen = new Set();
  for (const v of VERBESSERUNGEN) {
    assert.ok(!gesehen.has(v.id), `doppelte Kennung: ${v.id}`);
    gesehen.add(v.id);
    assert.ok(v.preis > 0, `${v.id} ohne Preis`);
    assert.ok(v.text.length > 5, `${v.id} ohne Beschreibung`);
    assert.ok(['modul', 'global', 'tippen', 'tippenAnteil'].includes(v.wirkung.art));
    if (v.wirkung.art === 'modul') {
      assert.ok(
        MODULE.some((m) => m.id === v.wirkung.ziel),
        `${v.id} zeigt auf unbekanntes Modul ${v.wirkung.ziel}`
      );
    }
  }
});

test('Leuchtblase: Belohnung skaliert mit der Produktion, hat aber einen Mindestwert', () => {
  const leer = spiel.neuerZustand();
  const frueh = spiel.leuchtblasenBelohnung(leer);
  assert.ok(frueh >= 50, 'auch ganz am Anfang muss sich das Antippen lohnen');

  const produktiv = spiel.neuerZustand();
  produktiv.module.drohne = 1000; // 1000 BL/Sek.
  const spaet = spiel.leuchtblasenBelohnung(produktiv);
  assert.equal(spaet, 1000 * spiel.LEUCHTBLASE_SEKUNDENWERT);
  assert.ok(spaet > frueh, 'im späten Spiel muss die Belohnung entsprechend mitwachsen');
});

test('Leuchtblase einsammeln schreibt gut und zählt mit', () => {
  const z = spiel.neuerZustand();
  z.module.drohne = 50;
  const vorherBl = z.bl;
  const erwartet = spiel.leuchtblasenBelohnung(z);

  const belohnung = spiel.sammleLeuchtblase(z);

  assert.equal(belohnung, erwartet);
  assert.equal(z.bl, vorherBl + erwartet);
  assert.equal(z.gesamtGesamt, erwartet);
  assert.equal(z.leuchtblasenGesammelt, 1);

  spiel.sammleLeuchtblase(z);
  assert.equal(z.leuchtblasenGesammelt, 2);
});

test('Alle Erfolge sind erreichbar und stürzen nicht ab', () => {
  const z = spiel.neuerZustand();
  for (const e of ERFOLGE) {
    assert.doesNotThrow(() => e.pruef(z), `Erfolg ${e.id} wirft bei leerem Zustand`);
    assert.equal(typeof e.pruef(z), 'boolean');
  }
  // Vollständig ausgestatteter Zustand erreicht alles
  const voll = spiel.neuerZustand();
  voll.tipps = 1e6;
  voll.maxTiefe = 99_999;
  voll.perlen = 1000;
  voll.aufstiege = 10;
  voll.entdeckungen = ENTDECKUNGEN.map((e) => e.tiefe);
  voll.komboMax = 999;
  voll.kritischeTreffer = 999;
  voll.leuchtblasenGesammelt = 999;
  voll.gluecksfischeGefangen = 999;
  voll.kistenGeoeffnet = 999;
  voll.expeditionenAbgeschlossen = 999;
  voll.tagesStreak = 999;
  voll.gluecksradGedreht = 999;
  voll.besitzItems = ITEMS.map((i) => i.id);
  spiel.ruestAusItem(voll, 'angel_abgrund');
  voll.aquarium = AQUARIUM_FISCHE.map((f) => f.id);
  for (const m of MODULE) voll.module[m.id] = 50;
  for (const e of ERFOLGE) {
    assert.equal(e.pruef(voll), true, `Erfolg ${e.id} ist nicht erreichbar`);
  }
});

test('Zonen decken jede Tiefe ab', () => {
  for (const tiefe of [0, 1, 199, 200, 999, 5000, 50_000]) {
    const zone = zoneFuer(tiefe);
    assert.ok(zone?.name, `keine Zone für ${tiefe} m`);
  }
});

/* ------------------------------------------------------------------ */
/* Zahlen                                                              */
/* ------------------------------------------------------------------ */

test('Zahlen werden lesbar dargestellt', () => {
  assert.equal(zahl(0), '0');
  assert.equal(zahl(999), '999');
  assert.match(zahl(1500), /^1,50K$/);
  assert.match(zahl(1.234e6), /Mio\./);
  assert.match(zahl(5e9), /Mrd\./);
  assert.equal(zahl(Infinity), '∞');
  assert.ok(!zahl(1e100).includes('undefined'));
  assert.equal(ganzzahl(1234.9), '1.234');
});

test('Zeitangaben sind in allen Größenordnungen sinnvoll', () => {
  assert.match(dauer(30), /Sek\./);
  assert.match(dauer(90), /Min\./);
  assert.match(dauer(3700), /Std\./);
  assert.match(dauer(200000), /Tg\./);
  assert.equal(uhr(65), '1:05');
  assert.equal(uhr(0), '0:00');
});

/* ------------------------------------------------------------------ */
/* Langzeitverhalten                                                   */
/* ------------------------------------------------------------------ */

test('Eine simulierte Stunde führt zu plausiblem Fortschritt ohne Zahlenfehler', () => {
  const z = spiel.neuerZustand();
  // Eigene, simulierte Uhr statt Date.now(): der Test läuft in echter Zeit in
  // Millisekunden ab, „alle 5 Sekunden“ wäre mit echter Zeit also ständig
  // schneller als die 20-Tipps/Sek.-Kappung erlaubt und praktisch jeder Tipp
  // würde verworfen.
  let jetzt = Date.now();

  // Zwei Stunden simulieren: jede Sekunde ein Tick, alle 5 Sekunden ein Tipp,
  // und immer kaufen, was gerade bezahlbar ist.
  for (let sekunde = 0; sekunde < 7200; sekunde++) {
    jetzt += 1000;
    spiel.tick(z, 1, jetzt);
    if (sekunde % 5 === 0) spiel.tippe(z, jetzt);

    for (const modul of MODULE) {
      if (z.bl >= spiel.modulPreis(z, modul.id, 1) * 1.2) {
        spiel.kaufeModul(z, modul.id, 1);
      }
    }
    for (const v of spiel.verfuegbareVerbesserungen(z)) {
      if (z.bl >= v.preis) spiel.kaufeVerbesserung(z, v.id);
    }
    spiel.pruefeEntdeckungen(z);
  }

  assert.ok(Number.isFinite(z.bl), 'Guthaben ist keine Zahl mehr');
  assert.ok(Number.isFinite(spiel.produktionProSekunde(z)), 'Produktion ist keine Zahl mehr');
  assert.ok(z.bl >= 0, 'Guthaben darf nicht negativ werden');
  assert.ok(z.gesamtGesamt > 1000, `nach zwei Stunden zu wenig Fortschritt: ${z.gesamtGesamt}`);
  assert.ok(z.maxTiefe > 10, `nach zwei Stunden zu flach: ${z.maxTiefe} m`);
  assert.ok(z.entdeckungen.length >= 2, 'zu wenige Entdeckungen in zwei Stunden');
});

test('Sehr große Zahlen bleiben endlich', () => {
  const z = spiel.neuerZustand();
  for (const m of MODULE) z.module[m.id] = 10_000;
  z.perlen = 1e6;
  z.entdeckungen = ENTDECKUNGEN.map((e) => e.tiefe);
  z.verbesserungen = VERBESSERUNGEN.map((v) => v.id);

  const produktion = spiel.produktionProSekunde(z);
  assert.ok(Number.isFinite(produktion), 'Produktion läuft über');
  assert.ok(Number.isFinite(spiel.tippErtrag(z)));
  assert.ok(Number.isFinite(spiel.aktuelleTiefe(z)));
  assert.ok(!zahl(produktion).includes('NaN'));
});

/* ------------------------------------------------------------------ */
/* Ausrüstung, Kisten, Expeditionen, Aquarium                          */
/* ------------------------------------------------------------------ */

test('Item ausrüsten geht nur bei tatsächlichem Besitz, landet im richtigen Slot', () => {
  const z = spiel.neuerZustand();

  const ohneBesitz = spiel.ruestAusItem(z, 'angel_holz');
  assert.equal(ohneBesitz.erfolg, false);
  assert.equal(z.ausruestung.angel, null);

  z.besitzItems.push('angel_holz', 'koeder_wurm');
  const angel = spiel.ruestAusItem(z, 'angel_holz');
  const koeder = spiel.ruestAusItem(z, 'koeder_wurm');

  assert.equal(angel.erfolg, true);
  assert.equal(koeder.erfolg, true);
  assert.equal(z.ausruestung.angel, 'angel_holz');
  assert.equal(z.ausruestung.koeder, 'koeder_wurm');
  assert.equal(spiel.hatAngel(z), true);
});

test('Alle Items sind eindeutig, kennen ihren Slot und ihre Seltenheit', () => {
  const ids = new Set();
  for (const i of ITEMS) {
    assert.ok(!ids.has(i.id), `doppelte Item-ID: ${i.id}`);
    ids.add(i.id);
    assert.ok(['angel', 'koeder'].includes(i.slot), `unbekannter Slot bei ${i.id}`);
    assert.ok(i.name && i.text && i.symbol, `Text/Symbol fehlt bei ${i.id}`);
  }
});

test('Kiste öffnen: leerer Vorrat schlägt fehl', () => {
  const z = spiel.neuerZustand();
  const ergebnis = spiel.oeffneKiste(z, 'holz');
  assert.equal(ergebnis.erfolg, false);
});

test('Kiste öffnen verbraucht die Kiste und liefert ein noch nicht besessenes Item', () => {
  const z = spiel.neuerZustand();
  z.kisten.gold = 1;
  // zufall nahe 1 trifft in einer Goldkiste die legendäre Stufe, dort liegen
  // genau zwei Items – deterministisch prüfbar.
  const ergebnis = spiel.oeffneKiste(z, 'gold', Date.now(), () => 0.999);

  assert.equal(ergebnis.erfolg, true);
  assert.equal(z.kisten.gold, 0);
  assert.equal(z.kistenGeoeffnet, 1);
  assert.equal(ergebnis.seltenheit, 'legendaer');
  assert.ok(ergebnis.item, 'kein Item erhalten');
  assert.equal(ergebnis.duplikatBL, 0);
  assert.ok(z.besitzItems.includes(ergebnis.item.id));
});

test('Kiste öffnen: besitzt man schon alles dieser Seltenheit, gibt es BL statt Duplikat', () => {
  const z = spiel.neuerZustand();
  z.module.qualle = 50; // damit produktionProSekunde > 0 ist und die BL auch sichtbar wird
  z.kisten.gold = 1;
  for (const i of ITEMS) if (i.seltenheit === 'legendaer') z.besitzItems.push(i.id);

  const vorher = z.bl;
  const ergebnis = spiel.oeffneKiste(z, 'gold', Date.now(), () => 0.999);

  assert.equal(ergebnis.erfolg, true);
  assert.equal(ergebnis.item, null);
  assert.ok(ergebnis.duplikatBL > 0, 'Duplikat-Ausgleich sollte positiv sein');
  assert.ok(z.bl > vorher, 'BL sollte gutgeschrieben worden sein');
});

test('Jede Kiste hat Gewichte für alle vier Seltenheiten', () => {
  for (const k of KISTEN_TYPEN) {
    for (const s of ['gewoehnlich', 'selten', 'episch', 'legendaer']) {
      assert.ok(typeof k.gewichte[s] === 'number', `${k.id} hat kein Gewicht für ${s}`);
    }
  }
});

test('Expedition ohne ausgerüstete Angel lässt sich nicht starten', () => {
  const z = spiel.neuerZustand();
  const ergebnis = spiel.starteExpedition(z, 'kurz');
  assert.equal(ergebnis.erfolg, false);
  assert.equal(z.expedition, null);
});

test('Bessere Angel verkürzt die Expeditionsdauer spürbar', () => {
  const jetzt = 1_000_000;

  const mitHolz = spiel.neuerZustand();
  mitHolz.besitzItems.push('angel_holz');
  spiel.ruestAusItem(mitHolz, 'angel_holz');
  spiel.starteExpedition(mitHolz, 'lang', jetzt);

  const mitStahl = spiel.neuerZustand();
  mitStahl.besitzItems.push('angel_stahl');
  spiel.ruestAusItem(mitStahl, 'angel_stahl');
  spiel.starteExpedition(mitStahl, 'lang', jetzt);

  const dauerHolz = mitHolz.expedition.endZeit - jetzt;
  const dauerStahl = mitStahl.expedition.endZeit - jetzt;
  assert.ok(dauerStahl < dauerHolz, 'Stahlangel sollte die Expedition verkürzen');
});

test('Expedition: sammeln vor Ablauf schlägt fehl, danach klappt es und alles wird zurückgesetzt', () => {
  const jetzt = 1_000_000;
  const z = spiel.neuerZustand();
  z.besitzItems.push('angel_holz');
  spiel.ruestAusItem(z, 'angel_holz');
  const start = spiel.starteExpedition(z, 'kurz', jetzt);
  assert.equal(start.erfolg, true);

  const zuFrueh = spiel.sammleExpedition(z, jetzt + 1000);
  assert.equal(zuFrueh.erfolg, false);
  assert.ok(z.expedition, 'Expedition sollte noch laufen');

  const vorherBL = z.bl;
  // zufall() liefert immer 0 → jede Fundchance > 0 schlägt sicher zu.
  const ergebnis = spiel.sammleExpedition(z, start.endZeit, () => 0);

  assert.equal(ergebnis.erfolg, true);
  assert.equal(z.expedition, null);
  assert.equal(z.expeditionenAbgeschlossen, 1);
  assert.ok(z.bl > vorherBL, 'BL-Belohnung sollte gutgeschrieben werden');
  assert.equal(ergebnis.kiste, 'holz');
  assert.equal(z.kisten.holz, 1);
  assert.ok(ergebnis.fisch, 'sollte einen Fisch gefunden haben');
  assert.ok(z.aquarium.includes(ergebnis.fisch.id));
});

test('Alle Aquarium-Fische sind eindeutig und haben einen Bonus über 1', () => {
  const ids = new Set();
  for (const f of AQUARIUM_FISCHE) {
    assert.ok(!ids.has(f.id), `doppelte Fisch-ID: ${f.id}`);
    ids.add(f.id);
    assert.ok(f.bonus > 1, `${f.id} sollte einen echten Bonus geben`);
    assert.ok(f.name && f.text && f.symbol);
  }
});

test('Aquarium-Fische erhöhen die Produktion multiplikativ', () => {
  const z = spiel.neuerZustand();
  z.module.qualle = 20;
  const vorher = spiel.produktionProSekunde(z);

  const fisch = findeAquariumFisch('nautilus');
  z.aquarium.push(fisch.id);
  const nachher = spiel.produktionProSekunde(z);

  assert.ok(
    Math.abs(nachher - vorher * fisch.bonus) < 1e-9,
    `erwartet ${vorher * fisch.bonus}, erhalten ${nachher}`
  );
});

test('Aufstieg behält Ausrüstung, Inventar, Kisten, Aquarium und laufende Expedition', () => {
  const z = spiel.neuerZustand();
  z.gesamtRunde = 4e6;
  z.gesamtGesamt = 9e6;

  z.besitzItems.push('angel_holz', 'koeder_wurm');
  spiel.ruestAusItem(z, 'angel_holz');
  spiel.ruestAusItem(z, 'koeder_wurm');
  z.kisten.silber = 2;
  z.aquarium.push('clownfisch');
  spiel.starteExpedition(z, 'lang', 1000);
  z.kistenGeoeffnet = 5;
  z.expeditionenAbgeschlossen = 3;

  const ergebnis = spiel.aufstieg(z);
  assert.equal(ergebnis.erfolg, true);

  assert.equal(z.ausruestung.angel, 'angel_holz');
  assert.equal(z.ausruestung.koeder, 'koeder_wurm');
  assert.deepEqual(z.besitzItems, ['angel_holz', 'koeder_wurm']);
  assert.equal(z.kisten.silber, 2);
  assert.deepEqual(z.aquarium, ['clownfisch']);
  assert.ok(z.expedition, 'laufende Expedition sollte einen Aufstieg überstehen');
  assert.equal(z.kistenGeoeffnet, 5);
  assert.equal(z.expeditionenAbgeschlossen, 3);
});

/* ------------------------------------------------------------------ */
/* Treibgut-Kiste, Tages-Truhe, Nächstes Ziel                          */
/* ------------------------------------------------------------------ */

test('Treibgut-Kiste braucht keinen eigenen Vorrat und liefert trotzdem ein Item', () => {
  const z = spiel.neuerZustand();
  z.module.qualle = 10;
  const ergebnis = spiel.sammleTreibgutKiste(z, Date.now(), () => 0.001);

  assert.equal(ergebnis.erfolg, true);
  assert.ok(ergebnis.kistenTyp, 'sollte einen Kistentyp gewürfelt haben');
  assert.equal(z.kistenGeoeffnet, 1);
  assert.deepEqual(z.kisten, { holz: 0, silber: 0, gold: 0 }, 'darf den Kisten-Vorrat nicht anfassen');
});

test('Ein Tag ist eine feste Zahl, die mit echter Zeit weiterzählt', () => {
  const tag1 = spiel.tagesnummer(0);
  const tag2 = spiel.tagesnummer(24 * 60 * 60 * 1000);
  const kurzVorMitternacht = spiel.tagesnummer(24 * 60 * 60 * 1000 - 1);
  assert.equal(tag2, tag1 + 1);
  assert.equal(kurzVorMitternacht, tag1);
});

test('Tages-Truhe: einmal am Tag, danach nicht noch einmal', () => {
  const z = spiel.neuerZustand();
  const jetzt = 10 * 24 * 60 * 60 * 1000;
  assert.equal(spiel.tagestruheVerfuegbar(z, jetzt), true);

  const erste = spiel.hohleTagestruhe(z, jetzt, () => 0.01);
  assert.equal(erste.erfolg, true);
  assert.equal(erste.streak, 1);
  assert.equal(spiel.tagestruheVerfuegbar(z, jetzt), false);

  const zweite = spiel.hohleTagestruhe(z, jetzt + 1000, () => 0.01);
  assert.equal(zweite.erfolg, false);
});

test('Tages-Truhe: Serie zählt an Folgetagen weiter, reißt aber bei einer Lücke ohne Strafe ab', () => {
  const z = spiel.neuerZustand();
  const TAG = 24 * 60 * 60 * 1000;
  const start = 20 * TAG;

  const tag1 = spiel.hohleTagestruhe(z, start, () => 0.01);
  const tag2 = spiel.hohleTagestruhe(z, start + TAG, () => 0.01);
  const tag3 = spiel.hohleTagestruhe(z, start + 2 * TAG, () => 0.01);
  assert.deepEqual([tag1.streak, tag2.streak, tag3.streak], [1, 2, 3]);

  // Ein Tag ausgelassen (übernächster statt nächster Tag): Serie beginnt neu
  // bei 1, aber nichts anderes geht verloren – kein Bestrafungsmechanismus.
  const nachLuecke = spiel.hohleTagestruhe(z, start + 5 * TAG, () => 0.01);
  assert.equal(nachLuecke.streak, 1);
  assert.equal(nachLuecke.erfolg, true);
});

test('Tages-Truhe zählt als geöffnete Kiste und liefert ein echtes Item oder BL', () => {
  const z = spiel.neuerZustand();
  z.module.qualle = 20;
  const ergebnis = spiel.hohleTagestruhe(z, Date.now(), () => 0.001);
  assert.equal(ergebnis.erfolg, true);
  assert.equal(z.kistenGeoeffnet, 1);
  assert.ok(ergebnis.item || ergebnis.duplikatBL > 0);
});

test('Aufstieg behält Tages-Truhen-Stand und Serie', () => {
  const z = spiel.neuerZustand();
  z.gesamtRunde = 4e6;
  z.gesamtGesamt = 9e6;
  spiel.hohleTagestruhe(z, 5 * 24 * 60 * 60 * 1000, () => 0.9);

  const streakVorher = z.tagesStreak;
  const tagVorher = z.tagestruheLetzterTag;
  spiel.aufstieg(z);

  assert.equal(z.tagesStreak, streakVorher);
  assert.equal(z.tagestruheLetzterTag, tagVorher);
});

test('Nächstes Ziel: Tages-Truhe hat Vorrang vor allem anderen', () => {
  const z = spiel.neuerZustand();
  z.bl = 1e9; // genug, um sofort jedes Modul kaufen zu können
  const ziel = spiel.naechstesZiel(z, Date.now());
  assert.equal(ziel.art, 'tagestruhe');
});

test('Nächstes Ziel: offene Kiste geht vor kaufbarem Modul', () => {
  const z = spiel.neuerZustand();
  spiel.hohleTagestruhe(z, Date.now(), () => 0.01); // Tages-Truhe aus dem Weg
  spiel.dreheGluecksrad(z, Date.now(), () => 0.01); // Glücksrad ebenfalls aus dem Weg
  z.kisten.holz = 1;
  z.bl = 1e9;
  const ziel = spiel.naechstesZiel(z, Date.now());
  assert.equal(ziel.art, 'kiste');
});

test('Nächstes Ziel: fertige Expedition geht vor kaufbarem Modul', () => {
  const z = spiel.neuerZustand();
  // Alles auf denselben Kalendertag legen, sonst erscheint die Tages-Truhe
  // beim späteren Prüf-Zeitpunkt fälschlich wieder als "neuer Tag".
  spiel.hohleTagestruhe(z, 0, () => 0.01);
  spiel.dreheGluecksrad(z, 0, () => 0.01);
  z.besitzItems.push('angel_holz');
  spiel.ruestAusItem(z, 'angel_holz');
  spiel.starteExpedition(z, 'kurz', 0);
  z.bl = 1e9;
  const nachExpeditionsende = 6 * 60 * 1000; // 6 Min. > 5 Min. Dauer von "kurz"
  const ziel = spiel.naechstesZiel(z, nachExpeditionsende);
  assert.equal(ziel.art, 'expedition');
});

test('Nächstes Ziel: ohne Guthaben wird auf das günstigste Modul gespart', () => {
  const z = spiel.neuerZustand();
  spiel.hohleTagestruhe(z, Date.now(), () => 0.01);
  spiel.dreheGluecksrad(z, Date.now(), () => 0.01);
  z.bl = 0;
  const ziel = spiel.naechstesZiel(z, Date.now());
  assert.equal(ziel.art, 'modul-sparen');
  assert.equal(ziel.anteil, 0);
  assert.ok(ziel.fehlt > 0);
});

test('Nächstes Ziel: bezahlbares Modul wird als konkrete Handlung vorgeschlagen', () => {
  const z = spiel.neuerZustand();
  spiel.hohleTagestruhe(z, Date.now(), () => 0.01);
  spiel.dreheGluecksrad(z, Date.now(), () => 0.01);
  z.bl = spiel.modulPreis(z, MODULE[0].id, 1);
  const ziel = spiel.naechstesZiel(z, Date.now());
  assert.equal(ziel.art, 'modul-kaufbar');
  assert.equal(ziel.modulId, MODULE[0].id);
});

/* ------------------------------------------------------------------ */
/* Erfolgs-Kiste, direkter Ausrüstungsfund, Perlen-Shop                */
/* ------------------------------------------------------------------ */

test('Erfolgs-Kiste liefert wie jede andere Kiste ein Item oder BL, und zählt mit', () => {
  const z = spiel.neuerZustand();
  z.module.qualle = 10;
  const ergebnis = spiel.sammleErfolgsKiste(z, Date.now(), () => 0.01);
  assert.equal(ergebnis.erfolg, true);
  assert.equal(z.kistenGeoeffnet, 1);
  assert.ok(ergebnis.item || ergebnis.duplikatBL > 0);
});

test('Jede Expedition hat eine direkte Ausrüstungs-Fundchance', () => {
  for (const e of EXPEDITIONEN) {
    assert.ok(typeof e.ausruestungChance === 'number' && e.ausruestungChance > 0, `${e.id} hat keine Ausrüstungschance`);
  }
});

test('Expedition kann Ausrüstung direkt liefern, ganz ohne den Umweg über eine Kiste', () => {
  const jetzt = 1_000_000;
  const z = spiel.neuerZustand();
  z.besitzItems.push('angel_holz');
  spiel.ruestAusItem(z, 'angel_holz');
  const start = spiel.starteExpedition(z, 'lang', jetzt); // größte Ausrüstungschance
  // zufall() liefert immer 0 → jede Fundchance > 0 schlägt sicher zu, auch
  // ohne dass vorher überhaupt eine Kiste im Spiel war.
  const ergebnis = spiel.sammleExpedition(z, start.endZeit, () => 0);

  assert.equal(ergebnis.erfolg, true);
  assert.ok(ergebnis.ausruestung, 'sollte direkt Ausrüstung gefunden haben');
  assert.ok(z.besitzItems.includes(ergebnis.ausruestung.id));
});

test('Perlen-Shop: kaufen kostet Perlen, doppelt kaufen und zu wenig Perlen schlagen fehl', () => {
  const z = spiel.neuerZustand();
  const item = PERLEN_SHOP[0];
  z.perlen = item.preis - 1;

  const zuWenig = spiel.kaufePerlenShopItem(z, item.id);
  assert.equal(zuWenig.erfolg, false);
  assert.equal(zuWenig.grund, 'zu wenig Perlen');

  z.perlen = item.preis + 5;
  const ergebnis = spiel.kaufePerlenShopItem(z, item.id);
  assert.equal(ergebnis.erfolg, true);
  assert.equal(z.perlen, 5);
  assert.ok(z.perlenShop.includes(item.id));

  const nochmal = spiel.kaufePerlenShopItem(z, item.id);
  assert.equal(nochmal.erfolg, false);
  assert.equal(nochmal.grund, 'bereits gekauft');
});

test('Alle Perlen-Shop-Angebote sind eindeutig und haben eine bekannte Wirkungsart', () => {
  const bekannteArten = new Set(['startModule', 'komboFensterFaktor', 'offlineAnteilBonus', 'fundChanceBonus']);
  const ids = new Set();
  for (const item of PERLEN_SHOP) {
    assert.ok(!ids.has(item.id), `doppelte ID: ${item.id}`);
    ids.add(item.id);
    assert.ok(bekannteArten.has(item.wirkung.art), `unbekannte Wirkungsart bei ${item.id}`);
    assert.ok(item.preis > 0 && item.name && item.text && item.symbol);
  }
});

test('Perlen-Shop: "Ruhiger Atem" verlängert das Kombofenster tatsächlich', () => {
  const z = spiel.neuerZustand();
  const ohne = spiel.komboFensterEffektiv(z);

  z.perlen = 100;
  spiel.kaufePerlenShopItem(z, 'kombogeduld');
  const mit = spiel.komboFensterEffektiv(z);

  assert.ok(mit > ohne, 'Kombofenster sollte länger geworden sein');

  // Wirkt sich auch tatsächlich auf komboAktiv aus, nicht nur auf die Zahl.
  z.kombo = 3;
  z.komboLetzterTipp = 0;
  const knappNachAltemFenster = spiel.KOMBO_FENSTER_MS + 50;
  assert.equal(spiel.komboAktiv(z, knappNachAltemFenster), true);
});

test('Perlen-Shop: "Ruhige Tiefe" erhöht den Offline-Anteil', () => {
  const ohne = spiel.neuerZustand();
  ohne.module.qualle = 20;
  const mit = spiel.neuerZustand();
  mit.module.qualle = 20;
  mit.perlen = 100;
  spiel.kaufePerlenShopItem(mit, 'offlinebonus');

  const ertragOhne = spiel.offlineErtrag(ohne, 3600).menge;
  const ertragMit = spiel.offlineErtrag(mit, 3600).menge;
  assert.ok(ertragMit > ertragOhne, 'Offline-Ertrag sollte mit dem Kauf höher sein');
});

test('Perlen-Shop: "Glückssträhne" erhöht Fundchancen auf Expeditionen', () => {
  const jetzt = 1_000_000;
  const z = spiel.neuerZustand();
  z.besitzItems.push('angel_holz');
  spiel.ruestAusItem(z, 'angel_holz');
  z.perlen = 100;
  spiel.kaufePerlenShopItem(z, 'kistenglueck');

  const start = spiel.starteExpedition(z, 'kurz', jetzt);
  // Schwelle ohne Glückssträhne: 0,5 (Basis) + 0,10 (Angel) = 0,60.
  // Mit Glückssträhne: + 0,05 = 0,65. 0,62 liegt genau dazwischen und
  // beweist damit wirklich den Beitrag des Perlen-Shop-Kaufs.
  const ergebnis = spiel.sammleExpedition(z, start.endZeit, () => 0.62);
  assert.equal(ergebnis.kiste, 'holz');
});

test('Perlen-Shop "Kopfstart" gibt nach dem Aufstieg sofort Startmodule', () => {
  const z = spiel.neuerZustand();
  z.perlen = 100;
  spiel.kaufePerlenShopItem(z, 'kopfstart');
  z.gesamtRunde = 4e6;
  z.gesamtGesamt = 9e6;

  const ergebnis = spiel.aufstieg(z);
  assert.equal(ergebnis.erfolg, true);
  assert.equal(z.module.qualle, 3);
  assert.ok(z.perlenShop.includes('kopfstart'), 'Perlen-Shop-Kauf sollte einen Aufstieg überstehen');
});

test('Speicher: nur bekannte Perlen-Shop-Käufe werden übernommen', () => {
  const vorlage = spiel.neuerZustand();
  const muell = zusammenfuehren(vorlage, { perlenShop: ['kombogeduld', 'gibtsNicht', 42] });
  assert.deepEqual(muell.perlenShop, ['kombogeduld']);
});

/* ------------------------------------------------------------------ */
/* Glücksrad                                                           */
/* ------------------------------------------------------------------ */

test('Alle Glücksrad-Felder sind eindeutig, kennen ihre Art und ein positives Gewicht', () => {
  const bekannteArten = new Set(['bl', 'boost', 'kiste', 'perlen']);
  const ids = new Set();
  for (const s of GLUECKSRAD_SEGMENTE) {
    assert.ok(!ids.has(s.id), `doppelte ID: ${s.id}`);
    ids.add(s.id);
    assert.ok(bekannteArten.has(s.art), `unbekannte Art bei ${s.id}`);
    assert.ok(s.gewicht > 0 && s.symbol && s.farbe && s.text);
  }
});

test('Glücksrad: vor der ersten Drehung sofort verfügbar, kein Rest', () => {
  const z = spiel.neuerZustand();
  assert.equal(spiel.gluecksradVerfuegbar(z), true);
  assert.equal(spiel.gluecksradRestMs(z), 0);
});

test('Glücksrad: nach einer Drehung 24 Stunden gesperrt, danach exakt wieder frei', () => {
  const jetzt = 10_000_000;
  const z = spiel.neuerZustand();
  const ergebnis = spiel.dreheGluecksrad(z, jetzt, () => 0);
  assert.equal(ergebnis.erfolg, true);

  assert.equal(spiel.gluecksradVerfuegbar(z, jetzt + 1000), false);
  assert.equal(spiel.gluecksradRestMs(z, jetzt + 1000), spiel.GLUECKSRAD_ABSTAND_MS - 1000);

  const kurzDavor = jetzt + spiel.GLUECKSRAD_ABSTAND_MS - 1;
  const genauDanach = jetzt + spiel.GLUECKSRAD_ABSTAND_MS;
  assert.equal(spiel.gluecksradVerfuegbar(z, kurzDavor), false);
  assert.equal(spiel.gluecksradVerfuegbar(z, genauDanach), true);

  const nochmal = spiel.dreheGluecksrad(z, kurzDavor);
  assert.equal(nochmal.erfolg, false);
});

test('Glücksrad-Feld "bl" schreibt Biolumineszenz gut', () => {
  const z = spiel.neuerZustand();
  z.module.qualle = 20;
  const vorherBl = z.bl;
  // zufall nahe 0 trifft "bl_klein" (erstes, größtes Gewicht).
  const ergebnis = spiel.dreheGluecksrad(z, Date.now(), () => 0);
  assert.equal(ergebnis.segment.id, 'bl_klein');
  assert.equal(ergebnis.segment.art, 'bl');
  assert.ok(ergebnis.bl > 0);
  assert.equal(z.bl, vorherBl + ergebnis.bl);
});

test('Glücksrad-Feld "boost" verlängert den Boost', () => {
  const jetzt = 1_000_000;
  const z = spiel.neuerZustand();
  const ergebnis = spiel.dreheGluecksrad(z, jetzt, () => 0.7); // trifft "boost_kurz"
  assert.equal(ergebnis.segment.id, 'boost_kurz');
  assert.ok(z.boostBis >= jetzt + ergebnis.segment.dauerMs);
});

test('Glücksrad-Feld "kiste" legt eine Kiste in den Vorrat, ohne sie zu öffnen', () => {
  const z = spiel.neuerZustand();
  const ergebnis = spiel.dreheGluecksrad(z, Date.now(), () => 0.999); // trifft "kiste_gold"
  assert.equal(ergebnis.segment.id, 'kiste_gold');
  assert.equal(z.kisten.gold, 1);
  assert.equal(z.besitzItems.length, 0, 'darf nicht wie eine geöffnete Kiste ein Item vergeben');
});

test('Glücksrad-Feld "perlen" schenkt direkt Perlen', () => {
  const z = spiel.neuerZustand();
  const ergebnis = spiel.dreheGluecksrad(z, Date.now(), () => 0.96); // trifft "perlen"
  assert.equal(ergebnis.segment.id, 'perlen');
  assert.equal(z.perlen, ergebnis.segment.anzahl);
});

test('Glücksrad zählt Drehungen mit und übersteht einen Aufstieg', () => {
  const z = spiel.neuerZustand();
  const jetzt = 2_000_000;
  spiel.dreheGluecksrad(z, jetzt, () => 0);
  assert.equal(z.gluecksradGedreht, 1);

  z.gesamtRunde = 4e6;
  z.gesamtGesamt = 9e6;
  spiel.aufstieg(z);

  assert.equal(z.gluecksradGedreht, 1);
  assert.equal(z.gluecksradLetzteDrehung, jetzt);
  assert.equal(spiel.gluecksradVerfuegbar(z, jetzt + 1000), false);
});

test('Speicher: gluecksradLetzteDrehung = 0 wird nicht mit "nie gedreht" verwechselt', () => {
  const vorlage = spiel.neuerZustand();
  const geladen = zusammenfuehren(vorlage, { gluecksradLetzteDrehung: 0 });
  assert.equal(geladen.gluecksradLetzteDrehung, 0);
  assert.notEqual(geladen.gluecksradLetzteDrehung, null);
});

test('Speicher: kaputte gluecksradLetzteDrehung wird zu null, gültige bleibt erhalten', () => {
  const vorlage = spiel.neuerZustand();
  const muell = zusammenfuehren(vorlage, { gluecksradLetzteDrehung: 'gestern' });
  assert.equal(muell.gluecksradLetzteDrehung, null);

  const gueltig = zusammenfuehren(vorlage, { gluecksradLetzteDrehung: 123456, gluecksradGedreht: 7 });
  assert.equal(gueltig.gluecksradLetzteDrehung, 123456);
  assert.equal(gueltig.gluecksradGedreht, 7);
});

/* ------------------------------------------------------------------ */
/* Kappung gegen Auto-Clicker (20 Tipps/Sek.)                          */
/* ------------------------------------------------------------------ */

test('Der allererste Tipp wird nie gekappt, egal bei welchem Zeitstempel', () => {
  const z = spiel.neuerZustand();
  const ergebnis = spiel.tippe(z, 0, () => 1);
  assert.equal(ergebnis.gekappt, undefined);
  assert.equal(z.tipps, 1);
});

test('Schneller als 20/Sek. wird der Tipp verworfen: kein Ertrag, kein Zählen, kein Komboaufbau', () => {
  const z = spiel.neuerZustand();
  spiel.tippe(z, 0, () => 1);

  const zuSchnell = spiel.tippe(z, spiel.TIPP_MINDESTABSTAND_MS - 1, () => 1);
  assert.equal(zuSchnell.gekappt, true);
  assert.equal(zuSchnell.ertrag, 0);
  assert.equal(z.tipps, 1, 'darf nicht mitgezählt werden');
  assert.equal(z.kombo, 1, 'darf die Kombo nicht verändern');
});

test('Genau am Limit (20/Sek.) zählt der Tipp noch normal', () => {
  const z = spiel.neuerZustand();
  spiel.tippe(z, 0, () => 1);
  const amLimit = spiel.tippe(z, spiel.TIPP_MINDESTABSTAND_MS, () => 1);
  assert.equal(amLimit.gekappt, undefined);
  assert.equal(z.tipps, 2);
});

test('Nach einer Kappung zählt der nächste, ausreichend späte Tipp wieder normal', () => {
  const z = spiel.neuerZustand();
  spiel.tippe(z, 0, () => 1);
  spiel.tippe(z, 5, () => 1); // gekappt, wird ignoriert
  const danach = spiel.tippe(z, spiel.TIPP_MINDESTABSTAND_MS + 10, () => 1);
  assert.equal(danach.gekappt, undefined);
  assert.equal(z.tipps, 2, 'der gekappte Tipp in der Mitte darf nicht mitzählen');
});

test('20 Tipps pro Sekunde am Stück werden alle angenommen, der 21. in derselben Sekunde nicht', () => {
  const z = spiel.neuerZustand();
  let jetzt = 0;
  for (let i = 0; i < 20; i++) {
    const ergebnis = spiel.tippe(z, jetzt, () => 1);
    assert.equal(ergebnis.gekappt, undefined, `Tipp ${i + 1} sollte noch zählen`);
    jetzt += spiel.TIPP_MINDESTABSTAND_MS;
  }
  assert.equal(z.tipps, 20);
});

/* ------------------------------------------------------------------ */
/* Marianengraben-Moment                                               */
/* ------------------------------------------------------------------ */

test('Marianengraben-Moment löst erst bei ausreichender Tiefe aus, dann genau einmal', () => {
  const z = spiel.neuerZustand();
  assert.equal(spiel.pruefeMarianengraben(z), false);

  z.maxTiefe = spiel.MARIANENGRABEN_TIEFE - 1;
  assert.equal(spiel.pruefeMarianengraben(z), false);

  z.maxTiefe = spiel.MARIANENGRABEN_TIEFE;
  assert.equal(spiel.pruefeMarianengraben(z), true);
  assert.equal(z.marianengrabenGesehen, true);

  // Ein zweiter Aufruf (z. B. nächster Frame) darf nicht erneut auslösen.
  assert.equal(spiel.pruefeMarianengraben(z), false);
});

test('Marianengraben-Tiefe deckt sich mit dem Beginn der Grabenzone', () => {
  const grabenzone = zoneFuer(spiel.MARIANENGRABEN_TIEFE);
  assert.equal(grabenzone.name, 'Grabenzone');
  assert.equal(zoneFuer(spiel.MARIANENGRABEN_TIEFE - 1).name, 'Abgrundzone');
});

test('Marianengraben-Moment übersteht einen Aufstieg (kein erneutes Auslösen danach)', () => {
  const z = spiel.neuerZustand();
  z.maxTiefe = spiel.MARIANENGRABEN_TIEFE;
  spiel.pruefeMarianengraben(z);
  z.gesamtRunde = 4e6;
  z.gesamtGesamt = 9e6;

  spiel.aufstieg(z);

  assert.equal(z.marianengrabenGesehen, true);
  assert.equal(spiel.pruefeMarianengraben(z), false);
});

test('Speicher: marianengrabenGesehen wird als echtes Boolean übernommen', () => {
  const vorlage = spiel.neuerZustand();
  assert.equal(zusammenfuehren(vorlage, { marianengrabenGesehen: true }).marianengrabenGesehen, true);
  assert.equal(zusammenfuehren(vorlage, { marianengrabenGesehen: 'ja' }).marianengrabenGesehen, false);
  assert.equal(zusammenfuehren(vorlage, {}).marianengrabenGesehen, false);
});
