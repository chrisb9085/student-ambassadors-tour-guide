# FIU Foundation Interactive Campus Tour

An interactive website that helps FIU Foundation Student Ambassadors prepare for their VIP and donor campus tours. It shows a satellite map of FIU's Modesto A. Maidique Campus with the ambassadors' driving tour route drawn on top. Each stop opens a short card about the building, written the way ambassadors present it to donors, VIPs and community partners. A guided Tour Mode follows the route stop by stop and reads each card aloud, so ambassadors can learn the drive before they lead it. The site is a study tool; it isn't used in the vehicle.

> **Status:** MVP built and tested; waiting on Foundation content review, a real-iPad drive test and the Vercel deploy. See [SCOPE.md](docs/SCOPE.md) for the scope, [BACKLOG.md](docs/BACKLOG.md) for the sprint plan and [.claude/sprints/TRACE.md](.claude/sprints/TRACE.md) for what was built and how it was tested.

## Features (MVP)

- **Satellite campus map** with an FIU blue and gold interface that is simple to use on an iPad or phone.
- **Driving route** from the loop between Gold Garage (PG1) and Blue Garage (PG2) in front of MARC, around campus and back: about 5 km with 32 stops.
- **Clickable stop cards** for every building on the route, plus five "Also on campus" buildings off the route (Green Library, the Shaham Academic Medical Center, the Reagan Presidential House, Deuxième Maison, and Veteran and Military Affairs). Each card has a one-line summary, a few highlights, a key stat and an "Impact of support" line.
- **Featured and quick-pass stops**, so ambassadors can tailor each tour to a donor's interests.
- **"For ambassadors" study notes** on each card, collapsed by default: the handbook's tour guide tips and extra details for answering questions, each with its handbook page.
- **Printable study guide** (`?view=study-guide`, linked from the Stops panel): every stop in route order with what to say, key facts and tips.
- **Shareable stop links** (`?stop=graham-center`) and a Copy link button on each card, so advisors can point ambassadors at a building.
- **Under-construction badges** (for example Bell Chapel). These buildings still show their full information.
- **Guided Tour Mode** with text-to-speech:
  - *Virtual tour:* advances on its own.
  - *Ride-along:* the ambassador taps Next as the vehicle reaches each building, and can skip any stop.
  - Captions stay on screen, so the tour also works muted.

## Who it's for

| Audience | Use |
|---|---|
| Student Ambassadors (primary) | Learn the route, the buildings and what to say before leading a tour |
| Donors, VIPs, alumni and partners | The audience the cards are written for; they can explore the map or listen to the tour if given a link |
| FIU Foundation staff | A link to share with guests before or after a visit |

## Tech stack

- React + TypeScript on Vite
- Mapbox GL JS with Mapbox satellite imagery
- Stop content as JSON in `content/` (no backend or database in the MVP)
- Text-to-speech through the browser's Web Speech API
- Hosted on Vercel

Supabase may be added later for ambassador logins, saved donor routes and notes.

## Local setup

Requires Node 20 or later.

1. Copy `.env.example` to `.env.local` and set `VITE_MAPBOX_TOKEN` to your public Mapbox token. Never commit `.env.local`.
2. Run `npm install`, then `npm run dev`.

| Command | What it does |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build` | Type-check and build to `dist/` |
| `npm run lint` | ESLint |
| `npm test` | Unit, component and integration tests (Vitest) |
| `npm run test:e2e` | End-to-end tests in Chromium at desktop and iPad sizes, including an accessibility audit. Mapbox's servers are replaced by a local stand-in, so runs use no map loads and need no token. First run: `npx playwright install chromium webkit` |
| `npm run test:e2e:webkit` | The same tests in WebKit (Safari's engine) on iPad and iPhone profiles, one at a time (slower) |
| `npm run test:e2e:real` | Two tests on real satellite tiles (uses the token in `.env.local`, two map loads). Run before a release |
| `npm run validate` | Check `content/`, flag narration that text-to-speech reads badly, and scan for committed tokens |
| `npm run content:review` | Regenerate [docs/CONTENT-REVIEW.md](docs/CONTENT-REVIEW.md), the Foundation's review page |

## Deploying to Vercel

1. In Vercel, import the GitHub repository. Vercel detects Vite: the build command is `npm run build` and the output folder is `dist`.
2. Under **Project Settings → Environment Variables**, add `VITE_MAPBOX_TOKEN` with the public `pk.` token, for Production and Preview. Redeploy after adding it; Vite bakes the value in at build time.
3. In the Mapbox dashboard, restrict the token by URL: add the production domain (for example `https://<project>.vercel.app`) and `http://localhost:5173`. Preview deployments have their own URLs: add them as needed, or use a second token for previews.
4. Open the deployed link on an iPad and work through [docs/DEVICE-TEST.md](docs/DEVICE-TEST.md).

If the map shows "The map couldn't load. The Mapbox token is invalid or not allowed for this web address", the token's URL restrictions don't include that address.

## Repository layout

```
README.md                    This file
.env.example                 Environment variables to copy into .env.local
.claude/CLAUDE.md            Instructions for Claude Code
.claude/settings.json        Claude Code permissions (blocks reading .env files and pushing)
.claude/skills/              Project skills: add a tour stop, write donor cards, validate content
.claude/sprints/TRACE.md     Sprint-by-sprint record of what was built, tested and decided
content/stops.json           Card text, stop order, type, status and coordinates for each stop
content/tour.json            Welcome and Closing cards
content/route.geojson        The driving route line
docs/SCOPE.md                Project scope: goals, route, MVP, phases, open questions
docs/BACKLOG.md              Sprint plan and user stories
docs/HANDBOOK.md             Student Ambassador Handbook (source for card content)
docs/CONTENT-REVIEW.md       Every card and every fact to confirm, for Foundation review (generated)
docs/DEVICE-TEST.md          Checklist for testing on an iPad in the vehicle
docs/reference/              Aerial route trace and labeled campus map
src/map/                     Map, route layer, camera
src/stops/                   Stop markers, cards and stop list
src/tour/                    Tour Mode: engine, speech, captions card, controls, settings
src/content/                 Typed loader for content/
e2e/                         Playwright end-to-end and accessibility tests
tools/route/                 Scripts that traced the route along real roads
tools/content-review.mjs     Generates docs/CONTENT-REVIEW.md
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

- **Content edits** go in `content/`. Afterwards run `npm run validate`, `npm run content:review` and `npm test`.
- **Code changes:** work on a branch, and run `npm run build`, `npm run lint`, `npm test` and `npm run test:e2e` before merging.
- Check [SCOPE.md](docs/SCOPE.md) for open questions before starting new features.
