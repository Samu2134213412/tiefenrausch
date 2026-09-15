/**
 * Zahlenaufbereitung für die Anzeige.
 *
 * Idle-Spiele erreichen schnell Größenordnungen, die als Ziffernfolge
 * unlesbar werden. Deutsche Kurzformen (Mio., Mrd., Bio.) sind für die
 * meisten Spielerinnen und Spieler vertrauter als 1.2e15.
 */

const KURZFORMEN = [
  '', 'K', ' Mio.', ' Mrd.', ' Bio.', ' Brd.', ' Trl.', ' Trd.',
  ' Qua.', ' Qrd.', ' Qui.', ' Qid.', ' Sex.', ' Sed.', ' Sep.',
];

/**
 * @param {number} wert
 * @param {number} [nachkomma] erzwungene Nachkommastellen
 */
export function zahl(wert, nachkomma) {
  if (!Number.isFinite(wert)) return '∞';
  const vorzeichen = wert < 0 ? '-' : '';
  let betrag = Math.abs(wert);

  if (betrag < 1000) {
    // Kleine Zahlen: bis 10 mit einer Nachkommastelle, darüber ganzzahlig.
    const stellen = nachkomma ?? (betrag < 10 && betrag % 1 !== 0 ? 1 : 0);
    return vorzeichen + betrag.toLocaleString('de-DE', {
      minimumFractionDigits: stellen,
      maximumFractionDigits: stellen,
    });
  }

  let stufe = 0;
  while (betrag >= 1000 && stufe < KURZFORMEN.length - 1) {
    betrag /= 1000;
    stufe++;
  }

  if (stufe >= KURZFORMEN.length - 1 && betrag >= 1000) {
    return vorzeichen + wert.toExponential(2).replace('.', ',');
  }

  // Drei bedeutsame Stellen wirken ruhiger als eine feste Nachkommazahl.
  const stellen = nachkomma ?? (betrag < 10 ? 2 : betrag < 100 ? 1 : 0);
  return (
    vorzeichen +
    betrag.toLocaleString('de-DE', {
      minimumFractionDigits: stellen,
      maximumFractionDigits: stellen,
    }) +
    KURZFORMEN[stufe]
  );
}

/** Ganzzahlige Anzeige mit Tausenderpunkten, z. B. für Tiefenangaben. */
export function ganzzahl(wert) {
  return Math.floor(wert).toLocaleString('de-DE');
}

/** Zeitspanne in lesbarer Form: „3 Std. 12 Min.“ */
export function dauer(sekunden) {
  const s = Math.max(0, Math.floor(sekunden));
  const tage = Math.floor(s / 86400);
  const stunden = Math.floor((s % 86400) / 3600);
  const minuten = Math.floor((s % 3600) / 60);
  const rest = s % 60;

  if (tage > 0) return `${tage} Tg. ${stunden} Std.`;
  if (stunden > 0) return `${stunden} Std. ${minuten} Min.`;
  if (minuten > 0) return `${minuten} Min. ${rest} Sek.`;
  return `${rest} Sek.`;
}

/** Kompakte Uhrzeit-Form für laufende Boni: „9:59“ */
export function uhr(sekunden) {
  const s = Math.max(0, Math.floor(sekunden));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}
