# Sprint trace

A running record of the MVP build: one entry per sprint with what was built, how it was tested, decisions made along the way, review findings and open items. The plan and user stories are in [docs/BACKLOG.md](../../docs/BACKLOG.md).

Each sprint is built on its own branch and merged with `git merge --no-ff`. `git log --graph --oneline` shows the matching merge commits. MVP sprints (0 to 6) merged into `main`. Phase 2 sprints (7 onward) branch from `phase-2` and merge back into `phase-2`; Chris merges `phase-2` into `main`.

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

### Sprint 4: Tour Mode (2026-11-19)

**Built**
- `src/tour/routeMath.ts`: distance along the route and `pointAt(distance)`. `assignAlongRoute` places each stop on the route with a small dynamic-programming pass (non-decreasing vertices, minimum total distance). A stop beside a road the route drives twice, like the SW 14th St spur, therefore lands on the correct pass.
- `src/tour/steps.ts`: 34 steps (Welcome, 32 stops, Closing), each with its spoken text and its distance along the route.
- `src/tour/speech.ts`: Web Speech wrapper.
  - Speaks **sentence by sentence**, which avoids Chrome cutting off utterances after about 15 s and drives caption highlighting.
  - `unlock()` speaks a silent utterance synchronously inside the Start/Play tap, as **iOS Safari** requires.
  - Without speech support it falls back to timed captions (about 150 words a minute), so auto-advance still works muted.
  - It picks a natural-sounding English voice automatically.
- `src/tour/useTour.ts`: the engine.
  - Each step: drive the vehicle along the route (sped-up, 1.2 to 6 s, eased; instant with reduced motion) → narrate → wait.
  - Virtual tour auto-advances 1.5 s after narration. Ride-along waits for Next.
  - Pause cancels speech and parks the vehicle; Play replays the stop.
  - Previous jumps back rather than driving in reverse. Skip counts the stop. Tapping a marker jumps the tour there. Exit restores the map.
  - Camera padding keeps the vehicle beside the card. Settings are read through a ref, so changing speed doesn't restart the current stop.
- UI:
  - `StartTourSheet`: Virtual tour or Ride-along. Choosing one is the tap that unlocks speech.
  - `TourCard`: InfoCard plus captions; the current sentence is highlighted while speaking. No close button, and it doesn't steal focus from the controls.
  - `TourControls`: "Stop 5 of 32" with a progress bar and skipped count; Previous, Play/Pause, Next, Skip, Settings, Exit, all 48 px. The primary button is Play/Pause for a virtual tour and Next for ride-along. After Closing: Restart and Exit.
  - `TourSettingsPanel`: auto-advance switch, Slower/Normal/Faster speed, voice picker. Speed and voice persist in `localStorage`, with every access guarded.
- The action bar now has **Stops** (secondary) and **Start tour** (primary). Map buttons, stop list and stop cards step aside during the tour.

**Found in review and fixed**
- The narration fallback (`narrationFor`) replaced a sentence's "!" or "?" with a period. A unit test caught it; the fallback now adds a period only when punctuation is missing.
- React's `set-state-in-effect` lint rule flagged a synchronous `setState` in the step runner. Phase changes now happen in the actions (Next, Previous, Play/Pause and so on), and the effect only updates state after asynchronous steps. This is simpler as well.
- An e2e assertion that "the vehicle moved" only checked that bounding boxes existed. Removed it; reaching Stop 1 already proves the drive.
- I suspected the selected marker lost its gold fill during the tour. The computed styles and an enlarged screenshot showed it was correct; I had misread a downscaled image. No change.

**Tested**
- Build, lint, validate: pass.
- `npm test`: 83 tests pass. New:
  - route maths (measure, `pointAt`, out-and-back assignment, all real stops in order within 250 m)
  - steps (34, order, narration fallback, progress labels)
  - speech with a fake `speechSynthesis` (unlock, sentence queue, rate/voice, `onSentence`, cancel, a newer narration cancelling the old, captions-only timer fallback) and settings storage
  - 13 App-level Tour Mode tests with a controllable fake speaker: mode chooser and unlock in the tap, Welcome captions, vehicle and padding, virtual auto-advance, ride-along waiting, Next/Previous/Skip, quick-pass length and construction badge, Pause/Play replay, marker jump, Closing → Tour complete → Restart, Exit cleanup, settings (switch, saved speed applied to the next narration, voice list), control labels and progress bar.
- `npm run test:e2e`: **39 tests pass** (13 × 3 viewports). The new tour specs use a stand-in `speechSynthesis` (headless Chromium has no voices) but the app's real speech wrapper, animation and map. Virtual tour: Welcome → drive → Stop 1 narration, with the vehicle hidden by neither the card nor the bar. Ride-along: Next, Skip, Bell Chapel badge and narration, Exit. Every control at least 44 px; settings panel opens. I reviewed screenshots in landscape and portrait.

**Open (Sprint 6 device pass)**
- Real iPad Safari: confirm that the unlock-in-tap approach lets narration continue through auto-advance, and what happens when the screen locks. SCOPE §10 lists this risk.
- Voice quality varies by device. The automatic pick favours "Natural", "Enhanced" and "Premium" voices.

### Sprint 5: copy review (2026-11-19)

The copy was drafted in Sprint 2. This sprint reviewed it the way a listener hears it and produced the Foundation's review page.

**Read-aloud check**
- Scanned every narration for all-caps tokens, initials, parentheses and digits.
- **Bug found:** the Sprint 4 sentence splitter broke sentences at initials ("Paul L. Cejas", "Sanford L. Ziff", "Robert A. M. Stern", "Steven J. Green", "T. Y. Hilton"). That made the voice pause mid-name and the caption highlight jump. The splitter now ignores periods after single capital letters and short titles (Dr, Mr, St and so on). Tests use these names.
- "MANGO" in narration could be spelled out letter by letter, so the narration now says "Mango". The card still shows the official "MANGO".
- "MARC" stays as written; most voices say "Mark". Left for the device check rather than putting a phonetic spelling in the captions.
- The validator now warns on parentheses and on all-caps words in narration, apart from an allowlist (FIU, NCAA, NBA, LEED, STAR, MARC). I confirmed it fires using a deliberately bad stop in a scratch folder. A unit test enforces the same rule on every card.

**Foundation review page**
- `tools/content-review.mjs` (`npm run content:review`) generates `docs/CONTENT-REVIEW.md` from `content/`. It lists the 9 items needing confirmation first, then all 35 cards (Welcome, 32 stops, Green Library, Closing) as guests see and hear them: type and status, summary, highlights, impact, key stat, narration with word count, linked sources and last-reviewed date.
- `--check` mode, plus a unit test, fails if the page no longer matches `content/`.
- The `add-tour-stop` and `write-donor-card` skills and CLAUDE.md now include these steps.

**Tooling**
- Tests type-check as their own TypeScript project (`tsconfig.test.json`, with Node types). The app project excludes them, so browser code can't pick up Node APIs or test globals.

**Tested**
- Build, lint, validate (0 errors, 0 warnings).
- `npm test`: 120 tests pass. New: splitter initials, review page in sync, and a per-card "written for the ear" check (35 cards).

**Open for the Foundation:** the 9 items at the top of `docs/CONTENT-REVIEW.md`, plus SCOPE open questions 1 to 5.

**Paper-trail correction:** the sentence-splitter fix is in commit `f45a352`, whose message ("Write narration for the ear...") doesn't mention it. Double quotes in the intended message broke `git commit` under PowerShell 5.1, so the staged files went into the next commit. No code was lost.

### Sprint 6: QA (2026-11-19, stopped here at Chris's request)

**Accessibility and keyboard (S6.1)**
- **Tab order:** the main actions came after the map and all 33 markers. The title, map buttons, Stops and Start tour now come first in the DOM. Layout is unchanged, since everything is absolutely positioned.
- **Focus during the tour:** focus used to fall back to the page top when the tour started or ended, because the button that had focus disappeared. Now Start goes to Play/Pause (virtual) or Next (ride-along), finishing goes to Exit, and exiting goes back to Start tour.
- **axe-core audit** (`e2e/a11y.e2e.ts`, WCAG 2.1 A/AA) of 7 states: missing token, map, Bell Chapel card, stop list, start sheet, tour, tour settings. It found two serious issues, both fixed:
  - *Label in Name (2.5.3):* marker names didn't contain their visible text. The names are now "3 Bell Chapel, stop 3 of 32", and the full name, type and status are the accessible description.
  - *Scrollable region not keyboard-reachable:* the card body is now a focusable, labelled group with a focus ring.
- After the fixes, the audit passes on desktop Chromium and on all three WebKit projects.

**Safari engine and phones (S6.2, automated part)**
- Added Playwright **WebKit** projects (iPad Pro 11 landscape and portrait, iPhone 13). The real map renders in WebKit.
- **Phone bug found:** the fixed opening view (zoom 15.6) left stops 1 to 8 off-screen on a 390 px phone. The default view now zooms out to fit the whole route when the standard view wouldn't (`defaultCamera`), and Reset view uses the same logic. A new e2e test checks every stop is on screen at opening, on all device sizes.
- **"Start tour" wrapped** onto two lines on phones; buttons no longer wrap.
- Playwright's Windows WebKit has **no Web Speech API** (real Safari does). The app correctly fell back to captions-only mode, and the e2e speech stub now supplies `SpeechSynthesisUtterance` so WebKit runs the real speech path.
- **Test-harness fixes:**
  - The speech stub no longer finishes sentences by itself; the test calls `__finishSpeech()`. Before, a virtual tour could run ahead of the test under load (it was at stop 5 when the Welcome assertion ran).
  - `waitForIdle` waits at most 15 s for tiles, since tiles only affect screenshots.
  - The axe test was split into one test per state.
  - Two unit tests reach Closing via the stop-32 marker instead of pressing Next 33 times, which timed out under load.
- **Mapbox rate limit:** heavy parallel e2e runs drew HTTP 429 from Mapbox for a few minutes; it cleared on its own. Every e2e test loads real tiles, so runs count against the Mapbox free tier. Workers are now capped at 2, and WebKit runs serially.
- **Scripts:** `npm run test:e2e` (Chromium: desktop, iPad landscape, iPad portrait), `npm run test:e2e:webkit` (Safari engine, serial), `npm run test:e2e:all`.

**Deploy readiness (S6.3)**
- README has Vercel steps (env var, Mapbox URL restrictions, what the token error means) and an updated layout and commands.
- `docs/DEVICE-TEST.md`: a 21-item checklist for a real iPad drive, covering narration continuing after the first tap, the silent switch, screen lock, pronunciations, sunlight, marker positions and the Lot 9 question.

**Test results at the time I stopped (be precise)**
- Build, lint, validate (0/0) and **128 unit and integration tests**: all pass on the final code.
- Last full 6-project e2e run (before the final harness fixes): 125 of 126 passed. The one failure was the race the new speech stub fixes.
- After the fixes: the Tour Mode spec passed on all 6 projects except WebKit under 3-worker load. Run serially, WebKit passed every tour test, with 1 reported flaky (the first test after a cold WebKit start passed on retry).
- **Not re-run after the final harness changes:** the complete Chromium suite and the complete serial WebKit suite. Chris asked to stop here. Run `npm run test:e2e:all` (about 25 minutes) to confirm.

**Open (needs Chris)**
- The real-iPad drive (`docs/DEVICE-TEST.md`), the Vercel deploy, the Foundation content review, and the Lot 9 route question.

## Phase 2 (branch `phase-2`)

Work from the "Next up" to-do list in [docs/BACKLOG.md](../../docs/BACKLOG.md). Chris's brief (2026-11-20): chip away at the backlog in sprints, work around blockers, add tests, and use the Mapbox API as little as possible. WebKit failures shouldn't block progress, because Chris will test on his end.

### Sprint 7: stand-in map tiles for end-to-end tests (2026-11-20)

Backlog item F, done first so every later sprint can run the full e2e suite without spending Mapbox map loads.

**Built**
- `e2e/fixtures.ts`: a Playwright fixture, on by default, that answers every request to `*.mapbox.com` locally. The style request gets `e2e/standin-style.json`, a single dark-green background layer with no tile sources; telemetry and billing calls get an empty 204 response. Mapbox GL JS still runs for real (camera, max bounds, route layers, markers, `queryRenderedFeatures`), so the tests check the same app code.
- A third dev server (port 5182) with a fake token (`pk.e2e-stand-in`), so stand-in runs don't need `.env.local`. This also gets the parked CI item ready.
- Two tests tagged `@real-map` run only in a new `real-map` project (`npm run test:e2e:real`): the map loads with no Mapbox errors and shows its attribution, and a whole-route screenshot over real imagery. That is two map loads per run. They skip if `.env.local` has no token.
- New stand-in test: the style is asked for exactly once, and no tile, sprite or font request is made.
- `waitForMap` helper split out of `openMap`, so the real-map tests load the page once each.
- Workers raised from 2 to 3: the old cap was about Mapbox's rate limit, which no longer applies. More than 3 slows each test, because software WebGL is CPU-bound.

**Tested**
- Chromium on the stand-in: desktop 21/21 in 1.4 minutes; both iPad sizes 42/42.
- WebKit on the stand-in (serial): **63/63, no retries needed**, in 4.6 minutes. On real tiles in Sprint 6 it took about 15 minutes, with cold-start flakes.
- `real-map`: 2/2 (two real map loads).
- Build, lint and 128 unit tests pass.

**Found along the way**
- `npm test` from Git Bash fails every file with "Vitest failed to find the current suite". It does this on the committed code too. Git Bash starts in `c:/...` while Node resolves `C:/...`, so Vitest is loaded twice. From PowerShell (and from VS Code's terminal) all 128 pass. Run unit tests from PowerShell; nothing in the repo is wrong.

## How to walk through it yourself

**One-time setup** (in a terminal at the repo root):

1. `npm install`
2. `.env.local` must contain `VITE_MAPBOX_TOKEN=pk....` (it already does on your machine).
3. Only needed for end-to-end tests: `npx playwright install chromium webkit`

**Run the site:** `npm run dev`, then open http://localhost:5173 in Chrome or Edge.

**On your iPad (same Wi-Fi):** run `npx vite --host`. (In PowerShell, `npm run dev -- --host` loses the `--host`.) Open the "Network" address it prints, for example `http://192.168.x.x:5173`. If the map says the token isn't allowed for this address, add that address to the token's URL restrictions in the Mapbox dashboard, or test on the desktop first.

**Walkthrough (about 10 minutes):**

1. **Map:** a satellite view of MMC with the gold route, direction arrows, and the "Start · Finish" flag at the MARC loop. Try panning far away: it stops at the campus edge. Tap **Whole route**, then **Reset view**.
2. **Markers:** large blue numbered dots are featured stops; smaller ones are quick-pass. Bell Chapel (3) has an orange dashed ring and a hard hat. Green Library is the white book icon. Zoom in to see the labels appear.
3. **Cards:** tap any marker, or tap next to a building. Check the summary, key stat, highlights and "Impact of support". Use the Previous and Next buttons at the bottom of the card. Bell Chapel shows the "Under construction" badge. Green Library says it isn't on the driving route.
4. **Stop list:** tap **Stops**, scroll, and pick a stop.
5. **Keyboard (desktop):** press Tab from the top. You reach Whole route, Reset view, Stops and Start tour, then the markers in route order. Enter opens a card and Escape closes it.
6. **Virtual tour:** **Start tour → Virtual tour**. The Welcome narration plays, with captions highlighting the current sentence. The vehicle drives to each stop, and narration continues on its own. Try Pause/Play, Skip, Previous, and tapping a marker to jump there.
7. **Ride-along:** Exit, then **Start tour → Ride-along**. It waits for **Next** at each stop.
8. **Settings** (gear button during a tour): Auto-advance, Slower/Normal/Faster, and the voice list. Your choices are remembered.
9. **Closing:** tap the stop-32 marker, then Next. The Closing card plays, then **Restart** and **Exit** appear.
10. **Phone size:** in Chrome DevTools (F12 → device toolbar), pick an iPhone. The whole route should fit when the page opens.

**Checks:** `npm test` (about 20 s), `npm run validate`, `npm run test:e2e` (Chromium on stand-in tiles, about 4 minutes, no Mapbox usage), `npm run test:e2e:webkit` (Safari engine on stand-in tiles, about 5 minutes), `npm run test:e2e:real` (2 tests on real satellite tiles, before a release).

**What to review next:** `docs/CONTENT-REVIEW.md` (send it to the Foundation), then `docs/DEVICE-TEST.md` (in the vehicle).
