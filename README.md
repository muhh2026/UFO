# 🛸 UFO-Jagd: Nachtangriff

Ein deutschsprachiges Browser-Shooter-Spiel auf Canvas 2D: Du verteidigst **10 Kühe** auf einer nächtlichen Wiese gegen angreifende UFOs.

![Favicon](favicon.svg)

## 🎮 Spielanleitung

| Aktion | Effekt |
|---|---|
| **Klicken / Tippen** | UFOs abschießen → Punkte (`(1.3 − z) * 500 * Level`, Raider-UFO mit rotem Strahl = **500 Punkte**) |
| Roter Strahl-UFO abschießen | Kuh fällt aus dem Strahl zu Boden und wird gerettet |
| **Jet treffen** | −150 Punkte; bei **5 Jets** → Mission verloren |
| Alle 10 Kühe gestohlen | Mission verloren |
| **Mond anklicken** (oben rechts) | 5 s Zeitlupe, danach 10 s Cooldown |
| **A / P** oder **PAUSE-Button** | Pause (zeigt den „Windows-Update“-Screen 😄) |
| **BEENDEN** | Zurück zum Menü |

**Easter Eggs:** E.T. auf dem Fahrrad und ein Tier am Boden dürfen **nicht** angeklickt werden … 👽🚲

Pro Level musst du `7 + Level` UFOs treffen. Spawn-Rate und Geschwindigkeit steigen mit Level und Score.

## ▶️ Lokal starten

Statisches Hosting reicht – es gibt keinen Build-Step:

```bash
cd UFO
python3 -m http.server 8000
# dann öffnen: http://localhost:8000
```

(oder `npx serve .`)

## 🏗️ Projektstruktur

```
index.html                  Spiel-Seite (HTML + CSS), bindet die Skripte ein
js/game.js                  komplette Spiellogik (Canvas, Loop, HUD, Klicks)
js/crosshair.js             Custom-Fadenkreuz + Service-Worker-Registrierung
js/cinematic-blast.js       Explosions-Overlay (Flash, Feuerball, Schockwelle, Partikel)
js/firebase-highscore.js    Online-Highscores via Firebase Realtime DB (anonyme Auth)
manifest.webmanifest        PWA-Manifest (installierbar als App)
sw.js                       Service Worker (offline Cache für lokale Dateien)
database.rules.json         empfohlene Firebase-Realtime-DB-Security-Rules
archive/                    alte Entwicklungs-Snapshots (nur lokal, nicht in Git –
                            gesichert in der Git-History und im Bundle, siehe unten)
20261102bak.bundle          komplettes Backup des Repo-Zustands vom 02.11.2026 (untracked)
```

## 🏆 Highscores

- **Lokal:** Top 10 in `localStorage` (`ufoScores`) – wird als Fallback angezeigt, wenn Firebase nicht erreichbar ist.
- **Online:** Firebase Realtime Database, anonyme Authentifizierung, Top 10 unter `highscores`.

### Firebase-Regeln deployen

Die empfohlene Konfiguration liegt in `database.rules.json` (nur authentifizierte Schreibzugriffe, validierte Felder):

```bash
firebase deploy --only database   # nutzt database.rules.json
```

> Hinweis: Der Firebase-Web-API-Key in `js/firebase-highscore.js` ist bewusst öffentlich (üblich bei Firebase-Web-Apps) – der Schutz passiert über die **Security Rules** in der Datenbank.

## 💾 Backup

Am 02.11.2026 wurde der komplette Repo-Zustand gesichert:

```bash
git clone 20261102bak.bundle UFO-backup   # stellt alles wieder her
# oder im bestehenden Repo:
git fetch 20261102bak.bundle 'refs/*:refs/backup/*'
```

Tag: `20261102bak` (zeigt auf Commit `3cddbd1`).

## 📱 PWA

Über `manifest.webmanifest` + `sw.js` ist das Spiel installierbar („Zum Homescreen hinzufügen“). Der Service Worker cached nur lokale Dateien; ohne Internet läuft das Spiel offline, die Online-Highscores fallen dann auf die lokale Liste zurück.
