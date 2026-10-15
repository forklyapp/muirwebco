# Muir Web Co.

A static website for Cash Muir's independent web studio, with distinct realtor and tradesman experiences. Built with HTML, CSS, and browser JavaScript; no package installation or build step is needed.

## Run locally

From this directory:

```sh
python3 -m http.server 3000
```

Open the site in your development browser. The `/realtors/` and `/contractors/` directories redirect to the corresponding query-based audience. On Vercel, `vercel.json` serves the main experience directly at `/realtors` and `/contractors`.

The prepared cloud environment also has a rewrite-aware server at `/workspace/.cloud-setup/serve.py`:

```sh
python3 /workspace/.cloud-setup/serve.py
```

Use one server at a time on port 3000.

## Experiences

- Realtor property collection with combined style/price filters, saved favorites, property detail dialogs, image galleries, and feature exploration.
- Tradesman before-and-after comparisons for exterior renovation and outdoor living; supports pointer, touch, and keyboard input.
- Audience-specific copy, pricing, calculator, and persistent selection. Share `/?for=realtors` or `/?for=contractors`.
- Progressive View Transitions, pointer-responsive perspective, scroll reveals, and reduced-motion alternatives. No motion or animation library is required.
- Text/call contact links and a validated project-request composer. The composer prepares an SMS or email; the visitor must send it in their app. There is no submission backend or delivery confirmation.

## Content

`app.js` contains the sample property records, project descriptions, audience copy, pricing, and calculator settings. `styles.css` contains both visual themes and responsive layouts.

All five showcase images in `assets/` are AI-generated architectural concepts created for this demo, served locally as optimized WebP files. Properties, locations, prices, and project details are illustrative; these are not active listings or completed client projects. Replace them with approved photos and verified details to feature actual work. Gallery alternatives are labeled design inspiration, not additional verified photos of the same property.

The Kyla Muir Realty case study links to the existing client site. Its visual here is a typographic interpretation. Roofing, excavation, and HVAC links lead to the existing demo sites.

The subset Noto Sans Symbols font is distributed under the license in `assets/FONT-LICENSE.txt`.

## Validation

The cloud environment provides Python Playwright and Chromium at `/usr/bin/chromium`. Run the browser checks with:

```sh
python3 -m unittest discover -s tests -v
```

Tests start an isolated local HTTP server automatically and check routing, filters and empty states, saved collection persistence, dialogs and focus, galleries, project controls, pricing/calculator behavior, form validation and handoff, reduced motion, and layout widths from 320 to 1440 pixels. Tests do not send messages or submit leads.

For another machine, install Python Playwright and adjust the browser executable in `tests/test_site.py` to your installed Chromium if needed.

## Deployment

Deploy this directory as a static Vercel project. No paid API, backend, or external image host is required for the current features. Live MLS/IDX and actual in-page lead submission require separately configured services; the interactive examples do not claim those connections.
