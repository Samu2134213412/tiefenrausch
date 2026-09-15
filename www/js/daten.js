/**
 * Spielinhalte: Module, Verbesserungen, Entdeckungen.
 *
 * Die Zahlenkurve folgt dem bewährten Aufbau von Idle-Spielen:
 * Jede Stufe kostet etwa das Zehnfache der vorherigen und bringt etwa
 * das Achtfache. Dadurch lohnt sich die nächste Stufe immer knapp –
 * das erzeugt den Sog, der das Genre ausmacht.
 *
 * Preis eines Moduls: grundpreis * 1,15^(bereits gekaufte)
 */

export const KOSTENWACHSTUM = 1.15;

/** Die Module der Tauchstation. Reihenfolge = Freischaltreihenfolge. */
export const MODULE = [
  {
    id: 'qualle',
    farbe: '#7ff5e4',
    name: 'Leuchtqualle',
    symbol: '🪼',
    grundpreis: 15,
    ertrag: 0.1,
    beschreibung: 'Eine zahme Qualle im Fangnetz. Leuchtet, wenn man sie kitzelt.',
  },
  {
    id: 'drohne',
    farbe: '#8fd6ff',
    name: 'Sammeldrohne',
    symbol: '🛸',
    grundpreis: 100,
    ertrag: 1,
    beschreibung: 'Schwebt in der Strömung und filtert Leuchtplankton aus dem Wasser.',
  },
  {
    id: 'sonar',
    farbe: '#ffd9a0',
    name: 'Sonarboje',
    symbol: '📡',
    grundpreis: 1_100,
    ertrag: 8,
    beschreibung: 'Lockt biolumineszente Schwärme mit einem tiefen, langsamen Puls an.',
  },
  {
    id: 'roboter',
    farbe: '#a7b8ff',
    name: 'Tauchroboter',
    symbol: '🤖',
    grundpreis: 12_000,
    ertrag: 47,
    beschreibung: 'Greifarme, Scheinwerfer, kein Zeitgefühl. Arbeitet, bis der Akku glüht.',
  },
  {
    id: 'farm',
    farbe: '#8ee28c',
    name: 'Plankton-Farm',
    symbol: '🌱',
    grundpreis: 130_000,
    ertrag: 260,
    beschreibung: 'Ein Netzgehege, in dem das Leuchten selbst nachwächst.',
  },
  {
    id: 'schlot',
    farbe: '#ff8a4c',
    name: 'Thermalschlot-Reaktor',
    symbol: '🌋',
    grundpreis: 1_400_000,
    ertrag: 1_400,
    beschreibung: 'Zapft die Hitze des Meeresbodens an. Riecht nach Schwefel und Fortschritt.',
  },
  {
    id: 'riff',
    farbe: '#ff8fb3',
    name: 'Kolonie-Riff',
    symbol: '🪸',
    grundpreis: 20_000_000,
    ertrag: 7_800,
    beschreibung: 'Gezüchtetes Riff, das im Takt deiner Station pulsiert.',
  },
  {
    id: 'station',
    farbe: '#c9d6e3',
    name: 'Abgrund-Station',
    symbol: '🏛️',
    grundpreis: 330_000_000,
    ertrag: 44_000,
    beschreibung: 'Eine ganze Siedlung im Dunkeln. Niemand fragt mehr, wie spät es oben ist.',
  },
  {
    id: 'leviathan',
    farbe: '#6fa8ff',
    name: 'Leviathan-Symbiose',
    symbol: '🐋',
    grundpreis: 5_100_000_000,
    ertrag: 260_000,
    beschreibung: 'Etwas sehr Großes hat zugestimmt, mit dir zusammenzuarbeiten.',
  },
  {
    id: 'raucher',
    farbe: '#ff5a4c',
    name: 'Schwarzer Raucher',
    symbol: '🕳️',
    grundpreis: 75_000_000_000,
    ertrag: 1_600_000,
    beschreibung: 'Du erntest nicht mehr Licht. Du erntest den Druck selbst.',
  },
];

/**
 * Verbesserungen: einmalige Käufe mit dauerhafter Wirkung.
 *
 * wirkung:
 *   { art: 'modul',  ziel: '<modulId>', faktor: n }  – verdoppelt/verdreifacht ein Modul
 *   { art: 'global', faktor: n }                     – alle Module
 *   { art: 'tippen', faktor: n }                     – Ertrag pro Antippen
 *   { art: 'tippenAnteil', anteil: n }               – Antippen gibt zusätzlich n% der Produktion
 */
export const VERBESSERUNGEN = [
  // --- Antippen ---
  { id: 'griff1', name: 'Verstärkter Greifarm', symbol: '🦾', preis: 100, wirkung: { art: 'tippen', faktor: 2 }, bedingung: { tipps: 10 }, text: 'Doppelter Ertrag pro Antippen.' },
  { id: 'griff2', name: 'Hydraulikgelenk', symbol: '🦾', preis: 2_000, wirkung: { art: 'tippen', faktor: 2 }, bedingung: { tipps: 100 }, text: 'Nochmals doppelter Ertrag pro Antippen.' },
  { id: 'griff3', name: 'Titanklaue', symbol: '🦾', preis: 60_000, wirkung: { art: 'tippen', faktor: 3 }, bedingung: { tipps: 500 }, text: 'Dreifacher Ertrag pro Antippen.' },
  { id: 'resonanz', name: 'Resonanzkammer', symbol: '🔊', preis: 500_000, wirkung: { art: 'tippenAnteil', anteil: 0.01 }, bedingung: { tipps: 1000 }, text: 'Antippen gibt zusätzlich 1 % deiner Produktion pro Sekunde.' },
  { id: 'resonanz2', name: 'Tiefenresonanz', symbol: '🔊', preis: 50_000_000, wirkung: { art: 'tippenAnteil', anteil: 0.04 }, bedingung: { tipps: 3000 }, text: 'Antippen gibt zusätzlich 4 % deiner Produktion pro Sekunde.' },

  // --- Modul-Verbesserungen (je Modul zwei Stufen) ---
  { id: 'qualle1', name: 'Nährlösung', symbol: '🪼', preis: 150, wirkung: { art: 'modul', ziel: 'qualle', faktor: 2 }, bedingung: { modul: 'qualle', anzahl: 5 }, text: 'Leuchtquallen leuchten doppelt so hell.' },
  { id: 'qualle2', name: 'Schwarmzucht', symbol: '🪼', preis: 8_000, wirkung: { art: 'modul', ziel: 'qualle', faktor: 3 }, bedingung: { modul: 'qualle', anzahl: 25 }, text: 'Leuchtquallen dreifach so ergiebig.' },
  { id: 'drohne1', name: 'Feinere Filter', symbol: '🛸', preis: 1_000, wirkung: { art: 'modul', ziel: 'drohne', faktor: 2 }, bedingung: { modul: 'drohne', anzahl: 5 }, text: 'Sammeldrohnen doppelt so ergiebig.' },
  { id: 'drohne2', name: 'Schwarmsteuerung', symbol: '🛸', preis: 45_000, wirkung: { art: 'modul', ziel: 'drohne', faktor: 3 }, bedingung: { modul: 'drohne', anzahl: 25 }, text: 'Sammeldrohnen dreifach so ergiebig.' },
  { id: 'sonar1', name: 'Tieferer Puls', symbol: '📡', preis: 11_000, wirkung: { art: 'modul', ziel: 'sonar', faktor: 2 }, bedingung: { modul: 'sonar', anzahl: 5 }, text: 'Sonarbojen doppelt so ergiebig.' },
  { id: 'sonar2', name: 'Echokartierung', symbol: '📡', preis: 400_000, wirkung: { art: 'modul', ziel: 'sonar', faktor: 3 }, bedingung: { modul: 'sonar', anzahl: 25 }, text: 'Sonarbojen dreifach so ergiebig.' },
  { id: 'roboter1', name: 'Zweiter Greifarm', symbol: '🤖', preis: 120_000, wirkung: { art: 'modul', ziel: 'roboter', faktor: 2 }, bedingung: { modul: 'roboter', anzahl: 5 }, text: 'Tauchroboter doppelt so ergiebig.' },
  { id: 'roboter2', name: 'Autonomes Denken', symbol: '🤖', preis: 4_000_000, wirkung: { art: 'modul', ziel: 'roboter', faktor: 3 }, bedingung: { modul: 'roboter', anzahl: 25 }, text: 'Tauchroboter dreifach so ergiebig.' },
  { id: 'farm1', name: 'Wärmekreislauf', symbol: '🌱', preis: 1_300_000, wirkung: { art: 'modul', ziel: 'farm', faktor: 2 }, bedingung: { modul: 'farm', anzahl: 5 }, text: 'Plankton-Farmen doppelt so ergiebig.' },
  { id: 'farm2', name: 'Zuchtauswahl', symbol: '🌱', preis: 40_000_000, wirkung: { art: 'modul', ziel: 'farm', faktor: 3 }, bedingung: { modul: 'farm', anzahl: 25 }, text: 'Plankton-Farmen dreifach so ergiebig.' },
  { id: 'schlot1', name: 'Druckturbine', symbol: '🌋', preis: 14_000_000, wirkung: { art: 'modul', ziel: 'schlot', faktor: 2 }, bedingung: { modul: 'schlot', anzahl: 5 }, text: 'Thermalschlot-Reaktoren doppelt so ergiebig.' },
  { id: 'riff1', name: 'Symbiosepilze', symbol: '🪸', preis: 200_000_000, wirkung: { art: 'modul', ziel: 'riff', faktor: 2 }, bedingung: { modul: 'riff', anzahl: 5 }, text: 'Kolonie-Riffe doppelt so ergiebig.' },
  { id: 'station1', name: 'Schichtbetrieb', symbol: '🏛️', preis: 3_300_000_000, wirkung: { art: 'modul', ziel: 'station', faktor: 2 }, bedingung: { modul: 'station', anzahl: 5 }, text: 'Abgrund-Stationen doppelt so ergiebig.' },

  // --- Globale Verbesserungen ---
  { id: 'global1', name: 'Kaltlichtlampen', symbol: '💡', preis: 25_000, wirkung: { art: 'global', faktor: 1.25 }, bedingung: { module: 25 }, text: 'Alle Module +25 %.' },
  { id: 'global2', name: 'Druckausgleich', symbol: '⚙️', preis: 900_000, wirkung: { art: 'global', faktor: 1.5 }, bedingung: { module: 75 }, text: 'Alle Module +50 %.' },
  { id: 'global3', name: 'Strömungskarte', symbol: '🗺️', preis: 30_000_000, wirkung: { art: 'global', faktor: 1.5 }, bedingung: { module: 150 }, text: 'Alle Module +50 %.' },
  { id: 'global4', name: 'Abyssal-Netzwerk', symbol: '🕸️', preis: 900_000_000, wirkung: { art: 'global', faktor: 2 }, bedingung: { module: 250 }, text: 'Alle Module verdoppelt.' },
];

/**
 * Entdeckungen: werden bei Erreichen einer Tiefe freigeschaltet.
 * Jede gibt einen dauerhaften Bonus und einen Eintrag ins Logbuch –
 * das ist der Grund, morgen wieder reinzuschauen.
 */
export const ENTDECKUNGEN = [
  { tiefe: 5, name: 'Schwarmhering', symbol: '🐟', bonus: 1.05, text: 'Noch im Licht von oben. Silbrige Leiber, die sich wie ein einziges Tier bewegen.' },
  { tiefe: 15, name: 'Segelquale', symbol: '🎐', bonus: 1.05, text: 'Treibt an der Oberfläche wie ein vergessener Luftballon. Besser nicht anfassen.' },
  { tiefe: 35, name: 'Laternenfisch', symbol: '🏮', bonus: 1.08, text: 'Trägt seine eigene Lampe unter dem Auge. Der erste echte Bewohner des Zwielichts.' },
  { tiefe: 70, name: 'Riesenkalmar', symbol: '🦑', bonus: 1.1, text: 'Acht Arme, zwei Tentakel, kein Interesse an dir. Vorerst.' },
  { tiefe: 130, name: 'Vampirtintenfisch', symbol: '🦇', bonus: 1.12, text: 'Lebt dort, wo kaum Sauerstoff ist, und stülpt sich bei Gefahr einfach um.' },
  { tiefe: 250, name: 'Anglerfisch', symbol: '🎣', bonus: 1.15, text: 'Die Angel leuchtet. Das Maul kommt später. Alles hier unten ist eine Falle.' },
  { tiefe: 450, name: 'Pelikanaal', symbol: '🫃', bonus: 1.18, text: 'Fast nur Maul. Verschlingt Beute, die größer ist als er selbst.' },
  { tiefe: 800, name: 'Schlangenstern-Feld', symbol: '⭐', bonus: 1.2, text: 'Der Boden bewegt sich. Er besteht aus Armen, so weit die Scheinwerfer reichen.' },
  { tiefe: 1_400, name: 'Kolossaler Krake', symbol: '🐙', bonus: 1.25, text: 'Ein Auge so groß wie ein Teller sieht dich an und entscheidet sich gegen dich.' },
  { tiefe: 2_500, name: 'Geisterhai', symbol: '🦈', bonus: 1.3, text: 'Älter als Bäume. Schwimmt, als hätte er alle Zeit der Welt. Hat er auch.' },
  { tiefe: 4_000, name: 'Thermalgarten', symbol: '🌡️', bonus: 1.35, text: 'Leben ohne Sonne, gespeist aus Hitze und Schwefel. Ein zweiter Anfang der Welt.' },
  { tiefe: 6_500, name: 'Abgrunddrache', symbol: '🐉', bonus: 1.4, text: 'Sein Leuchten ist rot. Rot dringt hier unten am wenigsten weit – das weiß nur er.' },
  { tiefe: 11_000, name: 'Grund des Grabens', symbol: '🕳️', bonus: 1.5, text: 'Tiefster bekannter Punkt. Ein Plastikbeutel liegt hier. Natürlich.' },
  { tiefe: 18_000, name: 'Der Riss', symbol: '⚡', bonus: 1.75, text: 'Auf keiner Karte. Das Sonar gibt kein Echo zurück. Du tauchst trotzdem weiter.' },
  { tiefe: 30_000, name: 'Etwas, das wartet', symbol: '👁️', bonus: 2, text: 'Es hat sich nicht bewegt, seit du hier bist. Es hat sich nie bewegt. Es schaut.' },
];

/** Erfolge: kleine Ziele, die Fortschritt sichtbar machen. */
export const ERFOLGE = [
  { id: 'erstertipp', name: 'Erster Kontakt', symbol: '👆', text: 'Tippe zum ersten Mal.', pruef: (z) => z.tipps >= 1 },
  { id: 'hundert', name: 'Handarbeit', symbol: '✋', text: 'Tippe 100-mal.', pruef: (z) => z.tipps >= 100 },
  { id: 'tausend', name: 'Sehnenscheide', symbol: '🤚', text: 'Tippe 1.000-mal.', pruef: (z) => z.tipps >= 1000 },
  { id: 'erstesmodul', name: 'Inbetriebnahme', symbol: '🔧', text: 'Kaufe dein erstes Modul.', pruef: (z) => gesamtModule(z) >= 1 },
  { id: 'zehnmodule', name: 'Kleine Station', symbol: '🏗️', text: 'Besitze 10 Module.', pruef: (z) => gesamtModule(z) >= 10 },
  { id: 'hundertmodule', name: 'Industriegebiet', symbol: '🏭', text: 'Besitze 100 Module.', pruef: (z) => gesamtModule(z) >= 100 },
  { id: 'tiefe100', name: 'Zwielicht', symbol: '🌊', text: 'Erreiche 100 m Tiefe.', pruef: (z) => z.maxTiefe >= 100 },
  { id: 'tiefe1000', name: 'Mitternachtszone', symbol: '🌑', text: 'Erreiche 1.000 m Tiefe.', pruef: (z) => z.maxTiefe >= 1000 },
  { id: 'tiefe11000', name: 'Am Grund', symbol: '🕳️', text: 'Erreiche 11.000 m Tiefe.', pruef: (z) => z.maxTiefe >= 11000 },
  { id: 'ersteperle', name: 'Aufgetaucht', symbol: '🫧', text: 'Tauche zum ersten Mal auf.', pruef: (z) => z.aufstiege >= 1 },
  { id: 'zehnperlen', name: 'Perlensammler', symbol: '🦪', text: 'Besitze 10 Perlen.', pruef: (z) => z.perlen >= 10 },
  { id: 'hundertperlen', name: 'Perlenkette', symbol: '📿', text: 'Besitze 100 Perlen.', pruef: (z) => z.perlen >= 100 },
  { id: 'allesgesehen', name: 'Logbuch voll', symbol: '📖', text: 'Entdecke alle Kreaturen.', pruef: (z) => z.entdeckungen.length >= ENTDECKUNGEN.length },
  { id: 'kombo10', name: 'Kettenreaktion', symbol: '🔗', text: 'Erreiche eine Kombo von 10.', pruef: (z) => (z.komboMax ?? 0) >= 10 },
  { id: 'kombo25', name: 'Außer Kontrolle', symbol: '🌀', text: 'Erreiche eine Kombo von 25.', pruef: (z) => (z.komboMax ?? 0) >= 25 },
  { id: 'krit1', name: 'Volltreffer', symbol: '💥', text: 'Lande deinen ersten kritischen Treffer.', pruef: (z) => (z.kritischeTreffer ?? 0) >= 1 },
  { id: 'krit100', name: 'Scharfschütze', symbol: '🎯', text: 'Lande 100 kritische Treffer.', pruef: (z) => (z.kritischeTreffer ?? 0) >= 100 },
  { id: 'blase1', name: 'Aufmerksam', symbol: '✨', text: 'Sammle deine erste Leuchtblase ein.', pruef: (z) => (z.leuchtblasenGesammelt ?? 0) >= 1 },
  { id: 'blase20', name: 'Perlenfischer', symbol: '🎐', text: 'Sammle 20 Leuchtblasen ein.', pruef: (z) => (z.leuchtblasenGesammelt ?? 0) >= 20 },
  { id: 'fisch1', name: 'Petri Heil', symbol: '🐠', text: 'Fange deinen ersten Glücksfisch.', pruef: (z) => (z.gluecksfischeGefangen ?? 0) >= 1 },
  { id: 'fisch15', name: 'Angelglück', symbol: '🎣', text: 'Fange 15 Glücksfische.', pruef: (z) => (z.gluecksfischeGefangen ?? 0) >= 15 },
  { id: 'kiste1', name: 'Ausgepackt', symbol: '📦', text: 'Öffne deine erste Kiste.', pruef: (z) => (z.kistenGeoeffnet ?? 0) >= 1 },
  { id: 'kiste10', name: 'Sammelleidenschaft', symbol: '🎁', text: 'Öffne 10 Kisten.', pruef: (z) => (z.kistenGeoeffnet ?? 0) >= 10 },
  { id: 'ausgeruestet1', name: 'Startklar', symbol: '🪝', text: 'Rüste deine erste Angel aus.', pruef: (z) => z.ausruestung?.angel != null },
  { id: 'legendaerItem', name: 'Aus der Tiefe', symbol: '🌟', text: 'Besitze ein legendäres Ausrüstungsteil.', pruef: (z) => (z.besitzItems ?? []).some((id) => findeItem(id)?.seltenheit === 'legendaer') },
  { id: 'expedition1', name: 'Losgeschickt', symbol: '🚣', text: 'Schließe deine erste Expedition ab.', pruef: (z) => (z.expeditionenAbgeschlossen ?? 0) >= 1 },
  { id: 'expedition10', name: 'Vielgereist', symbol: '🚤', text: 'Schließe 10 Expeditionen ab.', pruef: (z) => (z.expeditionenAbgeschlossen ?? 0) >= 10 },
  { id: 'aquarium1', name: 'Neuer Mitbewohner', symbol: '🐠', text: 'Fange deinen ersten Aquarium-Fisch.', pruef: (z) => (z.aquarium ?? []).length >= 1 },
  { id: 'aquariumvoll', name: 'Vollbesetzt', symbol: '🐋', text: 'Fülle das gesamte Aquarium.', pruef: (z) => (z.aquarium ?? []).length >= AQUARIUM_FISCHE.length },
  { id: 'tagestruhe1', name: 'Wiederkehrer', symbol: '🎁', text: 'Hole dir deine erste Tages-Truhe.', pruef: (z) => (z.tagesStreak ?? 0) >= 1 },
  { id: 'streak7', name: 'Feste Gewohnheit', symbol: '🔥', text: 'Hole die Tages-Truhe 7 Tage in Folge.', pruef: (z) => (z.tagesStreak ?? 0) >= 7 },
  { id: 'gluecksrad1', name: 'Erste Drehung', symbol: '🎡', text: 'Dreh zum ersten Mal am Glücksrad.', pruef: (z) => (z.gluecksradGedreht ?? 0) >= 1 },
  { id: 'gluecksrad30', name: 'Radfahrer', symbol: '🎢', text: 'Dreh 30-mal am Glücksrad.', pruef: (z) => (z.gluecksradGedreht ?? 0) >= 30 },
];

export function gesamtModule(zustand) {
  return MODULE.reduce((summe, m) => summe + (zustand.module[m.id] ?? 0), 0);
}

/**
 * Wie viele Perlen ein Aufstieg zurzeit einbringen würde.
 *
 * Kubikwurzel statt Quadratwurzel, mit Faktor 10:
 *   - Der erste Aufstieg bringt sofort 10 Perlen (+20 %). Ein kompletter
 *     Neuanfang für +2 % hätte sich wie eine Strafe angefühlt.
 *   - Später wächst der Gewinn deutlich langsamer. Mit der Quadratwurzel
 *     wäre schon der dritte Aufstieg so stark gewesen, dass der Rest des
 *     Spiels keine Rolle mehr gespielt hätte.
 *
 *   1 Mio. BL →     10 Perlen (+20 %)
 *   1 Mrd. BL →    100 Perlen (+200 %)
 *   1 Bio. BL →  1.000 Perlen (+2.000 %)
 */
export const PERLEN_SCHWELLE = 1_000_000;
export function perlenFuer(gesamtVerdientDieseRunde) {
  if (gesamtVerdientDieseRunde < PERLEN_SCHWELLE) return 0;
  return Math.floor(10 * Math.cbrt(gesamtVerdientDieseRunde / PERLEN_SCHWELLE));
}

/** Jede Perle erhöht die gesamte Produktion dauerhaft. */
export const PERLEN_BONUS = 0.02;

/** Tiefe in Metern, abgeleitet aus allem, was je gesammelt wurde. */
export function tiefeAus(gesamtVerdientGesamt) {
  if (gesamtVerdientGesamt <= 0) return 0;
  return Math.floor(2 * Math.pow(gesamtVerdientGesamt, 0.27));
}

/**
 * Level: eine zweite, langsamere Kurve über derselben Lebenszeit-Ausbeute
 * wie die Tiefe – aber mit eigener Bedeutung. Während die Tiefe die
 * Umgebung einfärbt, ist das Level ein reiner Fortschritts-/Belohnungstakt
 * mit eigener Leiste und (alle 5 Level) einer garantierten Ausrüstung.
 * Kubikwurzel statt der Tiefen-Potenz, damit die ersten Level schnell
 * kommen und spätere spürbar länger dauern - klassische XP-Kurve.
 */
export const LEVEL_BASIS = 5_000;

export function levelAus(gesamtVerdientGesamt) {
  if (gesamtVerdientGesamt <= 0) return 0;
  return Math.floor(Math.cbrt(gesamtVerdientGesamt / LEVEL_BASIS));
}

/** BL-Schwelle, ab der ein bestimmtes Level erreicht ist. */
export function levelSchwelle(level) {
  return Math.pow(level, 3) * LEVEL_BASIS;
}

/** Anteil des aktuellen Levels, der schon "abgelaufen" ist (0-1) - für die Leiste. */
export function levelFortschritt(gesamtVerdientGesamt) {
  const level = levelAus(gesamtVerdientGesamt);
  const aktuelle = levelSchwelle(level);
  const naechste = levelSchwelle(level + 1);
  if (naechste <= aktuelle) return 0;
  return Math.max(0, Math.min(1, (gesamtVerdientGesamt - aktuelle) / (naechste - aktuelle)));
}

/** Die Zonen des Ozeans – steuern Farbe und Stimmung. */
export const ZONEN = [
  { ab: 0, name: 'Lichtzone', farbeOben: '#4db8d8', farbeUnten: '#1d6f9e' },
  { ab: 200, name: 'Dämmerzone', farbeOben: '#1d6f9e', farbeUnten: '#0d3b63' },
  { ab: 1_000, name: 'Mitternachtszone', farbeOben: '#0d3b63', farbeUnten: '#061d38' },
  { ab: 4_000, name: 'Abgrundzone', farbeOben: '#061d38', farbeUnten: '#030d1c' },
  { ab: 11_000, name: 'Grabenzone', farbeOben: '#030d1c', farbeUnten: '#000000' },
  { ab: 18_000, name: 'Jenseits der Karte', farbeOben: '#0a0014', farbeUnten: '#000000' },
];

export function zoneFuer(tiefe) {
  let treffer = ZONEN[0];
  for (const z of ZONEN) if (tiefe >= z.ab) treffer = z;
  return treffer;
}

/* ==================================================================== */
/* Ausruestung, Kisten, Expeditionen, Aquarium                          */
/* ==================================================================== */

/**
 * Seltenheitsstufen - bestimmen Farbe/Gewicht ueberall dort, wo Ausruestung,
 * Kisteninhalt oder Aquarium-Fische eingestuft werden.
 */
export const SELTENHEITEN = {
  gewoehnlich: { id: 'gewoehnlich', label: 'Gewöhnlich', farbe: '#9db3c4' },
  selten: { id: 'selten', label: 'Selten', farbe: '#4fe3d0' },
  episch: { id: 'episch', label: 'Episch', farbe: '#b98bff' },
  legendaer: { id: 'legendaer', label: 'Legendär', farbe: '#ffd9a0' },
};

/**
 * Ausruestung: zwei Steckplaetze.
 *   - "angel"  (Werkzeug) ist Pflicht, um ueberhaupt Expeditionen zu starten.
 *              Bessere Angeln verkuerzen die Dauer und erhoehen die Chance
 *              auf einen seltenen Fund.
 *   - "koeder" (Beigabe) ist optional und erhoeht zusaetzlich die BL-Beute.
 * Man traegt hoechstens ein Teil je Steckplatz gleichzeitig - ein besseres
 * ersetzt das alte, das alte bleibt aber im Inventar (nicht verloren).
 */
export const ITEMS = [
  { id: 'angel_holz', slot: 'angel', name: 'Hölzerne Angel', symbol: '🎣', seltenheit: 'gewoehnlich',
    zeitFaktor: 1, fundChance: 0.10, text: 'Reicht gerade so, um überhaupt loszufahren.' },
  { id: 'angel_stahl', slot: 'angel', name: 'Stahlangel', symbol: '🎣', seltenheit: 'selten',
    zeitFaktor: 0.85, fundChance: 0.18, text: 'Hält auch größerem Zug stand.' },
  { id: 'angel_leucht', slot: 'angel', name: 'Leuchtangel', symbol: '🎣', seltenheit: 'episch',
    zeitFaktor: 0.65, fundChance: 0.30, text: 'Lockt mit eigenem Licht, was sonst nie an die Oberfläche käme.' },
  { id: 'angel_abgrund', slot: 'angel', name: 'Abgrundangel', symbol: '🎣', seltenheit: 'legendaer',
    zeitFaktor: 0.45, fundChance: 0.48, text: 'Niemand weiß, aus welchem Metall sie gefertigt ist.' },

  { id: 'koeder_wurm', slot: 'koeder', name: 'Wattwurm', symbol: '🪱', seltenheit: 'gewoehnlich',
    blFaktor: 1.1, fundBonus: 0.02, text: 'Der Klassiker. Funktioniert einfach.' },
  { id: 'koeder_glitzer', slot: 'koeder', name: 'Glitzerköder', symbol: '🔸', seltenheit: 'selten',
    blFaktor: 1.3, fundBonus: 0.04, text: 'Reflektiert jedes bisschen Licht, das es gibt.' },
  { id: 'koeder_pheromon', slot: 'koeder', name: 'Pheromonköder', symbol: '🧪', seltenheit: 'episch',
    blFaktor: 1.6, fundBonus: 0.07, text: 'Riecht nach etwas, das man lieber nicht genau wissen möchte.' },
  { id: 'koeder_essenz', slot: 'koeder', name: 'Abyssal-Essenz', symbol: '🫧', seltenheit: 'legendaer',
    blFaktor: 2.1, fundBonus: 0.12, text: 'Ein einzelner Tropfen genügt. Mehr würde wahrscheinlich niemand überleben.' },
];

export function findeItem(id) {
  return ITEMS.find((i) => i.id === id) ?? null;
}

/**
 * Kisten: drei Stufen mit unterschiedlicher Wahrscheinlichkeit auf seltene
 * Ausruestung. Eine Kiste enthaelt immer genau ein Item, das man noch nicht
 * besitzt (Duplikate wandeln sich stattdessen in Biolumineszenz um, siehe
 * spiel.js - so ist eine Kiste nie "fuer nichts").
 */
export const KISTEN_TYPEN = [
  { id: 'holz', name: 'Holzkiste', symbol: '📦',
    gewichte: { gewoehnlich: 70, selten: 25, episch: 5, legendaer: 0 } },
  { id: 'silber', name: 'Silberkiste', symbol: '🎁',
    gewichte: { gewoehnlich: 38, selten: 40, episch: 19, legendaer: 3 } },
  { id: 'gold', name: 'Goldkiste', symbol: '🏆',
    gewichte: { gewoehnlich: 12, selten: 38, episch: 38, legendaer: 12 } },
];

export function findeKistenTyp(id) {
  return KISTEN_TYPEN.find((k) => k.id === id) ?? null;
}

/**
 * Expeditionen: dauern echte Wall-Clock-Zeit - man schickt die Angel los und
 * schaut spaeter wieder rein. `blSekundenwert` gibt die Belohnung relativ
 * zur eigenen Produktion an (wie bei der Leuchtblase), damit sie in jeder
 * Spielphase spuerbar bleibt. `kistenChance` ist die Grundchance auf eine
 * Kiste der jeweils genannten Stufe; `fischChance` die Grundchance auf einen
 * neuen Aquarium-Fisch, bevor Angel/Koeder sie noch erhoehen.
 */
export const EXPEDITIONEN = [
  { id: 'kurz', name: 'Kurzer Streifzug', symbol: '🚣', dauerMs: 5 * 60 * 1000,
    blSekundenwert: 200, kistenTyp: 'holz', kistenChance: 0.5, fischChance: 0.12, ausruestungChance: 0.08,
    text: 'Ein kurzer Ausflug ins Blaue, gleich wieder zurück.' },
  { id: 'mittel', name: 'Tauchgang', symbol: '🛶', dauerMs: 30 * 60 * 1000,
    blSekundenwert: 260, kistenTyp: 'silber', kistenChance: 0.55, fischChance: 0.22, ausruestungChance: 0.14,
    text: 'Genug Zeit, um ein Stück weiter zu kommen als sonst.' },
  { id: 'lang', name: 'Tiefseeexpedition', symbol: '🚤', dauerMs: 3 * 60 * 60 * 1000,
    blSekundenwert: 320, kistenTyp: 'gold', kistenChance: 0.6, fischChance: 0.35, ausruestungChance: 0.22,
    text: 'Stunden, in denen niemand weiß, wie tief die Angel wirklich hängt.' },
];

export function findeExpedition(id) {
  return EXPEDITIONEN.find((e) => e.id === id) ?? null;
}

/**
 * Aquarium: seltene Faenge aus Expeditionen, unabhaengig von den
 * Entdeckungen im Logbuch (die haengen an der Tiefe, diese hier am Glueck
 * beim Angeln). Jeder Fisch gibt zusaetzlich einen kleinen dauerhaften
 * Bonus - das Aquarium lohnt sich also nicht nur zum Anschauen.
 */
export const AQUARIUM_FISCHE = [
  { id: 'clownfisch', name: 'Clownfisch', symbol: '🐠', seltenheit: 'gewoehnlich', bonus: 1.01,
    text: 'Quietschbunt und voellig fehl am Platz hier unten. Schwimmt trotzdem munter mit.' },
  { id: 'kugelfisch', name: 'Kugelfisch', symbol: '🐡', seltenheit: 'gewoehnlich', bonus: 1.01,
    text: 'Bläht sich auf, sobald die Angel in der Nähe ist.' },
  { id: 'seepferdchen', name: 'Seepferdchen', symbol: '🐴', seltenheit: 'gewoehnlich', bonus: 1.015,
    text: 'Hält sich mit dem Schwanz an allem fest, was nicht wegschwimmt.' },
  { id: 'languste', name: 'Languste', symbol: '🦞', seltenheit: 'selten', bonus: 1.02,
    text: 'Geht rückwärts, wenn es brenzlig wird. Ziemlich oft, muss man sagen.' },
  { id: 'tintenfisch', name: 'Zwergtintenfisch', symbol: '🦑', seltenheit: 'selten', bonus: 1.025,
    text: 'Wechselt die Farbe schneller, als man hinsehen kann.' },
  { id: 'schildkroete', name: 'Meeresschildkröte', symbol: '🐢', seltenheit: 'selten', bonus: 1.03,
    text: 'Uralt, gelassen, völlig unbeeindruckt von der ganzen Station.' },
  { id: 'muraene', name: 'Muräne', symbol: '🐍', seltenheit: 'episch', bonus: 1.05,
    text: 'Wartet reglos in einer Spalte, bis irgendwas Interessantes vorbeikommt.' },
  { id: 'mantarochen', name: 'Mantarochen', symbol: '🦈', seltenheit: 'episch', bonus: 1.06,
    text: 'Gleitet wie ein Schatten über die Station hinweg, ohne sie zu berühren.' },
  { id: 'perlenauster', name: 'Perlenauster', symbol: '🦪', seltenheit: 'episch', bonus: 1.07,
    text: 'Braucht Jahre für eine einzige Perle. Hier unten hat sie davon reichlich.' },
  { id: 'nautilus', name: 'Perlboot', symbol: '🐚', seltenheit: 'legendaer', bonus: 1.12,
    text: 'Lebt fast unverändert seit Jahrmillionen. Es hatte offenbar keine Eile.' },
  { id: 'zitterrochen', name: 'Zitterrochen', symbol: '⚡', seltenheit: 'legendaer', bonus: 1.15,
    text: 'Ein kurzer Kontakt, und die Angel zuckt von selbst zurück.' },
];

export function findeAquariumFisch(id) {
  return AQUARIUM_FISCHE.find((f) => f.id === id) ?? null;
}

/**
 * Zieht einen gewichteten Zufallswert. `eintraege` ist ein Objekt
 * { schluessel: gewicht }; Eintraege mit Gewicht 0 koennen nie gezogen
 * werden.
 * @param {Record<string, number>} eintraege
 * @param {() => number} zufall Quelle in [0, 1) - austauschbar fuer Tests.
 */
export function gewichteteAuswahl(eintraege, zufall = Math.random) {
  const paare = Object.entries(eintraege).filter(([, gewicht]) => gewicht > 0);
  const gesamt = paare.reduce((s, [, gewicht]) => s + gewicht, 0);
  if (gesamt <= 0) return null;
  let punkt = zufall() * gesamt;
  for (const [schluessel, gewicht] of paare) {
    punkt -= gewicht;
    if (punkt < 0) return schluessel;
  }
  return paare[paare.length - 1][0];
}

/* ==================================================================== */
/* Perlen-Shop                                                          */
/* ==================================================================== */

/**
 * Einmalige, dauerhafte Vergünstigungen, bezahlt mit Perlen - im Unterschied
 * zum passiven +2 %/Perle-Bonus eine aktive Entscheidung: Ausgegebene Perlen
 * fehlen danach beim passiven Bonus, das Item bleibt aber für immer. `preis`
 * ist absichtlich so gestaffelt, dass die Angebote nach und nach über mehrere
 * Aufstiege hinweg erreichbar werden, nicht alle auf einmal.
 */
export const PERLEN_SHOP = [
  { id: 'kopfstart', name: 'Kopfstart', symbol: '🚀', preis: 8,
    text: 'Nach jedem Aufstieg stehen sofort 3 Leuchtquallen bereit, statt bei null anzufangen.',
    wirkung: { art: 'startModule', modulId: 'qualle', anzahl: 3 } },
  { id: 'kombogeduld', name: 'Ruhiger Atem', symbol: '🌬️', preis: 15,
    text: 'Das Kombofenster ist dauerhaft 30 % länger - kurze Pausen reißen die Kette seltener ab.',
    wirkung: { art: 'komboFensterFaktor', wert: 1.3 } },
  { id: 'offlinebonus', name: 'Ruhige Tiefe', symbol: '🌙', preis: 25,
    text: 'Offline wird dauerhaft 20 Prozentpunkte mehr gesammelt.',
    wirkung: { art: 'offlineAnteilBonus', wert: 0.2 } },
  { id: 'kistenglueck', name: 'Glückssträhne', symbol: '🍀', preis: 50,
    text: 'Alle Fundchancen auf Expeditionen (Kisten, Fische, Ausrüstung) sind dauerhaft um 5 Prozentpunkte höher.',
    wirkung: { art: 'fundChanceBonus', wert: 0.05 } },
];

export function findePerlenShopItem(id) {
  return PERLEN_SHOP.find((i) => i.id === id) ?? null;
}

/* ==================================================================== */
/* Glücksrad                                                            */
/* ==================================================================== */

/**
 * Acht Felder zu je 45°. `gewicht` bestimmt die Trefferwahrscheinlichkeit
 * (Summe = 100, muss aber nicht - gewichteteAuswahl normiert selbst).
 * `farbe` färbt das Feld im Rad; `art` sagt spiel.js, wie die Belohnung
 * berechnet wird:
 *   - 'bl'     Biolumineszenz, skaliert wie die Leuchtblase mit der
 *              eigenen Produktion (sekundenwert) und einem Mindestbetrag.
 *   - 'boost'  zeitlich befristete doppelte Ausbeute (dauerMs).
 *   - 'kiste'  eine Kiste des angegebenen Typs für den eigenen Vorrat -
 *              wird nicht automatisch geöffnet, wie jede andere Kiste auch.
 *   - 'perlen' eine kleine, direkte Menge Perlen - selten und bewusst klein,
 *              damit es ein besonderer Moment bleibt statt ein Ersatz fürs
 *              eigentliche Aufsteigen.
 */
export const GLUECKSRAD_SEGMENTE = [
  { id: 'bl_klein', symbol: '💧', farbe: '#4fe3d0', gewicht: 30, art: 'bl', sekundenwert: 60,
    text: 'Eine kleine Menge Biolumineszenz.' },
  { id: 'kiste_holz', symbol: '📦', farbe: '#a97c50', gewicht: 16, art: 'kiste', kistenTyp: 'holz',
    text: 'Eine Holzkiste für den Vorrat.' },
  { id: 'bl_mittel', symbol: '💎', farbe: '#2fb3a3', gewicht: 20, art: 'bl', sekundenwert: 180,
    text: 'Eine ordentliche Portion Biolumineszenz.' },
  { id: 'boost_kurz', symbol: '⚡', farbe: '#ffb454', gewicht: 15, art: 'boost', dauerMs: 5 * 60 * 1000,
    text: '5 Minuten doppelte Ausbeute.' },
  { id: 'kiste_silber', symbol: '🎁', farbe: '#9db3c4', gewicht: 9, art: 'kiste', kistenTyp: 'silber',
    text: 'Eine Silberkiste für den Vorrat.' },
  { id: 'bl_gross', symbol: '🌟', farbe: '#ffd9a0', gewicht: 5, art: 'bl', sekundenwert: 600,
    text: 'Ein großer Fund!' },
  { id: 'perlen', symbol: '🫧', farbe: '#b98bff', gewicht: 3, art: 'perlen', anzahl: 2,
    text: '2 Perlen, direkt geschenkt.' },
  { id: 'kiste_gold', symbol: '🏆', farbe: '#f0b429', gewicht: 2, art: 'kiste', kistenTyp: 'gold',
    text: 'Der Jackpot: eine Goldkiste!' },
];

export function findeGluecksradSegment(id) {
  return GLUECKSRAD_SEGMENTE.find((s) => s.id === id) ?? null;
}

