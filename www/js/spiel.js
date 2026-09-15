/**
 * Spiellogik – bewusst ohne Zugriff auf das Dokument.
 *
 * Alles hier sind reine Funktionen auf einem Zustandsobjekt. Dadurch lässt
 * sich die Balance testen, ohne das Spiel zu starten, und ein Fehler in der
 * Anzeige kann niemals den Spielstand beschädigen.
 */
import {
  MODULE,
  VERBESSERUNGEN,
  ENTDECKUNGEN,
  ERFOLGE,
  KOSTENWACHSTUM,
  PERLEN_BONUS,
  perlenFuer,
  tiefeAus,
  levelAus,
  levelFortschritt,
  gesamtModule,
  ITEMS,
  findeItem,
  KISTEN_TYPEN,
  findeKistenTyp,
  EXPEDITIONEN,
  findeExpedition,
  AQUARIUM_FISCHE,
  findeAquariumFisch,
  gewichteteAuswahl,
  PERLEN_SHOP,
  GLUECKSRAD_SEGMENTE,
  SKILLBAUM,
  findeSkillknoten,
} from './daten.js';

export const SPIELSTAND_VERSION = 1;

/** Offline wird langsamer gesammelt als im Spiel – sonst lohnt Zuschauen nicht. */
export const OFFLINE_ANTEIL = 0.5;
export const OFFLINE_MAX_STUNDEN = 4;

/**
 * Kombo: schnell hintereinander tippen steigert den Ertrag.
 * Bleibt die Pause zwischen zwei Tipps unter dem Fenster, zählt die Kombo
 * weiter – sonst beginnt sie bei 1. Das belohnt zügiges Tippen, ohne dass
 * eine kurze Unterbrechung (Handwechsel, Blick aufs Menü) gleich alles kostet.
 */
export const KOMBO_FENSTER_MS = 900;
export const KOMBO_MAX_STUFE = 20;
export const KOMBO_BONUS_PRO_STUFE = 0.05; // +5 % je Kombostufe, gedeckelt bei ×2

/** Kritische Treffer: seltener, dafür spürbarer Ausreißer nach oben. */
export const KRIT_GRUNDCHANCE = 0.04;
export const KRIT_CHANCE_PRO_KOMBO = 0.003;
export const KRIT_CHANCE_MAX = 0.25;
export const KRIT_MULTIPLIKATOR = 8;

export function neuerZustand() {
  const module = {};
  for (const m of MODULE) module[m.id] = 0;
  return {
    version: SPIELSTAND_VERSION,
    bl: 0,
    gesamtRunde: 0,
    gesamtGesamt: 0,
    module,
    verbesserungen: [],
    entdeckungen: [],
    erfolge: [],
    perlen: 0,
    aufstiege: 0,
    tipps: 0,
    kombo: 0,
    komboMax: 0,
    komboLetzterTipp: 0,
    kritischeTreffer: 0,
    leuchtblasenGesammelt: 0,
    gluecksfischeGefangen: 0,
    maxTiefe: 0,
    spielzeit: 0,
    zuletztGespielt: Date.now(),
    boostBis: 0,
    werbungGesehen: 0,
    werbefrei: false,
    ausruestung: { angel: null, koeder: null },
    besitzItems: [],
    kisten: { holz: 0, silber: 0, gold: 0 },
    aquarium: [],
    expedition: null,
    kistenGeoeffnet: 0,
    expeditionenAbgeschlossen: 0,
    tagestruheLetzterTag: null,
    tagesStreak: 0,
    perlenShop: [],
    gluecksradLetzteDrehung: null,
    gluecksradGedreht: 0,
    marianengrabenGesehen: false,
    levelBelohntBis: 0,
    skillpunkte: 0,
    skillbaum: [],
  };
}

/* ------------------------------------------------------------------ */
/* Multiplikatoren                                                     */
/* ------------------------------------------------------------------ */

function gekaufteVerbesserungen(zustand) {
  return VERBESSERUNGEN.filter((v) => zustand.verbesserungen.includes(v.id));
}

/** Bonus aus allen entdeckten Kreaturen (multiplikativ). */
export function entdeckungsBonus(zustand) {
  let faktor = 1;
  for (const e of ENTDECKUNGEN) {
    if (zustand.entdeckungen.includes(e.tiefe)) faktor *= e.bonus;
  }
  return faktor;
}

/** Bonus aus Perlen: jede Perle dauerhaft +2 %. */
export function perlenBonus(zustand) {
  return 1 + zustand.perlen * PERLEN_BONUS;
}

/**
 * Zeitlich begrenzter Verdopplungs-Bonus (aus Belohnungsvideo).
 * `jetzt = Infinity` bedeutet ausdrücklich „ohne Boost rechnen“ – das wird
 * für den Offline-Ertrag gebraucht. (Ein kleiner Wert wie 0 würde das
 * Gegenteil bewirken, weil jeder Zeitstempel größer als 0 ist.)
 */
export function boostFaktor(zustand, jetzt = Date.now()) {
  return zustand.boostBis > jetzt ? 2 : 1;
}

/** Rechenzeitpunkt, bei dem niemals ein Boost aktiv ist. */
export const OHNE_BOOST = Infinity;

/** Bonus aus dem Aquarium: jeder gesammelte Fisch wirkt dauerhaft und multiplikativ. */
export function aquariumBonus(zustand) {
  let faktor = 1;
  for (const fischId of zustand.aquarium ?? []) {
    const fisch = findeAquariumFisch(fischId);
    if (fisch) faktor *= fisch.bonus;
  }
  return faktor;
}

/** Wirkt auf alles: Perlen, Entdeckungen, Aquarium, Boost. */
export function gesamtMultiplikator(zustand, jetzt = Date.now()) {
  return (
    perlenBonus(zustand) *
    entdeckungsBonus(zustand) *
    aquariumBonus(zustand) *
    boostFaktor(zustand, jetzt)
  );
}

/* ------------------------------------------------------------------ */
/* Perlen-Shop: einmalige, dauerhafte Vergünstigungen                  */
/* ------------------------------------------------------------------ */

/**
 * Summiert die Wirkung aller dauerhaften Vergünstigungen einer bestimmten
 * Art – sowohl aus dem Perlen-Shop als auch aus dem Skillbaum, die beide
 * dasselbe { art, wert }-Format benutzen. Mehrere Quellen derselben Art
 * addieren sich einfach.
 */
function dauerhafteBonusSumme(zustand, art) {
  let summe = 0;
  for (const id of zustand.perlenShop ?? []) {
    const item = PERLEN_SHOP.find((i) => i.id === id);
    if (item?.wirkung.art === art) summe += item.wirkung.wert;
  }
  for (const id of zustand.skillbaum ?? []) {
    const knoten = findeSkillknoten(id);
    if (knoten?.wirkung.art === art) summe += knoten.wirkung.wert;
  }
  return summe;
}

/** Effektives Kombofenster inklusive evtl. gekaufter/freigeschalteter Verlängerungen. */
export function komboFensterEffektiv(zustand) {
  let faktor = 1;
  for (const id of zustand.perlenShop ?? []) {
    const item = PERLEN_SHOP.find((i) => i.id === id);
    if (item?.wirkung.art === 'komboFensterFaktor') faktor *= item.wirkung.wert;
  }
  for (const id of zustand.skillbaum ?? []) {
    const knoten = findeSkillknoten(id);
    if (knoten?.wirkung.art === 'komboFensterFaktor') faktor *= knoten.wirkung.wert;
  }
  return KOMBO_FENSTER_MS * faktor;
}

/**
 * Kauft eine dauerhafte Vergünstigung mit Perlen. Anders als der passive
 * +2 %-Bonus pro Perle ist das eine aktive Entscheidung: Die ausgegebenen
 * Perlen fehlen danach bei der Produktionsberechnung – ein echter Tausch,
 * keine reine Zusatzbelohnung.
 */
export function kaufePerlenShopItem(zustand, id) {
  const item = PERLEN_SHOP.find((i) => i.id === id);
  if (!item) return { erfolg: false, grund: 'unbekannt' };
  if (zustand.perlenShop.includes(id)) return { erfolg: false, grund: 'bereits gekauft' };
  if (zustand.perlen < item.preis) return { erfolg: false, grund: 'zu wenig Perlen' };
  zustand.perlen -= item.preis;
  zustand.perlenShop.push(id);
  return { erfolg: true, item };
}

/**
 * Schaltet einen Skillbaum-Knoten mit Skillpunkten frei. Anders als der
 * Perlen-Shop (mit Perlen bezahlt) läuft das über eine eigene Währung, die
 * nur durch Level-Aufstiege entsteht – ein zweiter, unabhängiger
 * Fortschrittspfad neben den Perlen.
 */
export function kaufeSkillknoten(zustand, knotenId) {
  const knoten = findeSkillknoten(knotenId);
  if (!knoten) return { erfolg: false, grund: 'unbekannt' };
  if (zustand.skillbaum.includes(knotenId)) return { erfolg: false, grund: 'bereits freigeschaltet' };
  if (knoten.braucht && !zustand.skillbaum.includes(knoten.braucht)) {
    return { erfolg: false, grund: 'Voraussetzung fehlt' };
  }
  if (zustand.skillpunkte < knoten.kosten) return { erfolg: false, grund: 'zu wenig Skillpunkte' };
  zustand.skillpunkte -= knoten.kosten;
  zustand.skillbaum.push(knotenId);
  return { erfolg: true, knoten };
}

/* ------------------------------------------------------------------ */
/* Produktion                                                          */
/* ------------------------------------------------------------------ */

/** Ertrag eines einzelnen Moduls pro Sekunde, inklusive seiner Verbesserungen. */
export function modulErtrag(zustand, modulId) {
  const modul = MODULE.find((m) => m.id === modulId);
  if (!modul) return 0;
  let faktor = 1;
  for (const v of gekaufteVerbesserungen(zustand)) {
    if (v.wirkung.art === 'modul' && v.wirkung.ziel === modulId) faktor *= v.wirkung.faktor;
  }
  return modul.ertrag * faktor;
}

/** Produktion aller Module vor den globalen Boni. */
function grundproduktion(zustand) {
  let summe = 0;
  for (const m of MODULE) {
    const anzahl = zustand.module[m.id] ?? 0;
    if (anzahl > 0) summe += modulErtrag(zustand, m.id) * anzahl;
  }
  return summe;
}

function globalerFaktor(zustand) {
  let faktor = 1;
  for (const v of gekaufteVerbesserungen(zustand)) {
    if (v.wirkung.art === 'global') faktor *= v.wirkung.faktor;
  }
  faktor *= 1 + dauerhafteBonusSumme(zustand, 'produktionBonus');
  return faktor;
}

/** Biolumineszenz pro Sekunde – die zentrale Kennzahl des Spiels. */
export function produktionProSekunde(zustand, jetzt = Date.now()) {
  return grundproduktion(zustand) * globalerFaktor(zustand) * gesamtMultiplikator(zustand, jetzt);
}

/** Ertrag eines Antippens. */
export function tippErtrag(zustand, jetzt = Date.now()) {
  let grund = 1;
  let anteil = 0;
  for (const v of gekaufteVerbesserungen(zustand)) {
    if (v.wirkung.art === 'tippen') grund *= v.wirkung.faktor;
    if (v.wirkung.art === 'tippenAnteil') anteil += v.wirkung.anteil;
  }
  grund *= 1 + dauerhafteBonusSumme(zustand, 'tippBonus');
  const ausProduktion = produktionProSekunde(zustand, jetzt) * anteil;
  return grund * gesamtMultiplikator(zustand, jetzt) + ausProduktion;
}

/* ------------------------------------------------------------------ */
/* Kaufen                                                              */
/* ------------------------------------------------------------------ */

/** Preis für die nächsten `anzahl` Einheiten eines Moduls. */
export function modulPreis(zustand, modulId, anzahl = 1) {
  const modul = MODULE.find((m) => m.id === modulId);
  if (!modul) return Infinity;
  const besitz = zustand.module[modulId] ?? 0;
  let summe = 0;
  for (let i = 0; i < anzahl; i++) {
    summe += modul.grundpreis * Math.pow(KOSTENWACHSTUM, besitz + i);
  }
  return Math.ceil(summe);
}

/** Wie viele Einheiten sind mit dem vorhandenen Guthaben bezahlbar? */
export function maximalKaufbar(zustand, modulId) {
  const modul = MODULE.find((m) => m.id === modulId);
  if (!modul) return 0;
  const besitz = zustand.module[modulId] ?? 0;
  // Geschlossene Form der geometrischen Reihe, nach Anzahl aufgelöst.
  const guthaben = zustand.bl;
  const basis = modul.grundpreis * Math.pow(KOSTENWACHSTUM, besitz);
  if (guthaben < basis) return 0;
  const anzahl = Math.floor(
    Math.log((guthaben * (KOSTENWACHSTUM - 1)) / basis + 1) / Math.log(KOSTENWACHSTUM)
  );
  return Math.max(0, anzahl);
}

export function kaufeModul(zustand, modulId, anzahl = 1) {
  if (anzahl <= 0) return { erfolg: false, grund: 'ungültige Anzahl' };
  const preis = modulPreis(zustand, modulId, anzahl);
  if (zustand.bl < preis) return { erfolg: false, grund: 'zu wenig Biolumineszenz' };
  zustand.bl -= preis;
  zustand.module[modulId] = (zustand.module[modulId] ?? 0) + anzahl;
  return { erfolg: true, preis, anzahl };
}

/** Ist die Bedingung für eine Verbesserung erfüllt? */
export function bedingungErfuellt(zustand, verbesserung) {
  const b = verbesserung.bedingung ?? {};
  if (b.tipps !== undefined && zustand.tipps < b.tipps) return false;
  if (b.module !== undefined && gesamtModule(zustand) < b.module) return false;
  if (b.modul !== undefined && (zustand.module[b.modul] ?? 0) < (b.anzahl ?? 1)) return false;
  return true;
}

/** Verbesserungen, die sichtbar und noch nicht gekauft sind. */
export function verfuegbareVerbesserungen(zustand) {
  return VERBESSERUNGEN.filter(
    (v) => !zustand.verbesserungen.includes(v.id) && bedingungErfuellt(zustand, v)
  );
}

export function kaufeVerbesserung(zustand, id) {
  const v = VERBESSERUNGEN.find((x) => x.id === id);
  if (!v) return { erfolg: false, grund: 'unbekannt' };
  if (zustand.verbesserungen.includes(id)) return { erfolg: false, grund: 'bereits gekauft' };
  if (!bedingungErfuellt(zustand, v)) return { erfolg: false, grund: 'Bedingung nicht erfüllt' };
  if (zustand.bl < v.preis) return { erfolg: false, grund: 'zu wenig Biolumineszenz' };
  zustand.bl -= v.preis;
  zustand.verbesserungen.push(id);
  return { erfolg: true, verbesserung: v };
}

/* ------------------------------------------------------------------ */
/* Fortschritt                                                         */
/* ------------------------------------------------------------------ */

function gutschreiben(zustand, menge) {
  zustand.bl += menge;
  zustand.gesamtRunde += menge;
  zustand.gesamtGesamt += menge;
}

export function aktuelleTiefe(zustand) {
  return tiefeAus(zustand.gesamtGesamt);
}

export function aktuellesLevel(zustand) {
  return levelAus(zustand.gesamtGesamt);
}

export function aktuellerLevelFortschritt(zustand) {
  return levelFortschritt(zustand.gesamtGesamt);
}

/**
 * Schaltet Entdeckungen frei, die durch die aktuelle Tiefe erreicht wurden.
 * @returns {Array} neu freigeschaltete Entdeckungen
 */
export function pruefeEntdeckungen(zustand) {
  const tiefe = aktuelleTiefe(zustand);
  if (tiefe > zustand.maxTiefe) zustand.maxTiefe = tiefe;
  const neu = [];
  for (const e of ENTDECKUNGEN) {
    if (zustand.maxTiefe >= e.tiefe && !zustand.entdeckungen.includes(e.tiefe)) {
      zustand.entdeckungen.push(e.tiefe);
      neu.push(e);
    }
  }
  return neu;
}

/** Tiefe des Marianengrabens im Spiel – deckt sich mit dem Beginn der Grabenzone. */
export const MARIANENGRABEN_TIEFE = 11_000;

/**
 * Einmaliger Abschluss-Moment beim ersten Erreichen des Marianengrabens.
 * Anders als bei den Erfolgen (kurzer Hinweis) bekommt dieser Meilenstein
 * einen eigenen, größeren Dialog in der Oberfläche – das Spiel geht danach
 * ganz normal weiter, es ist ein Höhepunkt, kein echtes Ende.
 * @returns {boolean} true, wenn der Moment gerade jetzt neu ausgelöst wurde
 */
export function pruefeMarianengraben(zustand) {
  if (zustand.marianengrabenGesehen) return false;
  if (zustand.maxTiefe < MARIANENGRABEN_TIEFE) return false;
  zustand.marianengrabenGesehen = true;
  return true;
}

/** @returns {Array} neu erreichte Erfolge */
export function pruefeErfolge(zustand) {
  const neu = [];
  for (const e of ERFOLGE) {
    if (!zustand.erfolge.includes(e.id) && e.pruef(zustand)) {
      zustand.erfolge.push(e.id);
      neu.push(e);
    }
  }
  return neu;
}

/** Multiplikator, den eine bestimmte Kombostufe auf den Tipp-Ertrag legt. */
export function komboFaktorFuer(kombo) {
  const stufe = Math.min(Math.max(kombo - 1, 0), KOMBO_MAX_STUFE);
  return 1 + stufe * KOMBO_BONUS_PRO_STUFE;
}

/** Ist die Kombo gerade noch „warm“, oder ist das Fenster schon verstrichen? */
export function komboAktiv(zustand, jetzt = Date.now()) {
  return (zustand.kombo ?? 0) > 0 && jetzt - (zustand.komboLetzterTipp ?? 0) <= komboFensterEffektiv(zustand);
}

/** Anteil des Kombofensters, der noch übrig ist (1 = eben getippt, 0 = abgelaufen). */
export function komboRestAnteil(zustand, jetzt = Date.now()) {
  if (!komboAktiv(zustand, jetzt)) return 0;
  const verstrichen = jetzt - zustand.komboLetzterTipp;
  return Math.max(0, 1 - verstrichen / komboFensterEffektiv(zustand));
}

/** Trefferchance für einen kritischen Treffer bei der übergebenen Kombostufe. */
export function kritChanceFuer(kombo) {
  const stufe = Math.min(Math.max(kombo - 1, 0), KOMBO_MAX_STUFE);
  return Math.min(KRIT_CHANCE_MAX, KRIT_GRUNDCHANCE + stufe * KRIT_CHANCE_PRO_KOMBO);
}

/**
 * Kappung gegen Auto-Clicker und Skripte: schneller als 20 Tipps/Sek. wird
 * komplett ignoriert (nicht nur schwächer vergütet) – sonst würde sich
 * Automatisierung am Ende doch wieder lohnen. Von Hand ist dieses Tempo
 * praktisch nicht erreichbar, es trifft also nur automatisierte Eingaben.
 */
export const TIPP_MAX_PRO_SEKUNDE = 20;
export const TIPP_MINDESTABSTAND_MS = 1000 / TIPP_MAX_PRO_SEKUNDE;

/**
 * Ein Antippen.
 *
 * @param {object} zustand
 * @param {number} [jetzt]
 * @param {() => number} [zufall] Quelle für Zufallszahlen in [0, 1) – austauschbar,
 *   damit kritische Treffer in Tests ohne Zufall auslösbar/ausschließbar sind.
 * @returns {{ertrag:number, kombo:number, komboFaktor:number, kritisch:boolean, basisErtrag:number, gekappt?:boolean}}
 */
export function tippe(zustand, jetzt = Date.now(), zufall = Math.random) {
  const seitLetztem = jetzt - (zustand.komboLetzterTipp ?? 0);

  if (zustand.tipps > 0 && seitLetztem < TIPP_MINDESTABSTAND_MS) {
    return {
      ertrag: 0,
      kombo: zustand.kombo ?? 0,
      komboFaktor: komboFaktorFuer(zustand.kombo ?? 0),
      kritisch: false,
      basisErtrag: 0,
      gekappt: true,
    };
  }

  zustand.kombo = seitLetztem <= komboFensterEffektiv(zustand) ? (zustand.kombo ?? 0) + 1 : 1;
  zustand.komboLetzterTipp = jetzt;
  if (zustand.kombo > (zustand.komboMax ?? 0)) zustand.komboMax = zustand.kombo;

  const komboFaktor = komboFaktorFuer(zustand.kombo);
  const kritisch = zufall() < kritChanceFuer(zustand.kombo);
  if (kritisch) zustand.kritischeTreffer = (zustand.kritischeTreffer ?? 0) + 1;

  const basisErtrag = tippErtrag(zustand, jetzt);
  const ertrag = basisErtrag * komboFaktor * (kritisch ? KRIT_MULTIPLIKATOR : 1);

  zustand.tipps += 1;
  gutschreiben(zustand, ertrag);

  return { ertrag, kombo: zustand.kombo, komboFaktor, kritisch, basisErtrag };
}

/** Ein Zeitschritt der Spielschleife. */
export function tick(zustand, sekunden, jetzt = Date.now()) {
  if (!(sekunden > 0)) return 0;
  const menge = produktionProSekunde(zustand, jetzt) * sekunden;
  gutschreiben(zustand, menge);
  zustand.spielzeit += sekunden;
  zustand.zuletztGespielt = jetzt;
  return menge;
}

/* ------------------------------------------------------------------ */
/* Abwesenheit                                                         */
/* ------------------------------------------------------------------ */

/**
 * Was wurde während der Abwesenheit gesammelt?
 * Wird begrenzt, damit sehr lange Pausen das Spiel nicht überspringen –
 * und damit es sich lohnt, wiederzukommen statt wegzubleiben.
 */
export function offlineErtrag(zustand, verstricheneSekunden, maxStunden = OFFLINE_MAX_STUNDEN) {
  const grenze = maxStunden * 3600;
  const angerechnet = Math.max(0, Math.min(verstricheneSekunden, grenze));
  // Boost zählt offline ausdrücklich nicht mit.
  const proSekunde = produktionProSekunde(zustand, OHNE_BOOST);
  const anteil = OFFLINE_ANTEIL + dauerhafteBonusSumme(zustand, 'offlineAnteilBonus');
  return {
    sekunden: angerechnet,
    abgeschnitten: verstricheneSekunden > grenze,
    menge: proSekunde * angerechnet * anteil,
  };
}

export function schreibeOfflineGut(zustand, menge) {
  if (menge > 0) gutschreiben(zustand, menge);
  return menge;
}

/* ------------------------------------------------------------------ */
/* Aufstieg (Prestige)                                                 */
/* ------------------------------------------------------------------ */

export function perlenBeiAufstieg(zustand) {
  return perlenFuer(zustand.gesamtRunde);
}

/**
 * Auftauchen: Module und Verbesserungen gehen verloren, Perlen bleiben
 * und erhöhen dauerhaft die Produktion. Entdeckungen und Erfolge bleiben
 * ebenfalls – sonst würde sich der Neustart wie eine Strafe anfühlen.
 */
export function aufstieg(zustand) {
  const gewinn = perlenBeiAufstieg(zustand);
  if (gewinn <= 0) return { erfolg: false, grund: 'noch zu wenig gesammelt' };

  const behalten = {
    perlen: zustand.perlen + gewinn,
    aufstiege: zustand.aufstiege + 1,
    entdeckungen: zustand.entdeckungen,
    erfolge: zustand.erfolge,
    maxTiefe: zustand.maxTiefe,
    gesamtGesamt: zustand.gesamtGesamt,
    tipps: zustand.tipps,
    spielzeit: zustand.spielzeit,
    werbungGesehen: zustand.werbungGesehen,
    werbefrei: zustand.werbefrei,
    // Lebenszeit-Zähler für Erfolge, die sich nicht in einer einzigen Runde
    // erreichen lassen müssen (z. B. „100 kritische Treffer“) – sonst würde
    // häufiges Auftauchen genau die Erfolge unerreichbar machen, die es
    // eigentlich belohnen soll.
    komboMax: zustand.komboMax,
    kritischeTreffer: zustand.kritischeTreffer,
    leuchtblasenGesammelt: zustand.leuchtblasenGesammelt,
    gluecksfischeGefangen: zustand.gluecksfischeGefangen,
    // Ausrüstung, Inventar, Kisten, Aquarium und eine laufende Expedition sind
    // Sammlungen bzw. an echte Uhrzeit gebunden, kein Produktions-Fortschritt –
    // sie gehen beim Auftauchen genauso wenig verloren wie Entdeckungen/Erfolge.
    ausruestung: zustand.ausruestung,
    besitzItems: zustand.besitzItems,
    kisten: zustand.kisten,
    aquarium: zustand.aquarium,
    expedition: zustand.expedition,
    kistenGeoeffnet: zustand.kistenGeoeffnet,
    expeditionenAbgeschlossen: zustand.expeditionenAbgeschlossen,
    // Der Login-Tag/die Serie sind an den Kalender gebunden, nicht an eine
    // Spielrunde – ein Auftauchen darf eine bestehende Serie nicht kappen.
    tagestruheLetzterTag: zustand.tagestruheLetzterTag,
    tagesStreak: zustand.tagesStreak,
    // Perlen-Shop-Käufe sind so dauerhaft wie die Perlen selbst, mit denen
    // sie bezahlt wurden.
    perlenShop: zustand.perlenShop,
    // Wie der Login-Tag oben: an die echte Uhrzeit gebunden, nicht an eine
    // Spielrunde.
    gluecksradLetzteDrehung: zustand.gluecksradLetzteDrehung,
    gluecksradGedreht: zustand.gluecksradGedreht,
    // Hängt an maxTiefe, das selbst schon erhalten bleibt - der Moment darf
    // nicht bei jedem weiteren Aufstieg erneut aufploppen.
    marianengrabenGesehen: zustand.marianengrabenGesehen,
    // Level hängt an gesamtGesamt, das selbst schon erhalten bleibt - sonst
    // würden nach jedem Aufstieg alle Meilensteine erneut Ausrüstung geben.
    levelBelohntBis: zustand.levelBelohntBis,
    // Skillpunkte und freigeschaltete Knoten sind eine dauerhafte
    // Investition wie der Perlen-Shop, kein Runden-Fortschritt.
    skillpunkte: zustand.skillpunkte,
    skillbaum: zustand.skillbaum,
  };

  const frisch = neuerZustand();
  Object.assign(frisch, behalten);
  frisch.zuletztGespielt = Date.now();

  // Zustand an Ort und Stelle ersetzen, damit alle Verweise gültig bleiben.
  for (const schluessel of Object.keys(zustand)) delete zustand[schluessel];
  Object.assign(zustand, frisch);

  // Perlen-Shop-Vergünstigungen, die sofort nach dem Reset wirken (z. B. ein
  // paar Startmodule statt bei null anzufangen) – erst hier anwendbar, weil
  // vorher noch der alte Zustand existierte.
  for (const item of PERLEN_SHOP) {
    if (zustand.perlenShop.includes(item.id) && item.wirkung.art === 'startModule') {
      zustand.module[item.wirkung.modulId] = Math.max(
        zustand.module[item.wirkung.modulId] ?? 0,
        item.wirkung.anzahl
      );
    }
  }

  return { erfolg: true, gewonnen: gewinn, perlen: zustand.perlen };
}

/* ------------------------------------------------------------------ */
/* Belohnungen                                                         */
/* ------------------------------------------------------------------ */

export const BOOST_DAUER_MS = 10 * 60 * 1000;

/**
 * Verlängert den Zeitmultiplikator, ohne irgendeine Statistik anzufassen –
 * die gemeinsame Grundlage für alle Boost-Quellen (Werbevideo, Glücksfisch, …).
 */
export function verlaengereBoost(zustand, jetzt = Date.now(), dauer = BOOST_DAUER_MS) {
  const start = Math.max(zustand.boostBis, jetzt);
  zustand.boostBis = start + dauer;
  return zustand.boostBis;
}

/**
 * Boost über ein Belohnungsvideo. Zählt zusätzlich als „gesehene Werbung“ –
 * wichtig, damit diese Zahl später ehrlich bleibt, wenn es einmal echte
 * Werbeeinnahmen gibt. Andere Boost-Quellen (z. B. der Glücksfisch) dürfen
 * diese Statistik nicht mit verfälschen und rufen stattdessen direkt
 * `verlaengereBoost` auf.
 */
export function starteBoost(zustand, jetzt = Date.now(), dauer = BOOST_DAUER_MS) {
  const bis = verlaengereBoost(zustand, jetzt, dauer);
  zustand.werbungGesehen += 1;
  return bis;
}

export function boostRestSekunden(zustand, jetzt = Date.now()) {
  return Math.max(0, Math.ceil((zustand.boostBis - jetzt) / 1000));
}

/* ------------------------------------------------------------------ */
/* Glücksfisch: seltener, schnell vorbeischwimmender Boost-Geber        */
/* ------------------------------------------------------------------ */

/** Kürzer als der Werbevideo-Boost – der Anreiz, tatsächlich ein Video
 *  anzusehen, soll trotzdem größer bleiben als das Glück beim Fischfang. */
export const GLUECKSFISCH_BOOST_MS = 3 * 60 * 1000;

/** Fängt den Glücksfisch: verlängert den Boost, zählt aber nicht als Werbung. */
export function fangeGluecksfisch(zustand, jetzt = Date.now()) {
  const bis = verlaengereBoost(zustand, jetzt, GLUECKSFISCH_BOOST_MS);
  zustand.gluecksfischeGefangen = (zustand.gluecksfischeGefangen ?? 0) + 1;
  return bis;
}

/* ------------------------------------------------------------------ */
/* Leuchtblase: seltenes, zeitlich begrenztes Sammelobjekt              */
/* ------------------------------------------------------------------ */

/**
 * Wert einer eingesammelten Leuchtblase in „Sekunden Produktion“. So skaliert
 * die Belohnung automatisch mit dem Spielstand – im späten Spiel ist sie in
 * absoluten Zahlen riesig, fühlt sich aber relativ genauso lohnend an wie
 * am Anfang.
 */
export const LEUCHTBLASE_SEKUNDENWERT = 90;

/**
 * Wie viel eine Leuchtblase gerade wert wäre, ohne sie einzusammeln.
 * Auch ganz am Anfang (kaum Produktion) lohnt sich das Antippen spürbar –
 * daher der Mindestbetrag auf Basis des aktuellen Tipp-Ertrags.
 */
export function leuchtblasenBelohnung(zustand, jetzt = Date.now()) {
  const ausProduktion = produktionProSekunde(zustand, jetzt) * LEUCHTBLASE_SEKUNDENWERT;
  const mindestens = Math.max(50, tippErtrag(zustand, jetzt) * 25);
  return Math.max(ausProduktion, mindestens);
}

/** Sammelt die Leuchtblase ein und schreibt die Belohnung gut. */
export function sammleLeuchtblase(zustand, jetzt = Date.now()) {
  const belohnung = leuchtblasenBelohnung(zustand, jetzt);
  gutschreiben(zustand, belohnung);
  zustand.leuchtblasenGesammelt = (zustand.leuchtblasenGesammelt ?? 0) + 1;
  return belohnung;
}

/* ------------------------------------------------------------------ */
/* Ausrüstung: Angel und Köder, aus Kisten gewonnen                    */
/* ------------------------------------------------------------------ */

/** Rüstet ein besessenes Item in seinen Steckplatz aus (ersetzt ein evtl. vorhandenes). */
export function ruestAusItem(zustand, itemId) {
  const item = findeItem(itemId);
  if (!item) return { erfolg: false, grund: 'unbekanntes Item' };
  if (!zustand.besitzItems.includes(itemId)) return { erfolg: false, grund: 'nicht im Besitz' };
  zustand.ausruestung[item.slot] = itemId;
  return { erfolg: true, item };
}

function ausgeruestetesItem(zustand, slot) {
  const id = zustand.ausruestung?.[slot];
  return id ? findeItem(id) : null;
}

export function hatAngel(zustand) {
  return zustand.ausruestung?.angel != null;
}

/** Wie stark die ausgerüstete Angel die Expeditionsdauer verkürzt (1 = keine Angel/kein Effekt). */
export function angelZeitFaktor(zustand) {
  return ausgeruestetesItem(zustand, 'angel')?.zeitFaktor ?? 1;
}

/** Zusätzliche Fundchance durch die ausgerüstete Angel (0 ohne Angel). */
export function angelFundChance(zustand) {
  return ausgeruestetesItem(zustand, 'angel')?.fundChance ?? 0;
}

/** Multiplikator auf die BL-Beute einer Expedition durch den ausgerüsteten Köder. */
export function koederBlFaktor(zustand) {
  return ausgeruestetesItem(zustand, 'koeder')?.blFaktor ?? 1;
}

/** Zusätzliche Fundchance durch den ausgerüsteten Köder (0 ohne Köder). */
export function koederFundBonus(zustand) {
  return ausgeruestetesItem(zustand, 'koeder')?.fundBonus ?? 0;
}

/* ------------------------------------------------------------------ */
/* Kisten: Loot mit Seltenheitsstufen                                  */
/* ------------------------------------------------------------------ */

/** „Duplikat“-Ausgleich in Sekunden Produktion, gestaffelt nach Seltenheit –
 *  eine Kiste, deren komplette Seltenheitsstufe schon besessen wird, darf
 *  sich trotzdem lohnen. */
export const KISTEN_DUPLIKAT_SEKUNDENWERT = {
  gewoehnlich: 60,
  selten: 240,
  episch: 900,
  legendaer: 3600,
};

/**
 * Würfelt den Inhalt einer Kiste eines bestimmten Typs aus: eine Seltenheit
 * (gewichtet nach der Kistendefinition) und darin ein noch nicht besessenes
 * Item. Ist bereits alles dieser Seltenheit im Besitz, gibt es stattdessen BL
 * – eine Kiste ist also nie „für nichts“. Rührt weder Kisten-Vorrat noch den
 * Zähler an; das erledigen die aufrufenden Funktionen, die jeweils eine
 * andere Quelle für die Kiste haben (eigener Vorrat, Treibgut, Tages-Truhe).
 */
function wuerfleKistenInhalt(zustand, kistenTypId, jetzt, zufall) {
  const kistenTyp = findeKistenTyp(kistenTypId);
  const seltenheit = gewichteteAuswahl(kistenTyp.gewichte, zufall);
  const kandidaten = ITEMS.filter(
    (i) => i.seltenheit === seltenheit && !zustand.besitzItems.includes(i.id)
  );

  if (kandidaten.length > 0) {
    const index = Math.min(kandidaten.length - 1, Math.floor(zufall() * kandidaten.length));
    const item = kandidaten[index];
    zustand.besitzItems.push(item.id);
    return { erfolg: true, kistenTyp, seltenheit, item, duplikatBL: 0 };
  }

  const duplikatBL =
    (KISTEN_DUPLIKAT_SEKUNDENWERT[seltenheit] ?? 60) * produktionProSekunde(zustand, jetzt);
  gutschreiben(zustand, duplikatBL);
  return { erfolg: true, kistenTyp, seltenheit, item: null, duplikatBL };
}

/** Öffnet eine Kiste aus dem eigenen Vorrat. */
export function oeffneKiste(zustand, kistenTypId, jetzt = Date.now(), zufall = Math.random) {
  const kistenTyp = findeKistenTyp(kistenTypId);
  if (!kistenTyp) return { erfolg: false, grund: 'unbekannter Kistentyp' };
  if ((zustand.kisten[kistenTypId] ?? 0) <= 0) return { erfolg: false, grund: 'keine Kiste dieses Typs' };

  zustand.kisten[kistenTypId] -= 1;
  zustand.kistenGeoeffnet = (zustand.kistenGeoeffnet ?? 0) + 1;
  return wuerfleKistenInhalt(zustand, kistenTypId, jetzt, zufall);
}

/** Verteilung, aus der eine im Wasser gefundene Treibgut-Kiste ihren Typ zieht –
 *  meistens Holz, selten aber auch mal eine Goldkiste. */
export const TREIBGUT_KISTE_GEWICHTE = { holz: 70, silber: 25, gold: 5 };

/**
 * Seltener Fund direkt im Wasser (siehe start.js: die „treibende Kiste“, ein
 * Pendant zu Leuchtblase/Glücksfisch). Anders als beim eigenen Vorrat wird
 * hier kein Kistentyp verbraucht – sie kommt direkt aus dem Meer und wird an
 * Ort und Stelle geöffnet.
 */
export function sammleTreibgutKiste(zustand, jetzt = Date.now(), zufall = Math.random) {
  const kistenTypId = gewichteteAuswahl(TREIBGUT_KISTE_GEWICHTE, zufall);
  zustand.kistenGeoeffnet = (zustand.kistenGeoeffnet ?? 0) + 1;
  return wuerfleKistenInhalt(zustand, kistenTypId, jetzt, zufall);
}

/** Verteilung für Kisten, die ein Erfolg abwirft – im Schnitt großzügiger als
 *  Treibgut, da ein Erfolg eine echte Leistung ist, kein reiner Zufallsfund. */
export const ERFOLG_KISTE_GEWICHTE = { holz: 55, silber: 35, gold: 10 };

/**
 * Jeder neu erreichte Erfolg gibt eine Kiste (siehe start.js: erscheint dafür
 * mittig im Bild und wird eingesammelt statt automatisch gutgeschrieben – der
 * Erfolgsmoment soll sich anfassen lassen).
 */
export function sammleErfolgsKiste(zustand, jetzt = Date.now(), zufall = Math.random) {
  const kistenTypId = gewichteteAuswahl(ERFOLG_KISTE_GEWICHTE, zufall);
  zustand.kistenGeoeffnet = (zustand.kistenGeoeffnet ?? 0) + 1;
  return wuerfleKistenInhalt(zustand, kistenTypId, jetzt, zufall);
}

/**
 * Würfelt ein Stück Ausrüstung direkt heraus, ohne den Umweg über eine Kiste
 * – bekommt eine eigene Gewichtstabelle übergeben, damit unterschiedliche
 * Quellen (Expedition, Level-Meilenstein) unterschiedlich großzügig sein
 * können, ohne die Auswahl-Logik selbst zu verdoppeln.
 */
function wuerfleAusruestungMitGewichten(zustand, gewichte, zufall) {
  const seltenheit = gewichteteAuswahl(gewichte, zufall);
  const kandidaten = ITEMS.filter(
    (i) => i.seltenheit === seltenheit && !zustand.besitzItems.includes(i.id)
  );
  if (kandidaten.length === 0) return null;
  const index = Math.min(kandidaten.length - 1, Math.floor(zufall() * kandidaten.length));
  const item = kandidaten[index];
  zustand.besitzItems.push(item.id);
  return item;
}

/** Eigene, mittig gewichtete Verteilung statt einer Kistenstufe, damit
 *  Legendäres auch beim direkten Expeditionsfund selten bleibt. */
const EXPEDITIONS_AUSRUESTUNG_GEWICHTE = { gewoehnlich: 55, selten: 32, episch: 11, legendaer: 2 };

/* ------------------------------------------------------------------ */
/* Level: zweite Fortschrittsleiste, alle 5 Level garantiert Ausrüstung */
/* ------------------------------------------------------------------ */

/** Jedes wievielte Level eine garantierte Ausrüstung bringt statt nur BL. */
export const LEVEL_AUSRUESTUNG_ALLE = 5;

/** Großzügiger gewichtet als der beiläufige Expeditionsfund - ein
 *  Level-Meilenstein ist eine verdiente, keine zufällige Belohnung. */
const LEVEL_AUSRUESTUNG_GEWICHTE = { gewoehnlich: 30, selten: 42, episch: 22, legendaer: 6 };

/**
 * Schreibt alle seit dem letzten Aufruf neu erreichten Level gut - meist
 * genau eins, nach langer Abwesenheit aber möglicherweise mehrere auf
 * einmal. Jedes Level bringt etwas BL, jedes fünfte zusätzlich ein Stück
 * Ausrüstung, das man noch nicht besitzt.
 * @returns {Array<{level:number, bl:number, ausruestung:object|null}>}
 */
export function pruefeLevelAufstieg(zustand, jetzt = Date.now(), zufall = Math.random) {
  const zielLevel = levelAus(zustand.gesamtGesamt);
  const neu = [];
  while (zustand.levelBelohntBis < zielLevel) {
    zustand.levelBelohntBis += 1;
    const level = zustand.levelBelohntBis;

    const ausProduktion = produktionProSekunde(zustand, jetzt) * 20 * level;
    const mindestens = Math.max(20, tippErtrag(zustand, jetzt) * 8);
    const bl = Math.max(ausProduktion, mindestens);
    gutschreiben(zustand, bl);
    zustand.skillpunkte = (zustand.skillpunkte ?? 0) + 1;

    let ausruestung = null;
    if (level % LEVEL_AUSRUESTUNG_ALLE === 0) {
      ausruestung = wuerfleAusruestungMitGewichten(zustand, LEVEL_AUSRUESTUNG_GEWICHTE, zufall);
    }

    neu.push({ level, bl, ausruestung });
  }
  return neu;
}

/* ------------------------------------------------------------------ */
/* Expeditionen: echte Wartezeit gegen Kisten und seltene Fische        */
/* ------------------------------------------------------------------ */

/** Ohne ausgerüstete Angel gibt es nichts, das man aussetzen könnte. */
export function starteExpedition(zustand, expeditionId, jetzt = Date.now()) {
  if (!hatAngel(zustand)) return { erfolg: false, grund: 'keine Angel ausgerüstet' };
  if (zustand.expedition) return { erfolg: false, grund: 'Expedition läuft bereits' };
  const def = findeExpedition(expeditionId);
  if (!def) return { erfolg: false, grund: 'unbekannte Expedition' };

  let expeditionsDauerFaktor = 1;
  for (const id of zustand.skillbaum ?? []) {
    const knoten = findeSkillknoten(id);
    if (knoten?.wirkung.art === 'expeditionsDauerFaktor') expeditionsDauerFaktor *= knoten.wirkung.wert;
  }
  const dauer = Math.max(1000, Math.round(def.dauerMs * angelZeitFaktor(zustand) * expeditionsDauerFaktor));
  zustand.expedition = { expeditionId, startZeit: jetzt, endZeit: jetzt + dauer };
  return { erfolg: true, endZeit: zustand.expedition.endZeit };
}

export function expeditionFertig(zustand, jetzt = Date.now()) {
  return Boolean(zustand.expedition && jetzt >= zustand.expedition.endZeit);
}

/** Verbleibende Zeit der laufenden Expedition in Millisekunden (0, wenn keine läuft oder fertig). */
export function expeditionRestMs(zustand, jetzt = Date.now()) {
  if (!zustand.expedition) return 0;
  return Math.max(0, zustand.expedition.endZeit - jetzt);
}

/**
 * Holt die abgeschlossene Expedition ab: schreibt BL gut, würfelt eine Kiste
 * und einen neuen Aquarium-Fisch. Angel/Köder erhöhen die Fundchance für
 * beides gemeinsam – sie machen den ganzen Streifzug ergiebiger, nicht nur
 * einen Teil davon.
 */
export function sammleExpedition(zustand, jetzt = Date.now(), zufall = Math.random) {
  if (!zustand.expedition) return { erfolg: false, grund: 'keine Expedition aktiv' };
  if (!expeditionFertig(zustand, jetzt)) return { erfolg: false, grund: 'noch nicht fertig' };

  const def = findeExpedition(zustand.expedition.expeditionId);
  zustand.expedition = null;
  zustand.expeditionenAbgeschlossen = (zustand.expeditionenAbgeschlossen ?? 0) + 1;
  if (!def) return { erfolg: false, grund: 'unbekannte Expedition' };

  const produktion = produktionProSekunde(zustand, jetzt);
  const basis = def.blSekundenwert * produktion;
  const mindestens = Math.max(80, tippErtrag(zustand, jetzt) * 30);
  const bl = Math.max(basis, mindestens) * koederBlFaktor(zustand);
  gutschreiben(zustand, bl);

  const fundBonus = angelFundChance(zustand) + koederFundBonus(zustand) + dauerhafteBonusSumme(zustand, 'fundChanceBonus');

  let kiste = null;
  if (zufall() < def.kistenChance + fundBonus) {
    zustand.kisten[def.kistenTyp] = (zustand.kisten[def.kistenTyp] ?? 0) + 1;
    kiste = def.kistenTyp;
  }

  let fisch = null;
  if (zufall() < def.fischChance + fundBonus) {
    const kandidaten = AQUARIUM_FISCHE.filter((f) => !zustand.aquarium.includes(f.id));
    if (kandidaten.length > 0) {
      const index = Math.min(kandidaten.length - 1, Math.floor(zufall() * kandidaten.length));
      fisch = kandidaten[index];
      zustand.aquarium.push(fisch.id);
    }
  }

  // Zweiter, direkterer Weg zu Angel/Köder als über eine erst noch zu
  // öffnende Kiste – vor allem auf längeren Expeditionen spürbar.
  let ausruestung = null;
  if (zufall() < (def.ausruestungChance ?? 0) + fundBonus) {
    ausruestung = wuerfleAusruestungMitGewichten(zustand, EXPEDITIONS_AUSRUESTUNG_GEWICHTE, zufall);
  }

  return { erfolg: true, bl, kiste, fisch, ausruestung };
}

/* ------------------------------------------------------------------ */
/* Tages-Truhe: täglicher Login-Bonus mit Serie                        */
/* ------------------------------------------------------------------ */

/**
 * Kalendertag als reine Zahl, ohne Date-Objekte – ein Wechsel passiert an
 * UTC-Mitternacht. Für einen Gratis-Tagesbonus reicht diese grobe, aber
 * absolut verlässliche Grenze; auf die exakte lokale Mitternacht kommt es
 * hier nicht an.
 */
const MS_PRO_TAG = 86_400_000;
export function tagesnummer(jetzt = Date.now()) {
  return Math.floor(jetzt / MS_PRO_TAG);
}

/** Ist die Tages-Truhe heute noch nicht abgeholt? */
export function tagestruheVerfuegbar(zustand, jetzt = Date.now()) {
  return zustand.tagestruheLetzterTag !== tagesnummer(jetzt);
}

/**
 * Wie viele Tage in Folge die Truhe geholt wurde, bestimmen die Chancen auf
 * eine bessere Kiste – nicht die Menge. So bleibt "jeden Tag kurz reinschauen"
 * belohnend, ohne dass ein einziger Tag Pause hart bestraft wird: die Serie
 * setzt nur auf 1 zurück, nichts geht endgültig verloren.
 */
function serienGewichte(serie) {
  if (serie >= 14) return { holz: 20, silber: 40, gold: 40 };
  if (serie >= 7) return { holz: 40, silber: 45, gold: 15 };
  if (serie >= 3) return { holz: 60, silber: 35, gold: 5 };
  return { holz: 80, silber: 18, gold: 2 };
}

/** Holt die heutige Tages-Truhe ab (einmal pro Kalendertag). */
export function hohleTagestruhe(zustand, jetzt = Date.now(), zufall = Math.random) {
  if (!tagestruheVerfuegbar(zustand, jetzt)) return { erfolg: false, grund: 'heute schon abgeholt' };

  const heute = tagesnummer(jetzt);
  const gestern = heute - 1;
  zustand.tagesStreak = zustand.tagestruheLetzterTag === gestern ? (zustand.tagesStreak ?? 0) + 1 : 1;
  zustand.tagestruheLetzterTag = heute;

  const kistenTypId = gewichteteAuswahl(serienGewichte(zustand.tagesStreak), zufall);
  zustand.kistenGeoeffnet = (zustand.kistenGeoeffnet ?? 0) + 1;
  const inhalt = wuerfleKistenInhalt(zustand, kistenTypId, jetzt, zufall);
  return { ...inhalt, streak: zustand.tagesStreak };
}

/* ------------------------------------------------------------------ */
/* Nächstes Ziel: ein einzelner, immer erreichbarer nächster Schritt    */
/* ------------------------------------------------------------------ */

/**
 * Statt aus vielen Listen selbst herauszusuchen, was als Nächstes sinnvoll
 * ist, zeigt diese Funktion immer genau EIN konkretes, kurzfristig
 * erreichbares Ziel – wichtig für Spielerinnen und Spieler, die von zu vielen
 * gleichzeitigen offenen Möglichkeiten eher überfordert als motiviert werden.
 * Priorität: Dinge, die JETZT sofort etwas bringen, kommen vor Dingen, auf
 * die man erst noch hinsparen muss.
 */
export function naechstesZiel(zustand, jetzt = Date.now()) {
  if (tagestruheVerfuegbar(zustand, jetzt)) {
    return { art: 'tagestruhe', text: 'Tages-Truhe abholen!' };
  }
  if (gluecksradVerfuegbar(zustand, jetzt)) {
    return { art: 'gluecksrad', text: 'Am Glücksrad drehen!' };
  }
  if (KISTEN_TYPEN.some((k) => (zustand.kisten[k.id] ?? 0) > 0)) {
    return { art: 'kiste', text: 'Kiste wartet aufs Öffnen!' };
  }
  if (expeditionFertig(zustand, jetzt)) {
    return { art: 'expedition', text: 'Expedition ist zurück!' };
  }

  for (const m of MODULE) {
    const preis = modulPreis(zustand, m.id, 1);
    if (zustand.bl >= preis) {
      return { art: 'modul-kaufbar', text: `${m.symbol} ${m.name} kaufen!`, modulId: m.id };
    }
  }

  let guenstigstes = null;
  for (const m of MODULE) {
    const preis = modulPreis(zustand, m.id, 1);
    if (!guenstigstes || preis < guenstigstes.preis) guenstigstes = { modul: m, preis };
  }
  if (!guenstigstes) return null;

  return {
    art: 'modul-sparen',
    text: `${guenstigstes.modul.symbol} ${guenstigstes.modul.name}`,
    modulId: guenstigstes.modul.id,
    anteil: Math.max(0, Math.min(1, zustand.bl / guenstigstes.preis)),
    fehlt: Math.max(0, guenstigstes.preis - zustand.bl),
  };
}

/* ------------------------------------------------------------------ */
/* Glücksrad: einmal täglich drehen, echter Countdown bis zum nächsten */
/* ------------------------------------------------------------------ */

/**
 * Anders als die Tages-Truhe (Kalendertag-Grenze) zählt hier die tatsächlich
 * vergangene Zeit seit der letzten Drehung – das ergibt einen echten,
 * herunterlaufenden Timer statt nur „ab Mitternacht wieder da“.
 */
export const GLUECKSRAD_ABSTAND_MS = 24 * 60 * 60 * 1000;

export function gluecksradVerfuegbar(zustand, jetzt = Date.now()) {
  return (
    zustand.gluecksradLetzteDrehung == null ||
    jetzt - zustand.gluecksradLetzteDrehung >= GLUECKSRAD_ABSTAND_MS
  );
}

/** Verbleibende Zeit bis zur nächsten Drehung in Millisekunden (0 = jetzt verfügbar). */
export function gluecksradRestMs(zustand, jetzt = Date.now()) {
  if (gluecksradVerfuegbar(zustand, jetzt)) return 0;
  return Math.max(0, zustand.gluecksradLetzteDrehung + GLUECKSRAD_ABSTAND_MS - jetzt);
}

/**
 * Dreht das Glücksrad: würfelt eines der acht Felder (gewichtet) und
 * schreibt dessen Belohnung sofort gut. `segmentIndex` verrät der Oberfläche,
 * auf welches Feld das Rad optisch zeigen soll.
 */
export function dreheGluecksrad(zustand, jetzt = Date.now(), zufall = Math.random) {
  if (!gluecksradVerfuegbar(zustand, jetzt)) return { erfolg: false, grund: 'noch nicht verfügbar' };

  const gewichte = {};
  for (const s of GLUECKSRAD_SEGMENTE) gewichte[s.id] = s.gewicht;
  const segmentId = gewichteteAuswahl(gewichte, zufall);
  const segment = GLUECKSRAD_SEGMENTE.find((s) => s.id === segmentId);
  const segmentIndex = GLUECKSRAD_SEGMENTE.indexOf(segment);

  zustand.gluecksradLetzteDrehung = jetzt;
  zustand.gluecksradGedreht = (zustand.gluecksradGedreht ?? 0) + 1;

  const ergebnis = { erfolg: true, segment, segmentIndex };

  switch (segment.art) {
    case 'bl': {
      const ausProduktion = segment.sekundenwert * produktionProSekunde(zustand, jetzt);
      const mindestens = Math.max(40, tippErtrag(zustand, jetzt) * (segment.sekundenwert / 4));
      ergebnis.bl = Math.max(ausProduktion, mindestens);
      gutschreiben(zustand, ergebnis.bl);
      break;
    }
    case 'boost':
      verlaengereBoost(zustand, jetzt, segment.dauerMs);
      break;
    case 'kiste':
      zustand.kisten[segment.kistenTyp] = (zustand.kisten[segment.kistenTyp] ?? 0) + 1;
      break;
    case 'perlen':
      zustand.perlen += segment.anzahl;
      break;
  }

  return ergebnis;
}
