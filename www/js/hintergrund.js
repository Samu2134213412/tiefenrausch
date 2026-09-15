/**
 * Bewegter Tiefsee-Hintergrund auf einer Zeichenfläche.
 *
 * Aufgabe: dem Zahlenspiel ein Gefühl von Ort und Fortschritt geben.
 * Je tiefer man kommt, desto dunkler das Wasser, desto weniger Lichtstrahlen,
 * desto mehr Meeresschnee – und gelegentlich zieht ein Schatten vorbei.
 *
 * Zwei weitere Ebenen machen die Station lebendig und den Fortschritt sichtbar:
 *   - Deko-Fische: schwimmen von Anfang an einfach so mit, reine Atmosphäre.
 *   - Bewohner: für jedes gekaufte Modul schwimmt (gedeckelt) ein Exemplar mit
 *     seinem eigenen Symbol im Wasser. Wer eine Sammeldrohne kauft, sieht sie
 *     danach tatsächlich schweben – nicht nur als Zahl in einer Liste.
 *
 * Rücksicht auf Akku und langsame Geräte:
 *   - Die Schleife pausiert, sobald das Fenster in den Hintergrund geht.
 *   - Teilchenzahl richtet sich nach der Bildschirmfläche.
 *   - Bei „Bewegung reduzieren“ halten die rein dekorativen Ebenen (Schnee,
 *     Blasen, Schatten, Deko-Fische) an; die Bewohner bleiben sichtbar (sie
 *     tragen Information – was man besitzt), bewegen sich aber nicht mehr.
 */
import { zoneFuer, MODULE } from './daten.js';
import { zeichneKreatur, kennstKreatur } from './kreaturen.js';

const WENIGER_BEWEGUNG =
  globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;

/** Höchstens so viele schwimmende Exemplare je Modultyp – sonst wird es bei
 *  hohem Besitz unübersichtlich statt lebendig. */
const MAX_PRO_MODUL = 4;
const AMBIENT_FISCH_ANZAHL = 5;

export function starteHintergrund(leinwand, holeTiefe, holeModule = () => ({})) {
  const stift = leinwand.getContext('2d', { alpha: false });
  let breite = 0;
  let hoehe = 0;
  let dpr = 1;

  let schnee = [];
  let blasen = [];
  let schatten = null;
  let ambientFische = [];
  let bewohner = [];
  let letzteModulSignatur = '';
  let laufend = true;
  let letzterZeitpunkt = performance.now();
  let scrollversatz = 0;

  function groesseAnpassen() {
    dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
    breite = leinwand.clientWidth;
    hoehe = leinwand.clientHeight;
    leinwand.width = Math.floor(breite * dpr);
    leinwand.height = Math.floor(hoehe * dpr);
    stift.setTransform(dpr, 0, 0, dpr, 0, 0);
    erzeugeTeilchen();
  }

  function erzeugeTeilchen() {
    const flaeche = breite * hoehe;
    const anzahlSchnee = Math.min(90, Math.max(24, Math.round(flaeche / 5200)));
    schnee = Array.from({ length: anzahlSchnee }, () => neuerSchnee(true));
    blasen = [];
    ambientFische = Array.from({ length: AMBIENT_FISCH_ANZAHL }, () => neuerAmbientFisch(true));
    // Bewohner bewusst NICHT neu erzeugen: Beim Drehen des Handys sollen die
    // eigenen Module nicht plötzlich verschwinden oder neu einsetzen.
  }

  function neuerSchnee(zufaelligeHoehe = false) {
    return {
      x: Math.random() * breite,
      y: zufaelligeHoehe ? Math.random() * hoehe : -6,
      r: 0.6 + Math.random() * 1.8,
      tempo: 6 + Math.random() * 16,
      drift: (Math.random() - 0.5) * 8,
      deckkraft: 0.15 + Math.random() * 0.4,
    };
  }

  function neueBlase() {
    return {
      x: Math.random() * breite,
      y: hoehe + 10,
      r: 1.5 + Math.random() * 3.5,
      tempo: 18 + Math.random() * 30,
      wackeln: Math.random() * Math.PI * 2,
    };
  }

  /** Gelegentlich zieht eine große Silhouette durchs Bild – unabhängig vom Besitz. */
  function neuerSchatten(tiefe) {
    const vonLinks = Math.random() < 0.5;
    const groesse = 40 + Math.random() * Math.min(120, 40 + tiefe / 40);
    return {
      x: vonLinks ? -groesse : breite + groesse,
      y: hoehe * (0.2 + Math.random() * 0.6),
      groesse,
      tempo: (vonLinks ? 1 : -1) * (8 + Math.random() * 14),
      wellen: Math.random() * Math.PI * 2,
    };
  }

  /** Kleiner, blasser Deko-Fisch – reine Atmosphäre, trägt keine Information. */
  function neuerAmbientFisch(zufaelligeX = false) {
    const richtung = Math.random() < 0.5 ? 1 : -1;
    const groesse = 11 + Math.random() * 9;
    return {
      x: zufaelligeX ? Math.random() * breite : richtung > 0 ? -groesse : breite + groesse,
      y: hoehe * (0.08 + Math.random() * 0.78),
      richtung,
      tempo: 9 + Math.random() * 17,
      wellen: Math.random() * Math.PI * 2,
      groesse,
      deckkraft: 0.16 + Math.random() * 0.2,
    };
  }

  /** Ein schwimmendes Exemplar eines gekauften Moduls. */
  function neuerBewohner(modul) {
    const richtung = Math.random() < 0.5 ? 1 : -1;
    return {
      modulId: modul.id,
      symbol: modul.symbol,
      farbe: modul.farbe ?? '#8fd6ff',
      samen: Math.random(),
      x: Math.random() * breite,
      y: hoehe * (0.14 + Math.random() * 0.68),
      richtung,
      tempo: 7 + Math.random() * 12,
      wellen: Math.random() * Math.PI * 2,
      wellenTempo: 0.5 + Math.random() * 0.5,
      groesse: 25 + Math.random() * 8,
      geboren: performance.now(),
    };
  }

  /**
   * Gleicht die Bewohner mit dem tatsächlichen Modulbesitz ab – gedeckelt auf
   * MAX_PRO_MODUL je Typ. Bereits schwimmende Exemplare werden wiederverwendet
   * (Position bleibt erhalten), damit ein Kauf nicht alle vorhandenen Tiere
   * dieses Typs neu einsetzt. Läuft günstig genug, um jeden Frame aufgerufen
   * zu werden – die teure Neuaufteilung passiert nur bei echter Änderung.
   */
  function syncBewohner(module) {
    const signatur = MODULE.map((m) => Math.min(module?.[m.id] ?? 0, MAX_PRO_MODUL)).join(',');
    if (signatur === letzteModulSignatur) return;
    letzteModulSignatur = signatur;

    const neu = [];
    for (const modul of MODULE) {
      const sichtbar = Math.min(module?.[modul.id] ?? 0, MAX_PRO_MODUL);
      const vorhandene = bewohner.filter((b) => b.modulId === modul.id);
      for (let i = 0; i < sichtbar; i++) {
        neu.push(vorhandene[i] ?? neuerBewohner(modul));
      }
    }
    bewohner = neu;
  }

  function farbeMischen(a, b, anteil) {
    const zerlegen = (hex) => [
      parseInt(hex.slice(1, 3), 16),
      parseInt(hex.slice(3, 5), 16),
      parseInt(hex.slice(5, 7), 16),
    ];
    const [r1, g1, b1] = zerlegen(a);
    const [r2, g2, b2] = zerlegen(b);
    const t = Math.max(0, Math.min(1, anteil));
    return `rgb(${Math.round(r1 + (r2 - r1) * t)}, ${Math.round(g1 + (g2 - g1) * t)}, ${Math.round(
      b1 + (b2 - b1) * t
    )})`;
  }

  function zeichneWasser(tiefe) {
    const zone = zoneFuer(tiefe);
    // Innerhalb der Zone weiter abdunkeln, damit auch kleine Fortschritte
    // sichtbar sind und nicht nur die Zonenwechsel.
    const naechste = zone.ab === 0 ? 200 : zone.ab * 2.5;
    const anteilInZone = Math.max(0, Math.min(1, (tiefe - zone.ab) / (naechste - zone.ab || 1)));

    const oben = farbeMischen(zone.farbeOben, zone.farbeUnten, anteilInZone * 0.6);
    const unten = farbeMischen(zone.farbeUnten, '#01060d', anteilInZone * 0.5);

    const verlauf = stift.createLinearGradient(0, 0, 0, hoehe);
    verlauf.addColorStop(0, oben);
    verlauf.addColorStop(1, unten);
    stift.fillStyle = verlauf;
    stift.fillRect(0, 0, breite, hoehe);
  }

  /** Lichtstrahlen von oben – nur in geringer Tiefe sichtbar. */
  function zeichneLichtstrahlen(tiefe, zeit) {
    const staerke = Math.max(0, 1 - tiefe / 320);
    if (staerke <= 0.01) return;

    stift.save();
    stift.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) {
      const versatz = Math.sin(zeit / 4000 + i * 1.7) * 30;
      const x = (breite / 5) * (i + 1) + versatz;
      const verlauf = stift.createLinearGradient(x, 0, x - 40, hoehe);
      verlauf.addColorStop(0, `rgba(190, 245, 255, ${0.13 * staerke})`);
      verlauf.addColorStop(1, 'rgba(190, 245, 255, 0)');
      stift.fillStyle = verlauf;
      stift.beginPath();
      stift.moveTo(x - 22, 0);
      stift.lineTo(x + 22, 0);
      stift.lineTo(x - 30, hoehe);
      stift.lineTo(x - 90, hoehe);
      stift.closePath();
      stift.fill();
    }
    stift.restore();
  }

  function zeichneSchatten(s) {
    if (!s) return;
    stift.save();
    stift.globalAlpha = 0.22;
    stift.fillStyle = '#000';
    stift.beginPath();
    // Grobe Fischform: Ellipse plus Schwanzflosse.
    stift.ellipse(s.x, s.y, s.groesse, s.groesse * 0.32, 0, 0, Math.PI * 2);
    stift.fill();
    const richtung = Math.sign(s.tempo) || 1;
    stift.beginPath();
    stift.moveTo(s.x - richtung * s.groesse, s.y);
    stift.lineTo(s.x - richtung * s.groesse * 1.45, s.y - s.groesse * 0.28);
    stift.lineTo(s.x - richtung * s.groesse * 1.45, s.y + s.groesse * 0.28);
    stift.closePath();
    stift.fill();
    stift.restore();
  }

  /**
   * Zeichnet einen simplen, selbst gezeichneten Silhouetten-Fisch (Körper,
   * Schwanzflosse, Auge) statt eines Emoji-Zeichens – blickrichtungsgerecht
   * gespiegelt bei Bewegung nach links.
   */
  function zeichneVektorFisch(x, y, groesse, richtung, deckkraft, farbe = '#bfe8ff') {
    stift.save();
    stift.globalAlpha = deckkraft;
    stift.translate(x, y);
    if (richtung < 0) stift.scale(-1, 1);
    stift.fillStyle = farbe;
    stift.beginPath();
    stift.ellipse(0, 0, groesse * 0.5, groesse * 0.3, 0, 0, Math.PI * 2);
    stift.moveTo(-groesse * 0.42, 0);
    stift.lineTo(-groesse * 0.75, -groesse * 0.22);
    stift.lineTo(-groesse * 0.75, groesse * 0.22);
    stift.closePath();
    stift.fill();
    stift.fillStyle = 'rgba(4, 16, 31, 0.55)';
    stift.beginPath();
    stift.arc(groesse * 0.22, -groesse * 0.05, groesse * 0.06, 0, Math.PI * 2);
    stift.fill();
    stift.restore();
  }

  /** Zeichnet einen Bewohner: eigene Kreaturform, falls vorhanden, sonst ein einfacher Silhouetten-Fisch. */
  function zeichneBewohnerform(b, x, y, deckkraft, zeit) {
    if (!kennstKreatur(b.modulId)) {
      zeichneVektorFisch(x, y, b.groesse, b.richtung, deckkraft, b.farbe);
      return;
    }
    stift.save();
    stift.globalAlpha = deckkraft;
    stift.translate(x, y);
    if (b.richtung < 0) stift.scale(-1, 1);
    zeichneKreatur(stift, b.modulId, {
      groesse: b.groesse * 1.7,
      zeit,
      samen: b.samen,
      farbe: b.farbe,
    });
    stift.restore();
  }

  function zeichneAmbientFische(abstand) {
    for (const f of ambientFische) {
      f.x += f.richtung * f.tempo * abstand;
      f.wellen += abstand * 2.2;
      if (f.richtung > 0 && f.x - f.groesse > breite) Object.assign(f, neuerAmbientFisch());
      else if (f.richtung < 0 && f.x + f.groesse < 0) Object.assign(f, neuerAmbientFisch());
      const y = f.y + Math.sin(f.wellen) * 4;
      zeichneVektorFisch(f.x, y, f.groesse, f.richtung, f.deckkraft);
    }
  }

  /** Bewohner werden auch bei „Bewegung reduzieren“ gezeichnet – sie zeigen
   *  Besitz, nicht nur Bewegung. Nur ihre Animation wird dann abgeschaltet. */
  function zeichneBewohner(abstand, zeit) {
    const rand = 24;
    for (const b of bewohner) {
      if (!WENIGER_BEWEGUNG) {
        b.x += b.richtung * b.tempo * abstand;
        b.wellen += abstand * b.wellenTempo;
        if (b.x < rand && b.richtung < 0) b.richtung = 1;
        if (b.x > breite - rand && b.richtung > 0) b.richtung = -1;
      }
      const y = WENIGER_BEWEGUNG ? b.y : b.y + Math.sin(b.wellen) * 9;
      const alterMs = performance.now() - b.geboren;
      const deckkraft = Math.min(1, alterMs / 450) * 0.95;
      zeichneBewohnerform(b, b.x, y, deckkraft, zeit);
    }
  }

  function zeichnen(zeit) {
    if (!laufend) return;
    const abstand = Math.min(0.05, (zeit - letzterZeitpunkt) / 1000);
    letzterZeitpunkt = zeit;
    const tiefe = holeTiefe();

    zeichneWasser(tiefe);
    zeichneLichtstrahlen(tiefe, zeit);

    syncBewohner(holeModule());
    zeichneBewohner(abstand, zeit);

    if (!WENIGER_BEWEGUNG) {
      scrollversatz += abstand * 10;

      zeichneAmbientFische(abstand);

      // Meeresschnee
      stift.fillStyle = '#dff3ff';
      for (const t of schnee) {
        t.y += t.tempo * abstand;
        t.x += Math.sin((zeit / 1800) + t.y / 60) * t.drift * abstand;
        if (t.y > hoehe + 8) Object.assign(t, neuerSchnee());
        stift.globalAlpha = t.deckkraft;
        stift.beginPath();
        stift.arc(t.x, t.y, t.r, 0, Math.PI * 2);
        stift.fill();
      }
      stift.globalAlpha = 1;

      // Aufsteigende Blasen
      if (blasen.length < 8 && Math.random() < 0.02) blasen.push(neueBlase());
      stift.strokeStyle = 'rgba(210, 245, 255, 0.35)';
      stift.lineWidth = 1;
      for (let i = blasen.length - 1; i >= 0; i--) {
        const b = blasen[i];
        b.y -= b.tempo * abstand;
        b.wackeln += abstand * 3;
        const x = b.x + Math.sin(b.wackeln) * 6;
        if (b.y < -10) {
          blasen.splice(i, 1);
          continue;
        }
        stift.beginPath();
        stift.arc(x, b.y, b.r, 0, Math.PI * 2);
        stift.stroke();
      }

      // Große, seltene Silhouette
      if (!schatten && tiefe > 30 && Math.random() < 0.004) schatten = neuerSchatten(tiefe);
      if (schatten) {
        schatten.x += schatten.tempo * abstand;
        schatten.wellen += abstand * 1.4;
        schatten.y += Math.sin(schatten.wellen) * 6 * abstand;
        zeichneSchatten(schatten);
        const raus = schatten.tempo > 0 ? schatten.x - schatten.groesse * 2 > breite : schatten.x + schatten.groesse * 2 < 0;
        if (raus) schatten = null;
      }
    }

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

  return { pausieren, fortsetzen, groesseAnpassen };
}
