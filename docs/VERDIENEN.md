# Geld verdienen mit dem Spiel – ehrlich gerechnet

Kurzfassung vorweg: **Mit einem Spiel Geld zu verdienen ist deutlich schwerer als
mit dem Audit-Werkzeug**, das wir vorher gebaut haben. Nicht weil das Spiel
schlechter wäre, sondern weil der Engpass ein anderer ist: Beim Audit-Werkzeug
musste man zwei Kunden überzeugen. Bei einem Spiel muss man ein paar tausend
Menschen erreichen, die es überhaupt erst finden.

Das heißt nicht, dass es sich nicht lohnt. Es heißt nur, dass die Zahlen anders
aussehen, als man hofft.

---

## Wie Idle-Spiele Geld verdienen

| Weg | Typischer Ertrag | Passt hier? |
|---|---|---|
| **Belohnungsvideo** („Video ansehen → doppelte Ausbeute") | 10–25 € je 1.000 gesehene Videos | ✅ Eingebaut, ist der Hauptweg |
| **Bannerwerbung** unten am Rand | 0,50–2 € je 1.000 Aufrufe | ⚠️ Bringt kaum etwas, stört die Optik |
| **In-App-Kauf „werbefrei"** | 2–5 €, kaufen 1–3 % der Aktiven | ✅ Eingebaut |
| **Kauf von Spielwährung** | schwankt stark | ⚠️ Bei einem kleinen Spiel wenig glaubwürdig |
| **Einmalpreis im Store** | 1–3 €, aber fast niemand lädt es | ❌ Für Idle-Spiele unüblich |

Eingebaut sind **Belohnungsvideo** und **werbefrei kaufen** – die beiden Wege,
die bei diesem Genre tatsächlich tragen.

---

## Rechenbeispiel

Angenommen, das Spiel wird veröffentlicht und läuft ordentlich:

| | |
|---|---|
| Installationen | 1.000 |
| Davon nach einer Woche noch aktiv | ~100 (10 % ist realistisch) |
| Videos pro aktivem Spieler und Tag | ~2 |
| Videos pro Monat | 100 × 2 × 30 = **6.000** |
| Ertrag bei 15 € je 1.000 Videos | **~90 €/Monat** |
| Dazu Käufe „werbefrei": 2 % von 1.000 × 3 € | **~60 € einmalig** |

**Also rund 90 € im Monat – bei 1.000 Installationen.**

Und genau da liegt das Problem: **1.000 Installationen bekommt man nicht von
allein.** Im Play Store erscheinen täglich hunderte Spiele. Ohne Marketing
bleiben die meisten bei unter 100 Installationen, oft unter 20.

### Was das für dich heißt

- **Erste Monate: wahrscheinlich unter 10 € im Monat.** Das ist normal.
- Die 25 US-Dollar für das Entwicklerkonto hast du erst nach mehreren Monaten
  wieder drin – wenn überhaupt.
- Der Wert liegt am Anfang woanders: Du hast ein fertiges, vorzeigbares Spiel.
  Das ist ein echtes Portfolio-Stück.

---

## Wie man überhaupt Spieler bekommt

Ohne Werbebudget bleiben diese Wege:

1. **itch.io** – Plattform für Indie-Spiele, Veröffentlichen ist kostenlos und
   ohne Alterserfordernis. Das Spiel läuft direkt im Browser. Guter erster Test:
   Kommt es an? Spielen Leute länger als zwei Minuten?
2. **CrazyGames / Poki** – Portale für Browser-Spiele, die Entwickler an den
   Werbeeinnahmen beteiligen. Sie nehmen nicht jedes Spiel, aber die Anfrage
   kostet nichts. Hier ist mehr Reichweite als im Play Store.
   Für Poki gibt es `npm run poki-paket`: baut eine eigene, hochladbare
   `poki-paket.zip` mit eingebautem Poki-SDK (Belohnungsvideo, Werbe-
   unterbrechung beim Auftauchen), ohne www/ selbst anzufassen – das
   normale Spiel auf GitHub Pages/Play Store merkt davon nichts. Braucht
   trotzdem ein eigenes, kostenloses Konto auf developers.poki.com, das
   nur ihr selbst anlegen könnt.
3. **Reddit** – `r/incremental_games` ist genau die Zielgruppe und freut sich
   ehrlich über neue Spiele. Wichtig: als Entwickler auftreten, um Rückmeldung
   bitten, nicht werben.
4. **TikTok/YouTube Shorts** – kurze Aufnahmen vom Spiel. Der Zahlen-hochzähl-Effekt
   funktioniert dort erstaunlich gut.
5. **Play Store** – erst, wenn das Spiel sich über die anderen Wege bewährt hat.
   Ein Store-Eintrag ohne Bewertungen und ohne Installationen wird nicht gefunden.

**Empfohlene Reihenfolge:** itch.io → Rückmeldungen einarbeiten → Reddit →
Browserspiel-Portal anfragen → erst dann Play Store.

Der große Vorteil: Für Schritt 1 bis 3 brauchst du **kein Entwicklerkonto, kein
Geld und keine Volljährigkeit**. Das Spiel läuft schon jetzt im Browser.

---

## Was du selbst tun musst

**Sofort möglich (kostenlos, ohne Konto)**

- Das Spiel auf dem Handy testen und Freunden zeigen
- Bei itch.io hochladen (Konto ab 13 Jahren, kostenlos)
- In `r/incremental_games` um Rückmeldung bitten

**Braucht Eltern / Volljährigkeit**

- Google-Play-Entwicklerkonto (25 US-Dollar, Ausweis nötig)
- AdMob-Konto für echte Werbung
- Auszahlung von Einnahmen – braucht ein Konto auf den Namen eines Erwachsenen
- Bei Werbung in Apps, die auch Kinder erreichen, gelten die Familienrichtlinien
  von Google Play (nur altersgerechte Werbung)

---

## Vergleich mit dem Audit-Werkzeug

Damit die Entscheidung fair ist – beide Projekte liegen fertig auf dem Rechner:

| | Prüfwerk (Audit) | Tiefenrausch (Spiel) |
|---|---|---|
| Erster Euro realistisch nach | 2–6 Wochen | 3–12 Monaten |
| Nötige Kundenzahl für 500 €/Monat | 1 Kunde | ~5.000 Installationen |
| Was der Engpass ist | Verkaufsgespräche führen | Sichtbarkeit bekommen |
| Braucht Gewerbe/Eltern | ja, sofort | erst beim Play Store |
| Macht mehr Spaß | eher nicht | ja |
| Vorzeigbar im Portfolio | mittel | sehr gut |

**Ein möglicher Weg:** Das Spiel auf itch.io stellen, weil es Spaß macht und
nichts kostet – und parallel das Audit-Werkzeug bei ein, zwei Bekannten
einsetzen, weil dort das Geld schneller kommt. Die beiden schließen sich nicht aus.

---

*Alle Zahlen hier sind Erfahrungswerte aus dem Genre, keine Zusagen. Die meisten
Indie-Spiele verdienen nichts. Das ist kein Grund, keins zu bauen – aber ein
Grund, es nicht als Einkommensplan zu betrachten.*
