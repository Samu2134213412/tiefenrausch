/**
 * Handgezeichnete Bewohner für die Tauchstation.
 *
 * Vorher wurden gekaufte Module als Emoji dargestellt – das sieht je nach
 * Betriebssystem unterschiedlich aus und wirkt flach. Hier bekommt jedes
 * Modul stattdessen eine eigene, aus Pfaden und Verläufen gezeichnete Form,
 * passend zum bioluminesziernden Grundton des Spiels.
 *
 * Aufrufkonvention: Die aufrufende Stelle hat den Kontext bereits mit
 * translate() auf die Position der Kreatur verschoben und bei Bewegung nach
 * links mit scale(-1,1) gespiegelt. Alle Koordinaten hier sind relativ zu
 * (0,0) = Mittelpunkt der Kreatur. `groesse` ist der Referenzmaßstab
 * (ungefähr die sichtbare Höhe in Pixeln).
 */

function radialGlanz(stift, radius, kern, rand, versatzY = 0) {
  const g = stift.createRadialGradient(0, versatzY, radius * 0.05, 0, versatzY, radius);
  g.addColorStop(0, kern);
  g.addColorStop(1, rand);
  return g;
}

function mitGluehen(stift, farbe, staerke, zeichnenFn) {
  stift.save();
  stift.shadowColor = farbe;
  stift.shadowBlur = staerke;
  zeichnenFn();
  stift.restore();
}

/* ---------------- 🪼 Leuchtqualle ---------------- */
function zeichneQualle(stift, { groesse, zeit, samen, farbe }) {
  const r = groesse * 0.42;

  mitGluehen(stift, farbe, 9, () => {
    stift.fillStyle = radialGlanz(stift, r * 1.3, '#ffffff', farbe, -r * 0.15);
    stift.beginPath();
    stift.arc(0, -r * 0.1, r, Math.PI, 0);
    stift.quadraticCurveTo(r * 0.8, r * 0.35, 0, r * 0.3);
    stift.quadraticCurveTo(-r * 0.8, r * 0.35, -r, -r * 0.1);
    stift.closePath();
    stift.fill();
  });

  stift.strokeStyle = farbe + 'aa';
  stift.lineWidth = Math.max(1, groesse * 0.045);
  stift.lineCap = 'round';
  const anzahl = 5;
  for (let i = 0; i < anzahl; i++) {
    const tx = -r * 0.65 + (i / (anzahl - 1)) * r * 1.3;
    const laenge = r * (0.85 + 0.3 * Math.sin(samen * 7 + i * 1.3));
    const wackel = Math.sin(zeit / 260 + i * 1.1 + samen * 6) * r * 0.3;
    stift.beginPath();
    stift.moveTo(tx, r * 0.28);
    stift.quadraticCurveTo(tx + wackel, r * 0.28 + laenge * 0.55, tx + wackel * 1.4, r * 0.28 + laenge);
    stift.stroke();
  }
}

/* ---------------- 🛸 Sammeldrohne ---------------- */
function zeichneDrohne(stift, { groesse, zeit, farbe }) {
  const b = groesse * 0.46;
  const puls = 0.6 + 0.4 * Math.sin(zeit / 220);

  // Schwebering
  stift.save();
  stift.globalAlpha = 0.35 + 0.2 * puls;
  stift.strokeStyle = farbe;
  stift.lineWidth = Math.max(1, groesse * 0.05);
  stift.beginPath();
  stift.ellipse(0, b * 0.55, b * 0.6, b * 0.16, 0, 0, Math.PI * 2);
  stift.stroke();
  stift.restore();

  // Rumpf: abgerundete Kapsel
  const rumpf = stift.createLinearGradient(0, -b * 0.5, 0, b * 0.2);
  rumpf.addColorStop(0, '#eef3f8');
  rumpf.addColorStop(1, '#9aa7b8');
  stift.fillStyle = rumpf;
  stift.beginPath();
  stift.ellipse(0, -b * 0.1, b * 0.62, b * 0.4, 0, 0, Math.PI * 2);
  stift.fill();

  // Leuchtauge
  mitGluehen(stift, farbe, 8, () => {
    stift.fillStyle = radialGlanz(stift, b * 0.22, '#ffffff', farbe);
    stift.beginPath();
    stift.arc(b * 0.08, -b * 0.08, b * 0.2 * puls * 0.5 + b * 0.14, 0, Math.PI * 2);
    stift.fill();
  });

  // kleine Antennen
  stift.strokeStyle = '#c3ccd6';
  stift.lineWidth = Math.max(1, groesse * 0.035);
  stift.beginPath();
  stift.moveTo(-b * 0.3, -b * 0.42);
  stift.lineTo(-b * 0.45, -b * 0.65);
  stift.moveTo(b * 0.3, -b * 0.42);
  stift.lineTo(b * 0.45, -b * 0.65);
  stift.stroke();
}

/* ---------------- 📡 Sonarboje ---------------- */
function zeichneSonarboje(stift, { groesse, zeit, samen, farbe }) {
  const r = groesse * 0.4;

  // periodischer Sonar-Ping
  const zyklus = 2200;
  const phase = ((zeit + samen * zyklus) % zyklus) / zyklus;
  if (phase < 0.8) {
    const anteil = phase / 0.8;
    stift.save();
    stift.globalAlpha = (1 - anteil) * 0.55;
    stift.strokeStyle = farbe;
    stift.lineWidth = Math.max(1.2, groesse * 0.045);
    stift.beginPath();
    stift.arc(0, r * 0.1, r * (0.8 + anteil * 2.4), 0, Math.PI * 2);
    stift.stroke();
    stift.restore();
  }

  // Ballastgewicht – macht aus der Kugel eine erkennbare Boje statt einer Murmel
  stift.fillStyle = '#4a4235';
  stift.beginPath();
  stift.moveTo(-r * 0.26, r * 0.32);
  stift.lineTo(r * 0.26, r * 0.32);
  stift.lineTo(0, r * 0.85);
  stift.closePath();
  stift.fill();

  // Untertassenförmiger Schwimmkörper mit Kontur für Lesbarkeit vor dunklem Wasser
  const koerper = stift.createLinearGradient(0, -r * 0.5, 0, r * 0.35);
  koerper.addColorStop(0, '#fffdf5');
  koerper.addColorStop(0.5, '#e7d19a');
  koerper.addColorStop(1, '#8a6a3f');
  stift.fillStyle = koerper;
  stift.beginPath();
  stift.ellipse(0, 0, r, r * 0.6, 0, 0, Math.PI * 2);
  stift.fill();
  stift.strokeStyle = 'rgba(255,255,255,0.4)';
  stift.lineWidth = Math.max(1, groesse * 0.018);
  stift.stroke();

  // Mast mit blinkendem Licht
  stift.strokeStyle = '#c9b98a';
  stift.lineWidth = Math.max(1, groesse * 0.045);
  stift.beginPath();
  stift.moveTo(0, -r * 0.55);
  stift.lineTo(0, -r * 1.35);
  stift.stroke();

  mitGluehen(stift, farbe, 10, () => {
    stift.fillStyle = farbe;
    stift.beginPath();
    stift.arc(0, -r * 1.35, r * (0.16 + 0.08 * Math.sin(zeit / 180)), 0, Math.PI * 2);
    stift.fill();
  });
}

/* ---------------- 🤖 Tauchroboter ---------------- */
function zeichneRoboter(stift, { groesse, zeit, farbe }) {
  const b = groesse * 0.46;
  const wippen = Math.sin(zeit / 500) * 0.06;

  stift.save();
  stift.rotate(wippen);

  // Rumpf mit heller Kontur, damit die Form vor dunklem Wasser klar erkennbar bleibt
  const rumpf = stift.createLinearGradient(-b * 0.5, -b * 0.5, b * 0.5, b * 0.5);
  rumpf.addColorStop(0, '#f2c9d6');
  rumpf.addColorStop(1, '#c98aa0');
  stift.fillStyle = rumpf;
  stift.beginPath();
  roundedRect(stift, -b * 0.52, -b * 0.52, b * 1.04, b, b * 0.24);
  stift.fill();
  stift.strokeStyle = 'rgba(255,255,255,0.4)';
  stift.lineWidth = Math.max(1, groesse * 0.018);
  stift.stroke();

  // Antenne
  stift.strokeStyle = '#c98aa0';
  stift.lineWidth = Math.max(1, groesse * 0.035);
  stift.beginPath();
  stift.moveTo(0, -b * 0.52);
  stift.lineTo(0, -b * 0.78);
  stift.stroke();
  mitGluehen(stift, farbe, 6, () => {
    stift.fillStyle = farbe;
    stift.beginPath();
    stift.arc(0, -b * 0.78, b * 0.08, 0, Math.PI * 2);
    stift.fill();
  });

  // Scheinwerferaugen mit Pupille – größer und klarer als vorher
  mitGluehen(stift, farbe, 8, () => {
    stift.fillStyle = radialGlanz(stift, b * 0.2, '#ffffff', farbe);
    for (const dx of [-1, 1]) {
      stift.beginPath();
      stift.arc(dx * b * 0.26, -b * 0.02, b * 0.19, 0, Math.PI * 2);
      stift.fill();
    }
  });
  stift.fillStyle = '#2c1620';
  for (const dx of [-1, 1]) {
    stift.beginPath();
    stift.arc(dx * b * 0.26, -b * 0.02, b * 0.07, 0, Math.PI * 2);
    stift.fill();
  }

  // Greifarme
  stift.strokeStyle = '#8a6070';
  stift.lineWidth = Math.max(1.4, groesse * 0.055);
  stift.lineCap = 'round';
  const armSchwung = Math.sin(zeit / 420) * 0.25;
  for (const dx of [-1, 1]) {
    stift.beginPath();
    stift.moveTo(dx * b * 0.52, b * 0.18);
    stift.lineTo(dx * (b * 0.76 + armSchwung * 6), b * 0.52);
    stift.stroke();
  }
  stift.restore();
}

function roundedRect(stift, x, y, w, h, r) {
  stift.moveTo(x + r, y);
  stift.arcTo(x + w, y, x + w, y + h, r);
  stift.arcTo(x + w, y + h, x, y + h, r);
  stift.arcTo(x, y + h, x, y, r);
  stift.arcTo(x, y, x + w, y, r);
  stift.closePath();
}

/* ---------------- 🌱 Plankton-Farm (schwebende Plattform) ---------------- */
function zeichneFarm(stift, { groesse, zeit, samen, farbe }) {
  const b = groesse * 0.55;

  // Glühender Schatten/Trägerfeld unter der Plattform
  mitGluehen(stift, farbe, 14, () => {
    stift.fillStyle = 'rgba(142,226,140,0.18)';
    stift.beginPath();
    stift.ellipse(0, b * 0.28, b * 0.62, b * 0.16, 0, 0, Math.PI * 2);
    stift.fill();
  });

  // Plattform
  const plattform = stift.createLinearGradient(0, b * 0.1, 0, b * 0.32);
  plattform.addColorStop(0, '#8a6a45');
  plattform.addColorStop(1, '#5c4630');
  stift.fillStyle = plattform;
  stift.beginPath();
  stift.ellipse(0, b * 0.22, b * 0.58, b * 0.15, 0, 0, Math.PI * 2);
  stift.fill();

  // Sprossen: kleine leuchtende Triebe, die im Takt wippen
  const anzahl = 4;
  for (let i = 0; i < anzahl; i++) {
    const sx = -b * 0.42 + (i / (anzahl - 1)) * b * 0.84;
    const hoehe = b * (0.45 + 0.15 * Math.sin(samen * 9 + i));
    const wackel = Math.sin(zeit / 380 + i * 1.4 + samen * 5) * b * 0.08;

    stift.strokeStyle = '#4f8f4f';
    stift.lineWidth = Math.max(1, groesse * 0.045);
    stift.beginPath();
    stift.moveTo(sx, b * 0.14);
    stift.quadraticCurveTo(sx + wackel, b * 0.14 - hoehe * 0.6, sx + wackel * 1.3, b * 0.14 - hoehe);
    stift.stroke();

    mitGluehen(stift, farbe, 6, () => {
      stift.fillStyle = radialGlanz(stift, b * 0.14, '#e9ffe0', farbe);
      stift.beginPath();
      stift.arc(sx + wackel * 1.3, b * 0.14 - hoehe, b * 0.11, 0, Math.PI * 2);
      stift.fill();
    });
  }
}

/* ---------------- 🌋 Thermalschlot-Reaktor ---------------- */
function zeichneSchlot(stift, { groesse, zeit, samen }) {
  const b = groesse * 0.54;

  // Unregelmäßiger Kegel statt eines glatten Dreiecks – jede Instanz sieht
  // dank `samen` leicht anders aus, wie echtes Gestein statt einer Schablone.
  const kL = 0.44 + (samen % 0.11);
  const kR = 0.44 + ((samen * 3.7) % 0.11);
  const gestein = stift.createLinearGradient(0, -b * 0.58, 0, b * 0.32);
  gestein.addColorStop(0, '#6b5852');
  gestein.addColorStop(1, '#241a18');
  stift.fillStyle = gestein;
  stift.beginPath();
  stift.moveTo(-b * kL, b * 0.32);
  stift.lineTo(-b * 0.24, -b * 0.18);
  stift.lineTo(-b * 0.14, -b * 0.6);
  stift.lineTo(b * 0.1, -b * 0.52);
  stift.lineTo(b * 0.22, -b * 0.14);
  stift.lineTo(b * kR, b * 0.32);
  stift.closePath();
  stift.fill();
  stift.strokeStyle = 'rgba(0,0,0,0.3)';
  stift.lineWidth = Math.max(1, groesse * 0.015);
  stift.beginPath();
  stift.moveTo(-b * 0.24, -b * 0.18);
  stift.lineTo(-b * 0.08, b * 0.3);
  stift.stroke();

  // Metallener Reaktorkragen um die Öffnung – macht aus dem Naturfelsen ein
  // gebautes Gerät, wie es der Name "-Reaktor" verspricht.
  stift.strokeStyle = '#9aa7b6';
  stift.lineWidth = Math.max(1.6, groesse * 0.045);
  stift.beginPath();
  stift.ellipse(-b * 0.02, -b * 0.44, b * 0.22, b * 0.075, 0, 0, Math.PI * 2);
  stift.stroke();
  stift.fillStyle = 'rgba(150,165,185,0.22)';
  stift.fill();
  stift.fillStyle = '#c7d0da';
  for (const winkel of [0.3, 2.1, 3.8, 5.2]) {
    stift.beginPath();
    stift.arc(-b * 0.02 + Math.cos(winkel) * b * 0.22, -b * 0.44 + Math.sin(winkel) * b * 0.075, b * 0.02, 0, Math.PI * 2);
    stift.fill();
  }

  mitGluehen(stift, '#ff7a3c', 14, () => {
    stift.fillStyle = radialGlanz(stift, b * 0.2, '#fff2c9', '#ff5a2c', -b * 0.47);
    stift.beginPath();
    stift.ellipse(-b * 0.02, -b * 0.47, b * 0.16, b * 0.1, 0, 0, Math.PI * 2);
    stift.fill();
  });

  // Glutrisse im Gestein
  stift.strokeStyle = 'rgba(255,140,70,0.55)';
  stift.lineWidth = Math.max(1, groesse * 0.022);
  stift.beginPath();
  stift.moveTo(-b * 0.1, -b * 0.08);
  stift.lineTo(-b * 0.22, b * 0.22);
  stift.moveTo(b * 0.08, -b * 0.04);
  stift.lineTo(b * 0.18, b * 0.24);
  stift.stroke();

  // Aufsteigende Glutpartikel, in zwei Farbtönen für mehr Tiefe
  for (let i = 0; i < 4; i++) {
    const versatz = ((zeit / 850 + i / 4 + samen) % 1);
    const y = -b * 0.5 - versatz * b * 1.05;
    const x = Math.sin(zeit / 380 + i * 2 + samen * 6) * b * 0.16;
    stift.globalAlpha = 1 - versatz;
    stift.fillStyle = i % 2 === 0 ? '#ffb27a' : '#ff7a3c';
    stift.beginPath();
    stift.arc(x, y, b * 0.045 * (1 - versatz * 0.4), 0, Math.PI * 2);
    stift.fill();
  }
  stift.globalAlpha = 1;
}

/* ---------------- 🪸 Kolonie-Riff ---------------- */
function zeichneRiff(stift, { groesse, zeit, samen, farbe }) {
  const b = groesse * 0.52;

  // Sockel
  stift.fillStyle = '#7a3f47';
  stift.beginPath();
  stift.ellipse(0, b * 0.38, b * 0.55, b * 0.13, 0, 0, Math.PI * 2);
  stift.fill();

  // Runde Korallenknollen, jede in eigenem Rosaton – lesbar als Cluster statt
  // als dünne Kritzel-Linien, und mit kleinen Polypen-Pünktchen für Textur.
  const knollen = [
    { dx: -0.32, dy: 0.14, r: 0.24, ton: '#ffb9c8' },
    { dx: -0.06, dy: -0.02, r: 0.32, ton: '#ffd3dc' },
    { dx: 0.28, dy: 0.18, r: 0.2, ton: '#ff9fb2' },
    { dx: 0.14, dy: 0.05, r: 0.15, ton: '#ffc7d4' },
  ];
  for (const k of knollen) {
    const wackel = Math.sin(zeit / 650 + k.dx * 7 + samen * 5) * b * 0.02;
    const grad = stift.createRadialGradient(
      k.dx * b - b * 0.05,
      k.dy * b - b * 0.06,
      b * 0.02,
      k.dx * b,
      k.dy * b,
      k.r * b
    );
    grad.addColorStop(0, k.ton);
    grad.addColorStop(1, farbe);
    stift.fillStyle = grad;
    stift.beginPath();
    stift.arc(k.dx * b + wackel, k.dy * b, k.r * b, 0, Math.PI * 2);
    stift.fill();

    stift.fillStyle = 'rgba(255,255,255,0.55)';
    for (let p = 0; p < 3; p++) {
      const winkel = samen * 20 + k.dx * 9 + p * 2.1;
      stift.beginPath();
      stift.arc(
        k.dx * b + Math.cos(winkel) * k.r * b * 0.55,
        k.dy * b + Math.sin(winkel) * k.r * b * 0.4,
        b * 0.012,
        0,
        Math.PI * 2
      );
      stift.fill();
    }
  }

  // Äste in unterschiedlicher Länge/Dicke, die aus dem Cluster herausragen
  stift.lineCap = 'round';
  const aeste = [
    { bx: -0.32, hoehe: 0.6, dicke: 0.09 },
    { bx: -0.02, hoehe: 0.76, dicke: 0.11 },
    { bx: 0.24, hoehe: 0.5, dicke: 0.08 },
  ];
  aeste.forEach((ast, i) => {
    const bx = ast.bx * b;
    const wackel = Math.sin(zeit / 500 + i + samen * 4) * b * 0.05;
    stift.strokeStyle = farbe;
    stift.lineWidth = Math.max(1.4, groesse * ast.dicke);
    stift.beginPath();
    stift.moveTo(bx, -b * 0.02);
    stift.quadraticCurveTo(bx + wackel, -b * (0.02 + ast.hoehe * 0.55), bx + wackel * 1.4, -b * (0.02 + ast.hoehe));
    stift.stroke();
    mitGluehen(stift, farbe, 5, () => {
      stift.fillStyle = farbe;
      stift.beginPath();
      stift.arc(bx + wackel * 1.4, -b * (0.02 + ast.hoehe), b * 0.055, 0, Math.PI * 2);
      stift.fill();
    });
  });

  // Kleiner Fächerkoralle-Wedel als Kontrast zu den runden Formen
  stift.save();
  stift.translate(b * 0.38, b * 0.04);
  stift.rotate(-0.2 + Math.sin(zeit / 700 + samen * 6) * 0.05);
  stift.strokeStyle = 'rgba(255,143,179,0.7)';
  stift.lineWidth = Math.max(1, groesse * 0.02);
  for (let i = -2; i <= 2; i++) {
    stift.beginPath();
    stift.moveTo(0, 0);
    stift.quadraticCurveTo(i * b * 0.05, -b * 0.18, i * b * 0.14, -b * 0.32);
    stift.stroke();
  }
  stift.restore();
}

/* ---------------- 🏛️ Abgrund-Station ---------------- */
function zeichneStation(stift, { groesse, zeit, samen }) {
  const b = groesse * 0.56;

  // Warmer Lichtkegel auf den Meeresboden – Stimmung, kein Fenster
  stift.save();
  stift.globalAlpha = 0.16;
  const licht = stift.createRadialGradient(0, b * 0.5, b * 0.1, 0, b * 0.5, b * 0.9);
  licht.addColorStop(0, '#ffd9a0');
  licht.addColorStop(1, 'rgba(255,217,160,0)');
  stift.fillStyle = licht;
  stift.beginPath();
  stift.ellipse(0, b * 0.5, b * 0.9, b * 0.28, 0, 0, Math.PI * 2);
  stift.fill();
  stift.restore();

  const rumpf = stift.createLinearGradient(0, -b * 0.36, 0, b * 0.36);
  rumpf.addColorStop(0, '#9aa6b3');
  rumpf.addColorStop(1, '#333c47');
  stift.fillStyle = rumpf;
  stift.beginPath();
  stift.arc(0, b * 0.1, b * 0.54, Math.PI, 0);
  stift.lineTo(b * 0.54, b * 0.34);
  stift.lineTo(-b * 0.54, b * 0.34);
  stift.closePath();
  stift.fill();
  stift.strokeStyle = 'rgba(255,255,255,0.3)';
  stift.lineWidth = Math.max(1, groesse * 0.018);
  stift.stroke();

  // Plattensegmente auf der Kuppel – wirkt gebaut statt aus einem Guss
  stift.strokeStyle = 'rgba(0,0,0,0.22)';
  stift.lineWidth = Math.max(1, groesse * 0.012);
  for (const winkel of [-0.9, -0.35, 0.15, 0.65]) {
    stift.beginPath();
    stift.moveTo(0, b * 0.08);
    stift.lineTo(Math.cos(winkel) * b * 0.53, b * 0.08 + Math.sin(winkel) * b * 0.4);
    stift.stroke();
  }

  // Standbeine – verankern die Kuppel sichtbar am Meeresboden
  stift.strokeStyle = '#5c6673';
  stift.lineWidth = Math.max(1.2, groesse * 0.035);
  for (const dx of [-0.4, 0.4]) {
    stift.beginPath();
    stift.moveTo(dx * b, b * 0.32);
    stift.lineTo(dx * b * 1.3, b * 0.58);
    stift.stroke();
  }

  // Mast mit rotierender Radarschüssel statt nur einem Lichtpunkt
  stift.strokeStyle = '#9aa4b0';
  stift.lineWidth = Math.max(1, groesse * 0.03);
  stift.beginPath();
  stift.moveTo(0, -b * 0.4);
  stift.lineTo(0, -b * 0.6);
  stift.stroke();

  stift.save();
  stift.translate(0, -b * 0.6);
  stift.rotate(zeit / 2200);
  stift.strokeStyle = '#c3ccd6';
  stift.lineWidth = Math.max(1, groesse * 0.025);
  stift.beginPath();
  stift.ellipse(0, 0, b * 0.14, b * 0.045, 0, 0, Math.PI * 2);
  stift.stroke();
  stift.restore();

  const fensterFarben = ['#ffd9a0', '#7ff5e4', '#ffd9a0'];
  for (let i = 0; i < 3; i++) {
    const blink = 0.5 + 0.5 * Math.sin(zeit / 500 + i * 2 + samen * 6);
    mitGluehen(stift, fensterFarben[i], 5, () => {
      stift.globalAlpha = 0.4 + 0.6 * blink;
      stift.fillStyle = fensterFarben[i];
      stift.beginPath();
      stift.arc(-b * 0.28 + i * b * 0.28, b * 0.08, b * 0.055, 0, Math.PI * 2);
      stift.fill();
      stift.globalAlpha = 1;
    });
  }
}

/* ---------------- 🐋 Leviathan-Symbiose ---------------- */
function zeichneLeviathan(stift, { groesse, zeit, samen, farbe }) {
  const b = groesse * 0.64;
  const flex = Math.sin(zeit / 900 + samen * 6) * 0.05;

  stift.save();
  stift.rotate(flex * 0.3);

  // Spindelförmiger Körper statt einer reinen Ellipse – wirkt weniger wie
  // ein Ei und mehr wie ein schwimmendes Tier.
  const koerper = stift.createLinearGradient(0, -b * 0.34, 0, b * 0.34);
  koerper.addColorStop(0, '#a8c9f2');
  koerper.addColorStop(1, farbe);
  stift.fillStyle = koerper;
  stift.beginPath();
  stift.moveTo(b * 0.95, 0);
  stift.quadraticCurveTo(b * 0.5, -b * 0.36, -b * 0.55, -b * 0.22);
  stift.quadraticCurveTo(-b * 0.95, -b * 0.08, -b * 0.95, 0);
  stift.quadraticCurveTo(-b * 0.95, b * 0.08, -b * 0.55, b * 0.22);
  stift.quadraticCurveTo(b * 0.5, b * 0.36, b * 0.95, 0);
  stift.closePath();
  stift.fill();

  // Rückenflosse
  stift.fillStyle = farbe;
  stift.beginPath();
  stift.moveTo(b * 0.05, -b * 0.28);
  stift.lineTo(b * 0.24, -b * 0.56);
  stift.lineTo(b * 0.35, -b * 0.24);
  stift.closePath();
  stift.fill();

  // Zweigeteilte Schwanzflosse, wedelt leicht beim Schwimmen
  const wedel = Math.sin(zeit / 420 + samen * 5) * 0.12;
  stift.save();
  stift.translate(-b * 0.92, 0);
  stift.rotate(wedel);
  stift.fillStyle = farbe;
  stift.beginPath();
  stift.moveTo(0, 0);
  stift.lineTo(-b * 0.35, -b * 0.26);
  stift.lineTo(-b * 0.2, 0);
  stift.lineTo(-b * 0.35, b * 0.26);
  stift.closePath();
  stift.fill();
  stift.restore();

  // Symbiotische Leuchtpunkte entlang der Flanke – daher "-Symbiose" im Namen
  mitGluehen(stift, '#eaffff', 6, () => {
    stift.fillStyle = '#eaffff';
    for (let i = 0; i < 4; i++) {
      const px = -b * 0.5 + i * b * 0.32;
      const py = Math.sin(zeit / 500 + i * 1.7 + samen * 6) * b * 0.06;
      stift.beginPath();
      stift.arc(px, py, b * 0.035, 0, Math.PI * 2);
      stift.fill();
    }
  });

  // Auge mit Pupille
  mitGluehen(stift, '#eaffff', 5, () => {
    stift.fillStyle = '#eaffff';
    stift.beginPath();
    stift.arc(b * 0.62, -b * 0.05, b * 0.05, 0, Math.PI * 2);
    stift.fill();
  });
  stift.fillStyle = '#0a1620';
  stift.beginPath();
  stift.arc(b * 0.64, -b * 0.05, b * 0.022, 0, Math.PI * 2);
  stift.fill();

  stift.restore();
}

/* ---------------- 🕳️ Schwarzer Raucher ---------------- */
function zeichneRaucher(stift, { groesse, zeit, samen }) {
  const b = groesse * 0.52;

  // Zerklüftete, unregelmäßige Kaminform statt eines glatten Dreiecks – echte
  // Schwarze Raucher wachsen in knorrigen Stufen, nicht als Kegel.
  const gestein = stift.createLinearGradient(0, -b * 0.5, 0, b * 0.3);
  gestein.addColorStop(0, '#3a2e30');
  gestein.addColorStop(1, '#171214');
  stift.fillStyle = gestein;
  stift.beginPath();
  stift.moveTo(-b * 0.46, b * 0.3);
  stift.lineTo(-b * 0.28, b * 0.02);
  stift.lineTo(-b * 0.15, -b * 0.28);
  stift.lineTo(-b * 0.1, -b * 0.52);
  stift.lineTo(b * 0.08, -b * 0.5);
  stift.lineTo(b * 0.14, -b * 0.22);
  stift.lineTo(b * 0.27, b * 0.04);
  stift.lineTo(b * 0.46, b * 0.3);
  stift.closePath();
  stift.fill();
  stift.strokeStyle = 'rgba(255,255,255,0.1)';
  stift.lineWidth = Math.max(1, groesse * 0.018);
  stift.stroke();

  // Kleiner Nebenschlot – ein Schwarzer Raucher kommt selten allein
  stift.fillStyle = '#241c1e';
  stift.beginPath();
  stift.moveTo(-b * 0.5, b * 0.3);
  stift.lineTo(-b * 0.4, b * 0.08);
  stift.lineTo(-b * 0.32, b * 0.3);
  stift.closePath();
  stift.fill();

  mitGluehen(stift, '#ff3b2c', 15, () => {
    stift.fillStyle = 'rgba(255,90,60,0.85)';
    stift.beginPath();
    stift.ellipse(-b * 0.01, -b * 0.5, b * 0.15, b * 0.08, 0, 0, Math.PI * 2);
    stift.fill();
  });
  mitGluehen(stift, '#ff5a3c', 8, () => {
    stift.fillStyle = 'rgba(255,110,70,0.7)';
    stift.beginPath();
    stift.ellipse(-b * 0.4, b * 0.06, b * 0.06, b * 0.04, 0, 0, Math.PI * 2);
    stift.fill();
  });

  // Aufsteigender Rauch – wird beim Steigen heller, wie eine echte Wolke,
  // die sich mit dem Wasser vermischt.
  for (let i = 0; i < 4; i++) {
    const versatz = ((zeit / 1300 + i / 4 + samen) % 1);
    const y = -b * 0.56 - versatz * b * 1.4;
    const x = Math.sin(zeit / 650 + i * 2 + samen * 5) * b * (0.16 + versatz * 0.12);
    stift.globalAlpha = (1 - versatz) * 0.6;
    stift.fillStyle = versatz < 0.4 ? '#4a4044' : '#8a8288';
    stift.beginPath();
    stift.arc(x, y, b * 0.13 * (0.6 + versatz), 0, Math.PI * 2);
    stift.fill();
  }
  stift.globalAlpha = 1;
}

/* ---------------- Zuordnung ---------------- */

const ZEICHNER = {
  qualle: zeichneQualle,
  drohne: zeichneDrohne,
  sonar: zeichneSonarboje,
  roboter: zeichneRoboter,
  farm: zeichneFarm,
  schlot: zeichneSchlot,
  riff: zeichneRiff,
  station: zeichneStation,
  leviathan: zeichneLeviathan,
  raucher: zeichneRaucher,
};

/**
 * Zeichnet eine Kreatur zentriert im Ursprung des aktuellen Koordinaten-
 * systems. Ruft intern save()/restore() nicht auf – das übernimmt die
 * aufrufende Stelle, damit globalAlpha (Ein-/Ausblenden) gemeinsam gilt.
 *
 * @param {CanvasRenderingContext2D} stift
 * @param {string} modulId
 * @param {{groesse:number, zeit:number, samen:number, farbe:string}} optionen
 */
export function zeichneKreatur(stift, modulId, optionen) {
  const zeichner = ZEICHNER[modulId];
  if (!zeichner) return;
  zeichner(stift, optionen);
}

export function kennstKreatur(modulId) {
  return Boolean(ZEICHNER[modulId]);
}
