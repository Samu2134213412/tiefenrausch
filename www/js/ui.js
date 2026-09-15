/**
 * Anzeige und Bedienung.
 *
 * Grundsatz: Listen werden einmal aufgebaut und danach nur noch aktualisiert.
 * Jeden Frame das gesamte Dokument neu zu schreiben, lässt ein Idle-Spiel auf
 * älteren Handys sofort ruckeln – und ruckelt es, tippt niemand gern.
 */
import {
  MODULE,
  ENTDECKUNGEN,
  ERFOLGE,
  zoneFuer,
  PERLEN_BONUS,
  PERLEN_SCHWELLE,
  ITEMS,
  findeItem,
  KISTEN_TYPEN,
  EXPEDITIONEN,
  findeExpedition,
  AQUARIUM_FISCHE,
  SELTENHEITEN,
  PERLEN_SHOP,
  GLUECKSRAD_SEGMENTE,
  SKILLBAUM,
  alleSkillknoten,
} from './daten.js';
import * as spiel from './spiel.js';
import { zahl, ganzzahl, dauer, uhr } from './zahlen.js';

const $ = (id) => document.getElementById(id);

/** Ab dieser Kombostufe wird die Anzeige „heiß“ (Perlfarbe statt Türkis). */
const KOMBO_HEISS_AB = 10;

const WENIGER_BEWEGUNG =
  globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;

/**
 * Startet eine CSS-Animation garantiert neu, auch wenn dieselbe Klasse schon
 * dran hängt (z. B. bei sehr schnellem Nachtippen). Ohne den erzwungenen
 * Reflow würde der Browser die laufende Animation einfach weiterlaufen lassen
 * statt sie von vorn zu beginnen.
 */
function animationNeuStarten(el, klasse) {
  el.classList.remove(klasse);
  // eslint-disable-next-line no-unused-expressions -- erzwingt Reflow
  void el.offsetWidth;
  el.classList.add(klasse);
}

export function erzeugeOberflaeche(zustand, aktionen) {
  const knoten = {
    tiefeWert: $('tiefe-wert'),
    zoneName: $('zone-name'),
    guthaben: $('guthaben'),
    proSekunde: $('pro-sekunde'),
    tippHinweis: $('tipp-hinweis'),
    levelAbzeichen: $('level-abzeichen'),
    levelBalken: $('level-balken'),
    perlenLeiste: $('perlen-leiste'),
    perlenAnzahl: $('perlen-anzahl'),
    perlenBonus: $('perlen-bonus'),
    boostAnzeige: $('boost-anzeige'),
    boostZeit: $('boost-zeit'),
    schwebetexte: $('schwebetexte'),
    listeModule: $('liste-module'),
    listeVerbesserungen: $('liste-verbesserungen'),
    verbesserungenLeer: $('verbesserungen-leer'),
    listeEntdeckungen: $('liste-entdeckungen'),
    listeErfolge: $('liste-erfolge'),
    aufstiegGewinn: $('aufstieg-gewinn'),
    aufstiegHinweis: $('aufstieg-hinweis'),
    knopfAufstieg: $('knopf-aufstieg'),
    listePerlenshop: $('liste-perlenshop'),
    skillbaumPunkteZahl: $('skillbaum-punkte-zahl'),
    skillbaum: $('skillbaum'),
    gluecksrad: $('gluecksrad'),
    gluecksradKnopf: $('gluecksrad-knopf'),
    gluecksradStatus: $('gluecksrad-status'),
    meldung: $('meldung'),
    tauchansicht: $('tauchansicht'),
    blitz: $('kritisch-blitz'),
    komboAnzeige: $('kombo-anzeige'),
    komboLeiste: $('kombo-leiste'),
    komboZahl: $('kombo-zahl'),
    listeAquarium: $('liste-aquarium'),
    aquariumStand: $('aquarium-stand'),
    ausruestungSlots: $('ausruestung-slots'),
    listeInventar: $('liste-inventar'),
    inventarLeer: $('inventar-leer'),
    listeKisten: $('liste-kisten'),
    expeditionAktiv: $('expedition-aktiv'),
    expeditionAktivSymbol: $('expedition-aktiv-symbol'),
    expeditionAktivName: $('expedition-aktiv-name'),
    expeditionKarteSchiff: $('expedition-karte-schiff'),
    expeditionAktivZeit: $('expedition-aktiv-zeit'),
    knopfExpeditionAbholen: $('knopf-expedition-abholen'),
    listeExpeditionen: $('liste-expeditionen'),
    expeditionKeineAngel: $('expedition-keine-angel'),
    zielChip: $('ziel-chip'),
    zielText: $('ziel-text'),
    zielLeisteWrap: $('ziel-leiste-wrap'),
    zielLeiste: $('ziel-leiste'),
    tagestruheBanner: $('tagestruhe-banner'),
    tagestruheStreak: $('tagestruhe-streak'),
  };

  let kaufmenge = 1;
  const modulZeilen = new Map();
  const verbesserungsZeilen = new Map();
  let letzteVerbesserungsliste = '';

  /* ---------------- Module ---------------- */

  for (const modul of MODULE) {
    const li = document.createElement('li');
    const knopf = document.createElement('button');
    knopf.className = 'eintrag';
    knopf.innerHTML = `
      <span class="eintrag-symbol" aria-hidden="true">${modul.symbol}</span>
      <span class="eintrag-mitte">
        <span class="eintrag-name">${modul.name} <span class="eintrag-anzahl"></span></span>
        <span class="eintrag-info"></span>
      </span>
      <span class="eintrag-preis">
        <span class="preis-wert"></span>
        <span class="preis-menge"></span>
      </span>`;
    knopf.addEventListener('click', () => aktionen.kaufeModul(modul.id, kaufmenge));
    li.appendChild(knopf);
    knoten.listeModule.appendChild(li);
    modulZeilen.set(modul.id, {
      li,
      knopf,
      anzahl: knopf.querySelector('.eintrag-anzahl'),
      info: knopf.querySelector('.eintrag-info'),
      preis: knopf.querySelector('.preis-wert'),
      menge: knopf.querySelector('.preis-menge'),
    });
  }

  /** Ein Modul wird erst sichtbar, wenn es in Reichweite ist. */
  function modulSichtbar(z, modul, index) {
    if ((z.module[modul.id] ?? 0) > 0) return true;
    if (index === 0) return true;
    const vorher = MODULE[index - 1];
    if ((z.module[vorher.id] ?? 0) > 0) return true;
    return z.gesamtGesamt >= modul.grundpreis * 0.35;
  }

  function aktualisiereModule(z) {
    MODULE.forEach((modul, index) => {
      const zeile = modulZeilen.get(modul.id);
      const sichtbar = modulSichtbar(z, modul, index);
      zeile.li.hidden = !sichtbar;
      if (!sichtbar) return;

      const besitz = z.module[modul.id] ?? 0;
      const menge = kaufmenge === 'max' ? Math.max(1, spiel.maximalKaufbar(z, modul.id)) : kaufmenge;
      const preis = spiel.modulPreis(z, modul.id, menge);
      const bezahlbar = z.bl >= preis;

      zeile.anzahl.textContent = besitz > 0 ? `×${ganzzahl(besitz)}` : '';
      const ertrag = spiel.modulErtrag(z, modul.id);
      zeile.info.textContent =
        besitz > 0
          ? `${zahl(ertrag * besitz * gesamtfaktorAnzeige(z))} / Sek. gesamt`
          : modul.beschreibung;
      zeile.preis.textContent = zahl(preis);
      zeile.menge.textContent = menge > 1 ? `für ${ganzzahl(menge)}` : `+${zahl(ertrag)}/Sek.`;
      zeile.knopf.classList.toggle('kaufbar', bezahlbar);
      zeile.knopf.classList.toggle('gesperrt', !bezahlbar);
      zeile.knopf.disabled = !bezahlbar;
    });
  }

  function gesamtfaktorAnzeige(z) {
    const grund = spiel.produktionProSekunde(z);
    const roh = MODULE.reduce(
      (s, m) => s + spiel.modulErtrag(z, m.id) * (z.module[m.id] ?? 0),
      0
    );
    return roh > 0 ? grund / roh : 1;
  }

  /* ---------------- Verbesserungen ---------------- */

  function baueVerbesserung(v) {
    const li = document.createElement('li');
    const knopf = document.createElement('button');
    knopf.className = 'eintrag';
    knopf.innerHTML = `
      <span class="eintrag-symbol" aria-hidden="true">${v.symbol}</span>
      <span class="eintrag-mitte">
        <span class="eintrag-name">${v.name}</span>
        <span class="eintrag-info">${v.text}</span>
      </span>
      <span class="eintrag-preis"><span class="preis-wert">${zahl(v.preis)}</span></span>`;
    knopf.addEventListener('click', () => aktionen.kaufeVerbesserung(v.id));
    li.appendChild(knopf);
    return { li, knopf };
  }

  function aktualisiereVerbesserungen(z) {
    const verfuegbar = spiel.verfuegbareVerbesserungen(z);
    const kennung = verfuegbar.map((v) => v.id).join(',');

    if (kennung !== letzteVerbesserungsliste) {
      letzteVerbesserungsliste = kennung;
      knoten.listeVerbesserungen.textContent = '';
      verbesserungsZeilen.clear();
      for (const v of verfuegbar) {
        const zeile = baueVerbesserung(v);
        knoten.listeVerbesserungen.appendChild(zeile.li);
        verbesserungsZeilen.set(v.id, zeile);
      }
      knoten.verbesserungenLeer.hidden = verfuegbar.length > 0;
    }

    for (const v of verfuegbar) {
      const zeile = verbesserungsZeilen.get(v.id);
      if (!zeile) continue;
      const bezahlbar = z.bl >= v.preis;
      zeile.knopf.classList.toggle('kaufbar', bezahlbar);
      zeile.knopf.classList.toggle('gesperrt', !bezahlbar);
      zeile.knopf.disabled = !bezahlbar;
    }
  }

  /* ---------------- Logbuch ---------------- */

  function aktualisiereLogbuch(z) {
    knoten.listeEntdeckungen.textContent = '';
    for (const e of ENTDECKUNGEN) {
      const bekannt = z.entdeckungen.includes(e.tiefe);
      const li = document.createElement('li');
      li.className = `eintrag ${bekannt ? '' : 'unbekannt'}`;
      li.innerHTML = `
        <span class="eintrag-symbol" aria-hidden="true">${bekannt ? e.symbol : '❔'}</span>
        <span class="eintrag-mitte">
          <span class="eintrag-name">${bekannt ? e.name : 'Unbekannt'}
            <span class="eintrag-anzahl">${ganzzahl(e.tiefe)} m</span>
          </span>
          <span class="entdeckung-flavor">${
            bekannt ? e.text : 'Tauche tiefer, um dieses Wesen zu finden.'
          }</span>
        </span>`;
      knoten.listeEntdeckungen.appendChild(li);
    }

    knoten.listeErfolge.textContent = '';
    for (const e of ERFOLGE) {
      const erreicht = z.erfolge.includes(e.id);
      const li = document.createElement('li');
      li.className = `erfolg ${erreicht ? '' : 'offen'}`;
      li.title = e.text;
      li.innerHTML = `
        <span class="erfolg-symbol" aria-hidden="true">${erreicht ? e.symbol : '🔒'}</span>
        <span class="erfolg-name">${erreicht ? e.name : e.text}</span>`;
      knoten.listeErfolge.appendChild(li);
    }

    knoten.aquariumStand.textContent = `${z.aquarium.length} / ${AQUARIUM_FISCHE.length} gefangen`;
    knoten.listeAquarium.textContent = '';
    for (const f of AQUARIUM_FISCHE) {
      const gefangen = z.aquarium.includes(f.id);
      const li = document.createElement('li');
      li.className = `erfolg seltenheit-${f.seltenheit} ${gefangen ? '' : 'offen'}`;
      li.title = gefangen ? f.text : 'Auf Expeditionen zu finden.';
      const inhalt = `
        <span class="erfolg-symbol" aria-hidden="true">${gefangen ? f.symbol : '❔'}</span>
        <span class="erfolg-name">${gefangen ? f.name : 'Unbekannt'}</span>`;
      // Gefangene Fische lassen sich antippen und zeigen ihre Details in
      // einem eigenen Dialog - unbekannte bleiben bewusst nicht interaktiv.
      // Der Button übernimmt per CSS (.erfolg-knopf) exakt das Aussehen der
      // sonst reinen Textkarte, damit das Grid-Layout gleich bleibt.
      if (gefangen) {
        const knopf = document.createElement('button');
        knopf.className = 'erfolg-knopf';
        knopf.innerHTML = inhalt;
        knopf.addEventListener('click', () => zeigeAquariumFisch(f));
        li.appendChild(knopf);
      } else {
        li.innerHTML = inhalt;
      }
      knoten.listeAquarium.appendChild(li);
    }
  }

  /* ---------------- Glücksrad ---------------- */

  (function baueGluecksrad() {
    const segAnzahl = GLUECKSRAD_SEGMENTE.length;
    const segWinkel = 360 / segAnzahl;
    const radius = 78;

    const gradientTeile = GLUECKSRAD_SEGMENTE.map(
      (s, i) => `${s.farbe} ${i * segWinkel}deg ${(i + 1) * segWinkel}deg`
    );
    knoten.gluecksrad.style.background = `conic-gradient(${gradientTeile.join(', ')})`;

    GLUECKSRAD_SEGMENTE.forEach((s, i) => {
      const mitteWinkel = i * segWinkel + segWinkel / 2;
      const span = document.createElement('span');
      span.className = 'gluecksrad-symbol';
      span.textContent = s.symbol;
      span.style.transform =
        `translate(-50%, -50%) rotate(${mitteWinkel}deg) translate(0, -${radius}px) rotate(${-mitteWinkel}deg)`;
      knoten.gluecksrad.appendChild(span);
    });
  })();

  function aktualisiereGluecksrad(z, jetzt) {
    // spiel.dreheGluecksrad() setzt die Sperre schon vor der Dreh-Animation,
    // daher deckt dieser einfache Zustandsabgleich auch „dreht sich gerade“
    // automatisch mit ab – kein eigenes Flag nötig.
    const verfuegbar = spiel.gluecksradVerfuegbar(z, jetzt);
    knoten.gluecksradKnopf.disabled = !verfuegbar;
    knoten.gluecksradStatus.textContent = verfuegbar
      ? 'Heute noch verfügbar!'
      : `Nächste Drehung in ${dauer(spiel.gluecksradRestMs(z, jetzt) / 1000)}`;
  }

  knoten.gluecksradKnopf.addEventListener('click', () => aktionen.dreheGluecksrad());

  /* ---------------- Aufstieg ---------------- */

  function aktualisiereAufstieg(z) {
    const gewinn = spiel.perlenBeiAufstieg(z);
    knoten.aufstiegGewinn.textContent = ganzzahl(gewinn);
    knoten.knopfAufstieg.disabled = gewinn <= 0;

    if (gewinn > 0) {
      const neuerBonus = (z.perlen + gewinn) * PERLEN_BONUS * 100;
      knoten.aufstiegHinweis.textContent =
        `Danach: +${neuerBonus.toFixed(0)} % dauerhaft (jetzt +${(z.perlen * PERLEN_BONUS * 100).toFixed(0)} %).`;
    } else {
      const fehlend = Math.max(0, PERLEN_SCHWELLE - z.gesamtRunde);
      knoten.aufstiegHinweis.textContent =
        `Noch ${zahl(fehlend)} BL in dieser Runde sammeln, dann gibt es die erste Perle.`;
    }
  }

  /* ---------------- Perlen-Shop ----------------
   * Statische Liste (ändert sich nie), nur der Zustand jeder Zeile wird
   * aktualisiert – anders als bei Verbesserungen gibt es hier kein Herausfiltern
   * bereits gekaufter Angebote, sie bleiben sichtbar als „Gekauft“-Beleg. */

  const perlenShopZeilen = new Map();
  for (const item of PERLEN_SHOP) {
    const li = document.createElement('li');
    const knopf = document.createElement('button');
    knopf.className = 'eintrag';
    knopf.innerHTML = `
      <span class="eintrag-symbol" aria-hidden="true">${item.symbol}</span>
      <span class="eintrag-mitte">
        <span class="eintrag-name">${item.name}</span>
        <span class="eintrag-info">${item.text}</span>
      </span>
      <span class="eintrag-preis"><span class="preis-wert"></span></span>`;
    knopf.addEventListener('click', () => aktionen.kaufePerlenShopItem(item.id));
    li.appendChild(knopf);
    knoten.listePerlenshop.appendChild(li);
    perlenShopZeilen.set(item.id, { knopf, preis: knopf.querySelector('.preis-wert') });
  }

  function aktualisierePerlenShop(z) {
    for (const item of PERLEN_SHOP) {
      const zeile = perlenShopZeilen.get(item.id);
      const gekauft = z.perlenShop.includes(item.id);
      const bezahlbar = !gekauft && z.perlen >= item.preis;
      zeile.knopf.classList.toggle('gekauft', gekauft);
      zeile.knopf.classList.toggle('kaufbar', bezahlbar);
      zeile.knopf.classList.toggle('gesperrt', !gekauft && !bezahlbar);
      zeile.knopf.disabled = gekauft || !bezahlbar;
      zeile.preis.textContent = gekauft ? 'Gekauft ✓' : `${ganzzahl(item.preis)} Perlen`;
    }
  }

  /* ---------------- Skillbaum ----------------
   * Wie der Perlen-Shop eine statische Struktur, hier drei Zweige mit je drei
   * Knoten in Freischalt-Reihenfolge – nur Zustand (gesperrt/kaufbar/frei)
   * wird pro Aktualisierung neu gesetzt. */

  const skillknotenZeilen = new Map();
  for (const zweig of SKILLBAUM) {
    const spalte = document.createElement('div');
    spalte.className = 'skillzweig';
    spalte.innerHTML = `
      <span class="skillzweig-kopf">
        <span class="skillzweig-kopf-symbol" aria-hidden="true">${zweig.symbol}</span>
        <span>${zweig.name}</span>
      </span>`;
    zweig.knoten.forEach((knotenDef, index) => {
      if (index > 0) {
        const verbindung = document.createElement('div');
        verbindung.className = 'skillknoten-verbindung';
        spalte.appendChild(verbindung);
        skillknotenZeilen.get(zweig.knoten[index - 1].id).verbindungDanach = verbindung;
      }
      const knopf = document.createElement('button');
      knopf.className = 'skillknoten';
      knopf.innerHTML = `
        <span class="skillknoten-symbol" aria-hidden="true">${zweig.symbol}</span>
        <span class="skillknoten-name">${knotenDef.name}</span>
        <span class="skillknoten-kosten"></span>`;
      knopf.title = knotenDef.text;
      knopf.addEventListener('click', () => aktionen.kaufeSkillknoten(knotenDef.id));
      spalte.appendChild(knopf);
      skillknotenZeilen.set(knotenDef.id, { knopf, kosten: knopf.querySelector('.skillknoten-kosten') });
    });
    knoten.skillbaum.appendChild(spalte);
  }

  function aktualisiereSkillbaum(z) {
    knoten.skillbaumPunkteZahl.textContent = ganzzahl(z.skillpunkte ?? 0);
    for (const knotenDef of alleSkillknoten()) {
      const zeile = skillknotenZeilen.get(knotenDef.id);
      const frei = z.skillbaum.includes(knotenDef.id);
      const voraussetzungErfuellt = !knotenDef.braucht || z.skillbaum.includes(knotenDef.braucht);
      const kaufbar = !frei && voraussetzungErfuellt && (z.skillpunkte ?? 0) >= knotenDef.kosten;
      zeile.knopf.classList.toggle('frei', frei);
      zeile.knopf.classList.toggle('kaufbar', kaufbar);
      zeile.knopf.classList.toggle('gesperrt', !frei && !kaufbar);
      zeile.knopf.disabled = frei || !voraussetzungErfuellt || (z.skillpunkte ?? 0) < knotenDef.kosten;
      zeile.kosten.textContent = frei ? 'Frei ✓' : `${knotenDef.kosten} SP`;
      if (zeile.verbindungDanach) zeile.verbindungDanach.classList.toggle('frei', frei);
    }
  }

  /* ---------------- Expedition ---------------- */

  const kistenZeilen = new Map();
  for (const k of KISTEN_TYPEN) {
    const li = document.createElement('li');
    const knopf = document.createElement('button');
    knopf.className = 'eintrag';
    knopf.innerHTML = `
      <span class="eintrag-symbol" aria-hidden="true">${k.symbol}</span>
      <span class="eintrag-mitte">
        <span class="eintrag-name">${k.name} <span class="eintrag-anzahl"></span></span>
        <span class="eintrag-info">Enthält Ausrüstung – seltener wird's mit besserer Kiste.</span>
      </span>
      <span class="eintrag-preis"><span class="preis-wert">Öffnen</span></span>`;
    knopf.addEventListener('click', () => aktionen.oeffneKiste(k.id));
    li.appendChild(knopf);
    knoten.listeKisten.appendChild(li);
    kistenZeilen.set(k.id, { li, knopf, anzahl: knopf.querySelector('.eintrag-anzahl') });
  }

  function aktualisiereKisten(z) {
    for (const k of KISTEN_TYPEN) {
      const zeile = kistenZeilen.get(k.id);
      const anzahl = z.kisten[k.id] ?? 0;
      zeile.anzahl.textContent = anzahl > 0 ? `×${ganzzahl(anzahl)}` : '';
      zeile.knopf.classList.toggle('hat-vorrat', anzahl > 0);
      zeile.knopf.disabled = anzahl <= 0;
    }
  }

  const expeditionZeilen = new Map();
  for (const e of EXPEDITIONEN) {
    const li = document.createElement('li');
    const knopf = document.createElement('button');
    knopf.className = 'eintrag';
    knopf.innerHTML = `
      <span class="eintrag-symbol" aria-hidden="true">${e.symbol}</span>
      <span class="eintrag-mitte">
        <span class="eintrag-name">${e.name}</span>
        <span class="eintrag-info">${e.text}</span>
      </span>
      <span class="eintrag-preis">
        <span class="preis-wert"></span>
        <span class="preis-menge">Start</span>
      </span>`;
    knopf.addEventListener('click', () => aktionen.starteExpedition(e.id));
    li.appendChild(knopf);
    knoten.listeExpeditionen.appendChild(li);
    expeditionZeilen.set(e.id, { li, knopf, dauerText: knopf.querySelector('.preis-wert') });
  }

  function aktualisiereExpeditionsliste(z) {
    const faktor = spiel.angelZeitFaktor(z);
    for (const e of EXPEDITIONEN) {
      expeditionZeilen.get(e.id).dauerText.textContent = dauer((e.dauerMs * faktor) / 1000);
    }
  }

  function aktualisiereAusruestung(z) {
    knoten.ausruestungSlots.textContent = '';
    for (const slot of ['angel', 'koeder']) {
      const item = findeItem(z.ausruestung[slot]);
      const div = document.createElement('div');
      div.className = `ausruestung-slot ${item ? `belegt seltenheit-${item.seltenheit}` : 'leer'}`;
      div.innerHTML = `
        <span class="ausruestung-slot-label">${slot === 'angel' ? 'Angel' : 'Köder'}</span>
        <span class="ausruestung-slot-symbol" aria-hidden="true">${
          item ? item.symbol : slot === 'angel' ? '🎣' : '❔'
        }</span>
        <span class="ausruestung-slot-name">${item ? item.name : 'Keine ausgerüstet'}</span>`;
      knoten.ausruestungSlots.appendChild(div);
    }
  }

  let letzteInventarListe = '';
  const inventarZeilen = new Map();

  function aktualisiereInventar(z) {
    const kennung = z.besitzItems.join(',');
    if (kennung !== letzteInventarListe) {
      letzteInventarListe = kennung;
      knoten.listeInventar.textContent = '';
      inventarZeilen.clear();
      for (const id of z.besitzItems) {
        const item = findeItem(id);
        if (!item) continue;
        const li = document.createElement('li');
        const knopf = document.createElement('button');
        knopf.className = `eintrag seltenheit-${item.seltenheit}`;
        knopf.innerHTML = `
          <span class="eintrag-symbol" aria-hidden="true">${item.symbol}</span>
          <span class="eintrag-mitte">
            <span class="eintrag-name">${item.name}
              <span class="inventar-seltenheit">${SELTENHEITEN[item.seltenheit]?.label ?? ''}</span>
            </span>
            <span class="eintrag-info">${item.text}</span>
          </span>
          <span class="eintrag-preis"><span class="inventar-status"></span></span>`;
        knopf.addEventListener('click', () => aktionen.ruestAusItem(id));
        li.appendChild(knopf);
        knoten.listeInventar.appendChild(li);
        inventarZeilen.set(id, { li, knopf, status: knopf.querySelector('.inventar-status') });
      }
      knoten.inventarLeer.hidden = z.besitzItems.length > 0;
    }

    for (const [id, zeile] of inventarZeilen) {
      const item = findeItem(id);
      const ausgeruestet = item && z.ausruestung[item.slot] === id;
      zeile.knopf.classList.toggle('ausgeruestet', ausgeruestet);
      zeile.status.textContent = ausgeruestet ? 'Ausgerüstet' : 'Ausrüsten';
    }
  }

  function aktualisiereExpedition(z, jetzt) {
    const laeuft = Boolean(z.expedition);
    knoten.expeditionAktiv.hidden = !laeuft;
    knoten.listeExpeditionen.hidden = laeuft || !spiel.hatAngel(z);
    knoten.expeditionKeineAngel.hidden = laeuft || spiel.hatAngel(z);
    if (!laeuft) return;

    const def = findeExpedition(z.expedition.expeditionId);
    if (!def) return;
    knoten.expeditionAktivSymbol.textContent = def.symbol;
    knoten.expeditionAktivName.textContent = def.name;
    knoten.expeditionKarteSchiff.textContent = def.symbol;

    const gesamt = z.expedition.endZeit - z.expedition.startZeit;
    const rest = spiel.expeditionRestMs(z, jetzt);
    const anteil = gesamt > 0 ? Math.min(1, 1 - rest / gesamt) : 1;

    // Hinweg 0-50 %: Station -> Ziel. Rückweg 50-100 %: Ziel -> Station.
    // „Einmal hin, einmal zurück“ statt nur einer linearen Fahrt.
    const hinweg = anteil <= 0.5;
    const wegAnteil = hinweg ? anteil * 2 : (1 - anteil) * 2;
    knoten.expeditionKarteSchiff.style.left = `${Math.max(0, Math.min(1, wegAnteil)) * 100}%`;
    knoten.expeditionKarteSchiff.classList.toggle('rueckweg', !hinweg);

    const fertig = spiel.expeditionFertig(z, jetzt);
    knoten.expeditionAktivZeit.textContent = fertig ? 'Zurück von der Expedition!' : `Noch ${dauer(rest / 1000)}`;
    knoten.knopfExpeditionAbholen.disabled = !fertig;
    knoten.knopfExpeditionAbholen.textContent = fertig ? 'Abholen' : 'Noch unterwegs …';
  }

  knoten.knopfExpeditionAbholen.addEventListener('click', () => aktionen.sammleExpedition());

  /* ---------------- Tages-Truhe ---------------- */

  function aktualisiereTagestruheBanner(z, jetzt) {
    const verfuegbar = spiel.tagestruheVerfuegbar(z, jetzt);
    knoten.tagestruheBanner.hidden = !verfuegbar;
    const streak = z.tagesStreak ?? 0;
    knoten.tagestruheStreak.hidden = streak < 2;
    if (streak >= 2) knoten.tagestruheStreak.textContent = `🔥 ${streak}`;
  }

  knoten.tagestruheBanner.addEventListener('click', () => aktionen.hohleTagestruhe());

  /* ---------------- Nächstes-Ziel-Chip ----------------
   * Ein einzelner, immer sichtbarer nächster Schritt statt vieler Listen –
   * siehe spiel.naechstesZiel für die Priorisierung. Tippen auf den Chip
   * springt zum passenden Bereich bzw. löst die Tages-Truhe direkt aus. */

  let letztesZielArt = null;
  const ZIEL_SOFORT = new Set(['tagestruhe', 'kiste', 'expedition', 'modul-kaufbar']);

  function aktualisiereZielChip(z, jetzt) {
    const ziel = spiel.naechstesZiel(z, jetzt);
    letztesZielArt = ziel?.art ?? null;
    knoten.zielChip.hidden = !ziel;
    if (!ziel) return;

    knoten.zielText.textContent = ziel.text;
    knoten.zielChip.classList.toggle('bereit', ZIEL_SOFORT.has(ziel.art));

    const zeigeLeiste = ziel.art === 'modul-sparen';
    knoten.zielLeisteWrap.hidden = !zeigeLeiste;
    if (zeigeLeiste) knoten.zielLeiste.style.transform = `scaleX(${ziel.anteil})`;
  }

  knoten.zielChip.addEventListener('click', () => {
    if (letztesZielArt === 'tagestruhe') aktionen.hohleTagestruhe();
    else if (letztesZielArt === 'kiste' || letztesZielArt === 'expedition') waehleReiter('reiter-expedition');
    else if (letztesZielArt === 'modul-kaufbar' || letztesZielArt === 'modul-sparen') waehleReiter('reiter-module');
  });

  /* ---------------- Kopfzeile ---------------- */

  function aktualisiereKopf(z, jetzt) {
    const tiefe = spiel.aktuelleTiefe(z);
    knoten.tiefeWert.textContent = ganzzahl(tiefe);
    knoten.zoneName.textContent = zoneFuer(tiefe).name;
    knoten.guthaben.textContent = zahl(z.bl);
    knoten.proSekunde.textContent = `${zahl(spiel.produktionProSekunde(z, jetzt))} / Sek.`;

    knoten.levelAbzeichen.textContent = `Lvl ${ganzzahl(spiel.aktuellesLevel(z))}`;
    knoten.levelBalken.style.width = `${spiel.aktuellerLevelFortschritt(z) * 100}%`;

    const hatPerlen = z.perlen > 0;
    knoten.perlenLeiste.hidden = !hatPerlen;
    if (hatPerlen) {
      knoten.perlenAnzahl.textContent = ganzzahl(z.perlen);
      knoten.perlenBonus.textContent = `+${(z.perlen * PERLEN_BONUS * 100).toFixed(0)} % Ausbeute`;
    }

    const rest = spiel.boostRestSekunden(z, jetzt);
    knoten.boostAnzeige.hidden = rest <= 0;
    if (rest > 0) knoten.boostZeit.textContent = uhr(rest);

    knoten.tippHinweis.classList.toggle('aus', z.tipps >= 12);
  }

  /* ---------------- Kombo ---------------- */

  function aktualisiereKombo(z, jetzt) {
    const aktiv = spiel.komboAktiv(z, jetzt);
    knoten.komboAnzeige.hidden = !aktiv;
    if (!aktiv) return;

    const faktor = spiel.komboFaktorFuer(z.kombo);
    knoten.komboZahl.textContent = `×${faktor.toFixed(2).replace(/\.?0+$/, '') || '1'}`;
    knoten.komboAnzeige.classList.toggle('kombo-heiss', z.kombo >= KOMBO_HEISS_AB);

    // Leiste zeigt live, wie viel Zeit im Kombofenster noch übrig ist, bevor
    // die Kette abreißt – direkte, kontinuierliche Rückmeldung statt eines
    // abstrakten Timers.
    const anteil = spiel.komboRestAnteil(z, jetzt);
    knoten.komboLeiste.style.transform = `scaleX(${anteil})`;
  }

  /* ---------------- Rückmeldungen ---------------- */

  let meldungsZeit;
  function melde(text, dauerMs = 2200) {
    knoten.meldung.textContent = text;
    knoten.meldung.hidden = false;
    clearTimeout(meldungsZeit);
    meldungsZeit = setTimeout(() => {
      knoten.meldung.hidden = true;
    }, dauerMs);
  }

  /**
   * Aufsteigende Zahl an der Stelle, an der getippt wurde.
   * @param {number} x
   * @param {number} y
   * @param {string} text
   * @param {{kritisch?: boolean}} [optionen]
   */
  function schwebetext(x, y, text, optionen = {}) {
    const el = document.createElement('div');
    el.className = optionen.kritisch ? 'schwebetext kritisch' : 'schwebetext';
    el.textContent = optionen.kritisch ? `${text} !` : text;
    const rahmen = knoten.schwebetexte.getBoundingClientRect();
    el.style.left = `${x - rahmen.left}px`;
    el.style.top = `${y - rahmen.top}px`;
    knoten.schwebetexte.appendChild(el);
    setTimeout(() => el.remove(), optionen.kritisch ? 1200 : 1000);
  }

  /** Kurzer Ausschlag der großen Zahl – bei jedem Tipp, kräftiger bei Kritischen. */
  function pulsGuthaben(kritisch = false) {
    animationNeuStarten(knoten.guthaben, kritisch ? 'puls-kritisch' : 'puls');
  }

  /** Bildschirm-Zittern; `stark` für die selteneren, größeren Momente. */
  function beben(stark = false) {
    animationNeuStarten(knoten.tauchansicht, stark ? 'beben-stark' : 'beben');
  }

  /** Kurzer heller Blitz über der Tauchansicht – für kritische Treffer. */
  function blitz() {
    animationNeuStarten(knoten.blitz, 'an');
  }

  /* ---------------- Hinweispunkte an den Reitern ---------------- */

  function aktualisierePunkte(z) {
    const modulKaufbar = MODULE.some((m, i) => {
      if (!modulSichtbar(z, m, i)) return false;
      return z.bl >= spiel.modulPreis(z, m.id, 1);
    });
    const verbesserungKaufbar = spiel
      .verfuegbareVerbesserungen(z)
      .some((v) => z.bl >= v.preis);
    const aufstiegMoeglich = spiel.perlenBeiAufstieg(z) > 0;
    const kistenOffen = KISTEN_TYPEN.some((k) => (z.kisten[k.id] ?? 0) > 0);
    const expeditionAbholbereit = spiel.expeditionFertig(z);

    $('punkt-module').hidden = !modulKaufbar;
    $('punkt-verbesserungen').hidden = !verbesserungKaufbar;
    $('punkt-aufstieg').hidden = !aufstiegMoeglich;
    $('punkt-expedition').hidden = !(kistenOffen || expeditionAbholbereit);
  }

  /* ---------------- Reiter ---------------- */

  const reiterKnoepfe = Array.from(document.querySelectorAll('[role="tab"]'));
  let aktiverReiter = 'reiter-module';

  for (const knopf of reiterKnoepfe) {
    knopf.addEventListener('click', () => {
      // Nur bei echtem Antippen der Reiterleiste, nicht bei programmatischen
      // Wechseln (z. B. Ziel-Chip, Reset nach dem Aufstieg) - dort passt der
      // Klick akustisch nicht zum jeweils eigenen Moment.
      aktionen.beiReiterwechsel?.();
      waehleReiter(knopf.id);
    });
  }

  function waehleReiter(id) {
    aktiverReiter = id;
    for (const knopf of reiterKnoepfe) {
      const gewaehlt = knopf.id === id;
      knopf.setAttribute('aria-selected', String(gewaehlt));
      const tafel = document.getElementById(knopf.getAttribute('aria-controls'));
      if (tafel) tafel.hidden = !gewaehlt;
    }
    if (id === 'reiter-logbuch') aktualisiereLogbuch(zustand);
  }

  /* ---------------- Kaufmenge ---------------- */

  const mengenKnoepfe = Array.from(document.querySelectorAll('.kaufmenge button'));
  for (const knopf of mengenKnoepfe) {
    knopf.addEventListener('click', () => {
      kaufmenge = knopf.dataset.menge === 'max' ? 'max' : Number(knopf.dataset.menge);
      for (const k of mengenKnoepfe) {
        k.setAttribute('aria-pressed', String(k === knopf));
      }
    });
  }

  /* ---------------- Öffentliche Schnittstelle ---------------- */

  return {
    aktualisiere(z, jetzt = Date.now()) {
      aktualisiereKopf(z, jetzt);
      aktualisiereKombo(z, jetzt);
      aktualisiereModule(z);
      aktualisiereVerbesserungen(z);
      aktualisiereGluecksrad(z, jetzt);
      aktualisiereAufstieg(z);
      aktualisierePerlenShop(z);
      aktualisiereSkillbaum(z);
      aktualisiereAusruestung(z);
      aktualisiereInventar(z);
      aktualisiereKisten(z);
      aktualisiereExpeditionsliste(z);
      aktualisiereExpedition(z, jetzt);
      aktualisiereTagestruheBanner(z, jetzt);
      aktualisiereZielChip(z, jetzt);
      aktualisierePunkte(z);
      if (aktiverReiter === 'reiter-logbuch') aktualisiereLogbuch(z);
    },
    aktualisiereLogbuch,
    melde,
    schwebetext,
    pulsGuthaben,
    beben,
    blitz,
    waehleReiter,
    knoten,
  };
}

/* ------------------------------------------------------------------ */
/* Dialoge                                                             */
/* ------------------------------------------------------------------ */

export function zeigeDialog(id) {
  const el = $(id);
  if (!el) return;
  el.hidden = false;
  const ersterKnopf = el.querySelector('button:not([hidden])');
  ersterKnopf?.focus();
}

export function schliesseDialog(id) {
  const el = $(id);
  if (el) el.hidden = true;
}

export function zeigeEntdeckung(entdeckung, beimSchliessen) {
  $('entdeckung-symbol').textContent = entdeckung.symbol;
  $('entdeckung-tiefe').textContent = `In ${ganzzahl(entdeckung.tiefe)} m Tiefe`;
  $('entdeckung-titel').textContent = entdeckung.name;
  $('entdeckung-text').textContent = entdeckung.text;
  const prozent = Math.round((entdeckung.bonus - 1) * 100);
  $('entdeckung-bonus').textContent = `Dauerhaft +${prozent} % Ausbeute`;
  zeigeDialog('overlay-entdeckung');
  $('entdeckung-ok').onclick = () => {
    schliesseDialog('overlay-entdeckung');
    beimSchliessen?.();
  };
}

/**
 * Zeigt das Ergebnis einer geöffneten Kiste: entweder ein neues Item, farblich
 * nach Seltenheit abgesetzt, oder – falls schon alles dieser Stufe besessen
 * wird – den BL-Ausgleich, damit sich das Öffnen immer lohnt.
 */

/** Dauer der Wackel-Spannungsphase, bevor die Kiste aufplatzt und ihren Inhalt zeigt. */
const KISTE_WACKEL_MS = 650;

/**
 * Zeigt das Ergebnis einer geöffneten Kiste in zwei Phasen – erst Spannung
 * (die geschlossene Kiste wackelt), dann Auflösung (sie „platzt“ auf und
 * legt Item bzw. BL-Ausgleich offen frei, mit einem farbigen Ring-Burst).
 * Das ist der eigentliche Belohnungsmoment, den Loot-Boxen so wirksam macht
 * – hier bewusst zum Nachfühlen statt zum Ausnutzen eingesetzt: kostenlos,
 * ohne Echtgeld, mit garantiertem Ergebnis.
 *
 * @param {object} ergebnis Rückgabewert von oeffneKiste/sammleTreibgutKiste/hohleTagestruhe
 * @param {{beimAufdecken?: () => void, beimSchliessen?: () => void}} [optionen]
 */
export function zeigeKiste(ergebnis, optionen = {}) {
  const { beimAufdecken, beimSchliessen } = optionen;
  const dialog = $('dialog-kiste');
  dialog.className = `dialog dialog-entdeckung dialog-kiste seltenheit-${ergebnis.seltenheit}`;
  const label = SELTENHEITEN[ergebnis.seltenheit]?.label ?? ergebnis.seltenheit;
  const symbolEl = $('kiste-symbol');
  const ringEl = $('kiste-ring');

  // Phase 1: geschlossene Kiste, wackelt vor Spannung.
  $('kiste-seltenheit').textContent = '';
  $('kiste-titel').textContent = 'Kiste wird geöffnet …';
  $('kiste-text').textContent = '';
  symbolEl.textContent = ergebnis.kistenTyp?.symbol ?? '📦';
  symbolEl.className = WENIGER_BEWEGUNG ? 'entdeckung-symbol' : 'entdeckung-symbol wackelt';
  ringEl.className = 'kiste-ring';
  $('kiste-ok').hidden = true;

  zeigeDialog('overlay-kiste');

  const aufdecken = () => {
    symbolEl.textContent = ergebnis.item ? ergebnis.item.symbol : ergebnis.kistenTyp?.symbol ?? '📦';
    symbolEl.className = WENIGER_BEWEGUNG ? 'entdeckung-symbol' : 'entdeckung-symbol geoeffnet';
    ringEl.className = WENIGER_BEWEGUNG ? 'kiste-ring' : 'kiste-ring aktiv';
    $('kiste-seltenheit').textContent = label;
    if (ergebnis.item) {
      $('kiste-titel').textContent = ergebnis.item.name;
      $('kiste-text').textContent = ergebnis.item.text;
    } else {
      $('kiste-titel').textContent = 'Schon komplett';
      $('kiste-text').textContent =
        `Alles der Stufe „${label}“ ist schon in deinem Besitz. Dafür gibt es ${zahl(ergebnis.duplikatBL)} BL.`;
    }
    $('kiste-ok').hidden = false;
    beimAufdecken?.();
  };

  setTimeout(aufdecken, WENIGER_BEWEGUNG ? 0 : KISTE_WACKEL_MS);

  $('kiste-ok').onclick = () => {
    schliesseDialog('overlay-kiste');
    beimSchliessen?.();
  };
}

/** Zeigt die Details eines bereits gefangenen Aquarium-Fisches. */
export function zeigeAquariumFisch(fisch) {
  const dialog = $('dialog-fisch');
  dialog.className = `dialog dialog-entdeckung seltenheit-${fisch.seltenheit}`;
  $('fisch-symbol').textContent = fisch.symbol;
  $('fisch-seltenheit').textContent = SELTENHEITEN[fisch.seltenheit]?.label ?? fisch.seltenheit;
  $('fisch-titel').textContent = fisch.name;
  $('fisch-text').textContent = fisch.text;
  const prozent = Math.round((fisch.bonus - 1) * 1000) / 10;
  $('fisch-bonus').textContent = `Dauerhaft +${prozent} % Ausbeute`;
  zeigeDialog('overlay-fisch');
  $('fisch-ok').onclick = () => schliesseDialog('overlay-fisch');
}

/**
 * Zeigt einen Level-Meilenstein (jedes fünfte Level) mit der dabei
 * gefundenen Ausrüstung – farblich nach deren Seltenheit abgesetzt, damit
 * der Fund sofort als etwas Besonderes erkennbar ist.
 */
export function zeigeLevelMeilenstein(ergebnis, beimSchliessen) {
  const dialog = $('dialog-level');
  const item = ergebnis.ausruestung;
  dialog.className = `dialog dialog-entdeckung ${item ? `seltenheit-${item.seltenheit}` : ''}`;
  $('level-symbol').textContent = item ? item.symbol : '⭐';
  $('level-seltenheit').textContent = item ? SELTENHEITEN[item.seltenheit]?.label ?? item.seltenheit : '';
  $('level-titel').textContent = `Level ${ergebnis.level} erreicht!`;
  $('level-text').textContent = item
    ? `Dazu gefunden: „${item.name}“ – ${item.text} Außerdem: +1 Skillpunkt.`
    : 'Ein Meilenstein, ganz ohne besonderen Fund diesmal – aber +1 Skillpunkt.';
  zeigeDialog('overlay-level');
  $('level-ok').onclick = () => {
    schliesseDialog('overlay-level');
    beimSchliessen?.();
  };
}

/** Zeigt, was eine abgeholte Expedition eingebracht hat. */
export function zeigeExpeditionErgebnis(def, ergebnis, beimSchliessen) {
  $('expedition-erg-symbol').textContent = def?.symbol ?? '🚣';
  $('expedition-erg-bl').textContent = `+${zahl(ergebnis.bl)} BL`;

  const teile = [];
  if (ergebnis.kiste) {
    const kistenTyp = KISTEN_TYPEN.find((k) => k.id === ergebnis.kiste);
    teile.push(`eine ${kistenTyp?.name ?? 'Kiste'} ${kistenTyp?.symbol ?? '📦'}`);
  }
  if (ergebnis.fisch) {
    teile.push(`„${ergebnis.fisch.name}“ ${ergebnis.fisch.symbol} fürs Aquarium`);
  }
  if (ergebnis.ausruestung) {
    teile.push(`„${ergebnis.ausruestung.name}“ ${ergebnis.ausruestung.symbol} direkt gefunden`);
  }
  $('expedition-erg-fund').textContent =
    teile.length > 0 ? `Außerdem dabei: ${teile.join(' und ')}.` : 'Diesmal ohne zusätzlichen Fund.';

  zeigeDialog('overlay-expedition');
  $('expedition-erg-ok').onclick = () => {
    schliesseDialog('overlay-expedition');
    beimSchliessen?.();
  };
}

/** Aktueller Drehwinkel des Glücksrads – über Aufrufe hinweg, damit jede
 *  neue Drehung sichtbar weiterläuft statt zurückzuspringen. */
let gluecksradGesamtwinkel = 0;

/**
 * Dreht das Glücksrad optisch auf das per Index vorgegebene Feld – der
 * eigentliche Zufall ist zu diesem Zeitpunkt in spiel.js schon gefallen,
 * hier geht es nur noch um den Weg dorthin. `beimFertig` wird aufgerufen,
 * sobald das Rad steht (Belohnung erst dann zeigen, nicht vorher).
 */
const GLUECKSRAD_SPIN_MS = 3600;
const GLUECKSRAD_SPIN_MS_REDUZIERT = 400;
const GLUECKSRAD_TICKS = 22;

/**
 * @param {number} segmentIndex
 * @param {{beimTick?: () => void, beimFertig?: () => void}} [optionen]
 *   `beimTick` wird während der Drehung mehrfach mit abnehmendem Abstand
 *   aufgerufen (nachlassendes Rad-Ticken), `beimFertig` einmal am Ende.
 */
export function spinneGluecksrad(segmentIndex, optionen = {}) {
  const { beimTick, beimFertig } = optionen;
  const rad = $('gluecksrad');
  const segAnzahl = GLUECKSRAD_SEGMENTE.length;
  const segWinkel = 360 / segAnzahl;
  const mitteWinkel = segmentIndex * segWinkel + segWinkel / 2;
  // Nicht immer exakt mittig treffen – ein kleiner Zufallsversatz innerhalb
  // des Feldes wirkt weniger mechanisch.
  const jitter = (Math.random() * 2 - 1) * (segWinkel * 0.3);
  // Der Zeiger sitzt fest oben (0°); das Rad muss so weit gedreht werden,
  // dass die Feldmitte dort ankommt.
  const zielImKreis = (360 - mitteWinkel + jitter + 360) % 360;

  const vollrunden = WENIGER_BEWEGUNG ? 1 : 5;
  let ziel = Math.floor(gluecksradGesamtwinkel / 360) * 360 + vollrunden * 360 + zielImKreis;
  while (ziel <= gluecksradGesamtwinkel) ziel += 360;
  gluecksradGesamtwinkel = ziel;

  const dauerMs = WENIGER_BEWEGUNG ? GLUECKSRAD_SPIN_MS_REDUZIERT : GLUECKSRAD_SPIN_MS;
  rad.style.transition = `transform ${dauerMs}ms cubic-bezier(0.17, 0.89, 0.32, 1.1)`;
  rad.style.transform = `rotate(${gluecksradGesamtwinkel}deg)`;

  if (beimTick && !WENIGER_BEWEGUNG) {
    // Nachlassendes Ticken: am Anfang dicht (Rad dreht schnell), zum Ende hin
    // auseinandergezogen (Rad wird langsamer) – quadratische Ease-out-Kurve,
    // passend zur CSS-Transition des Rads selbst.
    for (let i = 1; i <= GLUECKSRAD_TICKS; i++) {
      const anteil = 1 - Math.pow(1 - i / GLUECKSRAD_TICKS, 2);
      setTimeout(beimTick, anteil * dauerMs);
    }
  }

  let ausgefuehrt = false;
  const fertig = () => {
    if (ausgefuehrt) return;
    ausgefuehrt = true;
    rad.removeEventListener('transitionend', fertig);
    beimFertig?.();
  };
  rad.addEventListener('transitionend', fertig);
  // Netz, falls transitionend aus irgendeinem Grund nicht feuert (z. B. Tab
  // im Hintergrund gedrosselt).
  setTimeout(fertig, dauerMs + 200);
}

export function zeigeWillkommen(ertrag, sekunden, abgeschnitten, aufVerdoppeln) {
  const text = $('willkommen-text');
  if (ertrag > 0) {
    text.textContent =
      `Deine Station hat in ${dauer(sekunden)} weitergearbeitet und ${zahl(ertrag)} BL gesammelt.` +
      (abgeschnitten ? ' Länger als vier Stunden sammelt sie nicht von allein.' : '');
  } else {
    text.textContent = 'Deine Station wartet auf dich. Tippe, um zu sammeln.';
  }
  const knopf = $('willkommen-verdoppeln');
  knopf.hidden = ertrag <= 0;
  knopf.onclick = () => aufVerdoppeln?.(ertrag);
  zeigeDialog('overlay-willkommen');
}

/** Der einmalige Marianengraben-Moment: großer Dialog mit ein paar Eckdaten der Reise bisher. */
export function zeigeMarianengraben(zustand, beimSchliessen) {
  const liste = $('marianengraben-werte');
  liste.textContent = '';
  const werte = [
    ['Gesamte Ausbeute', `${zahl(zustand.gesamtGesamt)} BL`],
    ['Tiefster Punkt', `${ganzzahl(zustand.maxTiefe)} m`],
    ['Auftauchen', ganzzahl(zustand.aufstiege)],
    ['Spielzeit', dauer(zustand.spielzeit)],
  ];
  for (const [bezeichnung, wert] of werte) {
    const dt = document.createElement('dt');
    dt.textContent = bezeichnung;
    const dd = document.createElement('dd');
    dd.textContent = wert;
    liste.append(dt, dd);
  }
  zeigeDialog('overlay-marianengraben');
  $('marianengraben-ok').onclick = () => {
    schliesseDialog('overlay-marianengraben');
    beimSchliessen?.();
  };
}

export function fuelleMenue(zustand, werte) {
  const liste = $('menue-werte');
  liste.textContent = '';
  for (const [bezeichnung, wert] of werte) {
    const dt = document.createElement('dt');
    dt.textContent = bezeichnung;
    const dd = document.createElement('dd');
    dd.textContent = wert;
    liste.append(dt, dd);
  }
}
