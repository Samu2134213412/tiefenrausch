/**
 * Spielstand sichern und laden.
 *
 * Gespeichert wird im localStorage – das funktioniert im Browser wie auch
 * in der Android-App (WebView) ohne zusätzliche Berechtigungen.
 *
 * Wichtig: Ein beschädigter Spielstand darf niemals dazu führen, dass das
 * Spiel nicht mehr startet. Deshalb wird jeder Ladevorgang abgesichert und
 * fällt im Zweifel auf einen frischen Zustand zurück.
 */
import { neuerZustand, SPIELSTAND_VERSION } from './spiel.js';
import {
  MODULE,
  VERBESSERUNGEN,
  ENTDECKUNGEN,
  ERFOLGE,
  ITEMS,
  findeItem,
  KISTEN_TYPEN,
  EXPEDITIONEN,
  AQUARIUM_FISCHE,
  PERLEN_SHOP,
} from './daten.js';

const SCHLUESSEL = 'tiefenrausch.spielstand';
const SICHERUNG = 'tiefenrausch.spielstand.sicherung';

function verfuegbar() {
  try {
    const test = '__test__';
    localStorage.setItem(test, '1');
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

export function speichern(zustand) {
  if (!verfuegbar()) return false;
  try {
    zustand.zuletztGespielt = Date.now();
    const text = JSON.stringify(zustand);
    // Vorherigen Stand als Sicherung behalten, bevor überschrieben wird.
    const vorher = localStorage.getItem(SCHLUESSEL);
    if (vorher) localStorage.setItem(SICHERUNG, vorher);
    localStorage.setItem(SCHLUESSEL, text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Lädt den Spielstand und repariert fehlende Felder.
 * @returns {{zustand: object, warVorhanden: boolean, verstricheneSekunden: number}}
 */
export function laden() {
  const frisch = neuerZustand();
  if (!verfuegbar()) return { zustand: frisch, warVorhanden: false, verstricheneSekunden: 0 };

  const roh = localStorage.getItem(SCHLUESSEL) ?? localStorage.getItem(SICHERUNG);
  if (!roh) return { zustand: frisch, warVorhanden: false, verstricheneSekunden: 0 };

  let gelesen;
  try {
    gelesen = JSON.parse(roh);
  } catch {
    return { zustand: frisch, warVorhanden: false, verstricheneSekunden: 0 };
  }
  if (!gelesen || typeof gelesen !== 'object') {
    return { zustand: frisch, warVorhanden: false, verstricheneSekunden: 0 };
  }

  const zustand = zusammenfuehren(frisch, gelesen);
  const verstrichen = Math.max(0, (Date.now() - (zustand.zuletztGespielt ?? Date.now())) / 1000);
  return { zustand, warVorhanden: true, verstricheneSekunden: verstrichen };
}

/**
 * Führt einen gelesenen Stand mit der aktuellen Struktur zusammen.
 * Neue Felder aus einer neuen Spielversion bekommen so ihren Standardwert,
 * ohne dass alte Spielstände verloren gehen.
 */
export function zusammenfuehren(vorlage, gelesen) {
  const zustand = { ...vorlage };

  const zahlenfelder = [
    'bl', 'gesamtRunde', 'gesamtGesamt', 'perlen', 'aufstiege',
    'tipps', 'maxTiefe', 'spielzeit', 'zuletztGespielt', 'boostBis', 'werbungGesehen',
    'komboMax', 'kritischeTreffer', 'leuchtblasenGesammelt', 'gluecksfischeGefangen',
    'kistenGeoeffnet', 'expeditionenAbgeschlossen', 'tagesStreak', 'gluecksradGedreht',
    // kombo/komboLetzterTipp bewusst NICHT übernommen: eine geladene Kombo
    // ohne aktuellen Tipp-Rhythmus wäre irreführend – sie bleibt bei 0 und
    // baut sich beim nächsten Antippen neu auf.
  ];
  for (const feld of zahlenfelder) {
    const wert = Number(gelesen[feld]);
    if (Number.isFinite(wert) && wert >= 0) zustand[feld] = wert;
  }

  zustand.werbefrei = gelesen.werbefrei === true;
  zustand.marianengrabenGesehen = gelesen.marianengrabenGesehen === true;

  // Module: nur bekannte Kennungen übernehmen.
  zustand.module = {};
  for (const m of MODULE) {
    const wert = Math.floor(Number(gelesen.module?.[m.id]));
    zustand.module[m.id] = Number.isFinite(wert) && wert > 0 ? wert : 0;
  }

  // Listen gegen die bekannten Inhalte abgleichen. Nur zu prüfen, ob ein Wert
  // eine Zahl ist, reicht nicht: Number(null) ergibt 0 und käme sonst durch.
  const bekannteVerbesserungen = new Set(VERBESSERUNGEN.map((v) => v.id));
  const bekannteTiefen = new Set(ENTDECKUNGEN.map((e) => e.tiefe));
  const bekannteErfolge = new Set(ERFOLGE.map((e) => e.id));

  zustand.verbesserungen = Array.isArray(gelesen.verbesserungen)
    ? [...new Set(gelesen.verbesserungen.filter((x) => bekannteVerbesserungen.has(x)))]
    : [];
  zustand.entdeckungen = Array.isArray(gelesen.entdeckungen)
    ? [...new Set(gelesen.entdeckungen.map(Number).filter((x) => bekannteTiefen.has(x)))]
    : [];
  zustand.erfolge = Array.isArray(gelesen.erfolge)
    ? [...new Set(gelesen.erfolge.filter((x) => bekannteErfolge.has(x)))]
    : [];

  // Inventar: nur bekannte Item-IDs übernehmen.
  const bekannteItems = new Set(ITEMS.map((i) => i.id));
  zustand.besitzItems = Array.isArray(gelesen.besitzItems)
    ? [...new Set(gelesen.besitzItems.filter((x) => bekannteItems.has(x)))]
    : [];

  // Ausrüstung: nur übernehmen, was auch tatsächlich besessen wird und in
  // den richtigen Steckplatz passt – sonst könnte ein manipulierter Spielstand
  // ein Item in den falschen Slot stecken.
  zustand.ausruestung = { angel: null, koeder: null };
  for (const slot of ['angel', 'koeder']) {
    const id = gelesen.ausruestung?.[slot];
    const item = typeof id === 'string' ? findeItem(id) : null;
    if (item && item.slot === slot && zustand.besitzItems.includes(id)) {
      zustand.ausruestung[slot] = id;
    }
  }

  // Kisten: nur bekannte Typen, nicht-negative Ganzzahlen.
  zustand.kisten = {};
  for (const k of KISTEN_TYPEN) {
    const wert = Math.floor(Number(gelesen.kisten?.[k.id]));
    zustand.kisten[k.id] = Number.isFinite(wert) && wert > 0 ? wert : 0;
  }

  // Aquarium: nur bekannte Fisch-IDs übernehmen.
  const bekannteFische = new Set(AQUARIUM_FISCHE.map((f) => f.id));
  zustand.aquarium = Array.isArray(gelesen.aquarium)
    ? [...new Set(gelesen.aquarium.filter((x) => bekannteFische.has(x)))]
    : [];

  // Laufende Expedition: nur übernehmen, wenn Typ und Zeitstempel plausibel
  // sind – sonst lieber keine laufende Expedition, als eine kaputte.
  const bekannteExpeditionen = new Set(EXPEDITIONEN.map((e) => e.id));
  const roheExpedition = gelesen.expedition;
  if (
    roheExpedition &&
    typeof roheExpedition === 'object' &&
    bekannteExpeditionen.has(roheExpedition.expeditionId) &&
    Number.isFinite(Number(roheExpedition.startZeit)) &&
    Number.isFinite(Number(roheExpedition.endZeit)) &&
    Number(roheExpedition.endZeit) >= Number(roheExpedition.startZeit)
  ) {
    zustand.expedition = {
      expeditionId: roheExpedition.expeditionId,
      startZeit: Number(roheExpedition.startZeit),
      endZeit: Number(roheExpedition.endZeit),
    };
  } else {
    zustand.expedition = null;
  }

  // tagestruheLetzterTag ist entweder eine Tagesnummer oder null (noch nie
  // abgeholt). Number(null) wäre 0 – ein gültiger Tag (1.1.1970) – und würde
  // eine unbenutzte Truhe fälschlich als „heute schon abgeholt“ markieren.
  // Deshalb hier bewusst nicht über die generische Zahlenfeld-Liste.
  const tagRoh = gelesen.tagestruheLetzterTag;
  zustand.tagestruheLetzterTag = Number.isInteger(tagRoh) ? tagRoh : null;

  // gluecksradLetzteDrehung: echter Zeitstempel oder null (noch nie gedreht).
  // Aus demselben Grund wie oben nicht über die Zahlenfeld-Liste: 0 ist ein
  // gültiger Zeitstempel (1.1.1970) und darf nicht mit „nie gedreht“
  // verwechselt werden.
  const drehungRoh = gelesen.gluecksradLetzteDrehung;
  zustand.gluecksradLetzteDrehung = Number.isInteger(drehungRoh) ? drehungRoh : null;

  // Perlen-Shop: nur bekannte Angebote übernehmen.
  const bekanntePerlenShopItems = new Set(PERLEN_SHOP.map((i) => i.id));
  zustand.perlenShop = Array.isArray(gelesen.perlenShop)
    ? [...new Set(gelesen.perlenShop.filter((x) => bekanntePerlenShopItems.has(x)))]
    : [];

  zustand.version = SPIELSTAND_VERSION;
  return zustand;
}

export function loeschen() {
  if (!verfuegbar()) return;
  localStorage.removeItem(SCHLUESSEL);
  localStorage.removeItem(SICHERUNG);
}

/* ---------- Sicherungskopie zum Mitnehmen ---------- */

/** Spielstand als Text, den man kopieren und aufbewahren kann. */
export function alsText(zustand) {
  try {
    return btoa(unescape(encodeURIComponent(JSON.stringify(zustand))));
  } catch {
    return '';
  }
}

export function ausText(text) {
  try {
    const roh = decodeURIComponent(escape(atob(String(text).trim())));
    const gelesen = JSON.parse(roh);
    return zusammenfuehren(neuerZustand(), gelesen);
  } catch {
    return null;
  }
}
