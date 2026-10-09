# inspirelt.github.io

Personal homepage of Tao Lu — plain HTML, CSS and JavaScript. No build step, no dependencies;
GitHub Pages serves the files as they are.

## Preview locally

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>. (Opening `index.html` directly from disk also works, but the
Gaussian portrait needs a server: browsers block reading image pixels from `file://`.)

## Common edits

| What | Where |
| --- | --- |
| Add or edit a paper | `assets/js/data.js` — copy an entry, set `selected: true` to show it under "Selected" |
| Bio, "New" line, research cards, contact | `index.html` |
| Colors, fonts, spacing | tokens at the top of `assets/css/style.css` (dark mode redefines the same tokens) |
| Portrait | replace `assets/img/portrait.jpg` (a plain light background gives the cleanest cut-out) |
| CV | replace `assets/TaoLu_CV.pdf` |

Paper entries mark equal contribution with `*` and corresponding authors with `†` inside the
`authors` string; author lists longer than 16 names are collapsed automatically.

## What runs where

- `assets/js/main.js` — theme toggle, scroll reveal, email copy, publication list and filters
- `assets/js/portrait.js` — the hero portrait, re-drawn live as ~7k 2D Gaussians in WebGL2
  (falls back to the plain photo without WebGL2)
- `assets/js/arc.js` — the three small canvases in "Research" (LiDAR scan, anchored Gaussians, robot arm)

All animations pause off-screen and respect the system "reduce motion" setting.
