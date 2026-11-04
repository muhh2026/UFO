# Arena-Übergabe: DEEP

## Nutzerziel

Das Browser-Spiel **DEEP** im Verzeichnis `deep/` weiterentwickeln. Zuletzt gewünschte Änderung: Der Taucher soll **sichtbar schlanker** sein und einen **schwarzen Taucheranzug** tragen.

## Arbeitsweise / wichtige Nutzerwünsche

- **Keine lokalen Tests** ausführen und keine Browser-Tests durch den Agenten. Der Nutzer testet selbst online über den bereitgestellten Link.
- Änderungen nach Möglichkeit direkt committen und auf `main` pushen, wie vom Nutzer gewünscht.
- Vor jedem Push die für die neue Arena-Sitzung geltenden Branch-Vorgaben prüfen. Ist die Sitzung an einen anderen Branch gebunden und ein Wechsel bzw. Push auf `main` nicht erlaubt, nicht umgehen: dem Nutzer die Beschränkung klar sagen und nur den tatsächlich erlaubten Sitzungs-Branch verwenden. Niemals behaupten, auf `main` gepusht zu haben, wenn das nicht der Fall ist.

## Projekt / Einstieg

- DEEP-Seite: `deep/index.html`
- Spiellogik und Canvas-Zeichnung: `deep/game.js`
- Taucher-Zeichnung: Funktion `drawDiver()` in `deep/game.js`
- Das Hauptspiel UFO-Jagd liegt unter `/`; DEEP ist unter `/deep/` erreichbar.

## Bereits erledigt

Commit `db08c0f` (`Refine DEEP diver appearance`) enthält folgende Änderungen:

- Taucher-Zeichnung in `deep/game.js` auf einen dunklen/schwarzen Neoprenanzug umgestellt: dunkle Flosse, dunkler Tank, dunkle Maske und Handschuh, mit dezenten türkisfarbenen Details.
- Körper- und Maskenproportionen verkleinert; Kollisionsradius des Tauchers auf 16 px angepasst.
- Zusätzliche Atmosphäre im Wasser: animierte Fischschwärme und Lichtreflexe an der Oberfläche.
- Start-Overlay, Spielfeldrahmen und HUD für schmale Displays optisch angepasst.
- In `deep/index.html` einen Versionsparameter am Script ergänzt: `game.js?v=20261104-slim-black-diver`.

Der Nutzer hat anschließend gemeldet, dass visuell keine Änderung zu sehen sei. Die damalige Vorschau war zunächst am Repository-Root gestartet und zeigte damit das UFO-Hauptspiel. Danach wurde der Vorschau-Server so umgestellt, dass dessen Root direkt `deep/` bedient. Der Nutzer soll die aktuelle DEEP-Version über den Online-Link selbst prüfen; keine lokale Sichtprüfung durch den Agenten durchführen.

## Was als Nächstes ansteht

1. Zuerst den Nutzer die aktuelle DEEP-Vorschau online prüfen lassen. Der Taucher muss dort eindeutig schlank und schwarz erscheinen.
2. Falls der Nutzer weiterhin keine Änderung sieht: keine lokalen Browser-Tests starten. Stattdessen die tatsächliche Online-Auslieferung bzw. den Link und die Seite `/deep/` prüfen, dem Nutzer sagen, was der Agent ändern kann, und die Darstellung im Quellcode noch deutlicher machen (z. B. klarere schwarze Silhouette und sichtbare schlanke Proportionen).
3. Wenn die Darstellung bestätigt ist, nach dem nächsten konkreten DEEP-Feature fragen. Es wurde noch kein weiteres Gameplay-Feature festgelegt.

## Branch-/Push-Stand

Im vorherigen Arena-Kontext war die Sitzung fest an `arena/db88f38d-ufo` gebunden. Commit `db08c0f` wurde auf diesen Branch gepusht, **nicht auf `main`**. Der Nutzer möchte zukünftig direkte Commits und Pushes auf `main`; die neue Sitzung muss jedoch ihre tatsächlichen Arena-Vorgaben beachten und darf eine feste Branch-Bindung nicht umgehen.
