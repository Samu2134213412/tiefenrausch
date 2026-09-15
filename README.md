# Tiefenrausch

Ein Idle-Spiel über einen Tauchgang, der nie aufhört. Du sammelst Biolumineszenz,
baust eine Tiefseestation aus, tauchst dabei immer tiefer – und entdeckst
unterwegs, was im Dunkeln wartet.

Gebaut für **Android im Hochformat**, läuft als Web-App und lässt sich als
echte App verpacken.

---

## Sofort spielen

```bash
npm install
npm start
```

Dann im Browser öffnen:

| | |
|---|---|
| Am Rechner | `http://127.0.0.1:5173` |
| **Am Handy** | `http://<IP-des-Rechners>:5173` (gleiches WLAN, die Adresse steht beim Start in der Konsole) |

**Auf dem Handy installieren:** Seite in Chrome öffnen → Menü (⋮) →
*„Zum Startbildschirm hinzufügen"*. Danach liegt Tiefenrausch als Symbol auf dem
Startbildschirm, startet ohne Browserleiste im Vollbild und **funktioniert offline**.

---

## Das Spiel

**Kernschleife**

1. **Tippen** – sammelt Biolumineszenz (BL) von Hand.
2. **Module kaufen** – 10 Stufen von der Leuchtqualle bis zum Schwarzen Raucher,
   die von allein weitersammeln.
3. **Ausbauten** – 23 einmalige Verbesserungen, die Module oder das Tippen verstärken.
4. **Tiefer tauchen** – die Tiefe ergibt sich aus allem, was du je gesammelt hast.
5. **Entdecken** – an 15 Tiefenmarken wartet je eine Kreatur: Logbucheintrag plus
   dauerhafter Bonus.
6. **Auftauchen** – Prestige: Station aufgeben, Perlen erhalten, jede Perle
   dauerhaft +2 % Ausbeute.

**Was für Bindung sorgt**

- **Offline-Ertrag:** Die Station arbeitet bis zu 4 Stunden weiter. Beim
  Zurückkommen gibt es eine Begrüßung mit der Ausbeute – und die Möglichkeit,
  sie per Belohnungsvideo zu verdoppeln.
- **Sammelalbum:** Die 15 Entdeckungen sind der Grund, morgen wieder reinzuschauen.
- **Zonen:** Das Wasser wird mit der Tiefe sichtbar dunkler, von der Lichtzone
  bis „Jenseits der Karte". Der Fortschritt ist sichtbar, nicht nur zählbar.

---

## Aufbau

```
www/                      das Spiel (reines HTML/CSS/JS, kein Bauschritt)
  index.html
  css/stil.css
  js/
    daten.js              Inhalte: Module, Ausbauten, Entdeckungen, Erfolge
    spiel.js              Spiellogik – reine Funktionen, ohne DOM
    speicher.js           Spielstand sichern, laden, reparieren
    ui.js                 Anzeige und Bedienung
    hintergrund.js        bewegter Tiefsee-Hintergrund (Canvas)
    zahlen.js             Zahlen lesbar machen (1,23 Mio.)
    monetarisierung.js    austauschbare Schicht für Werbung und Käufe
    start.js              verbindet alles
  dienst.js               Service Worker (offline spielbar)
  manifest.webmanifest    macht die Seite installierbar
android/                  Android-Projekt (von Capacitor erzeugt)
test/spiel.test.js        33 Tests der Spiellogik und Balance
werkzeuge/
  server.js               Entwicklungsserver
  sichttest.mjs           spielt das Spiel durch und macht Bilder
  apk-bauen.sh            APK bauen
  icon/                   App-Symbol erzeugen
```

**Warum die Logik ohne DOM auskommt:** So lässt sich die Balance in Millisekunden
testen statt in Stunden Spielzeit – und ein Fehler in der Anzeige kann den
Spielstand nicht beschädigen.

---

## Befehle

```bash
npm start        # Spiel starten (Rechner + Handy im WLAN)
npm test         # 33 Tests der Spiellogik
npm run sichttest # spielt das Spiel durch, legt Bilder in bilder-test/ ab
npm run icons    # App-Symbol neu erzeugen
npm run apk      # Android-APK bauen (siehe Hinweis unten)
```

---

## Android-App bauen

Das Android-Projekt ist vollständig eingerichtet (Capacitor, Hochformat
erzwungen, App-Symbole in allen Auflösungen, Startbildschirm).

```bash
npm run apk
```

Ergebnis: `android/app/build/outputs/apk/debug/app-debug.apk`

Aufs Handy übertragen:

```bash
"$ANDROID_HOME/platform-tools/adb" install -r android/app/build/outputs/apk/debug/app-debug.apk
```

### ⚠️ Auf diesem Rechner scheitert der Build zurzeit

Der Gradle-Build bricht ab mit:

```
java.io.IOException: Unable to establish loopback connection
```

**Das liegt nicht am Projekt.** Auf diesem Windows-System schlägt `Selector.open()`
in *jeder* Java-Installation fehl – geprüft mit Adoptium JDK 21 und der
JetBrains-Runtime aus Android Studio. Java legt dafür intern ein Socket-Paar über
127.0.0.1 an; dieser Aufruf endet mit `SocketException: Invalid argument: connect`.

Was ausgeschlossen wurde:

- Einfache Loopback-Verbindungen funktionieren (Node-Server, `ServerSocket`, `SocketChannel`)
- Kein Virenschutz außer Windows Defender
- Keine blockierenden Firewall-Regeln für Java
- Keine reservierten Portbereiche (`netsh int ipv4 show excludedportrange`)
- Kein fremder Winsock-Filtertreiber im Katalog
- Die JVM-Schalter `preferIPv4Stack` und `preferIPv6Addresses` ändern nichts

**Übliche Behebung** (Eingabeaufforderung **als Administrator**, danach neu starten):

```
netsh winsock reset
netsh int ip reset
```

Danach `npm run apk` erneut ausführen – das Projekt selbst ist fertig eingerichtet.

Solange das offen ist, ist die installierbare Web-App (siehe oben) der Weg aufs
Handy: Sie läuft im Vollbild, offline und mit eigenem Symbol.

---

## Werbung und Käufe

`www/js/monetarisierung.js` ist eine austauschbare Schicht. Das Spiel ruft nur
`belohnungsvideo()` und `kaufeWerbefrei()` auf und weiß nicht, was dahinter liegt.

Zurzeit läuft die **Übungsfassung**: Der Ablauf im Spiel ist vollständig, es wird
aber keine echte Werbung geladen und nichts abgerechnet. So lässt sich alles
testen, bevor Konten existieren.

Für den Echtbetrieb sind nötig:

1. Google-Play-Entwicklerkonto (einmalig 25 US-Dollar)
2. AdMob-Konto
3. `npm i @capacitor-community/admob`
4. In `monetarisierung.js` die Platzhalter-Kennungen ersetzen

Beides setzt Volljährigkeit bzw. die Mitwirkung eines Erziehungsberechtigten voraus.
Siehe [docs/VERDIENEN.md](docs/VERDIENEN.md) für eine ehrliche Einschätzung, was
damit realistisch zu verdienen ist.

---

## Technisches

- **Keine Abhängigkeiten im Spiel selbst.** Kein Framework, kein Bauschritt –
  die Dateien in `www/` laufen direkt im Browser.
- **Spielstand** liegt im localStorage, wird alle 15 Sekunden und bei jedem
  Verlassen gesichert. Ein beschädigter Stand führt nie zum Absturz: Beim Laden
  wird gegen die bekannten Inhalte abgeglichen und im Zweifel zurückgesetzt.
- **Der Hintergrund pausiert**, sobald die App in den Hintergrund geht, und
  respektiert „Bewegung reduzieren".
- **Zahlen** bis 10⁴² werden als deutsche Kurzform dargestellt, darüber
  wissenschaftlich.
