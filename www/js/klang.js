/**
 * Klang – vollständig synthetisch über die Web Audio API.
 *
 * Keine Audiodateien: Das hält die App klein, spart Ladezeit und erlaubt es,
 * die Tonhöhe fortlaufend an den Spielzustand anzupassen. Genau das ist der
 * eigentliche Trick – ein Ton, der mit der Kombo *ansteigt*, zieht viel stärker
 * als derselbe Ton in Dauerschleife.
 *
 * Rücksichten:
 *   - Der Tonkontext wird erst bei der ersten Berührung erzeugt (Browserregel).
 *   - Töne sind sehr kurz und leise; sie müssen zehnmal pro Sekunde aushaltbar sein.
 *   - Bei mehr als ein paar gleichzeitigen Tönen wird abgeregelt, sonst knackt es.
 */

let kontext = null;
let summe = null;
let an = true;
let laufendeToene = 0;

const MAX_GLEICHZEITIG = 12;

/** Pentatonik – darin klingt jede Tonfolge stimmig, egal wie schnell getippt wird. */
const PENTATONIK = [0, 2, 4, 7, 9];

function halbtonZuFrequenz(halbton, grundton = 220) {
  return grundton * Math.pow(2, halbton / 12);
}

/** Erzeugt den Tonkontext. Muss aus einer Nutzeraktion heraus geschehen. */
export function starte() {
  if (kontext) return true;
  const Kontext = globalThis.AudioContext ?? globalThis.webkitAudioContext;
  if (!Kontext) return false;
  try {
    kontext = new Kontext();
    summe = kontext.createGain();
    summe.gain.value = 0.22;
    summe.connect(kontext.destination);
    return true;
  } catch {
    kontext = null;
    return false;
  }
}

export function setzeAn(wert) {
  an = Boolean(wert);
  if (an) starte();
}

export function istAn() {
  return an && kontext !== null;
}

function bereit() {
  if (!an) return false;
  if (!kontext) return false;
  if (kontext.state === 'suspended') kontext.resume().catch(() => {});
  return laufendeToene < MAX_GLEICHZEITIG;
}

/**
 * Ein einzelner Ton mit Hüllkurve.
 * @param {object} o
 */
function ton({
  frequenz,
  dauer = 0.12,
  form = 'sine',
  lautstaerke = 0.5,
  anstieg = 0.004,
  gleiten = 0,
  verzoegerung = 0,
}) {
  if (!kontext) return;
  const start = kontext.currentTime + verzoegerung;
  const quelle = kontext.createOscillator();
  const huelle = kontext.createGain();

  quelle.type = form;
  quelle.frequency.setValueAtTime(frequenz, start);
  if (gleiten) {
    quelle.frequency.exponentialRampToValueAtTime(
      Math.max(20, frequenz * gleiten),
      start + dauer
    );
  }

  huelle.gain.setValueAtTime(0.0001, start);
  huelle.gain.exponentialRampToValueAtTime(lautstaerke, start + anstieg);
  huelle.gain.exponentialRampToValueAtTime(0.0001, start + dauer);

  quelle.connect(huelle);
  huelle.connect(summe);

  laufendeToene++;
  quelle.onended = () => {
    laufendeToene--;
    huelle.disconnect();
  };
  quelle.start(start);
  quelle.stop(start + dauer + 0.02);
}

/** Kurzes Rauschen – für „Funken“ und Aufschläge. */
function rauschen({ dauer = 0.14, lautstaerke = 0.18, hochpass = 1200 }) {
  if (!kontext) return;
  const bilder = Math.floor(kontext.sampleRate * dauer);
  const puffer = kontext.createBuffer(1, bilder, kontext.sampleRate);
  const daten = puffer.getChannelData(0);
  for (let i = 0; i < bilder; i++) {
    // Zum Ende hin ausblenden, sonst klingt es wie ein Knacken.
    daten[i] = (Math.random() * 2 - 1) * (1 - i / bilder);
  }
  const quelle = kontext.createBufferSource();
  quelle.buffer = puffer;

  const filter = kontext.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = hochpass;

  const huelle = kontext.createGain();
  huelle.gain.value = lautstaerke;

  quelle.connect(filter);
  filter.connect(huelle);
  huelle.connect(summe);

  laufendeToene++;
  quelle.onended = () => {
    laufendeToene--;
    huelle.disconnect();
  };
  quelle.start();
}

/* ------------------------------------------------------------------ */
/* Die Klänge des Spiels                                               */
/* ------------------------------------------------------------------ */

/**
 * Antippen. Die Tonhöhe steigt mit der Kombo – das ist der eigentliche Sog:
 * Man tippt weiter, um zu hören, wie hoch es noch geht.
 */
export function tipp(kombo = 0) {
  if (!bereit()) return;
  const stufe = Math.min(kombo, 24);
  const oktave = Math.floor(stufe / PENTATONIK.length);
  const halbton = PENTATONIK[stufe % PENTATONIK.length] + oktave * 12;
  ton({
    frequenz: halbtonZuFrequenz(halbton, 330),
    dauer: 0.09,
    form: 'triangle',
    lautstaerke: 0.32,
  });
}

/** Kritischer Treffer: heller Glanz obendrauf. */
export function krit() {
  if (!bereit()) return;
  ton({ frequenz: 1320, dauer: 0.22, form: 'sine', lautstaerke: 0.4 });
  ton({ frequenz: 1980, dauer: 0.3, form: 'sine', lautstaerke: 0.22, verzoegerung: 0.05 });
  rauschen({ dauer: 0.2, lautstaerke: 0.1, hochpass: 3000 });
}

/** Kauf: zwei Töne aufwärts, klingt nach „erledigt“. */
export function kauf() {
  if (!bereit()) return;
  ton({ frequenz: halbtonZuFrequenz(0, 440), dauer: 0.1, form: 'triangle', lautstaerke: 0.3 });
  ton({
    frequenz: halbtonZuFrequenz(7, 440),
    dauer: 0.18,
    form: 'triangle',
    lautstaerke: 0.26,
    verzoegerung: 0.06,
  });
}

/** Entdeckung: kleine Fanfare, vier Töne aufwärts. */
export function entdeckung() {
  if (!bereit()) return;
  [0, 4, 7, 12].forEach((halbton, i) => {
    ton({
      frequenz: halbtonZuFrequenz(halbton, 392),
      dauer: 0.45,
      form: 'sine',
      lautstaerke: 0.3,
      verzoegerung: i * 0.09,
    });
  });
  rauschen({ dauer: 0.5, lautstaerke: 0.05, hochpass: 2200 });
}

/** Erfolg: kurzer Zweiklang. */
export function erfolg() {
  if (!bereit()) return;
  ton({ frequenz: halbtonZuFrequenz(4, 523), dauer: 0.16, form: 'sine', lautstaerke: 0.25 });
  ton({
    frequenz: halbtonZuFrequenz(11, 523),
    dauer: 0.24,
    form: 'sine',
    lautstaerke: 0.2,
    verzoegerung: 0.08,
  });
}

/** Auftauchen: tiefes Schweben nach oben – der Moment gehört gefeiert. */
export function aufstieg() {
  if (!bereit()) return;
  ton({ frequenz: 110, dauer: 1.6, form: 'sine', lautstaerke: 0.4, gleiten: 4 });
  [0, 7, 12, 16, 19].forEach((halbton, i) => {
    ton({
      frequenz: halbtonZuFrequenz(halbton, 261),
      dauer: 0.9,
      form: 'triangle',
      lautstaerke: 0.22,
      verzoegerung: 0.12 + i * 0.11,
    });
  });
}

/** Kombo bricht ab – leises Absacken, damit man den Verlust spürt. */
export function komboEnde(hoehe) {
  if (!bereit() || hoehe < 8) return;
  ton({ frequenz: 330, dauer: 0.25, form: 'sine', lautstaerke: 0.16, gleiten: 0.5 });
}

/**
 * Leuchtblase erscheint – bewusst leise und hoch, fast am Rand des Hörbaren.
 * Wer nebenbei Ton an hat, bekommt einen Hinweis, ohne dass es aufdringlich
 * wirkt oder mitten in einer Unterhaltung auffällt.
 */
export function blaseErscheint() {
  if (!bereit()) return;
  ton({ frequenz: 1760, dauer: 0.5, form: 'sine', lautstaerke: 0.11, gleiten: 1.15 });
}

/** Leuchtblase eingesammelt – der eigentliche Belohnungsmoment. */
export function blaseEingesammelt() {
  if (!bereit()) return;
  [0, 4, 7, 12, 16].forEach((halbton, i) => {
    ton({
      frequenz: halbtonZuFrequenz(halbton, 523),
      dauer: 0.35,
      form: 'sine',
      lautstaerke: 0.28,
      verzoegerung: i * 0.045,
    });
  });
  rauschen({ dauer: 0.3, lautstaerke: 0.08, hochpass: 3500 });
}

/**
 * Glücksfisch schwimmt vorbei – ein kurzes, wässriges Blubbern statt eines
 * Tons, damit man ihn vom Erscheinen der Leuchtblase unterscheiden kann,
 * ohne hinzusehen.
 */
export function fischErscheint() {
  if (!bereit()) return;
  ton({ frequenz: 260, dauer: 0.18, form: 'triangle', lautstaerke: 0.14, gleiten: 1.8 });
  rauschen({ dauer: 0.12, lautstaerke: 0.05, hochpass: 800 });
}

/** Glücksfisch gefangen – ein zufriedenes, kurzes „Zwick“. */
export function fischGefangen() {
  if (!bereit()) return;
  ton({ frequenz: 700, dauer: 0.14, form: 'square', lautstaerke: 0.18, gleiten: 2.2 });
  ton({ frequenz: halbtonZuFrequenz(7, 440), dauer: 0.3, form: 'sine', lautstaerke: 0.26, verzoegerung: 0.05 });
}

/**
 * Kiste öffnen: kurzer Spannungsaufbau, dessen Glanz mit der Seltenheit des
 * Inhalts wächst – bei „legendär“ deutlich reicher als bei „gewöhnlich“,
 * damit sich der Unterschied auch mit geschlossenen Augen anfühlt.
 */
export function kisteOeffnen(seltenheit = 'gewoehnlich') {
  if (!bereit()) return;
  const stufe = { gewoehnlich: 1, selten: 2, episch: 3, legendaer: 4 }[seltenheit] ?? 1;

  ton({ frequenz: 220, dauer: 0.16, form: 'triangle', lautstaerke: 0.22, gleiten: 1.6 });

  const toene = 3 + stufe;
  const schrittweite = stufe >= 3 ? 3 : 2;
  for (let i = 0; i < toene; i++) {
    ton({
      frequenz: halbtonZuFrequenz(i * schrittweite, 440),
      dauer: 0.32,
      form: 'sine',
      lautstaerke: 0.2 + stufe * 0.02,
      verzoegerung: 0.12 + i * 0.05,
    });
  }
  if (stufe >= 3) rauschen({ dauer: 0.4, lautstaerke: 0.08, hochpass: 4000 });
}

/**
 * Lauter, kurzer „Klack“ – der Deckel-Moment genau beim Aufspringen der
 * Kiste. Getrennt von kisteOeffnen(), weil dieser Klick exakt mit der
 * zweiphasigen Öffnen-Animation in ui.js synchronisiert wird (dort startet
 * die Aufdeck-Phase per JS-Timer), während die Melodie schon beim Öffnen
 * des Dialogs lostönt.
 */
export function kisteKlack() {
  if (!bereit()) return;
  ton({ frequenz: 130, dauer: 0.1, form: 'square', lautstaerke: 0.45, anstieg: 0.001, gleiten: 0.35 });
  rauschen({ dauer: 0.08, lautstaerke: 0.24, hochpass: 1600 });
}

/** Expedition zurück: ruhiges, warmes „willkommen zurück“-Motiv – kein Fanfare-Überschwang wie beim Level-up. */
export function expeditionZurueck() {
  if (!bereit()) return;
  [0, 5, 9, 12].forEach((halbton, i) => {
    ton({
      frequenz: halbtonZuFrequenz(halbton, 330),
      dauer: 0.4,
      form: 'triangle',
      lautstaerke: 0.24,
      verzoegerung: i * 0.1,
    });
  });
}

/** Leiser Wechsel-Klick beim Reiterwechsel – dezente Rückmeldung, kein Ereignis. */
export function reiterWechsel() {
  if (!bereit()) return;
  ton({ frequenz: 880, dauer: 0.05, form: 'sine', lautstaerke: 0.1 });
}

/** Menü öffnen/schließen – ebenso dezent, unterscheidet sich nur in der Tonhöhe. */
export function menue(oeffnen = true) {
  if (!bereit()) return;
  ton({ frequenz: oeffnen ? 660 : 520, dauer: 0.05, form: 'sine', lautstaerke: 0.1 });
}

/** Einzelnes, weiches Ticken – das Glücksrad, das gerade an einem Feld vorbeiläuft. */
export function gluecksradTick() {
  if (!bereit()) return;
  ton({ frequenz: 1500, dauer: 0.03, form: 'square', lautstaerke: 0.09, anstieg: 0.001 });
}

/**
 * Der Marianengraben-Moment: tief, langsam, ehrfürchtig – bewusst kein Jubel
 * wie bei aufstieg(), sondern eher ein andächtiges „geschafft“. Der tiefste
 * Klang im ganzen Spiel, passend zum tiefsten Punkt der Karte.
 */
export function marianengraben() {
  if (!bereit()) return;
  ton({ frequenz: 55, dauer: 3.2, form: 'sine', lautstaerke: 0.32, gleiten: 1.4 });
  [0, 7, 12, 19, 24].forEach((halbton, i) => {
    ton({
      frequenz: halbtonZuFrequenz(halbton, 130),
      dauer: 2.4,
      form: 'triangle',
      lautstaerke: 0.16,
      verzoegerung: 0.3 + i * 0.35,
    });
  });
  rauschen({ dauer: 2, lautstaerke: 0.04, hochpass: 200 });
}

/** Normaler Levelaufstieg – kurz und freundlich, darf beim Grinden nicht nerven. */
export function levelAuf() {
  if (!bereit()) return;
  [0, 4, 7].forEach((halbton, i) => {
    ton({
      frequenz: halbtonZuFrequenz(halbton, 494),
      dauer: 0.22,
      form: 'triangle',
      lautstaerke: 0.22,
      verzoegerung: i * 0.05,
    });
  });
}

/** Level-Meilenstein mit Ausrüstung – deutlich festlicher als der normale Levelaufstieg. */
export function levelMeilenstein() {
  if (!bereit()) return;
  ton({ frequenz: 260, dauer: 0.18, form: 'triangle', lautstaerke: 0.24, gleiten: 1.5 });
  [0, 4, 7, 12, 16].forEach((halbton, i) => {
    ton({
      frequenz: halbtonZuFrequenz(halbton, 494),
      dauer: 0.4,
      form: 'sine',
      lautstaerke: 0.26,
      verzoegerung: 0.1 + i * 0.06,
    });
  });
  rauschen({ dauer: 0.35, lautstaerke: 0.07, hochpass: 3500 });
}
