# Sprint trace

A running record of the MVP build: one entry per sprint with what was built, how it was tested, decisions made along the way, review findings and open items. The plan and user stories are in [docs/BACKLOG.md](../../docs/BACKLOG.md).

Each sprint is built on its own branch and merged into `main` with `git merge --no-ff`. `git log --graph --oneline` shows the matching merge commits.

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
- Not yet seen in a real browser with a token: needs a visual check on desktop and iPad (opening view framing, bounds feel, control placement). *Resolved in Sprint 2: the Playwright suite renders the real map at desktop and iPad sizes.*

### Sprint 2: route and stops (2026-11-19)

**Inputs that arrived:** the Mapbox token in `.env.local`, the handbook as `docs/HANDBOOK.md`, and pre-approved `npm install`, `git add/commit/checkout/merge`.

**Findings and decisions**
- **Mapbox satellite tiles returned HTTP 429** with `x-rate-limit-limit: -1` while street tiles loaded fine, so the map showed labels on a blank background. The cause was on the account side; Chris updated the Mapbox account and the imagery now loads. The e2e suite now fails if any Mapbox request errors, so a recurrence shows up immediately.
- **Placing stops:** instead of estimating from the reference PNGs, I read the named place labels, building footprints and road lines straight out of the Mapbox Streets tiles in the running app (OpenStreetMap data). That gave coordinates for every stop except Innovation 1. FIU's facilities list gives Innovation 1 the address 800 SW 107th Ave, which puts it at the new building north-east of the E Campus Cir roundabout. The public Overpass API was at capacity, so I dropped it.
- **Route:** a small router (shortest path on drivable roads, parking aisles weighted ×3) through 29 hand-placed waypoints that follow the red trace. The result is 5.1 km and 595 points, starting and ending at the PG1/PG2 loop in front of MARC. The tools and waypoints are in `tools/route/`, so the route can be rebuilt or extended.
- **Reading the trace:** after the University Dr leg, the trace goes down and back the SW 112th Ave boulevard loop, which matches PCA (14), Ryder at the bottom (15) and Ziff coming back up (16). It then follows E Campus Cir along the north and west edges of Lot 9 rather than driving through the lot. **SCOPE §8 calls "the top-middle loop" the drive through Lot 9; in the trace, that loop is the 112th Ave boulevard. Chris to confirm.**
- **Card copy was drafted now, not in Sprint 5,** because the handbook arrived and the validator needs real content for every stop. Sprint 5 becomes a copy review. Every card has sources; featured narrations are 40 to 90 words and quick-pass narrations 35 words or fewer (validator: 0 warnings).
- **Donor facts checked against fiu.edu:** the library is officially the *Steven* and Dorothea Green Library (the handbook says "Stephen"). FIU's 2014-15 annual report confirms the 1997 $2.5M Green Family Foundation gift endowing the Frost Art Museum and the Green Library, and the 2015 $20M commitment from Ambassador Steven J. Green naming SIPA. Both now appear on the cards with that source. The FIU Giving News page returned 403, so it isn't cited.
- **Optional `reviewNotes`** on stops and tour cards list facts the Foundation must confirm. A unit test makes sure review wording never leaks into guest-facing fields.
- **Map bounds tightened:** e2e showed that Mapbox v3 clamps the map centre (not the screen edge) to `maxBounds`. The box is now the campus plus about 300 m.

**Built**
- `content/stops.json` (32 route stops plus Green Library), `content/tour.json` (Welcome and Closing), `content/route.geojson`.
- `src/content/`: typed loader (`routeStops`, `alsoOnCampus`, `tour`, `route`, `routeBounds`).
- `src/map/RouteLayer.tsx`: gold line on a blue casing, zoom-scaled widths, direction chevrons drawn as an RGBA image in code (no font or canvas dependency), and an accessible "Start · Finish" flag marker. Cleans up on unmount, even if the map was removed first.
- "Whole route" now fits bounds computed from the route and every stop.
- Playwright e2e: `npm run test:e2e` starts two dev servers (with the token, and with it blanked) and runs desktop, iPad landscape and iPad portrait projects in software WebGL.

**Tested**
- Build, lint, validate (0 errors, 0 warnings).
- `npm test`: 31 tests pass. New: content integrity against SCOPE (32 stops in order, SASC/GC first, Frost/WPAC last, Green Library the only off-route stop, Bell Chapel under construction with a full card, unique ids, sources, campus coordinates, every stop within 250 m of the route, route starts and ends at the Welcome loop, no review text in guest fields), RouteLayer layers, marker and cleanup, and the arrow image pixels.
- `npm run test:e2e`: 15 tests pass (5 × 3 viewports): missing-token screen, map loads with zero Mapbox errors and visible attribution, 44 px buttons, Reset view and Whole route, panning clamped in both directions, route layers rendered on screen, start marker visible. I reviewed the desktop and iPad-portrait screenshots: the route follows the roads, arrows point in driving direction, and the start flag sits at the MARC loop.

**Open for Chris and the Foundation**
- Confirm the Lot 9 vs SW 112th Ave reading above.
- Facts flagged in `reviewNotes`: Bell Chapel opening date, ZEB contents and exact name, Parkview capacity (596 vs 620), where Veteran and Military Affairs is, Innovation 1 square footage, Green Library collection size and spelling, Closing card rankings.
- Stop markers sit on or beside each building, not always on the road edge. Chris may want to nudge a few after the first drive with the app.

### Sprint 3: markers, cards and stop list (2026-11-19)

**Built**
- `src/stops/StopMarkers.tsx`: one `<button>` marker per stop (33), created with DOM APIs in route order, so Tab follows the drive. A 44 px hit area surrounds a 30 px (featured) or 24 px (quick-pass) dot. Under construction: dashed orange ring and hard-hat badge. Also on campus: white dot with a book icon. Selected: gold, enlarged, `aria-current`.
- Labels by zoom band on the map container: none when zoomed out, featured and Green Library from z16.3, all from z17. The selected, hovered or focused marker always shows its label. The new optional `label` field gives short chip names.
- Tapping the map within 70 m of a stop opens its card. That stands in for "tap the building outline", since the satellite style has no building polygons to hit-test.
- `src/components/InfoCard.tsx`: a generic card (kicker, title, construction badge, summary, key stat, highlights, Impact of support, footer). Tour Mode reuses it in Sprint 4. Focus moves to the title on open and on each new stop, Escape closes, and focus returns to whatever opened it.
- `src/stops/StopCard.tsx`: Previous/Next along the route with the neighbour's short name. Green Library reads "Also on campus · Not on the driving route", with no Previous/Next.
- `src/stops/StopList.tsx`: numbered list in driving order plus "Also on campus". Arrow keys, Home and End move between stops; choosing one closes the list and opens the card.
- `src/lib/layout.ts` and `src/styles/panels.css`: side panel in wide landscape, bottom sheet otherwise. The camera eases to the stop with an offset so it stays visible beside the panel, and never zooms out.
- Bottom action bar with the **Stops** button (`aria-expanded`). Sprint 4 adds Start tour.

**Found in review and fixed**
- **Mapbox sets `role="img"` on custom marker elements** unless a role is already present. That turned every stop button into an "image" for screen readers. Only the real-browser e2e caught it, so the test mock now copies Mapbox's behaviour, and a unit test asserts the button role.
- A Playwright failure snapshot captured the attribution's "Improve this map" link, which by Mapbox design contains the public token. It stays in the gitignored `test-results/`. The validator's token scan now skips `test-results/` and `playwright-report/` like `dist/`. Going forward I search those files instead of reading them whole.
- The card title showed a focus ring after a mouse click. It receives focus only so screen readers announce it, so the ring was removed there; buttons keep theirs.

**Tested**
- Build, lint, validate: pass.
- `npm test`: 54 tests pass. New: helper unit tests (accessible names, badges, neighbours, nearest-stop tap radius, zoom bands) and App-level integration tests for markers (count, order, labels, styles, button role, zoom band), cards (open from marker, camera centring, Previous/Next, first and last stop, Bell Chapel badge, Green Library off-route, Escape returns focus, tap near a building, review notes never shown) and the stop list (32 + 1, order, keyboard navigation, selection, toggle state).
- `npm run test:e2e`: 30 tests pass (10 × 3 viewports). New: 33 markers with 44 px targets, the card never covers the selected stop, Bell Chapel badge and Next, list selection, keyboard open and Escape back. I reviewed screenshots of the landscape side card, portrait bottom sheet, desktop stop list and whole-route markers.

**Open**
- Long names truncate on the Previous/Next buttons (for example "Children and Fa…"). The full name is in the button's accessible label. Fine for now; revisit in the Sprint 6 device pass.
