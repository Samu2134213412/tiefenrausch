/**
 * Funken – ein eigenes, leichtgewichtiges Partikelsystem auf einer Canvas.
 *
 * Läuft auf einer zweiten, transparenten Ebene über dem Hintergrund. Getrennt
 * von hintergrund.js, weil die beiden unterschiedlich oft neu gezeichnet werden
 * müssen: Der Hintergrund ist ruhig, die Funken sind hektisch und kurzlebig.
 *
 * Alles hier ist reine Deko – ein Fehler oder eine Verzögerung in diesem
 * Modul darf niemals den Spielstand oder die Bedienbarkeit beeinträchtigen.
 * Deshalb: keine Zustandsänderung, nur Zeichnen.
 */

const WENIGER_BEWEGUNG =
  globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;

/** Obergrenze gleichzeitiger Partikel – ein Idle-Spiel läuft oft auf älteren Handys. */
const MAX_PARTIKEL = 260;

const FARBEN_NORMAL = ['#4fe3d0', '#7ff5e4', '#9be8ff'];
const FARBEN_KRITISCH = ['#ffd9a0', '#ffb347', '#fff2c9'];
const FARBEN_PERLE = ['#e8c4ff', '#ffd9a0', '#c4e8ff'];

export function starteFunken(leinwand) {
  const stift = leinwand.getContext('2d', { alpha: true });
  let breite = 0;
  let hoehe = 0;
  let dpr = 1;
  let laufend = true;
  let letzterZeitpunkt = performance.now();

  /** @type {Array<object>} */
  let teilchen = [];
  /** @type {Array<{x:number,y:number,radius:number,alpha:number,wachstum:number,farbe:string}>} */
  let ringe = [];

  function groesseAnpassen() {
    dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
    breite = leinwand.clientWidth;
    hoehe = leinwand.clientHeight;
    leinwand.width = Math.floor(breite * dpr);
    leinwand.height = Math.floor(hoehe * dpr);
    stift.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function hinzufuegen(liste, max) {
    const ueberschuss = teilchen.length + liste.length - MAX_PARTIKEL;
    if (ueberschuss > 0) teilchen.splice(0, ueberschuss);
    teilchen.push(...liste);
  }

  /**
   * Aufrufer übergeben Koordinaten aus Zeigerereignissen (clientX/clientY,
   * also Viewport-relativ). Die Leinwand zeichnet aber in ihrem eigenen
   * lokalen Koordinatensystem (0,0 = eigene obere linke Ecke). Ohne diese
   * Umrechnung würden alle Funken um genau den Versatz der Leinwand zur
   * Fensterkante verschoben erscheinen – hier typischerweise um die Höhe
   * der Kopfzeile nach unten.
   */
  function viewportZuLeinwand(x, y) {
    const rahmen = leinwand.getBoundingClientRect();
    return { x: x - rahmen.left, y: y - rahmen.top };
  }

  /**
   * Funkenstoß an einer Stelle – die Standardreaktion auf jedes Antippen.
   * @param {number} x Viewport-Koordinate (z. B. ereignis.clientX)
   * @param {number} y Viewport-Koordinate (z. B. ereignis.clientY)
   * @param {object} [optionen]
   */
  function stoss(x, y, optionen = {}) {
    if (WENIGER_BEWEGUNG) return;
    ({ x, y } = viewportZuLeinwand(x, y));
    const {
      anzahl = 10,
      geschwindigkeit = 1,
      groesse = 1,
      farben = FARBEN_NORMAL,
      streuung = Math.PI * 2,
      richtung = -Math.PI / 2,
    } = optionen;

    const neu = [];
    for (let i = 0; i < anzahl; i++) {
      const winkel = richtung + (Math.random() - 0.5) * streuung;
      const tempo = (60 + Math.random() * 110) * geschwindigkeit;
      neu.push({
        x,
        y,
        vx: Math.cos(winkel) * tempo,
        vy: Math.sin(winkel) * tempo,
        schwerkraft: 220,
        radius: (1.4 + Math.random() * 2.2) * groesse,
        lebenGesamt: 0.5 + Math.random() * 0.45,
        lebenRest: 0.5 + Math.random() * 0.45,
        farbe: farben[(Math.random() * farben.length) | 0],
        drehreibung: 0.94,
      });
    }
    hinzufuegen(neu, MAX_PARTIKEL);
  }

  /** Kritischer Treffer: größerer, hellerer Ausbruch plus Schockring. */
  function kritischerStoss(x, y) {
    if (WENIGER_BEWEGUNG) return;
    stoss(x, y, { anzahl: 26, geschwindigkeit: 1.6, groesse: 1.6, farben: FARBEN_KRITISCH });
    ring(x, y, '#ffd9a0');
  }

  /** Erweiternder, verblassender Ring – für kritische Treffer und Käufe. */
  function ring(x, y, farbe = '#4fe3d0') {
    if (WENIGER_BEWEGUNG) return;
    ({ x, y } = viewportZuLeinwand(x, y));
    ringe.push({ x, y, radius: 6, alpha: 0.55, wachstum: 260, farbe });
    if (ringe.length > 12) ringe.shift();
  }

  /** Aufsteigende Blasenkette – für Käufe. */
  function kaufFunken(x, y) {
    if (WENIGER_BEWEGUNG) return;
    stoss(x, y, {
      anzahl: 8,
      geschwindigkeit: 0.6,
      groesse: 1.2,
      richtung: -Math.PI / 2,
      streuung: Math.PI / 2.2,
    });
  }

  /** Regen aus Perlen-Partikeln, quer über den Bildschirm – für den Aufstieg. */
  function perlenRegen() {
    if (WENIGER_BEWEGUNG) return;
    const neu = [];
    for (let i = 0; i < 70; i++) {
      neu.push({
        x: Math.random() * breite,
        y: -10 - Math.random() * hoehe * 0.5,
        vx: (Math.random() - 0.5) * 30,
        vy: 90 + Math.random() * 70,
        schwerkraft: 40,
        radius: 2.5 + Math.random() * 3,
        lebenGesamt: 2.2 + Math.random() * 1.2,
        lebenRest: 2.2 + Math.random() * 1.2,
        farbe: FARBEN_PERLE[(Math.random() * FARBEN_PERLE.length) | 0],
        drehreibung: 1,
        glanz: true,
      });
    }
    hinzufuegen(neu, MAX_PARTIKEL);
  }

  function zeichnen(zeit) {
    if (!laufend) return;
    const abstand = Math.min(0.05, (zeit - letzterZeitpunkt) / 1000);
    letzterZeitpunkt = zeit;

    stift.clearRect(0, 0, breite, hoehe);

    // Ringe
    for (let i = ringe.length - 1; i >= 0; i--) {
      const r = ringe[i];
      r.radius += r.wachstum * abstand;
      r.alpha -= abstand * 1.6;
      if (r.alpha <= 0) {
        ringe.splice(i, 1);
        continue;
      }
      stift.beginPath();
      stift.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      stift.strokeStyle = r.farbe;
      stift.globalAlpha = Math.max(0, r.alpha);
      stift.lineWidth = 2;
      stift.stroke();
    }
    stift.globalAlpha = 1;

    // Teilchen
    for (let i = teilchen.length - 1; i >= 0; i--) {
      const t = teilchen[i];
      t.lebenRest -= abstand;
      if (t.lebenRest <= 0) {
        teilchen.splice(i, 1);
        continue;
      }
      t.vy += t.schwerkraft * abstand;
      t.vx *= t.drehreibung;
      t.x += t.vx * abstand;
      t.y += t.vy * abstand;

      const lebensanteil = t.lebenRest / t.lebenGesamt;
      stift.globalAlpha = Math.max(0, Math.min(1, lebensanteil));
      stift.beginPath();
      stift.arc(t.x, t.y, t.radius * (0.5 + lebensanteil * 0.5), 0, Math.PI * 2);
      stift.fillStyle = t.farbe;
      if (t.glanz) stift.shadowColor = t.farbe, (stift.shadowBlur = 8);
      stift.fill();
      if (t.glanz) stift.shadowBlur = 0;
    }
    stift.globalAlpha = 1;

    requestAnimationFrame(zeichnen);
  }

  function pausieren() {
    laufend = false;
  }
  function fortsetzen() {
    if (laufend) return;
    laufend = true;
    letzterZeitpunkt = performance.now();
    requestAnimationFrame(zeichnen);
  }

  const beobachter = new ResizeObserver(groesseAnpassen);
  beobachter.observe(leinwand);
  groesseAnpassen();

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pausieren();
    else fortsetzen();
  });

  requestAnimationFrame(zeichnen);

  return { stoss, kritischerStoss, ring, kaufFunken, perlenRegen, pausieren, fortsetzen };
}
