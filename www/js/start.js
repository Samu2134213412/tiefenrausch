/**
 * Einstiegspunkt: verbindet Spiellogik, Anzeige und Speicherung.
 */
import * as spiel from './spiel.js';
import * as speicher from './speicher.js';
import * as monetarisierung from './monetarisierung.js';
import * as klang from './klang.js';
import { findeExpedition } from './daten.js';
import { starteHintergrund } from './hintergrund.js';
import { starteFunken } from './funken.js';
import {
  erzeugeOberflaeche,
  zeigeDialog,
  schliesseDialog,
  zeigeEntdeckung,
  zeigeWillkommen,
  zeigeKiste,
  zeigeExpeditionErgebnis,
  spinneGluecksrad,
  zeigeMarianengraben,
  fuelleMenue,
} from './ui.js';
import { zahl, ganzzahl, dauer } from './zahlen.js';

const SPEICHER_ABSTAND_MS = 15_000;
const ANZEIGE_ABSTAND_MS = 100;

/* ---------------- Geräteeinstellungen (Ton/Vibration) ----------------
 * Bewusst getrennt vom Spielstand: Das sind Vorlieben für dieses Gerät,
 * keine Spieldaten, und sollen auch ein „Alles zurücksetzen“ überleben. */

function leseEinstellung(schluessel, standard) {
  try {
    const wert = localStorage.getItem(schluessel);
    return wert === null ? standard : wert === '1';
  } catch {
    return standard;
  }
}
function schreibeEinstellung(schluessel, wert) {
  try {
    localStorage.setItem(schluessel, wert ? '1' : '0');
  } catch {
    /* reine Komforteinstellung – wenn das Speichern scheitert, ist das egal */
  }
}

let vibrationAn = leseEinstellung('tiefenrausch.vibration', true);
klang.setzeAn(leseEinstellung('tiefenrausch.ton', true));

/** Vibriert nur, wenn erlaubt und vom Gerät unterstützt (iOS Safari z. B. nicht). */
function vibriere(muster) {
  if (!vibrationAn) return;
  try {
    navigator.vibrate?.(muster);
  } catch {
    /* nicht unterstützt – kein Problem */
  }
}

/* ---------------- Spielstand laden ---------------- */

const { zustand, warVorhanden, verstricheneSekunden } = speicher.laden();

/* ---------------- Oberfläche ---------------- */

const oberflaeche = erzeugeOberflaeche(zustand, {
  kaufeModul(id, menge) {
    const anzahl = menge === 'max' ? spiel.maximalKaufbar(zustand, id) : menge;
    if (anzahl <= 0) {
      oberflaeche.melde('Dafür reicht die Biolumineszenz nicht.');
      return;
    }
    const ergebnis = spiel.kaufeModul(zustand, id, anzahl);
    if (!ergebnis.erfolg) {
      oberflaeche.melde('Dafür reicht die Biolumineszenz nicht.');
      return;
    }
    klang.kauf();
    beiKauf();
    pruefeFortschritt();
    oberflaeche.aktualisiere(zustand);
  },

  kaufeVerbesserung(id) {
    const ergebnis = spiel.kaufeVerbesserung(zustand, id);
    if (!ergebnis.erfolg) {
      oberflaeche.melde('Dafür reicht die Biolumineszenz nicht.');
      return;
    }
    oberflaeche.melde(`${ergebnis.verbesserung.name} eingebaut.`);
    klang.kauf();
    beiKauf();
    pruefeFortschritt();
    oberflaeche.aktualisiere(zustand);
  },

  ruestAusItem(id) {
    const ergebnis = spiel.ruestAusItem(zustand, id);
    if (!ergebnis.erfolg) return;
    oberflaeche.melde(`${ergebnis.item.name} ausgerüstet.`);
    klang.kauf();
    vibriere(10);
    oberflaeche.aktualisiere(zustand);
    speicher.speichern(zustand);
  },

  oeffneKiste(id) {
    const ergebnis = spiel.oeffneKiste(zustand, id);
    if (!ergebnis.erfolg) {
      oberflaeche.melde('Keine Kiste dieses Typs vorhanden.');
      return;
    }
    zeigeKisteMitEffekten(ergebnis);
  },

  hohleTagestruhe() {
    const ergebnis = spiel.hohleTagestruhe(zustand);
    if (!ergebnis.erfolg) {
      oberflaeche.melde('Die Tages-Truhe ist heute schon abgeholt.');
      return;
    }
    zeigeKisteMitEffekten(ergebnis);
  },

  kaufePerlenShopItem(id) {
    const ergebnis = spiel.kaufePerlenShopItem(zustand, id);
    if (!ergebnis.erfolg) {
      oberflaeche.melde(
        ergebnis.grund === 'zu wenig Perlen' ? 'Dafür reichen die Perlen nicht.' : 'Nicht verfügbar.'
      );
      return;
    }
    oberflaeche.melde(`${ergebnis.item.name} freigeschaltet.`);
    klang.kauf();
    vibriere(10);
    oberflaeche.aktualisiere(zustand);
    speicher.speichern(zustand);
  },

  dreheGluecksrad() {
    // Der Zufall fällt sofort (und mit ihm die 24-Stunden-Sperre) - die
    // anschließende Dreh-Animation ist reine Inszenierung des bereits
    // feststehenden Ergebnisses, kein zweiter Zufallsschritt.
    const ergebnis = spiel.dreheGluecksrad(zustand);
    if (!ergebnis.erfolg) {
      oberflaeche.melde('Das Glücksrad ist heute schon gedreht.');
      return;
    }
    oberflaeche.aktualisiere(zustand);
    speicher.speichern(zustand);

    spinneGluecksrad(ergebnis.segmentIndex, {
      beimTick: () => klang.gluecksradTick(),
      beimFertig: () => {
        const segment = ergebnis.segment;
        const text =
          segment.art === 'bl'
            ? `${segment.symbol} +${zahl(ergebnis.bl)} BL!`
            : `${segment.symbol} ${segment.text}`;
        oberflaeche.melde(text, 3000);

        const klaenge = { bl: 'blaseEingesammelt', boost: 'fischGefangen', kiste: 'kauf', perlen: 'erfolg' };
        klang[klaenge[segment.art]]?.();

        const rad = document.getElementById('gluecksrad');
        const rahmen = rad.getBoundingClientRect();
        funken.kritischerStoss(rahmen.left + rahmen.width / 2, rahmen.top + rahmen.height / 2);
        vibriere(segment.art === 'kiste' ? [20, 30, 20, 30, 40] : [15, 25, 15]);

        pruefeFortschritt();
        oberflaeche.aktualisiere(zustand);
        speicher.speichern(zustand);
      },
    });
  },

  starteExpedition(id) {
    const ergebnis = spiel.starteExpedition(zustand, id);
    if (!ergebnis.erfolg) {
      oberflaeche.melde(
        ergebnis.grund === 'keine Angel ausgerüstet'
          ? 'Rüste zuerst eine Angel aus.'
          : 'Expedition kann jetzt nicht gestartet werden.'
      );
      return;
    }
    oberflaeche.melde('Expedition gestartet.');
    klang.kauf();
    vibriere(12);
    oberflaeche.aktualisiere(zustand);
    speicher.speichern(zustand);
  },

  sammleExpedition() {
    if (!zustand.expedition) return;
    const def = findeExpedition(zustand.expedition.expeditionId);
    const ergebnis = spiel.sammleExpedition(zustand);
    if (!ergebnis.erfolg) {
      oberflaeche.melde('Die Expedition ist noch nicht zurück.');
      return;
    }
    klang.expeditionZurueck();
    vibriere([20, 30, 20, 30, 40]);
    beiKauf();
    zeigeExpeditionErgebnis(def, ergebnis, () => {
      pruefeFortschritt();
      oberflaeche.aktualisiere(zustand);
    });
    oberflaeche.aktualisiere(zustand);
    speicher.speichern(zustand);
  },

  beiReiterwechsel() {
    klang.reiterWechsel();
  },
});

const hintergrund = starteHintergrund(
  document.getElementById('hintergrund'),
  () => spiel.aktuelleTiefe(zustand),
  () => zustand.module
);
const funken = starteFunken(document.getElementById('funken'));

/** Funkenausbruch über der Guthabenzahl – der sichtbare „Ort“ von Käufen. */
function beiKauf() {
  const rahmen = tippflaeche.getBoundingClientRect();
  funken.kaufFunken(rahmen.left + rahmen.width / 2, rahmen.top + rahmen.height * 0.32);
}

/**
 * Zeigt das Kisten-Ergebnis mit allen Effekten – gemeinsame Stelle für die
 * drei Wege, an eine Kiste zu kommen (eigener Vorrat, Treibgut, Tages-Truhe),
 * damit sich das Öffnen überall exakt gleich befriedigend anfühlt.
 */
function zeigeKisteMitEffekten(ergebnis) {
  klang.kisteOeffnen(ergebnis.seltenheit);
  vibriere(ergebnis.item ? [20, 40, 20, 40, 30] : [15, 20, 15]);
  zeigeKiste(ergebnis, {
    beimAufdecken: () => {
      klang.kisteKlack();
      const rahmen = tippflaeche.getBoundingClientRect();
      funken.kritischerStoss(rahmen.left + rahmen.width / 2, rahmen.top + rahmen.height * 0.32);
      if (ergebnis.seltenheit === 'legendaer') {
        oberflaeche.beben(true);
        oberflaeche.blitz();
        vibriere([25, 40, 25, 40, 60]);
      }
    },
    beimSchliessen: () => {
      pruefeFortschritt();
      oberflaeche.aktualisiere(zustand);
    },
  });
  oberflaeche.aktualisiere(zustand);
  speicher.speichern(zustand);
}

/* ---------------- Antippen ---------------- */

const tippflaeche = document.getElementById('tippflaeche');

// Sicherheitsbremse gegen zu schnelles Flackern: Bei hoher Kombo können
// kritische Treffer im Bruchteil einer Sekunde mehrfach auslösen. Ohne
// Begrenzung würde der Bildschirmblitz dann schneller als dreimal pro
// Sekunde aufleuchten – das ist die anerkannte Schwelle, ab der Blitze für
// fotosensible Menschen riskant werden (WCAG 2.3.1). Die Zahl selbst und die
// Partikel bleiben unbegrenzt, nur der große, flächige Blitz wird gedrosselt.
const BLITZ_MINDESTABSTAND_MS = 400;
let letzterBlitz = 0;

function beiTipp(x, y) {
  const { ertrag, kombo, kritisch } = spiel.tippe(zustand);

  oberflaeche.schwebetext(x, y, `+${zahl(ertrag)}`, { kritisch });
  oberflaeche.pulsGuthaben(kritisch);
  funken.stoss(x, y, kombo > 1 ? { anzahl: 6 + Math.min(kombo, 14), geschwindigkeit: 1 + kombo * 0.03 } : undefined);

  if (kritisch) {
    klang.krit();
    funken.kritischerStoss(x, y);
    oberflaeche.beben(false);
    const jetzt = performance.now();
    if (jetzt - letzterBlitz >= BLITZ_MINDESTABSTAND_MS) {
      oberflaeche.blitz();
      letzterBlitz = jetzt;
    }
    vibriere([16, 24, 16]);
  } else {
    klang.tipp(kombo - 1);
    vibriere(8);
  }

  pruefeFortschritt();
}

// Zeigergestützt, damit Maus und Finger gleich behandelt werden.
tippflaeche.addEventListener('pointerdown', (ereignis) => {
  ereignis.preventDefault();
  beiTipp(ereignis.clientX, ereignis.clientY);
});

// Tastatur: Leertaste und Eingabetaste auf der Fläche.
tippflaeche.addEventListener('keydown', (ereignis) => {
  if (ereignis.key === ' ' || ereignis.key === 'Enter') {
    ereignis.preventDefault();
    const rahmen = tippflaeche.getBoundingClientRect();
    beiTipp(rahmen.left + rahmen.width / 2, rahmen.top + rahmen.height / 2);
  }
});

/* ---------------- Fortschritt prüfen ---------------- */

const entdeckungsWarteschlange = [];
let dialogOffen = false;

function pruefeFortschritt() {
  for (const e of spiel.pruefeEntdeckungen(zustand)) entdeckungsWarteschlange.push(e);
  if (spiel.pruefeMarianengraben(zustand)) marianengrabenBereit = true;
  const neueErfolge = spiel.pruefeErfolge(zustand);
  for (const e of neueErfolge) {
    oberflaeche.melde(`${e.symbol} Erfolg: ${e.name}`);
    klang.erfolg();
  }
  if (neueErfolge.length > 0) erfolgsKistenAusstehend += neueErfolge.length;
  zeigeNaechsteEntdeckung();
  versucheErfolgsKisteZuZeigen();
  versucheMarianengrabenZuZeigen();
}

function zeigeNaechsteEntdeckung() {
  if (dialogOffen || entdeckungsWarteschlange.length === 0) return;
  dialogOffen = true;
  const naechste = entdeckungsWarteschlange.shift();
  klang.entdeckung();
  vibriere([20, 40, 20, 40, 30]);
  zeigeEntdeckung(naechste, () => {
    dialogOffen = false;
    oberflaeche.aktualisiere(zustand);
    zeigeNaechsteEntdeckung();
  });
}

/* ---------------- Leuchtblase ----------------
 * Treibt in unregelmäßigen Abständen kurz übers Bild. Wer rechtzeitig
 * antippt, bekommt eine spürbare Belohnung; wer nicht hinschaut, verpasst
 * sie folgenlos – das ist der Grund, ab und zu kurz aufs Handy zu schauen,
 * auch ohne aktiv zu spielen. */

const tauchansicht = document.getElementById('tauchansicht');
const leuchtblaseEl = document.getElementById('leuchtblase');

const LEUCHTBLASE_MIN_PAUSE_MS = 70_000;
const LEUCHTBLASE_MAX_PAUSE_MS = 150_000;
const LEUCHTBLASE_SICHTBAR_MS = 7_000;
const LEUCHTBLASE_TREIB_MS = 6_000;
const LEUCHTBLASE_RAND_PX = 34;

let leuchtblaseSichtbar = false;
let leuchtblaseVerschwindenTimer = null;

function zufallZwischen(min, max) {
  return min + Math.random() * (max - min);
}

/** Ist gerade irgendein Dialog offen, der die Leuchtblase verdecken würde? */
function irgendeinDialogOffen() {
  return Array.from(document.querySelectorAll('.overlay')).some((el) => !el.hidden);
}

function planeLeuchtblase() {
  setTimeout(versucheLeuchtblaseZuZeigen, zufallZwischen(LEUCHTBLASE_MIN_PAUSE_MS, LEUCHTBLASE_MAX_PAUSE_MS));
}

function versucheLeuchtblaseZuZeigen() {
  // Nicht mitten in einem Dialog oder im Hintergrund zeigen – lieber kurz
  // warten, als den Moment ungesehen verstreichen zu lassen.
  if (document.hidden || irgendeinDialogOffen() || leuchtblaseSichtbar || treibendeKisteSichtbar || erfolgsKisteSichtbar) {
    setTimeout(versucheLeuchtblaseZuZeigen, 4000);
    return;
  }
  zeigeLeuchtblase();
}

function zeigeLeuchtblase() {
  const rahmen = tauchansicht.getBoundingClientRect();
  const startX = zufallZwischen(LEUCHTBLASE_RAND_PX, Math.max(LEUCHTBLASE_RAND_PX, rahmen.width - LEUCHTBLASE_RAND_PX));
  const startY = zufallZwischen(rahmen.height * 0.12, rahmen.height * 0.6);

  leuchtblaseEl.style.transition = 'none';
  leuchtblaseEl.style.left = `${startX}px`;
  leuchtblaseEl.style.top = `${startY}px`;
  leuchtblaseEl.classList.remove('ausblenden');
  leuchtblaseEl.hidden = false;
  void leuchtblaseEl.offsetWidth; // Reflow erzwingen, bevor die Transition wieder greift

  const zielX = Math.min(rahmen.width - LEUCHTBLASE_RAND_PX, Math.max(LEUCHTBLASE_RAND_PX, startX + zufallZwischen(-70, 70)));
  const zielY = Math.min(rahmen.height - LEUCHTBLASE_RAND_PX, Math.max(LEUCHTBLASE_RAND_PX, startY + zufallZwischen(40, 120)));
  leuchtblaseEl.style.transition = `left ${LEUCHTBLASE_TREIB_MS}ms linear, top ${LEUCHTBLASE_TREIB_MS}ms linear`;
  requestAnimationFrame(() => {
    leuchtblaseEl.style.left = `${zielX}px`;
    leuchtblaseEl.style.top = `${zielY}px`;
  });

  leuchtblaseSichtbar = true;
  klang.blaseErscheint();
  leuchtblaseVerschwindenTimer = setTimeout(leuchtblaseUnbenutztVerschwinden, LEUCHTBLASE_SICHTBAR_MS);
}

function leuchtblaseUnbenutztVerschwinden() {
  if (!leuchtblaseSichtbar) return;
  leuchtblaseSichtbar = false;
  leuchtblaseEl.classList.add('ausblenden');
  setTimeout(() => {
    leuchtblaseEl.hidden = true;
    leuchtblaseEl.classList.remove('ausblenden');
  }, 320);
  planeLeuchtblase();
}

leuchtblaseEl.addEventListener('pointerdown', (ereignis) => {
  ereignis.preventDefault();
  if (!leuchtblaseSichtbar) return;
  clearTimeout(leuchtblaseVerschwindenTimer);
  leuchtblaseSichtbar = false;
  leuchtblaseEl.hidden = true;
  leuchtblaseEl.classList.remove('ausblenden');

  const belohnung = spiel.sammleLeuchtblase(zustand);
  const x = ereignis.clientX;
  const y = ereignis.clientY;

  oberflaeche.schwebetext(x, y, `+${zahl(belohnung)}`, { kritisch: true });
  oberflaeche.pulsGuthaben(true);
  funken.kritischerStoss(x, y);
  klang.blaseEingesammelt();
  vibriere([20, 30, 20, 30, 40]);

  pruefeFortschritt();
  oberflaeche.aktualisiere(zustand);
  planeLeuchtblase();
});

/* ---------------- Glücksfisch ----------------
 * Schwimmt schnell quer durchs Bild – vom linken oder rechten Rand zum
 * jeweils anderen. Anders als die Leuchtblase treibt er nicht sanft, sondern
 * „schwimmt vorbei“; wer ihn erwischt, bekommt einen zeitlich begrenzten
 * Produktionsboost statt einer Guthabengutschrift. Eigener, unabhängiger
 * Zeitplan – beide Ereignisse sollen sich nicht gegenseitig verdrängen. */

const gluecksfischEl = document.getElementById('gluecksfisch');

const GLUECKSFISCH_MIN_PAUSE_MS = 60_000;
const GLUECKSFISCH_MAX_PAUSE_MS = 130_000;
const GLUECKSFISCH_SCHWIMM_MS = 4_200;

let gluecksfischSichtbar = false;
let gluecksfischVerschwindenTimer = null;

function planeGluecksfisch() {
  setTimeout(
    versucheGluecksfischZuZeigen,
    zufallZwischen(GLUECKSFISCH_MIN_PAUSE_MS, GLUECKSFISCH_MAX_PAUSE_MS)
  );
}

function versucheGluecksfischZuZeigen() {
  if (document.hidden || irgendeinDialogOffen() || gluecksfischSichtbar || leuchtblaseSichtbar || treibendeKisteSichtbar || erfolgsKisteSichtbar) {
    setTimeout(versucheGluecksfischZuZeigen, 4000);
    return;
  }
  zeigeGluecksfisch();
}

function zeigeGluecksfisch() {
  const rahmen = tauchansicht.getBoundingClientRect();
  const vonLinks = Math.random() < 0.5;
  const y = zufallZwischen(rahmen.height * 0.16, rahmen.height * 0.58);
  const startX = vonLinks ? -40 : rahmen.width + 40;
  const zielX = vonLinks ? rahmen.width + 40 : -40;
  // Ein Emoji-Fisch blickt in den meisten Schriften von sich aus nach links –
  // beim Schwimmen nach rechts wird er deshalb gespiegelt, nicht umgekehrt.
  gluecksfischEl.style.setProperty('--richtung', vonLinks ? -1 : 1);

  gluecksfischEl.style.transition = 'none';
  gluecksfischEl.style.left = `${startX}px`;
  gluecksfischEl.style.top = `${y}px`;
  gluecksfischEl.classList.remove('ausblenden');
  gluecksfischEl.hidden = false;
  void gluecksfischEl.offsetWidth; // Reflow erzwingen, bevor die Transition greift

  gluecksfischEl.style.transition = `left ${GLUECKSFISCH_SCHWIMM_MS}ms linear, top ${GLUECKSFISCH_SCHWIMM_MS}ms linear`;
  requestAnimationFrame(() => {
    gluecksfischEl.style.left = `${zielX}px`;
    gluecksfischEl.style.top = `${y + zufallZwischen(-30, 30)}px`;
  });

  gluecksfischSichtbar = true;
  klang.fischErscheint();
  gluecksfischVerschwindenTimer = setTimeout(gluecksfischEntkommen, GLUECKSFISCH_SCHWIMM_MS);
}

function gluecksfischEntkommen() {
  if (!gluecksfischSichtbar) return;
  gluecksfischSichtbar = false;
  gluecksfischEl.hidden = true;
  planeGluecksfisch();
}

gluecksfischEl.addEventListener('pointerdown', (ereignis) => {
  ereignis.preventDefault();
  if (!gluecksfischSichtbar) return;
  clearTimeout(gluecksfischVerschwindenTimer);
  gluecksfischSichtbar = false;
  gluecksfischEl.classList.add('ausblenden');
  setTimeout(() => {
    gluecksfischEl.hidden = true;
    gluecksfischEl.classList.remove('ausblenden');
  }, 260);

  spiel.fangeGluecksfisch(zustand);
  const x = ereignis.clientX;
  const y = ereignis.clientY;

  oberflaeche.schwebetext(x, y, '⚡ Boost', { kritisch: true }); // die Funktion hängt „ !“ automatisch an
  oberflaeche.pulsGuthaben(true);
  funken.kritischerStoss(x, y);
  klang.fischGefangen();
  vibriere([18, 26, 18, 26, 34]);

  pruefeFortschritt();
  oberflaeche.aktualisiere(zustand);
  planeGluecksfisch();
});

/* ---------------- Treibende Kiste ----------------
 * Ein dritter, seltener Fund im selben Baukasten wie Leuchtblase/Glücksfisch:
 * treibt langsam ins Bild, bleibt bewusst lange sichtbar (anders als beim
 * schnellen Glücksfisch soll hier niemand unter Zeitdruck danebentippen) und
 * öffnet beim Antippen direkt eine Kiste – der Belohnungsmoment kommt sofort,
 * ohne Umweg über einen Tab. */

const treibendeKisteEl = document.getElementById('treibende-kiste');

const TREIBGUT_MIN_PAUSE_MS = 4 * 60 * 1000;
const TREIBGUT_MAX_PAUSE_MS = 8 * 60 * 1000;
const TREIBGUT_SICHTBAR_MS = 9_000;
const TREIBGUT_TREIB_MS = 7_500;
const TREIBGUT_RAND_PX = 36;

let treibendeKisteSichtbar = false;
let treibendeKisteVerschwindenTimer = null;

function planeTreibendeKiste() {
  setTimeout(versucheTreibendeKisteZuZeigen, zufallZwischen(TREIBGUT_MIN_PAUSE_MS, TREIBGUT_MAX_PAUSE_MS));
}

function versucheTreibendeKisteZuZeigen() {
  if (document.hidden || irgendeinDialogOffen() || treibendeKisteSichtbar || leuchtblaseSichtbar || gluecksfischSichtbar || erfolgsKisteSichtbar) {
    setTimeout(versucheTreibendeKisteZuZeigen, 5000);
    return;
  }
  zeigeTreibendeKiste();
}

function zeigeTreibendeKiste() {
  const rahmen = tauchansicht.getBoundingClientRect();
  const startX = zufallZwischen(TREIBGUT_RAND_PX, Math.max(TREIBGUT_RAND_PX, rahmen.width - TREIBGUT_RAND_PX));
  const startY = zufallZwischen(rahmen.height * 0.14, rahmen.height * 0.58);

  treibendeKisteEl.style.transition = 'none';
  treibendeKisteEl.style.left = `${startX}px`;
  treibendeKisteEl.style.top = `${startY}px`;
  treibendeKisteEl.classList.remove('ausblenden');
  treibendeKisteEl.hidden = false;
  void treibendeKisteEl.offsetWidth; // Reflow erzwingen, bevor die Transition greift

  const zielX = Math.min(rahmen.width - TREIBGUT_RAND_PX, Math.max(TREIBGUT_RAND_PX, startX + zufallZwischen(-50, 50)));
  const zielY = Math.min(rahmen.height - TREIBGUT_RAND_PX, Math.max(TREIBGUT_RAND_PX, startY + zufallZwischen(30, 90)));
  treibendeKisteEl.style.transition = `left ${TREIBGUT_TREIB_MS}ms linear, top ${TREIBGUT_TREIB_MS}ms linear`;
  requestAnimationFrame(() => {
    treibendeKisteEl.style.left = `${zielX}px`;
    treibendeKisteEl.style.top = `${zielY}px`;
  });

  treibendeKisteSichtbar = true;
  klang.blaseErscheint();
  treibendeKisteVerschwindenTimer = setTimeout(treibendeKisteUnbenutztVerschwinden, TREIBGUT_SICHTBAR_MS);
}

function treibendeKisteUnbenutztVerschwinden() {
  if (!treibendeKisteSichtbar) return;
  treibendeKisteSichtbar = false;
  treibendeKisteEl.classList.add('ausblenden');
  setTimeout(() => {
    treibendeKisteEl.hidden = true;
    treibendeKisteEl.classList.remove('ausblenden');
  }, 320);
  planeTreibendeKiste();
}

treibendeKisteEl.addEventListener('pointerdown', (ereignis) => {
  ereignis.preventDefault();
  if (!treibendeKisteSichtbar) return;
  clearTimeout(treibendeKisteVerschwindenTimer);
  treibendeKisteSichtbar = false;
  treibendeKisteEl.hidden = true;
  treibendeKisteEl.classList.remove('ausblenden');

  const ergebnis = spiel.sammleTreibgutKiste(zustand);
  zeigeKisteMitEffekten(ergebnis);
  planeTreibendeKiste();
});

/* ---------------- Erfolgs-Kiste ----------------
 * Jeder neue Erfolg gibt eine Kiste – die soll man sich aber verdient
 * abholen dürfen, statt dass sie einfach kommentarlos im Inventar auftaucht.
 * Erscheint deshalb mittig in der Tauchansicht, schwimmt dort sanft (siehe
 * CSS), und fliegt beim Antippen zur genauen Antipp-Stelle, bevor sie sich
 * öffnet. Mehrere Erfolge auf einmal (z. B. nach langer Abwesenheit) werden
 * nacheinander abgearbeitet, nie gleichzeitig gezeigt. */

const erfolgsKisteEl = document.getElementById('erfolgs-kiste');
const erfolgsKisteKernEl = document.getElementById('erfolgs-kiste-kern');

const ERFOLGSKISTE_FLUG_MS = 340;

let erfolgsKistenAusstehend = 0;
let erfolgsKisteSichtbar = false;
let erfolgsKisteFliegt = false;

function versucheErfolgsKisteZuZeigen() {
  if (erfolgsKisteSichtbar || erfolgsKistenAusstehend <= 0) return;
  if (document.hidden || irgendeinDialogOffen()) return; // pruefeFortschritt() versucht es bald erneut
  zeigeErfolgsKiste();
}

function zeigeErfolgsKiste() {
  const rahmen = tauchansicht.getBoundingClientRect();
  const x = rahmen.width / 2;
  const y = rahmen.height * 0.24;

  erfolgsKisteEl.style.transition = 'none';
  erfolgsKisteEl.style.left = `${x}px`;
  erfolgsKisteEl.style.top = `${y}px`;
  erfolgsKisteEl.classList.remove('fliegt');
  erfolgsKisteEl.style.transform = '';
  erfolgsKisteEl.style.opacity = '';
  erfolgsKisteEl.hidden = false;
  void erfolgsKisteEl.offsetWidth; // Reflow erzwingen, bevor die Erscheinen-Animation greift

  erfolgsKisteKernEl.classList.remove('erscheinen');
  void erfolgsKisteKernEl.offsetWidth;
  erfolgsKisteKernEl.classList.add('erscheinen');

  erfolgsKisteSichtbar = true;
  klang.blaseErscheint();
  vibriere([15, 30, 15]);
}

erfolgsKisteEl.addEventListener('pointerdown', (ereignis) => {
  ereignis.preventDefault();
  if (!erfolgsKisteSichtbar || erfolgsKisteFliegt) return;
  erfolgsKisteFliegt = true;

  // Fliegt zur exakten Antipp-Stelle, statt einfach zu verschwinden – der
  // Fund soll sich anfühlen, als würde man ihn selbst einsammeln.
  const rahmen = tauchansicht.getBoundingClientRect();
  const zielX = Math.min(rahmen.width, Math.max(0, ereignis.clientX - rahmen.left));
  const zielY = Math.min(rahmen.height, Math.max(0, ereignis.clientY - rahmen.top));

  erfolgsKisteEl.style.transition =
    `left ${ERFOLGSKISTE_FLUG_MS}ms cubic-bezier(.3,.8,.4,1), top ${ERFOLGSKISTE_FLUG_MS}ms cubic-bezier(.3,.8,.4,1), transform ${ERFOLGSKISTE_FLUG_MS}ms ease, opacity ${ERFOLGSKISTE_FLUG_MS}ms ease`;
  erfolgsKisteEl.classList.add('fliegt');
  erfolgsKisteEl.style.left = `${zielX}px`;
  erfolgsKisteEl.style.top = `${zielY}px`;

  funken.stoss(ereignis.clientX, ereignis.clientY, { anzahl: 10, geschwindigkeit: 1.2 });
  vibriere(12);

  setTimeout(() => {
    erfolgsKisteSichtbar = false;
    erfolgsKisteFliegt = false;
    erfolgsKisteEl.hidden = true;
    erfolgsKisteKernEl.classList.remove('erscheinen');
    erfolgsKistenAusstehend = Math.max(0, erfolgsKistenAusstehend - 1);

    const ergebnis = spiel.sammleErfolgsKiste(zustand);
    zeigeKisteMitEffekten(ergebnis);
    // zeigeKisteMitEffekten() ruft beim Schließen pruefeFortschritt() auf,
    // das wiederum versucheErfolgsKisteZuZeigen() für den Rest der
    // Warteschlange anstößt – kein eigener Folge-Timer nötig.
  }, ERFOLGSKISTE_FLUG_MS);
});

/* ---------------- Marianengraben-Moment ----------------
 * Einmaliger, größerer Abschluss-Moment beim ersten Erreichen von 11.000 m
 * (siehe spiel.pruefeMarianengraben) – wartet wie die Entdeckungen darauf,
 * dass gerade kein anderer Dialog offen ist, statt sich dazwischenzudrängen. */

let marianengrabenBereit = false;

function versucheMarianengrabenZuZeigen() {
  if (!marianengrabenBereit || dialogOffen) return;
  marianengrabenBereit = false;
  dialogOffen = true;
  klang.marianengraben();
  vibriere([40, 80, 40, 80, 120]);
  zeigeMarianengraben(zustand, () => {
    dialogOffen = false;
    oberflaeche.aktualisiere(zustand);
    zeigeNaechsteEntdeckung();
  });
}

/* ---------------- Aufstieg ---------------- */

document.getElementById('knopf-aufstieg').addEventListener('click', () => {
  const gewinn = spiel.perlenBeiAufstieg(zustand);
  if (gewinn <= 0) return;
  const sicher = globalThis.confirm(
    `Wirklich auftauchen?\n\nDu erhältst ${ganzzahl(gewinn)} Perlen ` +
      `(+${(gewinn * 2).toFixed(0)} % dauerhaft).\n` +
      'Module und Ausbauten gehen dabei verloren.'
  );
  if (!sicher) return;

  const ergebnis = spiel.aufstieg(zustand);
  if (ergebnis.erfolg) {
    speicher.speichern(zustand);
    oberflaeche.melde(`Aufgetaucht. ${ganzzahl(ergebnis.gewonnen)} Perlen erhalten.`);
    oberflaeche.waehleReiter('reiter-module');
    oberflaeche.aktualisiere(zustand);
    klang.aufstieg();
    funken.perlenRegen();
    oberflaeche.beben(true);
    oberflaeche.blitz();
    vibriere([30, 60, 30, 60, 80]);
  }
});

/* ---------------- Menü ---------------- */

document.getElementById('knopf-menue').addEventListener('click', () => {
  const gesamtModule = Object.values(zustand.module).reduce((s, n) => s + n, 0);
  fuelleMenue(zustand, [
    ['Gesamte Ausbeute', `${zahl(zustand.gesamtGesamt)} BL`],
    ['Diese Runde', `${zahl(zustand.gesamtRunde)} BL`],
    ['Tiefster Punkt', `${ganzzahl(zustand.maxTiefe)} m`],
    ['Module', ganzzahl(gesamtModule)],
    ['Antippen', ganzzahl(zustand.tipps)],
    ['Perlen', ganzzahl(zustand.perlen)],
    ['Auftauchen', ganzzahl(zustand.aufstiege)],
    ['Entdeckungen', `${zustand.entdeckungen.length} / 15`],
    ['Spielzeit', dauer(zustand.spielzeit)],
  ]);
  document.getElementById('menue-fussnote').textContent = monetarisierung.istUebungsfassung()
    ? 'Werbung und Käufe laufen zurzeit in der Übungsfassung.'
    : '';
  document.getElementById('menue-werbefrei').hidden = zustand.werbefrei;
  schalterTon.setAttribute('aria-pressed', String(klang.istAn() || leseEinstellung('tiefenrausch.ton', true)));
  schalterVibration.setAttribute('aria-pressed', String(vibrationAn));
  klang.menue(true);
  zeigeDialog('overlay-menue');
});

document.getElementById('menue-schliessen').addEventListener('click', () => {
  klang.menue(false);
  schliesseDialog('overlay-menue');
});

/* ---------------- Ton / Vibration umschalten ---------------- */

const schalterTon = document.getElementById('schalter-ton');
const schalterVibration = document.getElementById('schalter-vibration');

schalterTon.addEventListener('click', () => {
  const neu = schalterTon.getAttribute('aria-pressed') !== 'true';
  schalterTon.setAttribute('aria-pressed', String(neu));
  klang.setzeAn(neu);
  schreibeEinstellung('tiefenrausch.ton', neu);
  if (neu) klang.tipp(0); // hörbare Bestätigung, dass Ton wieder an ist
});

schalterVibration.addEventListener('click', () => {
  vibrationAn = schalterVibration.getAttribute('aria-pressed') !== 'true';
  schalterVibration.setAttribute('aria-pressed', String(vibrationAn));
  schreibeEinstellung('tiefenrausch.vibration', vibrationAn);
  vibriere(12);
});

document.getElementById('menue-speichern').addEventListener('click', () => {
  const erfolg = speicher.speichern(zustand);
  oberflaeche.melde(erfolg ? 'Gespeichert.' : 'Speichern nicht möglich.');
});

document.getElementById('menue-sicherung').addEventListener('click', async () => {
  const text = speicher.alsText(zustand);
  try {
    await navigator.clipboard.writeText(text);
    oberflaeche.melde('Spielstand in die Zwischenablage kopiert.');
  } catch {
    globalThis.prompt('Spielstand zum Aufbewahren kopieren:', text);
  }
});

document.getElementById('menue-werbefrei').addEventListener('click', async () => {
  const ergebnis = await monetarisierung.kaufeWerbefrei();
  if (ergebnis.gekauft) {
    zustand.werbefrei = true;
    speicher.speichern(zustand);
    oberflaeche.melde('Danke! Werbung ist deaktiviert.');
    document.getElementById('menue-werbefrei').hidden = true;
  } else {
    oberflaeche.melde(ergebnis.grund ?? 'Kauf nicht möglich.');
  }
});

document.getElementById('menue-zuruecksetzen').addEventListener('click', () => {
  const sicher = globalThis.confirm(
    'Wirklich alles zurücksetzen?\n\nPerlen, Entdeckungen und Erfolge gehen dabei ebenfalls verloren. ' +
      'Das lässt sich nicht rückgängig machen.'
  );
  if (!sicher) return;
  speicher.loeschen();
  globalThis.location.reload();
});

/* ---------------- Begrüßung / Abwesenheit ---------------- */

document.getElementById('willkommen-ok').addEventListener('click', () => {
  schliesseDialog('overlay-willkommen');
});

function begruesse() {
  if (!warVorhanden || verstricheneSekunden < 60) return;
  const offline = spiel.offlineErtrag(zustand, verstricheneSekunden);
  if (offline.menge <= 0) return;

  spiel.schreibeOfflineGut(zustand, offline.menge);
  pruefeFortschritt();

  zeigeWillkommen(offline.menge, offline.sekunden, offline.abgeschnitten, async (ertrag) => {
    const knopf = document.getElementById('willkommen-verdoppeln');
    knopf.disabled = true;
    knopf.textContent = 'Wird geladen …';
    const ergebnis = await monetarisierung.belohnungsvideo({
      beiAnzeige: () => {
        knopf.textContent = 'Video läuft …';
      },
    });
    knopf.disabled = false;
    knopf.textContent = '▶ Verdoppeln';
    if (ergebnis.gesehen) {
      spiel.schreibeOfflineGut(zustand, ertrag);
      oberflaeche.melde(`+${zahl(ertrag)} BL zusätzlich.`);
      pruefeFortschritt();
      oberflaeche.aktualisiere(zustand);
    }
    schliesseDialog('overlay-willkommen');
  });
}

/* ---------------- Spielschleife ---------------- */

let letzterTick = performance.now();
let letzteAnzeige = 0;
let letztesSpeichern = Date.now();

function schleife(jetzt) {
  const abstand = (jetzt - letzterTick) / 1000;
  letzterTick = jetzt;

  // Sehr große Sprünge (Gerät war im Ruhezustand) werden begrenzt; die
  // Abwesenheit rechnet stattdessen der Offline-Ertrag beim Neustart ab.
  spiel.tick(zustand, Math.min(abstand, 5));

  if (jetzt - letzteAnzeige >= ANZEIGE_ABSTAND_MS) {
    letzteAnzeige = jetzt;
    pruefeFortschritt();
    oberflaeche.aktualisiere(zustand);
  }

  if (Date.now() - letztesSpeichern >= SPEICHER_ABSTAND_MS) {
    letztesSpeichern = Date.now();
    speicher.speichern(zustand);
  }

  requestAnimationFrame(schleife);
}

/* ---------------- Beim Verlassen sichern ---------------- */

for (const ereignis of ['pagehide', 'blur']) {
  globalThis.addEventListener(ereignis, () => speicher.speichern(zustand));
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) speicher.speichern(zustand);
});

/* ---------------- Los ---------------- */

pruefeFortschritt();
oberflaeche.aktualisiere(zustand);
begruesse();
planeLeuchtblase();
planeGluecksfisch();
planeTreibendeKiste();
requestAnimationFrame(schleife);

/* ---------------- Offline-Fähigkeit ---------------- */

// Der Service Worker macht das Spiel ohne Internetverbindung spielbar und
// erlaubt die Installation auf dem Startbildschirm.
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  globalThis.addEventListener('load', () => {
    navigator.serviceWorker.register('./dienst.js').catch(() => {
      // Ohne Service Worker läuft das Spiel trotzdem – nur eben nicht offline.
    });
  });
}

// Für Fehlersuche in der Entwicklung erreichbar machen.
globalThis.tiefenrausch = {
  zustand,
  spiel,
  speicher,
  oberflaeche,
  klang,
  funken,
  hintergrund,
  // Löst Leuchtblase/Glücksfisch sofort aus, statt auf ihre normale Pause zu
  // warten – nur zum Testen gedacht.
  zeigeLeuchtblaseJetzt: zeigeLeuchtblase,
  zeigeGluecksfischJetzt: zeigeGluecksfisch,
  zeigeTreibendeKisteJetzt: zeigeTreibendeKiste,
  zeigeErfolgsKisteJetzt: () => {
    erfolgsKistenAusstehend += 1;
    zeigeErfolgsKiste();
  },
};
