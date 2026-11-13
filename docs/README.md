# Prevoz KS — Sarajevo transit planner

Mobile-first web app for planning trips and browsing lines in Sarajevo.
Deployable via **GitHub Pages** from the `/docs` folder.

## Live demo

1. **Settings → Pages** in this repository
2. Source: branch `main` (or this feature branch), folder **`/docs`**
3. Open `https://<username>.github.io/<repo-name>/`

## Features

- **Planer** — from/to search, GPS, best routes with map
- **Linije** — live tram / trolleybus / bus / minibus list + timetables
- **Pose** — separate English Pose Cam app (`/docs/pose-app`) embedded in the tab
- Stop search from the official public API (bundled fallback if offline)

## Data sources

| Purpose | Source |
|---------|--------|
| Stops, lines, timetables | [Javni Prevoz KS](https://javniprevozks.ba) public API |
| Journey planning | [Transitous](https://transitous.org) MOTIS API (built from KS GTFS) |
| Address search | OpenStreetMap Nominatim |
| Map tiles | OpenStreetMap |

### Official public endpoints used

```
GET https://javniprevozks.ba/api/public/lines/stations/locations/list
GET https://javniprevozks.ba/public-api/public/lines/vehicle-type/{1|2|3|4}/list
GET https://javniprevozks.ba/api/public/lines/timetables/{lineId}/list
```

Vehicle types: `1` minibus · `2` bus · `3` trolleybus · `4` tram

Ticket purchase stays in the official [Javni Prevoz KS](https://javniprevozks.ba) app (no public third-party ticket API).

## Files

```
docs/
  index.html
  styles.css
  app.js
  pose-app/         # standalone English Pose Cam (iframe)
    index.html
    styles.css
    app.js
  data/stops.json   # fallback if live API is down
```

## Local preview

```bash
cd docs && python3 -m http.server 8080
```
