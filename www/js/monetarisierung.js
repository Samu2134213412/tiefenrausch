/**
 * Monetarisierung – bewusst als austauschbare Schicht.
 *
 * Das Spiel ruft hier nur `belohnungsvideo()` und `kaufeWerbefrei()` auf und
 * bekommt ein Versprechen zurück. Ob dahinter echte Werbung von AdMob steckt,
 * das Poki-SDK oder die Übungsfassung, weiß der Rest des Spiels nicht.
 *
 * Warum so gebaut:
 * Für echte Werbung über AdMob braucht man ein Google-Play-Entwicklerkonto,
 * das Volljährigkeit bzw. die Mitwirkung eines Erziehungsberechtigten
 * voraussetzt. Ein Poki-Konto (developers.poki.com) ist niedrigschwelliger,
 * aber auch das muss ein Mensch selbst anlegen und einreichen – das kann
 * dieser Code nicht vorwegnehmen. Bis eine der beiden Anbindungen aktiv ist,
 * läuft das Spiel mit der Übungsfassung vollständig.
 *
 * Erkennung zur Laufzeit: Läuft das Spiel im Poki-Iframe (`window.PokiSDK`
 * vorhanden), wird Poki genutzt. Sonst, falls in der nativen App mit AdMob
 * (Capacitor), wird AdMob genutzt. Sonst die Übungsfassung.
 *
 * Einbau von AdMob später (Stichworte):
 *   1. npm i @capacitor-community/admob
 *   2. AdMob-Konto anlegen, App-ID und Anzeigenblock-IDs eintragen
 *   3. unten in `echteSchnittstelle` die Aufrufe einsetzen
 *   4. Hinweis: Bei Apps, die sich auch an Kinder richten, gelten besondere
 *      Regeln (Familienrichtlinien von Google Play, altersgerechte Werbung).
 */

const WERBE_ID_BELOHNUNG = 'ca-app-pub-0000000000000000/0000000000'; // Platzhalter
const KAUF_ID_WERBEFREI = 'tiefenrausch.werbefrei';

/** Erkennt, ob wir in der nativen App mit echter Anbindung laufen. */
function nativeBruecke() {
  const cap = globalThis.Capacitor;
  if (!cap?.isNativePlatform?.()) return null;
  if (!globalThis.AdMob) return null;
  return { cap, admob: globalThis.AdMob };
}

/* ------------------------------------------------------------------ */
/* Übungsfassung – funktioniert überall, kostet nichts, zeigt nichts   */
/* ------------------------------------------------------------------ */

const uebungsfassung = {
  name: 'Übungsfassung',

  async belohnungsvideo({ beiAnzeige } = {}) {
    // Zeitverzögerung, damit sich der Ablauf im Spiel echt anfühlt und die
    // Oberfläche denselben Zustand durchläuft wie später mit echter Werbung.
    beiAnzeige?.();
    await new Promise((f) => setTimeout(f, 1200));
    return { gesehen: true, uebung: true };
  },

  async kaufeWerbefrei() {
    return { gekauft: false, uebung: true, grund: 'Kauf ist in der Übungsfassung nicht möglich' };
  },

  async zeigeBanner() {
    return false;
  },
};

/* ------------------------------------------------------------------ */
/* Poki – aktiv, sobald das Spiel im Poki-Iframe läuft                 */
/* ------------------------------------------------------------------ */

/** Erkennt, ob das Poki-SDK geladen und einsatzbereit ist. */
function pokiBruecke() {
  return globalThis.PokiSDK ?? null;
}

const pokiSchnittstelle = {
  name: 'Poki',

  async belohnungsvideo({ beiAnzeige } = {}) {
    const poki = pokiBruecke();
    if (!poki) return uebungsfassung.belohnungsvideo({ beiAnzeige });
    try {
      // Poki will vor jeder Werbeunterbrechung wissen, dass gerade nicht
      // aktiv gespielt wird - sonst zählt die Sitzung falsch.
      poki.gameplayStop?.();
      beiAnzeige?.();
      const gesehen = await poki.rewardedBreak();
      return { gesehen: Boolean(gesehen), uebung: false };
    } catch (fehler) {
      console.warn('Poki-Werbung nicht verfügbar:', fehler?.message ?? fehler);
      return { gesehen: true, uebung: false, ersatz: true };
    } finally {
      poki.gameplayStart?.();
    }
  },

  async kaufeWerbefrei() {
    // Poki-Spiele laufen ohne eigenes Bezahlsystem - Werbung gehört zum
    // Geschäftsmodell der Plattform und lässt sich dort nicht abschalten.
    return { gekauft: false, uebung: false, grund: 'Auf Poki nicht verfügbar' };
  },

  async zeigeBanner() {
    return false;
  },
};

/**
 * Zeigt eine Werbeunterbrechung an einem natürlichen Pausenpunkt (z. B.
 * beim Auftauchen). Außerhalb von Poki passiert einfach nichts - andere
 * Anbindungen kennen kein Äquivalent dazu, das ist bewusst Poki-exklusiv.
 */
export async function commercialBreak() {
  const poki = pokiBruecke();
  if (!poki) return;
  try {
    poki.gameplayStop?.();
    await poki.commercialBreak();
  } catch (fehler) {
    console.warn('Poki-Commercial-Break fehlgeschlagen:', fehler?.message ?? fehler);
  } finally {
    poki.gameplayStart?.();
  }
}

/* ------------------------------------------------------------------ */
/* Echte Anbindung – wird aktiv, sobald AdMob eingebunden ist          */
/* ------------------------------------------------------------------ */

const echteSchnittstelle = {
  name: 'AdMob',

  async belohnungsvideo({ beiAnzeige } = {}) {
    const bruecke = nativeBruecke();
    if (!bruecke) return uebungsfassung.belohnungsvideo({ beiAnzeige });
    try {
      await bruecke.admob.prepareRewardVideoAd({ adId: WERBE_ID_BELOHNUNG });
      beiAnzeige?.();
      const ergebnis = await bruecke.admob.showRewardVideoAd();
      return { gesehen: Boolean(ergebnis), uebung: false };
    } catch (fehler) {
      // Wenn keine Werbung geladen werden kann, darf das Spiel nicht stehen
      // bleiben. Die Belohnung wird in diesem Fall trotzdem gewährt – sonst
      // bestraft man Leute für eine schlechte Internetverbindung.
      console.warn('Werbung nicht verfügbar:', fehler?.message ?? fehler);
      return { gesehen: true, uebung: false, ersatz: true };
    }
  },

  async kaufeWerbefrei() {
    const bruecke = nativeBruecke();
    if (!bruecke) return uebungsfassung.kaufeWerbefrei();
    try {
      const kauf = await globalThis.CdvPurchase?.store?.order(KAUF_ID_WERBEFREI);
      return { gekauft: Boolean(kauf), uebung: false };
    } catch (fehler) {
      return { gekauft: false, uebung: false, grund: fehler?.message ?? 'Kauf fehlgeschlagen' };
    }
  },

  async zeigeBanner() {
    return false;
  },
};

/* ------------------------------------------------------------------ */

let aktiv = pokiBruecke() ? pokiSchnittstelle : nativeBruecke() ? echteSchnittstelle : uebungsfassung;

export function schnittstelle() {
  return aktiv;
}

export function istUebungsfassung() {
  return aktiv === uebungsfassung;
}

/** Nur für Tests: Schnittstelle austauschen. */
export function setzeSchnittstelle(neu) {
  aktiv = neu;
}

/**
 * Belohnungsvideo anzeigen.
 * @param {{beiAnzeige?: () => void}} [optionen]
 * @returns {Promise<{gesehen: boolean, uebung?: boolean, ersatz?: boolean}>}
 */
export function belohnungsvideo(optionen) {
  return aktiv.belohnungsvideo(optionen ?? {});
}

export function kaufeWerbefrei() {
  return aktiv.kaufeWerbefrei();
}

export const PLATZHALTER = { WERBE_ID_BELOHNUNG, KAUF_ID_WERBEFREI };
