# MVP backlog and sprint log

The MVP from [SCOPE.md](SCOPE.md) is split into short sprints. Each sprint is built on its own branch (`sprint-N/<name>`), reviewed and tested, then merged into `main` with `git merge --no-ff`, so every sprint shows up as one merge commit in `git log --graph`.

**Definition of done for every story:** `npm run build`, `npm run lint` and `npm test` pass; the content validator passes when `content/` changed; the acceptance criteria are checked; the sprint log below is updated.

## Sprint plan

| Sprint | Branch | Goal | Status |
|---|---|---|---|
| 0 | `sprint-0/scaffold` | Project skeleton, tooling, theme tokens, missing-token screen | Done |
| 1 | `sprint-1/map` | Satellite map locked to campus, reset view and show route buttons | Done (needs a visual check with a real token) |
| 2 | `sprint-2/route-and-stops` | Route line traced on campus roads; every stop placed with name, code, type and status | To do |
| 3 | `sprint-3/markers-cards` | Numbered markers, stop list panel, stop cards (popover and bottom sheet) | To do |
| 4 | `sprint-4/tour-mode` | Tour Mode: vehicle animation, narration, virtual and ride-along modes, skip stop, settings | To do |
| 5 | `sprint-5/card-copy` | Donor-facing copy for every stop, Welcome and Closing, with sources | Blocked on the handbook text |
| 6 | `sprint-6/qa-deploy` | Accessibility pass, iPad Safari testing, Vercel deploy | To do |

## User stories

### Sprint 0: scaffold

- **S0.1** As a developer, I can run `npm run dev`, `npm run build`, `npm run lint` and `npm test`.
- **S0.2** As a designer, FIU blue and gold are defined once as CSS variables and used everywhere.
- **S0.3** As a guest, if the site has no Mapbox token, I see a clear message instead of a broken map.

### Sprint 1: map

- **S1.1** As a guest, I see a satellite map of MMC that I can pan and zoom but cannot leave.
- **S1.2** As a guest, I can tap "Reset view" and "Show whole route" (44 px targets).

### Sprint 2: route and stops

- **S2.1** As a guest, I see the driving route as a bold gold line with direction arrows and a start/end marker at the PG1/PG2 loop.
- **S2.2** As an ambassador, every stop in SCOPE section 5 plus Green Library exists in `content/stops.json` with coordinates beside the road.

### Sprint 3: markers and cards

- **S3.1** As a guest, each route stop has a numbered blue marker with a readable label; quick-pass markers are smaller; under-construction stops have a distinct style and badge; Green Library is an "Also on campus" marker.
- **S3.2** As a guest, tapping a marker opens its card (popover on desktop, bottom sheet on mobile) with Previous and Next.
- **S3.3** As a guest, I can open a numbered stop list and pick a stop, by touch or keyboard.

### Sprint 4: Tour Mode

- **S4.1** As a guest, Start Tour plays Welcome, each stop in order, then Closing.
- **S4.2** As a guest, a vehicle marker drives along the route between stops and the map follows it.
- **S4.3** As a guest, each card is read aloud, with the text visible as captions.
- **S4.4** As an ambassador, I can choose virtual (auto-advance) or ride-along (manual Next), skip a stop, pause, go back and exit.
- **S4.5** As a guest, I can change speech speed and voice.

### Sprint 5: card copy

- **S5.1** Every stop, Welcome and Closing has sourced, donor-facing copy that passes the validator.

### Sprint 6: QA and deploy

- **S6.1** Keyboard and screen-reader pass; contrast check over imagery.
- **S6.2** Tested on iPad Safari (portrait and landscape), iPhone Safari, Chrome and Edge.
- **S6.3** Deployed to Vercel with the token set as an environment variable.

## Sprint log

Each entry records what was built, how it was tested, and anything left open.

### Sprint 0: scaffold (2026-11-19)

**Built**
- Vite 8 + React 19 + TypeScript 6, ESLint 10 (typescript-eslint, react-hooks), Vitest 5 with jsdom and Testing Library. `mapbox-gl` 3 installed for Sprint 1.
- `src/styles/theme.css` holds every color and size token (FIU Blue `#081e3f`, FIU Gold `#b6862c`, a brighter gold for the route over imagery, 48 px touch size). `src/lib/theme.ts` lets map code read those tokens at runtime, so colors stay in one place.
- `src/lib/config.ts` reads `VITE_MAPBOX_TOKEN` and accepts only public `pk.` tokens. Without one, `App` shows the `MissingToken` screen with setup steps for local and Vercel.
- `npm run validate` script alias for the content validator.

**Tested**
- `npm run build`, `npm run lint`: pass.
- `npm test`: 5 tests pass (token parsing: missing, blank, secret `sk.`, malformed, trimmed; App shows the alert without a token and the map area with one).
- `npm run validate`: 0 errors (content files don't exist yet).

**Open**
- System font stack for now; FIU typefaces and logos wait on brand approval (SCOPE open question 3).

### Sprint 1: map (2026-11-19)

**Built**
- `src/map/MapView.tsx`: Mapbox `satellite-streets-v12`, `maxBounds` around MMC so guests can't pan away, zoom 14.5 to 19, north-up and flat (rotation and pitch off, which suits a moving vehicle), honors reduced-motion, Mapbox performance metrics off. Shows a clear alert if Mapbox rejects the token (401/403, usually the URL restriction).
- `src/map/MapControls.tsx`: "Whole route" and "Reset view" buttons, 48 px, with text labels. Disabled until the map loads.
- `src/map/campus.ts`: bounds, opening view and a fallback route box, all in one place. Sprint 2 replaces the route box with bounds computed from `route.geojson`.
- Title chip "FIU Campus Tour" on a solid blue background so it reads over imagery.
- `src/test/mapboxMock.ts`: a fake `mapboxgl.Map` used by every test (jsdom has no WebGL).

**Tested**
- Build, lint, validate: pass. `npm test`: 13 tests pass, including map options (bounds, style, no rotation), the aria label, load and unmount lifecycle, the 401 alert vs. ignored 404, button enable-on-load, Reset view and Whole route camera calls, and keyboard tab order.

**Review notes**
- The bundle is 2.1 MB (599 kB gzipped), almost all of it mapbox-gl. The map is the first screen, so code-splitting wouldn't help first load; the warning limit is raised with a comment in `vite.config.ts`.

**Open**
- Not yet seen in a real browser with a token: needs a visual check on desktop and iPad (opening view framing, bounds feel, control placement).
