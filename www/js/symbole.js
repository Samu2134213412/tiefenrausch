/**
 * Symbol-System: handgezeichnete SVG-Icons statt Emoji.
 *
 * Emoji sehen auf jedem Gerät anders aus, wirken beliebig und wie ein
 * Platzhalter statt wie gestaltet. Jedes Symbol hier ist ein selbst
 * gezeichneter Umriss (viewBox 0 0 24 24, füllt sich mit `currentColor` –
 * dieselbe Idee wie die handgezeichneten Kreaturen in kreaturen.js, nur als
 * kleines, flaches Icon statt als Canvas-Szene.
 *
 * Benutzung: `symbolMarkup('qualle')` liefert fertiges `<svg>…</svg>`-Markup
 * für innerHTML; `symbolSpanHtml('qualle', 'eintrag-symbol')` verpackt das
 * gleich in den gewohnten `<span class="…">`, wie es die Listen bisher mit
 * einem rohen Emoji-Zeichen gemacht haben – ein Aufruf ersetzt `${x.symbol}`.
 */

// Jeder Eintrag ist der INNERE Inhalt eines <svg viewBox="0 0 24 24">.
// Standard: eine einzige Füllung in currentColor. Ein paar Icons setzen
// zusätzlich eine feste Akzentfarbe für ein Detail (Auge, Glanzlicht),
// weil das an der Stelle klarer aussieht als alles einfarbig zu lassen.
const PFADE = {
  /* ---------------- Module ---------------- */
  qualle: `<path d="M12 4.2c-3.6 0-6.4 2.7-6.4 6.3 0 2.1 1 3.8 2.5 4.9.2.2.3.4.2.7l-.4 1.2c-.1.4.3.8.7.6l1-.4a.6.6 0 0 1 .5 0l.9.4c.4.2.8-.2.7-.6l-.4-1.2a.6.6 0 0 1 .2-.7c1.5-1.1 2.5-2.8 2.5-4.9 0-3.6-2.8-6.3-6-6.3Z"/>
    <path d="M8.5 18c.3.7.3 1.4 0 2.2M12 18c.3.9.3 1.8 0 2.7M15.5 18c-.3.7-.3 1.4 0 2.2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" fill="none"/>`,
  drohne: `<ellipse cx="12" cy="12" rx="9" ry="3.2"/><path d="M12 6.5a4 3 0 0 1 4 3H8a4 3 0 0 1 4-3Z"/><circle cx="12" cy="12" r="1.6" fill="#0b1e33"/>`,
  sonar: `<path d="M4 15c0-6 4.5-10.5 10.5-10.5" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    <path d="M4 15c2.8-4.6 7-7.5 11.8-7.6" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" opacity=".55"/>
    <circle cx="18.5" cy="6.5" r="1.6"/><path d="M3 19.5 15.5 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`,
  roboter: `<rect x="5" y="8" width="14" height="10" rx="3"/><rect x="9" y="4" width="6" height="4" rx="1.5"/>
    <circle cx="9.5" cy="13" r="1.5" fill="#0b1e33"/><circle cx="14.5" cy="13" r="1.5" fill="#0b1e33"/>
    <path d="M5 12H2.5M19 12h2.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`,
  farm: `<path d="M3 8h18M3 13h18M3 18h18M6 5v16M12 5v16M18 5v16" stroke="currentColor" stroke-width="1.4" opacity=".55"/>
    <circle cx="9" cy="10.5" r="1.3"/><circle cx="15.5" cy="15.5" r="1.3"/><circle cx="6.5" cy="16" r="1.1"/><circle cx="17" cy="9" r="1.1"/>`,
  schlot: `<path d="M9 21 10 9c.2-2 1.7-4 2-6 .3 2 1.8 4 2 6l1 12Z"/>
    <path d="M11 5.5c.3-1 .3-2 0-3M13.3 5.8c.4-.9.5-1.9.3-3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" fill="none" opacity=".7"/>`,
  riff: `<path d="M7 21c-1-3 .5-5 0-8 2 1 2.5-1 2-4 2 1.5 3.5 0 3-3 2.5 2 4 1 3.5-2 2.5 2 2 5 1 8Z"/>`,
  station: `<path d="M4 20a8 5 0 0 1 16 0Z"/><rect x="9.5" y="7" width="5" height="6" rx="1"/><circle cx="12" cy="5" r="1.6"/><path d="M12 6.6V9" stroke="currentColor" stroke-width="1.3"/>`,
  leviathan: `<path d="M2.5 13c3-3.5 7-5 11-4.3 2.6.5 5 2 8 1.8-1.2 1.5-3 2.2-3 2.2s1.8.9 3 2.4c-3 0-5.4 1.5-8 2-4 .8-8-.6-11-4.1Z"/>
    <circle cx="8" cy="12" r=".9" fill="#0b1e33"/><path d="M16 9.5 21 6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" fill="none"/>`,
  raucher: `<path d="M10 21 10.8 8.5c.1-1.6 2.3-1.6 2.4 0L14 21Z"/>
    <circle cx="9" cy="6" r=".8" opacity=".6"/><circle cx="12" cy="4" r=".9" opacity=".8"/><circle cx="14.5" cy="6.5" r=".7" opacity=".5"/>`,

  /* ---------------- Verbesserungen / Wirkungen ---------------- */
  griff: `<path d="M6 21c-1.5-3 0-6 2-8.5C6.5 10.5 6 8 7.5 6c.8 2 2 3 3.5 3.5C10 7 11 5 13 4c-.3 2.3.6 4 2 5.2 2-.6 3.7.2 4.5 2-2-.2-3.3.7-4 2.3 2.3.6 3.5 2.3 3.5 4.5-1.7-1.4-3.4-1.6-5-.8-1 2.3-3 3.3-5 3-1.6-.3-2.3-1.2-3-1.7Z"/>`,
  resonanz: `<path d="M4 10v4h3l4 4V6L7 10Z"/><path d="M15 8.5c1.3 1 2 2.2 2 3.5s-.7 2.5-2 3.5M18 6c2 1.5 3.2 3.5 3.2 6s-1.2 4.5-3.2 6" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round"/>`,
  gluehbirne: `<path d="M12 3.5a5.8 5.8 0 0 1 3.2 10.6c-.5.4-.8 1-.8 1.6v.8H9.6v-.8c0-.6-.3-1.2-.8-1.6A5.8 5.8 0 0 1 12 3.5Z"/><rect x="9.6" y="18" width="4.8" height="2.4" rx="1"/>`,
  gear: `<path d="M12 3.5 12.9 1.6l1.9.4.4 2c.7.2 1.4.6 2 1l1.9-.7 1.2 1.5-1.1 1.7c.4.6.6 1.3.8 2l2 .5v2l-2 .5c-.2.7-.4 1.4-.8 2l1.1 1.7-1.2 1.5-1.9-.7c-.6.4-1.3.8-2 1l-.4 2-1.9.4-.9-1.9h-1.8l-.9 1.9-1.9-.4-.4-2a7 7 0 0 1-2-1l-1.9.7-1.2-1.5 1.1-1.7c-.4-.6-.6-1.3-.8-2l-2-.5v-2l2-.5c.2-.7.4-1.4.8-2L1.9 5.8 3.1 4.3l1.9.7c.6-.4 1.3-.8 2-1l.4-2 1.9-.4.9 1.9Z" opacity="0"/>
    <circle cx="12" cy="12" r="3.4"/>
    <path d="M12 4.2v2.3M12 17.5v2.3M4.2 12h2.3M17.5 12h2.3M6.5 6.5l1.6 1.6M15.9 15.9l1.6 1.6M17.5 6.5l-1.6 1.6M8.1 15.9l-1.6 1.6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`,
  karte: `<path d="M9 3 3 5.2v15.6L9 18l6 2.8 6-2.2V3l-6 2.8Z" opacity=".18"/>
    <path d="M9 3v15.8M15 5.8v15" stroke="currentColor" stroke-width="1.5"/>
    <path d="M9 3 3 5.2v15.6L9 18l6 2.8 6-2.2V3l-6 2.8-6-2.8Z" fill="none" stroke="currentColor" stroke-width="1.5"/>`,
  netz: `<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.4"/>
    <path d="M12 3v18M3 12h18M5.3 5.3l13.4 13.4M18.7 5.3 5.3 18.7" stroke="currentColor" stroke-width="1.2" opacity=".7"/>
    <circle cx="12" cy="3" r="1.2"/><circle cx="12" cy="21" r="1.2"/><circle cx="3" cy="12" r="1.2"/><circle cx="21" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.4"/>`,

  /* ---------------- Tippen / Erfolge ---------------- */
  tipp: `<path d="M9 21v-7.3L6.6 11a1.6 1.6 0 1 1 2.3-2.3L11 10.8V4a1.3 1.3 0 1 1 2.6 0v5.6l.6-.3a1.4 1.4 0 0 1 2 1.6l-.4 1.3 1-.3a1.3 1.3 0 0 1 1.6 1.6l-1 3.3c-.6 2.2-2.6 4.2-4.8 4.2Z"/>`,
  wrench: `<path d="M20.3 7.4a4.6 4.6 0 0 1-5.9 5.9L7.8 19.9a1.8 1.8 0 0 1-2.6-2.6l6.6-6.6a4.6 4.6 0 0 1 5.9-5.9l-3 3 1.6 1.6Z"/>`,
  fabrik: `<path d="M3 20V11l4 2.6V11l4 2.6V9l6 4V6.5L21 9v11Z"/><rect x="3" y="20" width="18" height="1.4"/>`,
  welle: `<path d="M2 15c2-2 4-2 6 0s4 2 6 0 4-2 6 0 2-2 2-2v2c-2 2-4 2-6 0s-4-2-6 0-4 2-6 0-2 2-2 2Z"/>
    <path d="M2 19.5c2-1.6 4-1.6 6 0s4 1.6 6 0 4-1.6 6 0" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round" opacity=".6"/>`,
  buch: `<path d="M4 4.5c2.5-1 5-1 8 .5V19c-3-1.5-5.5-1.5-8-.5Z"/><path d="M20 4.5c-2.5-1-5-1-8 .5V19c3-1.5 5.5-1.5 8-.5Z"/>`,
  kette: `<rect x="3" y="9" width="8" height="6" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><rect x="13" y="9" width="8" height="6" rx="3" fill="none" stroke="currentColor" stroke-width="2"/>`,
  spirale: `<path d="M12 3a5 5 0 0 1 0 10 3.5 3.5 0 0 1 0-7 2 2 0 0 1 0 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M12 3a9 9 0 1 0 8.7 6.7" fill="none" stroke="currentColor" stroke-width="1.4" opacity=".5" stroke-linecap="round"/>`,
  funke: `<path d="M12 2 9 10l-6 2 6 2 3 8 3-8 6-2-6-2Z"/>`,
  glitzer: `<path d="M12 2c.3 3 1.5 4.2 4.5 4.5-3 .3-4.2 1.5-4.5 4.5-.3-3-1.5-4.2-4.5-4.5C10.5 6.2 11.7 5 12 2Z"/>
    <path d="M19 13c.2 1.7.9 2.4 2.6 2.6-1.7.2-2.4.9-2.6 2.6-.2-1.7-.9-2.4-2.6-2.6 1.7-.2 2.4-.9 2.6-2.6Z"/>
    <path d="M5.5 14c.2 1.3.7 1.8 2 2-1.3.2-1.8.7-2 2-.2-1.3-.7-1.8-2-2 1.3-.2 1.8-.7 2-2Z"/>`,
  angel: `<path d="M6 3c4 2 5 6 5 11" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
    <circle cx="6" cy="3" r="1.6"/>
    <path d="M11 14c1.6 0 2.6 1 2.6 2.4S12.6 19 11 19s-2.6-1-2.6-2.4c0-.8.4-1.5 1-2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M16 18.5c1 .6 2 .6 3-.3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`,
  stern: `<path d="M12 2.5 14.6 9l6.9.6-5.2 4.6L18 21l-6-3.7L6 21l1.7-6.8-5.2-4.6L9.4 9Z"/>`,
  boot: `<path d="M3 13h18l-2.3 5.6a2 2 0 0 1-1.9 1.4H7.2a2 2 0 0 1-1.9-1.4Z"/>
    <path d="M12 13V4M12 4c3 .3 5 1.8 6 4.5M12 6.5c-2 .3-3.5 1.5-4.3 3.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>`,
  wal: `<path d="M2.5 12.5c3-4 7.5-6 12-5 3 .6 6 2.7 7 4.5-1 .4-2 .3-2.8-.2.3 1 .1 2-.5 2.7-.9-.4-1.4-1.1-1.5-2-2 2.6-5.2 4-8.6 3.6-2.4-.3-4.4-1.5-5.6-3.6Z"/>
    <circle cx="8" cy="11.5" r=".8" fill="#0b1e33"/><path d="M12 5.5 12.8 8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" fill="none"/>`,
  truhe: `<path d="M4 10c0-3 1.5-5.5 8-5.5S20 7 20 10Z" opacity=".85"/><rect x="3" y="10" width="18" height="9" rx="1.5"/>
    <rect x="10" y="12.5" width="4" height="3" rx=".8" fill="#0b1e33"/>`,
  flamme: `<path d="M12 2c1 3-2 4-2 7a2 2 0 0 0 4 0c1 1 1.5 2.5 1.5 4a5.5 5.5 0 0 1-11 0C4.5 8 8 6 8 3c1.5 1 2 2.5 1.5 4C10.5 5.5 11.5 4 12 2Z"/>`,
  rad: `<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/>
    <circle cx="12" cy="12" r="2.2"/>
    <path d="M12 3v4.5M12 16.5V21M3 12h4.5M16.5 12H21M5.6 5.6l3.2 3.2M15.2 15.2l3.2 3.2M18.4 5.6l-3.2 3.2M8.8 15.2l-3.2 3.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`,
  auge: `<path d="M2 12S6 5 12 5s10 7 10 7-4 7-10 7S2 12 2 12Z"/>
    <circle cx="12" cy="12" r="3.4" fill="#0b1e33"/><circle cx="13" cy="11" r="1" fill="#8fd6ff"/>`,
  blitzriss: `<path d="M13 2 5 14h5l-2 8 9-13h-6Z"/>`,

  /* ---------------- Tiefsee-Bewohner (Logbuch & Aquarium) ---------------- */
  fisch: `<path d="M3 12c3-4 7-6 11-6 3 0 5.5 2.5 6.5 6-1 3.5-3.5 6-6.5 6-4 0-8-2-11-6Z"/>
    <path d="M14 12 21 8v8Z" opacity=".85"/><circle cx="7.5" cy="11" r="1" fill="#0b1e33"/>`,
  laterne: `<path d="M3 12c2.6-3.4 6-5 9.5-5 2.6 0 4.8 2.2 5.7 5-.9 2.8-3.1 5-5.7 5-3.5 0-6.9-1.6-9.5-5Z"/>
    <path d="M12 5.5 12 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="12" cy="2" r="1.4" fill="#ffd9a0"/>
    <circle cx="7.5" cy="11.5" r="1" fill="#0b1e33"/>`,
  kalmar: `<ellipse cx="12" cy="8.5" rx="4" ry="6.3"/>
    <path d="M8.2 5.5 5.8 3.8M15.8 5.5 18.2 3.8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" fill="none"/>
    <path d="M8.6 14 7 20.5M10.3 14.6 9.6 21M12 14.8 12 21.3M13.7 14.6 14.4 21M15.4 14 17 20.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>
    <circle cx="10.2" cy="7.5" r=".8" fill="#0b1e33"/><circle cx="13.8" cy="7.5" r=".8" fill="#0b1e33"/>`,
  vampirtinte: `<path d="M12 3c3 0 5.4 2.6 5.4 6.2 0 2-.8 3.7-2.2 4.9.4 1.6 1.6 2.6 3.3 2.9-2.3.9-4.4.4-5.9-1.2a7 7 0 0 1-1.2.1c-3 0-5.4-2.9-5.4-6.7C6 5.6 8.4 3 12 3Z"/>
    <circle cx="10" cy="9" r=".9" fill="#ff7a6b"/><circle cx="14" cy="9" r=".9" fill="#ff7a6b"/>`,
  angler: `<path d="M3 13c2.5-3.6 6-5.5 9-5.5 3.3 0 5.6 2.5 6.6 5.5-1 3-3.3 5.5-6.6 5.5-3 0-6.5-1.9-9-5.5Z"/>
    <path d="M11 7.2C10.6 5 9.4 3.6 8 3" stroke="currentColor" stroke-width="1.3" fill="none" stroke-linecap="round"/><circle cx="8" cy="3" r="1.1" fill="#ffd9a0"/>
    <circle cx="7.5" cy="12" r="1" fill="#0b1e33"/><path d="M18 13v3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>`,
  pelikanaal: `<path d="M3 9c5-1.5 10-1 13 1 2 1.3 3 3 2 4.6-1 1.6-3.4 1.4-5-.2 1 1.8.7 3.6-1 4.6-2.2 1.3-5-.3-5.6-3-2-.4-3.4-2.3-3.4-4.4 0-1 .3-1.9 1-2.6Z"/>
    <circle cx="6" cy="10" r=".9" fill="#0b1e33"/>`,
  seestern: `<path d="M12 2 14 9.2 21 8l-5 5.2 2 6.8-6-3.8-6 3.8 2-6.8-5-5.2 7-1.2Z"/>`,
  krake: `<circle cx="12" cy="9" r="5.5"/><circle cx="10" cy="8" r=".9" fill="#0b1e33"/><circle cx="14" cy="8" r=".9" fill="#0b1e33"/>
    <path d="M4 12c-1 2.5-.6 4.6.5 6M7 14c-.8 2.5-.2 4.6 1 6.2M10.5 15c-.4 2.6.3 4.6 1.5 6M13.5 15c.4 2.6-.3 4.6-1.5 6M17 14c.8 2.5.2 4.6-1 6.2M20 12c1 2.5.6 4.6-.5 6" stroke="currentColor" stroke-width="1.7" fill="none" stroke-linecap="round"/>`,
  hai: `<path d="M2 14c4-1.5 9-2.4 14-1.6 2.4.4 4.6 1.4 6 2.4-1.6.8-3.6 1.3-5.6 1.4C13 18 8 18.6 2 14Z"/>
    <path d="M11 12.4 12.5 6 15 12" fill="currentColor"/><circle cx="6.5" cy="14" r=".9" fill="#0b1e33"/>`,
  thermal: `<path d="M12 21c-3 0-5-2-5-4.6 0-2.4 1.8-3.6 2.6-5.6.5 1 1.5 1.4 1.9.4C11 9 11.6 7 12.8 5.5c.2 1.6 1 2.4 2 2 .3 1.6 1.4 2.6 1.2 4.4C17.6 12.8 19 14.4 19 16.4 19 19 15 21 12 21Z"/>`,
  drache: `<path d="M2 15c2-3 5-4.5 8-3.6 1-1.4 2.6-2 4.4-1.6-.6.8-.7 1.6-.3 2.4 1.8.4 3.2 1.7 3.9 3.4-1.6-.4-2.8 0-3.6 1.2-2.6 1.6-6 1.6-8.7-.4-1.4.3-2.6 1-3.7 2Z"/>
    <circle cx="16.5" cy="12" r=".8" fill="#ff7a6b"/>`,
  abgrund: `<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5" fill="#020a14"/>`,
  mond: `<path d="M15 3a9 9 0 1 0 6 15.8A9.5 9.5 0 0 1 15 3Z"/>`,
  schwarmhering: `<path d="M2 9c2.4-1.6 5-2 7-1.2-.6 1-.6 2 0 3-2 .8-4.6.4-7-1.8Z" opacity=".7"/>
    <path d="M7 14c2.6-2 6-2.6 9-1.6-1 1.3-1 2.7 0 4-3 1-6.4.4-9-2.4Z"/>
    <path d="M13 19c2-1.3 4.4-1.7 6.6-1-.7 1-.7 2 0 3-2.2.6-4.6.2-6.6-2Z" opacity=".55"/>`,
  seepferdchen: `<path d="M9 21c-1.8 0-3-1.3-3-3 0-1.4.8-2.2 1.8-3-1-.6-1.6-1.6-1.6-2.8 0-1.4.9-2.3 2-2.8-1-1-1.5-2.2-1.2-3.6.4-2 2.3-3.3 4.4-3 2.2.4 3.5 2.3 3.4 4.4-.05 1.2-.5 2-1.1 2.7.8.2 1.6.8 2 1.7.6 1.4 0 3-1.3 3.7.5.5.8 1.2.8 2 0 1.8-1.5 3.2-3.3 3.2Z"/>
    <circle cx="11.5" cy="6" r=".8" fill="#0b1e33"/>`,
  languste: `<ellipse cx="13" cy="12" rx="7" ry="3.6"/>
    <path d="M6.5 12 2 10M6.5 12 2 14M4 8.5 6 11M4 15.5 6 13" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" fill="none"/>
    <path d="M18 9.5c1.6-.6 3-.3 4 .8M18 14.5c1.6.6 3 .3 4-.8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" fill="none"/>`,
  schildkroete: `<ellipse cx="12" cy="13" rx="7.5" ry="6"/>
    <path d="M12 8v10M8 10l8 6M16 10l-8 6" stroke="#0b1e33" stroke-width="1" opacity=".5"/>
    <path d="M4.5 11 1 9.5M4.5 15 1 16.5M19.5 11 23 9.5M19.5 15 23 16.5M9 19l-1 3M15 19l1 3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
    <circle cx="12" cy="7" r="2" fill="currentColor"/>`,
  muraene: `<path d="M2 6c5 0 8 2.4 10 5.4C14 14 11 16.4 6 16.4c1.6-1 2.2-2.4 1.6-4C5 13 3 11.4 2 9Z"/>
    <circle cx="4.5" cy="8" r=".8" fill="#0b1e33"/>
    <path d="M11.5 12c3 0 5.6.9 7.5 2.6-1.9 1.6-4.5 2.6-7.5 2.6" fill="none" stroke="currentColor" stroke-width="1.6" opacity=".6"/>`,
  mantarochen: `<path d="M12 6c4.5 1 8 3.6 9.5 7-3-1.2-5.7-1-7.3.6.6 2 .2 4-1.2 5.4-1.4-1.4-1.8-3.4-1.2-5.4-1.6-1.6-4.3-1.8-7.3-.6C6 9.6 9.5 7 12 6Z"/>
    <path d="M12 6 12 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>`,
  perlenauster: `<path d="M4 13c0-4.5 3.6-8 8-8s8 3.5 8 8c-3 1.5-5.5 2-8 2s-5-.5-8-2Z"/>
    <path d="M4 13c1.6 3.2 4.5 5 8 5s6.4-1.8 8-5" fill="none" stroke="currentColor" stroke-width="1.4" opacity=".6"/>
    <circle cx="12" cy="12.5" r="2.2" fill="#ffd9a0"/>`,
  nautilus: `<path d="M12 3a9 9 0 1 1-6.4 15.4 6.5 6.5 0 1 1 4.6-11A4.5 4.5 0 1 1 7 10.8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`,
  kugelfisch: `<circle cx="12" cy="12" r="7"/>
    <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.5 5.5l1.4 1.4M17.1 17.1l1.4 1.4M18.5 5.5l-1.4 1.4M6.9 17.1l-1.4 1.4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
    <circle cx="9.5" cy="10.5" r="1" fill="#0b1e33"/>`,
  zitterrochen: `<ellipse cx="12" cy="12" rx="8" ry="6"/><path d="M12 18 12 22" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M9.5 9 8 12l1.8.2-1 2.8 3.7-4.4-2-.2Z" fill="#ffd9a0"/>`,

  /* ---------------- Ausrüstung / Köder ---------------- */
  wurm: `<path d="M3 18c3 2 5-1 3.4-3.3C4.8 12.4 6.6 10 9 11.7c2.7 2 5-1.4 3-3.7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>`,
  glitzerkoeder: `<ellipse cx="12" cy="12" rx="4" ry="6" transform="rotate(20 12 12)"/>
    <path d="M12 2c.2 2 1 2.8 3 3-2 .2-2.8 1-3 3-.2-2-1-2.8-3-3 2-.2 2.8-1 3-3Z"/>`,
  flaeschchen: `<path d="M10 2h4v4l3.4 6.6c1 2 -.4 4.4-2.7 4.4H9.3c-2.3 0-3.7-2.4-2.7-4.4L10 6Z"/>
    <rect x="9.5" y="2" width="5" height="1.6" fill="#0b1e33"/><circle cx="12" cy="16" r="1.3" fill="#8fd6ff"/>`,
  essenz: `<path d="M12 3c3 4 6 7.4 6 10.8a6 6 0 1 1-12 0C6 10.4 9 7 12 3Z"/>
    <path d="M9 14c0 1.8 1.3 3 3 3" fill="none" stroke="#0b1e33" stroke-width="1.3" stroke-linecap="round" opacity=".5"/>`,

  /* ---------------- Kisten & Gefäße ---------------- */
  kiste: `<path d="M3.5 9.5 12 6l8.5 3.5V18l-8.5 3.5L3.5 18Z" opacity=".85"/>
    <path d="M3.5 9.5 12 13l8.5-3.5M12 13v8.5" stroke="#0b1e33" stroke-width="1.1" opacity=".55" fill="none"/>`,
  geschenk: `<rect x="4" y="10" width="16" height="10" rx="1"/><rect x="3" y="7" width="18" height="4" rx="1"/>
    <path d="M12 7v13" stroke="#0b1e33" stroke-width="1.4" opacity=".5"/>
    <path d="M12 7c-1-3-3.5-4-5-2.5-1 1 0 2.5 1.5 2.5Zm0 0c1-3 3.5-4 5-2.5 1 1 0 2.5-1.5 2.5Z"/>`,
  diamant: `<path d="M4 9 8 3h8l4 6-8 12Z"/><path d="M4 9h16M8 3l1.5 6L12 21l2.5-12L16 3" stroke="#0b1e33" stroke-width="1" opacity=".45" fill="none"/>`,
  tropfen: `<path d="M12 2c3.4 4.6 6 8.6 6 12a6 6 0 1 1-12 0c0-3.4 2.6-7.4 6-12Z"/><path d="M9.5 15c0 1.7 1.1 2.8 2.5 3" stroke="#0b1e33" stroke-width="1.2" opacity=".4" fill="none" stroke-linecap="round"/>`,

  /* ---------------- Perlen-Shop ---------------- */
  rakete: `<path d="M12 2c3 2.4 4.5 6 4.5 10 0 2-.5 3.6-1.3 5l-3.2 3-3.2-3c-.8-1.4-1.3-3-1.3-5 0-4 1.5-7.6 4.5-10Z"/>
    <circle cx="12" cy="9.5" r="1.8" fill="#0b1e33"/>
    <path d="M7.5 15c-2 0-3.5 1.5-3.5 4 2-.5 3.3-1.2 4-2.4M16.5 15c2 0 3.5 1.5 3.5 4-2-.5-3.3-1.2-4-2.4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
  atemzug: `<path d="M2 9c2-1.2 4-1.2 6 0s4 1.2 6 0 4-1.2 6 0" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    <path d="M2 14c2-1.2 4-1.2 6 0s4 1.2 6 0 4-1.2 6 0" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".6"/>
    <path d="M2 19c2-1.2 4-1.2 6 0s4 1.2 6 0 4-1.2 6 0" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".3"/>`,
  klee: `<path d="M12 12C9 9 9 4 12 4s3 5 0 8Zm0 0C9 15 4 15 4 12s5-3 8 0Zm0 0c3 3 3 8 0 8s-3-5 0-8Zm0 0c3-3 8-3 8 0s-5 3-8 0Z"/>
    <path d="M12 12v9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`,

  /* ---------------- Sonstige Oberfläche ---------------- */
  kompass: `<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.6"/>
    <path d="M15 9 13 13 9 15l2-4Z"/>`,
  pokal: `<path d="M7 4h10v3a5 5 0 0 1-10 0Z"/><path d="M5 5h2v2a3 3 0 0 1-3-3Zm14 0h-2v2a3 3 0 0 0 3-3Z"/>
    <path d="M10 14h4v2.5h-4Z"/><path d="M8 20h8v1.4H8Z"/><path d="M10.5 16.5h3v3.5h-3Z"/>`,
  haus: `<path d="M4 12 12 5l8 7v7.5a1 1 0 0 1-1 1h-4.5V15h-5v5.5H5a1 1 0 0 1-1-1Z"/>`,
  pin: `<path d="M12 2a6.5 6.5 0 0 1 6.5 6.5c0 4.8-6.5 13-6.5 13S5.5 13.3 5.5 8.5A6.5 6.5 0 0 1 12 2Z"/><circle cx="12" cy="8.5" r="2.4" fill="#0b1e33"/>`,
  warnung: `<path d="M12 3 22 20H2Z"/><rect x="11.1" y="9.5" width="1.8" height="5.5" rx=".9" fill="#0b1e33"/><circle cx="12" cy="17" r="1.1" fill="#0b1e33"/>`,
  ton: `<path d="M4 9v6h4l5 4V5L8 9Z"/><path d="M16 9c1 1 1.6 2 1.6 3s-.6 2-1.6 3M18.3 6.7c1.8 1.6 2.9 3.5 2.9 5.3s-1.1 3.7-2.9 5.3" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>`,
  vibration: `<rect x="8" y="3" width="8" height="18" rx="2"/>
    <path d="M4 8v8M20 8v8M1.5 10v4M22.5 10v4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`,
  menue: `<path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`,
  blase: `<path d="M17 8.5a5 5 0 1 1-5-5c.4 0 .7 0 1 .1a3 3 0 0 0 4 4c.1.3.1.6.1 1Z"/>
    <circle cx="14.5" cy="6" r="1" fill="#fff" opacity=".7"/>`,

  /* ---------------- Platzhalter ---------------- */
  unbekannt: `<path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Z" opacity=".18"/>
    <path d="M9 9a3 3 0 0 1 5.8-1c0 1.8-2.3 2-2.3 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    <circle cx="12.5" cy="16" r="1.2"/>`,
  schloss: `<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2"/>
    <circle cx="12" cy="15.5" r="1.4" fill="#0b1e33"/>`,
};

/** Bekannte Symbol-IDs – zum Testen, ob eine in daten.js verwendete ID
 *  tatsächlich ein gezeichnetes Icon hat, statt still auf den Platzhalter
 *  zurückzufallen. */
export const BEKANNTE_SYMBOLE = new Set(Object.keys(PFADE));

/**
 * Liefert das innere SVG-Markup für ein Symbol. `unbekannt` fällt auf einen
 * schlichten Punkt zurück, statt das Markup kaputtzumachen – kommt in der
 * Praxis nur bei einem Tippfehler in einer ID vor.
 */
function pfadFuer(id) {
  return PFADE[id] ?? `<circle cx="12" cy="12" r="4"/>`;
}

/** Fertiges <svg>-Element als Markup-String, bereit für innerHTML. */
export function symbolMarkup(id, klasse = 'symbol-svg') {
  return `<svg class="${klasse}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${pfadFuer(id)}</svg>`;
}

/**
 * Ersetzt die frühere Zeile `<span class="X" aria-hidden="true">${emoji}</span>`
 * eins zu eins: gleiche Hülle, nur mit gezeichnetem Icon statt Emoji-Zeichen.
 */
export function symbolSpanHtml(id, spanKlasse, extraAttrs = '') {
  return `<span class="${spanKlasse}" aria-hidden="true"${extraAttrs}>${symbolMarkup(id)}</span>`;
}
