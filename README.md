# FIU Foundation Interactive Campus Tour

An interactive website for the FIU Foundation Student Ambassadors' VIP and donor campus tours. It shows a satellite map of FIU's Modesto A. Maidique Campus with the ambassadors' driving tour route drawn on top. Each stop opens a short card about the building, written for donors, VIPs and community partners. A guided Tour Mode follows the route stop by stop and reads each card aloud.

> **Status:** Planning. No code yet. See [SCOPE.md](docs/SCOPE.md) for the full project scope.

## Features (MVP)

- **Satellite campus map** with an FIU blue and gold interface that is simple to use on an iPad or phone.
- **Driving route** from the loop between Gold Garage (PG1) and Blue Garage (PG2) in front of MARC, around campus and back. It has 33 stops.
- **Clickable stop cards** for every building on the route plus Green Library. Each card has a one-line summary, a few highlights, a key stat and an "Impact of support" line.
- **Featured and quick-pass stops**, so ambassadors can tailor each tour to a donor's interests.
- **Under-construction badges** (for example Bell Chapel). These buildings still show their full information.
- **Guided Tour Mode** with text-to-speech:
  - *Virtual tour:* advances on its own.
  - *Ride-along:* the ambassador taps Next as the vehicle reaches each building, and can skip any stop.
  - Captions stay on screen, so the tour also works muted.

## Who it's for

| Audience | Use |
|---|---|
| Donors, VIPs, alumni and partners | Explore the map or listen to the full tour |
| Student Ambassadors | A visual aid in the vehicle during live tours, and a study guide for the route |
| FIU Foundation staff | A link to share with guests before or after a visit |

## Tech stack

- React + TypeScript on Vite
- Mapbox GL JS with Mapbox satellite imagery
- Stop content as JSON in `content/` (no backend or database in the MVP)
- Text-to-speech through the browser's Web Speech API
- Hosted on Vercel

Supabase may be added later for ambassador logins, saved donor routes and notes.

## Local setup

The app isn't scaffolded yet. Once it is:

1. Copy `.env.example` to `.env.local` and set `VITE_MAPBOX_TOKEN` to your public Mapbox token. Never commit `.env.local`.
2. Run `npm install`, then `npm run dev`.

On Vercel, set `VITE_MAPBOX_TOKEN` under the project's environment variables.

## Repository layout

```
README.md                    This file
.env.example                 Environment variables to copy into .env.local
.claude/CLAUDE.md            Instructions for Claude Code
.claude/settings.json        Claude Code permissions (blocks reading .env files and pushing)
.claude/skills/              Project skills: add a tour stop, write donor cards, validate content
docs/SCOPE.md                Project scope: goals, route, MVP, phases, open questions
docs/reference/
  aerial-route.png           Aerial view of campus with the driving route in red
  campus-map-labeled.png     Labeled campus map with building codes
```

The planned layout once development starts:

```
content/stops.json           Card text, stop order, type and status for each stop
content/route.geojson        The driving route line
src/                         Site source code
public/                      Static assets (photos, icons)
```

## Roadmap

1. **MVP:** map, route, clickable cards for every route stop plus Green Library, and Tour Mode with text-to-speech.
2. **Phase 2:**
   - Custom tours planned ahead of time for each donor
   - Every important campus building clickable
   - GPS ride-along
   - Photos and renderings
   - Recorded narration
   - Spanish
3. **Phase 3 (undecided):** an optional generative AI assistant.

See [SCOPE.md](docs/SCOPE.md) for details.

## Content sources

- *FIU Foundation Student Ambassador Handbook* (text draft)
- Official FIU web pages, listed with links in SCOPE.md, Appendix A

The FIU Foundation approves all card content before it is shown to donors.

## Contributing

Development hasn't started yet. Content edits will go in the `content/` files once they exist. Check [SCOPE.md](docs/SCOPE.md) for open questions before starting work, and run `node .claude/skills/validate-tour-content/scripts/validate.mjs` after changing content.
