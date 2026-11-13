# Pose Cam

Standalone in-browser pose estimation app. Opens the device camera, loads
MediaPipe Pose Landmarker, and draws a live skeleton overlay. Video stays on-device.

## Live demo

GitHub Pages serves this folder from `main`:

**https://stainedmentor.github.io/Form/**

## Local preview

```bash
cd docs && python3 -m http.server 8080
```

## Files

```
docs/
  index.html      # Pose Cam
  styles.css
  app.js
  prevoz/         # archived Prevoz KS transit app (not linked from the site)
```
