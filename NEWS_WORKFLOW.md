# NBC News Workflow

Dieser Workflow ist die feste Checkliste für neue News-Inhalte im `nbc`-Repo.

## Ziel

Jeder neue Artikel soll:
- sauber auf der Website erscheinen
- in der News-Übersicht sichtbar sein
- für Google technisch verständlich sein
- im RSS-Feed auftauchen
- in der Sitemap enthalten sein

---

## Standard-Ablauf für einen neuen News-Artikel

### 1. Artikel-Datei anlegen

Lege eine neue HTML-Datei im Ordner `news/` an.

**Namensschema:**
- nur Kleinbuchstaben
- Wörter mit Bindestrichen trennen
- sprechende URL verwenden

**Beispiel:**
- `news/u14-turniersieg-nordhorn.html`
- `news/probetraining-juni-2026.html`
- `news/neues-team-zweite-herren.html`

---

### 2. Pflichtinhalte im Artikel

Jeder Artikel braucht mindestens:
- `title`
- Meta Description
- Canonical URL
- H1
- Veröffentlichungsdatum
- Einleitung / Teaser
- sinnvollen Haupttext
- Kategorie / Thema
- Link zurück zur News-Übersicht

Optional, aber sehr sinnvoll:
- starkes Titelbild
- Autor / Verein
- interne Links auf passende Seiten

---

### 3. Strukturierte Daten ergänzen

Jeder Artikel soll ein passendes `NewsArticle`- oder `Article`-Schema enthalten.

Pflichtfelder:
- `headline`
- `description`
- `datePublished`
- `dateModified`
- `author`
- `publisher`
- `mainEntityOfPage`
- `image`

Wenn es ein echter Vereins-/Aktualitätsbeitrag ist, bevorzugt:
- `NewsArticle`

---

### 4. News-Übersicht aktualisieren

In `news.html` ergänzen:
- neue Artikelkarte / neuer Eintrag
- Titel
- Datum
- Kurzbeschreibung
- Link zum Artikel

Wenn relevant:
- neuen Artikel oben einsortieren
- `ItemList` im Schema erweitern

---

### 5. RSS-Feed aktualisieren

In `feed.xml` ergänzen:
- neuen `<item>` Block

Pflichtfelder:
- `<title>`
- `<link>`
- `<guid>`
- `<pubDate>`
- `<description>`
- `<category>` wenn sinnvoll

Zusätzlich anpassen:
- `<lastBuildDate>`

Wichtig:
- neueste Artikel gehören im Feed nach oben

---

### 6. Sitemap aktualisieren

In `sitemap.xml` ergänzen:
- neue Artikel-URL

Pflichtfelder:
- `<loc>`
- `<lastmod>`
- `<changefreq>`
- `<priority>`

Empfehlung für News-Artikel:
- `changefreq`: `monthly`
- `priority`: `0.7`

Für `news.html` bei Bedarf ebenfalls `lastmod` aktualisieren.

---

### 7. Metadaten prüfen

Vor dem Push kurz kontrollieren:
- stimmt der Seitentitel?
- ist die Description sinnvoll?
- stimmt die Canonical URL?
- ist OpenGraph gesetzt?
- zeigt das Bild korrekt?
- stimmt das Datum im Schema und im Artikel?

---

### 8. Pushen

Nach Fertigstellung:
- Änderungen committen
- direkt pushen

Beispielhafte Commit-Messages:
- `Add news article about U14 tournament win`
- `Update news feed and sitemap for new article`
- `Add June trial training news article`

---

## Minimal-Checkliste vor Abschluss

Vor jedem Abschluss prüfen:

- [ ] Artikel in `news/` erstellt
- [ ] `news.html` aktualisiert
- [ ] `feed.xml` aktualisiert
- [ ] `sitemap.xml` aktualisiert
- [ ] Schema im Artikel vorhanden
- [ ] Meta Description vorhanden
- [ ] Canonical korrekt
- [ ] gepusht

---

## Empfehlung für gute News-Themen

Für NBC besonders geeignet:
- Spielberichte
- Team-Updates
- Trainer-News
- Probetraining / Einstieg
- Turniere / Ergebnisse
- Camps / Events
- Vereinsentwicklungen
- neue Angebote für Kinder und Jugend

---

## Redaktionsregel

Lieber wenige, aber gute Beiträge als viele sehr kurze Meldungen.

Ein guter Artikel sollte:
- konkret sein
- einen klaren Anlass haben
- lokal relevant sein
- verständlich formuliert sein
- echte Informationen liefern
