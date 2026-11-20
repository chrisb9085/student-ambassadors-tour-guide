# MVP backlog and sprint log

The MVP from [SCOPE.md](SCOPE.md) is split into short sprints. Each sprint is built on its own branch (`sprint-N/<name>`), reviewed and tested, then merged into `main` with `git merge --no-ff`, so every sprint shows up as one merge commit in `git log --graph`.

**Definition of done for every story:** `npm run build`, `npm run lint` and `npm test` pass; the content validator passes when `content/` changed; the acceptance criteria are checked; the sprint log below is updated.

## Sprint plan

| Sprint | Branch | Goal | Status |
|---|---|---|---|
| 0 | `sprint-0/scaffold` | Project skeleton, tooling, theme tokens, missing-token screen | Done |
| 1 | `sprint-1/map` | Satellite map locked to campus, reset view and show route buttons | Done |
| 2 | `sprint-2/route-and-stops` | Route line traced on campus roads; every stop placed, with first-draft sourced copy | Done |
| 3 | `sprint-3/markers-cards` | Numbered markers, stop list panel, stop cards (popover and bottom sheet) | Done |
| 4 | `sprint-4/tour-mode` | Tour Mode: vehicle animation, narration, virtual and ride-along modes, skip stop, settings | Done |
| 5 | `sprint-5/copy-review` | Review pass on the copy drafted in Sprint 2: read-aloud check, review-notes list for the Foundation | Done |
| 6 | `sprint-6/qa` | Accessibility pass, iPad Safari testing, Vercel deploy | Automated QA done; real-iPad drive and Vercel deploy are Chris's next steps |

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

### Sprint 5: copy review

- **S5.1** Every stop, Welcome and Closing has sourced, donor-facing copy that passes the validator. (Drafted in Sprint 2, once the handbook arrived.)
- **S5.2** The Foundation gets one list of every fact flagged for confirmation (`reviewNotes`).

### Sprint 6: QA and deploy

- **S6.1** Keyboard and screen-reader pass; contrast check over imagery.
- **S6.2** Tested on iPad Safari (portrait and landscape), iPhone Safari, Chrome and Edge.
- **S6.3** Deployed to Vercel with the token set as an environment variable.

## Sprint log

The per-sprint trace (what was built, how it was tested, decisions, findings, open items) is in [.claude/sprints/TRACE.md](../.claude/sprints/TRACE.md).

## Decisions after the MVP (2026-11-20)

Answers from Chris to the content review (`docs/CONTENT-REVIEW.md`) and the SCOPE §9 open questions.

**Content review answers**

| # | Question | Answer | Status |
|---|---|---|---|
| 1 | Bell Chapel opening date | Chris: opened in 2023, improvements under way now | **Decided (2026-11-20): follow FIU sources.** FIU News (April 2023) and the 2022-23 annual report describe the April 2023 groundbreaking, with construction under way. Keep "under construction" with no opening year, and note Chris's answer in `reviewNotes`. Revisit only if an FIU source confirms an opening. |
| 2 | Ziff building name | Sanford L. Ziff (keep "Sanford L. Ziff Family Education Building") | To apply. What the building houses is still unknown. |
| 3 | Parkview Hall capacity | 620 | To apply (replaces 596) |
| 4 | Veteran and Military Affairs location | Near SIPA and University Towers (UT), not University Apartments (UA) | To apply: keep the "Nearby" line on the UT card |
| 5 | Innovation 1 size | About 125,000 sq ft | To apply (replaces 137,000+) |
| 6 | Green Library | Chris: "Stephen"; "more than 2 million" items | Use FIU's **"Steven"** (annual report), and note that the handbook and Chris use "Stephen". Use "more than 2 million" items (handbook); note that an FIU research page says 1.6 million volumes. |
| 7 | Closing card rankings | Foundation can provide on request; not a priority | Parked |

**Rules from Chris (standing)**
- **Official FIU sources win** over SCOPE.md, the handbook and Chris's own answers for names and facts. Use the FIU version and note the difference; don't ask.
- **Use full official building names.** The Academic Health Center buildings read "Academic Health Center N: College or center name":
  - Academic Health Center 1: Center for Children and Families
  - Academic Health Center 2: Herbert Wertheim College of Medicine
  - Academic Health Center 3: Nicole Wertheim College of Nursing and Health Sciences (FIU's official name; the card currently drops "Nicole Wertheim")
  - Academic Health Center 4: Science Classroom Complex
  - Academic Health Center 5: Robert Stempel College of Public Health and Social Work
- **Decided (2026-11-20):** full names go on cards, in the stop list, in marker accessible descriptions and in narration. Map label chips keep their short `label` values, because full names don't fit.

**Facts found on fiu.edu for the next content sprint (2026-11-20)**
- Bell Chapel:
  - $5M lead gift from Trish and Dan Bell in 2019; their total support has reached $14M.
  - Groundbreaking April 2023; construction under way.
  - Sources: [FIU News 2019](https://news.fiu.edu/2019/fiu-announces-5-million-donation-from-philanthropists-trish-and-dan-bell-to-build-interfaith-chapel), [FIU News 2023](https://news.fiu.edu/2023/fiu-breaks-ground-for-the-trish-and-dan-bell-chapel), [bellchapel.fiu.edu](https://bellchapel.fiu.edu/why-a-chapel/about-the-chapel/). The FIU pages need reading in full before the facts go on a card.
- Nursing: the official name is the Nicole Wertheim College of Nursing & Health Sciences, in AHC3. Programs include occupational therapy, physical therapy, communication sciences and disorders, and athletic training ([cnhs.fiu.edu](https://cnhs.fiu.edu/about/)).
- Market Station (PG5): occupied 2011. FIU News (2010, before it opened) planned three classrooms seating up to 360 students, with distance-learning screens, plus more restaurants ([news archive](https://newsarchives.fiu.edu/2010/07/new-pg5-market-station-will-bring-more-restaurants-to-campus); [facilities list, July 2026](https://facilities.fiu.edu/Planning/Documents/FIU_Buildings_GSF_and_Year_Occupied_Revised_7-21-2026.pdf)).
- Tech Station (PG6): occupied 2016 (same facilities list). No FIU source found for its classrooms.
- Still thin for the new featured stops: Science Classroom Complex and Ryder Business Building. Wellness and Recreation Center has enough in the handbook.

**Route:** the drive does **not** go through Lot 9; it follows E Campus Cir past it, which the route already does. Stop 18 is renamed "College of Business Complex" in SCOPE §5; the card still says "Lot 9 and College of Business Complex" and needs updating.

**SCOPE §9 answers**
1. **Featured vs quick pass (changed in SCOPE §5):**
   - Now featured: Market Station (9), Science Classroom Complex (10), Tech Station (13), Ryder Business Building (15), Wellness and Recreation Center (22).
   - Now quick pass: Wertheim Performing Arts Center (32).
   - Graham Center becomes **"Ernest R. Graham Center"** (FIU spelling; SCOPE says "Earnest").
2. **Primary device: not used in the vehicle.** The site is a *preparation tool* for ambassadors studying the route before tours. This lowers the priority of ride-along and in-vehicle features, and raises the priority of study features and narration quality.
3. **Branding:** Chris will add resources later; don't work on it now.
4. **Stats:** available from the Foundation on request; not important now.
5. **Donor recognition:** guidelines arrive with each tour request; the ambassador and advisor handle them. Nothing for the site.
6. **Generative AI:** undecided; leave it out for now.

## Next up: to-do list

Ordered by priority now that the site is a preparation tool.

### A. Content updates (next sprint)
- [ ] Apply review answers 2 to 6 above, following the FIU-source rule.
- [ ] Bell Chapel: stays under construction (decided). Note Chris's "opened 2023" answer in `reviewNotes`, and add the $14M support fact once the FIU pages are read.
- [ ] Full official names in `name` (cards, stop list, descriptions, narration), including the five "Academic Health Center N: …" names and Ernest R. Graham Center. Leave the short `label` chips as they are.
- [ ] Rename stop 18 to "College of Business Complex" and drop Lot 9 from its card and narration.
- [ ] Rewrite copy for the type changes: five stops become featured (40 to 90 words of narration each); WPAC becomes quick pass (35 words or fewer). Market Station, Science Classroom Complex, Tech Station and Ryder have thin sources, so they need more fiu.edu facts.
- [ ] Remove resolved `reviewNotes`, regenerate `docs/CONTENT-REVIEW.md`, run the validator and tests.
- [ ] Update the Sprint 2 open question in TRACE.md: Lot 9 resolved.
- [ ] **Update the docs for the new purpose:** SCOPE §3 (audience), the README intro and CLAUDE.md still describe donors using the site in the vehicle. Rewrite them as an ambassador preparation tool, so future work follows the right goal. Card copy stays donor-facing, because it's what ambassadors say on the tour.

### B. More natural narration (high priority: ambassadors study by listening)
- [ ] Quick win: slightly slower default speed and short pauses between sentences.
- [ ] **Pre-recorded narration audio:** a build-time script turns each narration into an MP3 with a high-quality voice (OpenAI, ElevenLabs, Azure or Google), stored with the site. No server or browser API key; same voice on every device; falls back to the browser voice. Decisions needed: which voice service, whether an AI voice is acceptable (AI use is undecided, but this is behind-the-scenes generation with human review), and who listens to each clip.
- [ ] Or record a real ambassador's voice for the 35 narrations.

### C. Study features (new priority from the "preparation tool" answer)
- [ ] **"For ambassadors" section on each card** (collapsible): the handbook's tour guide tip for that stop (most stops have one, for example "Emphasize FIU's commitment to student success…") plus the longer handbook detail. This covers SCOPE §4.2's "More" toggle. It needs a new optional content field (for example `guideNotes`), sourced like every other fact, and validator and review-page support.
- [ ] **Printable study guide:** every stop in route order with key facts and tour guide tips, for studying away from the screen. Build it from `content/`, as `tools/content-review.mjs` does, as a print-friendly page in the app or a generated document. Leave out `reviewNotes`.
- [ ] **Off-route buildings the handbook already covers**, as "Also on campus" stops like Green Library (SCOPE Phase 2, but already sourced):
  - Helen and Jacob Shaham Academic Medical Center (under construction, opens 2028; Handbook p.17)
  - Ronald W. Reagan Presidential House (Handbook p.8)
  - Deuxième Maison (Handbook p.28; currently only mentioned on the Primera Casa card)
  - Office of Veteran and Military Affairs, near SIPA and University Towers (Handbook p.29)
  - **Not the College of Engineering and Computing:** its Engineering Center is near SW 107th Ave and Flagler St, not on MMC (Handbook p.19). Innovation 1 (stop 8) is its presence on MMC; mention the college there instead.
- [ ] **Tour progress strip:** numbered dots for done, skipped and current stops; jump anywhere.
- [ ] **Shareable stop links** (`?stop=graham-center`) so advisors can point ambassadors at a building.
- [ ] Ideas to confirm with Chris: a self-quiz mode (hide the card, guess the building), and a "my tour" picker for a specific donor's interests (SCOPE Phase 2 custom tours).

### D. UI enhancements
- [ ] Building highlight: outline or glow the current building, not just its marker.
- [ ] Group overlapping markers when zoomed out (AHC 1 to 5).
- [ ] Photos on cards (`photo` field), with renderings for buildings under construction.
- [ ] Smoother camera during the virtual drive, with a gentle zoom on arrival.
- [ ] FIU fonts and logo: wait for Chris's resources.

### E. Mobile enhancements (study on phones and iPads)
- [ ] Drag-up bottom sheet: peek bar that expands to the full card.
- [ ] Add to Home Screen app mode, with the app and content cached (check Mapbox terms for map tiles).
- [ ] Lock-screen play, pause and next controls (needs real audio files, see B).
- [ ] Stop double-tap zoom on buttons; tidy safe areas around the notch and home bar.
- [ ] Phone landscape layout; larger text setting.
- [ ] Keep the screen on during a tour. Lower priority now that it isn't used in the vehicle.

### F. Testing
- [ ] **Cheaper, steadier end-to-end tests:** most e2e tests don't need real satellite imagery. Add a mode that serves stand-in map tiles locally, and keep one or two visual checks (map loads with no Mapbox errors, route screenshot) on real tiles. This cuts Mapbox tile usage (heavy runs hit Mapbox's per-minute rate limit in Sprint 6) and makes runs faster and less flaky, especially in WebKit.

### G. Chris's steps
- [ ] Walk through the site using the guide at the end of `.claude/sprints/TRACE.md`.
- [ ] Run `npm run test:e2e:all` once to confirm the last test fixes.
- [ ] Optional: if an FIU page later confirms Bell Chapel has opened, send the link and the badge comes off.
- [ ] Deploy to Vercel (README steps).
- [ ] Device check on an iPad and a phone. `docs/DEVICE-TEST.md` assumes a moving vehicle; trim it to the parked and narration sections, since the site is a preparation tool.

### Deprioritized
- Ride-along mode stays, but gets no new work.
- GPS ride-along (SCOPE Phase 2): not needed if the site isn't used in the vehicle.
- Generative AI assistant (Phase 3): left out for now.

### Parked (Chris, 2026-11-20: "not now" or "later")
- Automatic checks on GitHub (CI): build, lint, unit tests and validate on every push.
- Stale-content warning in the validator when `lastReviewed` is about 12 months old.
- A Mapbox token, or URL restrictions, for Vercel preview deployments.
