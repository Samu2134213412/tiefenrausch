/**
 * Monetarisierung – bewusst als austauschbare Schicht.
 *
 * Das Spiel ruft hier nur `belohnungsvideo()` und `kaufeWerbefrei()` auf und
 * bekommt ein Versprechen zurück. Ob dahinter echte Werbung von AdMob steckt
 * oder die Übungsfassung, weiß der Rest des Spiels nicht.
 *
 * Warum so gebaut:
 * Für echte Werbung und echte Käufe braucht man ein Google-Play-Entwicklerkonto
 * und ein AdMob-Konto. Beides setzt Volljährigkeit bzw. die Mitwirkung eines
 * Erziehungsberechtigten voraus. Bis das eingerichtet ist, läuft das Spiel mit
 * der Übungsfassung vollständig – und wenn es so weit ist, wird an genau einer
 * Stelle umgeschaltet, ohne die Spiellogik anzufassen.
 *
 * Einbau der echten Werbung später (Stichworte für die Umsetzung):
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

let aktiv = nativeBruecke() ? echteSchnittstelle : uebungsfassung;

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
