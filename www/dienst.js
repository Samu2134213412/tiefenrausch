/**
 * Service Worker – macht das Spiel offline spielbar.
 *
 * Für ein Idle-Spiel ist das wichtiger als für die meisten Web-Anwendungen:
 * Man öffnet es kurz im Bus, ohne Empfang, und erwartet, dass es läuft.
 *
 * Vorgehen: Beim Einrichten wird alles Nötige in den Zwischenspeicher gelegt.
 * Danach wird zuerst dort nachgesehen und nur bei Bedarf das Netz gefragt.
 */
// Version bei jeder Änderung an der Dateiliste anheben: Der Name selbst löst
// die Umstellung aus – „activate“ löscht unten alles, was nicht mehr so heißt.
const SPEICHER = 'tiefenrausch-v3';

const DATEIEN = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/stil.css',
  './js/start.js',
  './js/spiel.js',
  './js/daten.js',
  './js/ui.js',
  './js/speicher.js',
  './js/zahlen.js',
  './js/hintergrund.js',
  './js/funken.js',
  './js/klang.js',
  './js/monetarisierung.js',
  './bilder/symbol.svg',
  './bilder/icon-192.png',
  './bilder/icon-512.png',
];

self.addEventListener('install', (ereignis) => {
  ereignis.waitUntil(
    caches.open(SPEICHER).then((speicher) => speicher.addAll(DATEIEN)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (ereignis) => {
  ereignis.waitUntil(
    caches
      .keys()
      .then((namen) => Promise.all(namen.filter((n) => n !== SPEICHER).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (ereignis) => {
  const anfrage = ereignis.request;
  if (anfrage.method !== 'GET') return;

  ereignis.respondWith(
    caches.match(anfrage).then((treffer) => {
      if (treffer) {
        // Im Hintergrund auffrischen, damit Aktualisierungen ankommen.
        fetch(anfrage)
          .then((antwort) => {
            if (antwort.ok) caches.open(SPEICHER).then((s) => s.put(anfrage, antwort));
          })
          .catch(() => {});
        return treffer;
      }
      return fetch(anfrage).catch(() => caches.match('./index.html'));
    })
  );
});
