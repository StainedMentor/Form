# Prevoz KS — Sarajevo transit planner

Mobile-first web app (Jakdojade-style) for planning public transport trips in Sarajevo.

## Live demo (GitHub Pages)

1. Open **Settings → Pages** in this repository.
2. Set **Source** to **Deploy from branch**.
3. Choose branch `main` (or this feature branch) and folder **`/docs`**.
4. Save. After 1–2 minutes your app is at:

   `https://<your-username>.github.io/<repo-name>/`

## What it does

- Pick **from** and **to** via stop names or street addresses in Sarajevo
- Use **GPS** for your current location
- Find the **best public transit routes** (tram, bus, trolleybus, minibus)
- Show **duration**, **transfers**, step-by-step legs, and a **map**

## Data sources

| Data | Provider |
|------|----------|
| Route planning | [Transitous](https://transitous.org) MOTIS API (`api.transitous.org`) |
| Stops & schedules | [Sarajevo GTFS](https://gitlab.com/vekejsn/gtfs-generators) (Ministry of Transport KS) |
| Address search | [OpenStreetMap Nominatim](https://nominatim.openstreetmap.org) |
| Map tiles | OpenStreetMap |

The official [javniprevozks.ba](https://javniprevozks.ba) API requires authentication and is not used here. Transitous includes the same Sarajevo schedule data in processed GTFS form.

## Files

```
docs/
  index.html      # App shell
  styles.css      # Mobile UI
  app.js          # Search, routing, map
  data/stops.json # Stop list from GTFS (generated)
```

## Regenerating stop data

```bash
curl -L "https://gitlab.com/api/v4/projects/vekejsn%2Fgtfs-generators/packages/generic/sarajevo-gtfs/latest/sarajevo_gtfs.zip" -o /tmp/sarajevo.zip
python3 scripts/build_stops.py /tmp/sarajevo.zip docs/data/stops.json
```

## Local preview

```bash
cd docs && python3 -m http.server 8080
```

Open `http://localhost:8080` on your phone (same Wi‑Fi) or in the browser.
